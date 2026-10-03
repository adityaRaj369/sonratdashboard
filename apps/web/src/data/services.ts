import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Megaphone,
  UserCog,
} from "lucide-react";
import { SERVICE_SUBPAGES } from "./serviceSubpages";

/**
 * Product modules enabled in the production dashboard shell.
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
    key: "admin-console",
    title: "Admin Console",
    route: "/admin",
    icon: UserCog,
    description: "Manage roles, permissions, and organization access",
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
