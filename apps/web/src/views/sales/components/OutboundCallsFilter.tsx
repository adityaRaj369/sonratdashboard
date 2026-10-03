"use client";

import React, { memo } from "react";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import StatusFilterDropdown, { type StatusFilterOption } from "@/components/ui/StatusFilterDropdown";
import { useAgents } from "@/hooks/use-agents";

export type OutboundCallsFilterProps = {
  querySearch: string;
  setQuerySearch: (value: string) => void;
  queryStatus: string;
  setQueryStatus: (value: string) => void;
  queryAgentId: string;
  setQueryAgentId: (value: string) => void;
  onSubmit?: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
};

const CALL_STATUS_OPTIONS: StatusFilterOption[] = [
  {
    value: "",
    label: "All Status",
    description: "Show all outbound sales calls",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    description: "Call successfully connected & finished",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    value: "AI_ACTIVE",
    label: "Active / In Call",
    description: "AI agent currently speaking with lead",
    dotClass: "bg-blue-500",
    textClass: "text-blue-700",
  },
  {
    value: "RINGING",
    label: "Ringing",
    description: "Dialing recipient handset",
    dotClass: "bg-sky-500",
    textClass: "text-sky-700",
  },
  {
    value: "QUEUED",
    label: "Queued",
    description: "Pending dialer dispatch",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  {
    value: "NO_ANSWER",
    label: "No Answer",
    description: "Call rang out without pick-up",
    dotClass: "bg-rose-400",
    textClass: "text-rose-700",
  },
  {
    value: "BUSY",
    label: "Busy Line",
    description: "Line engaged or rejected",
    dotClass: "bg-orange-500",
    textClass: "text-orange-700",
  },
  {
    value: "FAILED",
    label: "Failed",
    description: "Telephony connection error",
    dotClass: "bg-rose-600",
    textClass: "text-rose-700",
  },
];

const OutboundCallsFilter = memo(function OutboundCallsFilter({
  querySearch,
  setQuerySearch,
  queryStatus,
  setQueryStatus,
  queryAgentId,
  setQueryAgentId,
  onSubmit,
  onReset,
  onRefresh,
  isFetching = false,
}: OutboundCallsFilterProps) {
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
          className="w-full h-8 rounded-lg border border-slate-100 bg-slate-50/50 pl-9 pr-4 text-[12px] font-medium text-slate-900 outline-none focus:border-slate-200 focus:bg-white transition-all placeholder:text-slate-400"
          placeholder="Search by contact, phone, or agent..."
          value={querySearch}
          onChange={(e) => setQuerySearch(e.target.value)}
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
          options={CALL_STATUS_OPTIONS}
        />

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          Apply
        </button>

        {(querySearch || queryStatus || queryAgentId) && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-100 bg-slate-50/50 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors shadow-2xs cursor-pointer"
          title="Refresh calls list"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>
    </form>
  );
});

export default OutboundCallsFilter;
