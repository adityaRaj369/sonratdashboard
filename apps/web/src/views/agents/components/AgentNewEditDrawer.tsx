"use client";

import React, { memo, useState, useCallback, useEffect } from "react";
import {
  Save,
  X,
  Bot,
  Shield,
  Volume2,
  Building2,
  Target,
  Sparkles,
  PhoneCall,
  Headphones,
  MessageSquare,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Check,
} from "lucide-react";
import { useAgent } from "@/hooks/use-agents";
import { agentsApi } from "@/services/api/agents";
import type { Agent } from "@/lib/types";

export type AgentNewEditDrawerProps = {
  agent: Agent | null;
  agentId?: string | null;
  onClose?: (result?: { refresh?: boolean }) => void;
  onDelete?: (agent: Agent) => void;
};

type TabKey = "general" | "company" | "voice" | "sales" | "safety";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "general", label: "Identity & Role", icon: Bot },
  { key: "company", label: "Company Context", icon: Building2 },
  { key: "voice", label: "Voice & Speech", icon: Volume2 },
  { key: "sales", label: "Sales & Behavior", icon: Target },
  { key: "safety", label: "Safety & Guardrails", icon: Shield },
];

const PURPOSE_CARDS = [
  {
    id: "sales",
    title: "Sales Call Agent",
    desc: "Outbound dialing, lead qualification, and demo scheduling",
    icon: PhoneCall,
    badge: "Voice & Outbound",
  },
  {
    id: "support",
    title: "Customer Support",
    desc: "Help desk, inquiry resolution, and FAQ deflection",
    icon: Headphones,
    badge: "Inbound Service",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Assistant",
    desc: "Conversational chat, lead capture, and instant responses",
    icon: MessageSquare,
    badge: "Messaging",
  },
  {
    id: "hybrid",
    title: "Hybrid Multi-Channel",
    desc: "Omni-channel sales conversion and support handoff",
    icon: Sparkles,
    badge: "Multi-channel",
  },
] as const;

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en", flag: "🇺🇸" },
  { label: "Hindi", value: "hi", flag: "🇮🇳" },
  { label: "English (India)", value: "en-IN", flag: "🇮🇳" },
  { label: "Spanish", value: "es", flag: "🇪🇸" },
  { label: "French", value: "fr", flag: "🇫🇷" },
  { label: "German", value: "de", flag: "🇩🇪" },
  { label: "Portuguese", value: "pt", flag: "🇧🇷" },
];

const VOICE_CARDS = [
  {
    id: "Kore",
    name: "Kore",
    gender: "Neutral / Female",
    tone: "Clear, Professional & Corporate",
    speed: "1.0x",
  },
  {
    id: "Aoede",
    name: "Aoede",
    gender: "Female",
    tone: "Warm, Engaging & Empathetic",
    speed: "1.0x",
  },
  {
    id: "Puck",
    name: "Puck",
    gender: "Male",
    tone: "Energetic, Modern & Dynamic",
    speed: "1.05x",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    gender: "Male",
    tone: "Deep, Authoritative & Reassuring",
    speed: "0.95x",
  },
  {
    id: "Charon",
    name: "Charon",
    gender: "Male",
    tone: "Calm, Patient & Analytical",
    speed: "1.0x",
  },
];

const listToText = (value: unknown) =>
  Array.isArray(value) ? value.map(String).join("\n") : "";

