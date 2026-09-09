import { loadDemoStore, type DemoAuditEntry } from "./demo-admin-store";

export type AuditFilters = {
  name?: string;
  email?: string;
  module?: string | string[];
  action?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  scope?: string;
};

function normalizeList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.length) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function filterEntries(entries: DemoAuditEntry[], filters: AuditFilters) {
  const name = filters.name?.trim().toLowerCase();
  const email = filters.email?.trim().toLowerCase();
  const modules = normalizeList(filters.module).map((m) => m.toLowerCase());
  const actions = normalizeList(filters.action).map((a) => a.toLowerCase());
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`).getTime() : null;

  return entries.filter((entry) => {
    if (name && !entry.user?.toLowerCase().includes(name)) return false;
    if (email && !entry.userEmail?.toLowerCase().includes(email)) return false;
    if (modules.length) {
      const hay = `${entry.module || ""} ${entry.pagePath || ""} ${entry.scope || ""}`.toLowerCase();
      if (!modules.some((m) => hay.includes(m.toLowerCase()))) return false;
    }
    if (actions.length) {
      const action = (entry.action || "").toLowerCase();
      if (!actions.some((a) => action.includes(a.toLowerCase()))) return false;
    }
    const ts = new Date(entry.timestampUtc || entry.timestamp).getTime();
    if (from !== null && !Number.isNaN(ts) && ts < from) return false;
    if (to !== null && !Number.isNaN(ts) && ts > to) return false;
    return true;
  });
}

export async function readAuditEntries(filters: AuditFilters = {}) {
  const state = loadDemoStore();
  const filtered = filterEntries(state.audit, filters);
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: filtered.slice(start, start + limit),
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

export async function exportAuditLogs(filters: AuditFilters = {}) {
  const state = loadDemoStore();
  const filtered = filterEntries(state.audit, filters);
  const header = ["timestamp", "user", "email", "scope", "action", "details", "module"];
  const rows = filtered.map((e) =>
    [e.timestampUtc, e.user, e.userEmail, e.scope, e.action, e.details, e.module || e.pagePath || ""]
      .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
    },
  });
}
