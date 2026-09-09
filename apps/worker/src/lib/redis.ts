import { Redis } from "ioredis";
import { getConfig } from "@sonrat/config";

let shared: Redis | null = null;

export function createRedisConnection(url?: string): Redis {
  const redisUrl = url ?? getConfig().REDIS_URL;
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export function getSharedRedis(): Redis {
  if (!shared) {
    shared = createRedisConnection();
  }
  return shared;
}

export async function closeRedis(): Promise<void> {
  if (shared) {
    await shared.quit();
    shared = null;
  }
}
