import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { contactSchema, paginationSchema } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { idempotencyMiddleware } from "../../middleware/idempotency.js";
import { ContactService } from "../../services/contact.service.js";
import { ContactImportService } from "../../services/contact-import.service.js";

const contacts = new Hono<{ Variables: AppVariables }>();
const service = new ContactService();
const imports = new ContactImportService();

contacts.use("*", authMiddleware, tenantMiddleware);

contacts.get(
  "/",
  requirePerm("contacts.read"),
  zValidator(
    "query",
    paginationSchema.extend({
      q: z.string().optional(),
      search: z.string().optional(),
      callability: z.string().optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid("query");
    const page = await service.list(getOrgId(c), {
      cursor: q.cursor,
      limit: q.limit,
      q: q.q || q.search,
      callability: q.callability,
    });
    return c.json(page);
  },
);

contacts.post(
  "/",
  requirePerm("contacts.write"),
  idempotencyMiddleware(),
  zValidator("json", contactSchema),
  async (c) => {
    const contact = await service.create(getOrgId(c), getUserId(c), c.req.valid("json"));
    return c.json(contact, 201);
  },
);

async function uploadImport(c: Context<{ Variables: AppVariables }>) {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "file is required" } },
      400,
    );
  }
  const data = Buffer.from(await file.arrayBuffer());
  const imp = await imports.upload(getOrgId(c), getUserId(c), {
    name: file.name,
    type: file.type,
    data,
  });
  return c.json(imp, 201);
}

contacts.post("/imports/upload", requirePerm("contacts.write"), uploadImport);
contacts.post("/import", requirePerm("contacts.write"), uploadImport);

contacts.get("/imports/:importId", requirePerm("contacts.read"), async (c) => {
  return c.json(await imports.get(getOrgId(c), c.req.param("importId")!));
});
contacts.get("/import/:importId", requirePerm("contacts.read"), async (c) => {
  return c.json(await imports.get(getOrgId(c), c.req.param("importId")!));
});

contacts.get("/imports/:importId/preview", requirePerm("contacts.read"), async (c) => {
  return c.json(await imports.preview(getOrgId(c), c.req.param("importId")!));
});

const previewBody = z.object({ columnMapping: z.record(z.string()) });

contacts.post(
  "/imports/:importId/preview",
  requirePerm("contacts.write"),
  zValidator("json", previewBody),
  async (c) => {
    return c.json(
      await imports.preview(
        getOrgId(c),
        c.req.param("importId")!,
        c.req.valid("json").columnMapping,
      ),
    );
  },
);

contacts.post(
  "/import/:importId/preview",
  requirePerm("contacts.write"),
  zValidator("json", previewBody),
  async (c) => {
    return c.json(
      await imports.preview(
        getOrgId(c),
        c.req.param("importId")!,
        c.req.valid("json").columnMapping,
      ),
    );
  },
);

const commitBody = z.object({ columnMapping: z.record(z.string()).optional() });

contacts.post(
  "/imports/:importId/commit",
  requirePerm("contacts.write"),
  idempotencyMiddleware(),
  zValidator("json", commitBody),
  async (c) => {
    return c.json(
      await imports.commit(
        getOrgId(c),
        getUserId(c),
        c.req.param("importId")!,
        c.req.valid("json"),
      ),
    );
  },
);

contacts.post(
  "/import/:importId/commit",
  requirePerm("contacts.write"),
  idempotencyMiddleware(),
  zValidator("json", commitBody),
  async (c) => {
    return c.json(
      await imports.commit(
        getOrgId(c),
        getUserId(c),
        c.req.param("importId")!,
        c.req.valid("json"),
      ),
    );
  },
);

contacts.get("/:id", requirePerm("contacts.read"), async (c) => {
  const contact = await service.get(getOrgId(c), c.req.param("id")!);
  return c.json(contact);
});

contacts.patch(
  "/:id",
  requirePerm("contacts.write"),
  zValidator("json", contactSchema.partial()),
  async (c) => {
    const contact = await service.update(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json"),
    );
    return c.json(contact);
  },
);

contacts.delete("/:id", requirePerm("contacts.write"), async (c) => {
  await service.remove(getOrgId(c), getUserId(c), c.req.param("id")!);
  return c.json({ ok: true });
});

export default contacts;
