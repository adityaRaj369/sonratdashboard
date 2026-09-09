// @ts-nocheck
"use client";

import React from "react";
import { PlusCircle, Pencil, Copy, Trash2, Play, Pause, Eye, FilePenLine, Rocket } from "lucide-react";

const TOGGLE_WIDTH = 64;
const TOGGLE_HEIGHT = 28;
const TOGGLE_KNOB_SIZE = 22;
const TOGGLE_PADDING_X = 4;
const TOGGLE_TRAVEL = TOGGLE_WIDTH - TOGGLE_PADDING_X * 2 - TOGGLE_KNOB_SIZE;

const TOGGLE_BASE_STYLE = {
  height: TOGGLE_HEIGHT,
  width: TOGGLE_WIDTH,
  borderRadius: 4,
  borderWidth: 2,
  borderStyle: "solid",
  display: "inline-flex",
  alignItems: "center",
  padding: `0 ${TOGGLE_PADDING_X}px`,
  position: "relative",
  cursor: "pointer",
  transition: "all 200ms ease",
  boxSizing: "border-box",
};

const TOGGLE_ON_STYLE = {
  backgroundColor: "#059669",
  borderColor: "#047857",
  boxShadow: "0 6px 14px rgba(5, 150, 105, 0.35)",
};

const TOGGLE_OFF_STYLE = {
  backgroundColor: "#dc2626",
  borderColor: "#b91c1c",
  boxShadow: "0 6px 14px rgba(220, 38, 38, 0.35)",
};

const TOGGLE_KNOB_STYLE = {
  height: TOGGLE_KNOB_SIZE,
  width: TOGGLE_KNOB_SIZE,
  borderRadius: 4,
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.35)",
  transition: "transform 200ms ease",
};

const TOGGLE_LABEL_STYLE = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#ffffff",
};

const ToggleSwitch = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    type="button"
    aria-pressed={enabled}
    style={{
      ...TOGGLE_BASE_STYLE,
      ...(enabled ? TOGGLE_ON_STYLE : TOGGLE_OFF_STYLE),
    }}
  >
    <span
      aria-hidden
      style={{
        ...TOGGLE_KNOB_STYLE,
        transform: enabled ? `translateX(${TOGGLE_TRAVEL}px)` : "translateX(0)",
      }}
    />
    <span
      style={{
        ...TOGGLE_LABEL_STYLE,
        justifyContent: enabled ? "flex-start" : "flex-end",
        paddingLeft: enabled ? 10 : 4,
        paddingRight: enabled ? 4 : 10,
        textAlign: enabled ? "left" : "right",
      }}
    >
      {enabled ? "On" : "Off"}
    </span>
  </button>
);

const DEFAULT_PALETTE = {
  active: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    borderColor: "#0f172a",
    boxShadow: "0 10px 20px rgba(15,23,42,0.25)",
  },
  idle: {
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    borderColor: "#e2e8f0",
  },
};

const ACTIVE_INDICATOR_STYLE = {
  backgroundColor: "#dbeafe",
  borderColor: "#93c5fd",
  boxShadow: "0 0 0 1px rgba(147,197,253,0.8)",
};

const ACTION_META = {
  create: {
    label: "Create",
    icon: PlusCircle,
    palette: {
      active: {
        backgroundColor: "#34d399",
        color: "#0a3d2c",
        borderColor: "#6ee7b7",
        boxShadow: "0 8px 18px rgba(16,185,129,0.25)",
      },
      idle: {
        backgroundColor: "#f4fff9",
        color: "#0f6a50",
        borderColor: "#c7f9e4",
      },
    },
  },
  edit: {
    label: "Edit",
    icon: Pencil,
    palette: {
      active: {
        backgroundColor: "#fdba74",
        color: "#7c2d12",
        borderColor: "#fed7aa",
        boxShadow: "0 8px 18px rgba(251,146,60,0.25)",
      },
      idle: {
        backgroundColor: "#fff4e6",
        color: "#b45309",
        borderColor: "#ffe0c2",
      },
    },
  },
  clone: {
    label: "Clone",
    icon: Copy,
    palette: {
      active: {
        backgroundColor: "#7dd3fc",
        color: "#0c4a6e",
        borderColor: "#bae6fd",
        boxShadow: "0 8px 18px rgba(125,211,252,0.25)",
      },
      idle: {
        backgroundColor: "#e8f6ff",
        color: "#10638c",
        borderColor: "#cdeffd",
      },
    },
  },
  delete: {
    label: "Delete",
    icon: Trash2,
    palette: {
      active: {
        backgroundColor: "#fb7185",
        color: "#7f1d1d",
        borderColor: "#fecdd3",
        boxShadow: "0 8px 18px rgba(251,113,133,0.25)",
      },
      idle: {
        backgroundColor: "#ffeef1",
        color: "#b91c1c",
        borderColor: "#fedce2",
      },
    },
  },
  read: {
    label: "Read",
    icon: Eye,
    palette: DEFAULT_PALETTE,
  },
  write: {
    label: "Write",
    icon: FilePenLine,
    palette: {
      active: {
        backgroundColor: "#c4b5fd",
        color: "#4c1d95",
        borderColor: "#ddd6fe",
        boxShadow: "0 8px 18px rgba(139,92,246,0.25)",
      },
      idle: {
        backgroundColor: "#f5f3ff",
        color: "#6d28d9",
        borderColor: "#ede9fe",
      },
    },
  },
  publish: {
    label: "Publish",
    icon: Rocket,
    palette: {
      active: {
        backgroundColor: "#a5b4fc",
        color: "#312e81",
        borderColor: "#c7d2fe",
        boxShadow: "0 8px 18px rgba(99,102,241,0.25)",
      },
      idle: {
        backgroundColor: "#eef2ff",
        color: "#4338ca",
        borderColor: "#e0e7ff",
      },
    },
  },
  start: {
    label: "Start",
    icon: Play,
    palette: {
      active: {
        backgroundColor: "#86efac",
        color: "#14532d",
        borderColor: "#bbf7d0",
        boxShadow: "0 8px 18px rgba(34,197,94,0.25)",
      },
      idle: {
        backgroundColor: "#f0fdf4",
        color: "#15803d",
        borderColor: "#dcfce7",
      },
    },
  },
  pause: {
    label: "Pause",
    icon: Pause,
    palette: {
      active: {
        backgroundColor: "#fcd34d",
        color: "#78350f",
        borderColor: "#fde68a",
        boxShadow: "0 8px 18px rgba(245,158,11,0.25)",
      },
      idle: {
        backgroundColor: "#fffbeb",
        color: "#b45309",
        borderColor: "#fef3c7",
      },
    },
  },
};

