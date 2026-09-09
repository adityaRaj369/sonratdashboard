import { Hono } from "hono";
import { db } from "@sonrat/database";
import { logger } from "../../lib/logger.js";
import { buildPromptFromDraft } from "../../integrations/ai/gemini/prompt-builder.js";

const whatsapp = new Hono();

type WaConfig = {
  enabled?: boolean;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  agentId?: string;
};

function getWaConfig(featureFlags: unknown): WaConfig {
  const flags = (featureFlags || {}) as Record<string, unknown>;
  return (flags.whatsapp || {}) as WaConfig;
}

/** Meta webhook verification (GET). */
whatsapp.get("/", async (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const orgs = await db.organization.findMany({
    where: { deletedAt: null },
    select: { featureFlags: true },
    take: 50,
  });

  for (const org of orgs) {
    const wa = getWaConfig(org.featureFlags);
    if (mode === "subscribe" && token && wa.webhookVerifyToken === token) {
      return c.text(challenge || "", 200);
    }
  }

  return c.json({ error: "Verification failed" }, 403);
});

/**
 * Incoming WhatsApp Cloud API messages.
 * Uses mapped agent knowledge for a text reply (same brain as voice).
 */
whatsapp.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const entry = Array.isArray(body.entry) ? body.entry[0] : null;
  const changes = entry && typeof entry === "object" ? (entry as { changes?: unknown[] }).changes : null;
  const change = Array.isArray(changes) ? changes[0] : null;
  const value =
    change && typeof change === "object"
      ? ((change as { value?: Record<string, unknown> }).value ?? {})
      : {};
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const message = messages[0] as
    | { from?: string; id?: string; type?: string; text?: { body?: string } }
    | undefined;

  // Always ACK quickly
  if (!message?.from || !message.text?.body) {
    return c.json({ ok: true, ignored: true });
  }

  const phoneNumberId = String(
    (value.metadata as { phone_number_id?: string } | undefined)?.phone_number_id || "",
  );

  const orgs = await db.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, featureFlags: true },
  });

  let matched: { orgId: string; wa: WaConfig } | null = null;
  for (const org of orgs) {
    const wa = getWaConfig(org.featureFlags);
    if (!wa.enabled || !wa.agentId) continue;
    if (wa.phoneNumberId && phoneNumberId && wa.phoneNumberId !== phoneNumberId) {
      continue;
    }
    matched = { orgId: org.id, wa };
    break;
  }

  if (!matched?.wa.agentId || !matched.wa.accessToken) {
    logger.warn("whatsapp_no_config", { phoneNumberId });
    return c.json({ ok: true, unmatched: true });
  }

  const agent = await db.agent.findFirst({
    where: {
      id: matched.wa.agentId,
      organizationId: matched.orgId,
      deletedAt: null,
    },
    include: {
      versions: {
        where: { status: "ACTIVE" },
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  const config =
    agent?.versions[0]?.config ?? agent?.draftConfig ?? null;
  if (!config) {
    return c.json({ ok: true, no_agent: true });
  }

  const runtime = buildPromptFromDraft(config, {
    customerName: message.from,
    customerContext: "WhatsApp conversation",
  });

  const userText = message.text.body.trim();
  // Deterministic FAQ match first (cheap, no hallucination)
  const faqs =
    ((config as { knowledge?: { faqs?: Array<{ question: string; answer: string }> } })
      .knowledge?.faqs ?? []);
  const faqHit = faqs.find((f) =>
    userText.toLowerCase().includes((f.question || "").toLowerCase().slice(0, 24)),
  );

  let reply =
    faqHit?.answer ||
    `Thanks for messaging ${runtime.systemPrompt.includes("operating on behalf of") ? "us" : "our team"}. A specialist will follow up shortly.`;

  // Prefer first company line from prompt identity if FAQ miss
  if (!faqHit) {
    const companyMatch = runtime.systemPrompt.match(
      /operating on behalf of ([^.]+)\./,
    );
    const company = companyMatch?.[1]?.trim() || "our company";
    reply = `Hi, this is ${company} on WhatsApp. ${
      ((config as { knowledge?: { supportInformation?: string[] } }).knowledge
        ?.supportInformation?.[0] ||
        "How can we help you today?")
    }`;
  }

  try {
    const phoneId = matched.wa.phoneNumberId || phoneNumberId;
    if (phoneId && matched.wa.accessToken) {
      await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${matched.wa.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.from,
          type: "text",
          text: { body: reply.slice(0, 1000) },
        }),
      });
    }
  } catch (err) {
    logger.error("whatsapp_send_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return c.json({ ok: true });
});

export default whatsapp;
