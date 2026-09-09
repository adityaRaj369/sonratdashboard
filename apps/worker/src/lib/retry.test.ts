import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  computeBackoffMs,
  PermanentJobError,
  TransientJobError,
} from "./retry.js";

describe("classifyFailure", () => {
  it("marks validation/not-found as PERMANENT", () => {
    expect(classifyFailure(new PermanentJobError("invalid phone"))).toBe(
      "PERMANENT",
    );
    expect(classifyFailure(new Error("Contact not found"))).toBe("PERMANENT");
    expect(classifyFailure(new Error("do-not-call suppressed"))).toBe(
      "PERMANENT",
    );
  });

  it("marks timeouts and 503 as TRANSIENT", () => {
    expect(classifyFailure(new TransientJobError("ETIMEDOUT"))).toBe(
      "TRANSIENT",
    );
    expect(classifyFailure(new Error("503 unavailable"))).toBe("TRANSIENT");
    expect(classifyFailure(new Error("rate limit exceeded"))).toBe("TRANSIENT");
  });
});

describe("computeBackoffMs", () => {
  it("grows with attempt when jitter is disabled", () => {
    const a1 = computeBackoffMs({
      attempt: 1,
      baseMs: 1000,
      maxMs: 60_000,
      jitterRatio: 0,
    });
    const a4 = computeBackoffMs({
      attempt: 4,
      baseMs: 1000,
      maxMs: 60_000,
      jitterRatio: 0,
    });
    expect(a1).toBe(1000);
    expect(a4).toBe(8000);
  });

  it("clamps to maxMs", () => {
    const capped = computeBackoffMs({
      attempt: 20,
      baseMs: 1000,
      maxMs: 5000,
      jitterRatio: 0,
    });
    expect(capped).toBe(5000);
  });
});
