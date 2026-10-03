"use client";

import React, { memo, useState, useCallback, useEffect, useMemo } from "react";
import {
  Save,
  X,
  Bot,
  Shield,
  Phone,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Users,
  Target,
  FileSpreadsheet,
  Upload,
  Search,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/services/api/campaigns";
import { agentsApi } from "@/services/api/agents";
import { contactsApi } from "@/services/api/contacts";
import { useAgents } from "@/hooks/use-agents";
import { useCampaign, useCampaignContacts } from "@/hooks/use-campaigns";
import { usePhoneNumbers } from "@/hooks/use-settings";
import { useContacts } from "@/hooks/use-contacts";
import { parseLeadFile } from "@/lib/csv";
import type { Campaign, Contact } from "@/lib/types";
import AgentSelector from "./AgentSelector";

export type SalesNewEditDrawerProps = {
  campaign: Campaign | null;
  campaignId?: string | null;
  onClose?: (result?: { refresh?: boolean }) => void;
};

type TabKey = "details" | "audience" | "script" | "schedule" | "preflight";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "details", label: "Campaign & Agent", icon: Bot },
  { key: "audience", label: "Target Audience", icon: Users },
  { key: "script", label: "Objective & Script", icon: Target },
  { key: "schedule", label: "Schedule & Rules", icon: Clock },
  { key: "preflight", label: "Readiness & Launch", icon: Shield },
];

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

