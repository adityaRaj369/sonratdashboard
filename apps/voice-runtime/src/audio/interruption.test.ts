import { describe, expect, it } from "vitest";
import { InterruptionController } from "./interruption.js";

describe("InterruptionController", () => {
  it("clears outbound queue on barge-in and bumps generation", () => {
    const ctrl = new InterruptionController();
    let cleared = 0;
    ctrl.setClearHandler(() => {
      cleared += 1;
    });

    const gen0 = ctrl.getGeneration();
    ctrl.enqueueOutbound(Buffer.from("aaa"));
    ctrl.enqueueOutbound(Buffer.from("bbb"));
    expect(ctrl.peekQueueLength()).toBe(2);

    const gen1 = ctrl.interrupt();
    expect(gen1).toBe(gen0 + 1);
    expect(ctrl.peekQueueLength()).toBe(0);
    expect(ctrl.isInterrupted()).toBe(true);
    expect(cleared).toBe(1);
    expect(ctrl.dequeueOutbound()).toBeUndefined();
  });

  it("discards frames from older generations", () => {
    const ctrl = new InterruptionController();
    const gen = ctrl.getGeneration();
    ctrl.enqueueOutbound(Buffer.from("keep"), gen);
    ctrl.interrupt();
    ctrl.clearInterrupted();
    ctrl.enqueueOutbound(Buffer.from("stale"), gen);
    expect(ctrl.peekQueueLength()).toBe(0);
    ctrl.enqueueOutbound(Buffer.from("fresh"), ctrl.getGeneration());
    expect(ctrl.peekQueueLength()).toBe(1);
  });
});
