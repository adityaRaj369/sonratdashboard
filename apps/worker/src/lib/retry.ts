export type FailureClass = "TRANSIENT" | "PERMANENT";

const TRANSIENT_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ECONNREFUSED/i,
  /socket hang up/i,
  /429/,
  /rate limit/i,
  /timeout/i,
  /temporar/i,
  /unavailable/i,
  /503/,
  /502/,
  /DEADLOCK/i,
  /serialization failure/i,
];

const PERMANENT_PATTERNS = [
  /validation/i,
  /invalid/i,
  /not found/i,
  /do.?not.?call/i,
  /forbidden/i,
  /unauthorized/i,
  /400/,
  /401/,
  /403/,
  /404/,
  /422/,
];

export function classifyFailure(error: unknown): FailureClass {
  if (
    error &&
    typeof error === "object" &&
    "failureClass" in error &&
    (error as { failureClass: FailureClass }).failureClass
  ) {
    return (error as { failureClass: FailureClass }).failureClass;
  }

  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

  for (const p of PERMANENT_PATTERNS) {
    if (p.test(message)) return "PERMANENT";
  }
  for (const p of TRANSIENT_PATTERNS) {
    if (p.test(message)) return "TRANSIENT";
  }
  // Default: transient so ops can investigate via retries/DLQ
  return "TRANSIENT";
}

export interface BackoffOptions {
  attempt: number;
  baseMs?: number;
  maxMs?: number;
  jitterRatio?: number;
}

/**
 * Exponential backoff with jitter.
 * delay = (1 - jitterRatio) * exp + random(0, jitterRatio * exp)
 * jitterRatio=1 is classic "full jitter".
 */
export function computeBackoffMs(options: BackoffOptions): number {
  const baseMs = options.baseMs ?? 1_000;
  const maxMs = options.maxMs ?? 15 * 60_000;
  const jitterRatio = Math.min(1, Math.max(0, options.jitterRatio ?? 1));
  const exp = Math.min(
    maxMs,
    baseMs * 2 ** Math.max(0, options.attempt - 1),
  );
  const basePart = exp * (1 - jitterRatio);
  const jitterPart = exp * jitterRatio * Math.random();
  return Math.floor(Math.min(maxMs, basePart + jitterPart));
}

export class PermanentJobError extends Error {
  readonly failureClass = "PERMANENT" as const;
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

export class TransientJobError extends Error {
  readonly failureClass = "TRANSIENT" as const;
  constructor(message: string) {
    super(message);
    this.name = "TransientJobError";
  }
}
