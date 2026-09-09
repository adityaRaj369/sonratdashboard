"use client";

import React from "react";
import cx from "@/utils/cx";

type PaginationProps = {
  page?: number;
  totalPages?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onFirst?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLast?: () => void;
  onPageSizeChange?: (size: number) => void;
};

/** SEAM reference Pagination — first/prev/next/last + rows-per-page. */
export default function Pagination({
  page = 0,
  totalPages = 1,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onFirst,
  onPrev,
  onNext,
  onLast,
  onPageSizeChange,
}: PaginationProps) {
  const disabledPrev = page <= 0;
  const disabledNext = page >= totalPages - 1;

  return (
    <div className="flex items-center justify-end gap-10 border-t border-slate-100 bg-white px-6 py-2.5 text-[13px]">
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-500">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="h-7 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-bold text-slate-900 focus:border-slate-400 focus:outline-none"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 font-medium text-slate-500">
        Page{" "}
        <span className="font-bold text-slate-900">
          {totalPages === 0 ? 0 : page + 1} / {totalPages || 1}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onFirst}
          disabled={disabledPrev}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors",
            disabledPrev
              ? "cursor-not-allowed opacity-30"
              : "text-slate-600 hover:bg-slate-50 active:bg-slate-100",
          )}
          aria-label="First page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={disabledPrev}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors",
            disabledPrev
              ? "cursor-not-allowed opacity-30"
              : "text-slate-600 hover:bg-slate-50 active:bg-slate-100",
          )}
          aria-label="Previous page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabledNext}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors",
            disabledNext
              ? "cursor-not-allowed opacity-30"
              : "text-slate-600 hover:bg-slate-50 active:bg-slate-100",
          )}
          aria-label="Next page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={disabledNext}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors",
            disabledNext
              ? "cursor-not-allowed opacity-30"
              : "text-slate-600 hover:bg-slate-50 active:bg-slate-100",
          )}
          aria-label="Last page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
