"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  side = "left",
  className,
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close drawer"
        className={cn(
          "absolute inset-0 bg-foreground/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute top-0 h-full w-[280px] border-slate-200 bg-white shadow-2xl transition-transform",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
          className,
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-sidebar-border px-3">
          <span className="text-sm font-semibold">{title || "Menu"}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-3rem)] overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
