import type { PromptLayers } from "@sonrat/shared";

export interface LanguageHistoryEntry {
  language: string;
  detectedAt: string;
  confidence?: number;
  source: "initial" | "detection" | "switch" | "manual";
}

export interface LanguageState {
  conversationLanguage: string;
  detectedLanguage: string | null;
  languageHistory: LanguageHistoryEntry[];
}

export interface RuntimeSessionContext {
  sessionId: string;
  callId: string;
  organizationId: string;
  agentId: string;
  agentVersionId: string;
  campaignId?: string;
  contactId?: string;
  direction: "inbound" | "outbound";
  systemPrompt: string;
  promptLayers?: Partial<PromptLayers>;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  supportedLanguages: string[];
  defaultLanguage: string;
  language: LanguageState;
  metadata: Record<string, unknown>;
}

export function createInitialLanguageState(
  defaultLanguage: string,
): LanguageState {
  return {
    conversationLanguage: defaultLanguage,
    detectedLanguage: null,
    languageHistory: [
      {
        language: defaultLanguage,
        detectedAt: new Date().toISOString(),
        source: "initial",
      },
    ],
  };
}

export function recordLanguageDetection(
  state: LanguageState,
  language: string,
  confidence?: number,
): LanguageState {
  const switched = state.conversationLanguage !== language;
  const entry: LanguageHistoryEntry = {
    language,
    detectedAt: new Date().toISOString(),
    confidence,
    source: switched ? "switch" : "detection",
  };
  return {
    conversationLanguage: language,
    detectedLanguage: language,
    languageHistory: [...state.languageHistory, entry],
  };
}

export function buildRuntimeInstructions(ctx: RuntimeSessionContext): string {
  return [
    ctx.systemPrompt,
    "",
    "RUNTIME CONTEXT",
    `Call ID: ${ctx.callId}`,
    `Direction: ${ctx.direction}`,
    `Conversation language: ${ctx.language.conversationLanguage}`,
    `Supported languages: ${ctx.supportedLanguages.join(", ")}`,
    `Start by speaking only ${ctx.defaultLanguage}. If the caller clearly speaks another supported language, answer in that language naturally without explaining the switch. Never invent a language that is not supported.`,
  ].join("\n");
}
