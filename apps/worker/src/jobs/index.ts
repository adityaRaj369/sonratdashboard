import { validateContactImport } from "./validate-contact-import.js";
import { processContactImport } from "./process-contact-import.js";
import { scheduleCampaign } from "./schedule-campaign.js";
import { createOutboundCall } from "./create-outbound-call.js";
import { retryFailedCall } from "./retry-failed-call.js";
import { processCallCompletion } from "./process-call-completion.js";
import { generateCallSummary } from "./generate-call-summary.js";
import { processRecording } from "./process-recording.js";
import { calculateCampaignMetrics } from "./calculate-campaign-metrics.js";
import { cleanupExpiredSessions } from "./cleanup-expired-sessions.js";
import { processOutbox } from "./process-outbox.js";
import type { JobHandler } from "./types.js";
import { JOB_NAMES, type JobName } from "../queues.js";

export const jobHandlers: Record<JobName, JobHandler> = {
  [JOB_NAMES.process_contact_import]: processContactImport as JobHandler,
  [JOB_NAMES.validate_contact_import]: validateContactImport as JobHandler,
  [JOB_NAMES.schedule_campaign]: scheduleCampaign as JobHandler,
  [JOB_NAMES.create_outbound_call]: createOutboundCall as JobHandler,
  [JOB_NAMES.retry_failed_call]: retryFailedCall as JobHandler,
  [JOB_NAMES.process_call_completion]: processCallCompletion as JobHandler,
  [JOB_NAMES.generate_call_summary]: generateCallSummary as JobHandler,
  [JOB_NAMES.process_recording]: processRecording as JobHandler,
  [JOB_NAMES.calculate_campaign_metrics]: calculateCampaignMetrics as JobHandler,
  [JOB_NAMES.cleanup_expired_sessions]: cleanupExpiredSessions as JobHandler,
  [JOB_NAMES.process_outbox]: processOutbox as JobHandler,
};

export * from "./types.js";
