"use client";

import React, { memo, useState, useCallback, useMemo, useEffect } from "react";
import {
  Save,
  ArrowRight,
  ArrowLeft,
  Bot,
  Users,
  Target,
  CheckCircle2,
  Phone,
  Clock,
  Upload,
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/services/api/campaigns";
import { contactsApi } from "@/services/api/contacts";
import { useAgents } from "@/hooks/use-agents";
import { usePhoneNumbers } from "@/hooks/use-settings";
import { useContacts } from "@/hooks/use-contacts";
import { parseLeadFile } from "@/lib/csv";
import type { Contact } from "@/lib/types";
import AgentSelector from "./AgentSelector";

export type SalesNewCreateDrawerProps = {
  onClose?: (result?: { refresh?: boolean; openEdit?: boolean; campaignId?: string }) => void;
};

const STEPS = [
  { id: 0, label: "Basics & Agent", icon: Bot, desc: "Campaign details & voice agent" },
  { id: 1, label: "Target Audience", icon: Users, desc: "Audience leads & CSV upload" },
  { id: 2, label: "Objective & Rules", icon: Target, desc: "Goals & dialing window" },
  { id: 3, label: "Review & Save", icon: CheckCircle2, desc: "Summary & finalize" },
] as const;

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
];

const SalesNewCreateDrawer = memo(function SalesNewCreateDrawer({
  onClose,
}: SalesNewCreateDrawerProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [recentlyUploaded, setRecentlyUploaded] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const qc = useQueryClient();
  const agentsQuery = useAgents({ limit: 100 });
  const phonesQuery = usePhoneNumbers();
  const contactsQuery = useContacts({ limit: 300 });

  const rawAgents = agentsQuery.data?.items || [];
  const rawPhones = phonesQuery.data?.items || [];

  // Step 0: Basics & Agent
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");

  // Step 1: Contacts
  const [contactIds, setContactIds] = useState<string[]>([]);

  // Step 2: Objective & Rules
  const [objective, setObjective] = useState("");
  const [salesInstructions, setSalesInstructions] = useState("");
  const [campaignInstructions, setCampaignInstructions] = useState("");
  const [callingHoursStart, setCallingHoursStart] = useState("09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState("18:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  );
  const [concurrencyLimit, setConcurrencyLimit] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [retryDelayMinutes, setRetryDelayMinutes] = useState(60);
  const [callTimeoutSeconds, setCallTimeoutSeconds] = useState(600);
  const [priority, setPriority] = useState(5);
  const [callbackBehavior, setCallbackBehavior] = useState(
    "Offer a callback during business hours",
  );

  // Preselect first available agent and phone if none selected
  useEffect(() => {
    if (!agentId && rawAgents.length > 0 && rawAgents[0]) {
      setAgentId(rawAgents[0].id);
    }
  }, [rawAgents, agentId]);

  useEffect(() => {
    if (!phoneNumberId && rawPhones.length > 0 && rawPhones[0]) {
      const exotelPhone = rawPhones.find(
        (p) =>
          p.phoneNumber?.includes("9513886363") ||
          p.label?.toLowerCase().includes("exotel") ||
          p.provider === "exotel",
      );
      setPhoneNumberId(exotelPhone ? exotelPhone.id : rawPhones[0].id);
    }
  }, [rawPhones, phoneNumberId]);

  // Merged contact list (server + newly batch-created)
  const displayedContacts = useMemo(() => {
    const list = [...recentlyUploaded, ...(contactsQuery.data?.items || [])];
    const seen = new Set<string>();
    return list.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [recentlyUploaded, contactsQuery.data?.items]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return displayedContacts;
    const q = contactSearch.toLowerCase().trim();
    return displayedContacts.filter((c) => {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.normalizedPhone?.includes(q) ||
        c.rawPhone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    });
  }, [displayedContacts, contactSearch]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(name.trim() && agentId);
    if (step === 1) return true;
    if (step === 2) return Boolean(objective.trim());
    return true;
  }, [step, name, agentId, objective]);

  const validateAll = useCallback(() => {
    const nextErrors: string[] = [];
    if (!name.trim()) nextErrors.push("Sale campaign name is required.");
    if (!agentId) nextErrors.push("Please select an AI agent.");
    if (!objective.trim()) nextErrors.push("Primary sales objective is required.");
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }, [name, agentId, objective]);

  const onCreate = useCallback(
    async ({ closeAfterSave }: { closeAfterSave: boolean }) => {
      setToast("");
      setSaving(true);
      setErrors([]);

      try {
        if (!validateAll()) {
          setSaving(false);
          return;
        }

        const campaign = await campaignsApi.create({
          name: name.trim(),
          description: description.trim() || null,
          agentId,
          phoneNumberId: phoneNumberId || null,
          objective: objective.trim(),
          salesInstructions: salesInstructions.trim() || null,
          campaignInstructions: campaignInstructions.trim() || null,
          callingHoursStart,
          callingHoursEnd,
          timezone,
          concurrencyLimit: Number(concurrencyLimit),
          maxAttempts: Number(maxAttempts),
          retryDelayMinutes: Number(retryDelayMinutes),
          callTimeoutSeconds: Number(callTimeoutSeconds),
          priority: Number(priority),
          callbackBehavior: callbackBehavior.trim() || null,
          contactIds,
        });

        setToast("Sale campaign created successfully.");
        if (closeAfterSave) {
          onClose?.({ refresh: true });
        } else {
          onClose?.({ refresh: true, openEdit: true, campaignId: campaign.id });
        }
      } catch (e: any) {
        setErrors((prev) => [...prev, e?.message || "Create sale campaign failed"]);
      } finally {
        setSaving(false);
      }
    },
    [
      validateAll,
      name,
      description,
      agentId,
      phoneNumberId,
      objective,
      salesInstructions,
      campaignInstructions,
      callingHoursStart,
      callingHoursEnd,
      timezone,
      concurrencyLimit,
      maxAttempts,
      retryDelayMinutes,
      callTimeoutSeconds,
      priority,
      callbackBehavior,
      contactIds,
      onClose,
    ],
  );

  const selectedAgent = rawAgents.find((a) => a.id === agentId);
  const selectedPhone = rawPhones.find((p) => p.id === phoneNumberId);

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800">
      {/* Top Stepper Navigation */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCurrent = step === s.id;
            const isCompleted = step > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (idx <= step || canNext) {
                    setStep(s.id);
                  }
                }}
                className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                  isCurrent
                    ? "bg-white shadow-xs border border-blue-500/40 ring-2 ring-blue-500/10"
                    : isCompleted
                      ? "hover:bg-white/80 cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-bold ${
                      isCurrent ? "text-blue-900" : "text-slate-800"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 font-medium">
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {errors.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1 animate-in fade-in duration-150">
            {errors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {toast && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={14} />
              {toast}
            </p>
          </div>
        )}

        {/* STEP 0: BASICS & AGENT */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">1. Campaign Identity & AI Agent</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Give your sale campaign a recognizable name and assign the AI voice agent that will conduct calls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sale Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Enterprise SaaS Outreach Drive"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description / Strategy Notes
                </label>
                <textarea
                  className="h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target demographic, campaign context, or outbound strategy notes..."
                />
              </div>
            </div>

            {/* UNIFIED AGENT SELECTOR (ZERO DUPLICATES) */}
            <div className="pt-2">
              <AgentSelector
                agents={rawAgents}
                value={agentId}
                onChange={setAgentId}
                required
              />
            </div>

            {/* Caller ID selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-slate-600" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Outbound Caller ID (Telecom Trunk)
                </label>
              </div>

              <select
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
              >
                <option value="">Default Organization Number (Recommended)</option>
                {rawPhones.map((ph: any) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.phoneNumber} {ph.label ? `(${ph.label})` : ""}
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-400 font-medium">
                The phone number displayed on recipients&apos; mobile devices when the AI initiates outbound calls.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: AUDIENCE & CONTACTS */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">2. Target Audience & Contacts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a spreadsheet of leads or select from your stored contacts database.
              </p>
            </div>

            {/* Direct CSV / Excel dropzone */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50/20">
              <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Upload CSV / Excel Contact List
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs font-medium text-slate-500 leading-relaxed">
                Accepts CSV, TXT, XLS, or XLSX files with <b>Name</b>, <b>Phone</b>, and optional <b>Company</b> columns. Contacts are automatically parsed, saved, and added to this campaign.
              </p>
              <div className="mt-4 flex justify-center">
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx"
                    className="sr-only"
                    disabled={uploadingCsv}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingCsv(true);
                      try {
                        const parsed = await parseLeadFile(file);
                        if (!parsed.length) {
                          setErrors(["No valid contacts found in CSV. Make sure your file has Name and Phone columns."]);
                          return;
                        }
                        const res = await contactsApi.batchCreate(parsed);
                        if (res.items.length > 0) {
                          setRecentlyUploaded((prev) => [...res.items, ...prev]);
                          const newIds = res.items.map((c) => c.id);
                          setContactIds((prev) => Array.from(new Set([...prev, ...newIds])));
                        }
                        await qc.invalidateQueries({ queryKey: ["contacts"] });
                        await contactsQuery.refetch();
                        setToast(`Successfully imported ${res.count} contacts from ${file.name}`);
                      } catch (err: any) {
                        setErrors([err instanceof Error ? err.message : "Upload failed"]);
                      } finally {
                        setUploadingCsv(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700">
                    <Upload size={14} />
                    {uploadingCsv ? "Parsing & importing…" : "Choose CSV file"}
                  </span>
                </label>
              </div>
            </div>

            {/* Contact list header & controls */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Contacts ({contactIds.length} of {displayedContacts.length} selected)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = displayedContacts.map((c) => c.id);
                      setContactIds(Array.from(new Set([...contactIds, ...allIds])));
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <CheckSquare size={13} />
                    Select all ({displayedContacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactIds([])}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Square size={13} />
                    Clear selection
                  </button>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="Filter contacts by name, phone, or company…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>

              {/* Scrollable contact list */}
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                {filteredContacts.map((contact) => {
                  const checked = contactIds.includes(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer border ${
                        checked
                          ? "bg-blue-50/70 border-blue-200 font-semibold"
                          : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={checked}
                        onChange={(e) => {
                          setContactIds(
                            e.target.checked
                              ? [...contactIds, contact.id]
                              : contactIds.filter((id) => id !== contact.id),
                          );
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {contact.name || "Unnamed contact"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 font-mono mt-0.5">
                          {contact.normalizedPhone || contact.rawPhone}
                          {contact.company ? ` · ${contact.company}` : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}

                {displayedContacts.length === 0 && (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400">
                    No contacts available in database. Upload a CSV file above to add leads instantly.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: OBJECTIVE & RULES */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">3. Objectives & Dialing Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the agent&apos;s goal on each call and configure the dialing window schedule.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Primary Sales Objective <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Introduce our product offering, qualify lead decision-maker status, handle price resistance, and book an executive demonstration."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Custom Script Guidelines & Objection Handling (Optional)
                </label>
                <textarea
                  className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={salesInstructions}
                  onChange={(e) => setSalesInstructions(e.target.value)}
                  placeholder="e.g. Emphasize fast onboarding; if prospect mentions competing vendor X, highlight our lower latency and dedicated 24/7 account management."
                />
              </div>

              {/* Calling Window Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Clock size={16} className="text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Calling Hours & Schedule
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Window Start
                    </label>
                    <input
                      type="time"
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={callingHoursStart}
                      onChange={(e) => setCallingHoursStart(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Window End
                    </label>
                    <input
                      type="time"
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={callingHoursEnd}
                      onChange={(e) => setCallingHoursEnd(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Timezone
                    </label>
                    <select
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Concurrency Limit (Simultaneous lines)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={concurrencyLimit}
                      onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Max Attempts Per Contact
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Retry Delay (minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={retryDelayMinutes}
                      onChange={(e) => setRetryDelayMinutes(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Max Call Duration (sec)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={600}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={callTimeoutSeconds}
                      onChange={(e) => setCallTimeoutSeconds(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Priority
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Campaign-Level Instructions
                  </label>
                  <textarea
                    className="h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                    value={campaignInstructions}
                    onChange={(e) => setCampaignInstructions(e.target.value)}
                    placeholder="Operational notes that apply to this campaign only."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & SAVE */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">4. Review & Save Sale Campaign</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your campaign setup and audience before saving.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Identity & Agent */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Bot size={14} className="text-blue-600" />
                    Campaign & Agent
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">{name || "—"}</p>
                  {description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{description}</p>
                  )}
                </div>
                <div className="pt-1 text-xs space-y-1 text-slate-700">
                  <p>
                    <span className="text-slate-400">Agent: </span>
                    <strong className="font-bold">{selectedAgent?.name || "None"}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Caller ID: </span>
                    <strong className="font-bold">
                      {selectedPhone?.phoneNumber || "Default Organization Number"}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Card 2: Audience */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" />
                    Target Audience
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <Users size={13} />
                    {contactIds.length} leads assigned
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500 space-y-0.5">
                  {displayedContacts
                    .filter((c) => contactIds.includes(c.id))
                    .slice(0, 3)
                    .map((c) => (
                      <p key={c.id} className="truncate">
                        • {c.name || "Contact"} ({c.normalizedPhone || c.rawPhone})
                      </p>
                    ))}
                  {contactIds.length > 3 && (
                    <p className="font-bold text-slate-400">
                      + {contactIds.length - 3} more contacts
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: Objective */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Target size={14} className="text-blue-600" />
                    Sales Objective
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                  {objective || "—"}
                </p>
              </div>

              {/* Card 4: Schedule & Limits */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" />
                    Schedule & Concurrency
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p>
                    <span className="text-slate-400">Calling Hours: </span>
                    <strong className="font-bold">
                      {callingHoursStart} – {callingHoursEnd} ({timezone})
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Concurrency: </span>
                    <strong className="font-bold">{concurrencyLimit} lines simultaneous</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Max Retries: </span>
                    <strong className="font-bold">{maxAttempts} attempts</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar: Next -> Next -> Save */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext || saving}
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCreate({ closeAfterSave: true })}
              disabled={saving || !name.trim() || !agentId || contactIds.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default SalesNewCreateDrawer;
