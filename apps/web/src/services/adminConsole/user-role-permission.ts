import {
  buildAssignments,
  loadDemoStore,
  mutateDemoStore,
  pushAudit,
  uid,
  type DemoUser,
} from "./demo-admin-store";

export type UserListPayload = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
};

function paginate<T>(items: T[], page = 1, limit = 10) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  };
}

export const userService = {
  async getAllUsers(payload: UserListPayload = {}) {
    const state = loadDemoStore();
    let users = [...state.users];
    const name = payload.name?.trim().toLowerCase();
    const email = payload.email?.trim().toLowerCase();
    if (name) users = users.filter((u) => u.username.toLowerCase().includes(name));
    if (email) users = users.filter((u) => u.useremail.toLowerCase().includes(email));
    const { data, pagination } = paginate(users, payload.page || 1, payload.limit || 10);
    return { success: true, data, pagination, total: pagination.total };
  },

  async createUser(payload: {
    username: string;
    useremail: string;
    password?: string;
    role_ids?: string[];
  }) {
    let created: DemoUser | null = null;
    mutateDemoStore((state) => {
      created = {
        uid: uid("usr"),
        username: payload.username,
        useremail: payload.useremail,
        password: payload.password,
        role_ids: payload.role_ids?.length ? payload.role_ids : ["MEMBER"],
        is_blocked: false,
        avatar: payload.username
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };
      state.users.unshift(created);
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Users",
        action: "Created",
        details: `Created user ${created.username}`,
        pagePath: "Role & User Management",
        module: "Users",
        after: created,
      });
    });
    return { success: true, data: created };
  },

  async updateUser(
    userId: string,
    payload: {
      username?: string;
      useremail?: string;
      is_blocked?: boolean;
      role_ids?: string[];
      password?: string;
      currentPassword?: string;
    },
  ) {
    mutateDemoStore((state) => {
      const user = state.users.find((u) => u.uid === userId);
      if (!user) throw new Error("User not found");
      const before = { ...user };
      if (payload.username !== undefined) user.username = payload.username;
      if (payload.useremail !== undefined) user.useremail = payload.useremail;
      if (payload.is_blocked !== undefined) user.is_blocked = payload.is_blocked;
      if (payload.role_ids !== undefined) user.role_ids = payload.role_ids;
      if (payload.password) user.password = payload.password;
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Users",
        action: "Modified",
        details: `Updated user ${user.username}`,
        pagePath: "Role & User Management",
        module: "Users",
        before,
        after: { ...user },
      });
    });
    return { success: true };
  },

  async deleteUser(userId: string) {
    mutateDemoStore((state) => {
      const idx = state.users.findIndex((u) => u.uid === userId);
      if (idx < 0) throw new Error("User not found");
      const [removed] = state.users.splice(idx, 1);
      if (!removed) throw new Error("User not found");
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Users",
        action: "Deleted",
        details: `Deleted user ${removed.username}`,
        pagePath: "Role & User Management",
        module: "Users",
        before: removed,
      });
    });
    return { success: true };
  },
};

export const roleService = {
  async getAllRoles() {
    const state = loadDemoStore();
    return {
      success: true,
      data: state.roles,
      assignments: buildAssignments(state),
    };
  },

  async createRole(payload: { roleName?: string; name?: string; description?: string }) {
    const roleName = (payload.roleName || payload.name || "").trim().toUpperCase();
    if (!roleName) throw new Error("Role name required");
    mutateDemoStore((state) => {
      if (state.roles.some((r) => r.role_id === roleName || r.role_name === roleName)) {
        throw new Error("Role already exists");
      }
      const role = {
        role_id: roleName,
        role_name: roleName,
        description: payload.description || "",
      };
      state.roles.push(role);
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Roles",
        action: "Created",
        details: `Created role ${roleName}`,
        pagePath: "Manage Role",
        module: "Roles",
        after: role,
      });
    });
    return { success: true };
  },

  async updateRole(
    roleId: string,
    payload: { role_name?: string; description?: string },
  ) {
    mutateDemoStore((state) => {
      const role = state.roles.find((r) => r.role_id === roleId);
      if (!role) throw new Error("Role not found");
      const before = { ...role };
      if (payload.role_name) {
        role.role_name = payload.role_name.trim().toUpperCase();
      }
      if (payload.description !== undefined) role.description = payload.description;
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Roles",
        action: "Modified",
        details: `Updated role ${role.role_name}`,
        pagePath: "Manage Role",
        module: "Roles",
        before,
        after: { ...role },
      });
    });
    return { success: true };
  },

  async deleteRole(roleId: string) {
    mutateDemoStore((state) => {
      const idx = state.roles.findIndex((r) => r.role_id === roleId);
      if (idx < 0) throw new Error("Role not found");
      const [removed] = state.roles.splice(idx, 1);
      if (!removed) throw new Error("Role not found");
      state.users.forEach((u) => {
        u.role_ids = (u.role_ids || []).filter((id) => id !== roleId);
      });
      Object.keys(state.matrix).forEach((key) => {
        if (key.startsWith(`${roleId}::`)) delete state.matrix[key];
      });
      pushAudit(state, {
        user: "Demo Admin",
        userEmail: "admin@sonrat.io",
        scope: "Roles",
        action: "Deleted",
        details: `Deleted role ${removed.role_name}`,
        pagePath: "Manage Role",
        module: "Roles",
        before: removed,
      });
    });
    return { success: true };
  },
};

export const permissionService = {
  async getMatrix() {
    const state = loadDemoStore();
    const byKey: Record<string, Record<string, boolean>> = {};
    Object.entries(state.matrix).forEach(([compound, allowed]) => {
      const sep = compound.indexOf("::");
      if (sep < 0) return;
      const roleId = compound.slice(0, sep);
      const key = compound.slice(sep + 2);
      if (!byKey[key]) byKey[key] = {};
      byKey[key][roleId] = Boolean(allowed);
    });
    const permissions = Object.entries(byKey).map(([key, allowed]) => ({
      key,
      allowed,
      page: key.split(".")[0],
    }));
    return { permissions };
  },

  async saveMatrix(
    changes: Array<{
      role_id?: string;
      permission_key?: string;
      allowed?: boolean;
      user_id?: string;
      added?: boolean;
    }>,
  ) {
    mutateDemoStore((state) => {
      changes.forEach((change) => {
        if (change.permission_key && change.role_id) {
          const mapKey = `${change.role_id}::${change.permission_key}`;
          state.matrix[mapKey] = Boolean(change.allowed);
          pushAudit(state, {
            user: "Demo Admin",
            userEmail: "admin@sonrat.io",
            scope: "Permissions",
            action: "Modified",
            details: `${change.allowed ? "Granted" : "Revoked"} ${change.permission_key} for ${change.role_id}`,
            pagePath: "Admin Console",
            module: "Admin Console",
            after: change,
          });
        }
      });
    });
    return { success: true };
  },
};
