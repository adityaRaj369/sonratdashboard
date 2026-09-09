import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  name: "voice-runtime",
  level,
  base: { service: "voice-runtime" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export type Logger = typeof logger;