const ACTION_ORDER = ["create", "edit", "clone", "delete", "read", "write", "publish", "start", "pause"];

type PermissionAction = {
  label: string;
  actionType: string;
  permissionKey: string;
};

type PermissionGroup = {
  group: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  togglePermissionKey?: string;
  description?: string;
  actions: PermissionAction[];
};

type PermissionMatrixProps = {
  activeScreenId: string;
  activeScreen?: { name?: string; id?: string } | null;
  layout: Record<string, PermissionGroup[]>;
  isGroupEnabled: (group: PermissionGroup) => boolean;
  toggleGroupEnabled: (group: PermissionGroup) => void;
  hasPermission: (permissionKey: string) => boolean;
  togglePermission: (group: PermissionGroup, action: PermissionAction) => void;
  loading?: boolean;
  error?: string | null;
};

export default function PermissionMatrix({
  activeScreenId,
  activeScreen,
  layout,
  isGroupEnabled,
  toggleGroupEnabled,
  hasPermission,
  togglePermission,
  loading,
  error,
}: PermissionMatrixProps) {
  const groups = layout[activeScreenId] || [];
  const hasGroups = groups.length > 0;

  const renderActionButton = (group, action, activeGroup) => {
    if (!action?.permissionKey) return null;

    const meta = ACTION_META[action.actionType] || {
      label: action.label,
      icon: PlusCircle,
      palette: DEFAULT_PALETTE,
    };
    const { icon: Icon, palette } = meta;
    const paletteStyles = palette || DEFAULT_PALETTE;
    const isActive = hasPermission(action.permissionKey);
    const showActiveDot = Boolean(isActive);
    const isDisabled = !activeGroup;
    const buttonStyles = {
      ...(paletteStyles.idle || {}),
      ...(isActive && paletteStyles.active?.boxShadow ? { boxShadow: paletteStyles.active.boxShadow } : {}),
      ...(isDisabled ? { opacity: 0.6, cursor: "not-allowed" } : {}),
    };

    return (
      <button
        type="button"
        disabled={isDisabled}
        aria-pressed={isActive}
        onClick={() => togglePermission(group, action)}
        className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 text-[11px] font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-200"
        style={buttonStyles}
      >
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full border transition-colors duration-200 ${
            showActiveDot
              ? "border-sky-600 bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.35)]"
              : "border-slate-300 bg-white"
          }`}
          style={showActiveDot ? ACTIVE_INDICATOR_STYLE : undefined}
        />
        <Icon size={14} />
        <span className="whitespace-nowrap">{action.label}</span>
      </button>
    );
  };

  const renderTable = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_6px_24px_rgba(15,23,42,0.05)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">{activeScreen?.name} Permissions</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
              <th className="px-6 py-3 font-black">Entities</th>
              {ACTION_ORDER.map((type) => (
                <th key={type} className="px-4 py-3 text-center font-black">
                  {ACTION_META[type].label}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-black">Enable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => {
              const activeGroup = isGroupEnabled(group);
              return (
                <tr key={group.group} className={`text-sm ${!activeGroup ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      {group.icon && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                          <group.icon size={16} className="text-slate-500" />
                        </span>
                      )}
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{group.group}</span>
                      </div>
                    </div>
                  </td>
                  {ACTION_ORDER.map((type) => {
                    const action = group.actions.find((a) => a.actionType === type);
                    return (
                      <td key={`${group.group}-${type}`} className="px-4 py-4 text-center">
                        <div className="inline-flex justify-center">
                          {action ? renderActionButton(group, action, activeGroup) : null}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-center">
                    <ToggleSwitch enabled={activeGroup} onToggle={() => toggleGroupEnabled(group)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center shadow-[0_6px_24px_rgba(15,23,42,0.03)]">
      <p className="text-sm font-black text-slate-600">No permission groups configured for this screen yet.</p>
      <p className="text-[11px] text-slate-400 mt-2">Configure layout entries for {activeScreen?.name || 'this screen'} to manage permissions.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
        Loading permission matrix…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-rose-200 text-rose-600 rounded-2xl p-6 text-sm font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{activeScreen?.name}</h2>
        <span className="text-[10px] font-black tracking-[0.35em] uppercase bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
          Permissions
        </span>
      </div>

      <div className="space-y-6">{hasGroups ? renderTable() : renderEmptyState()}</div>
    </div>
  );
}
