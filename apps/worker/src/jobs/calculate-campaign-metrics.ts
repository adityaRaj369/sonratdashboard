import { db } from "@sonrat/database";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface CalculateCampaignMetricsData {
  organizationId: string;
  campaignId: string;
}

export const calculateCampaignMetrics: JobHandler<
  CalculateCampaignMetricsData
> = async (job) => {
  const { organizationId, campaignId } = job.data;
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId },
  });
  if (!campaign) throw new PermanentJobError(`Campaign not found: ${campaignId}`);

  const calls = await db.call.groupBy({
    by: ["status"],
    where: { campaignId, organizationId },
    _count: { _all: true },
  });

  const outcomes = await db.call.groupBy({
    by: ["outcome"],
    where: { campaignId, organizationId, outcome: { not: null } },
    _count: { _all: true },
  });

  const totalContacts = await db.campaignContact.count({
    where: { campaignId },
  });

  const byStatus = Object.fromEntries(
    calls.map((c) => [c.status, c._count._all]),
  );
  const byOutcome = Object.fromEntries(
    outcomes
      .filter((o) => o.outcome)
      .map((o) => [o.outcome!, o._count._all]),
  );

  const completed = byStatus.COMPLETED ?? 0;
  const failed = (byStatus.FAILED ?? 0) + (byStatus.NO_ANSWER ?? 0) + (byStatus.BUSY ?? 0);
  const totalCalls = calls.reduce((s, c) => s + c._count._all, 0);

  const metrics = {
    totalContacts,
    totalCalls,
    completed,
    failed,
    byStatus,
    byOutcome,
    connectRate: totalCalls > 0 ? completed / totalCalls : 0,
    updatedAt: new Date().toISOString(),
  };

  await db.campaign.update({
    where: { id: campaignId },
    data: { metrics },
  });

  return metrics;
};
