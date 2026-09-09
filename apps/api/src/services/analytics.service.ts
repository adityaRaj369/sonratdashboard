import { db } from "@sonrat/database";
import { NotFoundError } from "@sonrat/shared";

function countBy(
  rows: Array<{ status?: string | null; outcome?: string | null; _count: number }>,
  key: "status" | "outcome",
  value: string,
) {
  return rows.find((r) => r[key] === value)?._count ?? 0;
}

export class AnalyticsService {
  async campaign(organizationId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, organizationId, deletedAt: null },
    });
    if (!campaign) throw new NotFoundError("Campaign");

    const [totalCalls, byStatus, byOutcome, contacts] = await Promise.all([
      db.call.count({ where: { organizationId, campaignId } }),
      db.call.groupBy({
        by: ["status"],
        where: { organizationId, campaignId },
        _count: true,
      }),
      db.call.groupBy({
        by: ["outcome"],
        where: { organizationId, campaignId, outcome: { not: null } },
        _count: true,
      }),
      db.campaignContact.count({ where: { campaignId } }),
    ]);

    const completed = await db.call.findMany({
      where: {
        organizationId,
        campaignId,
        durationSeconds: { not: null },
      },
      select: { durationSeconds: true },
    });

    const avgDuration =
      completed.length === 0
        ? 0
        : completed.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
          completed.length;

    const connected =
      countBy(byStatus, "status", "CONNECTED") +
      countBy(byStatus, "status", "AI_ACTIVE") +
      countBy(byStatus, "status", "COMPLETED") +
      countBy(byStatus, "status", "HUMAN_HANDOFF");

    return {
      campaignId,
      totalContacts: contacts,
      callsAttempted: totalCalls,
      callsConnected: connected,
      callsCompleted: countBy(byStatus, "status", "COMPLETED"),
      noAnswer: countBy(byStatus, "status", "NO_ANSWER"),
      busy: countBy(byStatus, "status", "BUSY"),
      failed: countBy(byStatus, "status", "FAILED"),
      averageDurationSeconds: Math.round(avgDuration),
      leads: countBy(byOutcome, "outcome", "INTERESTED") +
        countBy(byOutcome, "outcome", "CONVERTED") +
        countBy(byOutcome, "outcome", "CALLBACK_REQUESTED"),
      interested: countBy(byOutcome, "outcome", "INTERESTED"),
      notInterested: countBy(byOutcome, "outcome", "NOT_INTERESTED"),
      callbacks: countBy(byOutcome, "outcome", "CALLBACK_REQUESTED"),
      conversions: countBy(byOutcome, "outcome", "CONVERTED"),
      transferRate:
        totalCalls === 0
          ? 0
          : countBy(byOutcome, "outcome", "HUMAN_HANDOFF") / totalCalls,
      totalCalls,
      avgDurationSeconds: Math.round(avgDuration),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      byOutcome: Object.fromEntries(
        byOutcome.filter((r) => r.outcome).map((r) => [r.outcome!, r._count]),
      ),
      metrics: campaign.metrics,
    };
  }

  async agent(organizationId: string, agentId: string) {
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
    });
    if (!agent) throw new NotFoundError("Agent");

    const [totalCalls, byOutcome, byStatus, durations, languages] =
      await Promise.all([
        db.call.count({ where: { organizationId, agentId } }),
        db.call.groupBy({
          by: ["outcome"],
          where: { organizationId, agentId, outcome: { not: null } },
          _count: true,
        }),
        db.call.groupBy({
          by: ["status"],
          where: { organizationId, agentId },
          _count: true,
        }),
        db.call.findMany({
          where: { organizationId, agentId, durationSeconds: { not: null } },
          select: { durationSeconds: true },
        }),
        db.call.groupBy({
          by: ["language"],
          where: { organizationId, agentId, language: { not: null } },
          _count: true,
        }),
      ]);

    const completed = countBy(byStatus, "status", "COMPLETED");
    const handoffs = countBy(byOutcome, "outcome", "HUMAN_HANDOFF");
    const avgDuration =
      durations.length === 0
        ? 0
        : durations.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
          durations.length;

    return {
      agentId,
      calls: totalCalls,
      totalCalls,
      averageDurationSeconds: Math.round(avgDuration),
      successRate: totalCalls === 0 ? 0 : completed / totalCalls,
      escalationRate: totalCalls === 0 ? 0 : handoffs / totalCalls,
      languageDistribution: languages
        .filter((l) => l.language)
        .map((l) => ({ language: l.language!, count: l._count })),
      toolUsage: [] as Array<{ tool: string; count: number }>,
      byOutcome: Object.fromEntries(
        byOutcome.filter((r) => r.outcome).map((r) => [r.outcome!, r._count]),
      ),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
    };
  }

  async organization(organizationId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCalls,
      byStatus,
      byOutcome,
      durations,
      leads,
      volumeRows,
      campaigns,
      contacts,
      activeCalls,
      usage,
    ] = await Promise.all([
      db.call.count({ where: { organizationId, createdAt: { gte: since } } }),
      db.call.groupBy({
        by: ["status"],
        where: { organizationId, createdAt: { gte: since } },
        _count: true,
      }),
      db.call.groupBy({
        by: ["outcome"],
        where: {
          organizationId,
          createdAt: { gte: since },
          outcome: { not: null },
        },
        _count: true,
      }),
      db.call.findMany({
        where: {
          organizationId,
          createdAt: { gte: since },
          durationSeconds: { not: null },
        },
        select: { durationSeconds: true },
      }),
      db.lead.count({ where: { organizationId, createdAt: { gte: since } } }),
      db.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS date, COUNT(*)::bigint AS count
        FROM "Call"
        WHERE "organizationId" = ${organizationId}::uuid
          AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      db.campaign.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ["RUNNING", "PAUSED"] },
        },
      }),
      db.contact.count({ where: { organizationId, deletedAt: null } }),
      db.call.count({
        where: {
          organizationId,
          status: { in: ["RINGING", "CONNECTED", "AI_ACTIVE", "HUMAN_HANDOFF"] },
        },
      }),
      db.usageRecord.groupBy({
        by: ["metric"],
        where: { organizationId, createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
    ]);

    const avgDuration =
      durations.length === 0
        ? 0
        : durations.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
          durations.length;

    const connected =
      countBy(byStatus, "status", "CONNECTED") +
      countBy(byStatus, "status", "AI_ACTIVE") +
      countBy(byStatus, "status", "COMPLETED") +
      countBy(byStatus, "status", "HUMAN_HANDOFF");

    return {
      windowDays: 30,
      totalCalls,
      completedCalls: countBy(byStatus, "status", "COMPLETED"),
      connectedCalls: connected,
      averageDurationSeconds: Math.round(avgDuration),
      leads,
      leads30d: leads,
      conversions: countBy(byOutcome, "outcome", "CONVERTED"),
      interested: countBy(byOutcome, "outcome", "INTERESTED"),
      callbacks: countBy(byOutcome, "outcome", "CALLBACK_REQUESTED"),
      callVolumeByDay: volumeRows.map((r) => ({
        date: new Date(r.date).toISOString().slice(0, 10),
        count: Number(r.count),
      })),
      outcomes: byOutcome
        .filter((r) => r.outcome)
        .map((r) => ({ outcome: r.outcome!, count: r._count })),
      calls30d: totalCalls,
      activeCampaigns: campaigns,
      contacts,
      activeCalls,
      usage: Object.fromEntries(
        usage.map((u) => [u.metric, Number(u._sum.quantity ?? 0)]),
      ),
    };
  }
}
