import type { Redis } from "ioredis";
import { TransientJobError } from "./retry.js";

/**
 * Redis-based semaphore for org/campaign concurrency limits.
 */
export class AdmissionController {
  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix = "sonrat:admit",
  ) {}

  private key(scope: string): string {
    return `${this.keyPrefix}:${scope}`;
  }

  async tryAcquire(
    scope: string,
    limit: number,
    ttlSeconds = 120,
  ): Promise<string | null> {
    if (limit <= 0) return null;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = this.key(scope);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    if (count > limit) {
      await this.redis.decr(key);
      return null;
    }
    // Track token for release accounting under concurrent churn
    await this.redis.set(
      `${key}:tok:${token}`,
      "1",
      "EX",
      ttlSeconds,
      "NX",
    );
    return token;
  }

  async release(scope: string, token: string): Promise<void> {
    const key = this.key(scope);
    const tokKey = `${key}:tok:${token}`;
    const removed = await this.redis.del(tokKey);
    if (removed > 0) {
      const n = await this.redis.decr(key);
      if (n < 0) await this.redis.set(key, "0");
    }
  }

  async withAdmission<T>(
    scope: string,
    limit: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const token = await this.tryAcquire(scope, limit);
    if (!token) {
      throw new TransientJobError(
        `Admission denied for ${scope} (limit=${limit})`,
      );
    }
    try {
      return await fn();
    } finally {
      await this.release(scope, token);
    }
  }
}

/**
 * Calling-window check in campaign timezone.
 * start/end are "HH:mm" 24h strings.
 */
export function isWithinCallingHours(
  now: Date,
  startHhmm: string,
  endHhmm: string,
  timeZone: string,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const nowMins = hour * 60 + minute;

  const [sh, sm] = startHhmm.split(":").map(Number);
  const [eh, em] = endHhmm.split(":").map(Number);
  const startMins = (sh ?? 0) * 60 + (sm ?? 0);
  const endMins = (eh ?? 0) * 60 + (em ?? 0);

  if (startMins === endMins) return true; // 24h window
  if (startMins < endMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  // Overnight window e.g. 22:00-06:00
  return nowMins >= startMins || nowMins < endMins;
}

export function assertCallingWindow(params: {
  now?: Date;
  start: string;
  end: string;
  timeZone: string;
}): void {
  const now = params.now ?? new Date();
  if (!isWithinCallingHours(now, params.start, params.end, params.timeZone)) {
    throw new TransientJobError(
      `Outside calling hours ${params.start}-${params.end} (${params.timeZone})`,
    );
  }
}
