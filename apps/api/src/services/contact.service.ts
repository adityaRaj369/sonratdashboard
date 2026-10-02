import { db } from "@sonrat/database";
import {
  ConflictError,
  contactSchema,
  normalizePhone,
  NotFoundError,
  ValidationError,
} from "@sonrat/shared";
import { cursorWhere, paginateByCreatedAt } from "../lib/pagination.js";
import { AuditService } from "./audit.service.js";

export class ContactService {
  constructor(private readonly audit = new AuditService()) {}

  async list(
    organizationId: string,
    opts: { cursor?: string; limit: number; q?: string; callability?: string },
  ) {
    const search = opts.q?.trim();
    const rows = await db.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(opts.callability ? { callability: opts.callability as never } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { rawPhone: { contains: search } },
                { normalizedPhone: { contains: search } },
                { company: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(cursorWhere(opts.cursor) ?? {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
    });
    return paginateByCreatedAt(rows, opts.limit);
  }

  async get(organizationId: string, contactId: string) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, organizationId, deletedAt: null },
    });
    if (!contact) throw new NotFoundError("Contact");
    return contact;
  }

  async create(organizationId: string, userId: string, input: unknown) {
    const data = contactSchema.parse(input);
    const phone = normalizePhone(data.phone);
    if (!phone.valid || !phone.e164) {
      throw new ValidationError("Invalid phone number", { phone: data.phone });
    }

    try {
      const contact = await db.contact.create({
        data: {
          organizationId,
          name: data.name,
          rawPhone: data.phone,
          normalizedPhone: phone.e164,
          countryCode: phone.countryCode,
          email: data.email || null,
          company: data.company,
          tags: data.tags,
          customFields: data.customFields as object,
          leadStatus: data.leadStatus,
          notes: data.notes,
          source: data.source,
          timezone: data.timezone,
          callability: data.callability,
        },
      });

      await this.audit.log({
        organizationId,
        actorUserId: userId,
        action: "contact.create",
        resource: "contact",
        resourceId: contact.id,
      });

      return contact;
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        throw new ConflictError("Contact with this phone already exists");
      }
      throw err;
    }
  }

  async update(organizationId: string, userId: string, contactId: string, input: unknown) {
    await this.get(organizationId, contactId);
    const data = contactSchema.partial().parse(input);

    let phoneFields: Record<string, string | null> = {};
    if (data.phone) {
      const phone = normalizePhone(data.phone);
      if (!phone.valid || !phone.e164) {
        throw new ValidationError("Invalid phone number");
      }
      phoneFields = {
        rawPhone: data.phone,
        normalizedPhone: phone.e164,
        countryCode: phone.countryCode,
      };
    }

    const contact = await db.contact.update({
      where: { id: contactId },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...phoneFields,
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.tags != null ? { tags: data.tags } : {}),
        ...(data.customFields != null ? { customFields: data.customFields as object } : {}),
        ...(data.leadStatus !== undefined ? { leadStatus: data.leadStatus } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.callability != null ? { callability: data.callability } : {}),
      },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "contact.update",
      resource: "contact",
      resourceId: contactId,
    });

    return contact;
  }

  async remove(organizationId: string, userId: string, contactId: string) {
    await this.get(organizationId, contactId);
    await db.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "contact.delete",
      resource: "contact",
      resourceId: contactId,
    });
  }

  async batchCreate(
    organizationId: string,
    userId: string,
    items: Array<any>,
  ) {
    const results = [];
    for (const item of items) {
      if (!item.name || !item.phone) continue;
      const phone = normalizePhone(String(item.phone));
      if (!phone.valid || !phone.e164) continue;

      const contact = await db.contact.upsert({
        where: {
          organizationId_normalizedPhone: {
            organizationId,
            normalizedPhone: phone.e164,
          },
        },
        create: {
          organizationId,
          name: String(item.name).trim(),
          rawPhone: String(item.phone).trim(),
          normalizedPhone: phone.e164,
          countryCode: phone.countryCode,
          email: item.email ? String(item.email).trim() : null,
          company: item.company ? String(item.company).trim() : null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          customFields:
            item.customFields && typeof item.customFields === "object"
              ? item.customFields
              : {},
          leadStatus: item.leadStatus ? String(item.leadStatus) : null,
          notes: item.notes ? String(item.notes) : null,
          source: item.source ? String(item.source) : "csv_upload",
          timezone: item.timezone ? String(item.timezone) : null,
        },
        update: {
          name: String(item.name).trim(),
          email: item.email ? String(item.email).trim() : undefined,
          company: item.company ? String(item.company).trim() : undefined,
          deletedAt: null,
        },
      });
      results.push(contact);
    }

    if (results.length > 0) {
      await this.audit.log({
        organizationId,
        actorUserId: userId,
        action: "contact.batch_create",
        resource: "contact",
        metadata: { count: results.length },
      });
    }

    return results;
  }
}
