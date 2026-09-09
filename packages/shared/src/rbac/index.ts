export const ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "AGENT_MANAGER",
  "ANALYST",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Permission keys follow SEAM/max-casino taxonomy:
 *   <domain>.show_menu | <domain>.<action>
 * Existing Sonrat keys (agents.read, …) are kept for API compatibility.
 */
export const PERMISSIONS = [
  // Menu visibility (SEAM-style)
  "agents.show_menu",
  "campaigns.show_menu",
  "contacts.show_menu",
  "calls.show_menu",
  "analytics.show_menu",
  "settings.show_menu",
  "adminconsole.show_menu",
  "taxonomy.show_menu",
  // Agents
  "agents.read",
  "agents.write",
  "agents.publish",
  "agents.create",
  "agents.edit",
  "agents.delete",
  // Campaigns
  "campaigns.read",
  "campaigns.write",
  "campaigns.start",
  "campaigns.pause",
  "campaigns.create",
  "campaigns.edit",
  "campaigns.delete",
  // Contacts
  "contacts.read",
  "contacts.write",
  "contacts.create",
  "contacts.edit",
  "contacts.delete",
  // Calls / analytics / settings
  "calls.read",
  "analytics.read",
  "settings.write",
  "billing.read",
  "phone_numbers.read",
  "phone_numbers.write",
  "leads.read",
  "leads.write",
  // Users / ACL admin (SEAM User Management)
  "users.read",
  "users.write",
  "user.administer_users",
  "user.administer_roles_permissions",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = PERMISSIONS;

const BASE_OPERATOR: Permission[] = [
  "agents.show_menu",
  "campaigns.show_menu",
  "contacts.show_menu",
  "calls.show_menu",
  "analytics.show_menu",
  "agents.read",
  "agents.write",
  "agents.publish",
  "agents.create",
  "agents.edit",
  "campaigns.read",
  "campaigns.write",
  "campaigns.start",
  "campaigns.pause",
  "campaigns.create",
  "campaigns.edit",
  "contacts.read",
  "contacts.write",
  "contacts.create",
  "contacts.edit",
  "calls.read",
  "analytics.read",
  "phone_numbers.read",
  "leads.read",
  "leads.write",
  "users.read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "billing.read"),
  MANAGER: [
    ...BASE_OPERATOR,
    "settings.show_menu",
    "settings.write",
    "phone_numbers.write",
    "contacts.delete",
  ],
  AGENT_MANAGER: [
    "agents.show_menu",
    "campaigns.show_menu",
    "contacts.show_menu",
    "calls.show_menu",
    "analytics.show_menu",
    "agents.read",
    "agents.write",
    "agents.publish",
    "agents.create",
    "agents.edit",
    "campaigns.read",
    "contacts.read",
    "calls.read",
    "analytics.read",
    "leads.read",
  ],
  ANALYST: [
    "agents.show_menu",
    "campaigns.show_menu",
    "contacts.show_menu",
    "calls.show_menu",
    "analytics.show_menu",
    "agents.read",
    "campaigns.read",
    "contacts.read",
    "calls.read",
    "analytics.read",
    "leads.read",
  ],
  MEMBER: [
    "agents.show_menu",
    "campaigns.show_menu",
    "contacts.show_menu",
    "calls.show_menu",
    "agents.read",
    "campaigns.read",
    "contacts.read",
    "calls.read",
    "leads.read",
  ],
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canPermission(
  granted: Iterable<string> | null | undefined,
  permission: string,
): boolean {
  if (!permission) return true;
  if (!granted) return false;
  const set = granted instanceof Set ? granted : new Set(granted);
  return set.has(permission);
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role ${role} lacks permission ${permission}`);
  }
}
