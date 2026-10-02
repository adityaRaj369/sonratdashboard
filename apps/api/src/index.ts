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

  // Transparently proxy /ws/* WebSocket upgrade connections to the voice-runtime
  // (port 4100), allowing a single public tunnel/domain for both webhooks & audio streams.
  import("node:net").then(({ default: net }) => {
    (server as unknown as import("node:http").Server).on(
      "upgrade",
      (req, clientSocket, head) => {
        if (req.url?.startsWith("/ws/")) {
          const upstream = net.connect(
            config.VOICE_RUNTIME_PORT,
            "127.0.0.1",
            () => {
              upstream.write(
                `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
                  Object.entries(req.headers)
                    .map(
                      ([k, v]) =>
                        `${k}: ${Array.isArray(v) ? v.join(", ") : v}\r\n`,
                    )
                    .join("") +
                  "\r\n",
              );
              if (head && head.length > 0) upstream.write(head);
              clientSocket.pipe(upstream).pipe(clientSocket);
            },
          );
          upstream.on("error", (err) => {
            logger.warn("ws_proxy_upstream_error", { err: err.message });
            clientSocket.destroy();
          });
          clientSocket.on("error", () => {
            upstream.destroy();
          });
        }
      },
    );
  });

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
