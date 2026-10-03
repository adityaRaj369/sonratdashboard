import type {
  PlaceCallInput,
  PlaceCallResult,
  TelephonyProvider,
  TransferCallInput,
} from "../types.js";
import { ExotelClient, type ExotelCallResource } from "./client.js";

function exotelMaxCallDurationSeconds(requested?: number): number {
  const configured = Number(process.env.EXOTEL_MAX_CALL_DURATION_SECONDS ?? 600);
  const hardLimit = Number.isFinite(configured)
    ? Math.min(Math.max(Math.floor(configured), 30), 1800)
    : 600;
  const requestedLimit = Number.isFinite(requested) ? Math.floor(requested as number) : hardLimit;
  return Math.min(Math.max(requestedLimit, 120), hardLimit);
}

function exotelRingTimeoutSeconds(requested?: number): number {
  const value = Number.isFinite(requested) ? Math.floor(requested as number) : 45;
  return Math.min(Math.max(value, 20), 60);
}

function normalizeExotelPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const m = digits.match(/^(?:\+?91)?(\d{10})$/);
  if (m) return `0${m[1]}`;
  if (/^0\d{10}$/.test(digits)) return digits;
  return raw.replace(/[-\s]/g, "");
}

/**
 * Exotel Voice API adapter.
 * Docs: https://developer.exotel.com/api/make-a-call-api
 *
 * For AI voicebot / streaming calls, uses single-leg transactional call (CallType: "trans",
 * From = destination, CallerId = virtual number) to prevent Exotel from billing 2 separate legs.
 */
export class ExotelCallService implements TelephonyProvider {
  constructor(private readonly client: ExotelClient) {}

  async placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    const hasFlowOrStream = Boolean(input.flowUrl || input.streamUrl);
    const body: Record<string, string> = hasFlowOrStream
      ? {
          // Single-leg AI call: From = customer, CallerId = ExoPhone
          From: normalizeExotelPhone(input.to),
          CallerId: normalizeExotelPhone(input.from),
          CallType: "trans",
          Record: "false",
          StatusCallback: input.statusCallbackUrl,
          StatusCallbackEvents: '["terminal", "answered"]',
          StatusCallbackContentType: "application/json",
        }
      : {
          From: normalizeExotelPhone(input.from),
          To: normalizeExotelPhone(input.to),
          CallerId: normalizeExotelPhone(input.from),
          Record: "false",
          StatusCallback: input.statusCallbackUrl,
          StatusCallbackEvents: '["terminal", "answered"]',
          StatusCallbackContentType: "application/json",
        };

    const customField = input.customField ?? input.customParameters?.callId;
    if (customField) {
      body.CustomField = customField;
    }
    if (input.flowUrl) {
      body.Url = input.flowUrl;
    } else if (input.streamUrl) {
      body.StreamUrl = input.streamUrl.replace(/^http/i, "ws");
      body.StreamType = "bidirectional";
    }
    void input.record;
    // TimeOut controls ringing only. TimeLimit is the answered-call hard cap.
    // Keep them separate so a short ring timeout never ends a live AI call.
    body.TimeOut = String(exotelRingTimeoutSeconds());
    body.TimeLimit = String(exotelMaxCallDurationSeconds(input.timeoutSeconds));

    const response = await this.client.request<ExotelCallResource>(
      "POST",
      "/Calls/connect.json",
      body,
    );

    const sid = response.Call?.Sid;
    if (!sid) {
      throw new Error("Exotel did not return Call.Sid");
    }

    return {
      providerCallId: sid,
      status: response.Call?.Status ?? "queued",
      raw: response,
    };
  }

  async hangup(providerCallId: string): Promise<void> {
    await this.client.request("POST", `/Calls/${providerCallId}.json`, {
      Status: "completed",
    });
  }

  async transfer(input: TransferCallInput): Promise<void> {
    // Exotel transfer via Call update / applet — use connect to new destination
    await this.client.request("POST", `/Calls/${input.providerCallId}.json`, {
      Status: "completed",
    });
    // Actual warm transfer is typically done via ExoML applets; hangup + new leg
    // is handled by voice-runtime. Here we record the intent via API update.
    void input.to;
  }

  async getCall(providerCallId: string): Promise<ExotelCallResource> {
    return this.client.request<ExotelCallResource>("GET", `/Calls/${providerCallId}.json`);
  }
}
