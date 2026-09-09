"use client";

import { Pin } from "lucide-react";
import cx from "@/utils/cx";

export default function PinButton({
  isPinned,
  onClick,
  title,
  size = "md",
}: {
  isPinned?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  size?: "sm" | "md";
}) {
  const padding = size === "sm" ? "p-1" : "p-1.5";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full transition-colors active:scale-95",
        padding,
        isPinned ? "text-amber-500" : "text-slate-400 hover:text-slate-800",
      )}
      title={title || (isPinned ? "Unpin" : "Pin")}
      aria-label={isPinned ? "Unpin service" : "Pin service"}
    >
      <Pin size={iconSize} />
    </button>
  );
}
