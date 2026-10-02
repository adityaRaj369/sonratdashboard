"use client";

import React, { Suspense, lazy, useEffect } from "react";
import { useWorkspacePath } from "@/components/workspace/WorkspaceNav";
import PermissionGate from "@/components/security/PermissionGate";

const DashboardPage = lazy(() => import("@/views/dashboard/DashboardPage"));
const AgentsPage = lazy(() => import("@/views/agents/AgentsPage"));
const AgentCreatePage = lazy(() => import("@/views/agents/AgentCreatePage"));
const AgentDetailPage = lazy(() => import("@/views/agents/AgentDetailPage"));
const AgentSectionPage = lazy(() => import("@/views/agents/AgentSectionPage"));
const CampaignsPage = lazy(() => import("@/views/campaigns/CampaignsPage"));
const CampaignCreatePage = lazy(() => import("@/views/campaigns/CampaignCreatePage"));
const CampaignDetailPage = lazy(() => import("@/views/campaigns/CampaignDetailPage"));
const CampaignContactsPage = lazy(() => import("@/views/campaigns/CampaignContactsPage"));
const CampaignCallsPage = lazy(() => import("@/views/campaigns/CampaignCallsPage"));
const CampaignResultsPage = lazy(() => import("@/views/campaigns/CampaignResultsPage"));
const SupportCallsPage = lazy(() => import("@/views/support/SupportCallsPage"));
const SupportCallDetailPage = lazy(() => import("@/views/support/SupportCallDetailPage"));
const WhatsAppPage = lazy(() => import("@/views/whatsapp/WhatsAppPage"));
const SalesOutboundCallsPage = lazy(
  () => import("@/views/sales/SalesOutboundCallsPage"),
);
const AgentFlowsPage = lazy(() => import("@/views/flows/AgentFlowsPage"));
const AgentFlowDetailPage = lazy(() => import("@/views/flows/AgentFlowDetailPage"));
const ContactsPage = lazy(() => import("@/views/contacts/ContactsPage"));
const ContactsImportPage = lazy(() => import("@/views/contacts/ContactsImportPage"));
const CallsPage = lazy(() => import("@/views/calls/CallsPage"));
const CallDetailPage = lazy(() => import("@/views/calls/CallDetailPage"));
const AnalyticsPage = lazy(() => import("@/views/analytics/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/views/settings/SettingsPage"));
const AdminConsolePage = lazy(() => import("@/views/admin-console/AdminConsolePage"));

/** Warm common modules in the background so sidebar clicks feel instant. */
function usePrefetchModules() {
  useEffect(() => {
    const warm = () => {
      void import("@/views/dashboard/DashboardPage");
      void import("@/views/agents/AgentsPage");
      void import("@/views/agents/AgentCreatePage");
      void import("@/views/campaigns/CampaignsPage");
      void import("@/views/support/SupportCallsPage");
      void import("@/views/whatsapp/WhatsAppPage");
      void import("@/views/analytics/AnalyticsPage");
      void import("@/views/settings/SettingsPage");
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

/** Map /sales/* → campaign engine routes (same dialer, Sales product name). */
function salesToCampaignPath(path: string): string {
  if (path === "/sales" || path === "/sales/") return "/campaigns";
  if (path.startsWith("/sales/")) return path.replace(/^\/sales/, "/campaigns");
  return path;
}

function matchRoute(path: string): { perm?: string; node: React.ReactNode } {
  if (path === "/" || path === "/dashboard") {
    return { node: <DashboardPage /> };
  }
  if (path === "/agents") {
    return { perm: "agents.show_menu", node: <AgentsPage /> };
  }
  if (path === "/agents/new") {
    return { perm: "agents.show_menu", node: <AgentCreatePage /> };
  }
  if (/^\/agents\/[^/]+\/[^/]+/.test(path)) {
    return { perm: "agents.show_menu", node: <AgentSectionPage /> };
  }
  if (/^\/agents\/[^/]+$/.test(path)) {
    return { perm: "agents.show_menu", node: <AgentDetailPage /> };
  }

  if (path === "/support") {
    return { perm: "calls.show_menu", node: <SupportCallsPage /> };
  }
  if (/^\/support\/[^/]+$/.test(path)) {
    return { perm: "calls.show_menu", node: <SupportCallDetailPage /> };
  }

  if (path === "/whatsapp") {
    return { perm: "agents.show_menu", node: <WhatsAppPage /> };
  }

  if (path === "/flows") {
    return { perm: "agents.show_menu", node: <AgentFlowsPage /> };
  }
  if (/^\/flows\/[^/]+$/.test(path)) {
    return { perm: "agents.show_menu", node: <AgentFlowDetailPage /> };
  }

  if (path === "/sales/calls") {
    return { perm: "campaigns.show_menu", node: <SalesOutboundCallsPage /> };
  }

  // Sales product surface (reuses campaign dialer — do not delete campaign jobs)
  const salesMapped = salesToCampaignPath(path);
  if (path.startsWith("/sales") || path.startsWith("/campaigns")) {
    const p = salesMapped;
    if (p === "/campaigns") {
      return { perm: "campaigns.show_menu", node: <CampaignsPage /> };
    }
    if (p === "/campaigns/new") {
      return { perm: "campaigns.show_menu", node: <CampaignCreatePage /> };
    }
    if (/^\/campaigns\/[^/]+\/contacts$/.test(p)) {
      return { perm: "campaigns.show_menu", node: <CampaignContactsPage /> };
    }
    if (/^\/campaigns\/[^/]+\/calls$/.test(p)) {
      return { perm: "campaigns.show_menu", node: <CampaignCallsPage /> };
    }
    if (/^\/campaigns\/[^/]+\/results$/.test(p)) {
      return { perm: "campaigns.show_menu", node: <CampaignResultsPage /> };
    }
    if (/^\/campaigns\/[^/]+$/.test(p)) {
      return { perm: "campaigns.show_menu", node: <CampaignDetailPage /> };
    }
  }

  if (path === "/contacts") {
    return { perm: "contacts.show_menu", node: <ContactsPage /> };
  }
  if (path === "/contacts/import") {
    return { perm: "contacts.show_menu", node: <ContactsImportPage /> };
  }
  if (path === "/calls") {
    return { perm: "calls.show_menu", node: <CallsPage /> };
  }
  if (/^\/calls\/[^/]+$/.test(path)) {
    return { perm: "calls.show_menu", node: <CallDetailPage /> };
  }
  if (path === "/analytics") {
    return { perm: "analytics.show_menu", node: <AnalyticsPage /> };
  }
  if (path === "/settings") {
    return { perm: "settings.show_menu", node: <SettingsPage /> };
  }
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
