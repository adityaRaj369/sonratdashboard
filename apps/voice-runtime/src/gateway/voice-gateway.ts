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
import { fetchCallSessionBootstrap } from "../lib/api-client.js";

/** Exotel wants media chunks that are multiples of 320 bytes (20ms @ 8kHz PCM16). */
const EXOTEL_FRAME_BYTES = 320; // 20ms @ 8kHz — lower playback latency

/**
 * Voice gateway: bridges Exotel WebSocket media streams to CallSessions.
 */
export class VoiceGateway {
  private readonly log = childLogger({ component: "voice-gateway" });

  constructor(
    private readonly sessions: SessionManager,
    private readonly config: VoiceRuntimeConfig,
  ) {}

  handleExotelSocket(socket: WebSocket, req?: { url?: string }): void {
    if (this.config.MOCK_TELEPHONY || this.config.TELEPHONY_PROVIDER === "mock") {
      this.log.debug("Exotel WS accepted (mock telephony mode still parses events)");
    }

    let urlCallId: string | null = null;
    if (req?.url) {
      try {
        const u = new URL(req.url, "http://localhost");
        urlCallId = u.searchParams.get("callId");
      } catch {
        /* ignore */
      }
    }

    let streamSid: string | null = null;
    let callSid: string | null = null;
    let sessionId: string | null = null;
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
        const msg = {
          event: "media",
          stream_sid: streamSid,
          streamSid: streamSid,
          media: { payload: bufferToBase64(frame) },
        };
        socket.send(JSON.stringify(msg));
      }
      // Never pad silence mid-utterance — that causes audible gaps.
      if (padLast && outboundBuf.length > 0) {
        const padded = Buffer.alloc(EXOTEL_FRAME_BYTES, 0);
        outboundBuf.copy(padded);
        outboundBuf = Buffer.alloc(0);
        socket.send(
          JSON.stringify({
            event: "media",
            stream_sid: streamSid,
            streamSid: streamSid,
            media: { payload: bufferToBase64(padded) },
          }),
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
        if (flushTimer) clearTimeout(flushTimer);
        if (outboundBuf.length > 0) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flushOutbound(false);
          }, 20);
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
        flushOutbound(true);
        try {
          socket.close();
        } catch {
          /* ignore */
        }
      },
    };

    socket.on("message", (data) => {
      void this.onExotelMessage(
        String(data),
        stream,
        {
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
        },
        urlCallId,
      );
    });

    socket.on("close", () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushOutbound(true);
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
    urlCallId: string | null = null,
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
          urlCallId ??
          start.callSid;

        let bootstrap;
        try {
          bootstrap = await fetchCallSessionBootstrap(callId);
        } catch (err) {
          this.log.error(
            { err, callId },
            "failed to load agent session; refusing generic prompt",
          );
          stream.close();
          return;
        }

        this.log.info(
          {
            callId,
            agentId: bootstrap.agentId,
            agentName: bootstrap.agentName,
            companyName: bootstrap.companyName,
            promptChars: bootstrap.systemPrompt.length,
            tools: bootstrap.enabledTools?.length ?? 0,
          },
          "agent session bootstrapped",
        );

        const session = await this.sessions.create(
          {
            callId: bootstrap.callId,
            organizationId: bootstrap.organizationId,
            agentId: bootstrap.agentId,
            agentVersionId: bootstrap.agentVersionId,
            campaignId: bootstrap.campaignId ?? params.campaignId,
            contactId: bootstrap.contactId ?? params.contactId,
            direction: bootstrap.direction,
            systemPrompt: bootstrap.systemPrompt,
            openingInstruction: bootstrap.openingInstruction,
            enabledTools: bootstrap.enabledTools,
            defaultLanguage: bootstrap.defaultLanguage,
            supportedLanguages: bootstrap.supportedLanguages,
            voiceId: bootstrap.voiceId,
            metadata: {
              streamSid: start.streamSid,
              providerCallSid: start.callSid,
              mediaFormat: start.mediaFormat,
              agentName: bootstrap.agentName,
              companyName: bootstrap.companyName,
              agentPurpose: bootstrap.agentPurpose,
              openingInstruction: bootstrap.openingInstruction,
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

  handleSessionSocket(socket: WebSocket): void {
    const log = childLogger({ component: "session-ws" });

    socket.on("message", (data) => {
      void (async () => {
        try {
          const msg = JSON.parse(String(data)) as Record<string, unknown>;
          const type = msg.type as string;

          if (type === "create") {
            const callId = String(msg.callId);
            const bootstrap = await fetchCallSessionBootstrap(callId);
            const session = await this.sessions.create(
              {
                callId: bootstrap.callId,
                organizationId: bootstrap.organizationId,
                agentId: bootstrap.agentId,
                agentVersionId: bootstrap.agentVersionId,
                campaignId: bootstrap.campaignId ?? undefined,
                contactId: bootstrap.contactId ?? undefined,
                direction: bootstrap.direction,
                systemPrompt: bootstrap.systemPrompt,
                openingInstruction: bootstrap.openingInstruction,
                enabledTools: bootstrap.enabledTools,
                defaultLanguage: bootstrap.defaultLanguage,
                supportedLanguages: bootstrap.supportedLanguages,
                voiceId: bootstrap.voiceId,
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
