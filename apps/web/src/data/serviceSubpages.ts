/**
 * SEAM-compatible subpage taxonomy for product modules.
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
    { key: "flows", label: "Flows", route: "/flows", permission: "agents.read" },
  ],
  "customer-support": [
    { key: "calls", label: "Support calls", route: "/support", permission: "calls.read" },
    { key: "numbers", label: "Phone numbers", route: "/settings", permission: "settings.write" },
  ],
  sales: [
    { key: "list", label: "All sales", route: "/sales", permission: "campaigns.read" },
    { key: "new", label: "Create sale", route: "/sales/new", permission: "campaigns.create" },
    {
      key: "outbound-calls",
      label: "Outbound calls",
      route: "/sales/calls",
      permission: "calls.read",
    },
    {
      key: "import",
      label: "Import contacts",
      route: "/contacts/import",
      permission: "contacts.write",
    },
  ],
  whatsapp: [
    { key: "setup", label: "Setup", route: "/whatsapp", permission: "agents.read" },
  ],
  // Legacy aliases kept for old bookmarks
  campaigns: [
    { key: "list", label: "All sales", route: "/sales", permission: "campaigns.read" },
    { key: "new", label: "Create sale", route: "/sales/new", permission: "campaigns.create" },
  ],
  contacts: [
    { key: "list", label: "Directory", route: "/sales", permission: "contacts.read" },
  ],
  calls: [
    { key: "list", label: "Support calls", route: "/support", permission: "calls.read" },
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
