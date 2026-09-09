"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentFlowsApi } from "@/services/api/agent-flows";

export const agentFlowKeys = {
  all: ["agent-flows"] as const,
  detail: (id: string) => ["agent-flows", id] as const,
};

export function useAgentFlows(opts?: { limit?: number }) {
  return useQuery({
    queryKey: [...agentFlowKeys.all, opts?.limit ?? 50],
    queryFn: () => agentFlowsApi.list({ limit: opts?.limit ?? 50 }),
  });
}

export function useAgentFlow(id: string | undefined) {
  return useQuery({
    queryKey: agentFlowKeys.detail(id || ""),
    queryFn: () => agentFlowsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateAgentFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentFlowsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: agentFlowKeys.all }),
  });
}

export function usePublishAgentFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentFlowsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentFlowKeys.all }),
  });
}

export function useUpdateAgentFlowGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, graph }: { id: string; graph: unknown }) =>
      agentFlowsApi.updateGraph(id, graph),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: agentFlowKeys.all });
      qc.invalidateQueries({ queryKey: agentFlowKeys.detail(vars.id) });
    },
  });
}
