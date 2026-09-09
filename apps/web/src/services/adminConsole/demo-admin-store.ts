/**
 * LocalStorage-backed demo admin store — same UX as the SEAM reference demo
 * when Sonrat APIs lack full user/role/permission/taxonomy/audit parity.
 */
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES, type Role } from "@sonrat/shared";

const STORAGE_KEY = "sonrat.admin-console.demo.v1";

export type DemoUser = {
  uid: string;
  username: string;
  useremail: string;
  password?: string;
  role_ids: string[];
  is_blocked: boolean;
  avatar?: string;
};

export type DemoRole = {
  role_id: string;
  role_name: string;
  description: string;
};

export type DemoCatalog = {
  _id: string;
  id: string;
  title: string;
  description: string;
  catalogKey: string;
  internalId: string;
};

export type DemoTermPair = { key: string; value: unknown; type?: string };

export type DemoTerm = {
  _id: string;
  id: string;
  label: string;
  description: string;
  key?: string;
  pairs: DemoTermPair[];
};

export type DemoAuditEntry = {
  id: string;
  timestamp: string;
  timestampUtc: string;
  user: string;
  userEmail: string;
  scope: string;
  action: string;
  details: string;
  pagePath?: string;
  module?: string;
  before?: unknown;
  after?: unknown;
};

