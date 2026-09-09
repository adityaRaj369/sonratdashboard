import { Redis } from "ioredis";
import { getConfig } from "@sonrat/config";
import { logger } from "./logger.js";

let redis: Redis | null = null;
let lastErrorLogAt = 0;
let gaveUpReconnect = false;

function logRedisError(err: Error) {
  const now = Date.now();
  // Redis reconnect spam fills the terminal when Redis isn't running locally.
  if (now - lastErrorLogAt < 60_000) return;
  lastErrorLogAt = now;
  logger.warn("redis_unavailable", {
    error: err.message || "connection failed",
    hint: "API continues without Redis (rate-limit fail-open). Start Redis to silence this.",
  });
}

export function getRedis(): Redis {
  if (redis) return redis;

  const { REDIS_URL } = getConfig();
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    enableOfflineQueue: false,
    // Stop hammering a dead Redis after a few attempts.
    retryStrategy(times) {
      if (times > 8) {
        if (!gaveUpReconnect) {
          gaveUpReconnect = true;
          logger.warn("redis_reconnect_paused", {
            attempts: times,
            hint: "Restart API after Redis is available",
          });
        }
        return null;
      }
      return Math.min(times * 400, 4000);
    },
  });

  redis.on("error", (err: Error) => {
    logRedisError(err);
  });

  redis.on("ready", () => {
    gaveUpReconnect = false;
    logger.info("redis_ready");
  });

  return redis;
}

export async function connectRedis(): Promise<Redis> {
  const client = getRedis();
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return;
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
  redis = null;
  gaveUpReconnect = false;
}

export async function redisPing(): Promise<boolean> {
  try {
    const client = getRedis();
    if (client.status !== "ready") {
      await connectRedis();
    }
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
