import type { Context, Next } from "hono";
import { RateLimitError } from "@sonrat/shared";
import { getRedis } from "../lib/redis.js";
import type { AppVariables } from "../lib/crypto.js";

type AppEnv = { Variables: AppVariables };

interface RateLimitOptions {
  windowSeconds: number;
  max: number;
  keyPrefix: string;
  /** Derive identity: ip, user, or org */
  identity?: "ip" | "user" | "org";
}

async function incrementWindow(key: string, windowSeconds: number): Promise<number> {
  const redis = getRedis();
  try {
    if (redis.status !== "ready") {
      // Don't block auth/UI when Redis is down — connect with a hard timeout.
      await Promise.race([
        redis.connect().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
    }
    if (redis.status !== "ready") return 0;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count;
  } catch {
    // Fail open if Redis unavailable
    return 0;
  }
}

export function rateLimit(options: RateLimitOptions) {
  return async (c: Context<AppEnv>, next: Next) => {
    const identity =
      options.identity === "user"
        ? c.get("userId")
        : options.identity === "org"
          ? c.get("organizationId")
          : (c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
            c.req.header("x-real-ip") ??
            "unknown");

    const key = `rl:${options.keyPrefix}:${identity ?? "anon"}`;
    const count = await incrementWindow(key, options.windowSeconds);

    c.header("X-RateLimit-Limit", String(options.max));
    if (count > 0) {
      c.header("X-RateLimit-Remaining", String(Math.max(0, options.max - count)));
    }

    if (count > options.max) {
      throw new RateLimitError(`Rate limit exceeded for ${options.keyPrefix}`);
    }

    await next();
  };
}

export const authRateLimit = rateLimit({
  keyPrefix: "auth",
  windowSeconds: 60,
  max: 20,
  identity: "ip",
});

export const campaignStartRateLimit = rateLimit({
  keyPrefix: "campaign-start",
  windowSeconds: 60,
  max: 10,
  identity: "org",
});
