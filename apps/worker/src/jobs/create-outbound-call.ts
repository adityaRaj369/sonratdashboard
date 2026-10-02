import { db } from "@sonrat/database";
import { CallStateMachine } from "@sonrat/shared";
import { PermanentJobError } from "../lib/retry.js";
import { assertCallingWindow } from "../lib/admission.js";
import type { JobHandler } from "./types.js";

export interface CreateOutboundCallData {
  organizationId: string;
  campaignId: string;
  campaignContactId: string;
  contactId: string;
  idempotencyKey: string;
}

export const createOutboundCall: JobHandler<CreateOutboundCallData> = async (
  job,
  ctx,
) => {
  const {
    organizationId,
    campaignId,
    campaignContactId,
    contactId,
    idempotencyKey,
  } = job.data;

  // Idempotency: existing call with same key
  const existing = await db.call.findFirst({
    where: { organizationId, idempotencyKey },
  });
  if (existing) {
    return { callId: existing.id, deduped: true };
  }

  const [org, campaign, contact, campaignContact] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    db.campaign.findFirstOrThrow({
      where: { id: campaignId, organizationId },
      include: { phoneNumber: true, agent: true },
    }),
    db.contact.findFirstOrThrow({
      where: { id: contactId, organizationId },
    }),
    db.campaignContact.findFirstOrThrow({
      where: { id: campaignContactId, campaignId },
    }),
  ]);

  if (campaign.status !== "RUNNING") {
    await db.campaignContact.updateMany({
      where: { id: campaignContactId, status: "INITIATING" },
      data: { status: "QUEUED" },
    });
    throw new PermanentJobError(`Campaign not running: ${campaign.status}`);
  }

  if (contact.callability === "do_not_call" || contact.callability === "blocked") {
    await db.campaignContact.update({
      where: { id: campaignContactId },
      data: { status: "CANCELLED" },
    });
    throw new PermanentJobError(
      `Contact suppressed (${contact.callability}): ${contactId}`,
    );
  }

  if (contact.callability !== "callable") {
    await db.campaignContact.updateMany({
      where: { id: campaignContactId, status: "INITIATING" },
      data: { status: "CANCELLED" },
    });
    throw new PermanentJobError(
      `Contact not callable (${contact.callability}): ${contactId}`,
    );
  }

  assertCallingWindow({
    start: campaign.callingHoursStart,
    end: campaign.callingHoursEnd,
    timeZone: campaign.timezone || org.timezone || "UTC",
  });

  const agentVersionId =
    campaign.agentVersionId ?? campaign.agent.activeVersionId;
  if (!agentVersionId) {
    throw new PermanentJobError("Campaign agent has no published version");
  }

  const fromNumber =
    campaign.phoneNumber?.e164 ??
    process.env.EXOTEL_PHONE_NUMBER;
  const toNumber = contact.normalizedPhone ?? contact.rawPhone;
  if (!fromNumber || !toNumber) {
    await db.campaignContact.updateMany({
      where: { id: campaignContactId, status: "INITIATING" },
      data: { status: "FAILED" },
    });
    throw new PermanentJobError("Missing from/to phone numbers — configure a phone number on the campaign or set EXOTEL_PHONE_NUMBER env var");
  }

  return ctx.admission.withAdmission(
    `org:${organizationId}`,
    org.maxConcurrentCalls,
    async () =>
      ctx.admission.withAdmission(
        `campaign:${campaignId}`,
        campaign.concurrencyLimit,
        async () => {
          CallStateMachine.transition("QUEUED", "INITIATING");

          const call = await db.call.create({
            data: {
              organizationId,
              campaignId,
              contactId,
              agentId: campaign.agentId,
              agentVersionId,
              phoneNumberId: campaign.phoneNumberId,
              provider:
                process.env.TELEPHONY_PROVIDER === "exotel" ? "exotel" : "mock",
              direction: "OUTBOUND",
              status: "INITIATING",
              startedAt: new Date(),
              idempotencyKey,
              metadata: {
                campaignContactId,
                attempt: campaignContact.attemptCount + 1,
              },
            },
          });

          await db.callEvent.create({
            data: {
              organizationId,
              callId: call.id,
              type: "status.INITIATING",
              payload: { from: fromNumber, to: toNumber },
            },
          });

          const webhookBase =
            process.env.EXOTEL_WEBHOOK_BASE_URL || ctx.apiBaseUrl;
          const voiceBase = ctx.voiceRuntimeUrl.replace(/\/$/, "");
          const streamUrl = `${voiceBase.replace(/^http/i, "ws")}/ws/exotel?callId=${encodeURIComponent(call.id)}`;

          let placed;
          try {
            placed = await ctx.telephony.placeOutboundCall({
              from: fromNumber,
              to: toNumber,
              flowUrl: process.env.EXOTEL_FLOW_URL,
              streamUrl,
              statusCallbackUrl: `${webhookBase.replace(/\/$/, "")}/webhooks/exotel/call-status`,
              customParameters: {
                callId: call.id,
                organizationId,
                agentId: campaign.agentId,
                agentVersionId,
                campaignId,
                contactId,
              },
              timeoutSeconds: campaign.callTimeoutSeconds,
            });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await db.call.update({
              where: { id: call.id },
              data: { status: "FAILED", failureReason: reason, endedAt: new Date() },
            });
            const nextAttempt = campaignContact.attemptCount + 1;
            const canRetry = nextAttempt < campaign.maxAttempts;
            await db.campaignContact.update({
              where: { id: campaignContactId },
              data: {
                status: canRetry ? "RETRY_SCHEDULED" : "FAILED",
                attemptCount: { increment: 1 },
                nextAttemptAt: canRetry
                  ? new Date(
                      Date.now() +
                        Math.max(1, campaign.retryDelayMinutes) * 60 * 1000,
                    )
                  : null,
                lastCallId: call.id,
              },
            });
            throw err;
          }

          CallStateMachine.transition("INITIATING", "RINGING");

          await db.call.update({
            where: { id: call.id },
            data: {
              providerCallId: placed.providerCallId,
              status: "RINGING",
            },
          });

          await db.campaignContact.update({
            where: { id: campaignContactId },
            data: {
              status: "RINGING",
              attemptCount: { increment: 1 },
              lastCallId: call.id,
            },
          });

          await db.contact.update({
            where: { id: contactId },
            data: { lastCalledAt: new Date() },
          });

          // Mock path: simulate connect → AI_ACTIVE quickly via completion job delay
          if (placed.providerCallId.startsWith("mock-exotel-")) {
            await db.call.update({
              where: { id: call.id },
              data: {
                status: "AI_ACTIVE",
                connectedAt: new Date(),
              },
            });
            await db.campaignContact.update({
              where: { id: campaignContactId },
              data: { status: "AI_ACTIVE" },
            });
            await db.callSession.create({
              data: {
                organizationId,
                callId: call.id,
                providerSessionId: placed.providerCallId,
                status: "active",
                conversationLanguage: "en",
              },
            });
          }

          return {
            callId: call.id,
            providerCallId: placed.providerCallId,
            status: "RINGING",
          };
        },
      ),
  );
};
