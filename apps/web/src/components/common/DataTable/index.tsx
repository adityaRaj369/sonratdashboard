"use client";

import React, { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import cx from "@/utils/cx";
import { SkeletonBlock } from "@/components/common/skeletons";

export type DataTableSortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export type DataTableColumn<T = any> = {
  key: string;
  label?: ReactNode;
  width?: string | number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sticky?: boolean;
  stickyLeft?: string | number;
  stickyShadow?: boolean;
  renderCell?: (row: T, rowIndex: number) => ReactNode;
};

export type DataTableProps<T = any> = {
  columns?: DataTableColumn<T>[];
  data?: T[];
  rowKey?: string | ((row: T, index: number) => string | number);
  loading?: boolean;
  loadingState?: ReactNode;
  loadingCellClassName?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: ReactNode | ((row: T) => ReactNode);
  rowClassName?: string | ((row: T, rowIndex: number) => string);
  sortState?: DataTableSortState;
  onSortChange?: (next: DataTableSortState) => void;
  highlightRow?: string | number | null;
  onHighlightComplete?: () => void;
};

export default function DataTable<T extends Record<string, any> = any>({
  columns = [],
  data = [],
  rowKey = (row, index) => row?.id ?? row?._id ?? index,
  loading = false,
  loadingState = null,
  loadingCellClassName = "px-6 py-14 text-center",
  emptyState = <div className="text-sm font-medium text-slate-400 italic">No results.</div>,
  onRowClick,
  rowActions,
  rowClassName,
  sortState,
  onSortChange,
  highlightRow,
  onHighlightComplete,
}: DataTableProps<T>) {
  const [openSortKey, setOpenSortKey] = useState<string | null>(null);
  const [activeHighlightRow, setActiveHighlightRow] = useState<string | null>(null);
  // Track horizontal scroll so the sticky-column shadow only shows once columns
  // are actually sliding underneath the frozen ones.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isScrolledX, setIsScrolledX] = useState(false);

  const handleHorizontalScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setIsScrolledX((event.currentTarget?.scrollLeft || 0) > 0);
  };

  // When highlightRow is set, attempt to scroll and then call onHighlightComplete
  useEffect(() => {
    if (!highlightRow) return undefined;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25;
    const retryDelayMs = 80;
    let blinkTimer: number | null = null;
    let retryTimer: number | null = null;

    const finish = () => {
      if (cancelled) return;
      setActiveHighlightRow(null);
      if (typeof onHighlightComplete === "function") {
        onHighlightComplete();
      }
    };

    const startBlink = (id: string) => {
      if (cancelled) return;
      setActiveHighlightRow(id);
      let count = 0;
      blinkTimer = window.setInterval(() => {
        count += 1;
        setActiveHighlightRow((prev) => (prev === null ? id : null));
        if (count >= 6) {
          if (blinkTimer != null) window.clearInterval(blinkTimer);
          blinkTimer = null;
          finish();
        }
      }, 450);
    };

    const tryScroll = () => {
      if (cancelled) return;
      try {
        const el = document.querySelector(`[data-row-key='${String(highlightRow)}']`);
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          startBlink(String(highlightRow));
          return;
        }
      } catch {
        // ignore
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        retryTimer = window.setTimeout(tryScroll, retryDelayMs);
      } else {
        finish();
      }
    };

    retryTimer = window.setTimeout(tryScroll, 80);
    return () => {
      cancelled = true;
      if (retryTimer != null) clearTimeout(retryTimer);
      if (blinkTimer != null) clearInterval(blinkTimer);
    };
  }, [highlightRow, onHighlightComplete]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!openSortKey) return;
      const target = event.target as Element | null;
      if (target?.closest?.(".dt-sort-menu")) return;
      setOpenSortKey(null);
    };
    window.addEventListener("click", handleClickAway, true);
    return () => window.removeEventListener("click", handleClickAway, true);
  }, [openSortKey]);

  const sortedData = useMemo(() => {
    if (typeof onSortChange === "function") return data; // server-side sorting handled upstream
    if (!sortState?.key || !sortState?.direction) return data;
    const { key, direction } = sortState;
    const factor = direction === "desc" ? -1 : 1;
    return [...data].sort((a, b) => {
      const va = a?.[key];
      const vb = b?.[key];
      if (va === vb) return 0;
      if (va == null) return -1 * factor;
      if (vb == null) return 1 * factor;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa === sb) return 0;
      return sa > sb ? factor : -factor;
    });
  }, [data, sortState, onSortChange]);

  const renderCell = (column: DataTableColumn<T>, row: T, rowIndex: number) => {
    if (typeof column.renderCell === "function") {
      return column.renderCell(row, rowIndex);
    }
    return row?.[column.key];
  };

  const rowsEmpty = !loading && data.length === 0;

  // Key of the right-most frozen column. Its right edge is where the sticky/scrolling
  // boundary sits, so that's where we show the shadow while scrolled. Detected
  // automatically so every table with sticky columns gets the shadow for free.
  const lastStickyKey = useMemo(() => {
    let key: string | null = null;
    columns.forEach((column) => {
      if (column.sticky) key = column.key;
    });
    return key;
  }, [columns]);

  const getColumnStyle = (column: DataTableColumn<T>): CSSProperties => {
    const style: CSSProperties = {};
    if (column.width) {
      style.width = column.width;
      style.minWidth = column.width;
    }
    if (column.sticky) {
      const leftValue = column.stickyLeft;
      style.left = typeof leftValue === "number" ? `${leftValue}px` : leftValue || 0;
    }
    // A right-edge shadow marks the boundary of the frozen columns so it's clear
    // which columns are pinned while the rest scroll underneath. Applied automatically
    // to the right-most sticky column (or any column that opts in via stickyShadow),
    // and only once the user has actually scrolled horizontally.
    const showShadow = column.stickyShadow || (column.sticky && column.key === lastStickyKey);
    if (showShadow && isScrolledX) {
      style.boxShadow = "8px 0 12px -8px rgba(15, 23, 42, 0.28)";
    }
    return style;
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 8 }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className="border-b border-slate-100">
        {columns.map((column) => (
          <td
            key={`skeleton-${rowIndex}-${column.key}`}
            className="px-4 py-2 align-middle"
            style={getColumnStyle(column)}
          >
            <SkeletonBlock className="h-6 w-full rounded-md" />
          </td>
        ))}
        {rowActions ? (
          <td className="px-4 py-2 align-middle">
            <SkeletonBlock className="h-6 w-full rounded-md" />
          </td>
        ) : null}
      </tr>
    ));

  return (
    <div className="flex flex-col h-full min-h-0 bg-white relative">
      <div
        ref={scrollRef}
        onScroll={handleHorizontalScroll}
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
      >
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="bg-white shadow-sm">
                {columns.map((column, colIndex) => {
                  const currentSort = sortState?.key === column.key ? sortState.direction : null;
                  const isFirstCol = colIndex === 0;
                  return (
                    <th
                      key={column.key}
                      className={cx(
                        "sticky top-0 z-30 px-4 py-1.5 text-left text-[11px] font-bold text-slate-400 border-b border-slate-100 whitespace-nowrap uppercase tracking-wider bg-white",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.sticky && "z-40 shadow-sm",
                      )}
                      style={getColumnStyle(column)}
                    >
                      <div className="flex items-center gap-1">
                        {column.sortable ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-left"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setOpenSortKey((prev) => (prev === column.key ? null : column.key));
                            }}
                          >
                            <span>{column.label}</span>
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          </button>
                        ) : (
                          column.label
                        )}
                        {column.sortable && (
                          <div className="relative dt-sort-menu">
                            {openSortKey === column.key ? (
                              <div
                                className={`absolute mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden ${
                                  isFirstCol ? "left-full ml-2" : "right-0"
                                }`}
                              >
                                <button
                                  type="button"
                                  className={cx(
                                    "w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2",
                                    currentSort === "asc"
                                      ? "bg-slate-100 text-slate-800"
                                      : "text-slate-700 hover:bg-slate-50",
                                  )}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onSortChange?.({ key: column.key, direction: "asc" });
                                    setOpenSortKey(null);
                                  }}
                                >
                                  <span className="inline-flex h-4 w-4 items-center justify-center text-[12px]">↑</span>
                                  Sort ascending
                                </button>
                                <button
                                  type="button"
                                  className={cx(
                                    "w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2",
                                    currentSort === "desc"
                                      ? "bg-slate-100 text-slate-800"
                                      : "text-slate-700 hover:bg-slate-50",
                                  )}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onSortChange?.({ key: column.key, direction: "desc" });
                                    setOpenSortKey(null);
                                  }}
                                >
                                  <span className="inline-flex h-4 w-4 items-center justify-center text-[12px]">↓</span>
                                  Sort descending
                                </button>
                                {currentSort ? (
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-50 border-t border-slate-100 flex items-center gap-2"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      onSortChange?.(null);
                                      setOpenSortKey(null);
                                    }}
                                  >
                                    <span className="inline-flex h-4 w-4 items-center justify-center text-[12px]">⟳</span>
                                    Reset order
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                {rowActions ? (
                  <th className="sticky top-0 z-30 px-4 py-1.5 border-b border-slate-100 bg-white shadow-sm w-[240px]" />
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-transparent">
              {loading ? (
                loadingState ? (
                  <tr>
                    <td colSpan={columns.length + (rowActions ? 1 : 0)} className={loadingCellClassName}>
                      {loadingState}
                    </td>
                  </tr>
                ) : (
                  renderSkeletonRows()
                )
              ) : rowsEmpty ? (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-6 py-16 text-center">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIndex) => {
                  const key =
                    typeof rowKey === "function" ? rowKey(row, rowIndex) : (row?.[rowKey] as string | number) ?? rowIndex;
                  const clickable = typeof onRowClick === "function";
                  // compute extra class for highlight or provided rowClassName
                  const extraClass = typeof rowClassName === "function" ? rowClassName(row, rowIndex) : rowClassName || "";
                  const isHighlighted =
                    activeHighlightRow !== undefined &&
                    activeHighlightRow !== null &&
                    String(key) === String(activeHighlightRow);
                  const highlightClass = isHighlighted ? "is-highlighted" : "";

                  return (
                    <tr
                      key={key}
                      data-row-key={key}
                      className={cx(
                        "border-b border-slate-100 hover:bg-slate-50/50 transition-colors group",
                        clickable && "cursor-pointer",
                        extraClass,
                        highlightClass,
                      )}
                      onClick={() => (clickable ? onRowClick?.(row) : undefined)}
                    >
                      {columns.map((column) => (
                        <td
                          key={`${key}-${column.key}`}
                          className={cx(
                            "px-4 py-1 align-middle text-[12px] font-bold text-slate-600 border-b border-transparent truncate group-[.is-highlighted]:bg-amber-100/70 group-[.is-highlighted]:text-slate-900",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                            column.sticky && "sticky bg-white z-20 group-[.is-highlighted]:bg-amber-100/70",
                          )}
                          style={getColumnStyle(column)}
                        >
                          {renderCell(column, row, rowIndex)}
                        </td>
                      ))}
                      {rowActions ? (
                        <td className="px-4 py-1 text-right align-middle group-[.is-highlighted]:bg-amber-100/70 overflow-visible relative z-10">
                          <div className="flex justify-end gap-1">
                            {typeof rowActions === "function" ? rowActions(row) : rowActions}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
