import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import { AuthenticationError, NotFoundError, ValidationError } from "@sonrat/shared";
import { z } from "zod";
import { buildPromptFromDraft, resolveFlowInstructions } from "../../integrations/ai/gemini/prompt-builder.js";
import { createAiProvider } from "../../integrations/ai/gemini/index.js";
import { ToolService } from "../../services/tool.service.js";
import { CallStateService } from "../../services/call-state.service.js";
import type { CallStatus } from "@sonrat/shared";

const voice = new Hono();
const tools = new ToolService();
const callState = new CallStateService();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const callInclude = {
  contact: true,
  campaign: true,
  agentVersion: true,
  agent: true,
  conversation: true,
} as const;

async function markCallAiActive(input: {
  organizationId: string;
  callId: string;
  currentStatus: CallStatus;
}) {
  const sequence: CallStatus[] = [];
  if (input.currentStatus === "QUEUED") {
    sequence.push("INITIATING", "RINGING", "CONNECTED");
  } else if (input.currentStatus === "INITIATING") {
    sequence.push("RINGING", "CONNECTED");
  } else if (input.currentStatus === "RINGING") {
    sequence.push("CONNECTED");
  }

  for (const to of [...sequence, "AI_ACTIVE" as CallStatus]) {
    try {
      await callState.transition({
        organizationId: input.organizationId,
        callId: input.callId,
        to,
        actor: "voice-runtime",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      if (!message.includes("Invalid call state transition")) throw err;
    }
  }
}

async function findCallByIdOrProvider(callId: string) {
  const where = UUID_RE.test(callId)
    ? { OR: [{ id: callId }, { providerCallId: callId }] }
    : { providerCallId: callId };

  return db.call.findFirst({
    where,
    include: callInclude,
  });
}

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

    const call = await findCallByIdOrProvider(callId);
    if (!call) throw new NotFoundError("Call");
    if (!call.agentVersion || !call.agent) {
      throw new ValidationError("Call has no active agent version");
    }

    const flowInstructions = await resolveFlowInstructions(
      call.organizationId,
      call.agentVersion.config,
    );

    // Compose campaign-level instructions into the prompt so the AI follows
    // the per-campaign objective, sales script, and operational notes.
    const campaignPromptSupplement = [
      call.campaign?.salesInstructions,
      call.campaign?.campaignInstructions,
    ]
      .filter(Boolean)
      .join("\n\n");

    const combinedFlowInstructions = [
      flowInstructions,
      campaignPromptSupplement,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Build rich customer context: include custom fields if present.
    const contactCustomFields = call.contact?.customFields &&
      typeof call.contact.customFields === "object" &&
      Object.keys(call.contact.customFields as object).length > 0
        ? `Custom fields: ${JSON.stringify(call.contact.customFields)}`
        : null;

    const runtime = buildPromptFromDraft(call.agentVersion.config, {
      customerName: body.customerName ?? call.contact?.name ?? "Customer",
      customerContext:
        body.customerContext ??
        [
          call.contact?.company,
          call.contact?.notes,
          call.contact?.leadStatus,
          contactCustomFields,
        ]
          .filter(Boolean)
          .join(" | "),
      campaignName: call.campaign?.name ?? "",
      organizationId: call.organizationId,
      agentId: call.agentId,
      agentVersionId: call.agentVersionId,
      flowInstructions: combinedFlowInstructions || undefined,
    });

    const configJson = call.agentVersion.config as {
      general?: { name?: string; purpose?: string };
      company?: { companyName?: string };
    };
    const agentName = configJson.general?.name ?? call.agent.name ?? "Agent";
    const companyName =
      configJson.company?.companyName ?? "the company";
    const agentPurpose = (configJson.general?.purpose ?? "sales") as
      | "sales"
      | "support"
      | "whatsapp"
      | "hybrid";
    const direction =
      call.direction === "INBOUND" ? ("inbound" as const) : ("outbound" as const);

    const languageInstruction = `Start in ${runtime.defaultLanguage}. Supported languages: ${runtime.supportedLanguages.join(", ")}. ${runtime.supportedLanguages.length > 1 ? "If the customer clearly switches to a supported language, follow them naturally." : "Do not switch languages unless the customer explicitly requests it."}`;
    const openingInstruction =
      direction === "inbound" || agentPurpose === "support"
        ? `You are ${agentName} from ${companyName} on a live support call. ${languageInstruction} Greet briefly, state you are from ${companyName}, and ask how you can help with their issue. One short sentence only. Do not say you are Gemini or Google.`
        : `You are ${agentName} from ${companyName} on a live outbound sales call. ${languageInstruction} Greet briefly, introduce yourself and ${companyName}, and state why you are calling in one short natural sentence. Do not say you are Gemini or Google. Do not ask a generic "how can I help" unless the customer asks first.`;

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

    await markCallAiActive({
      organizationId: call.organizationId,
      callId: call.id,
      currentStatus: call.status as CallStatus,
    });

    return c.json({
      callSessionId: callSession.id,
      organizationId: call.organizationId,
      callId: call.id,
      agentId: call.agentId,
      agentVersionId: call.agentVersionId,
      campaignId: call.campaignId,
      contactId: call.contactId,
      direction,
      systemPrompt: runtime.systemPrompt,
      defaultLanguage: runtime.defaultLanguage,
      supportedLanguages: runtime.supportedLanguages,
      voiceId: runtime.voiceId,
      enabledTools: runtime.enabledTools,
      agentName,
      companyName,
      agentPurpose,
      openingInstruction,
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
    const call = await findCallByIdOrProvider(c.req.param("callId")!);
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
    const call = await findCallByIdOrProvider(c.req.param("callId")!);
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
    const call = await findCallByIdOrProvider(c.req.param("callId")!);
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
