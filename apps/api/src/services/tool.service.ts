import { db } from "@sonrat/database";
import {
  NotFoundError,
  ToolExecutionError,
  ValidationError,
  normalizePhone,
} from "@sonrat/shared";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { CallStateService } from "./call-state.service.js";
import { LeadService } from "./lead.service.js";
import { HandoffService } from "./handoff.service.js";

export const TOOL_NAMES = [
  "get_customer",
  "update_customer",
  "create_lead",
  "schedule_callback",
  "transfer_to_human",
  "end_call",
  "get_product",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const toolInputSchemas: Record<ToolName, z.ZodTypeAny> = {
  get_customer: z.object({
    contactId: z.string().uuid().optional(),
    phone: z.string().optional(),
  }),
  update_customer: z.object({
    contactId: z.string().uuid(),
    name: z.string().optional(),
    email: z.string().email().optional().nullable(),
    notes: z.string().optional(),
    leadStatus: z.string().optional(),
    customFields: z.record(z.unknown()).optional(),
  }),
  create_lead: z.object({
    contactId: z.string().uuid().optional(),
    status: z.string().default("new"),
    interestLevel: z.string().optional(),
    notes: z.string().optional(),
  }),
  schedule_callback: z.object({
    contactId: z.string().uuid().optional(),
    scheduledAt: z.string().datetime(),
    timezone: z.string().default("UTC"),
    notes: z.string().optional(),
  }),
  transfer_to_human: z.object({
    reason: z.string().min(1),
    destination: z.string().optional(),
  }),
  end_call: z.object({
    reason: z.string().optional(),
    outcome: z.string().optional(),
  }),
  get_product: z.object({
    productName: z.string().optional(),
    agentId: z.string().uuid().optional(),
  }),
};

export class ToolService {
  constructor(
    private readonly leads = new LeadService(),
    private readonly handoff = new HandoffService(),
    private readonly callState = new CallStateService(),
  ) {}

  async execute(input: {
    organizationId: string;
    callId: string;
    toolName: string;
    args: unknown;
    idempotencyKey: string;
  }) {
    if (!TOOL_NAMES.includes(input.toolName as ToolName)) {
      throw new ValidationError(`Unknown tool: ${input.toolName}`);
    }
    const toolName = input.toolName as ToolName;

    const existing = await db.toolExecution.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing?.status === "completed" && existing.output != null) {
      return existing.output;
    }
    if (existing?.status === "pending") {
      throw new ToolExecutionError("Tool execution already in progress");
    }

    const schema = toolInputSchemas[toolName];
    const args = schema.parse(input.args);

    const call = await db.call.findFirst({
      where: { id: input.callId, organizationId: input.organizationId },
    });
    if (!call) throw new NotFoundError("Call");

    const execution = existing
      ? existing
      : await db.toolExecution.create({
          data: {
            organizationId: input.organizationId,
            callId: input.callId,
            toolName,
            input: args as object,
            status: "pending",
            idempotencyKey: input.idempotencyKey,
          },
        });

    const started = Date.now();
    try {
      const output = await this.dispatch(toolName, {
        organizationId: input.organizationId,
        call,
        args: args as Record<string, unknown>,
      });

      await db.toolExecution.update({
        where: { id: execution.id },
        data: {
          status: "completed",
          output: output as object,
          completedAt: new Date(),
          durationMs: Date.now() - started,
        },
      });

      logger.info("tool_executed", {
        organization_id: input.organizationId,
        call_id: input.callId,
        tool: toolName,
      });

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool failed";
      await db.toolExecution.update({
        where: { id: execution.id },
        data: {
          status: "failed",
          error: message,
          completedAt: new Date(),
          durationMs: Date.now() - started,
        },
      });
      throw err;
    }
  }

  private async dispatch(
    toolName: ToolName,
    ctx: {
      organizationId: string;
      call: { id: string; contactId: string | null; agentId: string; agentVersionId: string };
      args: Record<string, unknown>;
    },
  ) {
    switch (toolName) {
      case "get_customer": {
        let contact = null;
        if (typeof ctx.args.contactId === "string") {
          contact = await db.contact.findFirst({
            where: {
              id: ctx.args.contactId,
              organizationId: ctx.organizationId,
              deletedAt: null,
            },
          });
        } else if (typeof ctx.args.phone === "string") {
          const phone = normalizePhone(ctx.args.phone);
          contact = await db.contact.findFirst({
            where: {
              organizationId: ctx.organizationId,
              normalizedPhone: phone.e164 ?? undefined,
              deletedAt: null,
            },
          });
        } else if (ctx.call.contactId) {
          contact = await db.contact.findFirst({
            where: { id: ctx.call.contactId, organizationId: ctx.organizationId },
          });
        }
        if (!contact) return { found: false };
        return {
          found: true,
          customer: {
            id: contact.id,
            name: contact.name,
            phone: contact.normalizedPhone,
            email: contact.email,
            company: contact.company,
            leadStatus: contact.leadStatus,
            notes: contact.notes,
            customFields: contact.customFields,
          },
        };
      }

      case "update_customer": {
        const contactId = String(ctx.args.contactId);
        const updated = await db.contact.updateMany({
          where: { id: contactId, organizationId: ctx.organizationId },
          data: {
            ...(ctx.args.name != null ? { name: String(ctx.args.name) } : {}),
            ...(ctx.args.email !== undefined
              ? { email: (ctx.args.email as string | null) || null }
              : {}),
            ...(ctx.args.notes != null ? { notes: String(ctx.args.notes) } : {}),
            ...(ctx.args.leadStatus != null
              ? { leadStatus: String(ctx.args.leadStatus) }
              : {}),
            ...(ctx.args.customFields != null
              ? { customFields: ctx.args.customFields as object }
              : {}),
          },
        });
        return { updated: updated.count > 0 };
      }

      case "create_lead": {
        const lead = await this.leads.create({
          organizationId: ctx.organizationId,
          contactId: (ctx.args.contactId as string | undefined) ?? ctx.call.contactId ?? undefined,
          callId: ctx.call.id,
          status: String(ctx.args.status ?? "new"),
          interestLevel: ctx.args.interestLevel as string | undefined,
          notes: ctx.args.notes as string | undefined,
          idempotencyKey: `lead:${ctx.call.id}:${ctx.args.contactId ?? "none"}`,
        });
        return { leadId: lead.id, status: lead.status };
      }

      case "schedule_callback": {
        const idempotencyKey = `callback:${ctx.call.id}:${ctx.args.scheduledAt}`;
        const existingAppt = await db.appointment.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: ctx.organizationId,
              idempotencyKey,
            },
          },
        });
        if (existingAppt) {
          return {
            appointmentId: existingAppt.id,
            scheduledAt: existingAppt.scheduledAt,
            duplicate: true,
          };
        }

        try {
          const appt = await db.appointment.create({
            data: {
              organizationId: ctx.organizationId,
              contactId:
                (ctx.args.contactId as string | undefined) ??
                ctx.call.contactId ??
                undefined,
              callId: ctx.call.id,
              scheduledAt: new Date(String(ctx.args.scheduledAt)),
              timezone: String(ctx.args.timezone ?? "UTC"),
              notes: ctx.args.notes as string | undefined,
              idempotencyKey,
            },
          });
          return { appointmentId: appt.id, scheduledAt: appt.scheduledAt };
        } catch (err) {
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code: string }).code === "P2002"
          ) {
            const raced = await db.appointment.findUnique({
              where: {
                organizationId_idempotencyKey: {
                  organizationId: ctx.organizationId,
                  idempotencyKey,
                },
              },
            });
            if (raced) {
              return {
                appointmentId: raced.id,
                scheduledAt: raced.scheduledAt,
                duplicate: true,
              };
            }
          }
          throw err;
        }
      }

      case "transfer_to_human": {
        return this.handoff.transfer({
          organizationId: ctx.organizationId,
          callId: ctx.call.id,
          reason: String(ctx.args.reason),
          destination: ctx.args.destination as string | undefined,
          idempotencyKey: `handoff:${ctx.call.id}:${String(ctx.args.reason)}`,
        });
      }

      case "end_call": {
        await this.callState.transition({
          organizationId: ctx.organizationId,
          callId: ctx.call.id,
          to: "COMPLETED",
          reason: (ctx.args.reason as string | undefined) ?? "ended_by_agent",
          actor: "tool.end_call",
          payload: { outcome: ctx.args.outcome },
        });
        if (ctx.args.outcome) {
          await db.call.update({
            where: { id: ctx.call.id },
            data: { outcome: ctx.args.outcome as never },
          });
        }
        return { ended: true };
      }

      case "get_product": {
        const version = await db.agentVersion.findFirst({
          where: {
            id: ctx.call.agentVersionId,
            organizationId: ctx.organizationId,
          },
        });
        const config = (version?.config ?? {}) as {
          products?: Array<Record<string, unknown>>;
        };
        const products = config.products ?? [];
        if (ctx.args.productName) {
          const name = String(ctx.args.productName).toLowerCase();
          const match = products.find(
            (p) => String(p.name ?? "").toLowerCase() === name,
          );
          return { product: match ?? null };
        }
        return { products };
      }

      default:
        throw new ToolExecutionError(`Unhandled tool: ${toolName}`);
    }
  }
}
