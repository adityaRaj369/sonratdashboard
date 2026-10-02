import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  GitBranch,
  Headset,
  Megaphone,
  MessageCircle,
  Settings,
  UserCog,
} from "lucide-react";
import { SERVICE_SUBPAGES } from "./serviceSubpages";

/**
 * Product modules for company dashboards:
 * Agents (train) → Support / Sales / WhatsApp (use agents)
 */
export interface ServiceDefinition {
  key: string;
  title: string;
  route: string;
  icon: LucideIcon;
  description: string;
  permission?: string;
  group: string;
  subpages?: Array<{ key: string; label: string; route: string; permission?: string }>;
}

const services: ServiceDefinition[] = [
  {
    key: "agents",
    title: "Agents",
    route: "/agents",
    icon: Bot,
    description: "Train AI agents with company knowledge",
    permission: "agents.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.agents,
  },
  {
    key: "flows",
    title: "Flows",
    route: "/flows",
    icon: GitBranch,
    description: "Conversation graphs for agents",
    permission: "agents.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.flows,
  },
  {
    key: "customer-support",
    title: "Customer Support",
    route: "/support",
    icon: Headset,
    description: "Inbound support calls and conversations",
    permission: "calls.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES["customer-support"],
  },
  {
    key: "sales",
    title: "Sales",
    route: "/sales",
    icon: Megaphone,
    description: "Bulk outbound sales calls from uploaded lists",
    permission: "campaigns.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.sales,
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    route: "/whatsapp",
    icon: MessageCircle,
    description: "Connect WhatsApp and map a trained agent",
    permission: "agents.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.whatsapp,
  },
  {
    key: "analytics",
    title: "Analytics",
    route: "/analytics",
    icon: BarChart3,
    description: "Performance charts and outcomes",
    permission: "analytics.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.analytics,
  },
  {
    key: "settings",
    title: "Settings",
    route: "/settings",
    icon: Settings,
    description: "Org, phones, members, environment",
    permission: "settings.show_menu",
    group: "Administration",
    subpages: SERVICE_SUBPAGES.settings,
  },
  {
    key: "admin-console",
    title: "Admin Console",
    route: "/admin",
    icon: UserCog,
    description: "Users, roles, ACL, taxonomy, audit",
    permission: "adminconsole.show_menu",
    group: "Administration",
    subpages: SERVICE_SUBPAGES["admin-console"],
  },
];

export const HOME_ROUTE = "/dashboard";

export default services;

export function getServiceByKey(key: string): ServiceDefinition | undefined {
  return services.find((s) => s.key === key);
}

export function resolveServiceFromPath(pathname: string): ServiceDefinition | undefined {
  const ranked = [...services].sort((a, b) => b.route.length - a.route.length);
  return ranked.find(
    (svc) => pathname === svc.route || pathname.startsWith(`${svc.route}/`),
  );
}

export function getServicesForPermissions(
  can: (permission: string) => boolean,
): ServiceDefinition[] {
  return services.filter((svc) => !svc.permission || can(svc.permission));
}
