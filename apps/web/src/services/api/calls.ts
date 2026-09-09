import { http } from "./http";
import type { Call, CursorPage, TranscriptTurn } from "@/lib/types";

const BASE = "/api/v1/calls";

export type CallOutcomeDetail = {
  outcome: string;
  summary?: string | null;
  intent?: string | null;
  sentiment?: string | null;
  leadStatus?: string | null;
  interestLevel?: string | null;
  nextAction?: string | null;
  callbackRequired?: boolean;
  appointmentRequired?: boolean;
  humanHandoff?: boolean;
  productsDiscussed?: string[];
  objections?: string[];
  customerQuestions?: string[];
  language?: string | null;
};

export type CallDetail = Call & {
  outcomeDetail?: CallOutcomeDetail | null;
};

export const callsApi = {
  list: (query?: {
    cursor?: string;
    limit?: number;
    search?: string;
    status?: string;
    campaignId?: string;
    agentId?: string;
    direction?: "INBOUND" | "OUTBOUND";
  }) => http.get<CursorPage<Call>>(BASE, query),
  get: (id: string) => http.get<CallDetail>(`${BASE}/${id}`),
  events: (id: string) =>
    http.get<{ items: NonNullable<Call["events"]> }>(`${BASE}/${id}/events`),
  transcript: (id: string) =>
    http.get<{ turns: TranscriptTurn[] }>(`${BASE}/${id}/transcript`),
  recording: (id: string) =>
    http.get<{
      id: string;
      callId: string;
      contentType: string;
      durationSeconds?: number | null;
      streamPath: string;
    }>(`${BASE}/${id}/recording`),
};
