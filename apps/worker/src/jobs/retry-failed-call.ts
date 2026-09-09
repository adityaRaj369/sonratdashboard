import { db } from "@sonrat/database";
import { CallStateMachine, RETRYABLE_CALL_STATUSES } from "@sonrat/shared";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";
import type { CallStatus } from "@sonrat/shared";

export interface RetryFailedCallData {
  organizationId: string;
  callId: string;
}

export const retryFailedCall: JobHandler<RetryFailedCallData> = async (
  job,
  ctx,
) => {
  const { organizationId, callId } = job.data;
  const call = await db.call.findFirst({
    where: { id: callId, organizationId },
    include: { campaign: true },
  });
  if (!call) throw new PermanentJobError(`Call not found: ${callId}`);
  if (!call.campaignId) {
    throw new PermanentJobError("Cannot retry call without campaign");
  }

  if (!RETRYABLE_CALL_STATUSES.includes(call.status as CallStatus)) {
    throw new PermanentJobError(
      `Call status ${call.status} is not retryable`,
    );
  }

  const campaign = call.campaign;
  if (!campaign) throw new PermanentJobError("Campaign missing");

  const cc = await db.campaignContact.findFirst({
    where: {
      campaignId: call.campaignId,
      contactId: call.contactId ?? undefined,
    },
  });
  if (!cc) throw new PermanentJobError("Campaign contact missing");

  if (cc.attemptCount >= campaign.maxAttempts) {
    await db.campaignContact.update({
      where: { id: cc.id },
      data: { status: "FAILED" },
    });
    throw new PermanentJobError("Max attempts reached");
  }

  CallStateMachine.transition(call.status as CallStatus, "RETRY_SCHEDULED");
  await db.call.update({
    where: { id: callId },
    data: { status: "RETRY_SCHEDULED" },
  });

  const nextAttemptAt = new Date(
    Date.now() + campaign.retryDelayMinutes * 60_000,
  );
  await db.campaignContact.update({
    where: { id: cc.id },
    data: {
      status: "QUEUED",
      nextAttemptAt,
    },
  });

  CallStateMachine.transition("RETRY_SCHEDULED", "QUEUED");

  await ctx.enqueue(
    "create_outbound_call",
    {
      organizationId,
      campaignId: call.campaignId,
      campaignContactId: cc.id,
      contactId: cc.contactId,
      idempotencyKey: `outbound:${call.campaignId}:${cc.contactId}:${cc.attemptCount}`,
    },
    {
      delay: campaign.retryDelayMinutes * 60_000,
      jobId: `retry_outbound:${cc.id}:${cc.attemptCount}`,
    },
  );

  return { nextAttemptAt: nextAttemptAt.toISOString() };
};
