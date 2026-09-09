// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Shield, Plus, Trash2, Loader2, X, Pencil, AlertTriangle, Key, Users } from "lucide-react";

const ACCENTS = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#0ea5e9", to: "#38bdf8" },
  { from: "#10b981", to: "#34d399" },
  { from: "#f97316", to: "#fb923c" },
  { from: "#ec4899", to: "#f472b6" },
];

const DEFAULT_DESC = "No description provided";

const Portal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

type RoleItem = {
  id: string;
  rawId?: string;
  role_id?: string;
  name?: string;
  description?: string;
};

type RoleManagerProps = {
  roles?: RoleItem[];
  onCreateRole?: (input: any) => Promise<void> | void;
  onUpdateRole?: (role: any, payload: any) => Promise<void> | void;
  onDeleteRole?: (role: any) => Promise<void> | void;
  onEditPermissions?: (role: any) => void;
  roleAssignments?: Record<
    string,
    { count: number; users: Array<{ id: string; name: string; email: string; disabled?: boolean }> }
  >;
};

export default function RoleManager({
  roles = [],
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onEditPermissions,
  roleAssignments = {},
}: RoleManagerProps) {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeRole, setActiveRole] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [formStatus, setFormStatus] = useState("idle");
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [assignmentModalRole, setAssignmentModalRole] = useState(null);

  const openAssignmentModal = (role) => {
    if (!role) return;
    setAssignmentModalRole(role);
  };

  const closeAssignmentModal = () => {
    setAssignmentModalRole(null);
  };

  const decoratedRoles = useMemo(
    () =>
      roles.map((role, index) => {
        const key = role.rawId || role.id || role.role_id || role.name;
        const assignment = roleAssignments[key] || { count: 0, users: [] };
        return {
          ...role,
          accent: ACCENTS[index % ACCENTS.length],
          assignment,
          roleKey: key,
        };
      }),
    [roles, roleAssignments]
  );

  const isEditMode = modalMode === "edit";

  const openCreateModal = () => {
    setModalMode("create");
    setActiveRole(null);
    setRoleName("");
    setRoleDescription("");
    setFormError("");
    setFormStatus("idle");
    setFormModalOpen(true);
  };

  const openEditModal = (role) => {
    setModalMode("edit");
    setActiveRole(role);
    setRoleName(role.name || "");
    setRoleDescription(role.description || "");
    setFormError("");
    setFormStatus("idle");
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (formStatus === "loading") return;
    setFormModalOpen(false);
    setActiveRole(null);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = roleName.trim();
    const trimmedDescription = roleDescription.trim();

    if (!trimmedName) {
      setFormError("Enter a role name");
      return;
    }

    if (/[a-z]/.test(trimmedName)) {
      setFormError("Role names must be uppercase only");
      return;
    }

    if (isEditMode && !onUpdateRole) {
      setFormError("Editing is disabled");
      return;
    }

    if (!isEditMode && !onCreateRole) {
      setFormError("Creation is disabled");
      return;
    }

    setFormStatus("loading");
    setFormError("");
    try {
      if (isEditMode) {
        await onUpdateRole?.(activeRole, {
          roleName: trimmedName,
          description: trimmedDescription,
        });
      } else {
        await onCreateRole?.({
          roleName: trimmedName,
          description: trimmedDescription,
        });
      }
      setFormStatus("success");
      setTimeout(() => {
        setFormModalOpen(false);
        setActiveRole(null);
        setRoleName("");
        setRoleDescription("");
        setFormStatus("idle");
        setModalMode("create");
      }, 600);
    } catch (err) {
      setFormError(err?.message || "Failed to save role");
      setFormStatus("error");
    }
  };

  const openDeleteModal = (role) => {
    setDeleteTarget(role);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !onDeleteRole) return;
    setDeletingId(deleteTarget.id);
    try {
      await onDeleteRole(deleteTarget);
      setDeletingId(null);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      setDeletingId(null);
      alert(err?.message || "Failed to delete role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">Create Role</p>
            <h3 className="text-2xl font-black text-slate-900">Manage role</h3>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Plus size={16} /> New role
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.05)] p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">Existing roles</p>
            <h4 className="text-lg font-black text-slate-900">{roles.length} Roles</h4>
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Manage existing roles</span>
        </div>

        {roles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 text-sm">
            No roles available — create the first role above.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {decoratedRoles.map((role) => (
              <article
                key={role.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm"
              >
                <div className="relative p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Role</p>
                        <h3 className="text-xl font-black tracking-tight text-slate-900">{role.name}</h3>
                        <button
                          type="button"
                          onClick={() => openAssignmentModal(role)}
                          disabled={!role.assignment.count}
                          title={role.assignment.count ? "View assigned users" : "No users assigned"}
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                            role.assignment.count
                              ? "border-slate-200 text-slate-600 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50"
                              : "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                          }`}
                        >
                          <Users size={12} className={role.assignment.count ? "text-slate-500" : "opacity-40"} />
                          <span className="text-[12px] font-extrabold text-slate-800">
                            {role.assignment.count}
                          </span>
                          <span>assigned</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onEditPermissions && (
                        <button
                          type="button"
                          onClick={() => onEditPermissions(role)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition p-2"
                          title="Edit permissions"
                        >
                          <Key size={16} />
                        </button>
                      )}
                      {onUpdateRole && (
                        <button
                          type="button"
                          onClick={() => openEditModal(role)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition p-2"
                          title="Edit role"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDeleteRole && role.name?.toLowerCase() !== "admin" && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(role)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition p-2"
                          title="Delete role"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed min-h-[48px]">
                    {role.description?.trim() ? role.description : DEFAULT_DESC}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {formModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeFormModal} />
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
              <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">{isEditMode ? "Edit Role" : "New Role"}</p>
                  <h3 className="text-xl font-black text-slate-900">{isEditMode ? `Update ${activeRole?.name}` : "Create a role"}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleFormSubmit}>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 block mb-2">
                    Role name
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    autoFocus
                    onChange={(e) => {
                      setRoleName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="e.g. release_manager"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                {roleName.trim() && /[a-z]/.test(roleName) && (
                  <p className="text-amber-600 text-xs font-semibold">Use uppercase letters only (A-Z).</p>
                )}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 block mb-2">
                    Role description
                  </label>
                  <textarea
                    rows={3}
                    value={roleDescription}
                    onChange={(e) => {
                      setRoleDescription(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="Describe what this role can access"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                {formError && <p className="text-rose-500 text-xs font-semibold">{formError}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!roleName.trim() || formStatus === "loading" || /[a-z]/.test(roleName)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {formStatus === "loading" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isEditMode ? (
                      <Pencil size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    {formStatus === "loading" ? "Saving" : isEditMode ? "Save changes" : "Create role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {deleteModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeDeleteModal} />
            <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertTriangle size={20} />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.35em] text-rose-500">Delete Role</p>
                    <h3 className="text-xl font-black text-slate-900">Remove {deleteTarget?.name}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-4">
                This action will permanently remove the role. Any assignments referencing this role will lose access.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Role ID: <span className="font-mono">{deleteTarget?.rawId || deleteTarget?.id}</span>
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  disabled={!!deletingId}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={!!deletingId}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deletingId ? "Deleting…" : "Delete role"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {assignmentModalRole && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeAssignmentModal} />
            <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col h-[85vh] min-h-0">
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">Role Members</p>
                  <h3 className="text-2xl font-black text-slate-900">
                    {assignmentModalRole.name}
                    <span className="text-base font-semibold text-slate-500 ml-2">
                      ({roleAssignments[assignmentModalRole.rawId || assignmentModalRole.id || assignmentModalRole.role_id || assignmentModalRole.name]?.count || 0} users)
                    </span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Full roster of users assigned to this role.</p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/70 p-6">
                {(() => {
                  const roleKey =
                    assignmentModalRole.rawId ||
                    assignmentModalRole.id ||
                    assignmentModalRole.role_id ||
                    assignmentModalRole.name;
                  const data = roleAssignments[roleKey] || { users: [] };
                  if (!data.users.length) {
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                        No users are currently assigned to this role.
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {data.users
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((user) => (
                          <div
                            key={user.id}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm"
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <p className="min-w-0 max-w-[220px] truncate text-sm font-semibold text-slate-900">
                                {user.name}
                              </p>
                              <span className="shrink-0 text-slate-300">|</span>
                              <p className="min-w-0 truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                            {user.disabled && (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                                Disabled
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  className="h-10 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
