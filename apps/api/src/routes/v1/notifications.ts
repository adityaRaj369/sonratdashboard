import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@sonrat/database";
import { paginationSchema } from "@sonrat/shared";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { cursorWhere, paginateByCreatedAt } from "../../lib/pagination.js";

const notifications = new Hono<{ Variables: AppVariables }>();

notifications.use("*", authMiddleware, tenantMiddleware);

notifications.get("/", zValidator("query", paginationSchema), async (c) => {
  const q = c.req.valid("query");
  const userId = getUserId(c);
  const rows = await db.notification.findMany({
    where: {
      organizationId: getOrgId(c),
      OR: [{ userId }, { userId: null }],
      ...(cursorWhere(q.cursor) ?? {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
  });
  return c.json(paginateByCreatedAt(rows, q.limit));
});

notifications.post("/:id/read", async (c) => {
  await db.notification.updateMany({
    where: {
      id: c.req.param("id")!,
      organizationId: getOrgId(c),
      OR: [{ userId: getUserId(c) }, { userId: null }],
    },
    data: { readAt: new Date() },
  });
  return c.json({ ok: true });
});

export default notifications;
