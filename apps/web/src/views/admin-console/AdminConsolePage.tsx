"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Shield,
  Users,
  CheckCircle2,
  Settings,
  UserCheck,
  ChevronDown,
  Bot,
  Megaphone,
  PhoneCall,
  BarChart3,
  Layers,
  History,
  Printer,
  Download,
  Save,
  NotebookText,
} from "lucide-react";
import PermissionMatrix from "./components/PermissionMatrix";
import MultiRoleAssignment from "./components/MultiRoleAssignment";
import GameCatalogTaxonomy from "./components/Taxonomy";
import AuditLogs from "./components/AuditLogs";
import UserModal from "./components/UserModal";
import RoleBreakdown from "./components/RoleBreakdown";
import RoleManager from "./components/RoleManager";
import RolePermissionPanel from "./components/RolePermissionPanel";
import { useAuth } from "./hooks";
import {
  userService,
  roleService,
  permissionService,
} from "@/services/adminConsole/user-role-permission";
import {
  listCatalogs,
  createCatalog,
  updateCatalog,
  deleteCatalog,
} from "@/services/adminConsole/taxonomy.service";
import { readAuditEntries, exportAuditLogs } from "@/services/adminConsole/auditLogger";
import type {
  DemoUser,
  DemoRole,
  DemoCatalog,
} from "@/services/adminConsole/demo-admin-store";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

type ScreenDef = {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
};

type RoleOption = {
  id: string;
  rawId: string;
  name: string;
  description: string;
  assignment?: { count: number; users: Array<{ id: string; name: string; email: string; disabled: boolean }> };
  color?: string;
  text?: string;
  bg?: string;
  border?: string;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
  disabled: boolean;
  avatar: string;
};

type PermissionAction = { label: string; actionType: string; permissionKey: string };
type PermissionGroup = {
  group: string;
  icon?: LucideIcon;
  togglePermissionKey?: string;
  description?: string;
  actions: PermissionAction[];
};

const SCREENS: ScreenDef[] = [
  { id: "agents", name: "Agents", icon: Bot, category: "Roles Management" },
  { id: "campaigns", name: "Campaigns", icon: Megaphone, category: "Roles Management" },
  { id: "contacts", name: "Contacts", icon: Users, category: "Roles Management" },
  { id: "calls", name: "Calls", icon: PhoneCall, category: "Roles Management" },
  { id: "analytics", name: "Analytics", icon: BarChart3, category: "Roles Management" },
  { id: "settings", name: "Settings", icon: Settings, category: "Roles Management" },
  { id: "admin-console", name: "Admin Console", icon: Shield, category: "Roles Management" },
  { id: "user-assignments", name: "Role & User Management", icon: UserCheck, category: "Dashboard User Management" },
  { id: "role-manager", name: "Manage Role", icon: Users, category: "Dashboard User Management" },
  { id: "modules", name: "Modules", icon: Layers, category: "Taxonomy" },
  { id: "audit-logs", name: "Audit Logs", icon: History, category: "System" },
];

const DEMO_ADMIN_SCREEN_IDS = new Set([
  "agents",
  "campaigns",
  "contacts",
  "calls",
  "analytics",
  "settings",
  "admin-console",
  "user-assignments",
  "role-manager",
  "modules",
  "audit-logs",
]);

const ACTIVE_SCREENS = SCREENS.filter((screen) => DEMO_ADMIN_SCREEN_IDS.has(screen.id));
const ROLE_MANAGEMENT_SCREEN_IDS = ACTIVE_SCREENS.filter(
  (screen) => screen.category === "Roles Management",
).map((screen) => screen.id);

const ADMIN_CONSOLE_TOGGLE_KEY = "adminconsole.show_menu";
const ADMIN_CONSOLE_LINKED_PERMISSION_KEYS = ["user.administer_roles_permissions"];
const USER_ADMIN_TOGGLE_KEY = "user.administer_users";
const TAXONOMY_TOGGLE_KEY = "taxonomy.show_menu";

