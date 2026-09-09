import type { Context, Next } from "hono";
import { AuthenticationError } from "@sonrat/shared";
import type { AppVariables } from "../lib/crypto.js";

type AppEnv = { Variables: AppVariables };

/**
 * Ensures organizationId comes ONLY from the authenticated session.
 * Handlers must use getOrgId(c) — never trust client-supplied organizationId.
 */
export async function tenantMiddleware(c: Context<AppEnv>, next: Next) {
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    throw new AuthenticationError("Organization context required");
  }
  await next();
}

export function getOrgId(c: Context<AppEnv>): string {
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    throw new AuthenticationError("Organization context required");
  }
  return organizationId;
}

export function getUserId(c: Context<AppEnv>): string {
  const userId = c.get("userId");
  if (!userId) {
    throw new AuthenticationError();
  }
  return userId;
}
