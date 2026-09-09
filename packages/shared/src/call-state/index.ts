import { assertTransition, type CallStatus, canTransition } from "../constants/index.js";

export interface CallStateTransitionResult {
  from: CallStatus;
  to: CallStatus;
  allowed: boolean;
}

export class CallStateMachine {
  static canTransition(from: CallStatus, to: CallStatus): boolean {
    return canTransition(from, to);
  }

  static transition(from: CallStatus, to: CallStatus): CallStateTransitionResult {
    assertTransition(from, to);
    return { from, to, allowed: true };
  }

  static isTerminal(status: CallStatus): boolean {
    return status === "COMPLETED" || status === "CANCELLED";
  }

  static isActive(status: CallStatus): boolean {
    return [
      "QUEUED",
      "INITIATING",
      "RINGING",
      "CONNECTED",
      "AI_ACTIVE",
      "HUMAN_HANDOFF",
      "RETRY_SCHEDULED",
    ].includes(status);
  }
}
