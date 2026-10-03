"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Copy, EllipsisVertical, Pencil, Trash2, Bot, Play, Pause, PhoneCall } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import HoverCard from "@/components/common/HoverCard";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import type { Campaign } from "@/lib/types";
import type { SalesSortState } from "../hooks/useSalesNewData";

const rowKey = (row: Campaign) => row?.id;

export type SalesNewTableProps = {
  rows?: Campaign[];
  loading?: boolean;
  bookmarks?: any[];
  onToggleBookmark?: (row: Campaign) => void;
  onEdit?: (row: Campaign) => void;
  onClone?: (row: Campaign) => void;
  onDelete?: (row: Campaign) => void;
  onToggleStatus?: (row: Campaign) => void;
  canEdit?: boolean;
  canClone?: boolean;
  canDelete?: boolean;
  cloneBusyId?: string | null;
  deleteBusyId?: string | null;
  highlightRow?: string | null;
  onHighlightComplete?: () => void;
  sortState?: SalesSortState;
  onSortChange?: (next: SalesSortState) => void;
};

const SalesNewTable = memo(function SalesNewTable({
  rows = [],
  loading = false,
  bookmarks = [],
  onToggleBookmark,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  canEdit = true,
  canClone = true,
  canDelete = true,
  cloneBusyId,
  deleteBusyId,
  highlightRow,
  onHighlightComplete,
  sortState,
  onSortChange,
}: SalesNewTableProps) {
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoverCard, setHoverCard] = useState<{
    row: Campaign;
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
    (event: React.MouseEvent<HTMLDivElement>, row: Campaign) => {
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
    (row: Campaign) => {
      return (bookmarks || []).some(
        (b) => b?.id === row.id || b?._id === row.id || b?.key === row.name,
      );
    },
    [bookmarks],
  );

  const handleBookmarkClick = useCallback(
    (event: React.MouseEvent, row: Campaign) => {
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
        target?.closest?.('[data-sales-actions-menu="true"]') ||
        target?.closest?.('[data-sales-actions-trigger="true"]')
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

  const columns: DataTableColumn<Campaign>[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        width: "120px",
        sticky: true,
        stickyLeft: "0px",
        renderCell: (row) => {
          const isRunning = row.status === "RUNNING";
          const label = isRunning
            ? "Running"
            : row.status === "PAUSED"
              ? "Paused"
              : row.status === "COMPLETED"
                ? "Done"
                : row.status === "CANCELLED"
                  ? "Cancelled"
                  : "Draft";
          return <StatusPill value={isRunning} trueLabel="Running" falseLabel={label} />;
        },
      },
      {
        key: "name",
        label: "Sale Campaign",
        width: "260px",
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
                {isBookmarked(row) ? "Remove bookmark" : "Bookmark sale"}
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
        key: "agent",
        label: "Assigned Agent",
        width: "190px",
        sortable: true,
        renderCell: (row) => (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <span className="text-[12px] font-semibold text-slate-800 truncate">
              {row.agent?.name || "Unassigned"}
            </span>
          </div>
        ),
      },
      {
        key: "objective",
        label: "Sales Objective",
        width: "260px",
        renderCell: (row) => (
          <span
            className="text-[12px] font-medium text-slate-600 truncate block max-w-[240px]"
            title={row.objective || undefined}
          >
            {row.objective || "—"}
          </span>
        ),
      },
      {
        key: "callingHours",
        label: "Calling Hours",
        width: "170px",
        renderCell: (row) => (
          <span className="text-[12px] font-semibold text-slate-600">
            {row.callingHoursStart || "09:00"}–{row.callingHoursEnd || "18:00"} ({row.timezone || "UTC"})
          </span>
        ),
      },
      {
        key: "rules",
        label: "Concurrency",
        width: "130px",
        renderCell: (row) => (
          <span className="text-[12px] font-semibold text-slate-700">
            {row.concurrencyLimit || 1} lines (P{row.priority ?? 5})
          </span>
        ),
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
            <div className="sales-row-menu relative flex items-center justify-end px-2 z-20">
              <button
                type="button"
                data-sales-actions-trigger="true"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (menuOpen) {
                    setOpenRowMenu(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  const menuWidth = 180;
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
            data-sales-actions-menu="true"
            className="fixed z-[9999] w-48 rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-100"
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
                Edit campaign
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setOpenRowMenu(null);
                  onToggleStatus?.(activeRowForMenu);
                }}
              >
                {activeRowForMenu.status === "RUNNING" ? (
                  <>
                    <Pause size={13} className="text-amber-500" />
                    Pause dialing
                  </>
                ) : (
                  <>
                    <Play size={13} className="text-emerald-500" />
                    Start dialing
                  </>
                )}
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
                {cloneBusyId === activeRowForMenu.id ? "Cloning…" : "Clone campaign"}
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
                {deleteBusyId === activeRowForMenu.id ? "Archiving…" : "Archive campaign"}
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
          title="Campaign Preview"
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
              <span className="font-bold uppercase text-[10px] text-slate-400 block mb-0.5">Objective</span>
              <p className="text-slate-600 leading-relaxed font-medium">
                {hoverCard.row.objective || "No objective set."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Agent</span>
                <span className="font-semibold text-slate-800">
                  {hoverCard.row.agent?.name || "Unassigned"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Calling Hours</span>
                <span className="font-semibold text-slate-800">
                  {hoverCard.row.callingHoursStart || "09:00"}–{hoverCard.row.callingHoursEnd || "18:00"}
                </span>
              </div>
            </div>
          </div>
        </HoverCard>
      )}
    </>
  );
});

export default SalesNewTable;
