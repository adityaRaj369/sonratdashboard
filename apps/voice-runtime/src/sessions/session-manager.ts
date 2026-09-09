import {
  CallSession,
  type CreateCallSessionInput,
  type OutboundAudioHandler,
} from "./call-session.js";
import type { GeminiSessionManager } from "../ai/gemini-session-manager.js";
import type { ToolExecutor } from "../tools/tool-executor.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { DomainEventBus } from "../events/domain-events.js";
import { childLogger } from "../lib/logger.js";

export interface CreateSessionHooks {
  onOutboundAudio?: OutboundAudioHandler;
  onClear?: () => void;
}

export class SessionManager {
  private sessions = new Map<string, CallSession>();
  private byCallId = new Map<string, string>();
  private readonly log = childLogger({ component: "session-manager" });

  constructor(
    private readonly aiManager: GeminiSessionManager,
    private readonly tools: ToolRegistry,
    private readonly toolExecutor: ToolExecutor,
    private readonly events: DomainEventBus,
  ) {}

  async create(
    input: CreateCallSessionInput,
    hooks: CreateSessionHooks = {},
  ): Promise<CallSession> {
    const existingId = this.byCallId.get(input.callId);
    if (existingId) {
      const existing = this.sessions.get(existingId);
      if (existing && existing.status !== "ended" && existing.status !== "failed") {
        if (hooks.onOutboundAudio) {
          existing.onOutboundAudio(hooks.onOutboundAudio);
        }
        if (hooks.onClear) {
          existing.pipeline.interruption.setClearHandler(hooks.onClear);
        }
        return existing;
      }
    }

    const session = new CallSession(
      input,
      this.aiManager,
      this.tools,
      this.toolExecutor,
      this.events,
    );
    if (hooks.onOutboundAudio) {
      session.onOutboundAudio(hooks.onOutboundAudio);
    }
    if (hooks.onClear) {
      session.pipeline.interruption.setClearHandler(hooks.onClear);
    }
    this.sessions.set(session.id, session);
    this.byCallId.set(input.callId, session.id);
    await session.start();
    this.log.info(
      { sessionId: session.id, callId: input.callId },
      "session created",
    );
    return session;
  }

  get(sessionId: string): CallSession | undefined {
    return this.sessions.get(sessionId);
  }

  getByCallId(callId: string): CallSession | undefined {
    const id = this.byCallId.get(callId);
    return id ? this.sessions.get(id) : undefined;
  }

  async reconnect(sessionId: string): Promise<CallSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await session.resume();
    return session;
  }

  async resume(callId: string): Promise<CallSession> {
    const session = this.getByCallId(callId);
    if (!session) {
      throw new Error(`No session for call: ${callId}`);
    }
    await session.resume();
    return session;
  }

  async shutdown(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.shutdown(reason);
    this.sessions.delete(sessionId);
    this.byCallId.delete(session.context.callId);
  }

  async shutdownAll(reason = "server_shutdown"): Promise<void> {
    const ids = [...this.sessions.keys()];
    await Promise.all(ids.map((id) => this.shutdown(id, reason)));
  }

  list(): Array<{
    sessionId: string;
    callId: string;
    status: string;
    language: string;
  }> {
    return [...this.sessions.values()].map((s) => ({
      sessionId: s.id,
      callId: s.context.callId,
      status: s.status,
      language: s.context.language.conversationLanguage,
    }));
  }

  get activeCount(): number {
    return [...this.sessions.values()].filter(
      (s) => s.status === "active" || s.status === "connecting",
    ).length;
  }
}
