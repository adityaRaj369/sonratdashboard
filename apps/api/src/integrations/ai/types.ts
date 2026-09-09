export interface AiSessionConfig {
  systemPrompt: string;
  voiceId: string;
  language: string;
  supportedLanguages: string[];
  model?: string;
}

export interface AiProvider {
  name: string;
  buildSessionConfig(input: AiSessionConfig): Promise<{
    provider: string;
    model: string;
    systemPrompt: string;
    voiceId: string;
    language: string;
    supportedLanguages: string[];
    ephemeralToken?: string;
  }>;
  validateCredentials(): Promise<boolean>;
}
