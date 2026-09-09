"use client";

import React, { useEffect } from "react";

export type ModalProps = {
  open: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, title, subtitle, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      data-editor-modal="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black tracking-tight text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
