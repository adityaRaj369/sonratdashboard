import { db } from "@sonrat/database";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface ProcessRecordingData {
  organizationId: string;
  callId: string;
  objectKey?: string;
  contentType?: string;
  durationSeconds?: number;
}

export const processRecording: JobHandler<ProcessRecordingData> = async (job) => {
  const {
    organizationId,
    callId,
    objectKey,
    contentType = "audio/wav",
    durationSeconds,
  } = job.data;

  const call = await db.call.findFirst({
    where: { id: callId, organizationId },
  });
  if (!call) throw new PermanentJobError(`Call not found: ${callId}`);

  const key =
    objectKey ??
    call.recordingReference ??
    `recordings/${organizationId}/${callId}.wav`;

  const existing = await db.callRecording.findFirst({
    where: { organizationId, callId, objectKey: key },
  });
  if (existing) {
    return { recordingId: existing.id, deduped: true };
  }

  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });

  const recording = await db.callRecording.create({
    data: {
      organizationId,
      callId,
      objectKey: key,
      contentType,
      durationSeconds: durationSeconds ?? call.durationSeconds,
      retentionUntil: new Date(
        Date.now() + org.retentionDays * 24 * 60 * 60 * 1000,
      ),
    },
  });

  await db.call.update({
    where: { id: callId },
    data: { recordingReference: key },
  });

  return { recordingId: recording.id, objectKey: key };
};
