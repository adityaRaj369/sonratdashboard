"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  Bot,
  Copy,
  EllipsisVertical,
  Phone,
  PhoneCall,
  Clock,
  TrendingUp,
  FileText,
  Volume2,
  ExternalLink,
} from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import HoverCard from "@/components/common/HoverCard";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate, formatDuration } from "@/lib/utils";
import type { Call } from "@/lib/types";
import type { OutboundCallSortState } from "../hooks/useOutboundCallsData";

const rowKey = (row: Call) => row?.id;

export type OutboundCallsTableProps = {
  rows?: Call[];
  loading?: boolean;
  bookmarks?: any[];
  onToggleBookmark?: (row: Call) => void;
  onSelectCall?: (row: Call) => void;
  highlightRow?: string | null;
  onHighlightComplete?: () => void;
  sortState?: OutboundCallSortState;
  onSortChange?: (next: OutboundCallSortState) => void;
};

const OutboundCallsTable = memo(function OutboundCallsTable({
  rows = [],
  loading = false,
  bookmarks = [],
  onToggleBookmark,
  onSelectCall,
  highlightRow,
  onHighlightComplete,
  sortState,
  onSortChange,
}: OutboundCallsTableProps) {
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoverCard, setHoverCard] = useState<{
    row: Call;
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
    (event: React.MouseEvent<HTMLDivElement>, row: Call) => {
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
    (row: Call) => {
      return (bookmarks || []).some(
        (b) =>
          b?.id === row.id ||
          b?._id === row.id ||
          b?.key === row.contact?.name ||
          b?.key === row.toNumber,
      );
    },
    [bookmarks],
  );

  const handleBookmarkClick = useCallback(
    (event: React.MouseEvent, row: Call) => {
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
        target?.closest?.('[data-call-actions-menu="true"]') ||
        target?.closest?.('[data-call-actions-trigger="true"]')
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

  const columns: DataTableColumn<Call>[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        width: "120px",
        sticky: true,
        stickyLeft: "0px",
        renderCell: (row) => {
          const isCompleted = row.status === "COMPLETED";
          const isActive = row.status === "AI_ACTIVE" || row.status === "IN_PROGRESS";
          const isRinging = row.status === "RINGING";
          const isFailed =
            row.status === "FAILED" ||
            row.status === "NO_ANSWER" ||
            row.status === "BUSY";

          if (isCompleted) {
            return (
              <StatusPill
                value={true}
                trueLabel="Completed"
                className="scale-95 origin-left"
              />
            );
          }
          if (isActive) {
            return (
              <span className="inline-grid h-6 w-[88px] grid-cols-[15px_1fr] items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100 pl-1.5 pr-1.5 text-[11px] font-semibold leading-none shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-pulse">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="block text-center">Active</span>
              </span>
            );
          }
          if (isRinging) {
            return (
              <span className="inline-grid h-6 w-[88px] grid-cols-[15px_1fr] items-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100 pl-1.5 pr-1.5 text-[11px] font-semibold leading-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-white">
                  <PhoneCall size={8} />
                </span>
                <span className="block text-center">Ringing</span>
              </span>
            );
          }
          if (isFailed) {
            const label =
              row.status === "NO_ANSWER"
                ? "No Ans"
                : row.status === "BUSY"
                  ? "Busy"
                  : "Failed";
            return (
              <StatusPill
                value={false}
                falseLabel={label}
                className="scale-95 origin-left"
              />
            );
          }
          return (
            <span className="inline-grid h-6 w-[88px] grid-cols-[15px_1fr] items-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-100 pl-1.5 pr-1.5 text-[11px] font-semibold leading-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-400 text-white">
                <Clock size={8} />
              </span>
              <span className="block text-center capitalize">
                {row.status ? row.status.toLowerCase() : "Queued"}
              </span>
            </span>
          );
        },
      },
      {
        key: "contact",
        label: "Contact & Phone",
        width: "280px",
        sortable: true,
        sticky: true,
        stickyLeft: "120px",
        renderCell: (row) => {
          const contactName =
            row.contact?.name || row.toNumber || "Unknown Lead";
          const phoneNumber = row.toNumber || row.contact?.rawPhone;

          return (
            <div
              className="flex items-center gap-2 py-0.5"
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
                  {isBookmarked(row) ? "Remove bookmark" : "Bookmark call"}
                </span>
              </button>

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80">
                <Phone size={13} />
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCall?.(row);
                  }}
                  className="block truncate text-[12px] font-black text-slate-900 underline decoration-slate-200 underline-offset-4 hover:decoration-slate-400 text-left cursor-pointer"
                >
                  {contactName}
                </button>
                {phoneNumber && (
                  <span className="block truncate text-[11px] font-medium text-slate-400 font-mono">
                    {phoneNumber}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "agent",
        label: "Assigned Agent",
        width: "180px",
        sortable: true,
        renderCell: (row) => (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <span className="text-[12px] font-semibold text-slate-800 truncate">
              {row.agent?.name || "Ava (Default)"}
            </span>
          </div>
        ),
      },
      {
        key: "campaign",
        label: "Sale Campaign",
        width: "200px",
        renderCell: (row) => (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 truncate">
            <TrendingUp size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{row.campaign?.name || "Direct Dial"}</span>
          </div>
        ),
      },
      {
        key: "outcome",
        label: "Outcome",
        width: "160px",
        renderCell: (row) => {
          const outcome = row.outcomeDetail?.outcome || row.outcome;
          if (!outcome) {
            return <span className="text-[12px] font-medium text-slate-400">—</span>;
          }

          const isPositive =
            outcome.includes("INTERESTED") ||
            outcome.includes("QUALIFIED") ||
            outcome.includes("MEETING");
          const isFollowup = outcome.includes("CALLBACK");
          const isNegative =
            outcome.includes("NOT_INTERESTED") || outcome.includes("DNC");

          const badgeClasses = isPositive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : isFollowup
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : isNegative
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-700";

          return (
            <span
              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold leading-tight uppercase tracking-wider ${badgeClasses}`}
            >
              {outcome.replace(/_/g, " ")}
            </span>
          );
        },
      },
      {
        key: "duration",
        label: "Duration",
        width: "110px",
        sortable: true,
        renderCell: (row) => (
          <span className="text-[12px] font-semibold text-slate-700">
            {formatDuration(row.durationSeconds)}
          </span>
        ),
      },
      {
        key: "startedAt",
        label: "Started (UTC)",
        width: "170px",
        sortable: true,
        renderCell: (row) => (
          <span className="text-[12px] font-medium text-slate-600">
            {formatDate(row.startedAt || row.createdAt)}
          </span>
        ),
      },
    ],
    [closeHoverSoon, handleBookmarkClick, handleMouseEnter, isBookmarked, onSelectCall],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs mb-3">
              <PhoneCall size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No outbound calls found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Outbound calls are logged here as campaigns dial prospects or direct calls are placed.
            </p>
          </div>
        }
        sortState={sortState}
        onSortChange={onSortChange}
        rowKey={rowKey}
        highlightRow={highlightRow}
        onHighlightComplete={onHighlightComplete}
        onRowClick={(row) => onSelectCall?.(row)}
        rowActions={(row) => {
          const key = rowKey(row);
          const menuOpen = openRowMenu === key;
          return (
            <div className="call-row-menu relative flex items-center justify-end px-2 z-20">
              <button
                type="button"
                data-call-actions-trigger="true"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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
            data-call-actions-menu="true"
            className="fixed z-[9999] w-48 rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              onClick={() => {
                setOpenRowMenu(null);
                onSelectCall?.(activeRowForMenu);
              }}
            >
              <FileText size={13} className="text-slate-400" />
              View Call Details
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              onClick={() => {
                setOpenRowMenu(null);
                navigator.clipboard.writeText(activeRowForMenu.id);
              }}
            >
              <Copy size={13} className="text-slate-400" />
              Copy Call ID
            </button>

            {activeRowForMenu.toNumber && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                onClick={() => {
                  setOpenRowMenu(null);
                  navigator.clipboard.writeText(activeRowForMenu.toNumber!);
                }}
              >
                <Phone size={13} className="text-slate-400" />
                Copy Phone Number
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
          title="Call Intelligence"
          subtitle={hoverCard.row.contact?.name || hoverCard.row.toNumber || "Outbound Call"}
          onClose={() => setHoverCard(null)}
          onMouseEnter={keepHoverOpen}
          onMouseLeave={closeHoverSoon}
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase text-[10px] text-slate-400">Call ID</span>
              <button
                type="button"
                onClick={() => handleHoverCopy(hoverCard.row.id)}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 hover:underline cursor-pointer"
              >
                {hoverCopiedId === hoverCard.row.id ? "Copied!" : hoverCard.row.id.slice(0, 12) + "..."}
              </button>
            </div>

            <div>
              <span className="font-bold uppercase text-[10px] text-slate-400 block mb-0.5">
                Outcome & Status
              </span>
              <p className="text-slate-700 leading-relaxed font-semibold">
                {hoverCard.row.outcome || hoverCard.row.outcomeDetail?.outcome || hoverCard.row.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Assigned Agent
                </span>
                <span className="font-semibold text-slate-800">
                  {hoverCard.row.agent?.name || "Ava (Default)"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Call Duration
                </span>
                <span className="font-semibold text-slate-800">
                  {formatDuration(hoverCard.row.durationSeconds)}
                </span>
              </div>
            </div>
          </div>
        </HoverCard>
      )}
    </>
  );
});

export default OutboundCallsTable;
