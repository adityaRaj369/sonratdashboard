"use client";

import React from "react";
import { Check, X } from "lucide-react";

const TRUE_LABELS = new Set(["true", "enabled", "active", "yes"]);

const normalizeStatus = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  return TRUE_LABELS.has(String(value ?? "").trim().toLowerCase());
};

export type StatusPillProps = {
  value: unknown;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
};

export default function StatusPill({
  value,
  trueLabel = "Enabled",
  falseLabel = "Disabled",
  className = "",
}: StatusPillProps) {
  const isPositive = normalizeStatus(value);
  const Icon = isPositive ? Check : X;
  const label = isPositive ? trueLabel : falseLabel;

  return (
    <span
      className={`inline-grid h-6 w-[84px] grid-cols-[15px_1fr] items-center rounded-full border pl-1.5 pr-1.5 text-[11px] font-semibold leading-none shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-inset ${
        isPositive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "border-rose-200 bg-rose-50 text-rose-700 ring-rose-100"
      } ${className}`}
    >
      <span
        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-white ${
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      >
        <Icon size={9} strokeWidth={3} />
      </span>
      <span className="block text-center">{label}</span>
    </span>
  );
}
