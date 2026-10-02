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
  create: (body: {
    name: string;
    description?: string;
    purpose?: "sales" | "support" | "whatsapp" | "hybrid";
    companyName?: string;
    primaryObjective?: string;
    defaultLanguage?: string;
  }) => {
    return http.post<Agent>(
      BASE,
      {
        name: body.name.trim(),
        ...(body.description?.trim() ? { description: body.description.trim() } : {}),
        purpose: body.purpose ?? "sales",
      },
      { idempotencyKey: crypto.randomUUID() },
    );
  },
  update: (id: string, body: { name?: string; description?: string }) =>
    http.patch<Agent>(`${BASE}/${id}`, body),
  updateSection: (id: string, section: AgentSection, data: unknown) =>
    http.patch<Agent>(`${BASE}/${id}/sections/${section}`, { data }),
  uploadKnowledgeDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.upload<{
      document: {
        id: string;
        fileName: string;
        objectKey: string;
        contentType: string;
        extractedText: string;
        uploadedAt: string;
      };
      knowledge: unknown;
    }>(`${BASE}/${id}/knowledge/documents`, form);
  },
  removeKnowledgeDocument: (id: string, documentId: string) =>
    http.delete<{ knowledge: unknown }>(
      `${BASE}/${id}/knowledge/documents/${documentId}`,
    ),
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
