import { EventEmitter } from "node:events";
import type {
  AiSession,
  AiSessionEvent,
  CreateAiSessionParams,
  AIProvider,
} from "./types.js";

function tonePcm(ms = 350, hz = 523, amplitude = 10000): Buffer {
  // Match GEMINI_OUTPUT_FORMAT (24 kHz pcm16) so telephony conversion is correct.
  const sampleRate = 24_000;
  const samples = Math.floor((sampleRate * ms) / 1000);
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    // Short fade in/out to avoid clicks
    const fade = Math.min(1, t * 40, (ms / 1000 - t) * 40);
    const sample = Math.round(
      Math.sin(2 * Math.PI * hz * t) * amplitude * Math.max(0, fade),
    );
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

function pcm16Rms(pcm: Buffer): number {
  const n = Math.floor(pcm.length / 2);
  if (n <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = pcm.readInt16LE(i * 2);
    sum += s * s;
  }
  return Math.sqrt(sum / n);
}

/**
 * Mock AI for telephony tests (MOCK_AI=true).
 * Plays a short audible cue + transcript — not continuous beeping.
 */
export class MockAiSession implements AiSession {
  readonly id: string;
  private readonly emitter = new EventEmitter();
  private closed = false;
  private generation = 0;
  private readonly queue: AiSessionEvent[] = [];
  private waiters: Array<() => void> = [];
  private greeted = false;
  private lastSpeakAt = 0;
  private replies = 0;
  private readonly maxReplies = 3;
  private readonly replyGapMs = 4_000;
  private speechFrames = 0;

  constructor(private readonly params: CreateAiSessionParams) {
    this.id = params.sessionId;
  }

  private push(event: AiSessionEvent): void {
    if (this.closed) return;
    this.queue.push(event);
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }

  private speak(text: string, tones = 1): void {
    this.lastSpeakAt = Date.now();
    const freqs = [523, 659, 784];
    for (let i = 0; i < tones; i++) {
      this.push({
        type: "audio",
        data: tonePcm(280, freqs[i] ?? 523),
        generation: this.generation,
      });
    }
    this.push({
      type: "transcript.final",
      role: "assistant",
      text,
      language: this.params.language,
    });
  }

  async sendAudio(chunk: Buffer): Promise<void> {
    if (this.closed) return;

    if (!this.greeted) {
      this.greeted = true;
      this.push({
        type: "language",
        language: this.params.language,
        confidence: 0.92,
      });
      const greet =
        this.params.systemInstruction.match(
          /You are ([^,]+), an AI voice agent operating on behalf of ([^.]+)\./,
        );
      const name = greet?.[1]?.trim() || "your company agent";
      const company = greet?.[2]?.trim() || "our company";
      this.speak(
        `Hi, this is ${name} from ${company}. I'm calling regarding our offer — do you have a quick moment?`,
        1,
      );
      return;
    }

    // Ignore silence / continuous telephony frames
    const energy = pcm16Rms(chunk);
    if (energy < 800) {
      this.speechFrames = 0;
      return;
    }
    this.speechFrames += 1;
    // Require a few energetic frames so noise doesn't trigger
    if (this.speechFrames < 3) return;

    if (Date.now() - this.lastSpeakAt < this.replyGapMs) return;
    if (this.replies >= this.maxReplies) return;

    this.speechFrames = 0;
    this.replies += 1;
    this.push({
      type: "transcript.final",
      role: "user",
      text: "Hello",
      language: this.params.language,
    });
    this.speak(
      "I heard you. This is the mock agent — say something else if you want another reply.",
      1,
    );
  }

  async sendText(text: string): Promise<void> {
    if (text === "__session_start__" || text.startsWith("You are ")) {
      if (this.greeted) return;
      this.greeted = true;
      const greet =
        this.params.systemInstruction.match(
          /You are ([^,]+), an AI voice agent operating on behalf of ([^.]+)\./,
        );
      const name = greet?.[1]?.trim() || "your company agent";
      const company = greet?.[2]?.trim() || "our company";
      this.speak(
        `Hi, this is ${name} from ${company}. I'm calling regarding our offer — do you have a quick moment?`,
        1,
      );
      return;
    }
    if (Date.now() - this.lastSpeakAt < this.replyGapMs) return;
    this.push({
      type: "transcript.final",
      role: "user",
      text,
      language: this.params.language,
    });
    this.speak(`Acknowledged: ${text.slice(0, 120)}`, 1);
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
    const failed =
      result && typeof result === "object" && "error" in (result as object);
    this.speak(
      failed
        ? "Sorry, I had a quick glitch. What would you like help with?"
        : `Got it. Noted with ${name}.`,
      1,
    );
    void toolCallId;
    void result;
  }

  async interrupt(): Promise<void> {
    this.generation += 1;
    this.push({ type: "interrupted" });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.push({ type: "closed", reason: "client_close" });
    this.emitter.emit("close");
  }
}

export class MockAIProvider implements AIProvider {
  private sessions = new Map<string, MockAiSession>();

  async createSession(params: CreateAiSessionParams): Promise<AiSession> {
    // Skip tools in mock so internal API auth never blocks audio.
    const session = new MockAiSession({ ...params, tools: [] });
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
