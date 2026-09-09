import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { paginationSchema, createAgentSchema, updateAgentSectionSchema } from "@sonrat/shared";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware, requirePerm } from "../../middleware/auth.js";
import { tenantMiddleware, getOrgId, getUserId } from "../../middleware/tenant.js";
import { idempotencyMiddleware } from "../../middleware/idempotency.js";
import { AgentService } from "../../services/agent.service.js";

const agents = new Hono<{ Variables: AppVariables }>();
const service = new AgentService();

agents.use("*", authMiddleware, tenantMiddleware);

agents.get("/", requirePerm("agents.read"), zValidator("query", paginationSchema), async (c) => {
  const q = c.req.valid("query");
  const page = await service.list(getOrgId(c), { cursor: q.cursor, limit: q.limit });
  return c.json(page);
});

agents.post(
  "/",
  requirePerm("agents.write"),
  idempotencyMiddleware(),
  zValidator("json", createAgentSchema),
  async (c) => {
    const agent = await service.create(getOrgId(c), getUserId(c), c.req.valid("json"));
    return c.json(agent, 201);
  },
);

agents.get("/:id", requirePerm("agents.read"), async (c) => {
  const agent = await service.get(getOrgId(c), c.req.param("id")!);
  return c.json(agent);
});

agents.patch(
  "/:id",
  requirePerm("agents.write"),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).optional().nullable(),
    }),
  ),
  async (c) => {
    const agent = await service.update(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json"),
    );
    return c.json(agent);
  },
);

agents.patch(
  "/:id/sections",
  requirePerm("agents.write"),
  zValidator("json", updateAgentSectionSchema),
  async (c) => {
    const agent = await service.patchSection(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      c.req.valid("json"),
    );
    return c.json(agent);
  },
);

agents.patch(
  "/:id/sections/:section",
  requirePerm("agents.write"),
  zValidator("json", z.object({ data: z.unknown() })),
  async (c) => {
    const agent = await service.patchSection(
      getOrgId(c),
      getUserId(c),
      c.req.param("id")!,
      {
        section: c.req.param("section"),
        data: c.req.valid("json").data,
      },
    );
    return c.json(agent);
  },
);

agents.post("/:id/validate", requirePerm("agents.write"), async (c) => {
  const result = await service.validate(getOrgId(c), c.req.param("id")!);
  if (result.valid) {
    return c.json({ valid: true, errors: [], warnings: [] });
  }
  const flat = result.errors as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
  const errors = [
    ...(flat.formErrors || []).map((message) => ({ message })),
    ...Object.entries(flat.fieldErrors || {}).flatMap(([path, messages]) =>
      (messages || []).map((message) => ({ path, message })),
    ),
  ];
  return c.json({ valid: false, errors, warnings: [] });
});

agents.post(
  "/:id/publish",
  requirePerm("agents.publish"),
  idempotencyMiddleware(),
  async (c) => {
    const result = await service.publish(getOrgId(c), getUserId(c), c.req.param("id")!);
    return c.json(result.agent);
  },
);

agents.get("/:id/versions", requirePerm("agents.read"), async (c) => {
  const versions = await service.versions(getOrgId(c), c.req.param("id")!);
  return c.json({ items: versions });
});

agents.post(
  "/:id/test",
  requirePerm("agents.write"),
  zValidator(
    "json",
    z.object({
      customerName: z.string().optional(),
      message: z.string().optional(),
      language: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const result = await service.test(getOrgId(c), c.req.param("id")!, body);
    return c.json({
      reply:
        body.message
          ? `Acknowledged: "${body.message}". Runtime prompt is valid (${result.preview.systemPromptLength} chars). Voice=${result.preview.voiceId}. Languages=${result.preview.languages.join(", ")}.`
          : `Runtime preview ready. Voice=${result.preview.voiceId}. Tools=${result.preview.tools.join(", ") || "none"}.`,
      language: body.language || result.preview.languages[0] || "en",
      tools: result.preview.tools.map((name) => ({ name })),
      versionNumber: undefined,
      preview: result.preview,
      ok: result.ok,
    });
  },
);

agents.delete("/:id", requirePerm("agents.write"), async (c) => {
  await service.archive(getOrgId(c), getUserId(c), c.req.param("id")!);
  return c.json({ ok: true });
});

export default agents;
