"use client";

/**
 * Sales outbound call history — Calls API filtered to OUTBOUND.
 * Rebuilt using the exact SEAM DataTable management architecture as Sales and Agents:
 * - Dedicated filter bar with StatusFilterDropdown and Agent filter
 * - Showing 1-X of Y count
 * - DataTable with HoverCard preview, Kebab actions menu portal, and bookmarks
 * - Full bottom Pagination component
 * - Rich 4-tab slide-over details drawer
 */
import React, { useCallback, useEffect, useState } from "react";
import { useWorkspaceState } from "@/hooks/workspace/useWorkspaceState";
import { useToast } from "@/components/ui";
import Pagination from "@/components/common/Pagination";
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import PermissionGate from "@/components/security/PermissionGate";
import { formatDate } from "@/lib/utils";
import type { Call } from "@/lib/types";

import { useOutboundCallsData } from "./hooks/useOutboundCallsData";
import OutboundCallsFilter from "./components/OutboundCallsFilter";
import OutboundCallsTable from "./components/OutboundCallsTable";
import OutboundCallDetailDrawer from "./components/OutboundCallDetailDrawer";

const mapCallBookmarks = (bookmarks: any[] = []) =>
  bookmarks
    .filter((b) => b?.serviceKey === "calls" || b?.serviceKey === "sales")
    .map((b) => ({
      ...(b?.payload || {}),
      id: b?.payload?.id || b?._id,
      _bookmarkId: b?._id,
      bookmarkedAt: b?.savedAt,
    }));

export default function SalesOutboundCallsPage() {
  const workspace = useWorkspaceState();
  const { toast } = useToast();

  const notify = useCallback(
    (type: "success" | "error" | "info", msg: string) => {
      toast({
        title: msg,
        variant: type === "error" ? "destructive" : type === "success" ? "success" : "default",
      });
    },
    [toast],
  );

  const {
    querySearch,
    setQuerySearch,
    queryStatus,
    setQueryStatus,
    queryAgentId,
    setQueryAgentId,
    page,
    setPage,
    pageSize,
    setPageSize,
    rows,
    total,
    loading,
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
  } = useOutboundCallsData(20, notify);

  const [bookmarkedRows, setBookmarkedRows] = useState(() =>
    mapCallBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
  );

  useEffect(() => {
    setBookmarkedRows(
      mapCallBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
    );
  }, [workspace?.bookmarks]);

  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const handleToggleBookmark = useCallback(
    async (row: Call) => {
      const existing = bookmarkedRows.find(
        (b) => b.id === row.id || b._bookmarkId === row.id,
      );

      if (existing?._bookmarkId) {
        setBookmarkedRows((prev) =>
          prev.filter((item) => item._bookmarkId !== existing._bookmarkId),
        );
        try {
          await workspace.removeBookmark?.(existing._bookmarkId);
        } catch {
          setBookmarkedRows((prev) => [existing, ...prev]);
        }
        return;
      }

      const optimisticBookmark = {
        id: row.id,
        key: row.contact?.name || row.toNumber || row.id,
        name: row.contact?.name || row.toNumber || "Call",
        _bookmarkId: `temp-${row.id}`,
        bookmarkedAt: new Date().toISOString(),
      };

      setBookmarkedRows((prev) => [optimisticBookmark, ...prev]);

      try {
        await workspace.addBookmark?.({
          serviceKey: "calls",
          route: "/sales/calls",
          label: row.contact?.name || row.toNumber || "Outbound Call",
          payload: {
            id: row.id,
            status: row.status,
            contactName: row.contact?.name,
            phoneNumber: row.toNumber,
          },
        });
      } catch {
        setBookmarkedRows((prev) =>
          prev.filter((item) => item._bookmarkId !== optimisticBookmark._bookmarkId),
        );
      }
    },
    [bookmarkedRows, workspace],
  );

  return (
    <PermissionGate permission="campaigns.show_menu">
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Top Header Filter Strip */}
        <div className="border-b border-slate-100 px-6 py-2">
          <OutboundCallsFilter
            querySearch={querySearch}
            setQuerySearch={setQuerySearch}
            queryStatus={queryStatus}
            setQueryStatus={setQueryStatus}
            queryAgentId={queryAgentId}
            setQueryAgentId={setQueryAgentId}
            onSubmit={applyFilter}
            onReset={resetFilter}
            onRefresh={refresh}
            isFetching={isFetching}
          />

          <div className="pb-1 pt-1 text-[12px] font-medium text-slate-500">
            {!loading && (
              <span>
                Showing <b>{startIdx}</b>–<b>{endIdx}</b> of <b>{total}</b> outbound calls
              </span>
            )}
          </div>
        </div>

        {/* Data Table & Pagination Section */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <OutboundCallsTable
              rows={rows}
              loading={loading}
              bookmarks={bookmarkedRows}
              onToggleBookmark={handleToggleBookmark}
              onSelectCall={(call) => setSelectedCall(call)}
              highlightRow={highlightRow}
              onHighlightComplete={() => setHighlightRow(null)}
              sortState={sortState}
              onSortChange={handleSortChange}
            />
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onFirst={() => setPage(0)}
            onPrev={() => setPage((prev) => Math.max(0, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            onLast={() => setPage(totalPages - 1)}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(0);
            }}
          />
        </div>

        {/* Slide-over details drawer on row click */}
        <WorkspacePanel
          isOpen={Boolean(selectedCall)}
          onClose={() => setSelectedCall(null)}
          title={
            selectedCall
              ? selectedCall.contact?.name || selectedCall.toNumber || "Outbound Call"
              : "Outbound Call Details"
          }
          subtitle="Outbound Calls"
          description={
            selectedCall?.startedAt
              ? `Dialed on ${formatDate(selectedCall.startedAt)} · Exotel Telephony Trunk`
              : "Inspect call intelligence, live audio playback, conversation transcript, and telephony logs"
          }
          widthClass="w-[90vw] max-w-[1200px] min-w-[420px]"
        >
          <OutboundCallDetailDrawer
            callId={selectedCall?.id || null}
            initialCall={selectedCall}
            onClose={() => setSelectedCall(null)}
          />
        </WorkspacePanel>
      </div>
    </PermissionGate>
  );
}
