import { db } from "@sonrat/database";
import { CallStateMachine, type CallStatus, type CallOutcome } from "@sonrat/shared";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface ProcessCallCompletionData {
  organizationId: string;
  callId: string;
  terminalStatus?: CallStatus;
  outcome?: CallOutcome;
  failureReason?: string;
  durationSeconds?: number;
}

export const processCallCompletion: JobHandler<ProcessCallCompletionData> = async (
  job,
  ctx,
) => {
  const {
    organizationId,
    callId,
    terminalStatus = "COMPLETED",
    outcome,
    failureReason,
    durationSeconds,
  } = job.data;

  const call = await db.call.findFirst({
    where: { id: callId, organizationId },
  });
  if (!call) throw new PermanentJobError(`Call not found: ${callId}`);

  if (CallStateMachine.isTerminal(call.status as CallStatus)) {
    return { callId, alreadyTerminal: true };
  }

  const to = terminalStatus;
  CallStateMachine.transition(call.status as CallStatus, to);

  await db.call.update({
    where: { id: callId },
    data: {
      status: to,
      endedAt: new Date(),
      durationSeconds:
        durationSeconds ??
        (call.connectedAt
          ? Math.round((Date.now() - call.connectedAt.getTime()) / 1000)
          : null),
      outcome: outcome ?? call.outcome,
      failureReason: failureReason ?? call.failureReason,
    },
  });

  await db.callEvent.create({
    data: {
      organizationId,
      callId,
      type: `status.${to}`,
      payload: { outcome, failureReason },
    },
  });

  await db.callSession.updateMany({
    where: { callId, status: "active" },
    data: { status: "ended", endedAt: new Date() },
  });

  if (call.campaignId && call.contactId) {
    await db.campaignContact.updateMany({
      where: { campaignId: call.campaignId, contactId: call.contactId },
      data: { status: to },
    });
  }

  if (outcome === "DO_NOT_CALL" && call.contactId) {
    await db.contact.update({
      where: { id: call.contactId },
      data: { callability: "do_not_call" },
    });
  }

  await ctx.enqueue(
    "generate_call_summary",
    { organizationId, callId },
    { jobId: `generate_call_summary:${callId}` },
  );

  if (call.recordingReference) {
    await ctx.enqueue(
      "process_recording",
      { organizationId, callId },
      { jobId: `process_recording:${callId}` },
    );
  }

  if (call.campaignId) {
    await ctx.enqueue(
      "calculate_campaign_metrics",
      { organizationId, campaignId: call.campaignId },
      { jobId: `calculate_campaign_metrics:${call.campaignId}:${Date.now()}` },
    );
  }

  const retryable =
    to === "NO_ANSWER" || to === "BUSY" || to === "FAILED";
  if (retryable && call.campaignId) {
    await ctx.enqueue(
      "retry_failed_call",
      { organizationId, callId },
      { jobId: `retry_failed_call:${callId}` },
    );
  }

  return { callId, status: to };
};
