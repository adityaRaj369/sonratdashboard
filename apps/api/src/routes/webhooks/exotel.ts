import { Hono } from "hono";
import { db } from "@sonrat/database";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "@sonrat/config";
import type { CallStatus } from "@sonrat/shared";
import {
  createExotelWebhookService,
} from "../../integrations/telephony/exotel/index.js";
import { enqueueJob, QUEUE_NAMES } from "../../lib/queue.js";
import { logger } from "../../lib/logger.js";
import { CallStateService } from "../../services/call-state.service.js";

const exotel = new Hono();
const webhookService = createExotelWebhookService();
const callState = new CallStateService();

/**
 * Verify Exotel webhook signature (HMAC-SHA256 over raw body).
 * Exotel sends: X-Exotel-Signature: <base64-hmac>
 * Only enforced when EXOTEL_WEBHOOK_SECRET is set in config.
 */
function verifyExotelSignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  const secret = getConfig().EXOTEL_WEBHOOK_SECRET;
  if (!secret) return true; // Not configured → skip verification (dev mode)
  if (!signature) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function parsePayload(c: { req: { parseBody: () => Promise<Record<string, unknown>>; json: () => Promise<unknown>; header: (n: string) => string | undefined } }) {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await c.req.json()) as Record<string, unknown>;
  }
  const body = await c.req.parseBody();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

async function processIdempotent(
  organizationId: string | null,
  provider: string,
  eventKey: string,
  payload: Record<string, unknown>,
  handler: () => Promise<void>,
) {
  try {
    await db.webhookEvent.create({
      data: {
        organizationId,
        provider,
        eventKey,
        payload: payload as object,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      logger.info("webhook_duplicate", { event_key: eventKey, provider });
      return { duplicate: true };
    }
    throw err;
  }

  await handler();

  await db.webhookEvent.update({
    where: { provider_eventKey: { provider, eventKey } },
    data: { processedAt: new Date() },
  });

  return { duplicate: false };
}

exotel.post("/call-status", async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header("x-exotel-signature");
  if (!verifyExotelSignature(rawBody, sig)) {
    logger.warn("exotel_webhook_bad_signature", { path: "/call-status" });
    return c.json({ error: "Invalid signature" }, 403);
  }

  // Parse body manually after reading as text
  let raw: Record<string, unknown>;
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    raw = JSON.parse(rawBody) as Record<string, unknown>;
  } else {
    const params = new URLSearchParams(rawBody);
    raw = Object.fromEntries(params.entries());
  }

  const callIdQuery = c.req.query("callId");
  const parsed = webhookService.parse({ ...raw, ...(callIdQuery ? { CustomField: callIdQuery } : {}) });

  let call = null;
  if (callIdQuery) {
    call = await db.call.findFirst({ where: { id: callIdQuery } });
  }
  if (!call && parsed.providerCallId) {
    call = await db.call.findFirst({ where: { providerCallId: parsed.providerCallId } });
  }

  const organizationId = call?.organizationId ?? null;
  const result = await processIdempotent(
    organizationId,
    "exotel",
    `status:${parsed.eventKey}`,
    parsed.raw,
    async () => {
      if (!call) {
        logger.warn("exotel_status_unknown_call", {
          provider_call_id: parsed.providerCallId,
        });
        return;
      }

      const mapped = webhookService.mapStatus(parsed.status);
      if (!mapped) return;

      try {
        await callState.transition({
          organizationId: call.organizationId,
          callId: call.id,
          to: mapped as CallStatus,
          actor: "exotel.webhook",
          payload: parsed.raw,
        });
      } catch (err) {
        logger.warn("exotel_status_transition_skipped", {
          call_id: call.id,
          to: mapped,
          message: err instanceof Error ? err.message : "unknown",
        });
      }

      const recordingUrl = String(
        parsed.raw.RecordingUrl ??
          parsed.raw.recordingUrl ??
          parsed.raw.RecordingUrlHttps ??
          "",
      ).trim();
      if (recordingUrl && /^https?:\/\//i.test(recordingUrl)) {
        await db.call.update({
          where: { id: call.id },
          data: { recordingReference: recordingUrl },
        });
        await enqueueJob(
          QUEUE_NAMES.RECORDINGS,
          "process_recording",
          {
            organizationId: call.organizationId,
            callId: call.id,
            objectKey: recordingUrl,
            contentType: "audio/mpeg",
          },
          { jobId: `process_recording:${call.id}` },
        );
      }

      await enqueueJob(QUEUE_NAMES.WEBHOOK_PROCESS, "exotel-status", {
        organizationId: call.organizationId,
        callId: call.id,
        status: mapped,
        providerCallId: parsed.providerCallId,
      });
    },
  );

  return c.json({ ok: true, ...result });
});

exotel.post("/incoming-call", async (c) => {
  const raw = await parsePayload(c);
  const parsed = webhookService.parse(raw);

  const toNumber = parsed.to;
  let phone = null;
  if (toNumber) {
    phone = await db.phoneNumber.findFirst({
      where: { e164: toNumber, isActive: true },
      include: { inboundAgent: true },
    });
  }

  const organizationId = phone?.organizationId ?? null;
  const result = await processIdempotent(
    organizationId,
    "exotel",
    `incoming:${parsed.eventKey}`,
    parsed.raw,
    async () => {
      if (!phone?.inboundAgentId || !phone.inboundAgent?.activeVersionId) {
        logger.warn("incoming_call_no_agent", { to: toNumber });
        return;
      }

      const agent = phone.inboundAgent;
      const call = await db.call.create({
        data: {
          organizationId: phone.organizationId,
          agentId: agent.id,
          agentVersionId: agent.activeVersionId!,
          phoneNumberId: phone.id,
          provider: "exotel",
          providerCallId: parsed.providerCallId || null,
          direction: "INBOUND",
          status: "RINGING",
          startedAt: new Date(),
        },
      });

      await db.callEvent.create({
        data: {
          organizationId: phone.organizationId,
          callId: call.id,
          type: "inbound.received",
          payload: parsed.raw as object,
        },
      });

      await enqueueJob(QUEUE_NAMES.WEBHOOK_PROCESS, "exotel-inbound", {
        organizationId: phone.organizationId,
        callId: call.id,
        providerCallId: parsed.providerCallId,
      });
    },
  );

  // Exotel expects 200; voice-runtime connects separately
  return c.json({ ok: true, ...result });
});

exotel.post("/events", async (c) => {
  const raw = await parsePayload(c);
  const callIdQuery = c.req.query("callId");
  const parsed = webhookService.parse(raw);

  let call = null;
  if (callIdQuery) {
    call = await db.call.findFirst({ where: { id: callIdQuery } });
  }
  if (!call && parsed.providerCallId) {
    call = await db.call.findFirst({ where: { providerCallId: parsed.providerCallId } });
  }

  const result = await processIdempotent(
    call?.organizationId ?? null,
    "exotel",
    `event:${parsed.eventKey}`,
    parsed.raw,
    async () => {
      if (!call) return;
      await db.callEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.id,
          type: `exotel.${parsed.status}`,
          payload: parsed.raw as object,
        },
      });
    },
  );

  return c.json({ ok: true, ...result });
});

export default exotel;
