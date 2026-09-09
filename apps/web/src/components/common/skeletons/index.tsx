"use client";

import React from "react";

export function Skeletonize({
  active = false,
  children,
  className = "",
}: {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${active ? "seam-skeletonize" : ""} ${className}`}
      aria-busy={active ? "true" : undefined}
    >
      {children}
    </div>
  );
}

export function useSkeletonSwitch(durationMs = 160): [boolean, (action?: () => void) => void] {
  const [switching, setSwitching] = React.useState(false);

  const runWithSkeleton = React.useCallback(
    (action?: () => void) => {
      setSwitching(true);
      action?.();
      window.setTimeout(() => setSwitching(false), durationMs);
    },
    [durationMs],
  );

  return [switching, runWithSkeleton];
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`seam-skeleton-block rounded-lg bg-slate-200/80 ${className}`} />;
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  showActions = true,
}: {
  rows?: number;
  columns?: number;
  showActions?: boolean;
}) {
  const safeColumns = Math.max(1, Number(columns) || 5);
  const columnTemplate = `repeat(${safeColumns}, minmax(120px, 1fr))${showActions ? " 180px" : ""}`;

  return (
    <div className="min-h-[260px] w-full animate-pulse overflow-x-auto text-left">
      <div className="min-w-[980px] bg-white">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-center gap-4 border-b border-slate-100 px-4 py-2.5 last:border-b-0"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {Array.from({ length: safeColumns }).map((__, colIndex) => (
              <SkeletonBlock
                key={colIndex}
                className={`h-3 rounded-full ${colIndex === 0 ? "w-36" : colIndex % 2 ? "w-24 bg-slate-100" : "w-32"}`}
              />
            ))}
            {showActions ? (
              <div className="flex justify-end gap-1.5">
                <SkeletonBlock className="h-7 w-7 rounded-md" />
                <SkeletonBlock className="h-7 w-7 rounded-md" />
                <SkeletonBlock className="h-7 w-7 rounded-md" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
      <SkeletonBlock className="h-4 w-40 rounded-full" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className={`h-3 rounded-full ${index % 2 ? "w-2/3 bg-slate-100" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-3 w-40 rounded-full" />
              <SkeletonBlock className="mt-2 h-2.5 w-28 rounded-full bg-slate-100" />
            </div>
            <SkeletonBlock className="h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={index === rows - 1 ? "md:col-span-2" : ""}>
          <SkeletonBlock className="h-2.5 w-24 rounded-full" />
          <SkeletonBlock className={`${index === rows - 1 ? "h-20" : "h-10"} mt-2 w-full`} />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <SkeletonBlock className="mt-5 h-4 w-36 rounded-full" />
          <SkeletonBlock className="mt-3 h-3 w-full rounded-full bg-slate-100" />
          <SkeletonBlock className="mt-2 h-3 w-2/3 rounded-full bg-slate-100" />
          <SkeletonBlock className="mt-5 h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function EditorPanelSkeleton({
  rows = 8,
  actions = 3,
  showStatus = true,
}: {
  rows?: number;
  actions?: number;
  showStatus?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[420px] animate-pulse flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="mt-3 h-5 w-52 rounded-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showStatus ? <SkeletonBlock className="h-9 w-28 rounded-lg" /> : null}
          {Array.from({ length: actions }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className={`${index === 0 ? "w-28" : "w-24"} h-9 rounded-lg`}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: rows }).map((_, index) => {
            const large = index === 0 || index === 3 || index === rows - 1;
            return (
              <div key={index} className={large ? "lg:col-span-2" : ""}>
                <SkeletonBlock className="h-2.5 w-24 rounded-full" />
                <SkeletonBlock className={`${large ? "h-24" : "h-10"} mt-2 w-full rounded-lg`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
