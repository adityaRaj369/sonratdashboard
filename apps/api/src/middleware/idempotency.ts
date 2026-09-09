import type { Context, Next } from "hono";
import { db } from "@sonrat/database";
import { ConflictError, ValidationError } from "@sonrat/shared";
import type { AppVariables } from "../lib/crypto.js";
import { hashRequestBody } from "../lib/crypto.js";

type AppEnv = { Variables: AppVariables };

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Idempotency-Key support for side-effecting routes.
 * Stores request hash + response; replays identical requests; conflicts on mismatch.
 */
export function idempotencyMiddleware(options?: { required?: boolean }) {
  return async (c: Context<AppEnv>, next: Next) => {
    const organizationId = c.get("organizationId");
    if (!organizationId) {
      await next();
      return;
    }

    const key = c.req.header("Idempotency-Key") ?? c.req.header("idempotency-key");
    if (!key) {
      if (options?.required) {
        throw new ValidationError("Idempotency-Key header is required");
      }
      await next();
      return;
    }

    if (key.length < 8 || key.length > 128) {
      throw new ValidationError("Idempotency-Key must be 8-128 characters");
    }

    let body: unknown = null;
    const method = c.req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await c.req.raw.clone().json();
      } catch {
        body = null;
      }
    }

    const requestHash = hashRequestBody(body);
    const existing = await db.idempotencyKey.findUnique({
      where: {
        organizationId_key: { organizationId, key },
      },
    });

    if (existing) {
      if (existing.expiresAt < new Date()) {
        await db.idempotencyKey.delete({ where: { id: existing.id } });
      } else if (existing.requestHash !== requestHash) {
        throw new ConflictError("Idempotency-Key reused with different request body");
      } else if (existing.responseStatus != null && existing.responseBody != null) {
        return c.json(existing.responseBody as object, existing.responseStatus as 200);
      } else {
        throw new ConflictError("Request with this Idempotency-Key is already in progress");
      }
    }

    await db.idempotencyKey.create({
      data: {
        organizationId,
        key,
        requestHash,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });

    await next();

    if (c.res && c.res.status < 500) {
      try {
        const cloned = c.res.clone();
        const responseBody = await cloned.json().catch(() => ({ ok: true }));
        await db.idempotencyKey.update({
          where: { organizationId_key: { organizationId, key } },
          data: {
            responseStatus: c.res.status,
            responseBody: responseBody as object,
          },
        });
      } catch {
        // best-effort persistence
      }
    }
  };
}
