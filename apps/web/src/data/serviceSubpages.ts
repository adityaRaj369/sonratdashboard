/**
 * SEAM-compatible subpage taxonomy (mirrors serviceSubpages.js).
 */
export type ServiceSubpage = {
  key: string;
  label: string;
  route: string;
  permission?: string;
};

export const SERVICE_SUBPAGES: Record<string, ServiceSubpage[]> = {
  agents: [
    { key: "list", label: "All agents", route: "/agents", permission: "agents.read" },
  ],
  campaigns: [
    { key: "list", label: "All campaigns", route: "/campaigns", permission: "campaigns.read" },
    { key: "new", label: "Create campaign", route: "/campaigns/new", permission: "campaigns.create" },
  ],
  contacts: [
    { key: "list", label: "Directory", route: "/contacts", permission: "contacts.read" },
    { key: "import", label: "Import", route: "/contacts/import", permission: "contacts.write" },
  ],
  calls: [
    { key: "list", label: "All calls", route: "/calls", permission: "calls.read" },
  ],
  analytics: [
    { key: "overview", label: "Overview", route: "/analytics", permission: "analytics.read" },
  ],
  settings: [
    { key: "org", label: "Organization", route: "/settings", permission: "settings.write" },
  ],
  "admin-console": [
    { key: "console", label: "ACL & roles", route: "/admin", permission: "adminconsole.show_menu" },
  ],
};

export function getServiceSubpages(serviceKey: string): ServiceSubpage[] {
  return SERVICE_SUBPAGES[serviceKey] ?? [];
}
