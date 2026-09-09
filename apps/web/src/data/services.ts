import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Megaphone,
  PhoneCall,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { SERVICE_SUBPAGES } from "./serviceSubpages";

/**
 * SEAM-compatible service registry.
 * Home is NOT a service — it is a separate sidebar action (like max-casino `/`).
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
    description: "Configure and publish voice agents",
    permission: "agents.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.agents,
  },
  {
    key: "campaigns",
    title: "Campaigns",
    route: "/campaigns",
    icon: Megaphone,
    description: "Outbound campaign orchestration",
    permission: "campaigns.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.campaigns,
  },
  {
    key: "contacts",
    title: "Contacts",
    route: "/contacts",
    icon: Users,
    description: "Contact directory and imports",
    permission: "contacts.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.contacts,
  },
  {
    key: "calls",
    title: "Calls",
    route: "/calls",
    icon: PhoneCall,
    description: "Live and historical call records",
    permission: "calls.show_menu",
    group: "Workspace",
    subpages: SERVICE_SUBPAGES.calls,
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
