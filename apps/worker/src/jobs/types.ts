import type { Job } from "bullmq";
import type { AdmissionController } from "../lib/admission.js";
import type { TelephonyClient } from "../integrations/exotel.js";
import type { JobName } from "../queues.js";

export interface WorkerContext {
  telephony: TelephonyClient;
  admission: AdmissionController;
  /** Produce follow-up jobs with backpressure awareness */
  enqueue: <T>(
    name: JobName,
    data: T,
    opts?: { jobId?: string; delay?: number; priority?: number },
  ) => Promise<void>;
  voiceRuntimeUrl: string;
  apiBaseUrl: string;
}

export type JobHandler<T = unknown> = (
  job: Job<T>,
  ctx: WorkerContext,
) => Promise<unknown>;

export interface IdempotentJobData {
  organizationId: string;
  idempotencyKey?: string;
}
