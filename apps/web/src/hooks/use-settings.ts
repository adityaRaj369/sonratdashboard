"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/services/api/settings";
import type { OrganizationSettings } from "@/lib/types";

export const settingsKeys = {
  org: ["settings", "organization"] as const,
  phones: ["settings", "phone-numbers"] as const,
  members: ["settings", "members"] as const,
  environment: ["settings", "environment"] as const,
};

export function useOrganizationSettings() {
  return useQuery({
    queryKey: settingsKeys.org,
    queryFn: () => settingsApi.getOrganization(),
  });
}

export function useUpdateOrganizationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OrganizationSettings>) =>
      settingsApi.updateOrganization(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.org }),
  });
}

export function usePhoneNumbers() {
  return useQuery({
    queryKey: settingsKeys.phones,
    queryFn: () => settingsApi.listPhoneNumbers(),
  });
}

export function useCreatePhoneNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createPhoneNumber,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.phones }),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: settingsKeys.members,
    queryFn: () => settingsApi.listMembers(),
  });
}

export function useEnvironmentInfo() {
  return useQuery({
    queryKey: settingsKeys.environment,
    queryFn: () => settingsApi.getEnvironment(),
  });
}
