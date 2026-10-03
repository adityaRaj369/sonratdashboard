"use client";

import { useQuery } from "@tanstack/react-query";
import { callsApi } from "@/services/api/calls";

export const callKeys = {
  all: ["calls"] as const,
  list: (params?: Record<string, unknown>) => ["calls", "list", params] as const,
  detail: (id: string) => ["calls", id] as const,
  transcript: (id: string) => ["calls", id, "transcript"] as const,
};

export function useCalls(params?: {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
  campaignId?: string;
  direction?: "INBOUND" | "OUTBOUND";
}) {
  return useQuery({
    queryKey: callKeys.list(params),
    queryFn: () => callsApi.list(params),
    refetchInterval: (query) => {
      const anyActive = query.state.data?.items?.some(
        (c: { status?: string }) =>
          c.status === "AI_ACTIVE" ||
          c.status === "RINGING" ||
          c.status === "IN_PROGRESS" ||
          c.status === "QUEUED",
      );
      return anyActive ? 2500 : false;
    },
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: callKeys.detail(id),
    queryFn: () => callsApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "AI_ACTIVE" || status === "RINGING" || status === "IN_PROGRESS" || status === "QUEUED"
        ? 2000
        : false;
    },
  });
}

export function useCallTranscript(id: string) {
  return useQuery({
    queryKey: callKeys.transcript(id),
    queryFn: () => callsApi.transcript(id),
    enabled: Boolean(id),
    refetchInterval: 2500,
  });
}

export function useCallRecording(id: string) {
  return useQuery({
    queryKey: [...callKeys.detail(id), "recording"] as const,
    queryFn: () => callsApi.recording(id),
    enabled: Boolean(id),
    retry: false,
  });
}
