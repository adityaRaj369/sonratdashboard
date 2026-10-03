"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import cx from "@/utils/cx";

const DEFAULT_OFFSET = 12;

export type HoverCardProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  width?: number;
  maxWidth?: number;
  maxHeight?: number;
  placement?: "left" | "right" | "center";
  offset?: number;
  stickToPointer?: boolean;
  maxPointerShift?: number;
  onClose?: () => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  showClose?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export default function HoverCard({
  open,
  anchorRect,
  width = 360,
  maxWidth = 420,
  maxHeight = 520,
  placement = "right",
  offset = DEFAULT_OFFSET,
  stickToPointer = false,
  maxPointerShift = Infinity,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  showClose = true,
  title,
  subtitle,
  children,
  className,
}: HoverCardProps) {
  const [style, setStyle] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !anchorRect || typeof window === "undefined") {
      setStyle(null);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = Math.min(width, maxWidth);
    let cardMaxHeight = Math.min(maxHeight, vh - offset * 2);

    let left: number;
    if (placement === "left") {
      left = anchorRect.left - cardWidth - offset;
      if (left < offset) {
        left = anchorRect.right + offset;
      }
    } else if (placement === "center") {
      left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2;
    } else {
      left = anchorRect.right + offset;
      if (left + cardWidth + offset > vw) {
        left = anchorRect.left - cardWidth - offset;
        if (left < offset) left = vw - cardWidth - offset;
      }
    }
    left = Math.max(offset, Math.min(left, vw - cardWidth - offset));

    let top = anchorRect.top;
    if (top + cardMaxHeight + offset > vh) {
      top = vh - cardMaxHeight - offset;
    }
    if (top < offset) top = offset;

    setStyle({ left, top, width: cardWidth, maxHeight: cardMaxHeight });
  }, [open, anchorRect, width, maxWidth, maxHeight, placement, offset, stickToPointer, maxPointerShift]);

  const content = useMemo(() => {
    if (!open || !anchorRect || !style) return null;
    return (
      <div
        className="fixed z-[200] animate-in fade-in zoom-in duration-100"
        style={{
          left: `${style.left}px`,
          top: `${style.top}px`,
          width: `${style.width}px`,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        <div className={cx("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl", className)}>
          {(title || subtitle || showClose) && (
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="min-w-0">
                {title && <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</div>}
                {subtitle && <div className="mt-0.5 text-xs font-black text-slate-900 truncate">{subtitle}</div>}
              </div>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close hover card"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <div className="px-4 py-4 overflow-auto" style={{ maxHeight: `${style.maxHeight}px` }}>
            {children}
          </div>
        </div>
      </div>
    );
  }, [open, anchorRect, style, children, title, subtitle, onMouseEnter, onMouseLeave, onMouseMove, onClose, className, showClose]);

  if (!content || typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
