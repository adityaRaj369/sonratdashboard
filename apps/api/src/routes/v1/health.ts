import { Hono } from "hono";
import { db } from "@sonrat/database";
import { redisPing } from "../../lib/redis.js";

const health = new Hono();

health.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "sonrat-api",
    timestamp: new Date().toISOString(),
  }),
);

health.get("/ready", async (c) => {
  const checks: Record<string, boolean> = {
    database: false,
    redis: false,
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  checks.redis = await redisPing();

  const ready = checks.database;
  return c.json(
    {
      status: ready ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    ready ? 200 : 503,
  );
});

export default health;
