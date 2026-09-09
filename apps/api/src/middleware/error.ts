import type { Context, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { isAppError } from "@sonrat/shared";
import { logger } from "../lib/logger.js";
import type { AppVariables } from "../lib/crypto.js";

type AppEnv = { Variables: AppVariables };

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get("requestId") ?? c.req.header("x-request-id") ?? "unknown";
  const organizationId = c.get("organizationId");

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: err.flatten(),
        },
        request_id: requestId,
      },
      400,
    );
  }

  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      logger.error("app_error", {
        request_id: requestId,
        organization_id: organizationId,
        code: err.code,
        message: err.message,
      });
    }
    return c.json({ ...err.toJSON(), request_id: requestId }, err.statusCode as 400);
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: { code: "HTTP_ERROR", message: err.message },
        request_id: requestId,
      },
      err.status,
    );
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("unhandled_error", {
    request_id: requestId,
    organization_id: organizationId,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      request_id: requestId,
    },
    500,
  );
};

export async function requestIdMiddleware(
  c: Context<AppEnv>,
  next: () => Promise<void>,
) {
  const incoming = c.req.header("x-request-id");
  const requestId =
    incoming && incoming.length <= 64
      ? incoming
      : crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
}
