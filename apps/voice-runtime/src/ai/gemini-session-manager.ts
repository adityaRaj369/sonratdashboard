import type { VoiceRuntimeConfig } from "../lib/config.js";
import type { AIProvider } from "./types.js";
import { MockAIProvider } from "./mock-ai-session.js";
import { GeminiLiveProvider } from "./gemini-live-session.js";
import { logger } from "../lib/logger.js";

export function createAIProvider(config: VoiceRuntimeConfig): AIProvider {
  const useMock =
    config.MOCK_AI ||
    config.AI_PROVIDER === "mock" ||
    !config.GEMINI_API_KEY;

  if (useMock) {
    logger.info("Using MockAIProvider");
    return new MockAIProvider();
  }

  logger.info({ model: config.GEMINI_LIVE_MODEL }, "Using GeminiLiveProvider");
  return new GeminiLiveProvider(
    config.GEMINI_API_KEY!,
    config.GEMINI_LIVE_MODEL,
  );
}

export class GeminiSessionManager {
  constructor(private readonly provider: AIProvider) {}

  createSession(
    ...args: Parameters<AIProvider["createSession"]>
  ): ReturnType<AIProvider["createSession"]> {
    return this.provider.createSession(...args);
  }

  closeSession(sessionId: string): Promise<void> {
    return this.provider.closeSession(sessionId);
  }
}
