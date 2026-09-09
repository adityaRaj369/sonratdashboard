import { randomUUID } from "node:crypto";
import type {
  PlaceCallInput,
  PlaceCallResult,
  TelephonyProvider,
  TransferCallInput,
} from "./types.js";
import { logger } from "../../lib/logger.js";

const calls = new Map<string, { input: PlaceCallInput; status: string }>();

export function createMockTelephony(): TelephonyProvider {
  return {
    async placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult> {
      const providerCallId = `mock_${randomUUID()}`;
      calls.set(providerCallId, { input, status: "in-progress" });
      logger.info("mock_telephony_place_call", {
        provider_call_id: providerCallId,
        to: input.to,
      });
      return { providerCallId, status: "in-progress", raw: { mock: true } };
    },

    async hangup(providerCallId: string) {
      const call = calls.get(providerCallId);
      if (call) call.status = "completed";
      logger.info("mock_telephony_hangup", { provider_call_id: providerCallId });
    },

    async transfer(input: TransferCallInput) {
      logger.info("mock_telephony_transfer", {
        provider_call_id: input.providerCallId,
        to: input.to,
      });
    },

    async getCall(providerCallId: string) {
      return calls.get(providerCallId) ?? null;
    },
  };
}
