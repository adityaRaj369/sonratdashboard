// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, PlusCircle, UserX, UserCheck2, Trash2, Mail, Key } from "lucide-react";
import MultiRoleBadge from "./MultiRoleBadge";
import Pagination from "./Pagination";

const DROPDOWN_MAX_WIDTH = 600;

type RoleOption = {
  id: string;
  name?: string;
  role_name?: string;
  role_id?: string;
  rawId?: string;
  description?: string;
  bg?: string;
  text?: string;
  border?: string;
};

type AssignmentUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  disabled?: boolean;
  roleIds?: string[];
};

type MultiRoleAssignmentProps = {
  users?: AssignmentUser[];
  roleOptions?: RoleOption[];
  loading?: boolean;
  error?: string | null;
  pagination?: {
    page?: number;
    totalPages?: number;
    total?: number;
    limit?: number;
  } | null;
  page?: number;
  pageSize?: number;
  searchName?: string;
  searchEmail?: string;
  onSearchNameChange?: (value: string) => void;
  onSearchEmailChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  activeUserRoleSelector?: string | null;
  setActiveUserRoleSelector?: (id: string | null) => void;
  onToggleRole?: (userId: string, roleId: string) => void;
  onToggleDisable?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  openModal?: (type: string, user?: AssignmentUser | null) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export default function MultiRoleAssignment({
  users = [],
  roleOptions = [],
  loading = false,
  error = "",
  pagination = null,
  page = 1,
  pageSize = 10,
  searchName = "",
  searchEmail = "",
  onSearchNameChange,
  onSearchEmailChange,
  onSearchSubmit,
  activeUserRoleSelector,
  setActiveUserRoleSelector,
  onToggleRole,
  onToggleDisable,
  onDeleteUser,
  openModal,
  onPageChange,
  onPageSizeChange,
}: MultiRoleAssignmentProps) {
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AssignmentUser | null>(null);
  const [pendingStatusUser, setPendingStatusUser] = useState<AssignmentUser | null>(null);
  const [pendingRoleRemoval, setPendingRoleRemoval] = useState<{
    userId: string;
    userName: string;
    roleId: string;
    roleName: string;
  } | null>(null);

  useEffect(() => {
    if (!activeUserRoleSelector) {
      setDropdownPosition(null);
      return;
    }

    const handleWindowChange = () => {
      setActiveUserRoleSelector?.(null);
      setDropdownPosition(null);
    };

    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);
    return () => {
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, [activeUserRoleSelector, setActiveUserRoleSelector]);

  const currentPageNumber = Math.max(1, pagination?.page || page || 1);
  const totalPages = Math.max(1, pagination?.totalPages || 1);
  const currentPageIndex = Math.max(0, currentPageNumber - 1);
  const totalUsers = Number.isFinite(Number(pagination?.total)) ? Number(pagination.total) : users.length;
  const effectivePageSize = Number.isFinite(Number(pagination?.limit))
    ? Number(pagination.limit)
    : pageSize;

  const renderDeleteConfirm = () => {
    if (!pendingDeleteUser) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
        onClick={() => setPendingDeleteUser(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 mb-1">Confirm Delete</p>
          <h3 className="text-xl font-black text-slate-900">Remove user?</h3>
          <p className="text-sm text-slate-500 mt-2">
            This will permanently remove {pendingDeleteUser.name ? <strong>{pendingDeleteUser.name}</strong> : "this user"}
            {pendingDeleteUser.email ? ` (${pendingDeleteUser.email})` : ""} from the roster.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              onClick={() => setPendingDeleteUser(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold shadow hover:bg-rose-600"
              onClick={() => {
                if (pendingDeleteUser?.id) {
                  onDeleteUser?.(pendingDeleteUser.id);
                }
                setPendingDeleteUser(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderStatusConfirm = () => {
    if (!pendingStatusUser) return null;
    const isRestore = Boolean(pendingStatusUser.disabled);
    return createPortal(
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
        onClick={() => setPendingStatusUser(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Confirm Action</p>
          <h3 className="text-xl font-black text-slate-900">{isRestore ? "Restore user?" : "Suspend user?"}</h3>
          <p className="text-sm text-slate-500 mt-2">
            {isRestore ? "Restore" : "Suspend"}{" "}
            {pendingStatusUser.name ? <strong>{pendingStatusUser.name}</strong> : "this user"}
            {pendingStatusUser.email ? ` (${pendingStatusUser.email})` : ""}?
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              onClick={() => setPendingStatusUser(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold shadow hover:bg-slate-900"
              onClick={() => {
                onToggleDisable?.(pendingStatusUser.id);
                setPendingStatusUser(null);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderRoleRemoveConfirm = () => {
    if (!pendingRoleRemoval) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
        onClick={() => setPendingRoleRemoval(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Confirm Role Removal</p>
          <h3 className="text-xl font-black text-slate-900">Remove role?</h3>
          <p className="text-sm text-slate-500 mt-2">
            Remove <strong>{pendingRoleRemoval.roleName}</strong> from{" "}
            {pendingRoleRemoval.userName ? <strong>{pendingRoleRemoval.userName}</strong> : "this user"}?
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              onClick={() => setPendingRoleRemoval(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold shadow hover:bg-slate-900"
              onClick={() => {
                onToggleRole?.(pendingRoleRemoval.userId, pendingRoleRemoval.roleId);
                setPendingRoleRemoval(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const computeDropdownPosition = (triggerRect) => {
    const viewportPadding = 16;
    const width = Math.min(DROPDOWN_MAX_WIDTH, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - width
    );
    const top = triggerRect.bottom + 8;
    return { top, left, width };
  };

  const handleRoleButtonClick = (event, userId) => {
    event.stopPropagation();
    if (activeUserRoleSelector === userId) {
      setActiveUserRoleSelector?.(null);
      setDropdownPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition(computeDropdownPosition(rect));
    setActiveUserRoleSelector?.(userId);
  };

  const normalizedRoles = roleOptions.map((role) => ({
    id: role.id ?? role.role_id ?? role.rawId,
    name: role.name ?? role.role_name ?? role.role_id ?? "Untitled Role",
    description: role.description ?? role.role_name ?? "",
    rawId: role.rawId ?? role.role_id ?? role.id ?? "",
  }));

  const renderRoleDropdown = (user) => {
    if (!dropdownPosition || activeUserRoleSelector !== user.id) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
        onClick={() => {
          setActiveUserRoleSelector?.(null);
          setDropdownPosition(null);
        }}
      >
        <div
          className="relative bg-white border border-slate-700 rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.45)] overflow-hidden max-h-[80vh] w-full mx-4 md:mx-0 animate-in fade-in slide-in-from-bottom-2"
          style={{
            width:
              dropdownPosition?.width ||
              Math.min(DROPDOWN_MAX_WIDTH, typeof window !== "undefined" ? window.innerWidth - 64 : DROPDOWN_MAX_WIDTH),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-[11px] font-black text-slate-600 tracking-tight uppercase">
            Select Roles to Add
          </div>
          <div className="overflow-y-auto max-h-[60vh] px-5 py-4">
            {normalizedRoles.length === 0 && (
              <div className="w-full text-[10px] text-slate-400 font-semibold px-2 py-4 text-center">
                No roles available. Add roles in User Roles tab.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start" style={{ minHeight: "3.5rem" }}>
              {normalizedRoles.map((roleItem) => {
                const isAssigned = (user.roleIds || []).some(
                  (assignedId) => assignedId === roleItem.id || assignedId === roleItem.rawId
                );
                return (
                  <button
                    key={roleItem.id}
                    type="button"
                    disabled={isAssigned}
                    className={`w-full appearance-none inline-flex p-0 border-none bg-transparent focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none rounded-xl ${
                      isAssigned ? "pointer-events-none" : ""
                    }`}
                    onClick={() => {
                      if (!isAssigned) {
                        onToggleRole?.(user.id, roleItem.id);
                      }
                    }}
                  >
                    <MultiRoleBadge
                      roleId={roleItem.id}
                      roleOptions={roleOptions}
                      disabled={isAssigned}
                      showIdentifier={false}
                      className="w-full"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full min-h-0 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">Multi-Role Assignment</h2>
          <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {totalUsers} users
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="w-56">
            <input
              type="text"
              placeholder="Search by name"
              value={searchName}
              onChange={(e) => onSearchNameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchSubmit?.();
                }
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 w-full text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
            />
          </div>
          <div className="w-56">
            <input
              type="text"
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => onSearchEmailChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchSubmit?.();
                }
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 w-full text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => onSearchSubmit?.()}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-700 text-xs font-black px-4 h-9 border border-slate-200 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <Search size={12} />
            Search
          </button>
          <button
            type="button"
            onClick={() => openModal?.("create")}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-800 text-xs font-black px-4 h-9 border border-slate-200 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <PlusCircle size={12} />
            Create User
          </button>
        </div>
      </div>

      {!loading && error && (
        <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50/95 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Staff Member</th>
              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Email</th>
              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Status</th>
              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Assigned Role Stack</th>
              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={`role-skeleton-${rowIndex}`}>
                  <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded-md bg-slate-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded-md bg-slate-100" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-16 animate-pulse rounded-md bg-slate-100" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-full animate-pulse rounded-md bg-slate-100" /></td>
                  <td className="px-4 py-3 text-right"><div className="ml-auto h-7 w-20 animate-pulse rounded-md bg-slate-100" /></td>
                </tr>
              ))
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  No users found for current filters.
                </td>
              </tr>
            )}
            {!loading && users.map((user, idx) => (
              <tr
                key={user.id}
                className={`group transition-colors ${idx % 2 ? "bg-slate-50/20" : "bg-white"} hover:bg-indigo-50/40`}
              >
                <td className={`px-4 py-2 ${user.disabled ? "opacity-40 grayscale" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shadow-sm text-[11px]">
                      {user.avatar}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-800 text-[11px]">{user.name}</span>
                      <span className="text-slate-400 text-[10px]">ID: {user.id}</span>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-2 ${user.disabled ? "opacity-40 grayscale" : ""}`}>
                  <span className="block text-[11px] font-semibold text-slate-700 truncate" title={user.email}>
                    {user.email || "-"}
                  </span>
                </td>
                <td className={`px-4 py-2 ${user.disabled ? "opacity-40 grayscale" : ""}`}>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      user.disabled ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {user.disabled ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className={`px-4 py-2 ${user.disabled ? "opacity-40 grayscale" : ""}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 items-stretch pr-2" style={{ minHeight: "2.75rem" }}>
                    {!user.roleIds?.length && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">
                        No roles assigned
                      </div>
                    )}
                    {user.roleIds?.map((roleId) => (
                      <div key={roleId} className="min-w-0">
                        <MultiRoleBadge
                          roleId={roleId}
                          roleOptions={roleOptions}
                          onRemove={() => {
                            const roleMeta = roleOptions.find((r) => r.id === roleId || r.rawId === roleId);
                            setPendingRoleRemoval({
                              userId: user.id,
                              userName: user.name,
                              roleId,
                              roleName: roleMeta?.name || roleMeta?.role_name || roleId,
                            });
                          }}
                          showIdentifier={false}
                          compact
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center justify-end gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm whitespace-nowrap">
                    <button
                      onClick={() => openModal?.("email", user)}
                      className="h-7 w-7 inline-flex items-center justify-center text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      title="Change Email"
                    >
                      <Mail size={12} />
                    </button>
                    <button
                      onClick={() => openModal?.("password", user)}
                      className="h-7 w-7 inline-flex items-center justify-center text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      title="Change Password"
                    >
                      <Key size={12} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <div className="relative">
                      <button
                        onClick={(e) => handleRoleButtonClick(e, user.id)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Add role"
                      >
                        <PlusCircle size={13} />
                      </button>
                      {renderRoleDropdown(user)}
                    </div>
                    <button
                      onClick={() => setPendingStatusUser(user)}
                      className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold inline-flex items-center gap-1 hover:bg-slate-50 text-[10px]"
                      title={user.disabled ? "Restore user" : "Suspend user"}
                    >
                      {user.disabled ? <UserCheck2 size={11} /> : <UserX size={11} />}
                      <span>{user.disabled ? "Restore" : "Suspend"}</span>
                    </button>
                    <button
                      onClick={() => setPendingDeleteUser(user)}
                      className="h-7 w-7 inline-flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination
          page={currentPageIndex}
          totalPages={totalPages}
          totalItems={totalUsers}
          pageSize={effectivePageSize}
          pageSizeOptions={[10, 20, 50]}
          onFirst={() => onPageChange?.(1)}
          onPrev={() => onPageChange?.(Math.max(1, currentPageNumber - 1))}
          onNext={() => onPageChange?.(Math.min(totalPages, currentPageNumber + 1))}
          onLast={() => onPageChange?.(totalPages)}
          onPageSizeChange={(next) => onPageSizeChange?.(next)}
        />
      </div>
      {renderRoleRemoveConfirm()}
      {renderStatusConfirm()}
      {renderDeleteConfirm()}
    </div>
  );
}
