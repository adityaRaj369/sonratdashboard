"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

type AccentColor = "violet" | "blue" | "emerald" | "amber";

export type CloneModalProps = {
  open: boolean;
  row: Record<string, any> | null;
  cloning?: boolean;
  error?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  itemName?: string;
  itemKey?: string;
  description?: React.ReactNode;
  confirmButtonClass?: string;
  accentColor?: AccentColor;
};

const colorClasses: Record<AccentColor, { text: string; border: string; bg: string }> = {
  violet: { text: "text-violet-500", border: "border-violet-200", bg: "bg-violet-50" },
  blue: { text: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
  emerald: { text: "text-emerald-500", border: "border-emerald-200", bg: "bg-emerald-50" },
  amber: { text: "text-amber-500", border: "border-amber-200", bg: "bg-amber-50" },
};

export default function CloneModal({
  open,
  row,
  cloning,
  error,
  onConfirm,
  onCancel,
  title = "Clone",
  itemName = "item",
  itemKey = "key",
  description,
  confirmButtonClass = "bg-violet-600 hover:bg-violet-500 shadow-violet-500/30",
  accentColor = "violet",
}: CloneModalProps) {
  useEffect(() => {
    if (!open || !row) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cloning) onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cloning, onCancel, open, row]);

  if (!open || !row) return null;

  const key = row[itemKey] || row.key || row.name || row.id || "item";
  const desc = row.description;

  const defaultDescription = `A new ${itemName} will be created with a .cloned suffix and remain disabled until enabled.`;

  const colors = colorClasses[accentColor] || colorClasses.violet;

  const modal = (
    <div
      data-editor-modal="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[500] grid place-items-center bg-slate-900/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${colors.text}`}>
            Clone {itemName}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900">Clone {key}?</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {description || defaultDescription}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Summary</div>
          <p className="mt-2">
            <span className="text-slate-400">Original key:</span>{" "}
            <span className="font-semibold text-slate-900">{key}</span>
          </p>
          {desc && desc !== "—" && (
            <p className="text-slate-500 text-xs truncate">{desc}</p>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={cloning}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cloning}
            className={`rounded-2xl px-4 py-2 text-sm font-black text-white shadow-lg disabled:opacity-50 ${confirmButtonClass}`}
          >
            {cloning ? "Cloning…" : title}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
