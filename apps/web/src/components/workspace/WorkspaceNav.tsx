"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WorkspaceNavContextValue = {
  path: string;
  params: Record<string, string>;
  navigate: (to: string) => void;
};

const WorkspaceNavContext = createContext<WorkspaceNavContextValue | null>(null);

function parseParams(path: string): Record<string, string> {
  const parts = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  // /agents/:id/:section?
  if (parts[0] === "agents" && parts[1] && parts[1] !== "new") {
    params.id = parts[1];
    if (parts[2]) params.section = parts[2];
  }
  // /campaigns/:id/...
  if (parts[0] === "campaigns" && parts[1] && parts[1] !== "new") {
    params.id = parts[1];
  }
  // /calls/:id
  if (parts[0] === "calls" && parts[1]) {
    params.id = parts[1];
  }
  // /contacts — no id routes currently

  return params;
}

/**
 * CRA/SEAM-style client navigation. Updates URL instantly via history API
 * without waiting for Next.js RSC/chunk loads (the main slowness source).
 */
export function WorkspaceNavProvider({
  children,
  initialPath,
}: {
  children: React.ReactNode;
  initialPath: string;
}) {
  const [path, setPath] = useState(initialPath || "/dashboard");

  useEffect(() => {
    setPath(window.location.pathname || initialPath);
  }, [initialPath]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (!to) return;
    const next = to.startsWith("/") ? to : `/${to}`;
    if (window.location.pathname !== next) {
      window.history.pushState({}, "", next);
    }
    setPath(next);
    window.dispatchEvent(new CustomEvent("sonrat-workspace-nav", { detail: { path: next } }));
  }, []);

  const params = useMemo(() => parseParams(path), [path]);

  const value = useMemo(
    () => ({ path, params, navigate }),
    [path, params, navigate],
  );

  return (
    <WorkspaceNavContext.Provider value={value}>
      {children}
    </WorkspaceNavContext.Provider>
  );
}

export function useWorkspaceNav() {
  const ctx = useContext(WorkspaceNavContext);
  if (!ctx) {
    throw new Error("useWorkspaceNav must be used within WorkspaceNavProvider");
  }
  return ctx;
}

export function useWorkspacePath() {
  return useWorkspaceNav().path;
}

export function useWorkspaceNavigate() {
  const navigate = useWorkspaceNav().navigate;
  return useMemo(
    () => ({
      push: (to: string) => navigate(to),
      replace: (to: string) => navigate(to),
      back: () => window.history.back(),
    }),
    [navigate],
  );
}

export function useWorkspaceParams<T extends Record<string, string>>() {
  return useWorkspaceNav().params as T;
}

export function WorkspaceLink({
  href,
  children,
  className,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const ctx = useContext(WorkspaceNavContext);
  return (
    <a
      {...rest}
      href={href}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        if (!ctx) return; // allow normal navigation outside workspace
        event.preventDefault();
        ctx.navigate(href);
      }}
    >
      {children}
    </a>
  );
}
