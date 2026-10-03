"use client";

import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "./select";

type PaginationProps = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  onPageSizeChange: (value: number) => void;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pagination({
  page,
  pageSize,
  hasNextPage,
  onPageSizeChange,
  onFirst,
  onPrevious,
  onNext,
}: PaginationProps) {
  const disabledPrevious = page === 0;

  const iconClass = "h-3.5 w-3.5";
  const buttonClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center justify-end gap-6 border-x border-b border-slate-200 bg-white px-4 py-2.5 text-[13px]">
      <label className="flex items-center gap-2 font-medium text-slate-500">
        Rows per page
        <Select
          className="h-7 w-auto min-w-16 px-2 py-0.5 text-[13px] font-bold"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Rows per page"
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </label>
      <span className="font-medium text-slate-500">
        Page <strong className="text-slate-900">{page + 1}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={cn(buttonClass)} onClick={onFirst} disabled={disabledPrevious} aria-label="First page">
          <ChevronsLeft className={iconClass} />
        </button>
        <button type="button" className={cn(buttonClass)} onClick={onPrevious} disabled={disabledPrevious} aria-label="Previous page">
          <ChevronLeft className={iconClass} />
        </button>
        <button type="button" className={cn(buttonClass)} onClick={onNext} disabled={!hasNextPage} aria-label="Next page">
          <ChevronRight className={iconClass} />
        </button>
        <button type="button" className={cn(buttonClass)} onClick={onNext} disabled={!hasNextPage} aria-label="Last page">
          <ChevronsRight className={iconClass} />
        </button>
      </div>
    </div>
  );
}
