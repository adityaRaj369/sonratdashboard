import type { AppConfig } from "@sonrat/config";
import { ConfigurationError } from "@sonrat/shared";

export class GeminiClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  static fromConfig(config: AppConfig): GeminiClient {
    if (!config.GEMINI_API_KEY) {
      throw new ConfigurationError("GEMINI_API_KEY is required");
    }
    return new GeminiClient(config.GEMINI_API_KEY, config.GEMINI_LIVE_MODEL);
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * Gemini Live uses ephemeral auth via API key at runtime websocket connect.
   * Control plane validates key presence and returns session metadata.
   */
  async validateApiKey(): Promise<boolean> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`,
    );
    return res.ok;
  }

  buildLiveWsUrl(): string {
    return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(this.apiKey)}`;
  }
}
