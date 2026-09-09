import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import { NotFoundError, ValidationError } from "@sonrat/shared";
import { createTelephonyProvider, createExotelStreamingService } from "../integrations/telephony/exotel/index.js";
import { enqueueJob, QUEUE_NAMES } from "../lib/queue.js";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";
import { AdmissionControlService } from "./admission-control.service.js";
import { CallStateService } from "./call-state.service.js";

export class CallService {
  constructor(
    private readonly callState = new CallStateService(),
    private readonly admission = new AdmissionControlService(),
  ) {}

  async list(
    organizationId: string,
    opts: {
      cursor?: string;
      limit: number;
      campaignId?: string;
      status?: string;
      agentId?: string;
    },
  ) {
    const rows = await db.call.findMany({
      where: {
        organizationId,
        ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
        ...(opts.status ? { status: opts.status as never } : {}),
        ...(opts.agentId ? { agentId: opts.agentId } : {}),
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      include: {
        contact: { select: { id: true, name: true, normalizedPhone: true } },
        agent: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, callId: string) {
    const call = await db.call.findFirst({
      where: { id: callId, organizationId },
      include: {
        contact: true,
        agent: true,
        agentVersion: true,
        campaign: true,
        phoneNumber: true,
        conversation: { include: { transcripts: true } },
        outcomeRecord: true,
      },
    });
    if (!call) throw new NotFoundError("Call");
    return call;
  }

  async events(organizationId: string, callId: string) {
    await this.get(organizationId, callId);
    return db.callEvent.findMany({
      where: { callId, organizationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async transcript(organizationId: string, callId: string) {
    const call = await this.get(organizationId, callId);
    if (!call.conversation) {
      return { messages: [], transcripts: [] };
    }
    const messages = await db.conversationMessage.findMany({
      where: { conversationId: call.conversation.id },
      orderBy: { createdAt: "asc" },
    });
    return {
      messages,
      transcripts: call.conversation.transcripts,
    };
  }

  /**
   * Create outbound call record and place via telephony provider (worker path also uses this).
   */
  async initiateOutbound(input: {
    organizationId: string;
    campaignId: string;
    contactId: string;
    agentId: string;
    agentVersionId: string;
    phoneNumberId?: string | null;
    idempotencyKey?: string;
    concurrencyLimit?: number;
  }) {
    await this.admission.admitCall({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      campaignConcurrencyLimit: input.concurrencyLimit,
    });

    const contact = await db.contact.findFirst({
      where: {
        id: input.contactId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
    });
    if (!contact?.normalizedPhone) {
      throw new ValidationError("Contact has no valid phone");
    }
    if (contact.callability !== "callable") {
      throw new ValidationError(`Contact is not callable (${contact.callability})`);
    }

    const phone = input.phoneNumberId
      ? await db.phoneNumber.findFirst({
          where: { id: input.phoneNumberId, organizationId: input.organizationId },
        })
      : await db.phoneNumber.findFirst({
          where: { organizationId: input.organizationId, isActive: true },
        });

    if (!phone) {
      throw new ValidationError("No active phone number configured");
    }

    const config = getConfig();
    const provider = config.MOCK_TELEPHONY ? "mock" : config.TELEPHONY_PROVIDER;

    const call = await db.call.create({
      data: {
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        contactId: input.contactId,
        agentId: input.agentId,
        agentVersionId: input.agentVersionId,
        phoneNumberId: phone.id,
        provider,
        direction: "OUTBOUND",
        status: "QUEUED",
        idempotencyKey: input.idempotencyKey,
      },
    });

    await this.callState.transition({
      organizationId: input.organizationId,
      callId: call.id,
      to: "INITIATING",
      actor: "call.service",
    });

    const telephony = createTelephonyProvider();
    const streaming = createExotelStreamingService();
    const result = await telephony.placeOutboundCall({
      from: phone.e164,
      to: contact.normalizedPhone,
      statusCallbackUrl: streaming.buildStatusCallbackUrl(call.id),
      customField: call.id,
      record: true,
    });

    await db.call.update({
      where: { id: call.id },
      data: { providerCallId: result.providerCallId },
    });

    await this.callState.transition({
      organizationId: input.organizationId,
      callId: call.id,
      to: "RINGING",
      actor: "telephony",
      payload: { providerCallId: result.providerCallId },
    });

    await enqueueJob(QUEUE_NAMES.OUTBOUND_CALLS, "monitor-call", {
      organizationId: input.organizationId,
      callId: call.id,
      providerCallId: result.providerCallId,
    });

    return this.get(input.organizationId, call.id);
  }
}
