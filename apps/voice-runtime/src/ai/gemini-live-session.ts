/**
 * Gemini Live session using @google/genai patterns.
 * Typed loosely against the SDK so minor API drift does not break the build;
 * mock provider remains the default for local/dev.
 */
import type {
  AiSession,
  AiSessionEvent,
  CreateAiSessionParams,
  AIProvider,
} from "./types.js";
import { childLogger } from "../lib/logger.js";

type LiveSessionHandle = {
  sendRealtimeInput?: (payload: unknown) => Promise<void> | void;
  sendClientContent?: (payload: unknown) => Promise<void> | void;
  sendToolResponse?: (payload: unknown) => Promise<void> | void;
  close?: () => void;
};

export class GeminiLiveSession implements AiSession {
  readonly id: string;
  private readonly log;
  private closed = false;
  private generation = 0;
  private readonly queue: AiSessionEvent[] = [];
  private waiters: Array<() => void> = [];
  private liveSession: LiveSessionHandle | null = null;
  private audioBuffer = Buffer.alloc(0);
  // Exotel delivers roughly 40 ms frames. Forward each frame immediately;
  // a 100 ms batch made the agent feel noticeably slow to respond.
  private readonly audioBatchBytes = 1280; // ~40ms @ 16kHz PCM16

  constructor(
    private readonly params: CreateAiSessionParams,
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.id = params.sessionId;
    this.log = childLogger({ component: "gemini-live", sessionId: this.id });
  }

  private push(event: AiSessionEvent): void {
    if (this.closed && event.type !== "closed") return;
    this.queue.push(event);
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }

  async connect(): Promise<void> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    // live.connect shape follows current @google/genai Live API docs
    const live = (ai as { live?: { connect: (opts: unknown) => Promise<LiveSessionHandle> } })
      .live;
    if (!live?.connect) {
      throw new Error(
        "@google/genai live.connect is unavailable in this SDK version",
      );
    }

