"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function useEscape(handler: (event: KeyboardEvent) => void, deps: unknown[] = []) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isLocked]);
}

function hasNestedEditorModalOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("[data-editor-modal='true']"));
}

type WorkspacePanelProps = {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  headerActions?: React.ReactNode;
  widthClass?: string;
  children?: React.ReactNode;
};

/** SEAM-style right drawer / inline workspace panel. */
export default function WorkspacePanel({
  isOpen,
  onClose,
  title = "Edit",
  subtitle = "Workspace",
  description = "",
  headerActions = null,
  widthClass = "w-[960px]",
  children,
}: WorkspacePanelProps) {
  const isDrawerVariant = typeof isOpen === "boolean";
  const drawerOpen = Boolean(isOpen);
  const panelText = [title, subtitle]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const matchesEditorPanel =
    /\b(create|edit|add|grant|adjust)\b/.test(panelText) ||
    panelText.includes("inline editor");
  const [drawerEditorPanel, setDrawerEditorPanel] = useState(false);
  const isEditorPanel =
    matchesEditorPanel || (isDrawerVariant && drawerOpen && drawerEditorPanel);
  const editorPanelClass = isEditorPanel ? " dashboard-editor-panel" : "";

  const panelRef = useRef<HTMLDivElement | null>(null);

  useLockBodyScroll(isDrawerVariant && drawerOpen);
  useEscape(
    (event) => {
      if (!isDrawerVariant || !drawerOpen) return;
      if (event.defaultPrevented || hasNestedEditorModalOpen()) return;
      onClose?.();
    },
    [isDrawerVariant, drawerOpen, onClose],
  );

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const node = panelRef.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = node.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) as HTMLElement | null;
    focusable?.focus?.();

    return () => previouslyFocused?.focus?.();
  }, [drawerOpen]);

  useEffect(() => {
    if (!isDrawerVariant || !drawerOpen) {
      setDrawerEditorPanel(false);
      return;
    }
    if (matchesEditorPanel) {
      setDrawerEditorPanel(true);
    }
  }, [drawerOpen, isDrawerVariant, matchesEditorPanel]);

  if (!isDrawerVariant) {
    return (
      <section
        className={`rounded-[28px] border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)]${editorPanelClass}`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            {subtitle}
          </p>
          <div className="mt-1 flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="text-sm leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </section>
    );
  }

  if (!drawerOpen) return null;

  const panel = (
    <div className="fixed inset-0 z-[220]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close panel backdrop"
        onClick={() => onClose?.()}
      />
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div
          ref={panelRef}
          className={`flex h-full flex-col border-l border-slate-100 bg-white shadow-2xl ${widthClass}${editorPanelClass}`}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {subtitle}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-900">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={() => onClose?.()}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/40">{children}</div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return panel;
  return createPortal(panel, document.body);
}
