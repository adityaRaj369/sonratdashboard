import { http } from "./http";
import type { OrgMember, OrganizationSettings, PhoneNumber } from "@/lib/types";

export type EnvironmentInfo = {
  nodeEnv: string;
  demoMode: boolean;
  aiProvider: string;
  telephonyProvider: string;
  mockAi: boolean;
  mockTelephony: boolean;
  publicAppUrl: string;
  apiBaseUrl: string;
};

export const settingsApi = {
  getOrganization: () =>
    http.get<OrganizationSettings>("/api/v1/settings/organization"),
  updateOrganization: (body: Partial<OrganizationSettings>) =>
    http.patch<OrganizationSettings>("/api/v1/settings/organization", body),
  listPhoneNumbers: () =>
    http.get<{ items: PhoneNumber[] }>("/api/v1/phone-numbers"),
  createPhoneNumber: (body: {
    phoneNumber: string;
    label?: string;
    agentId?: string | null;
  }) =>
    http.post<PhoneNumber>("/api/v1/phone-numbers", body, {
      idempotencyKey: crypto.randomUUID(),
    }),
  updatePhoneNumber: (
    id: string,
    body: {
      phoneNumber?: string;
      label?: string | null;
      agentId?: string | null;
      isActive?: boolean;
    },
  ) => http.patch<PhoneNumber>(`/api/v1/phone-numbers/${id}`, body),
  listMembers: () =>
    http.get<{ items: OrgMember[] }>("/api/v1/settings/members"),
  getEnvironment: () =>
    http.get<EnvironmentInfo>("/api/v1/settings/environment"),
};