    this.liveSession = await live.connect({
      model: this.model,
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction:
          `${this.params.systemInstruction || "You are a company phone agent on a live call. Never say you are Gemini, Google, or an AI model. Use only the company knowledge in your instructions. Keep answers under 2 short sentences."}\n\nVOICE DELIVERY: Speak like a warm, natural human professional on a phone call. Use natural pauses, contractions, varied intonation, and short turns. Never sound like a narration, announcement, or text-to-speech demo.\nLANGUAGE CONTROL: Start in ${this.params.language}. The supported languages are ${this.params.supportedLanguages.join(", ") || this.params.language}. ${this.params.languageSwitching ? "If the caller clearly switches to one of the supported languages, switch with them naturally." : "Do not switch languages during the call."} ${this.params.languageDetection ? "Detect the caller's language from their speech, but do not announce language detection." : "Do not detect or announce language changes."}`,
        // Tools re-enabled when the agent config provides them.
        tools:
          this.params.tools.length > 0
            ? [
                {
                  functionDeclarations: this.params.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                  })),
                },
            ]
            : undefined,
        // Aggressive low-latency configuration for real-time natural conversational flow:
        // Short silence window allows the agent to answer immediately without awkward pauses.
        realtimeInputConfig: {
          automaticActivityDetection: {
            startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            prefixPaddingMs: 20,
            silenceDurationMs: 200,
          },
          activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
        },
        ...(this.model.includes("2.5") || this.model.includes("3")
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
        speechConfig: this.params.voiceId
          ? {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.params.voiceId },
              },
            }
          : {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => this.log.info("gemini live session opened"),
        onmessage: (message: Record<string, unknown>) =>
          this.handleMessage(message),
        onerror: (e: unknown) => {
          this.log.error({ err: e }, "gemini live error");
          this.push({
            type: "error",
            message: e instanceof Error ? e.message : "Gemini error",
          });
        },
        onclose: (e: { reason?: string } | undefined) => {
          this.log.info({ reason: e?.reason }, "gemini live closed");
          this.push({ type: "closed", reason: e?.reason });
        },
      },
    });
    this.log.info("gemini live connected");
  }

  private handleMessage(message: Record<string, unknown>): void {
    const serverContent = message.serverContent as
      | Record<string, unknown>
      | undefined;
    if (serverContent?.interrupted) {
      this.generation += 1;
      this.push({ type: "interrupted" });
    }

    const modelTurn = serverContent?.modelTurn as
      | { parts?: Array<Record<string, unknown>> }
      | undefined;
    for (const part of modelTurn?.parts ?? []) {
      const inline = part.inlineData as
        | { data?: string; mimeType?: string }
        | undefined;
      if (inline?.data) {
        this.push({
          type: "audio",
          data: Buffer.from(inline.data, "base64"),
          generation: this.generation,
        });
      }
      if (typeof part.text === "string" && part.text) {
        this.push({
          type: "transcript.final",
          role: "assistant",
          text: part.text,
          language: this.params.language,
        });
      }
      const fn = part.functionCall as
        | { name?: string; args?: Record<string, unknown>; id?: string }
        | undefined;
      if (fn?.name) {
        this.push({
          type: "tool_call",
          id: fn.id ?? `gemini-tool-${Date.now()}`,
          name: fn.name,
          arguments: fn.args ?? {},
        });
      }
    }

    const inputTranscription = serverContent?.inputTranscription as
      | { text?: string }
      | undefined;
    if (inputTranscription?.text) {
      this.push({
        type: "transcript.partial",
        role: "user",
        text: inputTranscription.text,
        language: this.params.language,
      });
    }

    const outputTranscription = serverContent?.outputTranscription as
      | { text?: string }
      | undefined;
    if (outputTranscription?.text) {
      this.push({
        type: "transcript.partial",
        role: "assistant",
        text: outputTranscription.text,
        language: this.params.language,
      });
    }

    const toolCall = message.toolCall as
      | {
          functionCalls?: Array<{
            id?: string;
            name?: string;
            args?: Record<string, unknown>;
          }>;
        }
      | undefined;
    for (const fc of toolCall?.functionCalls ?? []) {
      if (!fc.name) continue;
      this.push({
        type: "tool_call",
        id: fc.id ?? `gemini-tool-${Date.now()}`,
        name: fc.name,
        arguments: fc.args ?? {},
      });
    }
  }

  async sendAudio(chunk: Buffer): Promise<void> {
    if (!this.liveSession || this.closed || chunk.length === 0) return;
    await this.liveSession.sendRealtimeInput?.({
      audio: {
        data: chunk.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  async sendText(text: string): Promise<void> {
    if (!this.liveSession || this.closed) return;
    const prompt =
      text === "__session_start__"
        ? "The phone call just connected. Follow your system identity and company knowledge. Greet in one short sentence as that company agent. Never say Gemini, Google, or that you are a language model. Speak now."
        : text.startsWith("You are ")
          ? `${text} Speak now.`
          : text;
    // Realtime text works for both 2.5 and 3.x Live models. In particular,
    // 3.x reserves client content for initial history, so use the realtime
    // channel for the opening turn as well.
    if (this.liveSession.sendRealtimeInput) {
      await this.liveSession.sendRealtimeInput({
        text: prompt,
        turnComplete: true,
      });
      return;
    }
    await this.liveSession.sendClientContent?.({
      turns: [{ role: "user", parts: [{ text: prompt }] }],
      turnComplete: true,
    });
  }

  async *receiveEvents(): AsyncIterable<AiSessionEvent> {
    while (!this.closed || this.queue.length > 0) {
      if (this.queue.length === 0) {
        await new Promise<void>((resolve) => this.waiters.push(resolve));
        continue;
      }
      const event = this.queue.shift()!;
      yield event;
      if (event.type === "closed") return;
    }
  }

  async executeToolResponse(
    toolCallId: string,
    name: string,
    result: unknown,
  ): Promise<void> {
    if (!this.liveSession || this.closed) return;
    await this.liveSession.sendToolResponse?.({
      functionResponses: [
        {
          id: toolCallId,
          name,
          response: { result },
        },
      ],
    });
  }

  async interrupt(): Promise<void> {
    this.generation += 1;
    this.push({ type: "interrupted" });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.liveSession?.close?.();
    } catch (err) {
      this.log.warn({ err }, "error closing gemini session");
    }
    this.push({ type: "closed", reason: "client_close" });
  }
}

export class GeminiLiveProvider implements AIProvider {
  private sessions = new Map<string, GeminiLiveSession>();

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async createSession(params: CreateAiSessionParams): Promise<AiSession> {
    const session = new GeminiLiveSession(params, this.apiKey, this.model);
    await session.connect();
    this.sessions.set(params.sessionId, session);
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.close();
      this.sessions.delete(sessionId);
    }
  }
}
