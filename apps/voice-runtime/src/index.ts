import { loadVoiceConfig } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { buildServer } from "./server.js";

async function main() {
  const config = loadVoiceConfig();
  const { app, close } = await buildServer(config);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down voice-runtime");
    await close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info(
    {
      port: config.port,
      aiProvider: config.MOCK_AI ? "mock" : config.AI_PROVIDER,
      telephony: config.MOCK_TELEPHONY ? "mock" : config.TELEPHONY_PROVIDER,
    },
    "voice-runtime listening",
  );
}

main().catch((err) => {
  logger.error({ err }, "voice-runtime failed to start");
  process.exit(1);
});
