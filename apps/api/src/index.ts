import { serve } from "@hono/node-server";
import { loadConfig } from "@sonrat/config";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { connectRedis, disconnectRedis } from "./lib/redis.js";
import { closeQueues } from "./lib/queue.js";

async function main() {
  const config = loadConfig();
  const app = createApp();

  try {
    await connectRedis();
  } catch (err) {
    logger.warn("redis_connect_deferred", {
      message: err instanceof Error ? err.message : "unknown",
    });
  }

  const server = serve(
    {
      fetch: app.fetch,
      port: config.API_PORT,
    },
    (info) => {
      logger.info("api_started", {
        port: info.port,
        env: config.NODE_ENV,
        mock_telephony: config.MOCK_TELEPHONY,
        mock_ai: config.MOCK_AI,
      });
    },
  );

  const shutdown = async (signal: string) => {
    logger.info("api_shutdown", { signal });
    server.close();
    await closeQueues();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("api_boot_failed", {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
