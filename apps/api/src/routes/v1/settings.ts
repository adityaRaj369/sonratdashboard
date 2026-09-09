import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@sonrat/database";
import { getConfig } from "@sonrat/config";
import { NotFoundError } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { AuditService } from "../../services/audit.service.js";

const settings = new Hono<{ Variables: AppVariables }>();
const audit = new AuditService();

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  timezone: z.string().min(1).optional(),
  maxConcurrentCalls: z.number().int().min(1).max(500).optional(),
  retentionDays: z.number().int().min(7).max(3650).optional(),
  featureFlags: z.record(z.unknown()).optional(),
});

settings.use("*", authMiddleware, tenantMiddleware);

async function getOrgJson(organizationId: string) {
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new NotFoundError("Organization");
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    maxConcurrentCalls: org.maxConcurrentCalls,
    retentionDays: org.retentionDays,
    featureFlags: org.featureFlags,
  };
}

settings.get("/", requirePerm("settings.write"), async (c) => {
  return c.json(await getOrgJson(getOrgId(c)));
});

settings.get("/organization", async (c) => {
  return c.json(await getOrgJson(getOrgId(c)));
});

settings.patch(
  "/",
  requirePerm("settings.write"),
  zValidator("json", updateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const org = await db.organization.update({
      where: { id: getOrgId(c) },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.timezone != null ? { timezone: data.timezone } : {}),
        ...(data.maxConcurrentCalls != null
          ? { maxConcurrentCalls: data.maxConcurrentCalls }
          : {}),
        ...(data.retentionDays != null ? { retentionDays: data.retentionDays } : {}),
        ...(data.featureFlags != null ? { featureFlags: data.featureFlags as object } : {}),
      },
    });

    await audit.log({
      organizationId: getOrgId(c),
      actorUserId: getUserId(c),
      action: "settings.update",
      resource: "organization",
      resourceId: org.id,
    });

    return c.json(await getOrgJson(org.id));
  },
);

settings.patch(
  "/organization",
  requirePerm("settings.write"),
  zValidator("json", updateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const org = await db.organization.update({
      where: { id: getOrgId(c) },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.timezone != null ? { timezone: data.timezone } : {}),
        ...(data.maxConcurrentCalls != null
          ? { maxConcurrentCalls: data.maxConcurrentCalls }
          : {}),
        ...(data.retentionDays != null ? { retentionDays: data.retentionDays } : {}),
        ...(data.featureFlags != null ? { featureFlags: data.featureFlags as object } : {}),
      },
    });

    await audit.log({
      organizationId: getOrgId(c),
      actorUserId: getUserId(c),
      action: "settings.update",
      resource: "organization",
      resourceId: org.id,
    });

    return c.json(await getOrgJson(org.id));
  },
);

settings.get("/members", requirePerm("users.read"), async (c) => {
  const items = await db.organizationMember.findMany({
    where: { organizationId: getOrgId(c) },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return c.json({
    items: items.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt,
    })),
  });
});

settings.get("/environment", async (c) => {
  const config = getConfig();
  return c.json({
    nodeEnv: config.NODE_ENV,
    demoMode: config.DEMO_MODE,
    aiProvider: config.AI_PROVIDER,
    telephonyProvider: config.TELEPHONY_PROVIDER,
    mockAi: config.MOCK_AI,
    mockTelephony: config.MOCK_TELEPHONY,
    publicAppUrl: config.PUBLIC_APP_URL,
    apiBaseUrl: config.API_BASE_URL,
  });
});

export default settings;
