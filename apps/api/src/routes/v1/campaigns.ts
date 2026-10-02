import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { paginationSchema, createCampaignSchema } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { idempotencyMiddleware } from "../../middleware/idempotency.js";
import { campaignStartRateLimit } from "../../middleware/rate-limit.js";
import { CampaignService } from "../../services/campaign.service.js";

const campaigns = new Hono<{ Variables: AppVariables }>();
const service = new CampaignService();

campaigns.use("*", authMiddleware, tenantMiddleware);

campaigns.get(
  "/",
  requirePerm("campaigns.read"),
  zValidator(
    "query",
    paginationSchema.extend({ status: z.string().optional(), search: z.string().optional() }),
  ),
  async (c) => {
    const q = c.req.valid("query");
    const page = await service.list(getOrgId(c), {
      cursor: q.cursor,
      limit: q.limit,
      status: q.status,
      search: q.search,
    });
    return c.json(page);
  },
);

campaigns.post(
  "/",
  requirePerm("campaigns.write"),
  idempotencyMiddleware(),
  zValidator("json", createCampaignSchema),
  async (c) => {
    const campaign = await service.create(getOrgId(c), getUserId(c), c.req.valid("json"));
    return c.json(campaign, 201);
  },
);

campaigns.get("/:id", requirePerm("campaigns.read"), async (c) => {
  const campaign = await service.get(getOrgId(c), c.req.param("id")!);
  return c.json(campaign);
});

campaigns.get("/:id/preflight", requirePerm("campaigns.read"), async (c) => {
  return c.json(await service.preflight(getOrgId(c), c.req.param("id")!));
});

campaigns.patch(
  "/:id",
  requirePerm("campaigns.write"),
  zValidator("json", createCampaignSchema.partial().omit({ contactIds: true })),
  async (c) => {
    const campaign = await service.update(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json"),
    );
    return c.json(campaign);
  },
);

campaigns.post(
  "/:id/start",
  requirePerm("campaigns.start"),
  campaignStartRateLimit,
  idempotencyMiddleware({ required: true }),
  async (c) => {
    const campaign = await service.start(getOrgId(c), getUserId(c), c.req.param("id")!);
    return c.json(campaign);
  },
);

campaigns.post("/:id/pause", requirePerm("campaigns.pause"), async (c) => {
  const campaign = await service.pause(getOrgId(c), getUserId(c), c.req.param("id")!);
  return c.json(campaign);
});

campaigns.post("/:id/cancel", requirePerm("campaigns.write"), async (c) => {
  const campaign = await service.cancel(getOrgId(c), getUserId(c), c.req.param("id")!);
  return c.json(campaign);
});

campaigns.get(
  "/:id/contacts",
  requirePerm("campaigns.read"),
  zValidator("query", paginationSchema),
  async (c) => {
    const q = c.req.valid("query");
    const page = await service.listContacts(getOrgId(c), c.req.param("id")!, {
      cursor: q.cursor,
      limit: q.limit,
    });
    return c.json(page);
  },
);

campaigns.post(
  "/:id/contacts",
  requirePerm("campaigns.write"),
  zValidator("json", z.object({ contactIds: z.array(z.string().uuid()).min(1) })),
  async (c) => {
    const result = await service.addContacts(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json").contactIds,
    );
    return c.json(result);
  },
);

campaigns.delete("/:id", requirePerm("campaigns.write"), async (c) => {
  await service.remove(getOrgId(c), getUserId(c), c.req.param("id")!);
  return c.json({ ok: true });
});

export default campaigns;
