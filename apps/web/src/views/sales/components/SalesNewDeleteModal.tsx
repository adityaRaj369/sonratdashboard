"use client";

import React, { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import type { Campaign } from "@/lib/types";

export type SalesNewDeleteModalProps = {
  row: Campaign | null;
  deleting?: boolean;
  error?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const SalesNewDeleteModal = memo(function SalesNewDeleteModal({
  row,
  deleting = false,
  error = "",
  onConfirm,
  onCancel,
}: SalesNewDeleteModalProps) {
  useEffect(() => {
    if (!row) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [row]);

  useEffect(() => {
    if (!row) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onCancel, row]);

  if (!row) return null;

  const summaryFields = [
    { label: "Campaign Name", value: row.name || "—" },
    { label: "Assigned Agent", value: row.agent?.name || "Unassigned" },
    { label: "Status", value: row.status || "DRAFT" },
    { label: "Calling Window", value: `${row.callingHoursStart || "09:00"}–${row.callingHoursEnd || "18:00"}` },
  ];

  return createPortal(
    <div
      data-editor-modal="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[500] grid place-items-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-100"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel?.();
      }}
    >
      <div className="mx-4 w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">
                Archive campaign
              </p>
              <h3 className="text-lg font-black text-slate-900">
                Remove {row.name || "this campaign"}?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 border-b border-slate-100 px-6 py-5 text-sm text-slate-600">
          <p>
            This will archive <span className="font-semibold text-slate-900">{row.name}</span> and
            halt all active outbound dialers. Recorded call history and contact audit logs will be preserved.
          </p>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Campaign Overview
            </p>
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
              {summaryFields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">{field.label}</dt>
                  <dd className="font-semibold text-slate-900 break-words capitalize">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-rose-500/25 hover:bg-rose-500 disabled:opacity-50"
          >
            {deleting ? "Archiving…" : "Archive Campaign"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
});

export default SalesNewDeleteModal;
