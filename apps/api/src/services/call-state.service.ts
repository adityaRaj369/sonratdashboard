import { db, type CallStatus, type Prisma } from "@sonrat/database";
import {
  CallStateMachine,
  ConflictError,
  NotFoundError,
  type CallStatus as SharedCallStatus,
} from "@sonrat/shared";
import { logger } from "../lib/logger.js";

export interface TransitionInput {
  organizationId: string;
  callId: string;
  to: SharedCallStatus;
  reason?: string;
  payload?: Record<string, unknown>;
  actor?: string;
}

/**
 * Sole authority for Call.status mutations.
 * All other services must call this — never update status directly.
 */
export class CallStateService {
  async transition(input: TransitionInput) {
    const call = await db.call.findFirst({
      where: { id: input.callId, organizationId: input.organizationId },
    });
    if (!call) throw new NotFoundError("Call");

    const from = call.status as SharedCallStatus;
    const to = input.to;

    if (from === to) {
      return call;
    }

    if (!CallStateMachine.canTransition(from, to)) {
      throw new ConflictError(`Invalid call state transition: ${from} -> ${to}`, {
        from,
        to,
        callId: input.callId,
      });
    }

    CallStateMachine.transition(from, to);

    const now = new Date();
    const data: Prisma.CallUpdateInput = {
      status: to as CallStatus,
    };

    if (to === "INITIATING" || to === "RINGING") {
      data.startedAt = call.startedAt ?? now;
    }
    if (to === "CONNECTED" || to === "AI_ACTIVE") {
      data.connectedAt = call.connectedAt ?? now;
      data.startedAt = call.startedAt ?? now;
    }
    if (
      to === "COMPLETED" ||
      to === "FAILED" ||
      to === "CANCELLED" ||
      to === "NO_ANSWER" ||
      to === "BUSY"
    ) {
      data.endedAt = now;
      if (call.connectedAt) {
        data.durationSeconds = Math.max(
          0,
          Math.floor((now.getTime() - call.connectedAt.getTime()) / 1000),
        );
      }
      if (input.reason) {
        data.failureReason = input.reason;
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const next = await tx.call.update({
        where: { id: call.id },
        data,
      });

      await tx.callEvent.create({
        data: {
          organizationId: input.organizationId,
          callId: call.id,
          type: `status.${to.toLowerCase()}`,
          payload: {
            from,
            to,
            reason: input.reason,
            actor: input.actor ?? "system",
            ...(input.payload ?? {}),
          },
        },
      });

      return next;
    });

    logger.info("call_state_transition", {
      organization_id: input.organizationId,
      call_id: input.callId,
      from,
      to,
    });

    return updated;
  }

  async assertCanTransition(from: SharedCallStatus, to: SharedCallStatus): Promise<boolean> {
    return CallStateMachine.canTransition(from, to);
  }
}
