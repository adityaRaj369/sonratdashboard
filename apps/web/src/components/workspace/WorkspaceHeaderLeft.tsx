"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HOME_ROUTE, resolveServiceFromPath } from "@/data/services";

function formatHeaderDateText() {
  return new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WorkspaceHeaderLeft = forwardRef<
  HTMLElement,
  {
    mode?: "date" | "title";
    dateText?: string;
    title?: string;
  }
>(function WorkspaceHeaderLeft({ mode = "date", dateText = "", title = "" }, ref) {
  const nextPath = usePathname();
  const [path, setPath] = useState(nextPath || "/");

  useEffect(() => {
    setPath(window.location.pathname || nextPath || "/");
    const onPop = () => setPath(window.location.pathname);
    const onNav = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (detail?.path) setPath(detail.path);
      else setPath(window.location.pathname);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("sonrat-workspace-nav", onNav);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("sonrat-workspace-nav", onNav);
    };
  }, [nextPath]);

  const matchedService = useMemo(() => resolveServiceFromPath(path), [path]);

  const derived =
    path === HOME_ROUTE || path === "/"
      ? "Home"
      : matchedService
        ? matchedService.title
        : path
            .split("/")
            .filter(Boolean)
            .slice(-1)[0]
            ?.replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) || "Home";

  if (mode === "title") {
    return (
      <div className="relative z-40 ml-6 flex h-14 items-center justify-center">
        <h1
          ref={ref as React.Ref<HTMLHeadingElement>}
          className="relative z-40 whitespace-nowrap text-lg font-bold text-slate-900"
        >
          {title}
        </h1>
      </div>
    );
  }

  return (
    <div className="relative z-40 ml-8 flex h-14 items-center justify-center gap-2">
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className="relative z-40 whitespace-nowrap text-[11px] font-medium text-slate-500"
      >
        {formatHeaderDateText() || dateText}
      </span>
      <span className="select-none text-slate-300">•</span>
      <span className="ml-2 text-sm font-extrabold uppercase tracking-wide text-slate-900">
        {title || derived}
      </span>
    </div>
  );
});

export default WorkspaceHeaderLeft;
