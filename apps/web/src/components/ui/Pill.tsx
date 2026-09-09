"use client";

import React from "react";
import cx from "@/utils/cx";

const tones = {
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export type PillTone = keyof typeof tones;

export type PillProps = {
  children?: React.ReactNode;
  tone?: PillTone;
  className?: string;
};

export default function Pill({ children, tone = "slate", className = "" }: PillProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black tracking-tight",
        tones[tone] || tones.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}
