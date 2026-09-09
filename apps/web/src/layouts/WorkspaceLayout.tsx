"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Moon, PanelLeftOpen, Search, Sun } from "lucide-react";
import cx from "@/utils/cx";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { useInvertMode } from "@/hooks/useInvertMode";
import { resolveEnvironmentBadge } from "@/utils/environmentBadge";

function formatHeaderDate() {
  return new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkspaceLayout({
  sidebar,
  headerLeft,
  headerDescription,
  headerRight,
  children,
  headerTabWidth,
  environment,
  onGoHome,
}: {
  sidebar?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerDescription?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  loadDashboardStyles?: boolean;
  headerTabWidth?: number;
  environment?: string;
  onGoHome?: () => void;
}) {
  const sidebarShade = "#f8fafc";
  const computedTabWidth = useMemo(() => {
    const width = typeof headerTabWidth === "number" ? headerTabWidth : 240;
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    let maxWidth = 520;
    if (screenWidth < 640) maxWidth = 320;
    else if (screenWidth < 768) maxWidth = 400;
    else if (screenWidth < 1024) maxWidth = 460;
    return Math.min(Math.max(width, 180), maxWidth);
  }, [headerTabWidth]);

  const radius = 32;
  const verticalTurnY = 64;
  const curveHorizontalY = 40;
  const contentPadding = 16;
  const adjustedTabWidth = computedTabWidth - contentPadding;
  const minSvgWidth = 800;
  const maxSvgWidth = 1950;
  const svgWidth = Math.min(Math.max(adjustedTabWidth, minSvgWidth), maxSvgWidth);
  const svgHeight = 1000;

  const fillPath = useMemo(() => {
    const horizontalReach = Math.max(svgWidth - radius, radius * 2);
    return `M0 1000 V${verticalTurnY} C0 ${verticalTurnY - 12} 12 ${curveHorizontalY} 24 ${curveHorizontalY} H${horizontalReach - 24} C${horizontalReach - 12} ${curveHorizontalY} ${horizontalReach} ${curveHorizontalY - 12} ${horizontalReach} 0 H0 Z`;
  }, [svgWidth, verticalTurnY, curveHorizontalY, radius]);

  const strokePath = useMemo(() => {
    const horizontalReach = Math.max(svgWidth - radius, radius * 2);
    return `M0 1000 V${verticalTurnY} C0 ${verticalTurnY - 12} 12 ${curveHorizontalY} 24 ${curveHorizontalY} H${horizontalReach - 24} C${horizontalReach - 12} ${curveHorizontalY} ${horizontalReach} ${curveHorizontalY - 12} ${horizontalReach} 0`;
  }, [svgWidth, verticalTurnY, curveHorizontalY, radius]);

  const pathname = usePathname();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [invertModeEnabled, setInvertModeEnabled] = useInvertMode();
  const envBadge = useMemo(() => resolveEnvironmentBadge(environment), [environment]);

  const path = pathname || "/";
  const last = path === "/" ? "home" : path.split("/").filter(Boolean).slice(-1)[0] || "home";
  const human = last
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  const defaultHeaderLeft = (
    <div className="relative z-40 ml-6 flex h-14 items-center gap-2">
      <span className="whitespace-nowrap text-[11px] font-medium text-slate-500">
        {formatHeaderDate()}
      </span>
      <span className="select-none text-slate-300">•</span>
      <span className="ml-2 text-sm font-extrabold uppercase tracking-wide text-slate-900">
        {human}
      </span>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f1f5f9] font-sans text-slate-900">
      <div
        className={cx(
          "shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
          collapsed ? "w-0" : "w-64",
        )}
      >
        {sidebar || null}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {!collapsed && (
          <>
            <div
              className="pointer-events-none absolute left-0 top-0 z-20"
              style={{ width: svgWidth, height: svgHeight }}
            >
              <svg
                className="h-full w-full"
                viewBox={`0 0 ${svgWidth} 1000`}
                fill="none"
                preserveAspectRatio="xMinYMid meet"
                style={{ vectorEffect: "non-scaling-stroke" }}
              >
                <path d={fillPath} fill={sidebarShade} />
                <path d={strokePath} stroke="#e2e8f0" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div
              className="pointer-events-none absolute right-0 top-0 z-10 h-px bg-slate-200/70"
              style={{ left: computedTabWidth - contentPadding }}
            />
          </>
        )}

        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-transparent px-6">
          <div className="flex min-w-0 items-center gap-2">
            {collapsed && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Home"
                  className="flex items-center"
                  onClick={() => onGoHome?.()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/sonrat-logo.png"
                    alt="Sonrat"
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
                  />
                </button>
                <div
                  className={cx("rounded border-2 px-2 py-0.5", envBadge.wrapperClass)}
                  title={`Environment: ${envBadge.label}`}
                >
                  <span className={cx("text-[11px] font-black uppercase", envBadge.textClass)}>
                    {envBadge.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvertModeEnabled((previous) => !previous)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100"
                  title={invertModeEnabled ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label={invertModeEnabled ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {invertModeEnabled ? (
                    <Sun size={14} className="text-amber-500" />
                  ) : (
                    <Moon size={14} className="text-indigo-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollapsed(false);
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("seam-focus-service-search"));
                    }, 320);
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                  title="Search services"
                  aria-label="Search services"
                >
                  <Search size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen size={16} />
                </button>
                <span className="mx-1 h-5 w-px bg-slate-200" />
              </div>
            )}

            {headerLeft ? headerLeft : defaultHeaderLeft}
          </div>
          <div className="flex items-center gap-4">
            {headerDescription ? <div className="mr-4">{headerDescription}</div> : null}
            {headerRight}
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden px-4 pb-4">
          <main className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
