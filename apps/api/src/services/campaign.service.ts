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

export class CampaignService {
  constructor(
    private readonly audit = new AuditService(),
    private readonly admission = new AdmissionControlService(),
  ) {}

  async list(organizationId: string, opts: { cursor?: string; limit: number; status?: string }) {
    const rows = await db.campaign.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(opts.status ? { status: opts.status as never } : {}),
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
    const campaign = await this.get(organizationId, campaignId);
    if (campaign.status === "RUNNING") {
      throw new ConflictError("Cannot update a running campaign; pause first");
    }

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

    if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
      throw new ConflictError(`Cannot start campaign in status ${campaign.status}`);
    }

    const agent = await db.agent.findFirst({
      where: { id: campaign.agentId, organizationId, deletedAt: null },
    });
    if (!agent?.activeVersionId || agent.status !== "PUBLISHED") {
      throw new ValidationError("Campaign agent must have an active published version");
    }

    const version = await db.agentVersion.findFirst({
      where: { id: agent.activeVersionId, agentId: agent.id, status: "ACTIVE" },
    });
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
    await this.get(organizationId, campaignId);
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
