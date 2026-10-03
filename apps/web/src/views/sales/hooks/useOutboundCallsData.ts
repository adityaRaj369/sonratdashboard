"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCalls, callKeys } from "@/hooks/use-calls";
import type { Call } from "@/lib/types";

export type OutboundCallSortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export function useOutboundCallsData(
  defaultPageSize = 20,
  notify?: (type: "success" | "error" | "info", msg: string) => void,
) {
  const queryClient = useQueryClient();

  const [querySearch, setQuerySearch] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [queryAgentId, setQueryAgentId] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    agentId: "",
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortState, setSortState] = useState<OutboundCallSortState>({
    key: "startedAt",
    direction: "desc",
  });
  const [highlightRow, setHighlightRow] = useState<string | null>(null);

  // Fetch outbound calls from the API
  const { data, isLoading, isFetching, refetch } = useCalls({
    direction: "OUTBOUND",
    limit: 250,
  });

  const allRows: Call[] = useMemo(() => data?.items ?? [], [data?.items]);

  const filteredRows = useMemo(() => {
    let result = allRows;

    // Filter by search query (name, phone, agent, ID)
    if (appliedFilters.search.trim()) {
      const q = appliedFilters.search.toLowerCase().trim();
      result = result.filter((row) => {
        const nameMatch = row.contact?.name?.toLowerCase().includes(q);
        const phoneMatch =
          row.toNumber?.includes(q) ||
          row.fromNumber?.includes(q) ||
          row.contact?.rawPhone?.includes(q) ||
          row.contact?.normalizedPhone?.includes(q);
        const agentMatch = row.agent?.name?.toLowerCase().includes(q);
        const idMatch = row.id.toLowerCase().includes(q);
        const outcomeMatch = (row.outcome || row.outcomeDetail?.outcome || "")
          .toLowerCase()
          .includes(q);

        return nameMatch || phoneMatch || agentMatch || idMatch || outcomeMatch;
      });
    }

    // Filter by status
    if (appliedFilters.status) {
      result = result.filter(
        (row) => row.status?.toUpperCase() === appliedFilters.status.toUpperCase(),
      );
    }

    // Filter by agent
    if (appliedFilters.agentId) {
      result = result.filter((row) => row.agentId === appliedFilters.agentId);
    }

    // Sort
    if (sortState) {
      const { key, direction } = sortState;
      result = [...result].sort((a, b) => {
        let aVal: any = a[key as keyof Call];
        let bVal: any = b[key as keyof Call];

        if (key === "contact") {
          aVal = a.contact?.name || a.toNumber || "";
          bVal = b.contact?.name || b.toNumber || "";
        } else if (key === "agent") {
          aVal = a.agent?.name || "";
          bVal = b.agent?.name || "";
        } else if (key === "duration") {
          aVal = a.durationSeconds || 0;
          bVal = b.durationSeconds || 0;
        } else if (key === "startedAt") {
          aVal = new Date(a.startedAt || a.createdAt).getTime();
          bVal = new Date(b.startedAt || b.createdAt).getTime();
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
      search: querySearch.trim(),
      status: queryStatus,
      agentId: queryAgentId,
    });
    setPage(0);
  }, [querySearch, queryStatus, queryAgentId]);

  const resetFilter = useCallback(() => {
    setQuerySearch("");
    setQueryStatus("");
    setQueryAgentId("");
    setAppliedFilters({
      search: "",
      status: "",
      agentId: "",
    });
    setPage(0);
  }, []);

  const handleSortChange = useCallback((next: OutboundCallSortState) => {
    setSortState(next);
  }, []);

  const refresh = useCallback(() => {
    void refetch();
    notify?.("info", "Refreshed outbound call logs");
  }, [refetch, notify]);

  return {
    querySearch,
    setQuerySearch,
    queryStatus,
    setQueryStatus,
    queryAgentId,
    setQueryAgentId,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    rows: paginatedRows,
    total,
    loading: isLoading,
    isFetching,
    totalPages,
    startIdx,
    endIdx,
    applyFilter,
    resetFilter,
    refresh,
    highlightRow,
    setHighlightRow,
    sortState,
    handleSortChange,
  };
}
