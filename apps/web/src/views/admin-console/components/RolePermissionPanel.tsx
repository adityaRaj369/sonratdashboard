"use client";

import React from "react";
import { X } from "lucide-react";
import PermissionMatrix from "./PermissionMatrix";

export default function RolePermissionPanel({
  role,
  screens,
  permissionNavScreens,
  selectedScreenId,
  onSelectScreen,
  canClose,
  onClose,
  layoutByScreen,
  isGroupEnabled,
  toggleGroupEnabled,
  hasPermission,
  togglePermission,
  matrixLoading,
  matrixError,
  savingMatrix,
  pendingChangesCount,
  onSave,
  getRoleAuditSummaryFor,
}: {
  role: { id?: string; rawId?: string; name?: string } | null;
  screens: Array<{ id: string; name?: string; icon?: React.ComponentType<{ size?: number; className?: string }> }>;
  permissionNavScreens: string[];
  selectedScreenId: string | null;
  onSelectScreen: (id: string | null) => void;
  canClose: boolean;
  onClose: () => void;
  layoutByScreen: Record<string, any[]>;
  isGroupEnabled: (group: any, roleId?: string | null) => boolean;
  toggleGroupEnabled: (group: any, roleId?: string | null) => void;
  hasPermission: (permissionKey: string, roleId?: string | null) => boolean;
  togglePermission: (group: any, action: any, roleId?: string | null) => void;
  matrixLoading?: boolean;
  matrixError?: string | null;
  savingMatrix?: boolean;
  pendingChangesCount?: number;
  onSave?: () => void;
  getRoleAuditSummaryFor: (role: any) => Record<string, Record<string, string[]>>;
}) {
  if (!role) return null;

  const summary = getRoleAuditSummaryFor(role);
  const summaryEntries = Object.entries(summary);
  const overlayClass = canClose ? "cursor-pointer" : "cursor-not-allowed";

  const handleOverlayClick = () => {
    if (canClose) onClose();
  };

  const handleCloseClick = () => {
    if (canClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] ${overlayClass}`}
        onClick={handleOverlayClick}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className="h-full w-[1580px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Role permissions</p>
              <h2 className="text-lg font-black text-slate-900 leading-tight mt-1 truncate">{role.name}</h2>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">ID • {role.rawId || role.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseClick}
                disabled={!canClose}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Close permissions panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-50/60">
            <div className="flex h-full gap-4">
              <aside className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Permission screens</p>
                <div className="space-y-1">
                  {permissionNavScreens.map((sid) => {
                    const screenObj = screens.find((s) => s.id === sid);
                    const active = selectedScreenId === sid;
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => onSelectScreen(sid)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-semibold flex items-center gap-2 ${
                          active
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-[0_4px_12px_rgba(99,102,241,0.12)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {screenObj?.icon ? (
                          <screenObj.icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                        ) : null}
                        <span className="truncate">{screenObj?.name || sid}</span>
                      </button>
                    );
                  })}
                  {!permissionNavScreens.length && (
                    <div className="text-xs text-slate-500">No permission screens defined.</div>
                  )}
                </div>
              </aside>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedScreenId ? (
                  <PermissionMatrix
                    activeScreenId={selectedScreenId}
                    activeScreen={screens.find((s) => s.id === selectedScreenId)}
                    layout={layoutByScreen}
                    isGroupEnabled={(group) => isGroupEnabled(group, role.rawId || role.id)}
                    toggleGroupEnabled={(group) => toggleGroupEnabled(group, role.rawId || role.id)}
                    hasPermission={(permissionKey) => hasPermission(permissionKey, role.rawId || role.id)}
                    togglePermission={(group, action) => togglePermission(group, action, role.rawId || role.id)}
                    loading={matrixLoading}
                    error={matrixError}
                  />
                ) : (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
                    No permission screens available.
                  </div>
                )}
              </div>

              <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">All permissions</p>
                <h4 className="text-base font-black text-slate-900 mt-1">Role-wide view</h4>
                <p className="text-[11px] text-slate-500 mb-4">Across all screens for {role.name}</p>

                {summaryEntries.length === 0 ? (
                  <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-500">
                    No permissions enabled for this role.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summaryEntries.map(([screenId, groups]) => {
                      const screenObj = screens.find((s) => s.id === screenId);
                      return (
                        <div key={screenId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            {screenObj?.icon ? (
                              <span className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                <screenObj.icon size={14} className="text-slate-500" />
                              </span>
                            ) : null}
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{screenObj?.name || screenId}</p>
                              <p className="text-[11px] font-semibold text-slate-500">{Object.keys(groups).length} groups</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(groups).map(([groupName, actions]) => (
                              <div key={groupName} className="bg-white border border-slate-200 rounded-lg px-2.5 py-2">
                                <p className="text-[11px] font-bold text-slate-700">{groupName}</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {actions.map((action) => (
                                    <span
                                      key={action}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700"
                                    >
                                      ● {action}
                                    </span>
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
              </aside>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-slate-500">
              Changes apply to role: <span className="font-bold text-slate-800">{role.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleCloseClick}
                disabled={!canClose}
              >
                Close
              </button>
              <button
                type="button"
                className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-60"
                onClick={onSave}
                disabled={savingMatrix || !pendingChangesCount}
              >
                {savingMatrix ? "Saving…" : "Save permissions"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
