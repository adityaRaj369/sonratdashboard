import type { AiProvider, AiSessionConfig } from "./types.js";

export function createMockAi(): AiProvider {
  return {
    name: "mock",
    async buildSessionConfig(input: AiSessionConfig) {
      return {
        provider: "mock",
        model: "mock-voice-v1",
        systemPrompt: input.systemPrompt,
        voiceId: input.voiceId,
        language: input.language,
        supportedLanguages: input.supportedLanguages,
        ephemeralToken: "mock-token",
      };
    },
    async validateCredentials() {
      return true;
    },
  };
}
