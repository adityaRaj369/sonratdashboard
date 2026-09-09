import type { LucideIcon } from "lucide-react";

export type ModuleNavItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  permissions?: string[];
};

export type ModuleDefinition = {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  permissions?: string[];
  section?: string;
  order?: number;
  navigation?: ModuleNavItem[];
  featureFlag?: string;
};

const modules = new Map<string, ModuleDefinition>();

export function registerModule(definition: ModuleDefinition) {
  modules.set(definition.id, definition);
  return definition;
}

export function getModules() {
  return Array.from(modules.values()).sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100),
  );
}

export function getModule(id: string) {
  return modules.get(id);
}

export function getSidebarItems(permissions: string[] = []) {
  return getModules().filter((mod) => {
    if (!mod.permissions?.length) return true;
    return mod.permissions.some((p) => permissions.includes(p));
  });
}
