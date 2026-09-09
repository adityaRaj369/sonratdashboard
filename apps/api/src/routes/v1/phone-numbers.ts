import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { normalizePhone, NotFoundError, ValidationError } from "@sonrat/shared";
import { db } from "@sonrat/database";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { AuditService } from "../../services/audit.service.js";

const phoneNumbers = new Hono<{ Variables: AppVariables }>();
const audit = new AuditService();

const phoneFieldsSchema = z.object({
  e164: z.string().min(5).optional(),
  phoneNumber: z.string().min(5).optional(),
  displayName: z.string().max(120).optional().nullable(),
  label: z.string().max(120).optional().nullable(),
  inboundAgentId: z.string().uuid().optional().nullable(),
  agentId: z.string().uuid().optional().nullable(),
  provider: z.string().default("exotel"),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

const createSchema = phoneFieldsSchema.refine(
  (v) => Boolean(v.e164 || v.phoneNumber),
  { message: "phoneNumber is required" },
);

const updateSchema = phoneFieldsSchema.partial();

function serializePhone(phone: {
  id: string;
  e164: string;
  displayName: string | null;
  provider: string;
  isActive: boolean;
  inboundAgentId: string | null;
}) {
  return {
    ...phone,
    phoneNumber: phone.e164,
    label: phone.displayName,
    agentId: phone.inboundAgentId,
  };
}

phoneNumbers.use("*", authMiddleware, tenantMiddleware);

phoneNumbers.get("/", requirePerm("phone_numbers.read"), async (c) => {
  const items = await db.phoneNumber.findMany({
    where: { organizationId: getOrgId(c) },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ items: items.map(serializePhone) });
});

phoneNumbers.post(
  "/",
  requirePerm("phone_numbers.write"),
  zValidator("json", createSchema),
  async (c) => {
    const data = c.req.valid("json");
    const raw = data.e164 || data.phoneNumber || "";
    const phone = normalizePhone(raw);
    if (!phone.valid || !phone.e164) {
      throw new ValidationError("Invalid phone number");
    }

    const created = await db.phoneNumber.create({
      data: {
        organizationId: getOrgId(c),
        e164: phone.e164,
        displayName: data.displayName ?? data.label ?? null,
        inboundAgentId: data.inboundAgentId ?? data.agentId ?? null,
        provider: data.provider,
        isActive: data.isActive,
        metadata: data.metadata as object,
      },
    });

    await audit.log({
      organizationId: getOrgId(c),
      actorUserId: getUserId(c),
      action: "phone_number.create",
      resource: "phone_number",
      resourceId: created.id,
    });

    return c.json(serializePhone(created), 201);
  },
);

phoneNumbers.patch(
  "/:id",
  requirePerm("phone_numbers.write"),
  zValidator("json", updateSchema),
  async (c) => {
    const existing = await db.phoneNumber.findFirst({
      where: { id: c.req.param("id")!, organizationId: getOrgId(c) },
    });
    if (!existing) throw new NotFoundError("PhoneNumber");

    const data = c.req.valid("json");
    const rawPhone = data.e164 || data.phoneNumber;
    let e164: string | undefined;
    if (rawPhone) {
      const phone = normalizePhone(rawPhone);
      if (!phone.valid || !phone.e164) throw new ValidationError("Invalid phone number");
      e164 = phone.e164;
    }

    const updated = await db.phoneNumber.update({
      where: { id: existing.id },
      data: {
        ...(e164 ? { e164 } : {}),
        ...(data.displayName !== undefined || data.label !== undefined
          ? { displayName: data.displayName ?? data.label ?? null }
          : {}),
        ...(data.inboundAgentId !== undefined || data.agentId !== undefined
          ? { inboundAgentId: data.inboundAgentId ?? data.agentId ?? null }
          : {}),
        ...(data.isActive != null ? { isActive: data.isActive } : {}),
        ...(data.metadata != null ? { metadata: data.metadata as object } : {}),
      },
    });

    return c.json(serializePhone(updated));
  },
);

phoneNumbers.delete("/:id", requirePerm("phone_numbers.write"), async (c) => {
  const existing = await db.phoneNumber.findFirst({
    where: { id: c.req.param("id")!, organizationId: getOrgId(c) },
  });
  if (!existing) throw new NotFoundError("PhoneNumber");

  await db.phoneNumber.delete({ where: { id: existing.id } });
  await audit.log({
    organizationId: getOrgId(c),
    actorUserId: getUserId(c),
    action: "phone_number.delete",
    resource: "phone_number",
    resourceId: existing.id,
  });
  return c.json({ ok: true });
});

export default phoneNumbers;
