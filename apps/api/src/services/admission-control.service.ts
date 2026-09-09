import { db } from "@sonrat/database";
import { ConflictError } from "@sonrat/shared";
import { logger } from "../lib/logger.js";

const ACTIVE_STATUSES = [
  "QUEUED",
  "INITIATING",
  "RINGING",
  "CONNECTED",
  "AI_ACTIVE",
  "HUMAN_HANDOFF",
] as const;

export class AdmissionControlService {
  async getOrgLimits(organizationId: string) {
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new ConflictError("Organization not found");
    return {
      maxConcurrentCalls: org.maxConcurrentCalls,
    };
  }

  async countActiveCalls(organizationId: string): Promise<number> {
    return db.call.count({
      where: {
        organizationId,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
  }

  async countCampaignActiveCalls(campaignId: string): Promise<number> {
    return db.call.count({
      where: {
        campaignId,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
  }

  /**
   * Reserve capacity before placing a new outbound call.
   * Returns remaining slots after reservation check.
   */
  async admitCall(input: {
    organizationId: string;
    campaignId?: string;
    campaignConcurrencyLimit?: number;
  }): Promise<{ admitted: true; active: number; remaining: number }> {
    const { maxConcurrentCalls } = await this.getOrgLimits(input.organizationId);
    const active = await this.countActiveCalls(input.organizationId);

    if (active >= maxConcurrentCalls) {
      logger.warn("admission_denied_org", {
        organization_id: input.organizationId,
        active,
        max: maxConcurrentCalls,
      });
      throw new ConflictError("Organization concurrent call limit reached", {
        active,
        max: maxConcurrentCalls,
      });
    }

    if (input.campaignId && input.campaignConcurrencyLimit != null) {
      const campaignActive = await this.countCampaignActiveCalls(input.campaignId);
      if (campaignActive >= input.campaignConcurrencyLimit) {
        throw new ConflictError("Campaign concurrent call limit reached", {
          active: campaignActive,
          max: input.campaignConcurrencyLimit,
        });
      }
    }

    return {
      admitted: true,
      active,
      remaining: maxConcurrentCalls - active - 1,
    };
  }

  async canStartCampaign(organizationId: string): Promise<boolean> {
    const { maxConcurrentCalls } = await this.getOrgLimits(organizationId);
    const active = await this.countActiveCalls(organizationId);
    return active < maxConcurrentCalls;
  }
}
