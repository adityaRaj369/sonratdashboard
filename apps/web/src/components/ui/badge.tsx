import type * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/25",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  outline: "bg-card text-foreground border-border",
  accent: "bg-accent/10 text-accent border-accent/20",
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
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
