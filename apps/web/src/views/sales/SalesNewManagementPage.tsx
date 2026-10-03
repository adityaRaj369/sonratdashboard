"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceState } from "@/hooks/workspace/useWorkspaceState";
import { useToast } from "@/components/ui";
import Pagination from "@/components/common/Pagination";
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import PermissionGate from "@/components/security/PermissionGate";

import { useSalesNewData } from "./hooks/useSalesNewData";
import SalesNewFilter from "./components/SalesNewFilter";
import SalesNewTable from "./components/SalesNewTable";
import SalesNewCreateDrawer from "./components/SalesNewCreateDrawer";
import SalesNewEditDrawer from "./components/SalesNewEditDrawer";
import SalesNewCloneModal from "./components/SalesNewCloneModal";
import SalesNewDeleteModal from "./components/SalesNewDeleteModal";
import type { Campaign } from "@/lib/types";

const mapSalesBookmarks = (bookmarks: any[] = []) =>
  bookmarks
    .filter((b) => b?.serviceKey === "sales" || b?.serviceKey === "campaigns")
    .map((b) => ({
      ...(b?.payload || {}),
      id: b?.payload?.id || b?._id,
      _bookmarkId: b?._id,
      bookmarkedAt: b?.savedAt,
    }));

export default function SalesNewManagementPage() {
  const { can } = useAuth();
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
    queryName,
    setQueryName,
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
    handleSortChange,
    cloneSale,
  } = useSalesNewData(20, notify);

  const [bookmarkedRows, setBookmarkedRows] = useState(() =>
    mapSalesBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
  );

  useEffect(() => {
    setBookmarkedRows(
      mapSalesBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
    );
  }, [workspace?.bookmarks]);

  // Clone state
  const [cloneRow, setCloneRow] = useState<Campaign | null>(null);
  const [cloneError, setCloneError] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Drawer editor state
  const [editorState, setEditorState] = useState<{
    open: boolean;
    mode: "create" | "edit" | null;
    row: Campaign | null;
    id?: string | null;
  }>({ open: false, mode: null, row: null, id: null });

  const canCreate = can("campaigns.create") || can("campaigns.write");
  const canEdit = can("campaigns.write");
  const canDelete = can("campaigns.write");
  const canClone = canCreate;

  // Listen for unified top-right header "Create Sale" button event
  useEffect(() => {
    const handleOpenCreate = () => {
      if (!canCreate) return;
      setEditorState({ open: true, mode: "create", row: null, id: null });
    };
    window.addEventListener("sonrat-open-create-sale", handleOpenCreate);
    return () => window.removeEventListener("sonrat-open-create-sale", handleOpenCreate);
  }, [canCreate]);

  const handleToggleBookmark = useCallback(
    async (row: Campaign) => {
      const existing = bookmarkedRows.find(
        (b) => b.id === row.id || b._bookmarkId === row.id || b.key === row.name,
      );

      if (existing?._bookmarkId) {
        setBookmarkedRows((prev) => prev.filter((item) => item._bookmarkId !== existing._bookmarkId));
        try {
          await workspace.removeBookmark?.(existing._bookmarkId);
        } catch (err) {
          setBookmarkedRows((prev) => [existing, ...prev]);
        }
        return;
      }

      const optimisticBookmark = {
        id: row.id,
        key: row.name,
        name: row.name,
        active: row.status === "RUNNING",
        _bookmarkId: `temp-${row.id ?? Date.now()}`,
        bookmarkedAt: new Date().toISOString(),
      };

      setBookmarkedRows((prev) => [optimisticBookmark, ...prev]);

      try {
        await workspace.addBookmark?.({
          serviceKey: "sales",
          route: "/sales",
          label: row.name || "Sale Campaign",
          payload: {
            id: row.id,
            key: row.name,
            name: row.name,
            status: row.status,
            description: row.description || "",
          },
        });
      } catch (err) {
        setBookmarkedRows((prev) =>
          prev.filter((item) => item._bookmarkId !== optimisticBookmark._bookmarkId),
        );
      }
    },
    [bookmarkedRows, workspace],
  );

  const handleEditRow = useCallback(
    (row: Campaign) => {
      if (!canEdit || !row) return;
      setEditorState({ open: true, mode: "edit", row, id: row.id });
    },
    [canEdit],
  );

  const handleCloseEditor = useCallback(
    (opts?: { refresh?: boolean; openEdit?: boolean; campaignId?: string }) => {
      const { refresh: shouldRefresh, openEdit, campaignId } = opts || {};
      if (openEdit && campaignId) {
        const found = rows.find((r) => r.id === campaignId) || null;
        setEditorState({ open: true, mode: "edit", row: found, id: campaignId });
        if (shouldRefresh) refresh();
        return;
      }
      setEditorState({ open: false, mode: null, row: null, id: null });
      if (shouldRefresh) refresh();
    },
    [refresh, rows],
  );

  const openCloneModal = useCallback(
    (row: Campaign) => {
      if (!row || !canClone) return;
      setCloneRow(row);
      setCloneError("");
      setCloning(false);
      setCloningId(null);
    },
    [canClone],
  );

  const closeCloneModal = useCallback(() => {
    setCloneRow(null);
    setCloneError("");
    setCloning(false);
    setCloningId(null);
  }, []);

  const handleCloneConfirm = useCallback(async () => {
    if (!cloneRow) return;
    try {
      setCloning(true);
      setCloneError("");
      setCloningId(cloneRow.id);
      await cloneSale(cloneRow);
      closeCloneModal();
      refresh();
    } catch (err: any) {
      setCloneError(err?.message || "Failed to clone campaign");
    } finally {
      setCloning(false);
      setCloningId(null);
    }
  }, [cloneSale, cloneRow, closeCloneModal, refresh]);

  const deleteBusyId = deleting && confirmDelete ? confirmDelete.id : null;

  return (
    <PermissionGate permission="campaigns.show_menu">
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Top Header Filter Strip - No duplicate inline create button */}
        <div className="border-b border-slate-100 px-6 py-2">
          <SalesNewFilter
            queryName={queryName}
            setQueryName={setQueryName}
            queryStatus={queryStatus}
            setQueryStatus={setQueryStatus}
            queryAgentId={queryAgentId}
            setQueryAgentId={setQueryAgentId}
            onSubmit={applyFilter}
            onRefresh={refresh}
          />

          <div className="pb-1 pt-1 text-[12px] font-medium text-slate-500">
            {!loading && (
              <span>
                Showing <b>{startIdx}</b>–<b>{endIdx}</b> of <b>{total}</b>
              </span>
            )}
          </div>
        </div>

        {/* Data Table & Pagination Section */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <SalesNewTable
              rows={rows}
              loading={loading}
              bookmarks={bookmarkedRows}
              onToggleBookmark={handleToggleBookmark}
              onEdit={handleEditRow}
              onClone={openCloneModal}
              onDelete={askDelete}
              onToggleStatus={toggleStatus}
              canClone={canClone}
              canDelete={canDelete}
              canEdit={canEdit}
              cloneBusyId={cloningId}
              deleteBusyId={deleteBusyId}
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

        {/* Slide-over Create Drawer */}
        <WorkspacePanel
          isOpen={editorState.open && editorState.mode === "create"}
          onClose={() => handleCloseEditor()}
          title="Create Sale Campaign"
          subtitle="Sales"
          description="Configure the outbound dialer, assigned AI agent, and target sales objective"
          widthClass="w-[90vw] max-w-[1200px] min-w-[420px]"
        >
          <SalesNewCreateDrawer onClose={handleCloseEditor} />
        </WorkspacePanel>

        {/* Slide-over Edit Drawer */}
        <WorkspacePanel
          isOpen={editorState.open && editorState.mode === "edit"}
          onClose={() => handleCloseEditor()}
          title={editorState.row?.name ? `Edit ${editorState.row.name}` : "Edit Sale Campaign"}
          subtitle="Sales"
          description="Modify dialing window, assigned agent, objection rules, and launch controls"
          widthClass="w-[90vw] max-w-[1200px] min-w-[420px]"
        >
          <SalesNewEditDrawer
            campaign={editorState.row}
            campaignId={editorState.id}
            onClose={handleCloseEditor}
          />
        </WorkspacePanel>

        {/* Clone Confirmation Modal */}
        <SalesNewCloneModal
          row={cloneRow}
          cloning={cloning}
          error={cloneError}
          onConfirm={handleCloneConfirm}
          onCancel={closeCloneModal}
        />

        {/* Delete / Archive Confirmation Modal */}
        <SalesNewDeleteModal
          row={confirmDelete}
          deleting={deleting}
          error=""
          onConfirm={doDelete}
          onCancel={closeDelete}
        />
      </div>
    </PermissionGate>
  );
}
