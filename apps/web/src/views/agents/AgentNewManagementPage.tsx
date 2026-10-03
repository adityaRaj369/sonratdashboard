"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceState } from "@/hooks/workspace/useWorkspaceState";
import { useToast } from "@/components/ui";
import Pagination from "@/components/common/Pagination";
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import PermissionGate from "@/components/security/PermissionGate";

import { useAgentNewData } from "./hooks/useAgentNewData";
import AgentNewFilter from "./components/AgentNewFilter";
import AgentNewTable from "./components/AgentNewTable";
import AgentNewCreateDrawer from "./components/AgentNewCreateDrawer";
import AgentNewEditDrawer from "./components/AgentNewEditDrawer";
import AgentNewCloneModal from "./components/AgentNewCloneModal";
import AgentNewDeleteModal from "./components/AgentNewDeleteModal";
import type { Agent } from "@/lib/types";

const mapAgentBookmarks = (bookmarks: any[] = []) =>
  bookmarks
    .filter((b) => b?.serviceKey === "agents" || b?.serviceKey === "agent-new")
    .map((b) => ({
      ...(b?.payload || {}),
      id: b?.payload?.id || b?._id,
      _bookmarkId: b?._id,
      bookmarkedAt: b?.savedAt,
    }));

export default function AgentNewManagementPage() {
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
    queryDescription,
    setQueryDescription,
    queryStatus,
    setQueryStatus,
    queryPurpose,
    setQueryPurpose,
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
    highlightRow,
    setHighlightRow,
    sortState,
    handleSortChange,
    cloneAgent,
  } = useAgentNewData(20, notify);

  const [bookmarkedRows, setBookmarkedRows] = useState(() =>
    mapAgentBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
  );

  useEffect(() => {
    setBookmarkedRows(
      mapAgentBookmarks(Array.isArray(workspace?.bookmarks) ? workspace.bookmarks : []),
    );
  }, [workspace?.bookmarks]);

  // Clone state
  const [cloneRow, setCloneRow] = useState<Agent | null>(null);
  const [cloneError, setCloneError] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Drawer editor state
  const [editorState, setEditorState] = useState<{
    open: boolean;
    mode: "create" | "edit" | null;
    row: Agent | null;
    id?: string | null;
  }>({ open: false, mode: null, row: null, id: null });

  const canCreate = can("agents.create") || can("agents.write");
  const canEdit = can("agents.write");
  const canDelete = can("agents.write");
  const canClone = canCreate;

  // Listen for shell-level create agent events
  useEffect(() => {
    const handleOpenCreate = () => {
      if (!canCreate) return;
      setEditorState({ open: true, mode: "create", row: null, id: null });
    };
    window.addEventListener("sonrat-open-create-agent-new", handleOpenCreate);
    window.addEventListener("sonrat-open-create-agent", handleOpenCreate);
    return () => {
      window.removeEventListener("sonrat-open-create-agent-new", handleOpenCreate);
      window.removeEventListener("sonrat-open-create-agent", handleOpenCreate);
    };
  }, [canCreate]);

  const handleToggleBookmark = useCallback(
    async (row: Agent) => {
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
        active: row.status === "PUBLISHED",
        _bookmarkId: `temp-${row.id ?? Date.now()}`,
        bookmarkedAt: new Date().toISOString(),
      };

      setBookmarkedRows((prev) => [optimisticBookmark, ...prev]);

      try {
        await workspace.addBookmark?.({
          serviceKey: "agents",
          route: "/agents",
          label: row.name || "Agent",
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

  const handleCreateAction = useCallback(() => {
    if (!canCreate) return;
    setEditorState({ open: true, mode: "create", row: null, id: null });
  }, [canCreate]);

  const handleEditRow = useCallback(
    (row: Agent) => {
      if (!canEdit || !row) return;
      setEditorState({ open: true, mode: "edit", row, id: row.id });
    },
    [canEdit],
  );

  const handleCloseEditor = useCallback(
    (opts?: { refresh?: boolean; openEdit?: boolean; agentId?: string }) => {
      const { refresh: shouldRefresh, openEdit, agentId } = opts || {};
      if (openEdit && agentId) {
        const found = rows.find((r) => r.id === agentId) || null;
        setEditorState({ open: true, mode: "edit", row: found, id: agentId });
        if (shouldRefresh) refresh();
        return;
      }
      setEditorState({ open: false, mode: null, row: null, id: null });
      if (shouldRefresh) refresh();
    },
    [refresh, rows],
  );

  const openCloneModal = useCallback(
    (row: Agent) => {
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
      await cloneAgent(cloneRow);
      closeCloneModal();
      refresh();
    } catch (err: any) {
      setCloneError(err?.message || "Failed to clone agent");
    } finally {
      setCloning(false);
      setCloningId(null);
    }
  }, [cloneAgent, cloneRow, closeCloneModal, refresh]);

  const deleteBusyId = deleting && confirmDelete ? confirmDelete.id : null;

  return (
    <PermissionGate permission="agents.show_menu">
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Top Header Filter & Action Area */}
        <div className="border-b border-slate-100 px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <AgentNewFilter
                queryName={queryName}
                setQueryName={setQueryName}
                queryDescription={queryDescription}
                setQueryDescription={setQueryDescription}
                queryStatus={queryStatus}
                setQueryStatus={setQueryStatus}
                queryPurpose={queryPurpose}
                setQueryPurpose={setQueryPurpose}
                onSubmit={applyFilter}
                onRefresh={refresh}
              />
            </div>
          </div>

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
            <AgentNewTable
              rows={rows}
              loading={loading}
              bookmarks={bookmarkedRows}
              onToggleBookmark={handleToggleBookmark}
              onEdit={handleEditRow}
              onClone={openCloneModal}
              onDelete={askDelete}
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
          title="Create Agent"
          subtitle="Agents"
          description="Configure company persona, language, and primary sales goal"
          widthClass="w-[90vw] max-w-[1200px] min-w-[420px]"
        >
          <AgentNewCreateDrawer onClose={handleCloseEditor} />
        </WorkspacePanel>

        {/* Slide-over Edit Drawer */}
        <WorkspacePanel
          isOpen={editorState.open && editorState.mode === "edit"}
          onClose={() => handleCloseEditor()}
          title={editorState.row?.name ? `Edit ${editorState.row.name}` : "Edit Agent"}
          subtitle="Agents"
          description="Update persona, voice characteristics, and sales behavior"
          widthClass="w-[90vw] max-w-[1200px] min-w-[420px]"
        >
          <AgentNewEditDrawer
            agent={editorState.row}
            agentId={editorState.id}
            onClose={handleCloseEditor}
            onDelete={(ag) => {
              handleCloseEditor();
              askDelete(ag);
            }}
          />
        </WorkspacePanel>

        {/* Clone Confirmation Modal */}
        <AgentNewCloneModal
          row={cloneRow}
          cloning={cloning}
          error={cloneError}
          onConfirm={handleCloneConfirm}
          onCancel={closeCloneModal}
        />

        {/* Delete / Archive Confirmation Modal */}
        <AgentNewDeleteModal
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
