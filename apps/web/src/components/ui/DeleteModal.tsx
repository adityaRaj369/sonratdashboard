"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export type DeleteModalProps = {
  open: boolean;
  row: Record<string, any> | null;
  deleting?: boolean;
  error?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  itemName?: string;
  itemKey?: string;
  warningText?: string;
  showRaw?: boolean;
  confirmButtonClass?: string;
};

export default function DeleteModal({
  open,
  row,
  deleting,
  error,
  onConfirm,
  onCancel,
  title = "Delete",
  itemName = "item",
  itemKey = "key",
  warningText = "This action cannot be undone and will remove the item permanently.",
  showRaw = true,
  confirmButtonClass = "bg-rose-600 hover:bg-rose-500 shadow-rose-500/30",
}: DeleteModalProps) {
  useEffect(() => {
    if (!open || !row) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onCancel, open, row]);

  if (!open || !row) return null;
  if (typeof document === "undefined") return null;

  const key = row[itemKey] || row.key || row.name || row.id || "item";
  const id = row.id || row._id || "—";
  const description = row.description || "—";
  const raw = row.__raw ?? row.raw ?? row;

  return createPortal(
    <div
      data-editor-modal="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[500] grid place-items-center bg-slate-900/50 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-rose-500">
          Delete {itemName}
        </p>
        <h3 className="mt-2 text-xl font-black text-slate-900">Remove {key}?</h3>
        <p className="mt-2 text-sm font-semibold text-slate-600">{warningText}</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-[0.2em]">
              Summary
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="col-span-1">
                <dt className="text-slate-400">Key</dt>
                <dd className="font-semibold text-slate-900 break-all">{key}</dd>
              </div>
              <div className="col-span-1">
                <dt className="text-slate-400">ID</dt>
                <dd className="font-semibold text-slate-900 break-all">{id}</dd>
              </div>
              <div className="col-span-1">
                <dt className="text-slate-400">Description</dt>
                <dd className="font-semibold text-slate-900 break-all">{description}</dd>
              </div>
            </dl>
          </div>

          {showRaw && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                Data
              </div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-white px-3 py-2 text-[11px] font-mono text-slate-800 border border-slate-100">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </div>
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
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className={`rounded-2xl px-4 py-2 text-sm font-black text-white shadow-lg disabled:opacity-50 ${confirmButtonClass}`}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
