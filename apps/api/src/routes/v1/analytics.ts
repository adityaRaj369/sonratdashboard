import { Hono } from "hono";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId } from "../../middleware/tenant.js";
import { AnalyticsService } from "../../services/analytics.service.js";

const analytics = new Hono<{ Variables: AppVariables }>();
const service = new AnalyticsService();

analytics.use("*", authMiddleware, tenantMiddleware);

analytics.get("/organization", requirePerm("analytics.read"), async (c) => {
  const data = await service.organization(getOrgId(c));
  return c.json(data);
});

analytics.get("/overview", requirePerm("analytics.read"), async (c) => {
  const data = await service.organization(getOrgId(c));
  return c.json(data);
});

analytics.get("/campaigns/:campaignId", requirePerm("analytics.read"), async (c) => {
  const data = await service.campaign(getOrgId(c), c.req.param("campaignId")!);
  return c.json(data);
});

analytics.get("/agents/:agentId", requirePerm("analytics.read"), async (c) => {
  const data = await service.agent(getOrgId(c), c.req.param("agentId")!);
  return c.json(data);
});

export default analytics;
