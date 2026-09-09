import type { WebSocket } from "ws";
import {
  parseTelephonyEvent,
  type TelephonyStream,
  type TelephonyOutboundMedia,
} from "./exotel-stream.js";
import type { SessionManager } from "../sessions/session-manager.js";
import type { CallSession } from "../sessions/call-session.js";
import { childLogger } from "../lib/logger.js";
import type { VoiceRuntimeConfig } from "../lib/config.js";
import { base64ToBuffer, bufferToBase64 } from "../audio/formats.js";

/** Exotel wants media chunks that are multiples of 320 bytes (20ms @ 8kHz PCM16). */
const EXOTEL_FRAME_BYTES = 3200; // 100ms @ 8kHz PCM16

/**
 * Voice gateway: bridges Exotel WebSocket media streams to CallSessions.
 */
export class VoiceGateway {
  private readonly log = childLogger({ component: "voice-gateway" });

  constructor(
    private readonly sessions: SessionManager,
    private readonly config: VoiceRuntimeConfig,
  ) {}

  handleExotelSocket(socket: WebSocket): void {
    if (this.config.MOCK_TELEPHONY || this.config.TELEPHONY_PROVIDER === "mock") {
      this.log.debug("Exotel WS accepted (mock telephony mode still parses events)");
    }

    let streamSid: string | null = null;
    let callSid: string | null = null;
    let sessionId: string | null = null;
    let outboundSeq = 0;
    let outboundBuf = Buffer.alloc(0);
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushOutbound = (padLast: boolean) => {
      if (!streamSid || socket.readyState !== socket.OPEN) {
        outboundBuf = Buffer.alloc(0);
        return;
      }
      while (outboundBuf.length >= EXOTEL_FRAME_BYTES) {
        const frame = outboundBuf.subarray(0, EXOTEL_FRAME_BYTES);
        outboundBuf = outboundBuf.subarray(EXOTEL_FRAME_BYTES);
        outboundSeq += 1;
        const msg: TelephonyOutboundMedia = {
          event: "media",
          stream_sid: streamSid,
          media: { payload: bufferToBase64(frame) },
        };
        socket.send(JSON.stringify(msg));
      }
      if (padLast && outboundBuf.length > 0) {
        // Only pad on end-of-burst flush — never pad every tiny Gemini chunk.
        const padded = Buffer.alloc(EXOTEL_FRAME_BYTES, 0);
        outboundBuf.copy(padded);
        outboundBuf = Buffer.alloc(0);
        outboundSeq += 1;
        socket.send(
          JSON.stringify({
            event: "media",
            stream_sid: streamSid,
            media: { payload: bufferToBase64(padded) },
          } satisfies TelephonyOutboundMedia),
        );
      }
    };

    const stream: TelephonyStream = {
      get streamSid() {
        return streamSid;
      },
      get callSid() {
        return callSid;
      },
      sendMedia: (payloadBase64: string) => {
        if (!streamSid || socket.readyState !== socket.OPEN) {
          this.log.warn(
            { hasStreamSid: Boolean(streamSid), readyState: socket.readyState },
            "drop outbound media (no stream)",
          );
          return;
        }
        outboundBuf = Buffer.concat([outboundBuf, base64ToBuffer(payloadBase64)]);
        flushOutbound(false);
        // If a partial frame remains, flush shortly so speech doesn't stall.
        if (flushTimer) clearTimeout(flushTimer);
        if (outboundBuf.length > 0) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flushOutbound(true);
          }, 40);
        }
      },
      sendClear: () => {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        outboundBuf = Buffer.alloc(0);
        if (!streamSid || socket.readyState !== socket.OPEN) return;
        socket.send(
          JSON.stringify({
            event: "clear",
            stream_sid: streamSid,
          }),
        );
      },
      close: () => {
        if (flushTimer) clearTimeout(flushTimer);
        try {
          socket.close();
        } catch {
          /* ignore */
        }
      },
    };

    socket.on("message", (data) => {
      void this.onExotelMessage(String(data), stream, {
        get sessionId() {
          return sessionId;
        },
        set sessionId(v: string | null) {
          sessionId = v;
        },
        setStream(sid: string, cid: string) {
          streamSid = sid;
          callSid = cid;
        },
      });
    });

    socket.on("close", () => {
      if (sessionId) {
        void this.sessions.shutdown(sessionId, "exotel_disconnect");
      }
    });

    socket.on("error", (err) => {
      this.log.error({ err }, "exotel websocket error");
    });
  }

  private async onExotelMessage(
    raw: string,
    stream: TelephonyStream,
    state: {
      sessionId: string | null;
      setStream: (streamSid: string, callSid: string) => void;
    },
  ): Promise<void> {
    const event = parseTelephonyEvent(raw);
    if (!event) return;

    switch (event.event) {
      case "connected":
        this.log.info({ protocol: event.protocol }, "exotel connected");
        break;

      case "start": {
        const start = event.start;
        state.setStream(start.streamSid, start.callSid);
        this.log.info(
          {
            streamSid: start.streamSid,
            callSid: start.callSid,
            mediaFormat: start.mediaFormat,
            customParameters: start.customParameters,
          },
          "exotel start",
        );
        const params = start.customParameters ?? {};
        const callId =
          params.callId ??
          params.CustomField ??
          params.customField ??
          start.callSid;
        const organizationId =
          params.organizationId ?? params.OrganizationId ?? "unknown";
        const agentId = params.agentId ?? params.AgentId ?? "unknown";
        const agentVersionId =
          params.agentVersionId ?? params.AgentVersionId ?? "unknown";
        const systemPrompt =
          params.systemPrompt ??
          "You are a helpful voice agent. Keep responses short.";

        // Attach outbound handler BEFORE start so greeting audio is not dropped.
        const session = await this.sessions.create(
          {
            callId,
            organizationId,
            agentId,
            agentVersionId,
            campaignId: params.campaignId,
            contactId: params.contactId,
            direction: (params.direction as "inbound" | "outbound") ?? "inbound",
            systemPrompt,
            defaultLanguage: params.language ?? "en",
            supportedLanguages: (params.supportedLanguages ?? "en")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            voiceId: params.voiceId,
            metadata: {
              streamSid: start.streamSid,
              providerCallSid: start.callSid,
              mediaFormat: start.mediaFormat,
            },
          },
          {
            onOutboundAudio: async (payload) => {
              stream.sendMedia(payload);
            },
            onClear: () => stream.sendClear(),
          },
        );

        state.sessionId = session.id;
        this.log.info(
          { sessionId: session.id, callId, streamSid: start.streamSid },
          "exotel stream started",
        );
        break;
      }

      case "media": {
        if (!state.sessionId) return;
        const session = this.sessions.get(state.sessionId);
        if (!session) return;
        await session.handleInboundAudio(event.media.payload);
        break;
      }

      case "stop": {
        if (state.sessionId) {
          await this.sessions.shutdown(state.sessionId, "exotel_stop");
          state.sessionId = null;
        }
        break;
      }

      case "clear": {
        if (!state.sessionId) return;
        const session = this.sessions.get(state.sessionId) as CallSession | undefined;
        if (session) {
          session.pipeline.handleBargeIn();
          session.pipeline.resumeAfterBargeIn();
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Control-plane WebSocket for session create/reconnect/debug without Exotel.
   * Messages are JSON: { type, ... }.
   */
  handleSessionSocket(socket: WebSocket): void {
    const log = childLogger({ component: "session-ws" });

    socket.on("message", (data) => {
      void (async () => {
        try {
          const msg = JSON.parse(String(data)) as Record<string, unknown>;
          const type = msg.type as string;

          if (type === "create") {
            const session = await this.sessions.create(
              {
                callId: String(msg.callId),
                organizationId: String(msg.organizationId),
                agentId: String(msg.agentId),
                agentVersionId: String(msg.agentVersionId),
                campaignId: msg.campaignId ? String(msg.campaignId) : undefined,
                contactId: msg.contactId ? String(msg.contactId) : undefined,
                direction:
                  (msg.direction as "inbound" | "outbound") ?? "outbound",
                systemPrompt: String(
                  msg.systemPrompt ?? "You are a helpful voice agent.",
                ),
                defaultLanguage: String(msg.language ?? "en"),
                supportedLanguages: Array.isArray(msg.supportedLanguages)
                  ? (msg.supportedLanguages as string[])
                  : ["en"],
                voiceId: msg.voiceId ? String(msg.voiceId) : undefined,
                metadata: (msg.metadata as Record<string, unknown>) ?? {},
              },
              {
                onOutboundAudio: async (payload) => {
                  if (socket.readyState === socket.OPEN) {
                    socket.send(JSON.stringify({ type: "audio", payload }));
                  }
                },
              },
            );
            socket.send(
              JSON.stringify({
                type: "session.created",
                sessionId: session.id,
                callId: session.context.callId,
              }),
            );
            return;
          }

          if (type === "audio" && msg.sessionId && msg.payload) {
            const session = this.sessions.get(String(msg.sessionId));
            await session?.handleInboundAudio(String(msg.payload));
            return;
          }

          if (type === "reconnect" && msg.sessionId) {
            const session = await this.sessions.reconnect(String(msg.sessionId));
            socket.send(
              JSON.stringify({
                type: "session.resumed",
                sessionId: session.id,
              }),
            );
            return;
          }

          if (type === "shutdown" && msg.sessionId) {
            await this.sessions.shutdown(String(msg.sessionId), "client");
            socket.send(JSON.stringify({ type: "session.ended" }));
            return;
          }

          socket.send(
            JSON.stringify({ type: "error", message: `Unknown type: ${type}` }),
          );
        } catch (err) {
          log.error({ err }, "session ws message failed");
          socket.send(
            JSON.stringify({
              type: "error",
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      })();
    });
  }
}
