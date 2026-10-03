import type * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  destructive: "border-rose-200 bg-rose-50 text-rose-700",
  outline: "bg-white text-slate-900 border-slate-200",
  accent: "border-sky-200 bg-sky-50 text-sky-700",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
