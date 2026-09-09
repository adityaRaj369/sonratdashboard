"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Workspace({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function WorkspaceHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  return (
    <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {breadcrumbs?.length ? (
            <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 ? <span>/</span> : null}
                  <span className={cn(idx === breadcrumbs.length - 1 && "text-slate-900")}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          ) : null}
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function WorkspaceToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5", className)}>
      {children}
    </main>
  );
}

export function WorkspaceFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "shrink-0 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6",
        className,
      )}
    >
      {children}
    </footer>
  );
}
