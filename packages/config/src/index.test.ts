import { describe, expect, it } from "vitest";
import { loadConfig, resetConfigCache } from "./index.js";

describe("loadConfig", () => {
  it("loads valid development config", () => {
    resetConfigCache();
    const config = loadConfig({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/sonrat",
      AUTH_SECRET: "x".repeat(32),
      MOCK_AI: "true",
      MOCK_TELEPHONY: "true",
    });
    expect(config.AI_PROVIDER).toBe("mock");
    expect(config.DEMO_MODE).toBe(true);
  });

  it("rejects production with mock modes", () => {
    resetConfigCache();
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sonrat",
        AUTH_SECRET: "x".repeat(32),
        MOCK_AI: "true",
        MOCK_TELEPHONY: "false",
        DEMO_MODE: "false",
        AI_PROVIDER: "gemini",
        TELEPHONY_PROVIDER: "exotel",
        GEMINI_API_KEY: "key",
        EXOTEL_API_KEY: "k",
        EXOTEL_API_TOKEN: "t",
        EXOTEL_ACCOUNT_SID: "s",
        EXOTEL_PHONE_NUMBER: "+10000000000",
      }),
    ).toThrow(/Production cannot run/);
  });
});
