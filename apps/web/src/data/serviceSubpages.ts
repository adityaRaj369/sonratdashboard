/**
 * Subpage taxonomy for enabled product modules.
 * Note: Create actions are exclusively handled by the top-right header action button and slide-over drawers.
 */
export type ServiceSubpage = {
  key: string;
  label: string;
  route: string;
  permission?: string;
};

export const SERVICE_SUBPAGES: Record<string, ServiceSubpage[]> = {
  agents: [
    { key: "list", label: "Agents", route: "/agents", permission: "agents.read" },
  ],
  sales: [
    { key: "list", label: "Sales", route: "/sales", permission: "campaigns.read" },
    {
      key: "outbound-calls",
      label: "Outbound calls",
      route: "/sales/calls",
      permission: "calls.read",
    },
  ],
  campaigns: [
    { key: "list", label: "Sales", route: "/sales", permission: "campaigns.read" },
  ],
  "admin-console": [
    { key: "console", label: "ACL & roles", route: "/admin", permission: "adminconsole.show_menu" },
  ],
};

export function getServiceSubpages(serviceKey: string): ServiceSubpage[] {
  return SERVICE_SUBPAGES[serviceKey] ?? [];
}
