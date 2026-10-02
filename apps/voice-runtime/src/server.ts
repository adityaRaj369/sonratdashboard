import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { VoiceRuntimeConfig } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { DomainEventBus } from "./events/domain-events.js";
import { ToolRegistry } from "./tools/registry.js";
import { ToolExecutor } from "./tools/tool-executor.js";
import { createAIProvider, GeminiSessionManager } from "./ai/gemini-session-manager.js";
import { SessionManager } from "./sessions/session-manager.js";
import { VoiceGateway } from "./gateway/voice-gateway.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSessionRoutes } from "./routes/sessions.js";

export interface VoiceRuntimeApp {
  app: ReturnType<typeof Fastify>;
  sessions: SessionManager;
  events: DomainEventBus;
  close: () => Promise<void>;
}

export async function buildServer(
  config: VoiceRuntimeConfig,
): Promise<VoiceRuntimeApp> {
  const app = Fastify({
    logger: false,
  });

  await app.register(websocket);

  const events = new DomainEventBus();
  events.on("*", (event) => {
    logger.debug(
      {
        type: event.type,
        sessionId: event.sessionId,
        callId: event.callId,
      },
      "domain event",
    );
  });

  const tools = new ToolRegistry();
  const toolExecutor = new ToolExecutor(tools, {
    apiInternalBaseUrl: config.apiInternalBaseUrl,
    internalToken: config.AUTH_SECRET,
  });
  const aiProvider = createAIProvider(config);
  const aiManager = new GeminiSessionManager(aiProvider);
  const sessions = new SessionManager(aiManager, tools, toolExecutor, events);
  const gateway = new VoiceGateway(sessions, config);

  await registerHealthRoutes(app, sessions);
  await registerSessionRoutes(app, sessions);

  app.get("/ws/exotel", { websocket: true }, (socket, req) => {
    gateway.handleExotelSocket(socket, req);
  });

  app.get("/ws/session", { websocket: true }, (socket) => {
    gateway.handleSessionSocket(socket);
  });

  const close = async () => {
    await sessions.shutdownAll("server_close");
    await app.close();
  };

  return { app, sessions, events, close };
}
