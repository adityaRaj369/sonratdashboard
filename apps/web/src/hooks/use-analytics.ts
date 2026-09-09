"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/services/api/analytics";

export const analyticsKeys = {
  overview: ["analytics", "overview"] as const,
  campaign: (id: string) => ["analytics", "campaign", id] as const,
  agent: (id: string) => ["analytics", "agent", id] as const,
};

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: () => analyticsApi.overview(),
  });
}

export function useCampaignAnalytics(id: string) {
  return useQuery({
    queryKey: analyticsKeys.campaign(id),
    queryFn: () => analyticsApi.campaign(id),
    enabled: Boolean(id),
  });
}

export function useAgentAnalytics(id: string) {
  return useQuery({
    queryKey: analyticsKeys.agent(id),
    queryFn: () => analyticsApi.agent(id),
    enabled: Boolean(id),
  });
}
