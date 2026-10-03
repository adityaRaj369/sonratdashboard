"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/services/api/campaigns";
import type { Campaign } from "@/lib/types";

export type SalesSortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export function useSalesNewData(defaultPageSize = 20, notify?: (type: "success" | "error" | "info", msg: string) => void) {
  const queryClient = useQueryClient();

  const [queryName, setQueryName] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [queryAgentId, setQueryAgentId] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    status: "",
    agentId: "",
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortState, setSortState] = useState<SalesSortState>(null);
  const [highlightRow, setHighlightRow] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryKey = useMemo(() => ["sales-new-list", appliedFilters.name], [appliedFilters.name]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      campaignsApi.list({
        search: appliedFilters.name || undefined,
        limit: 100,
      }),
    staleTime: 1000 * 30,
  });

  const allRows: Campaign[] = useMemo(() => data?.items ?? [], [data?.items]);

  const filteredRows = useMemo(() => {
    let result = allRows;

    if (appliedFilters.status) {
      result = result.filter((row) => row.status.toUpperCase() === appliedFilters.status.toUpperCase());
    }

    if (appliedFilters.agentId) {
      result = result.filter((row) => row.agentId === appliedFilters.agentId);
    }

    if (sortState) {
      const { key, direction } = sortState;
      result = [...result].sort((a, b) => {
        let aVal: any = a[key as keyof Campaign];
        let bVal: any = b[key as keyof Campaign];

        if (key === "agent") {
          aVal = a.agent?.name || "";
          bVal = b.agent?.name || "";
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
      status: queryStatus,
      agentId: queryAgentId,
    });
    setPage(0);
  }, [queryName, queryStatus, queryAgentId]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const askDelete = useCallback((campaign: Campaign) => {
    setConfirmDelete(campaign);
  }, []);

  const closeDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  const doDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await campaignsApi.remove(confirmDelete.id);
      notify?.("success", `Sale campaign "${confirmDelete.name}" archived`);
      closeDelete();
      await refetch();
    } catch (err: any) {
      notify?.("error", err?.message || "Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, closeDelete, notify, refetch]);

  const toggleStatus = useCallback(
    async (campaign: Campaign) => {
      try {
        if (campaign.status === "RUNNING") {
          await campaignsApi.pause(campaign.id);
          notify?.("info", `Campaign "${campaign.name}" paused`);
        } else {
          const preflight = await campaignsApi.preflight(campaign.id);
          if (!preflight.ready) {
            const failed = preflight.checks
              .filter((check) => !check.ready)
              .map((check) => `${check.label}: ${check.message}`)
              .join("; ");
            notify?.("error", `Campaign is not ready to start. ${failed}`);
            return;
          }
          await campaignsApi.start(campaign.id);
          notify?.("success", `Campaign "${campaign.name}" started`);
        }
        await refetch();
      } catch (err: any) {
        notify?.("error", err?.message || "Failed to update campaign status");
      }
    },
    [notify, refetch],
  );

  const cloneSale = useCallback(
    async (source: Campaign) => {
      try {
        const clone = await campaignsApi.create({
          name: `Copy of ${source.name}`,
          description: source.description || null,
          agentId: source.agentId,
          phoneNumberId: source.phoneNumberId || null,
          objective: source.objective,
          salesInstructions: source.salesInstructions || null,
          campaignInstructions: source.campaignInstructions || null,
          callingHoursStart: source.callingHoursStart || "09:00",
          callingHoursEnd: source.callingHoursEnd || "18:00",
          timezone: source.timezone || "UTC",
          maxAttempts: source.maxAttempts || 1,
          retryDelayMinutes: source.retryDelayMinutes || 60,
          concurrencyLimit: source.concurrencyLimit || 1,
          callTimeoutSeconds: source.callTimeoutSeconds || 600,
          priority: source.priority || 5,
        });

        notify?.("success", "Sale campaign cloned successfully");
        setHighlightRow(clone.id);
        await refetch();
        return clone;
      } catch (err: any) {
        notify?.("error", err?.message || "Failed to clone campaign");
        throw err;
      }
    },
    [notify, refetch],
  );

  return {
    queryName,
    setQueryName,
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
    toggleStatus,
    highlightRow,
    setHighlightRow,
    sortState,
    handleSortChange: setSortState,
    cloneSale,
  };
}
