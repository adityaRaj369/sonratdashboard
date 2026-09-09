import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import {
  AuthenticationError,
  AuthorizationError,
  hasPermission,
  type Permission,
  type Role,
} from "@sonrat/shared";
import type { AppVariables } from "../lib/crypto.js";
import { hashToken } from "../lib/crypto.js";
import { verifySignedSessionToken } from "../lib/session-token.js";

type AppEnv = { Variables: AppVariables };

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const config = getConfig();
  const token = getCookie(c, config.AUTH_COOKIE_NAME);
  if (!token) {
    throw new AuthenticationError();
  }

  const verified = await verifySignedSessionToken(token);
  if (!verified) {
    deleteCookie(c, config.AUTH_COOKIE_NAME);
    throw new AuthenticationError("Invalid session token");
  }

  const tokenHash = hashToken(verified.rawSecret);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
    deleteCookie(c, config.AUTH_COOKIE_NAME);
    throw new AuthenticationError("Session expired");
  }

  if (!session.organizationId) {
    throw new AuthenticationError("No active organization");
  }

  const membership = session.user.memberships.find(
    (m) => m.organizationId === session.organizationId,
  );
  if (!membership) {
    throw new AuthorizationError("Not a member of active organization");
  }

  c.set("userId", session.userId);
  c.set("sessionId", session.id);
  c.set("organizationId", session.organizationId);
  c.set("role", membership.role as Role);
  c.set("email", session.user.email);
  c.set("name", session.user.name);

  await next();
}

export function requirePerm(permission: Permission) {
  return async (c: Context<AppEnv>, next: Next) => {
    const role = c.get("role");
    if (!role || !hasPermission(role, permission)) {
      throw new AuthorizationError(`Missing permission: ${permission}`);
    }
    await next();
  };
}

export function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  const config = getConfig();
  setCookie(c, config.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(c: Context) {
  const config = getConfig();
  deleteCookie(c, config.AUTH_COOKIE_NAME, { path: "/" });
}

/** Optional auth — populates context when cookie present, otherwise continues. */
export async function optionalAuthMiddleware(c: Context<AppEnv>, next: Next) {
  const config = getConfig();
  const token = getCookie(c, config.AUTH_COOKIE_NAME);
  if (!token) {
    await next();
    return;
  }
  try {
    await authMiddleware(c, next);
  } catch {
    await next();
  }
}
