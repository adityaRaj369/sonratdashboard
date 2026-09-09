/**
 * Telephony stream abstraction for Exotel Voicebot / Stream applet.
 *
 * Exotel wire format uses snake_case (`stream_sid`, `call_sid`, `custom_parameters`)
 * and audio as base64 raw PCM16LE 8kHz mono (slin) — NOT µ-law.
 */

export interface TelephonyMediaFormat {
  encoding: string;
  sampleRate: number;
  channels: number;
}

export interface TelephonyStartInfo {
  streamSid: string;
  callSid: string;
  accountSid?: string;
  from?: string;
  to?: string;
  tracks?: string[];
  customParameters?: Record<string, string>;
  mediaFormat?: TelephonyMediaFormat;
}

export interface TelephonyMediaFrame {
  track?: string;
  chunk?: string | number;
  timestamp?: string;
  payload: string;
}

export type TelephonyInboundEvent =
  | { event: "connected"; protocol?: string; version?: string }
  | {
      event: "start";
      start: TelephonyStartInfo;
      sequenceNumber?: string;
      streamSid?: string;
    }
  | {
      event: "media";
      media: TelephonyMediaFrame;
      sequenceNumber?: string;
      streamSid?: string;
    }
  | { event: "stop"; stop?: Record<string, unknown>; streamSid?: string }
  | { event: "mark"; mark?: { name: string }; streamSid?: string }
  | { event: "clear"; streamSid?: string }
  | { event: "dtmf"; dtmf?: { digit?: string }; streamSid?: string };

export interface TelephonyOutboundMedia {
  event: "media";
  stream_sid: string;
  media: { payload: string };
}

export interface TelephonyStream {
  readonly streamSid: string | null;
  readonly callSid: string | null;
  sendMedia(payloadBase64: string): void;
  sendClear(): void;
  close(): void;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function normalizeCustomParams(
  raw: unknown,
): Record<string, string> | undefined {
  const obj = asRecord(raw);
  if (!obj) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

function normalizeMediaFormat(
  raw: unknown,
): TelephonyMediaFormat | undefined {
  const obj = asRecord(raw);
  if (!obj) return undefined;
  return {
    encoding: String(obj.encoding ?? obj.Encoding ?? "audio/x-l16"),
    sampleRate: Number(obj.sample_rate ?? obj.sampleRate ?? 8000),
    channels: Number(obj.channels ?? 1),
  };
}

function normalizeStart(raw: unknown): TelephonyStartInfo | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const streamSid = str(obj.stream_sid) ?? str(obj.streamSid);
  const callSid = str(obj.call_sid) ?? str(obj.callSid);
  if (!streamSid || !callSid) return null;
  return {
    streamSid,
    callSid,
    accountSid: str(obj.account_sid) ?? str(obj.accountSid),
    from: str(obj.from) ?? str(obj.From),
    to: str(obj.to) ?? str(obj.To),
    customParameters: normalizeCustomParams(
      obj.custom_parameters ?? obj.customParameters,
    ),
    mediaFormat: normalizeMediaFormat(obj.media_format ?? obj.mediaFormat),
  };
}

function normalizeMedia(raw: unknown): TelephonyMediaFrame | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const payload = str(obj.payload);
  if (!payload) return null;
  return {
    payload,
    track: str(obj.track),
    chunk: obj.chunk as string | number | undefined,
    timestamp: str(obj.timestamp),
  };
}

/**
 * Parse Exotel Voicebot websocket JSON, normalizing snake_case ↔ camelCase.
 */
export function parseTelephonyEvent(raw: string): TelephonyInboundEvent | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || !("event" in parsed)) {
      return null;
    }
    const event = String(parsed.event);
    const streamSid = str(parsed.stream_sid) ?? str(parsed.streamSid);
    const sequenceNumber =
      str(parsed.sequence_number) ??
      (parsed.sequence_number != null
        ? String(parsed.sequence_number)
        : undefined) ??
      str(parsed.sequenceNumber);

    switch (event) {
      case "connected":
        return {
          event: "connected",
          protocol: str(parsed.protocol),
          version: str(parsed.version),
        };
      case "start": {
        const start = normalizeStart(parsed.start);
        if (!start) return null;
        return { event: "start", start, sequenceNumber, streamSid };
      }
      case "media": {
        const media = normalizeMedia(parsed.media);
        if (!media) return null;
        return { event: "media", media, sequenceNumber, streamSid };
      }
      case "stop":
        return {
          event: "stop",
          stop: asRecord(parsed.stop) ?? undefined,
          streamSid,
        };
      case "mark":
        return {
          event: "mark",
          mark: asRecord(parsed.mark) as { name: string } | undefined,
          streamSid,
        };
      case "clear":
        return { event: "clear", streamSid };
      case "dtmf":
        return {
          event: "dtmf",
          dtmf: asRecord(parsed.dtmf) as { digit?: string } | undefined,
          streamSid,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
