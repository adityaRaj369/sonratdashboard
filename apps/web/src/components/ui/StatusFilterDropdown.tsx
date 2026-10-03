"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type StatusFilterOption = {
  value: string;
  label: string;
  description?: string;
  dotClass?: string;
  textClass?: string;
};

const DEFAULT_OPTIONS: StatusFilterOption[] = [
  {
    value: "",
    label: "All Status",
    description: "Show all records",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700",
  },
  {
    value: "PUBLISHED",
    label: "Live / Enabled",
    description: "Active published records",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "Unpublished draft records",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    description: "Inactive / archived records",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700",
  },
];

export type StatusFilterDropdownProps = {
  value?: string;
  onChange?: (value: string) => void;
  options?: StatusFilterOption[];
  label?: string;
  disabled?: boolean;
  triggerHeightClass?: string;
};

export default function StatusFilterDropdown({
  value = "",
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  triggerHeightClass = "h-8",
}: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const updateMenuPosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 190),
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const menu =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] overflow-hidden rounded-lg border border-slate-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] animate-in fade-in zoom-in-95 duration-100"
            role="listbox"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              minWidth: `${menuPosition.minWidth}px`,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value || "empty"}
                type="button"
                className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                  option.value === value ? "bg-slate-50 font-bold" : ""
                }`}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                }}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    option.dotClass || "bg-slate-400"
                  }`}
                />
                <div>
                  <div className={`text-[12px] font-semibold ${option.textClass || "text-slate-800"}`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-[10px] text-slate-400">{option.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex ${triggerHeightClass} items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-[11px] font-bold text-slate-600 outline-none transition-colors hover:bg-white hover:border-slate-200 ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${selected?.dotClass || "bg-slate-400"}`}
        />
        <span>{selected?.label || "Status"}</span>
        <ChevronDown size={12} className="text-slate-400 ml-0.5" />
      </button>
      {menu}
    </div>
  );
}
