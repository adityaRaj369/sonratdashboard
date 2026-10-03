import { db } from "@sonrat/database";
import {
  ConflictError,
  createCampaignSchema,
  NotFoundError,
  ValidationError,
} from "@sonrat/shared";
import { z } from "zod";
import { enqueueJob, QUEUE_NAMES } from "../lib/queue.js";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";
import { AdmissionControlService } from "./admission-control.service.js";
import { AuditService } from "./audit.service.js";
import { AgentService } from "./agent.service.js";
import { getConfig } from "@sonrat/config";

function isLocalUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function isVoiceRuntimeReady(config = getConfig()) {
  const publicBase = config.EXOTEL_WEBHOOK_BASE_URL || config.VOICE_RUNTIME_URL;

  if (!config.MOCK_TELEPHONY && config.TELEPHONY_PROVIDER === "exotel") {
    if (!publicBase || isLocalUrl(publicBase)) return false;
    try {
      const response = await fetch(`${publicBase.replace(/\/$/, "")}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  const baseUrl = config.VOICE_RUNTIME_URL;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) return true;
  } catch {
    // try local fallback
  }
  try {
    const local = await fetch("http://localhost:4100/health", {
      signal: AbortSignal.timeout(1500),
    });
    return local.ok;
  } catch {
    return false;
  }
}

export class CampaignService {
  constructor(
    private readonly audit = new AuditService(),
    private readonly admission = new AdmissionControlService(),
  ) {}

  async list(organizationId: string, opts: { cursor?: string; limit: number; status?: string; search?: string }) {
    const rows = await db.campaign.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(opts.status ? { status: opts.status as never } : {}),
        ...(opts.search
          ? {
              OR: [
                { name: { contains: opts.search, mode: "insensitive" as const } },
                { objective: { contains: opts.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      include: {
        agent: { select: { id: true, name: true, status: true } },
        _count: { select: { contacts: true, calls: true } },
      },
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, organizationId, deletedAt: null },
      include: {
        agent: true,
        agentVersion: true,
        phoneNumber: true,
        _count: { select: { contacts: true, calls: true } },
      },
    });
    if (!campaign) throw new NotFoundError("Campaign");
    return campaign;
  }

  async preflight(organizationId: string, campaignId: string) {
    const campaign = await this.get(organizationId, campaignId);
    const config = getConfig();
    const agentService = new AgentService();
    let agentReady = Boolean(
      campaign.agent?.activeVersionId && campaign.agent.status === "PUBLISHED",
    );
    let agentMessage = agentReady ? "Ready" : "Publish the selected agent";
    if (!agentReady && campaign.agent) {
      const validation = agentService.validateConfig(campaign.agent.draftConfig);
      if (validation.valid) {
        agentReady = true;
        agentMessage = "Ready (Auto-publishes on launch)";
      } else {
        agentMessage = "Selected agent configuration has errors; please review and publish";
      }
    } else if (!campaign.agent) {
      agentMessage = "Select an agent for this campaign";
    }

    const phoneReady = Boolean(
      campaign.phoneNumber?.isActive || getConfig().EXOTEL_PHONE_NUMBER,
    );
    const contactCount = await db.campaignContact.count({
      where: {
        campaignId,
        contact: { callability: "callable", deletedAt: null },
      },
    });
    const providerReady =
      config.MOCK_TELEPHONY ||
      (config.TELEPHONY_PROVIDER === "exotel" &&
        Boolean(
          config.EXOTEL_API_KEY &&
            config.EXOTEL_API_TOKEN &&
            config.EXOTEL_ACCOUNT_SID,
        ));
    const voiceRuntimeReady =
      config.MOCK_TELEPHONY || (await isVoiceRuntimeReady(config));
    const checks = [
      { id: "agent", label: "Published agent", ready: agentReady, message: agentMessage },
      { id: "phone", label: "Caller number", ready: phoneReady, message: phoneReady ? "Ready" : "Configure an active Exotel number" },
      { id: "contacts", label: "Callable contacts", ready: contactCount > 0, message: contactCount > 0 ? `${contactCount} callable contact${contactCount === 1 ? "" : "s"}` : "Add at least one callable contact" },
      { id: "provider", label: "Telephony provider", ready: providerReady, message: providerReady ? "Configured" : "Configure Exotel credentials" },
      { id: "voice-runtime", label: "AI voice connection", ready: voiceRuntimeReady, message: voiceRuntimeReady ? "Reachable" : "AI voice runtime is not reachable; no call will be placed" },
    ];
    return { ready: checks.every((check) => check.ready), checks };
  }

  async create(organizationId: string, userId: string, input: unknown) {
    const data = createCampaignSchema.parse(input);

    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId, deletedAt: null },
    });
    if (!agent) throw new NotFoundError("Agent");

    if (data.phoneNumberId) {
      const phone = await db.phoneNumber.findFirst({
        where: { id: data.phoneNumberId, organizationId, isActive: true },
      });
      if (!phone) throw new NotFoundError("PhoneNumber");
    }

    const campaign = await db.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          agentId: data.agentId,
          phoneNumberId: data.phoneNumberId,
          objective: data.objective,
          salesInstructions: data.salesInstructions,
          campaignInstructions: data.campaignInstructions,
          callingHoursStart: data.callingHoursStart,
          callingHoursEnd: data.callingHoursEnd,
          timezone: data.timezone,
          maxAttempts: data.maxAttempts,
          retryDelayMinutes: data.retryDelayMinutes,
          concurrencyLimit: data.concurrencyLimit,
          callTimeoutSeconds: data.callTimeoutSeconds,
          callbackBehavior: data.callbackBehavior,
          priority: data.priority,
          startAt: data.startAt ? new Date(data.startAt) : null,
          endAt: data.endAt ? new Date(data.endAt) : null,
          status: "DRAFT",
        },
      });

      if (data.contactIds.length) {
        await tx.campaignContact.createMany({
          data: data.contactIds.map((contactId) => ({
            campaignId: created.id,
            contactId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.create",
      resource: "campaign",
      resourceId: campaign.id,
    });

    return campaign;
  }

  async update(organizationId: string, userId: string, campaignId: string, input: unknown) {
    await this.get(organizationId, campaignId);

    const schema = createCampaignSchema.partial().omit({ contactIds: true });
    const data = schema.parse(input);

    const updated = await db.campaign.update({
      where: { id: campaignId },
      data: {
        ...data,
        startAt: data.startAt === undefined ? undefined : data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt === undefined ? undefined : data.endAt ? new Date(data.endAt) : null,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.update",
      resource: "campaign",
      resourceId: campaignId,
    });

    return updated;
  }

  async start(organizationId: string, userId: string, campaignId: string) {
    const campaign = await this.get(organizationId, campaignId);

    if (!["DRAFT", "SCHEDULED", "PAUSED", "COMPLETED"].includes(campaign.status)) {
      throw new ConflictError(`Cannot start campaign in status ${campaign.status}`);
    }

    // If agent is not published yet, attempt to auto-publish if valid
    if (campaign.agent && (!campaign.agent.activeVersionId || campaign.agent.status !== "PUBLISHED")) {
      try {
        const agentSvc = new AgentService();
        await agentSvc.publish(organizationId, userId, campaign.agentId);
      } catch {
        // If validation fails, preflight below will report it cleanly
      }
    }

    // Never spend telephony credits unless the public AI WebSocket endpoint is live.
    const preflight = await this.preflight(organizationId, campaignId);
    if (!preflight.ready) {
      const failed = preflight.checks
        .filter((check) => !check.ready)
        .map((check) => `${check.label}: ${check.message}`)
        .join("; ");
      throw new ValidationError(`Campaign is not ready to start. ${failed}`);
    }

    // Always release any stuck INITIATING or scheduled retry contacts back to QUEUED
    await db.campaignContact.updateMany({
      where: {
        campaignId,
        status: { in: ["INITIATING", "RETRY_SCHEDULED"] },
      },
      data: {
        status: "QUEUED",
        nextAttemptAt: null,
      },
    });

    // If campaign is COMPLETED or all contacts have been attempted/failed, reset all non-connected contacts
    const readyCount = await db.campaignContact.count({
      where: {
        campaignId,
        status: "QUEUED",
      },
    });

    if (campaign.status === "COMPLETED" || readyCount === 0) {
      await db.campaignContact.updateMany({
        where: {
          campaignId,
          status: { notIn: ["CONNECTED"] },
        },
        data: {
          status: "QUEUED",
          attemptCount: 0,
          nextAttemptAt: null,
        },
      });
    }

    const agent = await db.agent.findFirst({
      where: { id: campaign.agentId, organizationId, deletedAt: null },
    });
    if (!agent) throw new NotFoundError("Agent");

    let version = agent.activeVersionId
      ? await db.agentVersion.findFirst({
          where: { id: agent.activeVersionId, agentId: agent.id, status: "ACTIVE" },
        })
      : null;

    // If agent has no active version or was edited into DRAFT status, auto-publish it
    if (!version || agent.status === "DRAFT") {
      try {
        const agentService = new AgentService(this.audit);
        const published = await agentService.publish(organizationId, userId, agent.id);
        version = published.version;
      } catch (err) {
        if (!version) {
          throw new ValidationError(
            `Agent "${agent.name}" configuration is incomplete: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    if (!version) {
      throw new ValidationError("Published agent version not found");
    }

    const contactCount = await db.campaignContact.count({ where: { campaignId } });
    if (contactCount === 0) {
      throw new ValidationError("Campaign has no contacts");
    }

    const canAdmit = await this.admission.canStartCampaign(organizationId);
    if (!canAdmit) {
      throw new ConflictError("Organization at concurrent call capacity; cannot start campaign");
    }

    const updated = await db.$transaction(async (tx) => {
      const next = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: "RUNNING",
          agentVersionId: version.id,
          startAt: campaign.startAt ?? new Date(),
          endAt: null,
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          type: "campaign.started",
          payload: {
            campaignId,
            agentVersionId: version.id,
            concurrencyLimit: campaign.concurrencyLimit,
          },
        },
      });

      return next;
    });

    // Unique jobId each start — BullMQ rejects duplicate ids if a prior
    // schedule_campaign for this campaign still exists in Redis.
    await enqueueJob(
      QUEUE_NAMES.CAMPAIGN_DISPATCH,
      "schedule_campaign",
      {
        organizationId,
        campaignId,
        agentVersionId: version.id,
      },
      { jobId: `campaign-schedule-${campaignId}-${Date.now()}` },
    );

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.start",
      resource: "campaign",
      resourceId: campaignId,
    });

    return updated;
  }

  async pause(organizationId: string, userId: string, campaignId: string) {
    const campaign = await this.get(organizationId, campaignId);
    if (campaign.status !== "RUNNING") {
      throw new ConflictError("Only running campaigns can be paused");
    }

    const updated = await db.campaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED" },
    });

    await db.outboxEvent.create({
      data: {
        organizationId,
        type: "campaign.paused",
        payload: { campaignId },
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.pause",
      resource: "campaign",
      resourceId: campaignId,
    });

    return updated;
  }

  async cancel(organizationId: string, userId: string, campaignId: string) {
    const campaign = await this.get(organizationId, campaignId);
    if (["COMPLETED", "CANCELLED"].includes(campaign.status)) {
      throw new ConflictError(`Campaign already ${campaign.status}`);
    }

    const updated = await db.campaign.update({
      where: { id: campaignId },
      data: { status: "CANCELLED" },
    });

    await db.outboxEvent.create({
      data: {
        organizationId,
        type: "campaign.cancelled",
        payload: { campaignId },
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.cancel",
      resource: "campaign",
      resourceId: campaignId,
    });

    return updated;
  }

  async addContacts(
    organizationId: string,
    userId: string,
    campaignId: string,
    contactIds: string[],
  ) {
    const campaign = await this.get(organizationId, campaignId);
    const schema = z.object({ contactIds: z.array(z.string().uuid()).min(1) });
    schema.parse({ contactIds });

    const valid = await db.contact.findMany({
      where: { organizationId, id: { in: contactIds }, deletedAt: null },
      select: { id: true },
    });

    await db.campaignContact.createMany({
      data: valid.map((c) => ({ campaignId, contactId: c.id })),
      skipDuplicates: true,
    });

    if (campaign.status === "RUNNING") {
      await enqueueJob(
        QUEUE_NAMES.CAMPAIGN_DISPATCH,
        "schedule_campaign",
        {
          organizationId,
          campaignId,
          agentVersionId: campaign.agentVersionId ?? undefined,
        },
        { jobId: `campaign-schedule-${campaignId}-${Date.now()}` },
      );
    }

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.add_contacts",
      resource: "campaign",
      resourceId: campaignId,
      metadata: { count: valid.length },
    });

    return { added: valid.length };
  }

  async removeContact(
    organizationId: string,
    userId: string,
    campaignId: string,
    contactId: string,
  ) {
    const campaign = await this.get(organizationId, campaignId);
    if (campaign.status === "RUNNING") {
      throw new ConflictError("Pause campaign before removing contacts");
    }

    const existing = await db.campaignContact.findFirst({
      where: { campaignId, contactId },
    });
    if (!existing) return { removed: 0 };

    if (["INITIATING", "RINGING", "CONNECTED", "AI_ACTIVE"].includes(existing.status)) {
      throw new ConflictError("Cannot remove a contact with an active or connected call");
    }

    await db.campaignContact.delete({
      where: { id: existing.id },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.remove_contact",
      resource: "campaign",
      resourceId: campaignId,
      metadata: { contactId },
    });

    return { removed: 1 };
  }

  async listContacts(
    organizationId: string,
    campaignId: string,
    opts: { cursor?: string; limit: number },
  ) {
    await this.get(organizationId, campaignId);
    const rows = await db.campaignContact.findMany({
      where: {
        campaignId,
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      include: { contact: true },
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async remove(organizationId: string, userId: string, campaignId: string) {
    const campaign = await this.get(organizationId, campaignId);
    if (campaign.status === "RUNNING") {
      throw new ConflictError("Pause or cancel campaign before deleting");
    }
    await db.campaign.update({
      where: { id: campaignId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "campaign.delete",
      resource: "campaign",
      resourceId: campaignId,
    });
  }
}
