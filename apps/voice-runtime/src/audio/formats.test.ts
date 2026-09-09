import { describe, expect, it } from "vitest";
import {
  convertAudio,
  EXOTEL_DEFAULT_FORMAT,
  GEMINI_INPUT_FORMAT,
  mulawToPcm16,
  pcm16ToMulaw,
  resamplePcm16,
} from "./formats.js";

describe("audio formats", () => {
  it("round-trips silence through mulaw", () => {
    const pcm = Buffer.alloc(160); // 80 samples
    const mulaw = pcm16ToMulaw(pcm);
    expect(mulaw.length).toBe(80);
    const back = mulawToPcm16(mulaw);
    expect(back.length).toBe(160);
  });

  it("resamples 8k -> 16k doubling sample count", () => {
    const pcm8k = Buffer.alloc(160); // 80 samples @ 8kHz = 10ms
    const pcm16k = resamplePcm16(pcm8k, 8000, 16000);
    expect(pcm16k.length).toBe(320);
  });

  it("converts Exotel mulaw to Gemini PCM input", () => {
    const mulaw = Buffer.alloc(80, 0xff);
    const out = convertAudio(mulaw, EXOTEL_DEFAULT_FORMAT, GEMINI_INPUT_FORMAT);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length % 2).toBe(0);
  });
});
