import { db } from "@sonrat/database";
import type { JobHandler } from "./types.js";
import { childLogger } from "../lib/logger.js";
import type { JobName } from "../queues.js";

const log = childLogger({ component: "process-outbox" });

export interface ProcessOutboxData {
  batchSize?: number;
}

/**
 * Relay transactional outbox events into BullMQ jobs / downstream handlers.
 */
export const processOutbox: JobHandler<ProcessOutboxData> = async (job, ctx) => {
  const batchSize = job.data.batchSize ?? 50;
  const now = new Date();

  const events = await db.outboxEvent.findMany({
    where: {
      status: "PENDING",
      availableAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { status: "ACTIVE", attempts: { increment: 1 } },
      });

      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case "campaign.schedule":
        case "campaign.started":
          await ctx.enqueue("schedule_campaign", {
            organizationId: event.organizationId,
            campaignId: String(payload.campaignId),
          });
          break;
        case "call.completed":
          await ctx.enqueue("process_call_completion", {
            organizationId: event.organizationId,
            callId: String(payload.callId),
            terminalStatus: payload.terminalStatus,
            outcome: payload.outcome,
          });
          break;
        case "import.validate":
          await ctx.enqueue("validate_contact_import", {
            organizationId: event.organizationId,
            importId: String(payload.importId),
          });
          break;
        case "import.commit":
          await ctx.enqueue("process_contact_import", {
            organizationId: event.organizationId,
            importId: String(payload.importId),
          });
          break;
        default:
          log.warn({ type: event.type }, "unknown outbox event type");
      }

      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          lastError: null,
        },
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      const attempts = event.attempts + 1;
      const dead = attempts >= 8;
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: dead ? "DEAD_LETTER" : "PENDING",
          lastError: err instanceof Error ? err.message : String(err),
          availableAt: new Date(Date.now() + Math.min(60_000, 2 ** attempts * 1000)),
        },
      });
      log.error({ err, eventId: event.id }, "outbox event failed");
    }
  }

  // Keep polling if work remains
  if (events.length === batchSize) {
    await ctx.enqueue(
      "process_outbox" as JobName,
      { batchSize },
      { delay: 500 },
    );
  }

  return { processed, failed, scanned: events.length };
};
