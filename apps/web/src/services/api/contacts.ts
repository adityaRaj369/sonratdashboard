import { http } from "./http";
import type { Contact, ContactImport, CursorPage } from "@/lib/types";

const BASE = "/api/v1/contacts";

export type ContactInput = {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  leadStatus?: string | null;
  notes?: string | null;
  source?: string | null;
  timezone?: string | null;
  callability?: string;
};

export const contactsApi = {
  list: (query?: {
    cursor?: string;
    limit?: number;
    search?: string;
    callability?: string;
    tag?: string;
  }) => http.get<CursorPage<Contact>>(BASE, query),
  get: (id: string) => http.get<Contact>(`${BASE}/${id}`),
  create: (body: ContactInput) =>
    http.post<Contact>(BASE, body, { idempotencyKey: crypto.randomUUID() }),
  batchCreate: (items: Array<Partial<ContactInput>>) =>
    http.post<{ items: Contact[]; count: number }>(`${BASE}/batch`, {
      contacts: items,
    }),
  update: (id: string, body: Partial<ContactInput>) =>
    http.patch<Contact>(`${BASE}/${id}`, body),
  remove: (id: string) => http.delete<void>(`${BASE}/${id}`),
  uploadImport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.upload<ContactImport>(`${BASE}/import`, form, {
      idempotencyKey: crypto.randomUUID(),
    });
  },
  getImport: (id: string) => http.get<ContactImport>(`${BASE}/import/${id}`),
  previewImport: (id: string, columnMapping: Record<string, string>) =>
    http.post<ContactImport>(`${BASE}/import/${id}/preview`, { columnMapping }),
  commitImport: (id: string) =>
    http.post<ContactImport>(`${BASE}/import/${id}/commit`, {}, {
      idempotencyKey: crypto.randomUUID(),
    }),
};
