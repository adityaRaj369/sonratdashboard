type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SECRET_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "apitoken",
  "accesskey",
  "secretkey",
]);

export interface LogContext {
  request_id?: string;
  organization_id?: string;
  user_id?: string;
  call_id?: string;
  campaign_id?: string;
  agent_id?: string;
  [key: string]: unknown;
}

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(k.toLowerCase().replace(/[_-]/g, ""))) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;

  const line = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "sonrat-api",
    ...(context ? (redact(context) as LogContext) : {}),
  };

  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
  child: (base: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      write("debug", message, { ...base, ...context }),
    info: (message: string, context?: LogContext) =>
      write("info", message, { ...base, ...context }),
    warn: (message: string, context?: LogContext) =>
      write("warn", message, { ...base, ...context }),
    error: (message: string, context?: LogContext) =>
      write("error", message, { ...base, ...context }),
  }),
};
