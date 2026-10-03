"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, type AgentSection } from "@/services/api/agents";

export const agentKeys = {
  all: ["agents"] as const,
  list: (params?: Record<string, unknown>) => ["agents", "list", params] as const,
  detail: (id: string) => ["agents", id] as const,
  versions: (id: string) => ["agents", id, "versions"] as const,
};

export function useAgents(params?: { cursor?: string; limit?: number; search?: string }) {
  return useQuery({
    queryKey: agentKeys.list(params),
    queryFn: () => agentsApi.list(params),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => agentsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useAgentVersions(id: string) {
  return useQuery({
    queryKey: agentKeys.versions(id),
    queryFn: () => agentsApi.versions(id),
    enabled: Boolean(id),
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useUpdateAgentSection(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, data }: { section: AgentSection; data: unknown }) =>
      agentsApi.updateSection(agentId, section, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
      qc.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useValidateAgent(agentId: string) {
  return useMutation({
    mutationFn: () => agentsApi.validate(agentId),
  });
}

export function usePublishAgent(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsApi.publish(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
      qc.invalidateQueries({ queryKey: agentKeys.versions(agentId) });
      qc.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

export function useTestAgent(agentId: string) {
  return useMutation({
    mutationFn: (body: { message: string; language?: string }) =>
      agentsApi.test(agentId, body),
  });
}
