import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { paginationSchema } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId } from "../../middleware/tenant.js";
import { CallService } from "../../services/call.service.js";

const calls = new Hono<{ Variables: AppVariables }>();
const service = new CallService();

function serializeCall(
  call: Awaited<ReturnType<CallService["get"]>>,
  events?: Awaited<ReturnType<CallService["events"]>>,
) {
  const outcomeRecord = call.outcomeRecord;
  return {
    ...call,
    fromNumber: call.phoneNumber?.e164 ?? null,
    toNumber: call.contact?.normalizedPhone ?? call.contact?.rawPhone ?? null,
    summary: outcomeRecord?.summary ?? null,
    outcome: call.outcome ?? outcomeRecord?.outcome ?? null,
    events: events ?? [],
    outcomeDetail: outcomeRecord
      ? {
          outcome: outcomeRecord.outcome,
          summary: outcomeRecord.summary,
          intent: outcomeRecord.intent,
          sentiment: outcomeRecord.sentiment,
          leadStatus: outcomeRecord.leadStatus,
          interestLevel: outcomeRecord.interestLevel,
          nextAction: outcomeRecord.nextAction,
          callbackRequired: outcomeRecord.callbackRequired,
          appointmentRequired: outcomeRecord.appointmentRequired,
          humanHandoff: outcomeRecord.humanHandoff,
          productsDiscussed: outcomeRecord.productsDiscussed,
          objections: outcomeRecord.objections,
          customerQuestions: outcomeRecord.customerQuestions,
          language: outcomeRecord.language,
        }
      : null,
  };
}

calls.use("*", authMiddleware, tenantMiddleware);

calls.get(
  "/",
  requirePerm("calls.read"),
  zValidator(
    "query",
    paginationSchema.extend({
      campaignId: z.string().uuid().optional(),
      status: z.string().optional(),
      agentId: z.string().uuid().optional(),
      search: z.string().optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid("query");
    const page = await service.list(getOrgId(c), {
      cursor: q.cursor,
      limit: q.limit,
      campaignId: q.campaignId,
      status: q.status,
      agentId: q.agentId,
    });
    return c.json({
      ...page,
      items: page.items.map((call) => ({
        ...call,
        fromNumber: null,
        toNumber: call.contact?.normalizedPhone ?? null,
      })),
    });
  },
);

calls.get("/:id", requirePerm("calls.read"), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
  const [call, events] = await Promise.all([
    service.get(orgId, id),
    service.events(orgId, id),
  ]);
  return c.json(serializeCall(call, events));
});

calls.get("/:id/events", requirePerm("calls.read"), async (c) => {
  const events = await service.events(getOrgId(c), c.req.param("id")!);
  return c.json({ items: events });
});

calls.get("/:id/transcript", requirePerm("calls.read"), async (c) => {
  const transcript = await service.transcript(getOrgId(c), c.req.param("id")!);
  const turns = [
    ...transcript.messages.map((m) => ({
      id: m.id,
      speaker:
        m.role === "assistant"
          ? "ai"
          : m.role === "user"
            ? "customer"
            : m.role,
      text: m.content,
      language: m.language,
      createdAt: m.createdAt,
    })),
  ];

  if (!turns.length && transcript.transcripts.length) {
    for (const t of transcript.transcripts) {
      const segments = Array.isArray(t.segments)
        ? (t.segments as Array<{ id?: string; speaker?: string; text?: string; language?: string; createdAt?: string }>)
        : [];
      if (segments.length) {
        for (const [idx, seg] of segments.entries()) {
          turns.push({
            id: seg.id || `${t.id}-${idx}`,
            speaker: seg.speaker || "system",
            text: seg.text || "",
            language: seg.language || null,
            createdAt: seg.createdAt ? new Date(seg.createdAt) : t.createdAt,
          });
        }
      } else if (t.fullText) {
        turns.push({
          id: t.id,
          speaker: "system",
          text: t.fullText,
          language: null,
          createdAt: t.createdAt,
        });
      }
    }
  }

  return c.json({ turns, messages: transcript.messages, transcripts: transcript.transcripts });
});

export default calls;
