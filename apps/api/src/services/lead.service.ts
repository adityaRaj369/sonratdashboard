import { db } from "@sonrat/database";
import { NotFoundError } from "@sonrat/shared";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";

export class LeadService {
  async create(input: {
    organizationId: string;
    contactId?: string;
    callId?: string;
    status?: string;
    interestLevel?: string;
    notes?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (input.idempotencyKey) {
      const existing = await db.lead.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: input.organizationId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return existing;
    }

    try {
      return await db.lead.create({
        data: {
          organizationId: input.organizationId,
          contactId: input.contactId,
          callId: input.callId,
          status: input.status ?? "new",
          interestLevel: input.interestLevel,
          notes: input.notes,
          idempotencyKey: input.idempotencyKey,
          metadata: (input.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      // Concurrent create with same idempotency key — return the winner.
      if (
        input.idempotencyKey &&
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        const existing = await db.lead.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.organizationId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async list(organizationId: string, opts: { cursor?: string; limit: number }) {
    const rows = await db.lead.findMany({
      where: {
        organizationId,
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      include: {
        contact: { select: { id: true, name: true, normalizedPhone: true } },
      },
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, leadId: string) {
    const lead = await db.lead.findFirst({
      where: { id: leadId, organizationId },
      include: { contact: true, call: true },
    });
    if (!lead) throw new NotFoundError("Lead");
    return lead;
  }
}