const PERMISSION_LAYOUT: Record<string, PermissionGroup[]> = {
  agents: [
    {
      group: "Agents Page",
      icon: Bot,
      togglePermissionKey: "agents.show_menu",
      actions: [],
    },
    {
      group: "Agents",
      togglePermissionKey: "agents.read",
      actions: [
        { label: "Create", actionType: "create", permissionKey: "agents.create" },
        { label: "Edit", actionType: "edit", permissionKey: "agents.edit" },
        { label: "Delete", actionType: "delete", permissionKey: "agents.delete" },
        { label: "Write", actionType: "write", permissionKey: "agents.write" },
        { label: "Publish", actionType: "publish", permissionKey: "agents.publish" },
      ],
    },
  ],
  campaigns: [
    {
      group: "Campaigns Page",
      icon: Megaphone,
      togglePermissionKey: "campaigns.show_menu",
      actions: [],
    },
    {
      group: "Campaigns",
      togglePermissionKey: "campaigns.read",
      actions: [
        { label: "Create", actionType: "create", permissionKey: "campaigns.create" },
        { label: "Edit", actionType: "edit", permissionKey: "campaigns.edit" },
        { label: "Delete", actionType: "delete", permissionKey: "campaigns.delete" },
        { label: "Write", actionType: "write", permissionKey: "campaigns.write" },
        { label: "Start", actionType: "start", permissionKey: "campaigns.start" },
        { label: "Pause", actionType: "pause", permissionKey: "campaigns.pause" },
      ],
    },
  ],
  contacts: [
    {
      group: "Contacts Page",
      icon: Users,
      togglePermissionKey: "contacts.show_menu",
      actions: [],
    },
    {
      group: "Contacts",
      togglePermissionKey: "contacts.read",
      actions: [
        { label: "Create", actionType: "create", permissionKey: "contacts.create" },
        { label: "Edit", actionType: "edit", permissionKey: "contacts.edit" },
        { label: "Delete", actionType: "delete", permissionKey: "contacts.delete" },
        { label: "Write", actionType: "write", permissionKey: "contacts.write" },
      ],
    },
  ],
  calls: [
    {
      group: "Calls",
      icon: PhoneCall,
      togglePermissionKey: "calls.show_menu",
      actions: [{ label: "Read", actionType: "read", permissionKey: "calls.read" }],
    },
  ],
  analytics: [
    {
      group: "Analytics",
      icon: BarChart3,
      togglePermissionKey: "analytics.show_menu",
      actions: [{ label: "Read", actionType: "read", permissionKey: "analytics.read" }],
    },
  ],
  settings: [
    {
      group: "Settings",
      icon: Settings,
      togglePermissionKey: "settings.show_menu",
      actions: [{ label: "Write", actionType: "write", permissionKey: "settings.write" }],
    },
  ],
  "admin-console": [
    {
      group: "Admin Console Access",
      icon: Settings,
      togglePermissionKey: ADMIN_CONSOLE_TOGGLE_KEY,
      description: "Enables admin console navigation (requires user.administer_roles_permissions)",
      actions: [],
    },
    {
      group: "Access User Management tab",
      icon: Users,
      togglePermissionKey: USER_ADMIN_TOGGLE_KEY,
      description: "Modify, manage, assign roles, or block users (user.administer_users)",
      actions: [],
    },
    {
      group: "Access Taxonomy",
      icon: Layers,
      togglePermissionKey: TAXONOMY_TOGGLE_KEY,
      description: "Enable modules / taxonomy editor (taxonomy.show_menu)",
      actions: [],
    },
  ],
};

