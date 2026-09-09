import { describe, expect, it } from "vitest";
import { isWithinCallingHours } from "./admission.js";

describe("isWithinCallingHours", () => {
  it("accepts times inside a same-day window", () => {
    // 2026-09-05 10:00 UTC
    const now = new Date("2026-09-05T10:00:00.000Z");
    expect(isWithinCallingHours(now, "09:00", "18:00", "UTC")).toBe(true);
  });

  it("rejects times outside the window", () => {
    const now = new Date("2026-09-05T20:00:00.000Z");
    expect(isWithinCallingHours(now, "09:00", "18:00", "UTC")).toBe(false);
  });

  it("handles overnight windows", () => {
    const late = new Date("2026-09-05T23:00:00.000Z");
    const early = new Date("2026-09-05T05:00:00.000Z");
    const midday = new Date("2026-09-05T12:00:00.000Z");
    expect(isWithinCallingHours(late, "22:00", "06:00", "UTC")).toBe(true);
    expect(isWithinCallingHours(early, "22:00", "06:00", "UTC")).toBe(true);
    expect(isWithinCallingHours(midday, "22:00", "06:00", "UTC")).toBe(false);
  });
});
