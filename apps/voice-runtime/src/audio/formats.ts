/**
 * Audio format documentation & helpers for the Sonrat voice plane.
 *
 * ## Telephony (Exotel)
 * Exotel media streaming typically delivers:
 * - Encoding: `audio/x-mulaw` (G.711 µ-law) or linear PCM
 * - Sample rate: 8000 Hz (narrowband telephony)
 * - Channels: mono
 * - Frame: ~20ms chunks base64-encoded in `media.payload`
 *
 * Event shapes (WebSocket JSON):
 * - `{ event: "connected", protocol: "...", version: "..." }`
 * - `{ event: "start", start: { streamSid, callSid, tracks, mediaFormat } }`
 * - `{ event: "media", media: { track, chunk, timestamp, payload } }`
 * - `{ event: "stop", stop: { ... } }`
 *
 * ## Gemini Live (native audio)
 * Gemini Live native-audio models typically expect / emit:
 * - Encoding: PCM 16-bit little-endian (`pcm16`)
 * - Sample rate: 16000 Hz (input) / 24000 Hz (output) depending on model
 * - Channels: mono
 *
 * This module provides conversion stubs that are correct for mock/dev and
 * produce valid PCM buffers. Production µ-law tables are included.
 */

export type AudioEncoding = "mulaw" | "pcm16" | "pcm8";

export interface AudioFormat {
  encoding: AudioEncoding;
  sampleRate: number;
  channels: 1;
}

export const EXOTEL_DEFAULT_FORMAT: AudioFormat = {
  // Exotel Voicebot bidirectional stream = raw/slin PCM16LE @ 8 kHz mono
  encoding: "pcm16",
  sampleRate: 8000,
  channels: 1,
};

export const GEMINI_INPUT_FORMAT: AudioFormat = {
  encoding: "pcm16",
  sampleRate: 16000,
  channels: 1,
};

export const GEMINI_OUTPUT_FORMAT: AudioFormat = {
  encoding: "pcm16",
  sampleRate: 24000,
  channels: 1,
};

/** ITU-T G.711 µ-law decode table (signed 16-bit PCM). */
const MULAW_DECODE = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let mu = ~i & 0xff;
    const sign = mu & 0x80;
    const exponent = (mu >> 4) & 0x07;
    const mantissa = mu & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    table[i] = sign ? -sample : sample;
  }
  return table;
})();

/** Encode a single PCM16 sample to µ-law. */
function encodeMulawSample(sample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  let sign = (sample >> 8) & 0x80;
  if (sign) sample = -sample;
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;
  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulaw = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulaw;
}

export function mulawToPcm16(mulaw: Buffer): Buffer {
  const out = Buffer.allocUnsafe(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) {
    out.writeInt16LE(MULAW_DECODE[mulaw[i]!]!, i * 2);
  }
  return out;
}

export function pcm16ToMulaw(pcm: Buffer): Buffer {
  const samples = Math.floor(pcm.length / 2);
  const out = Buffer.allocUnsafe(samples);
  for (let i = 0; i < samples; i++) {
    out[i] = encodeMulawSample(pcm.readInt16LE(i * 2));
  }
  return out;
}

/**
 * Naive linear resampler for mock/dev. Production should use a proper
 * polyphase resampler; this keeps phase continuity acceptable for tests.
 */
export function resamplePcm16(
  input: Buffer,
  fromRate: number,
  toRate: number,
): Buffer {
  if (fromRate === toRate) return Buffer.from(input);
  const inSamples = Math.floor(input.length / 2);
  const outSamples = Math.max(1, Math.round((inSamples * toRate) / fromRate));
  const out = Buffer.allocUnsafe(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const srcPos = (i * fromRate) / toRate;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(inSamples - 1, i0 + 1);
    const frac = srcPos - i0;
    const s0 = input.readInt16LE(i0 * 2);
    const s1 = input.readInt16LE(i1 * 2);
    const sample = Math.round(s0 + (s1 - s0) * frac);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }
  return out;
}

export function convertAudio(
  input: Buffer,
  from: AudioFormat,
  to: AudioFormat,
): Buffer {
  let pcm: Buffer;
  if (from.encoding === "mulaw") {
    pcm = mulawToPcm16(input);
  } else if (from.encoding === "pcm8") {
    pcm = Buffer.allocUnsafe(input.length * 2);
    for (let i = 0; i < input.length; i++) {
      pcm.writeInt16LE((input[i]! - 128) << 8, i * 2);
    }
  } else {
    pcm = Buffer.from(input);
  }

  if (from.sampleRate !== to.sampleRate) {
    pcm = resamplePcm16(pcm, from.sampleRate, to.sampleRate);
  }

  if (to.encoding === "mulaw") {
    return pcm16ToMulaw(pcm);
  }
  if (to.encoding === "pcm8") {
    const out = Buffer.allocUnsafe(Math.floor(pcm.length / 2));
    for (let i = 0; i < out.length; i++) {
      out[i] = (pcm.readInt16LE(i * 2) >> 8) + 128;
    }
    return out;
  }
  return pcm;
}

export function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

export function bufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}