export default function AdminConsolePage() {
  const { can } = useAuth();

  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [userFilters, setUserFilters] = useState({ name: "", email: "" });
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [usersPagination, setUsersPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  } | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<
    Record<string, { count: number; users: Array<{ id: string; name: string; email: string; disabled: boolean }> }>
  >({});
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>({
    id: "",
    rawId: "",
    name: "Select Role",
    description: "",
  });
  const [activeScreenId, setActiveScreenId] = useState("user-assignments");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [gameCatalog, setGameCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogDeleting, setCatalogDeleting] = useState(false);
  const [moduleModal, setModuleModal] = useState<{
    open: boolean;
    mode: "create" | "edit" | null;
    game: any;
  }>({ open: false, mode: null, game: null });
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", catalogKey: "" });
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditFilters, setAuditFilters] = useState<Record<string, any>>({
    name: "",
    email: "",
    module: "",
    action: [],
    dateFrom: "",
    dateTo: "",
  });
  const [auditPendingFilters, setAuditPendingFilters] = useState(auditFilters);
  const [auditPagination, setAuditPagination] = useState<any>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeUserRoleSelector, setActiveUserRoleSelector] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [permissionPanelOpen, setPermissionPanelOpen] = useState(false);
  const [permissionPanelRole, setPermissionPanelRole] = useState<RoleOption | null>(null);
  const [permissionPanelScreenId, setPermissionPanelScreenId] = useState<string | null>(null);
  const [moduleDeleteConfirm, setModuleDeleteConfirm] = useState<{ open: boolean; game: any }>({
    open: false,
    game: null,
  });
  const [modalConfig, setModalConfig] = useState<{ type: string | null; userId: string | null }>({
    type: null,
    userId: null,
  });
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirm: "" });

  const currentRoleId = selectedRole?.rawId || selectedRole?.id || null;
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [layoutByScreen, setLayoutByScreen] = useState(PERMISSION_LAYOUT);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [savingMatrix, setSavingMatrix] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const payload: { page: number; limit: number; name?: string; email?: string } = {
        page: usersPage,
        limit: usersPageSize,
      };
      if (userFilters.name?.trim()) payload.name = userFilters.name.trim();
      if (userFilters.email?.trim()) payload.email = userFilters.email.trim();
      const response = await userService.getAllUsers(payload);
      if (response?.success) {
        const normalized = (response.data || []).map((u: DemoUser) => {
          const name = u.username || "";
          const email = u.useremail || "";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return {
            id: u.uid || name,
            name,
            email,
            roleIds: u.role_ids?.length ? u.role_ids : [],
            disabled: !!u.is_blocked,
            avatar: u.avatar || initials || "U",
          };
        });
        setUserList(normalized);
        setUsersPagination(response.pagination);
      } else {
        setUserList([]);
        setUsersPagination(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setUserList([]);
      setUsersPagination(null);
      setUsersError(err?.message || "Failed to fetch users");
    } finally {
      setUsersLoading(false);
    }
  }, [userFilters, usersPage, usersPageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const totalPages = usersPagination?.totalPages || 1;
    if (usersPage > totalPages) setUsersPage(totalPages);
  }, [usersPage, usersPagination]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await roleService.getAllRoles();
      if (res?.success) {
        const dbRoles: RoleOption[] = (res.data || []).map((r: DemoRole) => ({
          id: r.role_id || r.role_name,
          rawId: r.role_id || r.role_name,
          name: r.role_name || r.role_id,
          description: r.description || "",
          assignment: { count: 0, users: [] },
          color: "slate",
          text: "text-slate-700",
          bg: "bg-slate-50",
          border: "border-slate-200",
        }));
        setRoleOptions(dbRoles);
        setSelectedRole((prev) => dbRoles.find((role) => role.id === prev?.id) || dbRoles[0] || null);
        setRoleAssignments(res.assignments || {});
      }
    } catch (err) {
      console.error("Failed to load roles", err);
      setRoleOptions([]);
      setRoleAssignments({});
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const refreshAuditEntries = useCallback(async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      const { items, pagination } = await readAuditEntries({
        name: auditFilters.name,
        email: auditFilters.email,
        module: auditFilters.module,
        action: auditFilters.action,
        dateFrom: auditFilters.dateFrom,
        dateTo: auditFilters.dateTo,
        page: auditPage,
        limit: auditPageSize,
      });
      setAuditEntries(Array.isArray(items) ? items : []);
      setAuditPagination(pagination || null);
    } catch (err: any) {
      console.warn("Failed to load audit entries", err);
      setAuditEntries([]);
      setAuditPagination(null);
      setAuditError(err?.message || "Failed to load audit entries");
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters, auditPage, auditPageSize]);

  useEffect(() => {
    refreshAuditEntries();
  }, [refreshAuditEntries]);

  const applyAuditFilters = useCallback(() => {
    setAuditFilters(auditPendingFilters);
    setAuditPage(1);
  }, [auditPendingFilters]);

  const combinedRoleAssignments = useMemo(() => {
    const base: Record<
      string,
      { count: number; users: Array<{ id: string; name: string; email: string; disabled: boolean }> }
    > = {};

    Object.entries(roleAssignments || {}).forEach(([roleId, data]) => {
      base[roleId] = {
        count: data?.count || (Array.isArray(data?.users) ? data.users.length : 0),
        users: Array.isArray(data?.users) ? [...data.users] : [],
      };
    });

    userList.forEach((user) => {
      (user.roleIds || []).forEach((roleId) => {
        if (!roleId) return;
        if (!base[roleId]) base[roleId] = { count: 0, users: [] };
        if (!base[roleId].users.some((u) => u.id === user.id)) {
          base[roleId].users.push({
            id: user.id,
            name: user.name,
            email: user.email,
            disabled: !!user.disabled,
          });
        }
      });
    });

    Object.values(base).forEach((entry) => {
      entry.users.sort((a, b) => a.name.localeCompare(b.name));
      entry.count = entry.users.length;
    });

    return base;
  }, [roleAssignments, userList]);

  const loadPermissionMatrix = useCallback(async () => {
    try {
      setMatrixLoading(true);
      setMatrixError(null);
      const data = await permissionService.getMatrix();
      const nextRolePermissions: Record<string, boolean> = {};
      const nextLayout: Record<string, PermissionGroup[]> = { ...PERMISSION_LAYOUT };
      const fetchedPermissionKeys = new Set<string>();

      (data?.permissions || []).forEach((perm: { key?: string; allowed?: Record<string, boolean>; page?: string }) => {
        const { key, allowed, page } = perm;
        if (!key) return;
        fetchedPermissionKeys.add(key);
        Object.entries(allowed || {}).forEach(([roleId, isAllowed]) => {
          nextRolePermissions[`${roleId}::${key}`] = Boolean(isAllowed);
        });

        const screenEntry = Object.entries(PERMISSION_LAYOUT).find(([, groups]) =>
          groups.some(
            (group) =>
              group.togglePermissionKey === key ||
              group.actions.some((action) => action.permissionKey === key),
          ),
        );

        if (!screenEntry && page) {
          const screenId = page.toLowerCase().replace(/\s+/g, "-");
          if (!nextLayout[screenId]) {
            nextLayout[screenId] = [
              {
                group: page,
                icon: undefined,
                togglePermissionKey: key,
                actions: [],
              },
            ];
          }
        }
      });

      const layoutPermissionKeys = new Set<string>();
      Object.values(nextLayout).forEach((groups) => {
        (groups || []).forEach((group) => {
          if (group?.togglePermissionKey) layoutPermissionKeys.add(group.togglePermissionKey);
          (group?.actions || []).forEach((action) => {
            if (action?.permissionKey) layoutPermissionKeys.add(action.permissionKey);
          });
        });
      });

      setRolePermissions((prev) => {
        const merged = { ...prev, ...nextRolePermissions };
        Object.keys(prev || {}).forEach((compoundKey) => {
          const separator = compoundKey.indexOf("::");
          if (separator < 0) return;
          const permissionKey = compoundKey.slice(separator + 2);
          if (!layoutPermissionKeys.has(permissionKey)) return;
          if (fetchedPermissionKeys.has(permissionKey)) return;
          merged[compoundKey] = Boolean(prev[compoundKey]);
        });
        return merged;
      });
      setLayoutByScreen(nextLayout);
    } catch (err: any) {
      console.error("Failed to load permission matrix", err);
      setMatrixError(err?.message || "Failed to load permissions");
    } finally {
      setMatrixLoading(false);
      setPendingChanges({});
    }
  }, []);

  useEffect(() => {
    loadPermissionMatrix();
  }, [loadPermissionMatrix]);

  const permissionScreens = useMemo(() => Object.keys(layoutByScreen || {}), [layoutByScreen]);
  const permissionNavScreens = useMemo(() => {
    const roleScreens = ROLE_MANAGEMENT_SCREEN_IDS.filter((id) => permissionScreens.includes(id));
    return roleScreens.length ? roleScreens : permissionScreens;
  }, [permissionScreens]);

  useEffect(() => {
    if (!permissionPanelScreenId && permissionNavScreens.length) {
      setPermissionPanelScreenId(permissionNavScreens[0] ?? null);
    }
  }, [permissionPanelScreenId, permissionNavScreens]);

  const getCatalogIdentifier = useCallback(
    (catalog: any) => catalog?._id || catalog?.id || catalog?.catalogKey || catalog?.internalId,
    [],
  );

  const refreshCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await listCatalogs();
      const normalized = (data || []).map((entry: DemoCatalog & { _id?: string; id?: string }) => ({
        ...entry,
        id: entry._id || entry.id || entry.catalogKey,
        internalId: entry.catalogKey || entry.internalId || entry._id,
      }));
      setGameCatalog(normalized);
    } catch (err: any) {
      setCatalogError(err?.message || "Failed to load catalogs");
      setGameCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalogs();
  }, [refreshCatalogs]);

  const closeModuleModal = useCallback(() => {
    setModuleModal({ open: false, mode: null, game: null });
    setModuleForm({ title: "", description: "", catalogKey: "" });
    setCatalogError(null);
  }, []);

  const openModuleModal = useCallback((mode: "create" | "edit", game: any = null) => {
    setModuleModal({ open: true, mode, game });
    setModuleForm({
      title: game?.title || "",
      description: game?.description || "",
      catalogKey: game?.catalogKey || game?.internalId || "",
    });
    setCatalogError(null);
  }, []);

  const handleAddModule = useCallback(() => openModuleModal("create"), [openModuleModal]);
  const handleEditModule = useCallback(
    (game: any) => {
      if (!game) return;
      openModuleModal("edit", game);
    },
    [openModuleModal],
  );
  const handleDeleteModule = useCallback((game: any) => {
    if (!game) return;
    setModuleDeleteConfirm({ open: true, game });
  }, []);

  const confirmDeleteModule = useCallback(async () => {
    const target = moduleDeleteConfirm.game;
    if (!target) return;
    const catalogId = getCatalogIdentifier(target);
    if (!catalogId) return;
    setCatalogDeleting(true);
    setCatalogError(null);
    try {
      await deleteCatalog(catalogId);
      setModuleDeleteConfirm({ open: false, game: null });
      refreshCatalogs();
    } catch (err: any) {
      setCatalogError(err?.message || "Failed to delete catalog");
      setModuleDeleteConfirm({ open: false, game: null });
    } finally {
      setCatalogDeleting(false);
    }
  }, [getCatalogIdentifier, moduleDeleteConfirm.game, refreshCatalogs]);

  const cancelDeleteModule = useCallback(() => {
    setModuleDeleteConfirm({ open: false, game: null });
  }, []);

  const handleSaveModule = useCallback(async () => {
    const title = moduleForm.title.trim();
    const description = moduleForm.description.trim();
    const catalogKey = (moduleForm.catalogKey || title)
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!title || !catalogKey) return;

    setCatalogSaving(true);
    setCatalogError(null);
    try {
      if (moduleModal.mode === "edit" && moduleModal.game) {
        const catalogId = getCatalogIdentifier(moduleModal.game);
        await updateCatalog(catalogId, { title, description, catalogKey });
      } else {
        await createCatalog({ title, description, catalogKey });
      }
      closeModuleModal();
      refreshCatalogs();
    } catch (err: any) {
      setCatalogError(err?.message || "Failed to save catalog");
    } finally {
      setCatalogSaving(false);
    }
  }, [
    closeModuleModal,
    getCatalogIdentifier,
    moduleForm.catalogKey,
    moduleForm.description,
    moduleForm.title,
    moduleModal,
    refreshCatalogs,
  ]);

  const activeScreen = useMemo(
    () => ACTIVE_SCREENS.find((s) => s.id === activeScreenId),
    [activeScreenId],
  );
  const canAccessUserAdmin = Boolean(can?.(USER_ADMIN_TOGGLE_KEY));
  const isPermissionScreen = useMemo(
    () => activeScreen?.category === "Roles Management",
    [activeScreen],
  );
  const showPermissionContext = isPermissionScreen;
  const disallowedBreakdownCategories = useMemo(
    () => new Set(["Dashboard User Management", "Taxonomy", "System"]),
    [],
  );
  const canShowRoleBreakdown = activeScreen
    ? !disallowedBreakdownCategories.has(activeScreen.category)
    : true;

  useEffect(() => {
    if (!canShowRoleBreakdown && isSummaryOpen) setIsSummaryOpen(false);
  }, [canShowRoleBreakdown, isSummaryOpen]);

  const screenCategories = useMemo(
    () =>
      Array.from(
        new Set(
          ACTIVE_SCREENS.map((screen) => screen.category).filter(
            (category) => category !== "Roles Management",
          ),
        ),
      ),
    [],
  );
  const screensByCategory = useMemo(
    () =>
      screenCategories.reduce<Record<string, ScreenDef[]>>((acc, category) => {
        acc[category] = ACTIVE_SCREENS.filter((screen) => screen.category === category);
        return acc;
      }, {}),
    [screenCategories],
  );
  const categoryDisplayName = useCallback((category: string) => {
    if (category === "System") return "Audit Logs";
    return category;
  }, []);
  const activeScreenCategory =
    activeScreen?.category && screenCategories.includes(activeScreen.category)
      ? activeScreen.category
      : screenCategories[0] || null;
  const screensInActiveCategory = useMemo(
    () => (activeScreenCategory ? screensByCategory[activeScreenCategory] || [] : []),
    [activeScreenCategory, screensByCategory],
  );

  const handleToggleRole = async (userId: string, roleId: string) => {
    const targetRole = roleOptions.find((r) => r.id === roleId || r.rawId === roleId);
    const roleValue = targetRole?.rawId || roleId;
    const targetUser = userList.find((u) => u.id === userId);
    if (!targetUser) return;

    const currentRoles = targetUser.roleIds || [];
    const updatedRoleIds = currentRoles.includes(roleValue)
      ? currentRoles.filter((id) => id !== roleValue)
      : [...currentRoles, roleValue];

    setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, roleIds: updatedRoleIds } : u)));

    try {
      await userService.updateUser(userId, {
        username: targetUser.name,
        useremail: targetUser.email,
        is_blocked: targetUser.disabled,
        role_ids: updatedRoleIds,
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update role stack", err);
      fetchUsers();
    }

    setPendingChanges((prev) => ({
      ...prev,
      [`role-stack::${userId}`]: {
        role_id: roleValue,
        user_id: userId,
        added: !currentRoles.includes(roleValue),
      },
    }));
  };

  const handleToggleDisable = async (userId: string) => {
    const target = userList.find((u) => u.id === userId);
    if (!target) return;
    const nextDisabled = !target.disabled;
    setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, disabled: nextDisabled } : u)));
    try {
      await userService.updateUser(userId, {
        username: target.name,
        useremail: target.email,
        is_blocked: nextDisabled,
        role_ids: target.roleIds,
      });
    } catch (err) {
      console.error("Failed to update block/activate", err);
      setUserList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, disabled: !nextDisabled } : u)),
      );
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const target = userList.find((u) => u.id === userId);
      if (target?.id) await userService.deleteUser(target.id);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const openModal = (type: string, user?: AdminUser | null) => {
    setModalConfig({ type, userId: user?.id || null });
    setFormData({ name: user?.name || "", email: user?.email || "", password: "", confirm: "" });
  };

  const closeModal = () => {
    setModalConfig({ type: null, userId: null });
    setFormData({ name: "", email: "", password: "", confirm: "" });
  };

  const handleApplyChanges = async () => {
    try {
      if (modalConfig.type === "create") {
        await userService.createUser({
          username: formData.name,
          useremail: formData.email,
          password: formData.password,
          role_ids: ["MEMBER"],
        });
        await fetchUsers();
      } else if (modalConfig.type === "email") {
        const target = userList.find((u) => u.id === modalConfig.userId);
        if (target) {
          await userService.updateUser(target.id, {
            username: target.name,
            useremail: formData.email,
            is_blocked: target.disabled,
            role_ids: target.roleIds,
          });
          await fetchUsers();
        }
      } else if (modalConfig.type === "password") {
        const target = userList.find((u) => u.id === modalConfig.userId);
        if (target) {
          await userService.updateUser(target.id, {
            username: target.name,
            useremail: target.email,
            is_blocked: target.disabled,
            role_ids: target.roleIds,
            password: formData.password,
            currentPassword: "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to apply changes", err);
    } finally {
      closeModal();
    }
  };

  const hasPermission = useCallback(
    (permissionKey: string, roleIdOverride: string | null = null) => {
      const roleId = roleIdOverride || currentRoleId;
      if (!roleId || !permissionKey) return false;
      return !!rolePermissions[`${roleId}::${permissionKey}`];
    },
    [currentRoleId, rolePermissions],
  );

  const queuePermissionChange = useCallback(
    (roleId: string, permissionKey: string, nextValue: boolean) => {
      if (!roleId || !permissionKey) return;
      const mapKey = `${roleId}::${permissionKey}`;
      setRolePermissions((prev) => ({ ...prev, [mapKey]: nextValue }));
      setPendingChanges((prev) => ({
        ...prev,
        [mapKey]: {
          role_id: roleId,
          permission_key: permissionKey,
          allowed: nextValue,
        },
      }));
    },
    [],
  );

  const updatePermissionValue = useCallback(
    (permissionKey: string, nextValue: boolean, roleIdOverride: string | null = null) => {
      const roleId = roleIdOverride || currentRoleId;
      if (!roleId || !permissionKey) return;
      queuePermissionChange(roleId, permissionKey, nextValue);
      if (permissionKey === ADMIN_CONSOLE_TOGGLE_KEY) {
        ADMIN_CONSOLE_LINKED_PERMISSION_KEYS.forEach((linkedKey) => {
          queuePermissionChange(roleId, linkedKey, nextValue);
        });
      }
    },
    [currentRoleId, queuePermissionChange],
  );

  const toggleGroupEnabled = useCallback(
    (group: PermissionGroup, roleIdOverride: string | null = null) => {
      if (!group?.togglePermissionKey) return;
      const nextValue = !hasPermission(group.togglePermissionKey, roleIdOverride);
      updatePermissionValue(group.togglePermissionKey, nextValue, roleIdOverride);
    },
    [hasPermission, updatePermissionValue],
  );

  const isGroupEnabled = useCallback(
    (group: PermissionGroup, roleIdOverride: string | null = null) => {
      if (!group?.togglePermissionKey) return true;
      return hasPermission(group.togglePermissionKey, roleIdOverride);
    },
    [hasPermission],
  );

  const togglePermission = useCallback(
    (group: PermissionGroup, action: PermissionAction, roleIdOverride: string | null = null) => {
      if (!action?.permissionKey) return;
      const nextValue = !hasPermission(action.permissionKey, roleIdOverride);
      updatePermissionValue(action.permissionKey, nextValue, roleIdOverride);
    },
    [hasPermission, updatePermissionValue],
  );

  const roleAuditSummary = useMemo(() => {
    const summary: Record<string, Record<string, string[]>> = {};
    if (!currentRoleId) return summary;
    Object.entries(layoutByScreen).forEach(([screenId, groups]) => {
      groups.forEach((group) => {
        const allowedActions: string[] = [];
        if (group.togglePermissionKey && hasPermission(group.togglePermissionKey)) {
          allowedActions.push("Access");
        }
        group.actions.forEach((action) => {
          if (hasPermission(action.permissionKey)) allowedActions.push(action.label);
        });
        if (allowedActions.length) {
          if (!summary[screenId]) summary[screenId] = {};
          summary[screenId][group.group] = allowedActions;
        }
      });
    });
    return summary;
  }, [currentRoleId, hasPermission, layoutByScreen]);

  const handleCreateRoleRecord = useCallback(
    async (input: string | { roleName?: string; name?: string; description?: string }) => {
      const payload =
        typeof input === "string"
          ? { roleName: input }
          : { roleName: input?.roleName || input?.name, description: input?.description };
      await roleService.createRole(payload);
      await loadRoles();
    },
    [loadRoles],
  );

  const handleUpdateRoleRecord = useCallback(
    async (role: RoleOption, payload: { roleName?: string; description?: string }) => {
      const roleId = role?.rawId || role?.id;
      if (!roleId) return;
      await roleService.updateRole(roleId, {
        role_name: payload?.roleName || role?.name,
        description: payload?.description ?? role?.description ?? "",
      });
      await loadRoles();
    },
    [loadRoles],
  );

  const handleDeleteRoleRecord = useCallback(
    async (role: RoleOption) => {
      const roleId = role.rawId || role.id;
      if (!roleId) return;
      await roleService.deleteRole(roleId);
      await loadRoles();
    },
    [loadRoles],
  );

  const handleSearchUsers = useCallback(() => {
    setUserFilters({ name: searchName, email: searchEmail });
    setUsersPage(1);
  }, [searchName, searchEmail]);

  const filteredUsers = userList;

  const selectedCount = useMemo(() => {
    if (!currentRoleId) return 0;
    return Object.entries(rolePermissions).reduce((count, [key, value]) => {
      if (key.startsWith(`${currentRoleId}::`) && value === true) return count + 1;
      return count;
    }, 0);
  }, [currentRoleId, rolePermissions]);

  const pendingChangesCount = Object.keys(pendingChanges).length;

  const getRoleAuditSummaryFor = useCallback(
    (role: RoleOption | null) => {
      if (!role) return {};
      const roleId = role.rawId || role.id;
      if (!roleId) return {};
      const summary: Record<string, Record<string, string[]>> = {};
      Object.entries(layoutByScreen).forEach(([screenId, groups]) => {
        groups.forEach((group) => {
          const allowedActions: string[] = [];
          if (group.togglePermissionKey && hasPermission(group.togglePermissionKey, roleId)) {
            allowedActions.push("Access");
          }
          group.actions.forEach((action) => {
            if (hasPermission(action.permissionKey, roleId)) allowedActions.push(action.label);
          });
          if (allowedActions.length) {
            if (!summary[screenId]) summary[screenId] = {};
            summary[screenId][group.group] = allowedActions;
          }
        });
      });
      return summary;
    },
    [layoutByScreen, hasPermission],
  );

  const openPermissionPanelForRole = useCallback(
    (role: RoleOption) => {
      if (!role) return;
      setSelectedRole(role);
      setPermissionPanelRole(role);
      const fallbackScreen = permissionPanelScreenId || permissionNavScreens[0] || null;
      setPermissionPanelScreenId(fallbackScreen);
      setPermissionPanelOpen(true);
    },
    [permissionPanelScreenId, permissionNavScreens],
  );

  const closePermissionPanel = useCallback(() => {
    if (savingMatrix) return;
    setPermissionPanelOpen(false);
    setPermissionPanelRole(null);
  }, [savingMatrix]);

  const handleSaveMatrix = useCallback(async () => {
    if (!pendingChangesCount) return;
    try {
      setSavingMatrix(true);
      await permissionService.saveMatrix(Object.values(pendingChanges));
      setPendingChanges({});
      await loadPermissionMatrix();
    } catch (err: any) {
      console.error("Failed to save permissions", err);
      setMatrixError(err?.message || "Failed to save permissions");
    } finally {
      setSavingMatrix(false);
    }
  }, [pendingChanges, pendingChangesCount, loadPermissionMatrix]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="border-b border-slate-50 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {screenCategories.map((category) => {
              const isActive = category === activeScreenCategory;
              const categoryScreens = screensByCategory[category] || [];
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const firstScreen = categoryScreens[0];
                    if (firstScreen) setActiveScreenId(firstScreen.id);
                  }}
                  className={`rounded-2xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                    isActive
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {categoryDisplayName(category)}
                </button>
              );
            })}
          </div>

          {screensInActiveCategory.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {screensInActiveCategory.map((screen) => {
                const isActive = screen.id === activeScreenId;
                const Icon = screen.icon;
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreenId(screen.id)}
                    className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    {Icon ? <Icon size={12} /> : null}
                    <span>{screen.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {showPermissionContext ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500">
                  Permission Context
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    {selectedRole?.name || "Select Role"}
                    <ChevronDown size={12} className={isRoleDropdownOpen ? "rotate-180" : ""} />
                  </button>
                  {isRoleDropdownOpen && (
                    <div className="absolute left-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                      {roleOptions.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full border-b border-slate-50 px-4 py-2 text-left text-[11px] last:border-0 ${
                            selectedRole?.id === role.id ? "bg-indigo-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-bold text-slate-800">{role.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{role.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canShowRoleBreakdown && (
                  <button
                    type="button"
                    onClick={() => setIsSummaryOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${
                      isSummaryOpen
                        ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <NotebookText size={12} />
                    Summary
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveMatrix}
                  disabled={!currentRoleId || !pendingChangesCount || savingMatrix}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-600 bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={12} />
                  {savingMatrix ? "Publishing…" : "Publish"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={`flex-1 bg-slate-50/50 p-6 ${
            activeScreenId === "user-assignments" || activeScreenId === "audit-logs"
              ? "min-h-0 overflow-hidden"
              : "overflow-y-auto"
          }`}
          onClick={() => setActiveUserRoleSelector(null)}
        >
          <div
            className={`w-full max-w-none px-2 ${
              activeScreenId === "user-assignments" || activeScreenId === "audit-logs"
                ? "flex h-full min-h-0 flex-col"
                : ""
            }`}
          >
            {activeScreenId === "user-assignments" && (
              <MultiRoleAssignment
                users={filteredUsers}
                roleOptions={roleOptions}
                searchName={searchName}
                searchEmail={searchEmail}
                onSearchNameChange={setSearchName}
                onSearchEmailChange={setSearchEmail}
                onSearchSubmit={handleSearchUsers}
                activeUserRoleSelector={activeUserRoleSelector}
                setActiveUserRoleSelector={setActiveUserRoleSelector}
                onToggleRole={handleToggleRole}
                onToggleDisable={handleToggleDisable}
                onDeleteUser={handleDeleteUser}
                openModal={openModal as any}
                loading={usersLoading}
                error={usersError}
                pagination={usersPagination}
                page={usersPage}
                pageSize={usersPageSize}
                onPageChange={setUsersPage}
                onPageSizeChange={(value) => {
                  setUsersPageSize(value);
                  setUsersPage(1);
                }}
              />
            )}

            {activeScreenId === "role-manager" &&
              (canAccessUserAdmin ? (
                <RoleManager
                  roles={roleOptions}
                  onCreateRole={handleCreateRoleRecord}
                  onUpdateRole={handleUpdateRoleRecord}
                  onDeleteRole={handleDeleteRoleRecord}
                  onEditPermissions={openPermissionPanelForRole}
                  roleAssignments={combinedRoleAssignments}
                />
              ) : (
                <div className="h-full" aria-hidden />
              ))}

            {activeScreenId === "modules" &&
              (can?.(TAXONOMY_TOGGLE_KEY) ? (
                <GameCatalogTaxonomy
                  games={gameCatalog}
                  onAddGame={handleAddModule}
                  onEditGame={handleEditModule}
                  onDeleteGame={handleDeleteModule}
                  catalogLoading={catalogLoading}
                  catalogError={catalogError}
                  catalogSaving={catalogSaving}
                  catalogDeleting={catalogDeleting}
                />
              ) : (
                <div className="h-full" aria-hidden />
              ))}

            {activeScreenId === "audit-logs" && (
              <AuditLogs
                entries={auditEntries}
                filters={auditPendingFilters}
                pagination={auditPagination}
                isLoading={auditLoading}
                error={auditError}
                pageSize={auditPageSize}
                pageSizeOptions={[10, 20, 50]}
                onFilterChange={(next) => setAuditPendingFilters(next)}
                onPageChange={(nextPage) => setAuditPage(nextPage)}
                onPageSizeChange={(nextSize) => {
                  setAuditPageSize(nextSize);
                  setAuditPage(1);
                }}
                onExport={async () => {
                  try {
                    const res = await exportAuditLogs({
                      name: auditFilters.name,
                      email: auditFilters.email,
                      module: auditFilters.module,
                      action: auditFilters.action,
                      dateFrom: auditFilters.dateFrom,
                      dateTo: auditFilters.dateTo,
                    });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "audit-logs.csv";
                    link.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.warn("Failed to export audit logs", err);
                  }
                }}
                onRefresh={() => refreshAuditEntries()}
                onApplyFilters={applyAuditFilters}
              />
            )}

            {activeScreenId === "permission-audit" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-800">
                      Role Audit Summary
                    </h2>
                    <p className="mt-1 font-medium italic text-slate-500">
                      Verify assigned access tokens for the{" "}
                      <strong>{selectedRole?.name}</strong> profile.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600 shadow-sm hover:bg-slate-50">
                      <Printer size={14} /> Print
                    </button>
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600 shadow-sm hover:bg-slate-50">
                      <Download size={14} /> CSV
                    </button>
                  </div>
                </div>
                {Object.keys(roleAuditSummary).length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-20 text-center">
                    <Shield size={40} className="mb-4 text-slate-200" />
                    <h3 className="font-bold text-slate-500">No Permissions Configured</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(roleAuditSummary).map(([screenId, groups]) => {
                      const screenObj = ACTIVE_SCREENS.find((s) => s.id === screenId);
                      return (
                        <div
                          key={screenId}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg border border-slate-200 bg-white p-2 text-indigo-500 shadow-sm">
                                {screenObj?.icon && <screenObj.icon size={18} />}
                              </div>
                              <h4 className="text-[13px] font-black uppercase tracking-tight text-slate-800">
                                {screenObj?.name || screenId}
                              </h4>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-6 md:grid-cols-2">
                            {Object.entries(groups).map(([groupName, actions]) => (
                              <div key={groupName}>
                                <h5 className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> {groupName}
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {actions.map((action) => (
                                    <div
                                      key={action}
                                      className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm"
                                    >
                                      <CheckCircle2 size={10} className="text-emerald-500" /> {action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isPermissionScreen && activeScreenId !== "permission-audit" && (
              <PermissionMatrix
                activeScreenId={activeScreenId}
                activeScreen={activeScreen}
                layout={layoutByScreen}
                isGroupEnabled={isGroupEnabled}
                toggleGroupEnabled={toggleGroupEnabled}
                hasPermission={hasPermission}
                togglePermission={togglePermission}
                loading={matrixLoading}
                error={matrixError}
              />
            )}
          </div>
        </div>
      </div>

      {moduleModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {moduleModal.mode === "edit" ? "Edit" : "Create"} Module
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  {moduleModal.mode === "edit" ? "Update Module" : "Add New Module"}
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Name</span>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Enter module name"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Description
                </span>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) =>
                    setModuleForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Add module context..."
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModuleModal}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModule}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={!moduleForm.title.trim()}
              >
                {moduleModal.mode === "edit" ? "Save Changes" : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {moduleDeleteConfirm.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">
                Delete Module
              </p>
              <h3 className="text-xl font-black text-slate-900">Remove module?</h3>
              <p className="mt-2 text-sm text-slate-500">
                This will remove &quot;
                {moduleDeleteConfirm.game?.title || moduleDeleteConfirm.game?.internalId}&quot; from
                the modules list.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDeleteModule}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteModule}
                className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <RoleBreakdown
        selectedRole={selectedRole}
        selectedCount={selectedCount}
        roleAuditSummary={roleAuditSummary}
        allScreens={ACTIVE_SCREENS}
        isOpen={canShowRoleBreakdown && isSummaryOpen}
      />

      {permissionPanelOpen && permissionPanelRole && (
        <RolePermissionPanel
          role={permissionPanelRole}
          screens={ACTIVE_SCREENS}
          permissionNavScreens={permissionNavScreens}
          selectedScreenId={permissionPanelScreenId}
          onSelectScreen={setPermissionPanelScreenId}
          canClose={!savingMatrix}
          onClose={closePermissionPanel}
          layoutByScreen={layoutByScreen}
          isGroupEnabled={isGroupEnabled}
          toggleGroupEnabled={toggleGroupEnabled}
          hasPermission={hasPermission}
          togglePermission={togglePermission}
          matrixLoading={matrixLoading}
          matrixError={matrixError}
          savingMatrix={savingMatrix}
          pendingChangesCount={pendingChangesCount}
          onSave={handleSaveMatrix}
          getRoleAuditSummaryFor={getRoleAuditSummaryFor}
        />
      )}

      <UserModal
        modalConfig={modalConfig}
        formData={formData}
        setFormData={setFormData}
        handleApplyChanges={handleApplyChanges}
        closeModal={closeModal}
      />
    </>
  );
}
