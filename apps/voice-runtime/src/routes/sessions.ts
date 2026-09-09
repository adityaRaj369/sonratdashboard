import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SessionManager } from "../sessions/session-manager.js";

const createSessionBody = z.object({
  callId: z.string().min(1),
  organizationId: z.string().min(1),
  agentId: z.string().min(1),
  agentVersionId: z.string().min(1),
  campaignId: z.string().optional(),
  contactId: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  systemPrompt: z.string().min(1),
  defaultLanguage: z.string().default("en"),
  supportedLanguages: z.array(z.string()).default(["en"]),
  voiceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerSessionRoutes(
  app: FastifyInstance,
  sessions: SessionManager,
): Promise<void> {
  app.get("/sessions", async () => ({
    sessions: sessions.list(),
  }));

  app.post("/sessions", async (req, reply) => {
    const body = createSessionBody.parse(req.body);
    const session = await sessions.create(body);
    return reply.code(201).send({
      sessionId: session.id,
      callId: session.context.callId,
      status: session.status,
      language: session.getLanguageState(),
    });
  });

  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      return reply.code(404).send({ error: "Session not found" });
    }
    return {
      sessionId: session.id,
      callId: session.context.callId,
      status: session.status,
      language: session.getLanguageState(),
      transcripts: session.getTranscripts(),
    };
  });

  app.post<{ Params: { id: string } }>(
    "/sessions/:id/reconnect",
    async (req, reply) => {
      try {
        const session = await sessions.reconnect(req.params.id);
        return { sessionId: session.id, status: session.status };
      } catch {
        return reply.code(404).send({ error: "Session not found" });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/sessions/:id/shutdown",
    async (req, reply) => {
      await sessions.shutdown(req.params.id, "api");
      return reply.code(204).send();
    },
  );
}
