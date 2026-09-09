"use client";

import React, { Suspense, lazy, useEffect } from "react";
import { useWorkspacePath } from "@/components/workspace/WorkspaceNav";
import PermissionGate from "@/components/security/PermissionGate";

const DashboardPage = lazy(() => import("@/views/dashboard/DashboardPage"));
const AgentsPage = lazy(() => import("@/views/agents/AgentsPage"));
const AgentDetailPage = lazy(() => import("@/views/agents/AgentDetailPage"));
const AgentSectionPage = lazy(() => import("@/views/agents/AgentSectionPage"));
const CampaignsPage = lazy(() => import("@/views/campaigns/CampaignsPage"));
const CampaignCreatePage = lazy(() => import("@/views/campaigns/CampaignCreatePage"));
const CampaignDetailPage = lazy(() => import("@/views/campaigns/CampaignDetailPage"));
const CampaignContactsPage = lazy(() => import("@/views/campaigns/CampaignContactsPage"));
const CampaignCallsPage = lazy(() => import("@/views/campaigns/CampaignCallsPage"));
const CampaignResultsPage = lazy(() => import("@/views/campaigns/CampaignResultsPage"));
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
      void import("@/views/campaigns/CampaignsPage");
      void import("@/views/contacts/ContactsPage");
      void import("@/views/calls/CallsPage");
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

function matchRoute(path: string): { perm?: string; node: React.ReactNode } {
  if (path === "/" || path === "/dashboard") {
    return { node: <DashboardPage /> };
  }
  if (path === "/agents") {
    return { perm: "agents.show_menu", node: <AgentsPage /> };
  }
  if (/^\/agents\/[^/]+\/[^/]+/.test(path)) {
    return { perm: "agents.show_menu", node: <AgentSectionPage /> };
  }
  if (/^\/agents\/[^/]+$/.test(path)) {
    return { perm: "agents.show_menu", node: <AgentDetailPage /> };
  }
  if (path === "/campaigns") {
    return { perm: "campaigns.show_menu", node: <CampaignsPage /> };
  }
  if (path === "/campaigns/new") {
    return { perm: "campaigns.show_menu", node: <CampaignCreatePage /> };
  }
  if (/^\/campaigns\/[^/]+\/contacts$/.test(path)) {
    return { perm: "campaigns.show_menu", node: <CampaignContactsPage /> };
  }
  if (/^\/campaigns\/[^/]+\/calls$/.test(path)) {
    return { perm: "campaigns.show_menu", node: <CampaignCallsPage /> };
  }
  if (/^\/campaigns\/[^/]+\/results$/.test(path)) {
    return { perm: "campaigns.show_menu", node: <CampaignResultsPage /> };
  }
  if (/^\/campaigns\/[^/]+$/.test(path)) {
    return { perm: "campaigns.show_menu", node: <CampaignDetailPage /> };
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
  if (path === "/admin") {
    return { perm: "adminconsole.show_menu", node: <AdminConsolePage /> };
  }
  return { node: <DashboardPage /> };
}

/** Instant SPA module switcher â€” lazy chunks cached after first open. */
export default function ModuleRouter() {
  const path = useWorkspacePath();
  const matched = matchRoute(path);
  usePrefetchModules();
  return (
    <PermissionGate permission={matched.perm}>
      <Suspense fallback={<ModuleFallback />}>{matched.node}</Suspense>
    </PermissionGate>
  );
}
