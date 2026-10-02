import { getConfig } from "@sonrat/config";
import { ProviderError } from "@sonrat/shared";
import { childLogger } from "../lib/logger.js";
import { randomUUID } from "node:crypto";

export interface PlaceCallRequest {
  from: string;
  to: string;
  /** Absolute WebSocket URL for media streaming (voice-runtime) */
  streamUrl?: string;
  /** Exotel App Bazaar / ExoML flow URL (preferred when Voicebot applet is used) */
  flowUrl?: string;
  statusCallbackUrl?: string;
  customParameters?: Record<string, string>;
  timeoutSeconds?: number;
}

export interface PlaceCallResult {
  providerCallId: string;
  status: "initiated" | "queued" | "failed";
  raw?: unknown;
}

export interface TelephonyClient {
  placeOutboundCall(req: PlaceCallRequest): Promise<PlaceCallResult>;
  hangup(providerCallId: string): Promise<void>;
}

function exotelCallLimitSeconds(requested?: number): number {
  const configured = Number(process.env.EXOTEL_MAX_CALL_DURATION_SECONDS ?? 60);
  const hardLimit = Number.isFinite(configured)
    ? Math.min(Math.max(Math.floor(configured), 30), 600)
    : 60;
  const requestedLimit = Number.isFinite(requested) ? Math.floor(requested as number) : hardLimit;
  return Math.min(Math.max(requestedLimit, 30), hardLimit);
}

export class MockExotelClient implements TelephonyClient {
  private readonly log = childLogger({ component: "exotel-mock" });

  async placeOutboundCall(req: PlaceCallRequest): Promise<PlaceCallResult> {
    const providerCallId = `mock-exotel-${randomUUID()}`;
    this.log.info(
      { providerCallId, from: req.from, to: req.to },
      "mock outbound call placed",
    );
    return { providerCallId, status: "initiated" };
  }

  async hangup(providerCallId: string): Promise<void> {
    this.log.info({ providerCallId }, "mock hangup");
  }
}

function normalizeExotelPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  // +91XXXXXXXXXX or 91XXXXXXXXXX → 0XXXXXXXXXX (Exotel India style)
  const m = digits.match(/^(?:\+?91)?(\d{10})$/);
  if (m) return `0${m[1]}`;
  // Already 0XXXXXXXXXX
  if (/^0\d{10}$/.test(digits)) return digits;
  return raw.replace(/[-\s]/g, "");
}

export class ExotelClient implements TelephonyClient {
  private readonly log = childLogger({ component: "exotel" });

  constructor(
    private readonly opts: {
      apiKey: string;
      apiToken: string;
      accountSid: string;
      subdomain: string;
      flowUrl?: string;
    },
  ) {}

  private authHeader(): string {
    const token = Buffer.from(
      `${this.opts.apiKey}:${this.opts.apiToken}`,
    ).toString("base64");
    return `Basic ${token}`;
  }

  async placeOutboundCall(req: PlaceCallRequest): Promise<PlaceCallResult> {
    const url = `https://${this.opts.subdomain}/v1/Accounts/${this.opts.accountSid}/Calls/connect.json`;

    // Connect-to-Flow: From = customer, CallerId = ExoPhone, Url = flow
    // Do NOT send `To` together with `Url` — that triggers Exotel's
    // "number not properly setup / App Bazaar" prompt.
    const flowUrl = req.flowUrl || this.opts.flowUrl;
    const params: Record<string, string> = {
      From: normalizeExotelPhone(req.to),
      CallerId: normalizeExotelPhone(req.from),
      CallType: "trans",
    };

    if (flowUrl) {
      params.Url = flowUrl;
    } else if (req.streamUrl) {
      params.StreamUrl = req.streamUrl.replace(/^http/i, "ws");
      params.StreamType = "bidirectional";
    }

    // Some Exotel accounts use a Voicebot/stream applet configured on the
    // number, while others accept the stream URL directly. Preserve the
    // explicit stream configuration in either case and never silently drop it.
    if (req.streamUrl && !params.StreamUrl && !flowUrl) {
      params.StreamUrl = req.streamUrl.replace(/^http/i, "ws");
      params.StreamType = "bidirectional";
    }

    if (req.statusCallbackUrl) {
      params.StatusCallback = req.statusCallbackUrl;
    }
    if (req.timeoutSeconds) {
      // TimeOut only controls unanswered ringing. TimeLimit is the hard cap
      // for an answered call; without it a live AI call can bill indefinitely.
      const callLimitSeconds = exotelCallLimitSeconds(req.timeoutSeconds);
      params.TimeOut = String(Math.min(callLimitSeconds, 60));
      params.TimeLimit = String(callLimitSeconds);
    } else {
      // Always send a billing cap, even when an older campaign has no timeout.
      params.TimeOut = "60";
      params.TimeLimit = String(exotelCallLimitSeconds());
    }
    if (req.customParameters?.callId) {
      // Exotel CustomField is free-form; keep it a bare call UUID (no & pairs —
      // those get mangled into custom_parameters on some trial accounts).
      params.CustomField = req.customParameters.callId;
    }

    this.log.info(
      {
        from: params.From,
        callerId: params.CallerId,
        hasUrl: Boolean(params.Url),
        flowUrl: params.Url,
      },
      "exotel place call request",
    );

    const body = new URLSearchParams(params);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.log.error({ status: res.status, raw }, "exotel place call failed");
      throw new ProviderError(`Exotel call failed: ${res.status}`, raw);
    }

    const call = (raw as { Call?: { Sid?: string; Status?: string } }).Call;
    return {
      providerCallId: call?.Sid ?? `exotel-${randomUUID()}`,
      status: "initiated",
      raw,
    };
  }

  async hangup(providerCallId: string): Promise<void> {
    const url = `https://${this.opts.subdomain}/v1/Accounts/${this.opts.accountSid}/Calls/${providerCallId}.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "completed" }),
    });
    if (!res.ok) {
      throw new ProviderError(`Exotel hangup failed: ${res.status}`);
    }
  }
}

export function createTelephonyClient(): TelephonyClient {
  const config = getConfig();
  if (
    config.MOCK_TELEPHONY ||
    config.TELEPHONY_PROVIDER === "mock" ||
    !config.EXOTEL_API_KEY
  ) {
    return new MockExotelClient();
  }
  return new ExotelClient({
    apiKey: config.EXOTEL_API_KEY!,
    apiToken: config.EXOTEL_API_TOKEN!,
    accountSid: config.EXOTEL_ACCOUNT_SID!,
    subdomain: config.EXOTEL_SUBDOMAIN,
    flowUrl: config.EXOTEL_FLOW_URL,
  });
}
