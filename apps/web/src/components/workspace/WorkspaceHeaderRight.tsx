"use client";

import React from "react";
import cx from "@/utils/cx";
import type { LucideIcon } from "lucide-react";

export type WorkspaceHeaderRightProps = {
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  disabledClass?: string;
};

export default function WorkspaceHeaderRight({
  actionLabel = "Create",
  onAction,
  disabled = false,
  icon: Icon,
  disabledClass,
}: WorkspaceHeaderRightProps) {
  if (!actionLabel || typeof onAction !== "function") return null;

  const enabledClass =
    "bg-[#3b82f6] text-white shadow-md shadow-blue-500/20 hover:bg-[#2563eb] active:scale-95";
  const disabledClassDefault = "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none";

  return (
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-bold shadow-md transition-all",
        disabled ? disabledClass || disabledClassDefault : enabledClass,
      )}
    >
      {Icon ? <Icon size={14} strokeWidth={3} /> : null}
      {actionLabel}
    </button>
  );
}
