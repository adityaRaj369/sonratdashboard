"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  side = "right",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const [open, setOpen] = React.useState(false);
  const positions = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-soft",
            positions[side],
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
