import { db } from "@sonrat/database";
import { NotFoundError, ValidationError } from "@sonrat/shared";
import { z } from "zod";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";
import { AuditService } from "./audit.service.js";

const graphSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          "START",
          "SAY",
          "ASK",
          "COLLECT",
          "IF",
          "SET_VARIABLE",
          "HTTP_REQUEST",
          "TRANSFER",
          "END",
        ]),
        label: z.string().optional(),
        data: z.record(z.unknown()).default({}),
      }),
    )
    .default([]),
  edges: z
    .array(
      z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
        condition: z.string().optional(),
      }),
    )
    .default([]),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export class AgentFlowService {
  constructor(private readonly audit = new AuditService()) {}

  async list(organizationId: string, opts: { cursor?: string; limit: number }) {
    const rows = await db.agentFlow.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, flowId: string) {
    const flow = await db.agentFlow.findFirst({
      where: { id: flowId, organizationId, deletedAt: null },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 10 },
      },
    });
    if (!flow) throw new NotFoundError("AgentFlow");
    return flow;
  }

  async create(organizationId: string, userId: string, input: unknown) {
    const data = createSchema.parse(input);
    const draftGraph = {
      nodes: [
        { id: "start", type: "START", label: "Start", data: {} },
        {
          id: "say-1",
          type: "SAY",
          label: "Greeting",
          data: { text: "Introduce yourself using company knowledge." },
        },
        {
          id: "ask-1",
          type: "ASK",
          label: "Understand need",
          data: { prompt: "Ask how you can help." },
        },
        { id: "end", type: "END", label: "End", data: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "say-1" },
        { id: "e2", source: "say-1", target: "ask-1" },
        { id: "e3", source: "ask-1", target: "end" },
      ],
    };

    const flow = await db.agentFlow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        draftGraph: draftGraph as object,
        status: "DRAFT",
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent_flow.create",
      resource: "agent_flow",
      resourceId: flow.id,
    });

    return flow;
  }

  async updateGraph(
    organizationId: string,
    userId: string,
    flowId: string,
    graph: unknown,
  ) {
    await this.get(organizationId, flowId);
    const parsed = graphSchema.parse(graph);
    const flow = await db.agentFlow.update({
      where: { id: flowId },
      data: { draftGraph: parsed as object, updatedAt: new Date() },
    });
    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent_flow.update_graph",
      resource: "agent_flow",
      resourceId: flowId,
    });
    return flow;
  }

  async publish(organizationId: string, userId: string, flowId: string) {
    const flow = await this.get(organizationId, flowId);
    const graph = graphSchema.parse(flow.draftGraph);
    if (!graph.nodes.some((n) => n.type === "START")) {
      throw new ValidationError("Flow must include a START node");
    }
    if (!graph.nodes.some((n) => n.type === "END")) {
      throw new ValidationError("Flow must include an END node");
    }

    const last = await db.agentFlowVersion.findFirst({
      where: { flowId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const version = await db.agentFlowVersion.create({
      data: {
        organizationId,
        flowId,
        versionNumber,
        status: "ACTIVE",
        graph: graph as object,
        publishedAt: new Date(),
      },
    });

    if (last) {
      await db.agentFlowVersion.update({
        where: { id: last.id },
        data: { status: "SUPERSEDED" },
      });
    }

    const updated = await db.agentFlow.update({
      where: { id: flowId },
      data: {
        status: "PUBLISHED",
        activeVersionId: version.id,
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "agent_flow.publish",
      resource: "agent_flow",
      resourceId: flowId,
      metadata: { versionId: version.id, versionNumber },
    });

    return { flow: updated, version };
  }
}
