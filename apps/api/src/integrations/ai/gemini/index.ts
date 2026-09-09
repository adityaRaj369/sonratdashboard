export { GeminiClient } from "./client.js";
export { buildPromptFromDraft, configToPromptLayers } from "./prompt-builder.js";

import { getConfig } from "@sonrat/config";
import type { AiProvider, AiSessionConfig } from "../types.js";
import { createMockAi } from "../mock.js";
import { GeminiClient } from "./client.js";

export function createAiProvider(): AiProvider {
  const config = getConfig();
  if (config.MOCK_AI || config.AI_PROVIDER === "mock") {
    return createMockAi();
  }

  const client = GeminiClient.fromConfig(config);
  return {
    name: "gemini",
    async buildSessionConfig(input: AiSessionConfig) {
      return {
        provider: "gemini",
        model: input.model ?? client.modelName,
        systemPrompt: input.systemPrompt,
        voiceId: input.voiceId,
        language: input.language,
        supportedLanguages: input.supportedLanguages,
      };
    },
    async validateCredentials() {
      return client.validateApiKey();
    },
  };
}
