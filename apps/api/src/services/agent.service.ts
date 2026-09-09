import { db } from "@sonrat/database";
import {
  agentConfigSchema,
  buildAgentRuntimeContext,
  ConflictError,
  createAgentSchema,
  NotFoundError,
  updateAgentSectionSchema,
  ValidationError,
  type AgentConfig,
} from "@sonrat/shared";
import { z } from "zod";
import { buildPromptFromDraft, configToPromptLayers } from "../integrations/ai/gemini/prompt-builder.js";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";
import { AuditService } from "./audit.service.js";

const SECTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  general: agentConfigSchema.shape.general,
  company: agentConfigSchema.shape.company,
  products: agentConfigSchema.shape.products,
  knowledge: agentConfigSchema.shape.knowledge,
  personality: agentConfigSchema.shape.personality,
  voice: agentConfigSchema.shape.voice,
  languages: agentConfigSchema.shape.languages,
  sales: agentConfigSchema.shape.sales,
  support: agentConfigSchema.shape.support,
  safety: agentConfigSchema.shape.safety,
  callBehavior: agentConfigSchema.shape.callBehavior,
  tools: agentConfigSchema.shape.tools,
};

export class AgentService {
  constructor(private readonly audit = new AuditService()) {}

  async list(organizationId: string, opts: { cursor?: string; limit: number }) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(cursorWhere(opts.cursor) ?? {}),
    };
    const rows = await db.agent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, agentId: string) {
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 10,
        },
      },
    });
    if (!agent) throw new NotFoundError("Agent");
    return agent;
  }

  async create(organizationId: string, userId: string, input: unknown) {
    const data = createAgentSchema.parse(input);
    const draftConfig = {
      general: {
        name: data.name,
        description: data.description ?? null,
        role: "Sales Development Representative",
        industry: "",
        purpose: "sales" as const,
      },
    };

    const agent = await db.agent.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        draftConfig,
        status: "DRAFT",
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.create",
      resource: "agent",
      resourceId: agent.id,
    });

    return agent;
  }

  async update(organizationId: string, userId: string, agentId: string, input: unknown) {
    const schema = z.object({
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).optional().nullable(),
    });
    const data = schema.parse(input);
    await this.get(organizationId, agentId);

    const agent = await db.agent.update({
      where: { id: agentId },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.update",
      resource: "agent",
      resourceId: agentId,
    });

    return agent;
  }

  async patchSection(organizationId: string, userId: string, agentId: string, input: unknown) {
    const parsed = updateAgentSectionSchema.parse(input);
    const schema = SECTION_SCHEMAS[parsed.section];
    if (!schema) throw new ValidationError(`Unknown section: ${parsed.section}`);

    const sectionData = schema.parse(parsed.data);
    const agent = await this.get(organizationId, agentId);
    const draft = { ...((agent.draftConfig as Record<string, unknown>) ?? {}) };
    draft[parsed.section] = sectionData;

    if (parsed.section === "general" && sectionData && typeof sectionData === "object") {
      const general = sectionData as { name?: string; description?: string | null };
      const updated = await db.agent.update({
        where: { id: agentId },
        data: {
          draftConfig: draft as object,
          ...(general.name ? { name: general.name } : {}),
          ...(general.description !== undefined ? { description: general.description } : {}),
          status: agent.status === "PUBLISHED" ? "DRAFT" : agent.status,
        },
      });
      await this.audit.log({
        organizationId,
        actorUserId: userId,
        action: "agent.patch_section",
        resource: "agent",
        resourceId: agentId,
        metadata: { section: parsed.section },
      });
      return updated;
    }

    const updated = await db.agent.update({
      where: { id: agentId },
      data: {
        draftConfig: draft as object,
        status: agent.status === "PUBLISHED" ? "DRAFT" : agent.status,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.patch_section",
      resource: "agent",
      resourceId: agentId,
      metadata: { section: parsed.section },
    });

    return updated;
  }

  validateConfig(draft: unknown): { valid: true; config: AgentConfig } | { valid: false; errors: unknown } {
    const result = agentConfigSchema.safeParse(draft);
    if (!result.success) {
      return { valid: false, errors: result.error.flatten() };
    }
    return { valid: true, config: result.data };
  }

  async validate(organizationId: string, agentId: string) {
    const agent = await this.get(organizationId, agentId);
    return this.validateConfig(agent.draftConfig);
  }

  async publish(organizationId: string, userId: string, agentId: string) {
    const agent = await this.get(organizationId, agentId);
    const validation = this.validateConfig(agent.draftConfig);
    if (!validation.valid) {
      throw new ValidationError("Agent configuration is invalid", validation.errors);
    }

    const config = validation.config;
    // Validate full schema via agentConfigSchema (above), then build runtime prompt context.
    // Version id is assigned inside the transaction; use a placeholder for prompt validation.
    const layers = configToPromptLayers(config);
    const promptCheck = buildAgentRuntimeContext({
      layers,
      supportedLanguages: config.languages.supportedLanguages,
      defaultLanguage: config.languages.defaultLanguage,
      voiceId: config.voice.voiceId,
      enabledTools: config.tools.enabledTools,
      organizationId,
      agentId,
      agentVersionId: "00000000-0000-0000-0000-000000000000",
    });
    const systemPrompt = promptCheck.systemPrompt;

    const published = await db.$transaction(async (tx) => {
      const last = await tx.agentVersion.findFirst({
        where: { agentId },
        orderBy: { versionNumber: "desc" },
      });
      const versionNumber = (last?.versionNumber ?? 0) + 1;

      await tx.agentVersion.updateMany({
        where: { agentId, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });

      const version = await tx.agentVersion.create({
        data: {
          organizationId,
          agentId,
          versionNumber,
          status: "ACTIVE",
          config,
          systemPrompt,
          publishedAt: new Date(),
        },
      });

      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          status: "PUBLISHED",
          activeVersionId: version.id,
          name: config.general.name,
          description: config.general.description,
        },
      });

      return { agent: updatedAgent, version };
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.publish",
      resource: "agent",
      resourceId: agentId,
      metadata: { versionId: published.version.id, versionNumber: published.version.versionNumber },
    });

    return published;
  }

  async versions(organizationId: string, agentId: string) {
    await this.get(organizationId, agentId);
    return db.agentVersion.findMany({
      where: { agentId, organizationId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async test(
    organizationId: string,
    agentId: string,
    input?: { customerName?: string; message?: string; language?: string },
  ) {
    const agent = await this.get(organizationId, agentId);
    const validation = this.validateConfig(agent.draftConfig);
    if (!validation.valid) {
      throw new ValidationError("Agent configuration is invalid", validation.errors);
    }

    const runtime = buildPromptFromDraft(agent.draftConfig, {
      customerName: input?.customerName ?? "Test Customer",
      customerContext: input?.message
        ? `Test message: ${input.message}`
        : "Test call",
      campaignName: "Test",
      organizationId,
      agentId,
      agentVersionId: agent.activeVersionId ?? "00000000-0000-0000-0000-000000000000",
    });

    return {
      ok: true,
      preview: {
        systemPromptLength: runtime.systemPrompt.length,
        systemPromptPreview: runtime.systemPrompt.slice(0, 500),
        voiceId: runtime.voiceId,
        languages: input?.language
          ? Array.from(new Set([input.language, ...runtime.supportedLanguages]))
          : runtime.supportedLanguages,
        tools: runtime.enabledTools,
      },
    };
  }

  async archive(organizationId: string, userId: string, agentId: string) {
    await this.get(organizationId, agentId);
    const running = await db.campaign.count({
      where: { organizationId, agentId, status: { in: ["RUNNING", "SCHEDULED"] } },
    });
    if (running > 0) {
      throw new ConflictError("Cannot archive agent with active campaigns");
    }

    const agent = await db.agent.update({
      where: { id: agentId },
      data: { status: "ARCHIVED", deletedAt: new Date() },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent.archive",
      resource: "agent",
      resourceId: agentId,
    });

    return agent;
  }
}
