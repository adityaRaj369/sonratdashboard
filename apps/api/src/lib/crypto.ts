import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@sonrat/shared";

export type AppVariables = {
  requestId: string;
  userId?: string;
  organizationId?: string;
  role?: Role;
  sessionId?: string;
  email?: string;
  name?: string;
  idempotencyReplay?: boolean;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

export function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
