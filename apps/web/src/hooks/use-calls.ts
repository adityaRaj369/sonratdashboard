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
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: callKeys.detail(id),
    queryFn: () => callsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCallTranscript(id: string) {
  return useQuery({
    queryKey: callKeys.transcript(id),
    queryFn: () => callsApi.transcript(id),
    enabled: Boolean(id),
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
