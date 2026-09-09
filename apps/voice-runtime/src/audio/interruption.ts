/**
 * Clears / discards buffered outbound audio on barge-in so the caller
 * hears the interruption immediately instead of leftover AI speech.
 */
export class InterruptionController {
  private outboundQueue: Buffer[] = [];
  private interrupted = false;
  private generation = 0;
  private onClear?: () => void;

  setClearHandler(handler: () => void): void {
    this.onClear = handler;
  }

  /** Current generation token — discard frames from older generations. */
  getGeneration(): number {
    return this.generation;
  }

  isInterrupted(): boolean {
    return this.interrupted;
  }

  enqueueOutbound(chunk: Buffer, generation?: number): void {
    if (generation !== undefined && generation !== this.generation) {
      return;
    }
    if (this.interrupted) {
      return;
    }
    this.outboundQueue.push(Buffer.from(chunk));
  }

  dequeueOutbound(): Buffer | undefined {
    if (this.interrupted) return undefined;
    return this.outboundQueue.shift();
  }

  peekQueueLength(): number {
    return this.outboundQueue.length;
  }

  /**
   * Barge-in: stop playback, discard buffered outbound audio, bump generation
   * so in-flight AI audio is ignored.
   */
  interrupt(): number {
    this.interrupted = true;
    this.outboundQueue = [];
    this.generation += 1;
    this.onClear?.();
    return this.generation;
  }

  /** Resume accepting outbound audio after an interruption settles. */
  clearInterrupted(): void {
    this.interrupted = false;
  }

  reset(): void {
    this.outboundQueue = [];
    this.interrupted = false;
    this.generation = 0;
  }
}
