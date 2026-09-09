import { http } from "./http";
import type {
  Agent,
  AgentVersion,
  CursorPage,
  ValidationReport,
} from "@/lib/types";

const BASE = "/api/v1/agents";

export type AgentSection =
  | "general"
  | "company"
  | "products"
  | "knowledge"
  | "personality"
  | "voice"
  | "languages"
  | "sales"
  | "support"
  | "safety"
  | "callBehavior"
  | "tools";

export const agentsApi = {
  list: (query?: { cursor?: string; limit?: number; search?: string }) =>
    http.get<CursorPage<Agent>>(BASE, query),
  get: (id: string) => http.get<Agent>(`${BASE}/${id}`),
  create: (body: { name: string; description?: string }) =>
    http.post<Agent>(BASE, body, { idempotencyKey: crypto.randomUUID() }),
  update: (id: string, body: { name?: string; description?: string }) =>
    http.patch<Agent>(`${BASE}/${id}`, body),
  updateSection: (id: string, section: AgentSection, data: unknown) =>
    http.patch<Agent>(`${BASE}/${id}/sections/${section}`, { data }),
  validate: (id: string) =>
    http.post<ValidationReport>(`${BASE}/${id}/validate`),
  publish: (id: string) =>
    http.post<Agent>(`${BASE}/${id}/publish`, undefined, {
      idempotencyKey: crypto.randomUUID(),
    }),
  versions: async (id: string) => {
    const res = await http.get<{ items: AgentVersion[] } | AgentVersion[]>(
      `${BASE}/${id}/versions`,
    );
    return Array.isArray(res) ? res : res.items;
  },
  test: (
    id: string,
    body: { message: string; language?: string; customerName?: string },
  ) =>
    http.post<{
      reply: string;
      language?: string;
      tools?: Array<{ name: string; result?: unknown }>;
      versionNumber?: number;
      preview?: {
        systemPromptLength: number;
        voiceId: string;
        languages: string[];
        tools: string[];
      };
    }>(`${BASE}/${id}/test`, body),
};
