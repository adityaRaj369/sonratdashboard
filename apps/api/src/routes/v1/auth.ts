import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { registerSchema, loginSchema } from "@sonrat/shared";
import type { AppVariables } from "../../lib/crypto.js";
import {
  authMiddleware,
  clearSessionCookie,
  setSessionCookie,
} from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/rate-limit.js";
import { AuthService } from "../../services/auth.service.js";

const auth = new Hono<{ Variables: AppVariables }>();
const service = new AuthService();

auth.post("/register", authRateLimit, zValidator("json", registerSchema), async (c) => {
  const result = await service.register(c.req.valid("json"), {
    ip: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
  });
  setSessionCookie(c, result.token, result.expiresAt);
  const { token: _t, ...body } = result;
  return c.json(body, 201);
});

auth.post("/login", authRateLimit, zValidator("json", loginSchema), async (c) => {
  const result = await service.login(c.req.valid("json"), {
    ip: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
  });
  setSessionCookie(c, result.token, result.expiresAt);
  const { token: _t, ...body } = result;
  return c.json(body);
});

auth.post("/logout", authMiddleware, async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId) await service.logout(sessionId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get("/me", authMiddleware, async (c) => {
  const data = await service.me(c.get("userId")!, c.get("organizationId")!);
  return c.json(data);
});

auth.post(
  "/switch-org",
  authMiddleware,
  zValidator("json", z.object({ organizationId: z.string().uuid() })),
  async (c) => {
    const { organizationId } = c.req.valid("json");
    const data = await service.switchOrg(
      c.get("userId")!,
      c.get("sessionId")!,
      organizationId,
    );
    return c.json(data);
  },
);

export default auth;
