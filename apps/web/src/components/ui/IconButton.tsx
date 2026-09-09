"use client";

import React from "react";
import cx from "@/utils/cx";

const variants = {
  ghost: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
  danger: "text-rose-600 hover:text-rose-700 hover:bg-rose-50",
  primary: "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50",
} as const;

export type IconButtonVariant = keyof typeof variants;

export type IconButtonProps = {
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  variant?: IconButtonVariant;
};

export default function IconButton({
  title,
  onClick,
  children,
  variant = "ghost",
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center rounded-xl p-2 transition-all active:scale-95",
        variants[variant] || variants.ghost,
      )}
    >
      {children}
    </button>
  );
}