export type DemoStoreState = {
  users: DemoUser[];
  roles: DemoRole[];
  /** compound key `${roleId}::${permissionKey}` → allowed */
  matrix: Record<string, boolean>;
  catalogs: DemoCatalog[];
  termsByCatalog: Record<string, DemoTerm[]>;
  audit: DemoAuditEntry[];
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function seedMatrix(): Record<string, boolean> {
  const matrix: Record<string, boolean> = {};
  for (const role of ROLES) {
    const granted = new Set(ROLE_PERMISSIONS[role as Role] || []);
    for (const key of PERMISSIONS) {
      matrix[`${role}::${key}`] = granted.has(key);
    }
  }
  return matrix;
}

function seedState(): DemoStoreState {
  const roles: DemoRole[] = ROLES.map((role) => ({
    role_id: role,
    role_name: role,
    description:
      role === "OWNER"
        ? "Full organization ownership"
        : role === "ADMIN"
          ? "Administrative access to Sonrat modules"
          : role === "MANAGER"
            ? "Operate agents, campaigns, and contacts"
            : role === "AGENT_MANAGER"
              ? "Manage agents and related campaigns"
              : role === "ANALYST"
                ? "Read-only analytics and reporting"
                : "Standard member access",
  }));

  const users: DemoUser[] = [
    {
      uid: "usr_owner",
      username: "Alex Owner",
      useremail: "owner@sonrat.io",
      role_ids: ["OWNER"],
      is_blocked: false,
      avatar: "AO",
    },
    {
      uid: "usr_admin",
      username: "Sam Admin",
      useremail: "admin@sonrat.io",
      role_ids: ["ADMIN"],
      is_blocked: false,
      avatar: "SA",
    },
    {
      uid: "usr_manager",
      username: "Morgan Manager",
      useremail: "manager@sonrat.io",
      role_ids: ["MANAGER"],
      is_blocked: false,
      avatar: "MM",
    },
    {
      uid: "usr_analyst",
      username: "Casey Analyst",
      useremail: "analyst@sonrat.io",
      role_ids: ["ANALYST", "MEMBER"],
      is_blocked: false,
      avatar: "CA",
    },
  ];

  const catalogs: DemoCatalog[] = [
    {
      _id: "cat_agents",
      id: "cat_agents",
      title: "Agents",
      description: "Voice agent definitions and publish pipeline",
      catalogKey: "AGENTS",
      internalId: "AGENTS",
    },
    {
      _id: "cat_campaigns",
      id: "cat_campaigns",
      title: "Campaigns",
      description: "Outbound campaign orchestration",
      catalogKey: "CAMPAIGNS",
      internalId: "CAMPAIGNS",
    },
    {
      _id: "cat_contacts",
      id: "cat_contacts",
      title: "Contacts",
      description: "Contact directory and list imports",
      catalogKey: "CONTACTS",
      internalId: "CONTACTS",
    },
  ];

  const termsByCatalog: Record<string, DemoTerm[]> = {
    cat_agents: [
      {
        _id: "term_agent_status",
        id: "term_agent_status",
        label: "Agent Status",
        description: "Lifecycle states for agents",
        key: "AGENT_STATUS",
        pairs: [
          { key: "DRAFT", value: "Draft", type: "string" },
          { key: "PUBLISHED", value: "Published", type: "string" },
        ],
      },
    ],
    cat_campaigns: [
      {
        _id: "term_campaign_state",
        id: "term_campaign_state",
        label: "Campaign State",
        description: "Runtime campaign states",
        key: "CAMPAIGN_STATE",
        pairs: [
          { key: "RUNNING", value: "Running", type: "string" },
          { key: "PAUSED", value: "Paused", type: "string" },
        ],
      },
    ],
    cat_contacts: [],
  };

  const now = new Date().toISOString();
  const audit: DemoAuditEntry[] = [
    {
      id: "aud_seed_1",
      timestamp: now.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"),
      timestampUtc: now,
      user: "Sam Admin",
      userEmail: "admin@sonrat.io",
      scope: "Roles",
      action: "Modified",
      details: "Updated MANAGER role permissions",
      pagePath: "Admin Console",
      module: "Admin Console",
      before: { role: "MANAGER", permission: "settings.write", allowed: false },
      after: { role: "MANAGER", permission: "settings.write", allowed: true },
    },
    {
      id: "aud_seed_2",
      timestamp: now.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"),
      timestampUtc: now,
      user: "Alex Owner",
      userEmail: "owner@sonrat.io",
      scope: "Users",
      action: "Created",
      details: "Created demo analyst user",
      pagePath: "Role & User Management",
      module: "Users",
      after: { username: "Casey Analyst", role_ids: ["ANALYST", "MEMBER"] },
    },
  ];

  return {
    users,
    roles,
    matrix: seedMatrix(),
    catalogs,
    termsByCatalog,
    audit,
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadDemoStore(): DemoStoreState {
  if (!canUseStorage()) return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as DemoStoreState;
    if (!parsed?.users || !parsed?.roles || !parsed?.matrix) {
      const seeded = seedState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = seedState();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch {
      /* ignore */
    }
    return seeded;
  }
}

export function saveDemoStore(state: DemoStoreState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function mutateDemoStore(mutator: (state: DemoStoreState) => void): DemoStoreState {
  const state = loadDemoStore();
  mutator(state);
  saveDemoStore(state);
  return state;
}

export function pushAudit(
  state: DemoStoreState,
  entry: Omit<DemoAuditEntry, "id" | "timestamp" | "timestampUtc"> & {
    id?: string;
    timestamp?: string;
    timestampUtc?: string;
  },
) {
  const now = new Date().toISOString();
  state.audit.unshift({
    id: entry.id || uid("aud"),
    timestampUtc: entry.timestampUtc || now,
    timestamp:
      entry.timestamp ||
      now.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"),
    user: entry.user,
    userEmail: entry.userEmail,
    scope: entry.scope,
    action: entry.action,
    details: entry.details,
    pagePath: entry.pagePath,
    module: entry.module,
    before: entry.before,
    after: entry.after,
  });
}

export function buildAssignments(state: DemoStoreState) {
  const assignments: Record<string, { count: number; users: Array<{ id: string; name: string; email: string; disabled: boolean }> }> = {};
  for (const role of state.roles) {
    assignments[role.role_id] = { count: 0, users: [] };
  }
  for (const user of state.users) {
    for (const roleId of user.role_ids || []) {
      if (!assignments[roleId]) assignments[roleId] = { count: 0, users: [] };
      assignments[roleId].users.push({
        id: user.uid,
        name: user.username,
        email: user.useremail,
        disabled: !!user.is_blocked,
      });
    }
  }
  Object.values(assignments).forEach((entry) => {
    entry.users.sort((a, b) => a.name.localeCompare(b.name));
    entry.count = entry.users.length;
  });
  return assignments;
}

export { uid, STORAGE_KEY };
