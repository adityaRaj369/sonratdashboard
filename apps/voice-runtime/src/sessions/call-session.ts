import { randomUUID } from "node:crypto";
import type { AiSession } from "../ai/types.js";
import type { GeminiSessionManager } from "../ai/gemini-session-manager.js";
import { AudioPipeline } from "../audio/pipeline.js";
import {
  createDomainEvent,
  type DomainEventBus,
} from "../events/domain-events.js";
import {
  buildRuntimeInstructions,
  createInitialLanguageState,
  recordLanguageDetection,
  type RuntimeSessionContext,
} from "../prompt/runtime-context.js";
import type { ToolExecutor } from "../tools/tool-executor.js";
import type { ToolRegistry } from "../tools/registry.js";
import { childLogger } from "../lib/logger.js";
import {
  base64ToBuffer,
  bufferToBase64,
} from "../audio/formats.js";

export type CallSessionStatus =
  | "created"
  | "connecting"
  | "active"
  | "interrupted"
  | "reconnecting"
  | "ended"
  | "failed";

export interface CreateCallSessionInput {
  callId: string;
  organizationId: string;
  agentId: string;
  agentVersionId: string;
  campaignId?: string;
  contactId?: string;
  direction: "inbound" | "outbound";
  systemPrompt: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  voiceId?: string;
  /** First spoken turn instruction for the AI (company-aware). */
  openingInstruction?: string;
  enabledTools?: string[];
  metadata?: Record<string, unknown>;
  /** Resume an existing session id */
  sessionId?: string;
}

export type OutboundAudioHandler = (payloadBase64: string) => void | Promise<void>;

export class CallSession {
  readonly id: string;
  readonly context: RuntimeSessionContext;
  status: CallSessionStatus = "created";
  readonly pipeline = new AudioPipeline();
  private ai: AiSession | null = null;
  private eventLoop: Promise<void> | null = null;
  private outboundHandler: OutboundAudioHandler | null = null;
  private startedAtMs = 0;
  private readonly log;
  private readonly transcripts: Array<{
    role: "user" | "assistant";
    text: string;
    language?: string;
    at: string;
  }> = [];