const textToList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const AgentNewEditDrawer = memo(function AgentNewEditDrawer({
  agent,
  agentId,
  onClose,
  onDelete,
}: AgentNewEditDrawerProps) {
  const detailQuery = useAgent(agent?.id || agentId || "");
  const activeAgent = detailQuery.data || agent;

  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Form states initialized from agent
  const [name, setName] = useState(activeAgent?.name || "");
  const [description, setDescription] = useState(activeAgent?.description || "");
  const [purpose, setPurpose] = useState<string>(
    String((activeAgent?.draftConfig as any)?.purpose || "sales"),
  );
  const [companyName, setCompanyName] = useState(
    (activeAgent?.draftConfig as any)?.company?.companyName || "",
  );
  const [website, setWebsite] = useState(
    (activeAgent?.draftConfig as any)?.company?.website || "",
  );
  const [contactEmail, setContactEmail] = useState(
    (activeAgent?.draftConfig as any)?.company?.contactEmail || "",
  );
  const [companyDescription, setCompanyDescription] = useState(
    (activeAgent?.draftConfig as any)?.company?.companyDescription || "",
  );
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">(
    activeAgent?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
  );

  // Voice & language
  const [defaultLanguage, setDefaultLanguage] = useState(
    (activeAgent?.draftConfig as any)?.languages?.defaultLanguage || "en",
  );
  const [voiceId, setVoiceId] = useState(
    (activeAgent?.draftConfig as any)?.voice?.voiceId || "Kore",
  );
  const [speechSpeed, setSpeechSpeed] = useState(
    (activeAgent?.draftConfig as any)?.voice?.speed || 1.0,
  );
  const [greeting, setGreeting] = useState(
    (activeAgent?.draftConfig as any)?.voice?.greeting ||
      "Hello! Thanks for connecting. How can I help you today?",
  );

  // Sales
  const [primaryObjective, setPrimaryObjective] = useState(
    (activeAgent?.draftConfig as any)?.sales?.primaryObjective ||
      "Qualify customer requirements and close next steps.",
  );
  const [closingBehavior, setClosingBehavior] = useState(
    (activeAgent?.draftConfig as any)?.sales?.closingBehavior ||
      "Ask permission before scheduling a follow-up or creating a lead.",
  );
  const [qualificationQuestions, setQualificationQuestions] = useState(
    listToText((activeAgent?.draftConfig as any)?.sales?.qualificationQuestions),
  );
  const [discoveryQuestions, setDiscoveryQuestions] = useState(
    listToText((activeAgent?.draftConfig as any)?.sales?.discoveryQuestions),
  );
  const [leadQualificationRules, setLeadQualificationRules] = useState(
    listToText((activeAgent?.draftConfig as any)?.sales?.leadQualificationRules),
  );

  // Safety
  const [disallowedTopics, setDisallowedTopics] = useState(
    Array.isArray((activeAgent?.draftConfig as any)?.safety?.disallowedTopics)
      ? (activeAgent?.draftConfig as any)?.safety?.disallowedTopics.join(", ")
      : "competitor pricing, internal confidential systems",
  );

  useEffect(() => {
    if (!activeAgent) return;
    const draft = (activeAgent.draftConfig || {}) as any;
    setName(activeAgent.name || "");
    setDescription(activeAgent.description || "");
    setPurpose(String(draft?.purpose || "sales"));
    setCompanyName(draft?.company?.companyName || "");
    setWebsite(draft?.company?.website || "");
    setContactEmail(draft?.company?.contactEmail || "");
    setCompanyDescription(draft?.company?.companyDescription || "");
    setStatus(activeAgent.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
    setDefaultLanguage(draft?.languages?.defaultLanguage || "en");
    setVoiceId(draft?.voice?.voiceId || "Kore");
    setSpeechSpeed(draft?.voice?.speed || 1.0);
    setGreeting(
      draft?.voice?.greeting ||
        "Hello! Thanks for connecting. How can I help you today?",
    );
    setPrimaryObjective(
      draft?.sales?.primaryObjective ||
        "Qualify customer requirements and close next steps.",
    );
    setClosingBehavior(
      draft?.sales?.closingBehavior ||
        "Ask permission before scheduling a follow-up or creating a lead.",
    );
    setQualificationQuestions(listToText(draft?.sales?.qualificationQuestions));
    setDiscoveryQuestions(listToText(draft?.sales?.discoveryQuestions));
    setLeadQualificationRules(listToText(draft?.sales?.leadQualificationRules));
    setDisallowedTopics(
      Array.isArray(draft?.safety?.disallowedTopics)
        ? draft.safety.disallowedTopics.join(", ")
        : "competitor pricing, internal confidential systems",
    );
    setIsDirty(false);
  }, [activeAgent]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const onSave = useCallback(
    async ({ closeAfterSave }: { closeAfterSave: boolean }) => {
      if (!activeAgent) return;
      setToast("");
      setSaving(true);
      setErrors([]);

      try {
        if (!name.trim()) {
          setErrors(["Agent name is required."]);
          setSaving(false);
          return;
        }

        // 1. Update basic name & description
        await agentsApi.update(activeAgent.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });

        // 2. Update company section
        await agentsApi.updateSection(activeAgent.id, "company", {
          companyName: companyName.trim() || "Your Company",
          companyDescription: companyDescription.trim() || null,
          website: website.trim(),
          contactEmail: contactEmail.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        });

        // 3. Update languages section
        await agentsApi.updateSection(activeAgent.id, "languages", {
          supportedLanguages: [defaultLanguage],
          defaultLanguage,
          languageDetection: true,
          languageSwitching: true,
          fallbackLanguage: defaultLanguage,
        });

        // 4. Update voice section
        await agentsApi.updateSection(activeAgent.id, "voice", {
          voiceId,
          speed: Number(speechSpeed),
          greeting,
          provider: "gemini",
        });

        // 5. Update sales section
        await agentsApi.updateSection(activeAgent.id, "sales", {
          primaryObjective: primaryObjective.trim(),
          closingBehavior: closingBehavior.trim(),
          qualificationQuestions: textToList(qualificationQuestions),
          discoveryQuestions: textToList(discoveryQuestions),
          leadQualificationRules: textToList(leadQualificationRules),
        });

        // 6. Update safety section
        await agentsApi.updateSection(activeAgent.id, "safety", {
          disallowedTopics: disallowedTopics
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
        });

        // 7. Publish or unpublish if status changed
        if (status === "PUBLISHED" && activeAgent.status !== "PUBLISHED") {
          try {
            await agentsApi.publish(activeAgent.id);
          } catch {}
        }

        setToast("Agent configuration saved successfully.");
        setIsDirty(false);

        if (closeAfterSave) {
          onClose?.({ refresh: true });
        }
      } catch (err: any) {
        setErrors((prev) => [...prev, err?.message || "Failed to update agent"]);
      } finally {
        setSaving(false);
      }
    },
    [
      activeAgent,
      name,
      description,
      companyName,
      companyDescription,
      website,
      contactEmail,
      defaultLanguage,
      voiceId,
      speechSpeed,
      greeting,
      primaryObjective,
      closingBehavior,
      qualificationQuestions,
      discoveryQuestions,
      leadQualificationRules,
      disallowedTopics,
      status,
      onClose,
    ],
  );

  if (!activeAgent) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-xs font-bold text-slate-400">
        {detailQuery.isLoading ? "Loading agent details…" : "Agent details unavailable."}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-white text-slate-800">
      {/* Top Header Card */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {activeAgent.name}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "PUBLISHED" ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {status === "PUBLISHED" ? "Live / Published" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Agent ID: {activeAgent.id}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(activeAgent)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Trash2 size={13} />
                Delete Agent
              </button>
            )}
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

        {/* TAB 1: IDENTITY & ROLE */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Agent Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Primary Language
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => {
                    setDefaultLanguage(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Persona Description & Role
                </label>
                <textarea
                  className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Define the agent's background, role, and demeanor..."
                />
              </div>
            </div>

            {/* Purpose Cards */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Operational Channel Role
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PURPOSE_CARDS.map((card) => {
                  const Icon = card.icon;
                  const isSelected = purpose === card.id;

                  return (
                    <div
                      key={card.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        setPurpose(card.id);
                        markDirty();
                      }}
                      className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/15"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900">{card.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {card.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ml-2 ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPANY CONTEXT */}
        {activeTab === "company" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Background & Offerings
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={companyDescription}
                  onChange={(e) => {
                    setCompanyDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Describe your company offerings, product details, and value proposition..."
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VOICE & SPEECH */}
        {activeTab === "voice" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Voice Cards */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Speech Synthesizer Voice
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {VOICE_CARDS.map((v) => {
                  const isSelected = voiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        setVoiceId(v.id);
                        markDirty();
                      }}
                      className={`flex flex-col justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/15"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Volume2 size={14} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                            {v.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">
                          {v.tone}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                        <span>Speed: {v.speed}</span>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Initial Greeting Phrase
                </label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => {
                    setGreeting(e.target.value);
                    markDirty();
                  }}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Speaking Speed Multiplier ({speechSpeed}x)
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={speechSpeed}
                  onChange={(e) => {
                    setSpeechSpeed(Number(e.target.value));
                    markDirty();
                  }}
                  className="accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SALES & BEHAVIOR */}
        {activeTab === "sales" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Primary Sales Objective <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="h-28 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={primaryObjective}
                onChange={(e) => {
                  setPrimaryObjective(e.target.value);
                  markDirty();
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Closing Behavior
              </label>
              <input
                type="text"
                value={closingBehavior}
                onChange={(e) => {
                  setClosingBehavior(e.target.value);
                  markDirty();
                }}
                className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Qualification Questions
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={qualificationQuestions}
                  onChange={(e) => {
                    setQualificationQuestions(e.target.value);
                    markDirty();
                  }}
                  placeholder={"One question per line\nExample: What budget range are you considering?\nExample: Who will approve this purchase?"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Discovery Questions
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={discoveryQuestions}
                  onChange={(e) => {
                    setDiscoveryQuestions(e.target.value);
                    markDirty();
                  }}
                  placeholder={"One question per line\nExample: What problem are you trying to solve today?\nExample: Which solution are you using now?"}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Lead Qualification Rules
              </label>
              <textarea
                className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={leadQualificationRules}
                onChange={(e) => {
                  setLeadQualificationRules(e.target.value);
                  markDirty();
                }}
                placeholder={"One rule per line\nExample: Mark HIGH interest if they ask for pricing or demo\nExample: Mark NOT_INTERESTED only after explicit rejection"}
              />
            </div>

            {/* Status Toggle */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Agent Availability Status
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {status === "PUBLISHED"
                    ? "Live: Agent can receive and dial calls in active campaigns."
                    : "Draft: Agent is in training and won't be called automatically."}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={status === "PUBLISHED"}
                onClick={() => {
                  setStatus(status === "PUBLISHED" ? "DRAFT" : "PUBLISHED");
                  markDirty();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  status === "PUBLISHED" ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    status === "PUBLISHED" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: SAFETY & GUARDRAILS */}
        {activeTab === "safety" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Disallowed Topics & Competitors
              </label>
              <textarea
                className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                value={disallowedTopics}
                onChange={(e) => {
                  setDisallowedTopics(e.target.value);
                  markDirty();
                }}
                placeholder="Comma separated topics to deflect..."
              />
              <span className="text-[11px] text-slate-400 font-medium italic">
                If the caller raises any of these topics, the agent will gracefully deflect and refocus.
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Active Conversational Guardrails
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                Standard PII redaction, prompt injection shielding, and anti-hallucination policies are applied automatically to every voice session.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
        <div>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(activeAgent)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete Agent
            </button>
          ) : (
            <div className="text-xs font-semibold text-slate-400">
              {isDirty ? (
                <span className="text-amber-600 font-bold">● Unsaved changes</span>
              ) : (
                <span>All changes saved</span>
              )}
            </div>
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
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onSave({ closeAfterSave: true })}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save & Close"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AgentNewEditDrawer;
