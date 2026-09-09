import { db } from "@sonrat/database";
import { logger } from "../lib/logger.js";

export interface AuditInput {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(input: AuditInput): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: input.organizationId ?? null,
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: (input.metadata ?? {}) as object,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (err) {
      logger.error("audit_log_failed", {
        action: input.action,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }
}
