import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import { AuthenticationError, NotFoundError, ValidationError } from "@sonrat/shared";
import { z } from "zod";
import { buildPromptFromDraft } from "../../integrations/ai/gemini/prompt-builder.js";
import { createAiProvider } from "../../integrations/ai/gemini/index.js";
import { ToolService } from "../../services/tool.service.js";
import { CallStateService } from "../../services/call-state.service.js";
import type { CallStatus } from "@sonrat/shared";

const voice = new Hono();
const tools = new ToolService();
const callState = new CallStateService();

/** Internal auth between voice-runtime and API via shared AUTH_SECRET bearer. */
function assertInternalAuth(c: { req: { header: (n: string) => string | undefined } }) {
  const config = getConfig();
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== config.AUTH_SECRET) {
    throw new AuthenticationError("Invalid internal credentials");
  }
}

voice.post(
  "/calls/:callId/session",
  zValidator(
    "json",
    z.object({
      customerName: z.string().optional(),
      customerContext: z.string().optional(),
    }),
  ),
  async (c) => {
    assertInternalAuth(c);
    const callId = c.req.param("callId")!;
    const body = c.req.valid("json");

    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        contact: true,
        campaign: true,
        agentVersion: true,
        agent: true,
      },
    });
    if (!call) throw new NotFoundError("Call");

    const runtime = buildPromptFromDraft(call.agentVersion.config, {
      customerName: body.customerName ?? call.contact?.name ?? "Customer",
      customerContext:
        body.customerContext ??
        [call.contact?.company, call.contact?.notes, call.contact?.leadStatus]
          .filter(Boolean)
          .join(" | "),
      campaignName: call.campaign?.name ?? "",
      organizationId: call.organizationId,
      agentId: call.agentId,
      agentVersionId: call.agentVersionId,
    });

    const ai = createAiProvider();
    const session = await ai.buildSessionConfig({
      systemPrompt: runtime.systemPrompt,
      voiceId: runtime.voiceId,
      language: runtime.defaultLanguage,
      supportedLanguages: runtime.supportedLanguages,
    });

    const callSession = await db.callSession.create({
      data: {
        organizationId: call.organizationId,
        callId: call.id,
        conversationLanguage: runtime.defaultLanguage,
        status: "active",
        metadata: { provider: session.provider, model: session.model },
      },
    });

    await db.conversation.upsert({
      where: { callId: call.id },
      create: {
        organizationId: call.organizationId,
        callId: call.id,
        language: runtime.defaultLanguage,
      },
      update: {},
    });

    try {
      await callState.transition({
        organizationId: call.organizationId,
        callId: call.id,
        to: "AI_ACTIVE",
        actor: "voice-runtime",
      });
    } catch {
      // may already be AI_ACTIVE
    }

    return c.json({
      callSessionId: callSession.id,
      organizationId: call.organizationId,
      callId: call.id,
      agentId: call.agentId,
      agentVersionId: call.agentVersionId,
      enabledTools: runtime.enabledTools,
      session,
    });
  },
);

voice.post(
  "/calls/:callId/tools/:toolName",
  zValidator(
    "json",
    z.object({
      args: z.unknown().default({}),
      idempotencyKey: z.string().min(8),
    }),
  ),
  async (c) => {
    assertInternalAuth(c);
    const call = await db.call.findUnique({ where: { id: c.req.param("callId")! } });
    if (!call) throw new NotFoundError("Call");

    const body = c.req.valid("json");
    const result = await tools.execute({
      organizationId: call.organizationId,
      callId: call.id,
      toolName: c.req.param("toolName")!,
      args: body.args,
      idempotencyKey: body.idempotencyKey,
    });

    return c.json({ result });
  },
);

voice.post(
  "/calls/:callId/transition",
  zValidator(
    "json",
    z.object({
      to: z.string(),
      reason: z.string().optional(),
      payload: z.record(z.unknown()).optional(),
    }),
  ),
  async (c) => {
    assertInternalAuth(c);
    const call = await db.call.findUnique({ where: { id: c.req.param("callId")! } });
    if (!call) throw new NotFoundError("Call");
    const body = c.req.valid("json");

    const updated = await callState.transition({
      organizationId: call.organizationId,
      callId: call.id,
      to: body.to as CallStatus,
      reason: body.reason,
      payload: body.payload,
      actor: "voice-runtime",
    });

    return c.json(updated);
  },
);

voice.post(
  "/calls/:callId/messages",
  zValidator(
    "json",
    z.object({
      role: z.enum(["user", "assistant", "tool", "system"]),
      content: z.string(),
      language: z.string().optional(),
      toolCallId: z.string().optional(),
    }),
  ),
  async (c) => {
    assertInternalAuth(c);
    const call = await db.call.findUnique({
      where: { id: c.req.param("callId")! },
      include: { conversation: true },
    });
    if (!call) throw new NotFoundError("Call");
    if (!call.conversation) throw new ValidationError("Conversation not initialized");

    const body = c.req.valid("json");
    const message = await db.conversationMessage.create({
      data: {
        conversationId: call.conversation.id,
        role: body.role,
        content: body.content,
        language: body.language,
        toolCallId: body.toolCallId,
      },
    });

    return c.json(message, 201);
  },
);

export default voice;
