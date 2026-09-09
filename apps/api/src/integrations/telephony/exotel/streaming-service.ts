import type { AppConfig } from "@sonrat/config";
import { logger } from "../../../lib/logger.js";

/**
 * Exotel Voicebot / streaming websocket helpers.
 * The voice-runtime consumes the stream; API issues stream URLs and metadata.
 */
export class ExotelStreamingService {
  constructor(private readonly config: AppConfig) {}

  buildStreamWebhookUrl(callId: string): string {
    const base = this.config.EXOTEL_WEBHOOK_BASE_URL ?? this.config.API_BASE_URL;
    return `${base.replace(/\/$/, "")}/webhooks/exotel/events?callId=${encodeURIComponent(callId)}`;
  }

  buildStatusCallbackUrl(callId: string): string {
    const base = this.config.EXOTEL_WEBHOOK_BASE_URL ?? this.config.API_BASE_URL;
    return `${base.replace(/\/$/, "")}/webhooks/exotel/call-status?callId=${encodeURIComponent(callId)}`;
  }

  /**
   * Exotel Voicebot websocket URL pattern for bidirectional audio.
   * Runtime connects using account credentials separately.
   */
  buildVoicebotWsUrl(accountSid: string): string {
    return `wss://voicebot.exotel.com/v1/accounts/${accountSid}/ws`;
  }

  logStreamStart(callId: string, providerCallId: string): void {
    logger.info("exotel_stream_start", {
      call_id: callId,
      provider_call_id: providerCallId,
    });
  }
}
