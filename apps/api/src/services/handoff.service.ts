import { db } from "@sonrat/database";
import { NotFoundError } from "@sonrat/shared";
import { createTelephonyProvider } from "../integrations/telephony/exotel/index.js";
import { logger } from "../lib/logger.js";
import { CallStateService } from "./call-state.service.js";

export class HandoffService {
  constructor(private readonly callState = new CallStateService()) {}

  async transfer(input: {
    organizationId: string;
    callId: string;
    reason: string;
    destination?: string;
    idempotencyKey?: string;
  }) {
    const idempotencyKey =
      input.idempotencyKey ?? `handoff:${input.callId}:${input.reason}`;

    const existingKey = await db.idempotencyKey.findUnique({
      where: {
        organizationId_key: {
          organizationId: input.organizationId,
          key: idempotencyKey,
        },
      },
    });
    if (existingKey?.responseBody) {
      return existingKey.responseBody as {
        handedOff: boolean;
        callId: string;
        destination: string | null;
        duplicate?: boolean;
      };
    }

    const call = await db.call.findFirst({
      where: { id: input.callId, organizationId: input.organizationId },
    });
    if (!call) throw new NotFoundError("Call");

    // Already handed off — return without re-transferring.
    if (call.status === "HUMAN_HANDOFF") {
      const result = {
        handedOff: true,
        callId: input.callId,
        destination: input.destination ?? null,
        duplicate: true,
      };
      await this.persistIdempotency(input.organizationId, idempotencyKey, result);
      return result;
    }

    await this.callState.transition({
      organizationId: input.organizationId,
      callId: input.callId,
      to: "HUMAN_HANDOFF",
      reason: input.reason,
      actor: "handoff.service",
      payload: { destination: input.destination, idempotencyKey },
    });

    if (call.providerCallId && input.destination) {
      const telephony = createTelephonyProvider();
      await telephony.transfer({
        providerCallId: call.providerCallId,
        to: input.destination,
      });
    }

    await db.callEvent.create({
      data: {
        organizationId: input.organizationId,
        callId: input.callId,
        type: "handoff.requested",
        payload: {
          reason: input.reason,
          destination: input.destination ?? null,
          idempotencyKey,
        },
      },
    });

    await db.notification.create({
      data: {
        organizationId: input.organizationId,
        type: "human_handoff",
        title: "Human handoff requested",
        body: `Call ${input.callId}: ${input.reason}`,
        metadata: { callId: input.callId, destination: input.destination },
      },
    });

    logger.info("human_handoff", {
      organization_id: input.organizationId,
      call_id: input.callId,
    });

    const result = {
      handedOff: true,
      callId: input.callId,
      destination: input.destination ?? null,
    };

    await this.persistIdempotency(input.organizationId, idempotencyKey, result);
    return result;
  }

  private async persistIdempotency(
    organizationId: string,
    key: string,
    body: Record<string, unknown>,
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await db.idempotencyKey.create({
        data: {
          organizationId,
          key,
          requestHash: key,
          responseStatus: 200,
          responseBody: body as object,
          expiresAt,
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return;
      }
      throw err;
    }
  }
}
