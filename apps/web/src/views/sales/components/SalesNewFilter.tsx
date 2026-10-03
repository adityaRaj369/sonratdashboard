"use client";

import React, { memo } from "react";
import { RefreshCw, Search } from "lucide-react";
import StatusFilterDropdown, { type StatusFilterOption } from "@/components/ui/StatusFilterDropdown";
import { useAgents } from "@/hooks/use-agents";

export type SalesNewFilterProps = {
  queryName: string;
  setQueryName: (value: string) => void;
  queryStatus: string;
  setQueryStatus: (value: string) => void;
  queryAgentId: string;
  setQueryAgentId: (value: string) => void;
  onSubmit?: () => void;
  onRefresh?: () => void;
};

const CAMPAIGN_STATUS_OPTIONS: StatusFilterOption[] = [
  {
    value: "",
    label: "All Status",
    description: "Show all sales campaigns",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700",
  },
  {
    value: "RUNNING",
    label: "Running / Active",
    description: "Currently dialing leads",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "Configured but not launched",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  {
    value: "PAUSED",
    label: "Paused",
    description: "Dialer temporarily halted",
    dotClass: "bg-blue-500",
    textClass: "text-blue-700",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    description: "All leads exhausted",
    dotClass: "bg-purple-500",
    textClass: "text-purple-700",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Terminated campaign",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700",
  },
];

const SalesNewFilter = memo(function SalesNewFilter({
  queryName,
  setQueryName,
  queryStatus,
  setQueryStatus,
  queryAgentId,
  setQueryAgentId,
  onSubmit,
  onRefresh,
}: SalesNewFilterProps) {
  const agents = useAgents({ limit: 100 });
  const agentList = agents.data?.items || [];

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
          placeholder="Search sales campaigns..."
          value={queryName}
          onChange={(e) => setQueryName(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={queryAgentId}
          onChange={(e) => setQueryAgentId(e.target.value)}
          className="h-8 rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 text-[11px] font-bold text-slate-600 outline-none focus:border-slate-200 focus:bg-white transition-colors"
        >
          <option value="">All Assigned Agents</option>
          {agentList.map((ag) => (
            <option key={ag.id} value={ag.id}>
              {ag.name}
            </option>
          ))}
        </select>

        <StatusFilterDropdown
          value={queryStatus}
          onChange={setQueryStatus}
          options={CAMPAIGN_STATUS_OPTIONS}
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

export default SalesNewFilter;
