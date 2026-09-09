export const CALL_STATUSES = [
  "QUEUED",
  "INITIATING",
  "RINGING",
  "CONNECTED",
  "AI_ACTIVE",
  "HUMAN_HANDOFF",
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
  "RETRY_SCHEDULED",
] as const;

export type CallStatus = (typeof CALL_STATUSES)[number];

export const CALL_TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  QUEUED: ["INITIATING", "CANCELLED", "FAILED"],
  INITIATING: ["RINGING", "CONNECTED", "FAILED", "CANCELLED", "BUSY", "NO_ANSWER"],
  RINGING: ["CONNECTED", "NO_ANSWER", "BUSY", "FAILED", "CANCELLED"],
  CONNECTED: ["AI_ACTIVE", "HUMAN_HANDOFF", "COMPLETED", "FAILED", "CANCELLED"],
  AI_ACTIVE: ["HUMAN_HANDOFF", "COMPLETED", "FAILED", "CANCELLED"],
  HUMAN_HANDOFF: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  NO_ANSWER: ["RETRY_SCHEDULED"],
  BUSY: ["RETRY_SCHEDULED"],
  FAILED: ["RETRY_SCHEDULED"],
  CANCELLED: [],
  RETRY_SCHEDULED: ["QUEUED", "CANCELLED"],
};

export function canTransition(from: CallStatus, to: CallStatus): boolean {
  return CALL_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CallStatus, to: CallStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid call state transition: ${from} -> ${to}`);
  }
}

export const TERMINAL_CALL_STATUSES: readonly CallStatus[] = [
  "COMPLETED",
  "CANCELLED",
];

export const RETRYABLE_CALL_STATUSES: readonly CallStatus[] = [
  "NO_ANSWER",
  "BUSY",
  "FAILED",
];

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const AGENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const CALL_OUTCOMES = [
  "INTERESTED",
  "NOT_INTERESTED",
  "CALLBACK_REQUESTED",
  "APPOINTMENT_BOOKED",
  "CONVERTED",
  "WRONG_NUMBER",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "HUMAN_HANDOFF",
  "DO_NOT_CALL",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CONTACT_CALLABILITY = [
  "callable",
  "do_not_call",
  "blocked",
  "invalid",
  "consent_required",
] as const;

export type ContactCallability = (typeof CONTACT_CALLABILITY)[number];
