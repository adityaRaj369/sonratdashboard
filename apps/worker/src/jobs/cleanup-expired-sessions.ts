import { db } from "@sonrat/database";
import type { JobHandler } from "./types.js";

export interface CleanupExpiredSessionsData {
  olderThanMinutes?: number;
}

export const cleanupExpiredSessions: JobHandler<
  CleanupExpiredSessionsData
> = async (job) => {
  const olderThanMinutes = job.data.olderThanMinutes ?? 120;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);

  const result = await db.callSession.updateMany({
    where: {
      status: "active",
      startedAt: { lt: cutoff },
      endedAt: null,
    },
    data: {
      status: "expired",
      endedAt: new Date(),
    },
  });

  const idempotency = await db.idempotencyKey.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return {
    expiredSessions: result.count,
    purgedIdempotencyKeys: idempotency.count,
  };
};
