"use client";

import React, { memo } from "react";
import { RefreshCw, Search } from "lucide-react";
import StatusFilterDropdown, { type StatusFilterOption } from "@/components/ui/StatusFilterDropdown";

export type AgentNewFilterProps = {
  queryName: string;
  setQueryName: (value: string) => void;
  queryDescription: string;
  setQueryDescription: (value: string) => void;
  queryStatus: string;
  setQueryStatus: (value: string) => void;
  queryPurpose: string;
  setQueryPurpose: (value: string) => void;
  onSubmit?: () => void;
  onRefresh?: () => void;
};

const AGENT_STATUS_OPTIONS: StatusFilterOption[] = [
  {
    value: "",
    label: "All Status",
    description: "Show all agents",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700",
  },
  {
    value: "PUBLISHED",
    label: "Live / Published",
    description: "Active production agents",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "In-development agents",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    description: "Inactive / archived agents",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700",
  },
];

const PURPOSE_OPTIONS = [
  { value: "", label: "All Purposes" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "hybrid", label: "Hybrid" },
];

const AgentNewFilter = memo(function AgentNewFilter({
  queryName,
  setQueryName,
  queryDescription,
  setQueryDescription,
  queryStatus,
  setQueryStatus,
  queryPurpose,
  setQueryPurpose,
  onSubmit,
  onRefresh,
}: AgentNewFilterProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="flex flex-wrap items-center gap-2 py-2"
    >
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full h-8 rounded-lg border border-slate-100 bg-slate-50/50 pl-9 pr-4 text-[12px] font-medium text-slate-900 outline-none focus:border-slate-200 focus:bg-white transition-all"
          placeholder="Search by agent name..."
          value={queryName}
          onChange={(e) => setQueryName(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          className="h-8 rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-[11px] font-bold text-slate-600 outline-none focus:border-slate-200 focus:bg-white transition-colors"
          placeholder="Description or context..."
          value={queryDescription}
          onChange={(e) => setQueryDescription(e.target.value)}
        />

        <select
          value={queryPurpose}
          onChange={(e) => setQueryPurpose(e.target.value)}
          className="h-8 rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 text-[11px] font-bold text-slate-600 outline-none focus:border-slate-200 focus:bg-white transition-colors"
        >
          {PURPOSE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <StatusFilterDropdown
          value={queryStatus}
          onChange={setQueryStatus}
          options={AGENT_STATUS_OPTIONS}
        />

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
        >
          Filter
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          onClick={onRefresh}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
    </form>
  );
});

export default AgentNewFilter;
