import { createHash } from "node:crypto";
import type { TelephonyWebhookPayload } from "../types.js";

/**
 * Normalize Exotel webhook payloads into a stable internal shape.
 * Exotel may send form-urlencoded or JSON depending on StatusCallbackContentType.
 */
export class ExotelWebhookService {
  buildEventKey(payload: Record<string, unknown>): string {
    const sid =
      String(payload.CallSid ?? payload.callSid ?? payload.Sid ?? payload.sid ?? "") ||
      "unknown";
    const status = String(
      payload.Status ?? payload.status ?? payload.EventType ?? payload.eventType ?? "",
    );
    const dateUpdated = String(payload.DateUpdated ?? payload.dateUpdated ?? "");
    const raw = `${sid}:${status}:${dateUpdated}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  parse(payload: Record<string, unknown>): TelephonyWebhookPayload {
    const providerCallId = String(
      payload.CallSid ?? payload.callSid ?? payload.Sid ?? payload.sid ?? "",
    );
    const status = String(
      payload.Status ?? payload.status ?? payload.EventType ?? payload.eventType ?? "unknown",
    ).toLowerCase();

    const directionRaw = String(payload.Direction ?? payload.direction ?? "").toLowerCase();
    const direction =
      directionRaw.includes("inbound") || directionRaw === "incoming"
        ? "inbound"
        : directionRaw
          ? "outbound"
          : undefined;

    return {
      eventKey: this.buildEventKey(payload),
      providerCallId,
      status,
      direction,
      from: payload.From ? String(payload.From) : payload.from ? String(payload.from) : undefined,
      to: payload.To ? String(payload.To) : payload.to ? String(payload.to) : undefined,
      raw: payload,
    };
  }

  /** Map Exotel call status strings to Sonrat CallStatus targets. */
  mapStatus(exotelStatus: string): string | null {
    const s = exotelStatus.toLowerCase();
    switch (s) {
      case "queued":
        return "QUEUED";
      case "ringing":
        return "RINGING";
      case "in-progress":
      case "in_progress":
      case "answered":
        return "CONNECTED";
      case "completed":
        return "COMPLETED";
      case "busy":
        return "BUSY";
      case "no-answer":
      case "no_answer":
        return "NO_ANSWER";
      case "failed":
        return "FAILED";
      case "canceled":
      case "cancelled":
        return "CANCELLED";
      default:
        return null;
    }
  }
}
