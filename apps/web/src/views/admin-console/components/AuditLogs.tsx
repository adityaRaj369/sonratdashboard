// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { History, Download, RefreshCw, X, Calendar } from "lucide-react";
import Pagination from "./Pagination";

type AuditEntry = {
  id?: string;
  timestamp?: string;
  timestampUtc?: string;
  timestampRaw?: string;
  user?: string;
  userEmail?: string;
  scope?: string;
  action?: string;
  details?: string;
  pagePath?: string;
  module?: string;
  before?: unknown;
  after?: unknown;
};

type AuditLogsProps = {
  entries?: AuditEntry[];
  filters?: Record<string, any>;
  pagination?: {
    page?: number;
    totalPages?: number;
    limit?: number;
  } | null;
  isLoading?: boolean;
  error?: string | null;
  pageSize?: number;
  pageSizeOptions?: number[];
  onFilterChange?: (next: Record<string, any>) => void;
  onExport?: () => void | Promise<void>;
  onRefresh?: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onApplyFilters?: () => void;
};

export default function AuditLogs({
  entries = [],
  filters = {},
  pagination = null,
  isLoading = false,
  error = null,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50],
  onFilterChange,
  onExport,
  onRefresh,
  onPageChange,
  onPageSizeChange,
  onApplyFilters,
}: AuditLogsProps) {
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [modalContent, setModalContent] = useState<any>(null);
  const [showIstTime, setShowIstTime] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement | null>(null);
  const moduleDropdownRef = useRef<HTMLDivElement | null>(null);
  const datePickerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const ACTION_OPTIONS = [
    "Created",
    "Modified",
    "Deleted",
    "Cloned",
    "Created Variation",
    "Modified Variation",
    "Deleded Variation",
    "Reordered Variations",
  ];

  const normalizeSelection = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.length) {
      return value.split(",").map((val) => val.trim()).filter(Boolean);
    }
    return [];
  };

  const selectedActions = normalizeSelection(filters.action);
  const selectedModules = normalizeSelection(filters.module);

  const moduleOptions = useMemo(
    () => [
      { label: "AGENTS", value: "Agents" },
      { label: "CAMPAIGNS", value: "Campaigns" },
      { label: "CONTACTS", value: "Contacts" },
      { label: "CALLS", value: "Calls" },
      { label: "ANALYTICS", value: "Analytics" },
      { label: "SETTINGS", value: "Settings" },
      { label: "ADMIN CONSOLE", value: "Admin Console" },
      { label: "USERS", value: "Users" },
      { label: "ROLES", value: "Roles" },
      { label: "MODULES", value: "Modules" },
      { label: "PERMISSIONS", value: "Permissions" },
    ],
    []
  );

  const normalizeDateInput = (value = "") => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return trimmed;
  };

  const handleActionToggle = (value) => {
    const next = selectedActions.includes(value)
      ? selectedActions.filter((val) => val !== value)
      : [...selectedActions, value];
    onFilterChange?.({ ...filters, action: next });
  };

  const handleModuleToggle = (value) => {
    const next = selectedModules.includes(value)
      ? selectedModules.filter((val) => val !== value)
      : [...selectedModules, value];
    onFilterChange?.({ ...filters, module: next });
  };

  const handleDateChange = (field) => (event) => {
    const formatted = normalizeDateInput(event.target.value);
    onFilterChange?.({ ...filters, [field]: formatted });
  };

  const openDatePicker = (field) => {
    const target = datePickerRefs.current?.[field];
    if (!target) return;
    if (typeof target.showPicker === "function") {
      target.showPicker();
    } else {
      target.click();
    }
  };

  const renderDateField = (field, label) => (
    <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          value={filters[field] || ""}
          onChange={handleDateChange(field)}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-700"
        />
        <button
          type="button"
          onClick={() => openDatePicker(field)}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
          aria-label={`Open ${label} calendar`}
        >
          <Calendar size={14} />
        </button>
      </div>
      <input
        type="date"
        lang="en-CA"
        value={filters[field] || ""}
        onChange={handleDateChange(field)}
        ref={(el) => {
          if (!datePickerRefs.current) datePickerRefs.current = {};
          datePickerRefs.current[field] = el;
        }}
        className="absolute w-0 h-0 opacity-0 pointer-events-none -z-10"
        tabIndex={-1}
        aria-hidden="true"
      />
    </label>
  );

  const toggleActionDropdown = () => setActionDropdownOpen((prev) => !prev);
  const toggleModuleDropdown = () => setModuleDropdownOpen((prev) => !prev);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setActionDropdownOpen(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
        setModuleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetFilters = () => {
    onFilterChange?.({
      ...filters,
      name: "",
      email: "",
      module: [],
      action: [],
      dateFrom: "",
      dateTo: "",
    });
    setActionDropdownOpen(false);
    setModuleDropdownOpen(false);
  };

  const handleApplyFilters = () => {
    setActionDropdownOpen(false);
    setModuleDropdownOpen(false);
    onApplyFilters?.();
  };

  const currentPageNumber = pagination?.page || 1;
  const paginationPageIndex = Math.max(0, currentPageNumber - 1);
  const paginationTotalPages = Math.max(1, pagination?.totalPages || 1);
  const paginationPageSize = pagination?.limit || pageSize;
  const showPagination = Boolean(pagination);

  const handleFirstPage = () => onPageChange?.(1);
  const handlePrevPage = () => onPageChange?.(Math.max(1, currentPageNumber - 1));
  const handleNextPage = () => onPageChange?.(Math.min(paginationTotalPages, currentPageNumber + 1));
  const handleLastPage = () => onPageChange?.(paginationTotalPages);
  const handlePageSizeChange = (nextSize) => onPageSizeChange?.(nextSize);

  const pretty = (value) => {
    if (value === undefined) return "";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch (_err) {
      return String(value);
    }
  };

  const formatUtcTimestamp = (isoString) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return isoString;
      const pad = (val) => String(val).padStart(2, "0");
      const year = date.getUTCFullYear();
      const month = pad(date.getUTCMonth() + 1);
      const day = pad(date.getUTCDate());
      const hours = pad(date.getUTCHours());
      const minutes = pad(date.getUTCMinutes());
      const seconds = pad(date.getUTCSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
    } catch {
      return isoString;
    }
  };

  const formatIstTimestamp = (isoString) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return isoString;
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});
      const { year, month, day, hour, minute, second } = parts;
      return `${year}-${month}-${day} ${hour}:${minute}:${second} IST (+05:30)`;
    } catch {
      return isoString;
    }
  };

  const extractIsoTimestamp = (entry) => {
    if (!entry) return null;
    if (entry.timestampUtc) return entry.timestampUtc;
    if (entry.timestampRaw) return entry.timestampRaw;
    const ts = entry.timestamp;
    if (!ts) return null;
    const match = ts.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    if (!match) return null;
    const offsetMatch = ts.match(/\+(\d{2}:\d{2})/);
    const offset = offsetMatch ? `+${offsetMatch[1]}` : "+00:00";
    return `${match[1]}T${match[2]}${offset}`;
  };

  const formatHeaders = (headers) => {
    if (!headers || (Array.isArray(headers) && headers.length === 0)) return "(none)";
    if (Array.isArray(headers)) {
      return headers.map((h) => `${h.key}: ${h.value}`).join("\n");
    }
    if (typeof headers === "object") {
      return Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    }
    return String(headers);
  };

  const resolveStateDisplay = (entry) => {
    if (!entry) return { mode: "default" };
    const action = String(entry.action || "").toLowerCase();
    const isDelete = action.includes("delete");
    const isCreate = action.includes("create") || action.includes("add");

    if (isDelete) return { mode: "delete" };
    if (isCreate && !isDelete) return { mode: "create" };
    return { mode: "default" };
  };

  const panelToneStyles = {
    danger: {
      wrapper: "bg-white text-slate-700",
      header: "bg-red-50 border-b border-red-200 text-red-700",
    },
    success: {
      wrapper: "bg-white text-slate-700",
      header: "bg-green-50 border-b border-green-200 text-green-700",
    },
    neutral: {
      wrapper: "bg-white text-slate-700",
      header: "bg-amber-50 border-b border-amber-200 text-amber-800",
    },
    default: {
      wrapper: "bg-white text-slate-700",
      header: "bg-slate-50 border-b border-slate-200 text-slate-600",
    },
  };

  const getStatePanels = (entry) => {
    if (!entry) return [];
    const { mode } = resolveStateDisplay(entry);
    if (mode === "delete") {
      const deletedPayload = entry.before ?? entry.after;
      if (!deletedPayload) return [];
      return [
        {
          key: "deleted",
          label: "Deleted Object",
          tone: "neutral",
          value: deletedPayload,
        },
      ];
    }

    if (mode === "create") {
      if (!entry.after) return [];
      return [
        {
          key: "created",
          label: "Created Object",
          tone: "success",
          value: entry.after,
        },
      ];
    }

    const panels = [];
    if (entry.before) {
      panels.push({
        key: "previous",
        label: "Previous State",
        tone: "danger",
        value: entry.before,
      });
    }
    if (entry.after) {
      panels.push({
        key: "current",
        label: "Current State",
        tone: "success",
        value: entry.after,
      });
    }
    return panels;
  };

  const selectedEntryPanels = getStatePanels(selectedEntry);

  const resolveIstTimestamp = (entry) => {
    const iso = extractIsoTimestamp(entry);
    return formatIstTimestamp(iso);
  };
  const resolveUtcTimestamp = (entry) => {
    if (!entry) return "—";
    const iso = entry.timestampUtc || extractIsoTimestamp(entry) || entry.timestamp;
    return formatUtcTimestamp(iso);
  };
  const getTimestampDisplay = (entry) =>
    showIstTime ? resolveIstTimestamp(entry) : resolveUtcTimestamp(entry);

  const timestampButtonLabel = showIstTime ? "Show UTC" : "Show IST";

  const modalIstTimestamp = resolveIstTimestamp(selectedEntry);
  const modalUtcTimestamp = resolveUtcTimestamp(selectedEntry);
  const moduleLabel = selectedEntry?.pagePath || "—";
  const scopeLabel = selectedEntry?.scope || "—";
  const notesLabel = selectedEntry?.details || "—";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-6 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">Audit Logs</h2>
            <p className="text-slate-500 mt-1 font-medium italic">Review every privileged mutation taken within the Seam Admin console.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Clear Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              Apply Filters
            </button>
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => setShowIstTime((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {timestampButtonLabel}
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Name
            <input
              type="text"
              value={filters.name || ""}
              onChange={(e) => onFilterChange?.({ ...filters, name: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-700"
              placeholder="Operator name"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Email
            <input
              type="text"
              value={filters.email || ""}
              onChange={(e) => onFilterChange?.({ ...filters, email: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-700"
              placeholder="user@example.com"
            />
          </label>
          <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400" ref={moduleDropdownRef}>
            Module / Page
            <div className="relative">
              <button
                type="button"
                onClick={toggleModuleDropdown}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:border-slate-300"
              >
                <span>
                  {selectedModules.length === 0 ? "Select modules" : `${selectedModules.length} selected`}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${moduleDropdownOpen ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {moduleDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-auto p-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choose modules</span>
                    <button
                      type="button"
                      onClick={() => onFilterChange?.({ ...filters, module: [] })}
                      className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-500"
                    >
                      Clear
                    </button>
                  </div>
                  {moduleOptions.map(({ value, label }) => {
                    const active = selectedModules.includes(value);
                    return (
                      <label
                        key={value}
                        className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleModuleToggle(value)}
                          className="form-checkbox h-4 w-4 text-indigo-600 rounded border-slate-300"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {renderDateField("dateFrom", "Date From (YYYY-MM-DD)")}
          {renderDateField("dateTo", "Date To (YYYY-MM-DD)")}
          <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400" ref={actionDropdownRef}>
            Action Types
            <div className="relative">
              <button
                type="button"
                onClick={toggleActionDropdown}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:border-slate-300"
              >
                <span>
                  {selectedActions.length === 0 ? "Select actions" : `${selectedActions.length} selected`}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${actionDropdownOpen ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {actionDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-64 overflow-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choose actions</span>
                    <button
                      type="button"
                      onClick={() => onFilterChange?.({ ...filters, action: [] })}
                      className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-500"
                    >
                      Clear
                    </button>
                  </div>
                  {ACTION_OPTIONS.map((action) => {
                    const active = selectedActions.includes(action);
                    return (
                      <label
                        key={action}
                        className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{action}</span>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleActionToggle(action)}
                          className="form-checkbox h-4 w-4 text-indigo-600 rounded border-slate-300"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex h-full min-h-0 flex-col">
          <div className="flex flex-col gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-12 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              <div className="col-span-3">Timestamp</div>
              <div className="col-span-3">Operator</div>
              <div className="col-span-3">Scope</div>
              <div className="col-span-3">Action</div>
            </div>
            {(isLoading || error) && (
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                {isLoading && <span className="text-indigo-500">Loading…</span>}
                {error && <span className="text-red-500">{error}</span>}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {entries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-[11px] font-bold italics">No audit entries found for current filters.</div>
            ) : (
              entries.map((entry, idx) => (
                <button
                  type="button"
                  key={entry?.id || idx}
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full text-left grid grid-cols-12 px-6 py-4 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <div className="col-span-3 text-slate-500">{getTimestampDisplay(entry)}</div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex flex-col leading-tight">
                      <span className="text-slate-800 font-semibold">{entry.user}</span>
                      <span className="text-[9px] text-slate-400 font-bold tracking-wide">{entry.userEmail || "—"}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50">{entry.scope}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700">
                      <History size={12} className="text-indigo-500" /> {entry.action}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">{entry.details}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          {showPagination && (
            <Pagination
              page={paginationPageIndex}
              totalPages={paginationTotalPages}
              pageSize={paginationPageSize}
              pageSizeOptions={pageSizeOptions}
              onFirst={handleFirstPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onLast={handleLastPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      {selectedEntry &&
        createPortal(
        <div className="fixed inset-0 z-[220]">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedEntry(null)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-[75vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Entry</div>
                  <h3 className="text-[13px] font-black text-slate-800 truncate">{selectedEntry.action}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 w-full md:grid-cols-2 xl:grid-cols-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</div>
                  <dl className="mt-3 space-y-3 text-[11px] font-semibold text-slate-700">
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">UTC:</dt>
                      <dd>{modalUtcTimestamp}</dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">IST:</dt>
                      <dd>{modalIstTimestamp}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">User Details</div>
                  <dl className="mt-3 space-y-3 text-[11px] font-semibold text-slate-700">
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">User:</dt>
                      <dd>{selectedEntry.user}</dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">User Email:</dt>
                      <dd>{selectedEntry.userEmail || "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Action Context</div>
                  <dl className="mt-3 space-y-3 text-[11px] font-semibold text-slate-700">
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">Module:</dt>
                      <dd>{moduleLabel}</dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">Scope:</dt>
                      <dd>{scopeLabel}</dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-slate-600">
                      <dt className="text-slate-500 font-bold">Notes:</dt>
                      <dd className="text-[11px] leading-snug">{notesLabel}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedEntryPanels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">State Changes</div>
                    <button
                      type="button"
                      onClick={() => setModalContent({ type: "state", panels: selectedEntryPanels })}
                      className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-500"
                    >
                      Expand
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="max-h-96 min-h-[24rem] h-[24rem] overflow-auto">
                      <div
                        className="grid min-w-full h-full grid-rows-[1fr]"
                        style={{
                          gridTemplateColumns:
                            selectedEntryPanels.length > 1 ? "repeat(2, minmax(0, 1fr))" : "repeat(1, minmax(0, 1fr))",
                        }}
                      >
                        {selectedEntryPanels.map((panel, idx) => {
                          const toneConfig = panelToneStyles[panel.tone] || panelToneStyles.default;
                          return (
                            <div
                              key={panel.key}
                              className={`${toneConfig.wrapper} flex flex-col h-full min-h-[24rem] ${idx === 0 ? "" : "border-l border-slate-200"}`}
                            >
                              <div className={`p-4 ${toneConfig.header}`}>
                                <div className="text-[9px] font-black uppercase tracking-wider">{panel.label}</div>
                              </div>
                              <div className="flex-1 flex">
                                <pre className="flex-1 text-[11px] leading-snug whitespace-pre-wrap font-mono px-4 py-4 w-full h-full overflow-auto m-0 bg-transparent">
                                  {pretty(panel.value)}
                                </pre>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cloned segments removed per updated schema requirements */}

            </div>
          </div>
        </div>,
        document.body
      )}

      {modalContent &&
        createPortal(
        <div className="fixed inset-0 z-[220]">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setModalContent(null)} />
          <div className="absolute left-4 right-4 top-4 bottom-4 bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {modalContent.type === "state" ? "State Changes" : "API Request & Response"}
              </h3>
              <button type="button" onClick={() => setModalContent(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            {modalContent.type === "state" ? (
              <div className="h-[90vh] overflow-auto">
                <div
                  className="grid gap-0 min-w-full h-full divide-x divide-slate-200 grid-rows-[1fr]"
                  style={{
                    gridTemplateColumns:
                      (modalContent.panels?.length || 0) > 1 ? "repeat(2, minmax(0, 1fr))" : "repeat(1, minmax(0, 1fr))",
                  }}
                >
                  {(modalContent.panels || []).map((panel) => {
                    const toneConfig = panelToneStyles[panel.tone] || panelToneStyles.default;
                    return (
                      <div key={panel.key} className={`${toneConfig.wrapper} flex flex-col h-full min-h-full`}>
                        <div className={`p-4 sticky top-0 z-10 ${toneConfig.header}`}>
                          <h4 className="text-xs font-black uppercase tracking-wider">{panel.label}</h4>
                        </div>
                        <div className="flex-1 p-6 flex">
                          <pre className="flex-1 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words w-full h-full overflow-auto m-0 bg-transparent">
                            {pretty(panel.value)}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0 min-w-full divide-x divide-slate-200">
                <div>
                  <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Request</h4>
                    {modalContent?.request?.headers && <span className="text-[10px] font-semibold text-indigo-500">Headers</span>}
                  </div>
                  <div className="p-6 space-y-4">
                    {modalContent?.request?.headers && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Headers</div>
                        <pre className="text-[11px] leading-snug bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                          {formatHeaders(modalContent.request.headers)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Body</div>
                      <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap">{pretty(modalContent.request)}</pre>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Response</h4>
                    {modalContent?.response?.headers && <span className="text-[10px] font-semibold text-indigo-500">Headers</span>}
                  </div>
                  <div className="p-6 space-y-4">
                    {modalContent?.response?.headers && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Headers</div>
                        <pre className="text-[11px] leading-snug bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                          {formatHeaders(modalContent.response.headers)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Body</div>
                      <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap">{pretty(modalContent.response)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
