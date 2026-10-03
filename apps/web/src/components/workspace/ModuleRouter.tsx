"use client";

import React, { Suspense, lazy, useEffect } from "react";
import { useWorkspacePath } from "@/components/workspace/WorkspaceNav";
import PermissionGate from "@/components/security/PermissionGate";

const AgentsManagementPage = lazy(() => import("@/views/agents/AgentNewManagementPage"));
const SalesManagementPage = lazy(() => import("@/views/sales/SalesNewManagementPage"));
const SalesOutboundCallsPage = lazy(
  () => import("@/views/sales/SalesOutboundCallsPage"),
);
const AdminConsolePage = lazy(() => import("@/views/admin-console/AdminConsolePage"));

/** Warm common modules in the background so sidebar clicks feel instant. */
function usePrefetchModules() {
  useEffect(() => {
    const warm = () => {
      void import("@/views/agents/AgentNewManagementPage");
      void import("@/views/sales/SalesNewManagementPage");
      void import("@/views/sales/SalesOutboundCallsPage");
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = globalThis.setTimeout(warm, 800);
    return () => globalThis.clearTimeout(t);
  }, []);
}

function ModuleFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Loading…
    </div>
  );
}

function matchRoute(path: string): { perm?: string; node: React.ReactNode } {
  // Agents module routes
  if (
    path === "/" ||
    path === "/dashboard" ||
    path === "/agents" ||
    path.startsWith("/agents/") ||
    path === "/agent-new" ||
    path.startsWith("/agent-new/")
  ) {
    return { perm: "agents.show_menu", node: <AgentsManagementPage /> };
  }

  // Outbound Calls subpage under Sales
  if (path === "/sales/calls" || path.startsWith("/sales/calls/")) {
    return { perm: "campaigns.show_menu", node: <SalesOutboundCallsPage /> };
  }

  // Sales module routes
  if (
    path === "/sales" ||
    path.startsWith("/sales/") ||
    path === "/campaigns" ||
    path.startsWith("/campaigns/") ||
    path === "/sales-new" ||
    path.startsWith("/sales-new/")
  ) {
    return { perm: "campaigns.show_menu", node: <SalesManagementPage /> };
  }

  // Admin console routes
  if (path === "/admin" || path.startsWith("/admin/")) {
    return { perm: "adminconsole.show_menu", node: <AdminConsolePage /> };
  }

  return {
    node: (
      <div className="p-8 text-sm text-slate-500">
        Page not found for <code>{path}</code>
      </div>
    ),
  };
}

export default function ModuleRouter() {
  usePrefetchModules();
  const path = useWorkspacePath();
  const matched = matchRoute(path);

  return (
    <Suspense fallback={<ModuleFallback />}>
      {matched.perm ? (
        <PermissionGate permission={matched.perm}>{matched.node}</PermissionGate>
      ) : (
        matched.node
      )}
    </Suspense>
  );
}