const SalesNewEditDrawer = memo(function SalesNewEditDrawer({
  campaign,
  campaignId,
  onClose,
}: SalesNewEditDrawerProps) {
  const detailQuery = useCampaign(campaign?.id || campaignId || "");
  const activeCampaign = detailQuery.data || campaign;

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [recentlyUploaded, setRecentlyUploaded] = useState<Contact[]>([]);

  const qc = useQueryClient();
  const agentsQuery = useAgents({ limit: 100 });
  const phonesQuery = usePhoneNumbers();
  const contactsQuery = useContacts({ limit: 300 });
  const campaignContactsQuery = useCampaignContacts(activeCampaign?.id || "", { limit: 500 });
  const refetchCampaignContacts = campaignContactsQuery.refetch;

  const rawAgents = agentsQuery.data?.items || [];
  const rawPhones = phonesQuery.data?.items || [];
  const rawContacts = useMemo(() => {
    const serverContacts = contactsQuery.data?.items || [];
    const assignedContacts = (campaignContactsQuery.data?.items || [])
      .map((item: any) => item.contact)
      .filter(Boolean);
    const combined = [...recentlyUploaded, ...assignedContacts, ...serverContacts];
    const seen = new Set<string>();
    return combined.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [recentlyUploaded, contactsQuery.data?.items, campaignContactsQuery.data?.items]);

  // Form states
  const [name, setName] = useState(activeCampaign?.name || "");
  const [description, setDescription] = useState(activeCampaign?.description || "");
  const [agentId, setAgentId] = useState(activeCampaign?.agentId || "");
  const [phoneNumberId, setPhoneNumberId] = useState(activeCampaign?.phoneNumberId || "");
  const [status, setStatus] = useState(activeCampaign?.status || "DRAFT");
  const [objective, setObjective] = useState(activeCampaign?.objective || "");
  const [salesInstructions, setSalesInstructions] = useState(activeCampaign?.salesInstructions || "");
  const [campaignInstructions, setCampaignInstructions] = useState(activeCampaign?.campaignInstructions || "");
  const [callingHoursStart, setCallingHoursStart] = useState(activeCampaign?.callingHoursStart || "09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState(activeCampaign?.callingHoursEnd || "18:00");
  const [timezone, setTimezone] = useState(activeCampaign?.timezone || "UTC");
  const [concurrencyLimit, setConcurrencyLimit] = useState(activeCampaign?.concurrencyLimit || 1);
  const [maxAttempts, setMaxAttempts] = useState(activeCampaign?.maxAttempts || 1);
  const [retryDelayMinutes, setRetryDelayMinutes] = useState(activeCampaign?.retryDelayMinutes || 60);
  const [callTimeoutSeconds, setCallTimeoutSeconds] = useState(activeCampaign?.callTimeoutSeconds || 600);
  const [priority, setPriority] = useState(activeCampaign?.priority || 5);
  const [callbackBehavior, setCallbackBehavior] = useState(activeCampaign?.callbackBehavior || "");
  const [contactIds, setContactIds] = useState<string[]>([]);

  // Preflight state
  const [preflightData, setPreflightData] = useState<{
    ready: boolean;
    checks: Array<{ id: string; label: string; ready: boolean; message: string }>;
  } | null>(null);

  useEffect(() => {
    if (!activeCampaign) return;
    setName(activeCampaign.name || "");
    setDescription(activeCampaign.description || "");
    setAgentId(activeCampaign.agentId || "");
    setPhoneNumberId(activeCampaign.phoneNumberId || "");
    setStatus(activeCampaign.status || "DRAFT");
    setObjective(activeCampaign.objective || "");
    setSalesInstructions(activeCampaign.salesInstructions || "");
    setCampaignInstructions(activeCampaign.campaignInstructions || "");
    setCallingHoursStart(activeCampaign.callingHoursStart || "09:00");
    setCallingHoursEnd(activeCampaign.callingHoursEnd || "18:00");
    setTimezone(activeCampaign.timezone || "UTC");
    setConcurrencyLimit(activeCampaign.concurrencyLimit || 1);
    setMaxAttempts(activeCampaign.maxAttempts || 1);
    setRetryDelayMinutes(activeCampaign.retryDelayMinutes || 60);
    setCallTimeoutSeconds(activeCampaign.callTimeoutSeconds || 600);
    setPriority(activeCampaign.priority || 5);
    setCallbackBehavior(activeCampaign.callbackBehavior || "");
    setIsDirty(false);

    // Fetch preflight checks
    campaignsApi.preflight(activeCampaign.id).then(setPreflightData).catch(() => {});
  }, [activeCampaign]);

  useEffect(() => {
    const assignedIds = (campaignContactsQuery.data?.items || [])
      .map((item: any) => item.contactId || item.contact?.id || item.id)
      .filter(Boolean);
    setContactIds(assignedIds);
  }, [campaignContactsQuery.data?.items]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleToggleRunning = async () => {
    if (!activeCampaign) return;
    try {
      setSaving(true);
      if (status === "RUNNING") {
        await campaignsApi.pause(activeCampaign.id);
        setStatus("PAUSED");
        setToast("Campaign paused.");
      } else {
        if (isDirty) {
          setActiveTab("preflight");
          setErrors(["Save campaign changes before launching so the dialer uses the latest settings."]);
          return;
        }
        const preflight = await campaignsApi.preflight(activeCampaign.id);
        setPreflightData(preflight);
        if (!preflight.ready) {
          setActiveTab("preflight");
          setErrors([
            `Campaign is not ready to launch: ${preflight.checks
              .filter((check) => !check.ready)
              .map((check) => `${check.label} - ${check.message}`)
              .join("; ")}`,
          ]);
          return;
        }
        await campaignsApi.start(activeCampaign.id);
        setStatus("RUNNING");
        setToast("Campaign started & dialer launched.");
      }
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e: any) {
      setErrors([e?.message || "Failed to update campaign state."]);
    } finally {
      setSaving(false);
    }
  };

  const assignedContactIds = useMemo(
    () =>
      new Set(
        (campaignContactsQuery.data?.items || [])
          .map((item: any) => item.contactId || item.contact?.id || item.id)
          .filter(Boolean),
      ),
    [campaignContactsQuery.data?.items],
  );

  const onSave = useCallback(
    async ({ closeAfterSave }: { closeAfterSave: boolean }) => {
      if (!activeCampaign) return;
      setToast("");
      setSaving(true);
      setErrors([]);

      try {
        if (!name.trim()) {
          setErrors(["Campaign name is required."]);
          setSaving(false);
          return;
        }
        if (!agentId) {
          setErrors(["Please select an assigned AI agent."]);
          setSaving(false);
          return;
        }

        await campaignsApi.update(activeCampaign.id, {
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
        });

        const newContactIds = contactIds.filter((id) => !assignedContactIds.has(id));
        if (newContactIds.length > 0) {
          await campaignsApi.addContacts(activeCampaign.id, newContactIds);
        }
        const removedContactIds = Array.from(assignedContactIds).filter(
          (id) => !contactIds.includes(String(id)),
        );
        if (removedContactIds.length > 0) {
          await Promise.all(
            removedContactIds.map((id) =>
              campaignsApi.removeContact(activeCampaign.id, String(id)),
            ),
          );
        }

        setToast("Sale campaign configuration saved successfully.");
        setIsDirty(false);
        qc.invalidateQueries({ queryKey: ["campaigns"] });
        await refetchCampaignContacts();

        if (closeAfterSave) {
          onClose?.({ refresh: true });
        }
      } catch (err: any) {
        setErrors((prev) => [...prev, err?.message || "Failed to update campaign"]);
      } finally {
        setSaving(false);
      }
    },
    [
      activeCampaign,
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
      assignedContactIds,
      refetchCampaignContacts,
      onClose,
      qc,
    ],
  );

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return rawContacts;
    const q = contactSearch.toLowerCase().trim();
    return rawContacts.filter((c) => {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.normalizedPhone?.includes(q) ||
        c.rawPhone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    });
  }, [rawContacts, contactSearch]);

  if (!activeCampaign) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-xs font-bold text-slate-400">
        {detailQuery.isLoading ? "Loading sale campaign details…" : "Sale campaign details unavailable."}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800">
      {/* Top Header Card with Dialer Controls */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {activeCampaign.name}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  status === "RUNNING"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                    : status === "PAUSED"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "RUNNING"
                      ? "bg-emerald-500"
                      : status === "PAUSED"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                  }`}
                />
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Campaign ID: {activeCampaign.id}
            </p>
          </div>

          {/* Launch / Resume / Pause Dialer Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleToggleRunning}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                status === "RUNNING"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {status === "RUNNING" ? (
                <>
                  <Pause size={14} /> Pause Campaign
                </>
              ) : (
                <>
                  <Play size={14} /> Launch / Resume
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div className="flex space-x-6 border-t border-slate-200/80 pt-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 pb-2.5 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
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

        {/* TAB 1: CAMPAIGN & AGENT */}
        {activeTab === "details" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sale Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDirty();
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description / Strategy Notes
                </label>
                <textarea
                  className="h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Campaign strategy notes..."
                />
              </div>
            </div>

            {/* UNIFIED AGENT SELECTOR (ZERO DUPLICATES) */}
            <div className="pt-2">
              <AgentSelector
                agents={rawAgents}
                value={agentId}
                onChange={(id) => {
                  setAgentId(id);
                  markDirty();
                }}
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
                onChange={(e) => {
                  setPhoneNumberId(e.target.value);
                  markDirty();
                }}
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

        {/* TAB 2: AUDIENCE & CONTACTS */}
        {activeTab === "audience" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Assigned Audience & Leads</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review existing audience contacts or import new leads via CSV spreadsheet.
              </p>
            </div>

            {/* Direct spreadsheet dropzone */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50/20">
              <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Upload Additional Leads (CSV / Excel)
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs font-medium text-slate-500 leading-relaxed">
                Add new prospect records to this campaign list. Use CSV, TXT, XLS, or XLSX with Name and Phone headers.
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
                          setErrors(["No valid contacts found in CSV."]);
                          return;
                        }
                        const res = await contactsApi.batchCreate(parsed);
                        const createdItems = (res.items || []) as Contact[];
                        setRecentlyUploaded((prev) => [...createdItems, ...prev]);
                        const newIds = createdItems.map((c) => c.id).filter(Boolean);
                        setContactIds((prev) => Array.from(new Set([...prev, ...newIds])));

                        // Directly attach to the campaign in database
                        if (activeCampaign?.id && newIds.length > 0) {
                          try {
                            await campaignsApi.addContacts(activeCampaign.id, newIds);
                            await refetchCampaignContacts();
                          } catch (addErr: any) {
                            console.error("Failed to auto-assign imported contacts:", addErr);
                          }
                        }

                        await qc.invalidateQueries({ queryKey: ["contacts"] });
                        await contactsQuery.refetch();
                        setToast(`Imported & attached ${res.count} contacts from ${file.name}`);
                        markDirty();
                      } catch (err: any) {
                        setErrors([err instanceof Error ? err.message : "Upload failed"]);
                      } finally {
                        setUploadingCsv(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer">
                    <Upload size={14} />
                    {uploadingCsv ? "Parsing & importing…" : "Upload Leads CSV"}
                  </span>
                </label>
              </div>
            </div>

            {/* Contact list filter & review */}
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="Search contacts database by name, phone, or company…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>
                  Showing {filteredContacts.length} contacts ({contactIds.length} selected, {assignedContactIds.size} assigned)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredContacts.map((c) => c.id);
                      setContactIds((prev) => Array.from(new Set([...prev, ...allIds])));
                      markDirty();
                    }}
                    className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContactIds(Array.from(assignedContactIds));
                      markDirty();
                    }}
                    className="text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="max-h-72 min-h-36 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                {contactsQuery.isLoading || campaignContactsQuery.isLoading ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span className="text-xs font-semibold">Loading audience contacts…</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center text-center p-4">
                    <Users className="mx-auto h-7 w-7 text-slate-300 mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No contacts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                      {contactSearch.trim()
                        ? `No contacts matching "${contactSearch}". Try a different keyword.`
                        : "Upload a CSV above or add contacts to your audience."}
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const selected = contactIds.includes(contact.id);
                    const alreadyAssigned = assignedContactIds.has(contact.id);
                    const campaignContact = (campaignContactsQuery.data?.items || []).find(
                      (item: any) => (item.contactId || item.contact?.id) === contact.id,
                    );
                    return (
                      <button
                        type="button"
                        key={contact.id}
                        onClick={() => {
                          setContactIds((prev) =>
                            prev.includes(contact.id)
                              ? prev.filter((id) => id !== contact.id)
                              : [...prev, contact.id],
                          );
                          markDirty();
                        }}
                        className={`flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? "border-blue-200 bg-blue-50/70"
                            : "border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {selected ? (
                            <CheckSquare size={15} className="shrink-0 text-blue-600" />
                          ) : (
                            <Square size={15} className="shrink-0 text-slate-400" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {contact.name || "Unnamed contact"}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 font-mono mt-0.5">
                              {contact.normalizedPhone || contact.rawPhone}
                              {contact.company ? ` · ${contact.company}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {campaignContact && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                campaignContact.status === "CONNECTED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : campaignContact.status === "FAILED"
                                    ? "bg-rose-100 text-rose-800"
                                    : campaignContact.status === "RINGING"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {campaignContact.status}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            {alreadyAssigned ? "ASSIGNED" : `ID: ${contact.id.slice(0, 8)}`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OBJECTIVE & SCRIPT */}
        {activeTab === "script" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Primary Sales Objective <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="h-28 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value);
                  markDirty();
                }}
                placeholder="Describe what the agent should accomplish on each call..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Custom Script & Objection Handling Guidelines
              </label>
              <textarea
                className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={salesInstructions}
                onChange={(e) => {
                  setSalesInstructions(e.target.value);
                  markDirty();
                }}
                placeholder="Objection handling guidelines, key answers, competitor comparisons..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Campaign-Level Instructions
              </label>
              <textarea
                className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={campaignInstructions}
                onChange={(e) => {
                  setCampaignInstructions(e.target.value);
                  markDirty();
                }}
                placeholder="Operational notes, offer constraints, compliance reminders, or campaign-specific rules."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Callback Behavior
              </label>
              <input
                className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                value={callbackBehavior}
                onChange={(e) => {
                  setCallbackBehavior(e.target.value);
                  markDirty();
                }}
                placeholder="Example: Offer a callback during business hours."
              />
            </div>
          </div>
        )}

        {/* TAB 4: SCHEDULE & RULES */}
        {activeTab === "schedule" && (
          <div className="space-y-6 animate-in fade-in duration-150">
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
                    onChange={(e) => {
                      setCallingHoursStart(e.target.value);
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setCallingHoursEnd(e.target.value);
                      markDirty();
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Timezone
                  </label>
                  <select
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setConcurrencyLimit(Number(e.target.value));
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setMaxAttempts(Number(e.target.value));
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setRetryDelayMinutes(Number(e.target.value));
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setCallTimeoutSeconds(Number(e.target.value));
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setPriority(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PREFLIGHT READINESS */}
        {activeTab === "preflight" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Readiness Preflight Checks
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    preflightData?.ready
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {preflightData?.ready ? "All systems ready" : "Action required"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {preflightData?.checks?.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                  >
                    {check.ready ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{check.label}</div>
                      <div className="text-slate-500 font-medium">{check.message}</div>
                      {check.id === "agent" && !check.ready && agentId && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await agentsApi.publish(agentId);
                              setToast("Agent published successfully.");
                              const pf = await campaignsApi.preflight(activeCampaign.id);
                              setPreflightData(pf);
                            } catch (err: any) {
                              setErrors([err?.message || "Failed to publish agent."]);
                            }
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Sparkles size={12} /> Publish Agent Now
                        </button>
                      )}
                    </div>
                  </div>
                )) || <div className="text-xs text-slate-400">Running validation checks...</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
        <div className="text-xs font-semibold text-slate-400">
          {isDirty ? (
            <span className="text-amber-600 font-bold">● Unsaved changes</span>
          ) : (
            <span>All changes saved</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ closeAfterSave: false })}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onSave({ closeAfterSave: true })}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save & Close"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default SalesNewEditDrawer;
