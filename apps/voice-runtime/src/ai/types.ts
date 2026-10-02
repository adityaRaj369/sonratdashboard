export type AiSessionEventType =
  | "audio"
  | "transcript.partial"
  | "transcript.final"
  | "tool_call"
  | "language"
  | "interrupted"
  | "error"
  | "closed";

export interface AiAudioEvent {
  type: "audio";
  data: Buffer;
  generation?: number;
}

export interface AiTranscriptEvent {
  type: "transcript.partial" | "transcript.final";
  role: "user" | "assistant";
  text: string;
  language?: string;
}

export interface AiToolCallEvent {
  type: "tool_call";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiLanguageEvent {
  type: "language";
  language: string;
  confidence?: number;
}

export interface AiInterruptedEvent {
  type: "interrupted";
}

export interface AiErrorEvent {
  type: "error";
  message: string;
  fatal?: boolean;
}

export interface AiClosedEvent {
  type: "closed";
  reason?: string;
}

export type AiSessionEvent =
  | AiAudioEvent
  | AiTranscriptEvent
  | AiToolCallEvent
  | AiLanguageEvent
  | AiInterruptedEvent
  | AiErrorEvent
  | AiClosedEvent;

export interface CreateAiSessionParams {
  sessionId: string;
  systemInstruction: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  language: string;
  supportedLanguages: string[];
  languageDetection: boolean;
  languageSwitching: boolean;
  voiceId?: string;
}

export interface AiSession {
  readonly id: string;
  sendAudio(chunk: Buffer): Promise<void>;
  sendText(text: string): Promise<void>;
  receiveEvents(): AsyncIterable<AiSessionEvent>;
  executeToolResponse(
    toolCallId: string,
    name: string,
    result: unknown,
  ): Promise<void>;
  interrupt(): Promise<void>;
  close(): Promise<void>;
}

export interface AIProvider {
  createSession(params: CreateAiSessionParams): Promise<AiSession>;
  closeSession(sessionId: string): Promise<void>;
}
