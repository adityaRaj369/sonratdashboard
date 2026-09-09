import { describe, expect, it, beforeEach } from "vitest";
import { DomainEventBus } from "../events/domain-events.js";
import { ToolRegistry } from "../tools/registry.js";
import { ToolExecutor } from "../tools/tool-executor.js";
import { MockAIProvider } from "../ai/mock-ai-session.js";
import { GeminiSessionManager } from "../ai/gemini-session-manager.js";
import { SessionManager } from "./session-manager.js";

describe("SessionManager state", () => {
  let sessions: SessionManager;

  beforeEach(() => {
    const events = new DomainEventBus();
    const tools = new ToolRegistry();
    const toolExecutor = new ToolExecutor(tools, {
      apiInternalBaseUrl: "http://localhost:4000/internal",
      fetchImpl: (async () =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch,
    });
    const ai = new GeminiSessionManager(new MockAIProvider());
    sessions = new SessionManager(ai, tools, toolExecutor, events);
  });

  it("creates an active session and tracks by callId", async () => {
    const session = await sessions.create({
      callId: "call-1",
      organizationId: "org-1",
      agentId: "agent-1",
      agentVersionId: "ver-1",
      direction: "outbound",
      systemPrompt: "Test agent",
      defaultLanguage: "en",
      supportedLanguages: ["en", "hi"],
    });

    expect(session.status).toBe("active");
    expect(sessions.get(session.id)?.id).toBe(session.id);
    expect(sessions.getByCallId("call-1")?.id).toBe(session.id);
    expect(sessions.activeCount).toBe(1);
    expect(session.getLanguageState().conversationLanguage).toBe("en");
  });

  it("reuses existing non-ended session for same callId", async () => {
    const a = await sessions.create({
      callId: "call-2",
      organizationId: "org-1",
      agentId: "agent-1",
      agentVersionId: "ver-1",
      direction: "inbound",
      systemPrompt: "Test",
      defaultLanguage: "en",
      supportedLanguages: ["en"],
    });
    const b = await sessions.create({
      callId: "call-2",
      organizationId: "org-1",
      agentId: "agent-1",
      agentVersionId: "ver-1",
      direction: "inbound",
      systemPrompt: "Test",
      defaultLanguage: "en",
      supportedLanguages: ["en"],
    });
    expect(a.id).toBe(b.id);
  });

  it("shuts down and clears session maps", async () => {
    const session = await sessions.create({
      callId: "call-3",
      organizationId: "org-1",
      agentId: "agent-1",
      agentVersionId: "ver-1",
      direction: "outbound",
      systemPrompt: "Test",
      defaultLanguage: "en",
      supportedLanguages: ["en"],
    });
    await sessions.shutdown(session.id, "test");
    expect(sessions.get(session.id)).toBeUndefined();
    expect(sessions.getByCallId("call-3")).toBeUndefined();
    expect(sessions.activeCount).toBe(0);
  });
});
