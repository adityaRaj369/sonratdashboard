"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  campaignsApi,
  type CreateCampaignInput,
} from "@/services/api/campaigns";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (params?: Record<string, unknown>) =>
    ["campaigns", "list", params] as const,
  detail: (id: string) => ["campaigns", id] as const,
  contacts: (id: string, params?: Record<string, unknown>) =>
    ["campaigns", id, "contacts", params] as const,
  calls: (id: string, params?: Record<string, unknown>) =>
    ["campaigns", id, "calls", params] as const,
};

export function useCampaigns(params?: {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignsApi.list(params),
    refetchInterval: (query) => {
      const anyRunning = query.state.data?.items?.some(
        (c: { status?: string }) => c.status === "RUNNING",
      );
      return anyRunning ? 3000 : false;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignsApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? 2500 : false,
  });
}

export function useCampaignPreflight(id: string) {
  return useQuery({
    queryKey: ["campaigns", id, "preflight"],
    queryFn: () => campaignsApi.preflight(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCampaignContacts(
  id: string,
  params?: { cursor?: string; limit?: number },
) {
  return useQuery({
    queryKey: campaignKeys.contacts(id, params),
    queryFn: () => campaignsApi.contacts(id, params),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });
}

export function useCampaignCalls(
  id: string,
  params?: { cursor?: string; limit?: number },
) {
  return useQuery({
    queryKey: campaignKeys.calls(id, params),
    queryFn: () => campaignsApi.calls(id, params),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignInput) => campaignsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useCampaignActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
    qc.invalidateQueries({ queryKey: campaignKeys.all });
  };
  return {
    start: useMutation({
      mutationFn: () => campaignsApi.start(id),
      onSuccess: invalidate,
    }),
    pause: useMutation({
      mutationFn: () => campaignsApi.pause(id),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: () => campaignsApi.cancel(id),
      onSuccess: invalidate,
    }),
  };
}
