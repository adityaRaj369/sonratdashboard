import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

function tryLoadEnv(): void {
  if (typeof process.loadEnvFile !== "function") return;
  try {
    let dir = process.cwd();
    for (let i = 0; i < 5; i++) {
      const p = join(dir, ".env");
      if (existsSync(p)) {
        process.loadEnvFile(p);
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Ignore error if already loaded or unavailable
  }
}

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  AUTH_SECRET: z.string().min(32),
  AUTH_COOKIE_NAME: z.string().default("sonrat_session"),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),

  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  VOICE_RUNTIME_URL: z.string().url().default("http://localhost:4100"),
  API_PORT: z.coerce.number().int().default(4000),
  VOICE_RUNTIME_PORT: z.coerce.number().int().default(4100),

  AI_PROVIDER: z.enum(["gemini", "mock"]).default("mock"),
  TELEPHONY_PROVIDER: z.enum(["exotel", "mock"]).default("mock"),
  STORAGE_PROVIDER: z.enum(["s3", "local", "mock"]).default("local"),

  MOCK_TELEPHONY: booleanish.default(true),
  MOCK_AI: booleanish.default(true),
  DEMO_MODE: booleanish.default(true),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_LIVE_MODEL: z.string().default("gemini-2.5-flash-native-audio-preview-12-2025"),

  EXOTEL_API_KEY: z.string().optional(),
  EXOTEL_API_TOKEN: z.string().optional(),
  EXOTEL_ACCOUNT_SID: z.string().optional(),
  EXOTEL_SUBDOMAIN: z.string().default("api.exotel.com"),
  EXOTEL_PHONE_NUMBER: z.string().optional(),
  EXOTEL_WEBHOOK_BASE_URL: z.string().url().optional(),
  /** Optional Exotel webhook signing secret — used to verify X-Exotel-Signature header. */
  EXOTEL_WEBHOOK_SECRET: z.string().optional(),
  /** App Bazaar flow URL, e.g. http://my.exotel.com/{sid}/exoml/start_voice/{appId} */
  EXOTEL_FLOW_URL: z.string().url().optional(),

  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  LOCAL_STORAGE_PATH: z.string().default("./uploads"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  MAX_IMPORT_ROWS: z.coerce.number().int().positive().default(100_000),
  DEFAULT_ORG_MAX_CONCURRENT_CALLS: z.coerce.number().int().positive().default(10),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached && process.env.NODE_ENV !== "test") return cached;

  if (env === process.env && !process.env.DATABASE_URL) {
    tryLoadEnv();
  }

  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${formatted}`);
  }

  const config = parsed.data;

  if (config.NODE_ENV === "production") {
    if (config.MOCK_AI || config.MOCK_TELEPHONY || config.DEMO_MODE) {
      throw new Error(
        "Production cannot run with MOCK_AI, MOCK_TELEPHONY, or DEMO_MODE enabled",
      );
    }
    if (config.AI_PROVIDER === "gemini" && !config.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
    }
    if (config.TELEPHONY_PROVIDER === "exotel") {
      const missing = [
        "EXOTEL_API_KEY",
        "EXOTEL_API_TOKEN",
        "EXOTEL_ACCOUNT_SID",
        "EXOTEL_PHONE_NUMBER",
      ].filter((k) => !env[k]);
      if (missing.length) {
        throw new Error(`Missing Exotel config: ${missing.join(", ")}`);
      }
    }
  }

  cached = config;
  return config;
}

export function resetConfigCache(): void {
  cached = null;
}

export function getConfig(): AppConfig {
  return loadConfig();
}
