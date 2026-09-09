"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sonrat_invert_mode";
const CLASS_NAME = "seam-invert-mode";
const EVENT_NAME = "sonrat-invert-mode-change";

function readInitial() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function applyClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(CLASS_NAME, enabled);
}

/** Shared invert-mode flag (sidebar + header stay in sync). */
export function useInvertMode() {
  const [enabled, setEnabledState] = useState(readInitial);

  useEffect(() => {
    applyClass(enabled);
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onChange = (event: Event) => {
      const next = Boolean((event as CustomEvent<boolean>).detail);
      setEnabledState(next);
      applyClass(next);
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  const setEnabled = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setEnabledState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        applyClass(next);
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return [enabled, setEnabled] as const;
}
