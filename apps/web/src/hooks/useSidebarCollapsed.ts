"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Shared collapse state for the main workspace sidebar.
 * MainSidebar and WorkspaceLayout live in different trees, so we keep the
 * flag in localStorage and broadcast changes via a window event (SEAM pattern).
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "sonrat_sidebar_collapsed";
const SIDEBAR_COLLAPSED_EVENT = "sonrat-sidebar-collapsed-change";

function readInitialCollapsed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(readInitialCollapsed);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setCollapsedState(Boolean(detail));
    };
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, handleChange);
    return () => window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, handleChange);
  }, []);

  const setCollapsed = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((previous) => {
      const value = typeof next === "function" ? Boolean(next(previous)) : Boolean(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0");
        window.dispatchEvent(
          new CustomEvent(SIDEBAR_COLLAPSED_EVENT, { detail: value }),
        );
      }
      return value;
    });
  }, []);

  return [collapsed, setCollapsed] as const;
}
