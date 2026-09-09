"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, SquareArrowOutUpRight } from "lucide-react";
import PinButton from "@/components/ui/PinButton";
import { getServiceSubpages } from "@/data/serviceSubpages";
import type { ServiceDefinition } from "@/data/services";
import {
  getServiceSearchTargets,
} from "@/hooks/workspace/useServiceSearch";

/** SEAM ServiceBrowserDrawer — select via onSelectService (navigate), not Link. */
export default function ServiceBrowserDrawer({
  open,
  serviceQuery,
  groupedServices,
  pinnedKeys = [],
  onPinToggle,
  onSelectService,
  onClose,
  drawerWidth = 240,
  sidebarOffset = 256,
  can,
}: {
  open: boolean;
  serviceQuery?: string;
  groupedServices: Array<[string, ServiceDefinition[]]>;
  pinnedKeys?: string[];
  onPinToggle?: (key: string) => void;
  onSelectService?: (svc: ServiceDefinition) => void;
  onClose?: () => void;
  drawerWidth?: number;
  sidebarOffset?: number;
  can?: (permission: string) => boolean;
}) {
  const allowService = useCallback(
    (svc?: ServiceDefinition | null) =>
      !svc?.permission || (typeof can === "function" && can(svc.permission)),
    [can],
  );
  const [expandedServiceKeys, setExpandedServiceKeys] = useState(() => new Set<string>());
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchResultRefs = useRef(new Map<string, HTMLElement>());
  const normalizedQuery = String(serviceQuery || "").trim();

  const searchTargets = useMemo(() => {
    if (!normalizedQuery) return [];
    return groupedServices.flatMap(([, items]) =>
      items
        .filter((svc) => allowService(svc))
        .flatMap((svc) => getServiceSearchTargets(svc, normalizedQuery)),
    );
  }, [allowService, groupedServices, normalizedQuery]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [normalizedQuery, searchTargets.length]);

  useEffect(() => {
    if (!open) return undefined;
    const openActiveTarget = () => {
      if (!normalizedQuery) return;
      const activeTarget = searchTargets[activeSearchIndex] || searchTargets[0];
      if (!activeTarget?.target) return;
      onSelectService?.(activeTarget.target);
      onClose?.();
    };
    const handleForwardedSearchKey = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key || !["ArrowDown", "ArrowUp", "Enter"].includes(key)) return;
      if (!normalizedQuery || !searchTargets.length) {
        if (key === "Enter") openActiveTarget();
        return;
      }
      if (key === "ArrowDown") {
        setActiveSearchIndex((current) => (current + 1) % searchTargets.length);
        return;
      }
      if (key === "ArrowUp") {
        setActiveSearchIndex(
          (current) => (current - 1 + searchTargets.length) % searchTargets.length,
        );
        return;
      }
      if (key === "Enter") openActiveTarget();
    };
    window.addEventListener("seam-service-search-key", handleForwardedSearchKey);
    return () => window.removeEventListener("seam-service-search-key", handleForwardedSearchKey);
  }, [activeSearchIndex, normalizedQuery, onClose, onSelectService, open, searchTargets]);

  if (!open) return null;

  const toggleExpanded = (key: string) => {
    setExpandedServiceKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openRouteInNewTab = (route?: string) => {
    if (!route || typeof window === "undefined") return;
    const target = route.startsWith("http") ? route : `${window.location.origin}${route}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="pointer-events-auto absolute bottom-0 right-0 top-0"
        style={{ left: `${sidebarOffset}px` }}
        onClick={onClose}
      />
      <aside
        className="pointer-events-auto fixed bottom-2 top-2 z-[70] flex flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-xl"
        style={{ left: `${sidebarOffset}px`, width: `${drawerWidth}px` }}
      >
        <div className="border-b border-slate-100 px-3 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            All services
          </div>
        </div>
        <div className="flex-1 overflow-auto px-2 py-3">
          {groupedServices.map(([group, items]) => {
            const visibleItems = items.filter((svc) => allowService(svc));
            if (!visibleItems.length) return null;
            return (
              <div key={group} className="pb-3">
                <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {group}
                </p>
                <div className="mt-1 space-y-1">
                  {visibleItems.map((svc) => {
                    const Icon = svc.icon;
                    const subpages = svc.subpages || getServiceSubpages(svc.key);
                    const canExpand = subpages.length > 1;
                    const expanded = expandedServiceKeys.has(svc.key);
                    return (
                      <div
                        key={svc.key}
                        className="rounded-lg border border-slate-100 bg-white shadow-sm transition-all hover:border-slate-200"
                      >
                        <div className="flex h-[44px] w-full items-center gap-1.5 px-2 py-1 pr-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectService?.(svc);
                              onClose?.();
                            }}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
                              <Icon size={13} className="text-slate-500" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-semibold leading-tight text-slate-900">
                                {svc.title}
                              </span>
                              <span className="block truncate text-[8px] font-medium leading-tight text-slate-400">
                                {svc.description}
                              </span>
                            </div>
                          </button>
                          <PinButton
                            size="sm"
                            isPinned={pinnedKeys.includes(svc.key)}
                            onClick={() => onPinToggle?.(svc.key)}
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRouteInNewTab(svc.route);
                            }}
                            className="flex h-5 w-5 items-center justify-center text-slate-500 hover:text-slate-900"
                          >
                            <SquareArrowOutUpRight size={11} />
                          </button>
                          {canExpand ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(svc.key)}
                              className="flex h-5 w-5 items-center justify-center text-slate-500"
                            >
                              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            <span className="inline-block h-5 w-5" />
                          )}
                        </div>
                        {canExpand && expanded
                          ? subpages.map((item) => (
                              <button
                                key={item.route}
                                type="button"
                                onClick={() => {
                                  onSelectService?.({
                                    ...svc,
                                    route: item.route,
                                    title: item.label,
                                  });
                                  onClose?.();
                                }}
                                className="flex w-full items-center gap-2 px-2 py-1 pl-7 text-left text-[12px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <ChevronRight size={12} className="text-slate-300" />
                                <span className="truncate">{item.label}</span>
                              </button>
                            ))
                          : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
