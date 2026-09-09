"use client";

import React from "react";

export default function MultiRoleBadge({
  roleId,
  roleOptions = [],
  onRemove,
  disabled = false,
  showIdentifier = true,
  compact = false,
  className = "",
}: {
  roleId?: string | null;
  roleOptions?: Array<{
    id?: string;
    rawId?: string;
    name?: string;
    role_name?: string;
    description?: string;
    bg?: string;
    text?: string;
    border?: string;
  }>;
  onRemove?: () => void;
  disabled?: boolean;
  showIdentifier?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (!roleId) return null;

  const role = roleOptions.find((r) => r.id === roleId || r.rawId === roleId);
  const displayName = role?.name || role?.role_name || roleId;
  const chipClasses = [role?.bg || "bg-slate-100", role?.text || "text-slate-600", role?.border || "border-slate-200"].join(" ");

  const badgeStyle = {
    padding: compact ? "3px 8px" : "10px 14px",
    borderRadius: compact ? "8px" : "10px",
    fontSize: compact ? "10px" : "12px",
    columnGap: compact ? "4px" : "10px",
    minWidth: "0",
  };

  const disabledClasses = disabled ? "opacity-40 grayscale cursor-not-allowed border-dashed" : "";

  return (
    <span
      className={`inline-flex items-center justify-between border font-black shadow-sm tracking-tight transition-opacity ${chipClasses} ${disabledClasses} ${className}`}
      style={badgeStyle}
      title={role?.description || roleId}
    >
      <span className="flex flex-col text-left" style={{ lineHeight: "1.2" }}>
        <span style={{ fontSize: compact ? "10px" : "12px" }}>{displayName}</span>
        {showIdentifier && (
          <span className="font-semibold text-slate-400" style={{ fontSize: "10px" }}>
            {role?.rawId || roleId}
          </span>
        )}
      </span>
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/5 rounded-full transition-colors"
          style={{ padding: compact ? "2px" : "5px" }}
        >
          ×
        </button>
      )}
    </span>
  );
}
