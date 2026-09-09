import type { FastifyInstance } from "fastify";
import type { SessionManager } from "../sessions/session-manager.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  sessions: SessionManager,
): Promise<void> {
  app.get("/health", async () => ({
    status: "ok",
    service: "voice-runtime",
    activeSessions: sessions.activeCount,
  }));

  app.get("/ready", async (_req, reply) => {
    // Ready when process is accepting connections; sessions optional.
    return reply.send({
      status: "ready",
      service: "voice-runtime",
      activeSessions: sessions.activeCount,
    });
  });
}
