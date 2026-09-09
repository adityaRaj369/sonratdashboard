import { http } from "./http";
import type {
  AgentAnalytics,
  AnalyticsOverview,
  CampaignAnalytics,
} from "@/lib/types";

const BASE = "/api/v1/analytics";

export const analyticsApi = {
  overview: () => http.get<AnalyticsOverview>(`${BASE}/overview`),
  campaign: (id: string) =>
    http.get<CampaignAnalytics>(`${BASE}/campaigns/${id}`),
  agent: (id: string) => http.get<AgentAnalytics>(`${BASE}/agents/${id}`),
};
