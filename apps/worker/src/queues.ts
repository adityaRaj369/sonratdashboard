export const QUEUE_NAMES = {
  default: "sonrat-default",
  calls: "sonrat-calls",
  imports: "sonrat-imports",
  campaigns: "sonrat-campaigns",
  recordings: "sonrat-recordings",
  outbox: "sonrat-outbox",
  dlq: "sonrat-dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  process_contact_import: "process_contact_import",
  validate_contact_import: "validate_contact_import",
  schedule_campaign: "schedule_campaign",
  create_outbound_call: "create_outbound_call",
  retry_failed_call: "retry_failed_call",
  process_call_completion: "process_call_completion",
  generate_call_summary: "generate_call_summary",
  process_recording: "process_recording",
  calculate_campaign_metrics: "calculate_campaign_metrics",
  cleanup_expired_sessions: "cleanup_expired_sessions",
  process_outbox: "process_outbox",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "custom" as const,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export function queueForJob(jobName: JobName): QueueName {
  switch (jobName) {
    case "process_contact_import":
    case "validate_contact_import":
      return QUEUE_NAMES.imports;
    case "schedule_campaign":
    case "calculate_campaign_metrics":
      return QUEUE_NAMES.campaigns;
    case "create_outbound_call":
    case "retry_failed_call":
    case "process_call_completion":
    case "generate_call_summary":
      return QUEUE_NAMES.calls;
    case "process_recording":
      return QUEUE_NAMES.recordings;
    case "process_outbox":
      return QUEUE_NAMES.outbox;
    case "cleanup_expired_sessions":
    default:
      return QUEUE_NAMES.default;
  }
}
