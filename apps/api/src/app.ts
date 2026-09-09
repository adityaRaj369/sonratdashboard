import { Hono } from "hono";
import { cors } from "hono/cors";
import { getConfig } from "@sonrat/config";
import type { AppVariables } from "./lib/crypto.js";
import { logger } from "./lib/logger.js";
import { errorHandler, requestIdMiddleware } from "./middleware/error.js";

import auth from "./routes/v1/auth.js";
import agents from "./routes/v1/agents.js";
import campaigns from "./routes/v1/campaigns.js";
import contacts from "./routes/v1/contacts.js";
import calls from "./routes/v1/calls.js";
import analytics from "./routes/v1/analytics.js";
import phoneNumbers from "./routes/v1/phone-numbers.js";
import settings from "./routes/v1/settings.js";
import notifications from "./routes/v1/notifications.js";
import workspaceState from "./routes/v1/workspace-state.js";
import health from "./routes/v1/health.js";
import exotelWebhooks from "./routes/webhooks/exotel.js";
import internalVoice from "./routes/internal/voice.js";

export function createApp() {
  const config = getConfig();
  const app = new Hono<{ Variables: AppVariables }>();

  app.onError(errorHandler);
  app.use("*", requestIdMiddleware);

  const origins = config.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  app.use(
    "*",
    cors({
      origin: origins,
      credentials: true,
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
        "X-Request-Id",
      ],
      exposeHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    }),
  );

  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    logger.info("http_request", {
      request_id: c.get("requestId"),
      organization_id: c.get("organizationId"),
      user_id: c.get("userId"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Date.now() - start,
    });
  });

  app.route("/", health);

  app.route("/api/v1/auth", auth);
  app.route("/api/v1/agents", agents);
  app.route("/api/v1/campaigns", campaigns);
  app.route("/api/v1/contacts", contacts);
  app.route("/api/v1/calls", calls);
  app.route("/api/v1/analytics", analytics);
  app.route("/api/v1/phone-numbers", phoneNumbers);
  app.route("/api/v1/settings", settings);
  app.route("/api/v1/notifications", notifications);
  app.route("/api/v1/workspace-state", workspaceState);

  app.route("/webhooks/exotel", exotelWebhooks);
  app.route("/internal/voice", internalVoice);

  app.notFound((c) =>
    c.json(
      {
        error: { code: "NOT_FOUND", message: "Route not found" },
        request_id: c.get("requestId"),
      },
      404,
    ),
  );

  return app;
}

export type App = ReturnType<typeof createApp>;
