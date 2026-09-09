import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { paginationSchema } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { idempotencyMiddleware } from "../../middleware/idempotency.js";
import { AgentFlowService } from "../../services/agent-flow.service.js";

const flows = new Hono<{ Variables: AppVariables }>();
const service = new AgentFlowService();

flows.use("*", authMiddleware, tenantMiddleware);

flows.get("/", requirePerm("agents.read"), zValidator("query", paginationSchema), async (c) => {
  const q = c.req.valid("query");
  return c.json(await service.list(getOrgId(c), { cursor: q.cursor, limit: q.limit }));
});

flows.post(
  "/",
  requirePerm("agents.write"),
  idempotencyMiddleware(),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    }),
  ),
  async (c) => {
    const flow = await service.create(getOrgId(c), getUserId(c), c.req.valid("json"));
    return c.json(flow, 201);
  },
);

flows.get("/:id", requirePerm("agents.read"), async (c) => {
  return c.json(await service.get(getOrgId(c), c.req.param("id")!));
});

flows.put(
  "/:id/graph",
  requirePerm("agents.write"),
  zValidator("json", z.object({ graph: z.unknown() })),
  async (c) => {
    const flow = await service.updateGraph(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json").graph,
    );
    return c.json(flow);
  },
);

flows.post(
  "/:id/publish",
  requirePerm("agents.publish"),
  idempotencyMiddleware(),
  async (c) => {
    const result = await service.publish(getOrgId(c), getUserId(c), c.req.param("id")!);
    return c.json(result);
  },
);

export default flows;
