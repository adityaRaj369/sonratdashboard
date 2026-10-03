"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, EllipsisVertical, Pencil, Trash2, Files } from "lucide-react";
import cx from "@/utils/cx";

type EntityRowActionsProps<T> = {
  row: T;
  rowKey: string;
  canEdit?: boolean;
  canClone?: boolean;
  canDelete?: boolean;
  onEdit?: (row: T) => void;
  onClone?: (row: T) => void;
  onDelete?: (row: T) => void;
  copyPayload?: (row: T) => unknown;
  menuNamespace?: string;
};

export default function EntityRowActions<T>({
  row,
  rowKey,
  canEdit = true,
  canClone = true,
  canDelete = true,
  onEdit,
  onClone,
  onDelete,
  copyPayload = (value) => value,
  menuNamespace = "entity",
}: EntityRowActionsProps<T>) {
  const [openMenu, setOpenMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const menuAttr = `data-${menuNamespace}-actions-menu`;
  const triggerAttr = `data-${menuNamespace}-actions-trigger`;

  useEffect(() => {
    if (!openMenu) return undefined;

    const closeMenu = () => setOpenMenu(null);
    const handlePointerDownAway = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.(`[${menuAttr}='true']`)) return;
      if (target?.closest?.(`[${triggerAttr}='true']`)) return;
      closeMenu();
    };

    window.addEventListener("pointerdown", handlePointerDownAway);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDownAway);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuAttr, openMenu, triggerAttr]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyRow = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(JSON.stringify(copyPayload(row), null, 2));
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  const buttonClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold";

  return (
    <>
      <div className="relative flex items-center justify-end px-2">
        <button
          type="button"
          {...{ [triggerAttr]: "true" }}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (openMenu) {
              setOpenMenu(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const menuWidth = 192;
            const viewportWidth =
              typeof window !== "undefined" ? window.innerWidth : menuWidth + 16;
            setOpenMenu({
              left: Math.max(8, Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 8)),
              top: rect.bottom + 8,
            });
          }}
          aria-label="Row actions"
        >
          <EllipsisVertical size={16} />
        </button>
      </div>

      {openMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              {...{ [menuAttr]: "true" }}
              className="fixed z-[260] w-48 rounded-lg border border-slate-200 bg-white shadow-lg"
              style={{ top: openMenu.top, left: openMenu.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={cx(
                  buttonClass,
                  copied ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50",
                )}
                onClick={async (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  await copyRow();
                }}
              >
                <Copy size={13} /> {copied ? "Copied" : "Copy data"}
              </button>
              <button
                type="button"
                disabled={!canEdit}
                className={cx(
                  buttonClass,
                  canEdit ? "text-blue-700 hover:bg-blue-50" : "cursor-not-allowed text-slate-300 opacity-60",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canEdit) return;
                  setOpenMenu(null);
                  onEdit?.(row);
                }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                type="button"
                disabled={!canClone}
                className={cx(
                  buttonClass,
                  canClone ? "text-slate-700 hover:bg-slate-50" : "cursor-not-allowed text-slate-300 opacity-60",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canClone) return;
                  setOpenMenu(null);
                  onClone?.(row);
                }}
              >
                <Files size={13} /> Clone
              </button>
              <button
                type="button"
                disabled={!canDelete}
                className={cx(
                  buttonClass,
                  canDelete ? "text-rose-700 hover:bg-rose-50" : "cursor-not-allowed text-slate-300 opacity-60",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canDelete) return;
                  setOpenMenu(null);
                  onDelete?.(row);
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
