"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  Search,
  SquareArrowOutUpRight,
  Sun,
  User as UserIcon,
} from "lucide-react";
import cx from "@/utils/cx";
import PinButton from "@/components/ui/PinButton";
import { getServiceSubpages } from "@/data/serviceSubpages";
import type { ServiceDefinition } from "@/data/services";
import { findServiceSearchTarget } from "@/hooks/workspace/useServiceSearch";
import { resolveEnvironmentBadge } from "@/utils/environmentBadge";
import { useInvertMode } from "@/hooks/useInvertMode";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

/**
 * Port of reference MainSidebar — Pinned + Recently accessed only.
 * All services live in the drawer; Home is not a pin/module duplicate.
 */
function MainSidebar({
  user,
  can,
  env,
  activeNav,
  activeServiceKey,
  onGoHome,
  servicesOpen,
  serviceQuery,
  onChangeServiceQuery,
  serviceSearchResults = [],
  onToggleServices,
  pinnedServices,
  recentServices,
  onServiceClick,
  onPinToggle,
  onLogout,
}: {
  user?: { name?: string | null; email?: string | null; avatar?: string | null } | null;
  can: (permission: string) => boolean;
  env?: string;
  activeNav: string;
  activeServiceKey?: string;
  onGoHome: () => void;
  servicesOpen: boolean;
  serviceQuery?: string;
  onChangeServiceQuery?: (value: string) => void;
  serviceSearchResults?: ServiceDefinition[];
  onToggleServices?: () => void;
  pinnedServices: ServiceDefinition[];
  recentServices: Array<{ svc: ServiceDefinition; ts?: number }>;
  onServiceClick: (svc: ServiceDefinition) => void;
  onPinToggle?: (key: string) => void;
  onLogout: () => void;
}) {
  const canCheck = typeof can === "function" ? can : () => false;
  const allowService = (svc?: ServiceDefinition | null) =>
    !svc?.permission || canCheck(svc.permission);
  const allowAdminConsole = canCheck("adminconsole.show_menu");
  const envBadge = useMemo(() => resolveEnvironmentBadge(env), [env]);
  const [invertModeEnabled, setInvertModeEnabled] = useInvertMode();
  const [, setCollapsed] = useSidebarCollapsed();
  const [expandedPinnedKeys, setExpandedPinnedKeys] = useState(() => new Set<string>());
  const [internalServiceQuery, setInternalServiceQuery] = useState("");
  const serviceSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleFocusRequest = () => {
      serviceSearchInputRef.current?.focus();
      serviceSearchInputRef.current?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("seam-focus-service-search", handleFocusRequest);
    return () => window.removeEventListener("seam-focus-service-search", handleFocusRequest);
  }, []);

  const togglePinnedExpanded = (key: string) => {
    setExpandedPinnedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isPinnedExpanded = (key: string) => expandedPinnedKeys.has(key);
  const activeServiceQuery = serviceQuery ?? internalServiceQuery;

  const openRouteInNewTab = (route?: string) => {
    if (typeof window === "undefined" || !route) return;
    const target = route.startsWith("http") ? route : `${window.location.origin}${route}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleSidebarServiceSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    if (typeof onChangeServiceQuery === "function") onChangeServiceQuery(nextQuery);
    else setInternalServiceQuery(nextQuery);
    if (!servicesOpen) onToggleServices?.();
  };

  const focusSidebarServiceSearch = (event?: React.MouseEvent) => {
    if (event?.target !== serviceSearchInputRef.current) event?.preventDefault();
    serviceSearchInputRef.current?.focus();
    if (!servicesOpen) onToggleServices?.();
  };

  const forwardSearchNavigationToDrawer = (key: string) => {
    window.dispatchEvent(new CustomEvent("seam-service-search-key", { detail: { key } }));
  };

  const openFirstSearchResult = () => {
    const normalizedQuery = String(activeServiceQuery || "").trim().toLowerCase();
    if (!normalizedQuery) return;
    const firstMatch = serviceSearchResults.find((svc) => {
      if (!svc || !allowService(svc)) return false;
      if (svc.key === "admin-console" && !allowAdminConsole) return false;
      return Boolean(svc.route);
    });
    if (!firstMatch) return;
    const target = findServiceSearchTarget(firstMatch, normalizedQuery);
    if (target) onServiceClick(target);
    if (servicesOpen) onToggleServices?.();
  };

  const filteredPinned = pinnedServices
    .filter((svc) => allowService(svc))
    .filter((svc) => svc.key !== "admin-console" || allowAdminConsole);

  const pinnedKeySet = useMemo(
    () => new Set(filteredPinned.map((s) => s.key)),
    [filteredPinned],
  );

  // Recents: max 4, skip anything already pinned (so lists stay distinct)
  const filteredRecents = recentServices
    .filter(({ svc }) => svc && allowService(svc))
    .filter(({ svc }) => svc.key !== "admin-console" || allowAdminConsole)
    .filter(({ svc }) => !pinnedKeySet.has(svc.key))
    .slice(0, 4);

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col bg-slate-50">
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="-m-3 mb-0 flex items-center justify-between gap-2 rounded-2xl p-3 transition-colors hover:bg-slate-50">
            <button
              type="button"
              onClick={onGoHome}
              className="flex min-w-0 items-center gap-2.5 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sonrat-logo.png"
                alt="Sonrat"
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="truncate rounded-md bg-white/80 px-1.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-900 shadow-sm">
                Sonrat
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInvertModeEnabled((previous) => !previous)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100"
                title={invertModeEnabled ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {invertModeEnabled ? (
                  <Sun size={14} className="text-amber-500 opacity-90" />
                ) : (
                  <Moon size={14} className="text-indigo-600 opacity-90" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <UserIcon size={16} strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="block max-w-[168px] truncate text-[13px] font-black">
                {user?.name || "User"}
              </div>
              <div className="block max-w-[160px] break-words pr-2 text-[10px] font-semibold leading-snug text-slate-500">
                {user?.email || ""}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Environment
              </div>
              <div className={cx("rounded border-2 px-2 py-1", envBadge.wrapperClass)}>
                <span className={cx("text-sm font-black uppercase", envBadge.textClass)}>
                  {envBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4" style={{ scrollbarGutter: "stable" }}>
        <div
          className="dashboard-service-search flex w-full cursor-text items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-2 py-1.5 text-left text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-white hover:shadow-md focus-within:border-slate-500 focus-within:bg-white focus-within:shadow-md"
          onMouseDown={focusSidebarServiceSearch}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500">
            <Search size={14} className="text-slate-500" />
          </span>
          <input
            ref={serviceSearchInputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={activeServiceQuery}
            onChange={handleSidebarServiceSearch}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
              event.preventDefault();
              if (!servicesOpen) {
                onToggleServices?.();
                if (event.key === "Enter") openFirstSearchResult();
                else window.setTimeout(() => forwardSearchNavigationToDrawer(event.key), 0);
                return;
              }
              forwardSearchNavigationToDrawer(event.key);
            }}
            onFocus={() => {
              if (!servicesOpen) onToggleServices?.();
            }}
            placeholder="Search services"
            className="dashboard-service-search-input min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-xs font-semibold text-slate-700 shadow-none outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:bg-transparent focus:shadow-none focus:outline-none focus:ring-0"
          />
        </div>

        {activeNav !== "home" && (
          <button
            type="button"
            onClick={onGoHome}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-700 transition-all hover:bg-white hover:shadow-sm"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
              <Home size={14} className="text-slate-500" />
            </span>
            <span className="text-xs font-semibold">Home</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleServices}
          className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-slate-700 transition-all hover:bg-white hover:shadow-sm"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
              <LayoutGrid size={14} className="text-slate-500" />
            </span>
            <span className="text-xs font-semibold">All services</span>
          </span>
          <ChevronDown
            size={14}
            className={cx(
              "text-slate-400 transition-transform",
              servicesOpen ? "rotate-180" : "rotate-0",
            )}
          />
        </button>

        <div className="mt-4">
          <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Pinned
          </div>
          {filteredPinned.length === 0 ? (
            <div className="mx-2 rounded-lg border border-dashed border-slate-200 bg-white/50 px-2 py-2 text-[10px] font-medium text-slate-500">
              Pin services you use often.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPinned.map((svc) => {
                const Icon = svc.icon;
                const active = activeNav === "service" && svc.key === activeServiceKey;
                const subpages = svc.subpages || getServiceSubpages(svc.key);
                const canExpand = subpages.length > 0;
                const expanded = isPinnedExpanded(svc.key);
                return (
                  <div key={svc.key} className="space-y-1">
                    <div
                      className={cx(
                        "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
                        active
                          ? "border-slate-200 bg-white text-slate-900 shadow-sm"
                          : "border-transparent text-slate-600 hover:bg-white hover:shadow-sm",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onServiceClick(svc)}
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
                          <Icon
                            size={14}
                            className={cx(active ? "text-indigo-600" : "text-slate-500")}
                          />
                        </span>
                        <span className="truncate text-xs font-semibold">{svc.title}</span>
                      </button>
                      <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
                        <PinButton
                          size="sm"
                          isPinned
                          onClick={(event) => {
                            event.stopPropagation();
                            onPinToggle?.(svc.key);
                          }}
                          title="Unpin service"
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRouteInNewTab(svc.route);
                          }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500 hover:text-slate-900"
                          title="Open in new tab"
                        >
                          <SquareArrowOutUpRight size={12} />
                        </button>
                        {canExpand ? (
                          <button
                            type="button"
                            onClick={() => togglePinnedExpanded(svc.key)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500 hover:text-slate-900"
                            title={expanded ? "Collapse subpages" : "Expand subpages"}
                          >
                            <ChevronDown
                              size={13}
                              className={cx(
                                "transition-transform",
                                expanded ? "rotate-0" : "-rotate-90",
                              )}
                            />
                          </button>
                        ) : (
                          <span className="inline-block h-6 w-6" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                    {canExpand && expanded ? (
                      <div className="space-y-1 pl-8">
                        {subpages.map((subpage) => (
                          <div
                            key={subpage.route}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onServiceClick({
                                  ...svc,
                                  route: subpage.route,
                                  title: subpage.label,
                                })
                              }
                              className="flex min-w-0 flex-1 items-center gap-2"
                            >
                              <ChevronDown size={12} className="-rotate-90 text-slate-300" />
                              <span className="truncate">{subpage.label}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openRouteInNewTab(subpage.route);
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 hover:text-slate-900"
                              title="Open in new tab"
                            >
                              <SquareArrowOutUpRight size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recently accessed
          </div>
          {filteredRecents.length === 0 ? (
            <div className="mx-2 rounded-lg border border-dashed border-slate-200 bg-white/50 px-2 py-2 text-[10px] font-medium text-slate-500">
              Open a service to start building recents.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRecents.map(({ svc }) => {
                const Icon = svc.icon;
                return (
                  <div
                    key={`recent-${svc.key}`}
                    className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-slate-600 transition-all hover:bg-white hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => onServiceClick(svc)}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
                        <Icon size={14} className="text-slate-500" />
                      </span>
                      <span className="truncate text-xs font-semibold">{svc.title}</span>
                    </button>
                    <span className="text-[9px] font-semibold uppercase tracking-tight text-slate-500">
                      RECENT
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto border-t border-slate-200 bg-white p-2">
        <button
          type="button"
          className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-700 transition-all hover:bg-rose-50 hover:text-rose-600"
          onClick={onLogout}
        >
          <LogOut size={16} className="text-slate-500 opacity-90 group-hover:text-rose-600" />
          <span className="text-xs font-semibold">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export default React.memo(MainSidebar);
