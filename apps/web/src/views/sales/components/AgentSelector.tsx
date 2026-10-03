"use client";

import React, { useMemo, useState } from "react";
import { Bot, Check, Search, Sparkles, CheckCircle2 } from "lucide-react";
import type { Agent } from "@/lib/types";

type AgentSelectorProps = {
  agents: Agent[];
  value: string;
  onChange: (agentId: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
};

export default function AgentSelector({
  agents,
  value,
  onChange,
  disabled = false,
  error,
  label = "Assigned AI Voice Agent",
  required = true,
}: AgentSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase().trim();
    return agents.filter((ag) => {
      const nameMatch = ag.name.toLowerCase().includes(q);
      const statusMatch = ag.status.toLowerCase().includes(q);
      const descMatch = (ag.description || "").toLowerCase().includes(q);
      const idMatch = ag.id.toLowerCase().includes(q);
      return nameMatch || statusMatch || descMatch || idMatch;
    });
  }, [agents, search]);

  const selectedAgent = agents.find((a) => a.id === value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Bot size={15} className="text-blue-600" />
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {selectedAgent && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <CheckCircle2 size={13} className="text-blue-600" />
            Selected: <strong className="font-bold">{selectedAgent.name}</strong>
          </span>
        )}
      </div>

      {/* Real-time search filter */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          disabled={disabled}
          placeholder={`Search ${agents.length} available agents by name or language…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 disabled:opacity-50 transition-all shadow-2xs"
        />
      </div>

      {/* Filtered Agent Cards Grid */}
      <div className="max-h-72 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 shadow-2xs">
        {filteredAgents.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            {search
              ? `No agents found matching "${search}".`
              : "No agents available. Please create an agent first."}
          </div>
        ) : (
          filteredAgents.map((ag) => {
            const isSelected = ag.id === value;
            const isPublished = ag.status === "PUBLISHED";

            return (
              <div
                key={ag.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                  if (!disabled) onChange(ag.id);
                }}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onChange(ag.id);
                  }
                }}
                className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-white shadow-xs ring-2 ring-blue-500/15"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-800"
                    }`}
                  >
                    <Bot size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {ag.name}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {ag.status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: {ag.id.slice(0, 14)}…
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
