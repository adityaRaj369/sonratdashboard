import pino from "pino";

export const logger = pino({
  name: "worker",
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "worker" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
