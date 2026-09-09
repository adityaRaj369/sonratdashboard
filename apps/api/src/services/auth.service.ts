import bcrypt from "bcryptjs";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  registerSchema,
  loginSchema,
  permissionsForRole,
  type Role,
} from "@sonrat/shared";
import { hashToken } from "../lib/crypto.js";
import { createSignedSessionToken } from "../lib/session-token.js";
import { slugify } from "../lib/pagination.js";
import { AuditService } from "./audit.service.js";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(private readonly audit = new AuditService()) {}

  async register(input: unknown, meta?: { ip?: string; userAgent?: string }) {
    const data = registerSchema.parse(input);
    const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    let baseSlug = slugify(data.organizationName) || "org";
    let slug = baseSlug;
    let n = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const config = getConfig();
    const { token, rawSecret } = await createSignedSessionToken();
    const tokenHash = hashToken(rawSecret);
    const expiresAt = new Date(Date.now() + config.AUTH_SESSION_TTL_SECONDS * 1000);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });

      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug,
          maxConcurrentCalls: config.DEFAULT_ORG_MAX_CONCURRENT_CALLS,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          tokenHash,
          expiresAt,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      });

      return { user, org, session };
    });

    await this.audit.log({
      organizationId: result.org.id,
      actorUserId: result.user.id,
      action: "auth.register",
      resource: "user",
      resourceId: result.user.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      token,
      expiresAt,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
      role: "OWNER" as const,
    };
  }

  async login(input: unknown, meta?: { ip?: string; userAgent?: string }) {
    const data = loginSchema.parse(input);
    const user = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user || user.deletedAt) {
      throw new AuthenticationError("Invalid email or password");
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new AuthenticationError("Invalid email or password");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new ValidationError("User has no organization membership");
    }

    const config = getConfig();
    const { token, rawSecret } = await createSignedSessionToken();
    const tokenHash = hashToken(rawSecret);
    const expiresAt = new Date(Date.now() + config.AUTH_SESSION_TTL_SECONDS * 1000);

    await db.$transaction([
      db.session.create({
        data: {
          userId: user.id,
          organizationId: membership.organizationId,
          tokenHash,
          expiresAt,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    await this.audit.log({
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "auth.login",
      resource: "session",
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
      role: membership.role,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async logout(sessionId: string) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }

  async me(userId: string, organizationId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { organization: true } },
      },
    });
    if (!user) throw new NotFoundError("User");

    const membership = user.memberships.find((m) => m.organizationId === organizationId);
    if (!membership) throw new AuthenticationError("No active organization");

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        timezone: membership.organization.timezone,
      },
      role: membership.role,
      permissions: [...permissionsForRole(membership.role as Role)],
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async switchOrg(userId: string, sessionId: string, organizationId: string) {
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: { organization: true },
    });
    if (!membership) {
      throw new NotFoundError("Organization membership");
    }

    await db.session.update({
      where: { id: sessionId },
      data: { organizationId },
    });

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "auth.switch_org",
      resource: "session",
      resourceId: sessionId,
    });

    return {
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
      role: membership.role,
    };
  }
}
