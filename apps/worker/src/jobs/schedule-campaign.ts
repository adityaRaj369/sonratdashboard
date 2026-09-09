import { db } from "@sonrat/database";
import { PermanentJobError, TransientJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface ScheduleCampaignData {
  organizationId: string;
  campaignId: string;
  /** Max create_outbound_call jobs to enqueue in this tick (backpressure). */
  batchSize?: number;
}

/**
 * Controlled batch production for large campaigns — enqueues a limited number
 * of outbound call jobs per tick to avoid flooding Redis/telephony.
 */
export const scheduleCampaign: JobHandler<ScheduleCampaignData> = async (
  job,
  ctx,
) => {
  const { organizationId, campaignId, batchSize = 25 } = job.data;

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId, deletedAt: null },
  });
  if (!campaign) throw new PermanentJobError(`Campaign not found: ${campaignId}`);

  if (campaign.status === "DRAFT") {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING", startAt: campaign.startAt ?? new Date() },
    });
  } else if (campaign.status === "SCHEDULED") {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING" },
    });
  } else if (campaign.status !== "RUNNING") {
    throw new PermanentJobError(
      `Campaign ${campaignId} not schedulable in status ${campaign.status}`,
    );
  }

  const now = new Date();
  const contacts = await db.campaignContact.findMany({
    where: {
      campaignId,
      status: "QUEUED",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  let enqueued = 0;
  for (const cc of contacts) {
    await ctx.enqueue(
      "create_outbound_call",
      {
        organizationId,
        campaignId,
        campaignContactId: cc.id,
        contactId: cc.contactId,
        idempotencyKey: `outbound:${campaignId}:${cc.contactId}:${cc.attemptCount}`,
      },
      {
        // BullMQ custom jobIds cannot contain ":"
        jobId: `create-outbound-call-${cc.id}-${cc.attemptCount}-${Date.now()}`,
        priority: campaign.priority,
      },
    );
    enqueued += 1;
  }

  // If more remain, re-queue schedule tick with delay (backpressure)
  const remaining = await db.campaignContact.count({
    where: {
      campaignId,
      status: "QUEUED",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
  });

  if (remaining > 0) {
    await ctx.enqueue(
      "schedule_campaign",
      { organizationId, campaignId, batchSize },
      {
        jobId: `schedule-campaign-${campaignId}-${Date.now()}`,
        delay: 2_000,
      },
    );
  } else {
    const stillActive = await db.campaignContact.count({
      where: {
        campaignId,
        status: {
          in: [
            "QUEUED",
            "INITIATING",
            "RINGING",
            "CONNECTED",
            "AI_ACTIVE",
            "RETRY_SCHEDULED",
          ],
        },
      },
    });
    if (stillActive === 0) {
      await db.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED", endAt: new Date() },
      });
    }
  }

  if (enqueued === 0 && remaining === 0) {
    // Nothing to do this tick — not an error
    return { enqueued: 0, remaining: 0 };
  }

  if (enqueued === 0 && remaining > 0) {
    throw new TransientJobError("No contacts ready; will retry schedule");
  }

  return { enqueued, remaining };
};
