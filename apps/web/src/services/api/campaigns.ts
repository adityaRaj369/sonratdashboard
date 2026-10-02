import { http } from "./http";
import type { Call, Campaign, Contact, CursorPage } from "@/lib/types";

const BASE = "/api/v1/campaigns";

export type CreateCampaignInput = {
  name: string;
  description?: string | null;
  agentId: string;
  phoneNumberId?: string | null;
  objective: string;
  salesInstructions?: string | null;
  campaignInstructions?: string | null;
  callingHoursStart?: string;
  callingHoursEnd?: string;
  timezone?: string;
  maxAttempts?: number;
  retryDelayMinutes?: number;
  concurrencyLimit?: number;
  callTimeoutSeconds?: number;
  callbackBehavior?: string | null;
  priority?: number;
  startAt?: string | null;
  endAt?: string | null;
  contactIds?: string[];
};

export const campaignsApi = {
  list: (query?: { cursor?: string; limit?: number; search?: string; status?: string }) =>
    http.get<CursorPage<Campaign>>(BASE, query),
  get: (id: string) => http.get<Campaign>(`${BASE}/${id}`),
  preflight: (id: string) =>
    http.get<{ ready: boolean; checks: Array<{ id: string; label: string; ready: boolean; message: string }> }>(
      `${BASE}/${id}/preflight`,
    ),
  create: (body: CreateCampaignInput) =>
    http.post<Campaign>(BASE, body, { idempotencyKey: crypto.randomUUID() }),
  update: (id: string, body: Partial<CreateCampaignInput>) =>
    http.patch<Campaign>(`${BASE}/${id}`, body),
  start: (id: string) =>
    http.post<Campaign>(`${BASE}/${id}/start`, undefined, {
      idempotencyKey: crypto.randomUUID(),
    }),
  pause: (id: string) => http.post<Campaign>(`${BASE}/${id}/pause`),
  cancel: (id: string) => http.post<Campaign>(`${BASE}/${id}/cancel`),
  contacts: (id: string, query?: { cursor?: string; limit?: number }) =>
    http.get<CursorPage<Contact & { attemptCount?: number; status?: string }>>(
      `${BASE}/${id}/contacts`,
      query,
    ),
  addContacts: (id: string, contactIds: string[]) =>
    http.post<{ added: number }>(`${BASE}/${id}/contacts`, { contactIds }),
  calls: (id: string, query?: { cursor?: string; limit?: number }) =>
    http.get<CursorPage<Call>>(`${BASE}/${id}/calls`, query),
};
