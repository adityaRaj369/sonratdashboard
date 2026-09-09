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
  private readonly audioBatchBytes = 3200; // ~100ms @ 16kHz PCM16

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
          this.params.systemInstruction ||
          "You are a concise phone sales agent. Keep answers under 2 sentences. Speak clearly.",
        // Tools disabled on live path until internal auth/callId passthrough is solid.
        tools: undefined,
        speechConfig: this.params.voiceId
          ? {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.params.voiceId },
              },
            }
          : {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Puck" },
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
    if (!this.liveSession || this.closed) return;
    this.audioBuffer = Buffer.concat([this.audioBuffer, chunk]);
    while (this.audioBuffer.length >= this.audioBatchBytes) {
      const batch = this.audioBuffer.subarray(0, this.audioBatchBytes);
      this.audioBuffer = this.audioBuffer.subarray(this.audioBatchBytes);
      await this.liveSession.sendRealtimeInput?.({
        audio: {
          data: batch.toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.liveSession || this.closed) return;
    const prompt =
      text === "__session_start__"
        ? "The phone call just connected. Greet the caller in one short friendly sentence and ask how you can help. Speak now."
        : text;
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
