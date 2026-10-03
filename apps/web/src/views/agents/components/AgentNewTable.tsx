"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Copy, EllipsisVertical, Pencil, Trash2, Bot } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import HoverCard from "@/components/common/HoverCard";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import type { AgentSortState } from "../hooks/useAgentNewData";

const rowKey = (row: Agent) => row?.id;

export type AgentNewTableProps = {
  rows?: Agent[];
  loading?: boolean;
  bookmarks?: any[];
  onToggleBookmark?: (row: Agent) => void;
  onEdit?: (row: Agent) => void;
  onClone?: (row: Agent) => void;
  onDelete?: (row: Agent) => void;
  canEdit?: boolean;
  canClone?: boolean;
  canDelete?: boolean;
  cloneBusyId?: string | null;
  deleteBusyId?: string | null;
  highlightRow?: string | null;
  onHighlightComplete?: () => void;
  sortState?: AgentSortState;
  onSortChange?: (next: AgentSortState) => void;
};

const AgentNewTable = memo(function AgentNewTable({
  rows = [],
  loading = false,
  bookmarks = [],
  onToggleBookmark,
  onEdit,
  onClone,
  onDelete,
  canEdit = true,
  canClone = true,
  canDelete = true,
  cloneBusyId,
  deleteBusyId,
  highlightRow,
  onHighlightComplete,
  sortState,
  onSortChange,
}: AgentNewTableProps) {
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoverCard, setHoverCard] = useState<{
    row: Agent;
    rect: DOMRect;
  } | null>(null);
  const [hoverPinned, setHoverPinned] = useState(false);
  const [hoverCopiedId, setHoverCopiedId] = useState<string | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const hoverCopyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
      if (hoverCopyTimer.current) window.clearTimeout(hoverCopyTimer.current);
    };
  }, []);

  const closeHoverSoon = useCallback(() => {
    if (hoverPinned) return;
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setHoverCard(null), 300);
  }, [hoverPinned]);

  const keepHoverOpen = useCallback(() => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
  }, []);

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, row: Agent) => {
      keepHoverOpen();
      const rect = event.currentTarget.getBoundingClientRect();
      setHoverPinned(false);
      setHoverCard({ row, rect });
    },
    [keepHoverOpen],
  );

  const handleHoverCopy = useCallback((value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      navigator.clipboard.writeText(value || "");
      setHoverCopiedId(value);
      if (hoverCopyTimer.current) clearTimeout(hoverCopyTimer.current);
      hoverCopyTimer.current = window.setTimeout(() => {
        setHoverCopiedId(null);
      }, 1500);
    } catch {}
  }, []);

  const isBookmarked = useCallback(
    (row: Agent) => {
      return (bookmarks || []).some(
        (b) => b?.id === row.id || b?._id === row.id || b?.key === row.name,
      );
    },
    [bookmarks],
  );

  const handleBookmarkClick = useCallback(
    (event: React.MouseEvent, row: Agent) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleBookmark?.(row);
    },
    [onToggleBookmark],
  );

  useEffect(() => {
    if (!openRowMenu) return undefined;
    const closeMenu = () => setOpenRowMenu(null);
    const handlePointerDownAway = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.('[data-agent-actions-menu="true"]') ||
        target?.closest?.('[data-agent-actions-trigger="true"]')
      ) {
        return;
      }
      closeMenu();
    };

    window.addEventListener("pointerdown", handlePointerDownAway);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownAway);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openRowMenu]);

  const activeRowForMenu = useMemo(() => {
    if (!openRowMenu) return null;
    return rows.find((r) => rowKey(r) === openRowMenu) || null;
  }, [openRowMenu, rows]);

  const columns: DataTableColumn<Agent>[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        width: "120px",
        sticky: true,
        stickyLeft: "0px",
        renderCell: (row) => (
          <StatusPill
            value={row.status === "PUBLISHED"}
            trueLabel="Live"
            falseLabel={row.status === "ARCHIVED" ? "Archived" : "Draft"}
          />
        ),
      },
      {
        key: "name",
        label: "Agent Name",
        width: "250px",
        sortable: true,
        sticky: true,
        stickyLeft: "120px",
        renderCell: (row) => (
          <div
            className="flex items-center gap-2"
            onMouseEnter={(e) => handleMouseEnter(e, row)}
            onMouseLeave={closeHoverSoon}
          >
            <button
              type="button"
              onClick={(event) => handleBookmarkClick(event, row)}
              className={`shrink-0 text-slate-400 hover:text-slate-700 ${
                isBookmarked(row) ? "text-slate-700" : ""
              } relative group/bookmark`}
            >
              <Bookmark size={14} className={isBookmarked(row) ? "fill-slate-700" : ""} />
              <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white px-2 py-1 text-[10px] font-semibold shadow-lg opacity-0 group-hover/bookmark:opacity-100 transition-opacity z-50">
                {isBookmarked(row) ? "Remove bookmark" : "Bookmark agent"}
              </span>
            </button>
            <button
              type="button"
              className={`text-[12px] font-black text-slate-900 underline decoration-slate-200 underline-offset-4 ${
                canEdit ? "hover:decoration-slate-400" : "cursor-default"
              }`}
              onClick={(event) => {
                event.preventDefault();
                if (canEdit) onEdit?.(row);
              }}
            >
              {row.name || "—"}
            </button>
          </div>
        ),
      },
      {
        key: "description",
        label: "Description",
        width: "280px",
        sticky: false,
        renderCell: (row) => (
          <span className="text-[12px] font-semibold text-slate-600 truncate block max-w-[260px]" title={row.description || undefined}>
            {row.description || "—"}
          </span>
        ),
      },
      {
        key: "purpose",
        label: "Purpose",
        width: "140px",
        sortable: true,
        renderCell: (row) => {
          const purpose = String(row.draftConfig?.purpose || "sales");
          return (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              {purpose}
            </span>
          );
        },
      },
      {
        key: "company",
        label: "Company",
        width: "180px",
        renderCell: (row) => {
          const companyName = String((row.draftConfig as any)?.company?.companyName || "—");
          return (
            <span className="text-[12px] font-semibold text-slate-600 truncate block">
              {companyName}
            </span>
          );
        },
      },
      {
        key: "language",
        label: "Default Lang",
        width: "120px",
        renderCell: (row) => {
          const lang = String((row.draftConfig as any)?.languages?.defaultLanguage || "en");
          return <span className="text-[12px] font-bold text-slate-600 uppercase">{lang}</span>;
        },
      },
      {
        key: "updatedAt",
        label: "Updated (UTC)",
        width: "180px",
        sortable: true,
        renderCell: (row) => (
          <span className="text-[12px] font-medium text-slate-600">
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [canEdit, closeHoverSoon, handleBookmarkClick, handleMouseEnter, isBookmarked, onEdit],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        sortState={sortState}
        onSortChange={onSortChange}
        rowKey={rowKey}
        highlightRow={highlightRow}
        onHighlightComplete={onHighlightComplete}
        onRowClick={onEdit}
        rowActions={(row) => {
          const key = rowKey(row);
          const menuOpen = openRowMenu === key;
          return (
            <div className="agent-row-menu relative flex items-center justify-end px-2 z-20">
              <button
                type="button"
                data-agent-actions-trigger="true"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (menuOpen) {
                    setOpenRowMenu(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  const menuWidth = 176;
                  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : menuWidth + 16;
                  const left = Math.max(8, Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 8));
                  const top = rect.bottom + 6;
                  setMenuPosition({ top, left });
                  setOpenRowMenu(key);
                }}
              >
                <EllipsisVertical size={16} />
              </button>
            </div>
          );
        }}
      />

      {/* Floating Kebab Actions Menu Portal */}
      {openRowMenu && menuPosition && activeRowForMenu && typeof document !== "undefined" &&
        createPortal(
          <div
            data-agent-actions-menu="true"
            className="fixed z-[9999] w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            {canEdit && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setOpenRowMenu(null);
                  onEdit?.(activeRowForMenu);
                }}
              >
                <Pencil size={13} className="text-slate-400" />
                Edit agent
              </button>
            )}

            {canClone && (
              <button
                type="button"
                disabled={cloneBusyId === activeRowForMenu.id}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                onClick={() => {
                  setOpenRowMenu(null);
                  onClone?.(activeRowForMenu);
                }}
              >
                <Copy size={13} className="text-slate-400" />
                {cloneBusyId === activeRowForMenu.id ? "Cloning…" : "Clone agent"}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                disabled={deleteBusyId === activeRowForMenu.id}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                onClick={() => {
                  setOpenRowMenu(null);
                  onDelete?.(activeRowForMenu);
                }}
              >
                <Trash2 size={13} className="text-rose-500" />
                {deleteBusyId === activeRowForMenu.id ? "Deleting…" : "Delete agent"}
              </button>
            )}
          </div>,
          document.body,
        )}

      {/* Hover Card Preview Portal */}
      {hoverCard && (
        <HoverCard
          open={Boolean(hoverCard)}
          anchorRect={hoverCard.rect}
          title="Agent Preview"
          subtitle={hoverCard.row.name}
          onClose={() => setHoverCard(null)}
          onMouseEnter={keepHoverOpen}
          onMouseLeave={closeHoverSoon}
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase text-[10px] text-slate-400">ID</span>
              <button
                type="button"
                onClick={() => handleHoverCopy(hoverCard.row.id)}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 hover:underline"
              >
                {hoverCopiedId === hoverCard.row.id ? "Copied!" : hoverCard.row.id.slice(0, 12) + "..."}
              </button>
            </div>
            <div>
              <span className="font-bold uppercase text-[10px] text-slate-400 block mb-0.5">Description</span>
              <p className="text-slate-600 leading-relaxed font-medium">{hoverCard.row.description || "No description provided."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Purpose</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {String(hoverCard.row.draftConfig?.purpose || "sales")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Company</span>
                <span className="font-semibold text-slate-800">
                  {String((hoverCard.row.draftConfig as any)?.company?.companyName || "—")}
                </span>
              </div>
            </div>
          </div>
        </HoverCard>
      )}
    </>
  );
});

export default AgentNewTable;
