"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, type AgentSection } from "@/services/api/agents";
import type { Agent } from "@/lib/types";

export type AgentSortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export function useAgentNewData(defaultPageSize = 20, notify?: (type: "success" | "error" | "info", msg: string) => void) {
  const queryClient = useQueryClient();

  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [queryPurpose, setQueryPurpose] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    description: "",
    status: "",
    purpose: "",
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortState, setSortState] = useState<AgentSortState>(null);
  const [highlightRow, setHighlightRow] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryKey = useMemo(() => ["agent-new-list", appliedFilters.name], [appliedFilters.name]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      agentsApi.list({
        search: appliedFilters.name || undefined,
        limit: 100,
      }),
    staleTime: 1000 * 30,
  });

  const allRows: Agent[] = useMemo(() => data?.items ?? [], [data?.items]);

  // Client-side filtering for extra filter criteria
  const filteredRows = useMemo(() => {
    let result = allRows;

    if (appliedFilters.description) {
      const q = appliedFilters.description.toLowerCase();
      result = result.filter((row) => (row.description || "").toLowerCase().includes(q));
    }

    if (appliedFilters.status) {
      result = result.filter((row) => row.status === appliedFilters.status);
    }

    if (appliedFilters.purpose) {
      result = result.filter((row) => {
        const purpose = String(row.draftConfig?.purpose || "sales").toLowerCase();
        return purpose === appliedFilters.purpose.toLowerCase();
      });
    }

    if (sortState) {
      const { key, direction } = sortState;
      result = [...result].sort((a, b) => {
        let aVal: any = a[key as keyof Agent];
        let bVal: any = b[key as keyof Agent];

        if (key === "purpose") {
          aVal = String(a.draftConfig?.purpose || "sales");
          bVal = String(b.draftConfig?.purpose || "sales");
        } else if (key === "company") {
          aVal = String((a.draftConfig as any)?.company?.companyName || "");
          bVal = String((b.draftConfig as any)?.company?.companyName || "");
        }

        if (aVal == null) return direction === "asc" ? 1 : -1;
        if (bVal == null) return direction === "asc" ? -1 : 1;

        if (typeof aVal === "string") {
          return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return direction === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
      });
    }

    return result;
  }, [allRows, appliedFilters, sortState]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const startIdx = total === 0 ? 0 : currentPage * pageSize + 1;
  const endIdx = Math.min(total, (currentPage + 1) * pageSize);

  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const applyFilter = useCallback(() => {
    setAppliedFilters({
      name: queryName.trim(),
      description: queryDescription.trim(),
      status: queryStatus,
      purpose: queryPurpose,
    });
    setPage(0);
  }, [queryName, queryDescription, queryStatus, queryPurpose]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const askDelete = useCallback((agent: Agent) => {
    setConfirmDelete(agent);
  }, []);

  const closeDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  const doDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await agentsApi.remove(confirmDelete.id);
      notify?.("success", `Agent "${confirmDelete.name}" deleted`);
      closeDelete();
      await refetch();
    } catch (err: any) {
      notify?.("error", err?.message || "Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, closeDelete, notify, refetch]);

  const cloneAgent = useCallback(
    async (source: Agent) => {
      try {
        const clone = await agentsApi.create({
          name: `Copy of ${source.name}`,
          description: source.description || undefined,
          purpose: "sales",
        });

        const sections: AgentSection[] = [
          "company",
          "products",
          "knowledge",
          "personality",
          "voice",
          "languages",
          "sales",
          "support",
          "safety",
          "callBehavior",
          "tools",
        ];

        const draft = source.draftConfig || {};
        await Promise.all(
          sections.map(async (sec) => {
            if ((draft as any)[sec]) {
              try {
                await agentsApi.updateSection(clone.id, sec, (draft as any)[sec]);
              } catch {}
            }
          }),
        );

        notify?.("success", "Agent cloned successfully");
        setHighlightRow(clone.id);
        await refetch();
        return clone;
      } catch (err: any) {
        notify?.("error", err?.message || "Failed to clone agent");
        throw err;
      }
    },
    [notify, refetch],
  );

  return {
    queryName,
    setQueryName,
    queryDescription,
    setQueryDescription,
    queryStatus,
    setQueryStatus,
    queryPurpose,
    setQueryPurpose,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    rows: paginatedRows,
    total,
    loading: isLoading || isFetching,
    totalPages,
    startIdx,
    endIdx,
    applyFilter,
    refresh,
    confirmDelete,
    deleting,
    askDelete,
    closeDelete,
    doDelete,
    highlightRow,
    setHighlightRow,
    sortState,
    handleSortChange: setSortState,
    cloneAgent,
  };
}
