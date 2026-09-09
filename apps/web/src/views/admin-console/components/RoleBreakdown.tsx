"use client";

import React, { useMemo } from "react";
import "./RoleBreakdown.css";

const ACTION_COPY: Record<string, string> = {
  create: "Create the new data",
  edit: "Edit the existing data",
  delete: "Delete the existing data",
  clone: "Clone the existing data",
};

const mapActionType = (label = "") => {
  const lower = label.toLowerCase();
  if (lower.includes("create") || lower.includes("add") || lower.includes("new")) return "create";
  if (
    lower.includes("edit") ||
    lower.includes("modify") ||
    lower.includes("update") ||
    lower.includes("adjust") ||
    lower.includes("adjustment")
  )
    return "edit";
  if (lower.includes("delete") || lower.includes("remove")) return "delete";
  if (lower.includes("clone") || lower.includes("copy") || lower.includes("duplicate")) return "clone";
  return null;
};

const formatActionText = (action: string) => {
  const type = mapActionType(action);
  if (type && ACTION_COPY[type]) return ACTION_COPY[type];
  return action;
};

export default function RoleBreakdown({
  selectedRole,
  roleAuditSummary = {},
  allScreens = [],
  selectedCount = 0,
  isOpen = true,
}: {
  selectedRole?: { name?: string } | null;
  roleAuditSummary?: Record<string, Record<string, string[]>>;
  allScreens?: Array<{
    id?: string;
    name?: string;
    category?: string;
    icon?: React.ComponentType<{ size?: number }>;
  }>;
  selectedCount?: number;
  isOpen?: boolean;
}) {
  const roleName = selectedRole?.name || "Role";

  const screenLookup = useMemo(() => {
    const map = new Map();
    allScreens.forEach((screen) => {
      if (screen?.id) map.set(screen.id, screen);
    });
    return map;
  }, [allScreens]);

  const configuredScreens = useMemo(() => {
    if (!roleAuditSummary || typeof roleAuditSummary !== "object") return [];
    return Object.entries(roleAuditSummary)
      .map(([screenId, groups]) => {
        const meta = screenLookup.get(screenId) || {};
        const ScreenIconComponent = meta.icon;
        const screenName = meta.name || screenId;
        const groupEntries = Object.entries(groups || {}).map(([groupName, actions = []]) => ({
          name: groupName,
          actions: Array.from(new Set(actions)).map((action) => ({
            key: action,
            text: formatActionText(action),
          })),
        }));

        return {
          screenId,
          screenName,
          category: meta.category,
          icon: ScreenIconComponent,
          groups: groupEntries,
        };
      })
      .sort((a, b) => a.screenName.localeCompare(b.screenName));
  }, [roleAuditSummary, screenLookup]);

  if (!isOpen) return null;

  return (
    <aside className="role-breakdown">
      <div className="role-breakdown__header">Role Breakdown</div>
      <div className="role-breakdown__body">
        <section className="role-breakdown__card">
          <div className="role-breakdown__card-header">
            <div>
              <p className="role-breakdown__role-name">{roleName}</p>
              <h3 className="role-breakdown__title">Permission List</h3>
            </div>
            <span className="role-breakdown__pill">{configuredScreens.length} Pages</span>
          </div>

          <div className="role-breakdown__progress">
            <p className="role-breakdown__eyebrow">Total permissions</p>
            <h4 className="role-breakdown__title" style={{ marginTop: 0 }}>{selectedCount}</h4>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((selectedCount / 60) * 100, 100)}%` }}
              />
            </div>
          </div>

          {configuredScreens.length === 0 ? (
            <p className="role-breakdown__empty">
              No permissions have been configured for this role yet. Toggle a page on the left to see it listed here.
            </p>
          ) : (
            <div className="role-breakdown__pages">
              {configuredScreens.map((screen) => (
                <article key={screen.screenId} className="role-breakdown__page">
                  <div className="role-breakdown__page-header">
                    <div className="role-breakdown__icon">
                      {screen.icon ? <screen.icon size={18} /> : <span>{screen.screenName?.[0] || "-"}</span>}
                    </div>
                    <div>
                      <div className="role-breakdown__page-title">{screen.screenName}</div>
                      {screen.category && <div className="role-breakdown__page-category">{screen.category}</div>}
                    </div>
                  </div>

                  <div className="role-breakdown__groups">
                    {screen.groups.map((group) => (
                      <div key={`${screen.screenId}-${group.name}`} className="role-breakdown__group">
                        <div className="role-breakdown__group-title">{group.name}</div>
                        <ul className="role-breakdown__actions">
                          {group.actions.map((action) => (
                            <li key={`${screen.screenId}-${group.name}-${action.key}`} className="role-breakdown__action">
                              <span className="role-breakdown__bullet" />
                              <span>{action.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