  constructor(
    input: CreateCallSessionInput,
    private readonly aiManager: GeminiSessionManager,
    private readonly tools: ToolRegistry,
    private readonly toolExecutor: ToolExecutor,
    private readonly events: DomainEventBus,
  ) {
    this.id = input.sessionId ?? randomUUID();
    this.context = {
      sessionId: this.id,
      callId: input.callId,
      organizationId: input.organizationId,
      agentId: input.agentId,
      agentVersionId: input.agentVersionId,
      campaignId: input.campaignId,
      contactId: input.contactId,
      direction: input.direction,
      systemPrompt: input.systemPrompt,
      tools: tools.toAiTools(input.enabledTools),
      supportedLanguages: input.supportedLanguages,
      defaultLanguage: input.defaultLanguage,
      language: createInitialLanguageState(input.defaultLanguage),
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.openingInstruction
          ? { openingInstruction: input.openingInstruction }
          : {}),
        ...(input.voiceId ? { voiceId: input.voiceId } : {}),
        ...(input.enabledTools ? { enabledTools: input.enabledTools } : {}),
      },
    };
    this.log = childLogger({
      component: "call-session",
      sessionId: this.id,
      callId: input.callId,
    });

    this.pipeline.interruption.setClearHandler(() => {
      void this.events.emit(
        createDomainEvent("session.interrupted", this.id, {}, {
          callId: this.context.callId,
          organizationId: this.context.organizationId,
        }),
      );
    });
  }

  onOutboundAudio(handler: OutboundAudioHandler): void {
    this.outboundHandler = handler;
  }

  async start(): Promise<void> {
    if (this.status === "active") return;
    this.status = "connecting";
    await this.events.emit(
      createDomainEvent("session.created", this.id, {
        callId: this.context.callId,
      }, {
        callId: this.context.callId,
        organizationId: this.context.organizationId,
      }),
    );

    this.ai = await this.aiManager.createSession({
      sessionId: this.id,
      systemInstruction: buildRuntimeInstructions(this.context),
      tools: this.context.tools,
      language: this.context.language.conversationLanguage,
      voiceId: this.context.metadata.voiceId as string | undefined,
    });

    this.status = "active";
    this.startedAtMs = Date.now();
    this.eventLoop = this.pumpAiEvents();
    await this.events.emit(
      createDomainEvent("session.started", this.id, {}, {
        callId: this.context.callId,
        organizationId: this.context.organizationId,
      }),
    );
    this.log.info("session started");
    // Kick mock/real providers to greet without waiting for caller audio.
    const opening =
      typeof this.context.metadata.openingInstruction === "string" &&
      this.context.metadata.openingInstruction.trim()
        ? this.context.metadata.openingInstruction
        : "__session_start__";
    void this.ai.sendText(opening).catch((err) => {
      this.log.warn({ err }, "greeting kick failed");
    });
  }

  async resume(): Promise<void> {
    if (this.status === "active") return;
    this.status = "reconnecting";
    await this.start();
    await this.events.emit(
      createDomainEvent("session.resumed", this.id, {}, {
        callId: this.context.callId,
        organizationId: this.context.organizationId,
      }),
    );
  }

  async handleInboundAudio(payloadBase64: string): Promise<void> {
    if (!this.ai || (this.status !== "active" && this.status !== "interrupted")) {
      return;
    }
    const raw = base64ToBuffer(payloadBase64);

    // Do NOT local-barge-in on energy: Exotel always sends media frames, and
    // clearing mid-utterance caused jitter/cutoffs. Gemini Live handles
    // interruption via its own VAD when we keep streaming caller audio.

    const forAi = this.pipeline.telephonyToAi(raw);
    await this.ai.sendAudio(forAi);
    await this.events.emit(
      createDomainEvent("audio.inbound", this.id, { bytes: raw.length }, {
        callId: this.context.callId,
        organizationId: this.context.organizationId,
      }),
    );
  }

  async handleBargeIn(): Promise<void> {
    const gen = this.pipeline.handleBargeIn();
    this.status = "interrupted";
    await this.ai?.interrupt();
    this.log.info({ generation: gen }, "barge-in");
    // Allow new AI audio shortly after
    this.pipeline.resumeAfterBargeIn();
    this.status = "active";
  }

  async sendText(text: string): Promise<void> {
    await this.ai?.sendText(text);
  }

  getTranscripts() {
    return [...this.transcripts];
  }

  getLanguageState() {
    return { ...this.context.language };
  }

  private async pumpAiEvents(): Promise<void> {
    if (!this.ai) return;
    try {
      for await (const event of this.ai.receiveEvents()) {
        switch (event.type) {
          case "audio": {
            const converted = this.pipeline.aiToTelephony(
              event.data,
              event.generation,
            );
            if (converted && this.outboundHandler) {
              await this.outboundHandler(bufferToBase64(converted));
              this.log.info(
                { bytes: converted.length },
                "outbound audio sent",
              );
              await this.events.emit(
                createDomainEvent(
                  "audio.outbound",
                  this.id,
                  { bytes: converted.length },
                  {
                    callId: this.context.callId,
                    organizationId: this.context.organizationId,
                  },
                ),
              );
            }
            break;
          }
          case "transcript.partial":
          case "transcript.final": {
            if (event.type === "transcript.final") {
              this.transcripts.push({
                role: event.role,
                text: event.text,
                language: event.language,
                at: new Date().toISOString(),
              });
            }
            await this.events.emit(
              createDomainEvent(event.type, this.id, {
                role: event.role,
                text: event.text,
                language: event.language,
              }, {
                callId: this.context.callId,
                organizationId: this.context.organizationId,
              }),
            );
            break;
          }
          case "language": {
            this.context.language = recordLanguageDetection(
              this.context.language,
              event.language,
              event.confidence,
            );
            await this.events.emit(
              createDomainEvent("language.detected", this.id, {
                language: event.language,
                confidence: event.confidence,
              }, {
                callId: this.context.callId,
                organizationId: this.context.organizationId,
              }),
            );
            break;
          }
          case "tool_call": {
            await this.events.emit(
              createDomainEvent("tool.requested", this.id, {
                id: event.id,
                name: event.name,
                arguments: event.arguments,
              }, {
                callId: this.context.callId,
                organizationId: this.context.organizationId,
              }),
            );
            try {
              const result = await this.toolExecutor.execute(
                event.name,
                event.arguments,
                {
                  organizationId: this.context.organizationId,
                  callId: this.context.callId,
                  sessionId: this.id,
                  contactId: this.context.contactId,
                  campaignId: this.context.campaignId,
                  idempotencyKey: `${this.id}:${event.id}`,
                },
              );
              await this.ai.executeToolResponse(event.id, event.name, result);
              await this.events.emit(
                createDomainEvent("tool.completed", this.id, {
                  id: event.id,
                  name: event.name,
                  result,
                }, {
                  callId: this.context.callId,
                  organizationId: this.context.organizationId,
                }),
              );
            } catch (err) {
              this.log.error({ err, tool: event.name }, "tool execution failed");
              await this.ai.executeToolResponse(event.id, event.name, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            break;
          }
          case "interrupted": {
            // Gemini detected barge-in — clear Exotel playback buffer only.
            this.pipeline.handleBargeIn();
            this.pipeline.resumeAfterBargeIn();
            break;
          }
          case "error": {
            await this.events.emit(
              createDomainEvent("session.error", this.id, {
                message: event.message,
              }, {
                callId: this.context.callId,
                organizationId: this.context.organizationId,
              }),
            );
            if (event.fatal) {
              this.status = "failed";
            }
            break;
          }
          case "closed": {
            this.status = "ended";
            return;
          }
        }
      }
    } catch (err) {
      this.log.error({ err }, "AI event loop failed");
      this.status = "failed";
    }
  }

  async shutdown(reason = "shutdown"): Promise<void> {
    if (this.status === "ended") return;
    this.status = "ended";
    await this.ai?.close();
    await this.aiManager.closeSession(this.id);
    this.pipeline.interruption.reset();
    await this.events.emit(
      createDomainEvent("session.ended", this.id, { reason }, {
        callId: this.context.callId,
        organizationId: this.context.organizationId,
      }),
    );
    this.log.info({ reason }, "session shutdown");
  }
}
