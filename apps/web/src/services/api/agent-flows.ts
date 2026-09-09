import { http } from "./http";

export type AgentFlow = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  draftGraph?: {
    nodes: Array<{
      id: string;
      type: string;
      label?: string;
      data?: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
  activeVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const agentFlowsApi = {
  list: (params?: { limit?: number; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.cursor) q.set("cursor", params.cursor);
    const qs = q.toString();
    return http.get<{ items: AgentFlow[]; nextCursor?: string | null }>(
      `/api/v1/agent-flows${qs ? `?${qs}` : ""}`,
    );
  },
  get: (id: string) => http.get<AgentFlow>(`/api/v1/agent-flows/${id}`),
  create: (body: { name: string; description?: string }) =>
    http.post<AgentFlow>("/api/v1/agent-flows", body, {
      idempotencyKey: crypto.randomUUID(),
    }),
  updateGraph: (id: string, graph: unknown) =>
    http.put<AgentFlow>(`/api/v1/agent-flows/${id}/graph`, { graph }),
  publish: (id: string) =>
    http.post<{ flow: AgentFlow; version: { id: string; versionNumber: number } }>(
      `/api/v1/agent-flows/${id}/publish`,
      {},
      { idempotencyKey: crypto.randomUUID() },
    ),
};
