"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contactsApi, type ContactInput } from "@/services/api/contacts";

export const contactKeys = {
  all: ["contacts"] as const,
  list: (params?: Record<string, unknown>) =>
    ["contacts", "list", params] as const,
  detail: (id: string) => ["contacts", id] as const,
  import: (id: string) => ["contacts", "import", id] as const,
};

export function useContacts(params?: {
  cursor?: string;
  limit?: number;
  search?: string;
  callability?: string;
}) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: () => contactsApi.list(params),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ContactInput) => contactsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ContactInput> }) =>
      contactsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useContactImport(id?: string) {
  return useQuery({
    queryKey: contactKeys.import(id || ""),
    queryFn: () => contactsApi.getImport(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "VALIDATING" ||
        status === "COMMITTING" ||
        status === "UPLOADED"
      ) {
        return 1500;
      }
      return false;
    },
  });
}

export function useUploadContactImport() {
  return useMutation({
    mutationFn: (file: File) => contactsApi.uploadImport(file),
  });
}

export function usePreviewContactImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnMapping: Record<string, string>) =>
      contactsApi.previewImport(id, columnMapping),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.import(id) }),
  });
}

export function useCommitContactImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => contactsApi.commitImport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.import(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}
