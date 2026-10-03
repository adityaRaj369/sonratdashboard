"use client";

import React, { memo, useState, useCallback, useMemo } from "react";
import {
  Save,
  Bot,
  Building2,
  BookOpen,
  Volume2,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Headphones,
  MessageSquare,
  Globe,
  AlertCircle,
  Check,
} from "lucide-react";
import { agentsApi } from "@/services/api/agents";

export type AgentNewCreateDrawerProps = {
  onClose?: (result?: { refresh?: boolean; openEdit?: boolean; agentId?: string }) => void;
};

const STEPS = [
  { id: 0, label: "Identity & Role", icon: Bot, desc: "Name, channel & language" },
  { id: 1, label: "Company Context", icon: Building2, desc: "Company knowledge & website" },
  { id: 2, label: "Voice & Goals", icon: Volume2, desc: "Voice model & sales objective" },
  { id: 3, label: "Review & Save", icon: CheckCircle2, desc: "Summary & finalize" },
] as const;

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

const textToList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const AgentNewCreateDrawer = memo(function AgentNewCreateDrawer({
  onClose,
}: AgentNewCreateDrawerProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  // Step 0: Identity & Role
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<string>("sales");
  const [language, setLanguage] = useState("en");
  const [description, setDescription] = useState("");

  // Step 1: Company Profile & Context
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  // Step 2: Voice & Goals
  const [voiceId, setVoiceId] = useState("Kore");
  const [speakingStyle, setSpeakingStyle] = useState("conversational");
  const [greeting, setGreeting] = useState(
    "Hello! Thanks for connecting. How can I help you today?",
  );
  const [objective, setObjective] = useState(
    "Understand whether the customer is a good fit and offer the next step.",
  );
  const [closingBehavior, setClosingBehavior] = useState(
    "Ask permission before scheduling a follow-up or creating a lead.",
  );
  const [qualificationQuestions, setQualificationQuestions] = useState(
    "What challenge are you trying to solve?\nWhat timeline are you considering?\nWho else is involved in the decision?",
  );
  const [discoveryQuestions, setDiscoveryQuestions] = useState(
    "What solution are you using today?\nWhat would make this successful for your team?",
  );
  const [leadQualificationRules, setLeadQualificationRules] = useState(
    "Mark HIGH interest when the caller asks for pricing, demo, or next steps.\nMark CALLBACK when they ask to speak later.\nMark NOT_INTERESTED only after a clear rejection.",
  );
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Validation rules per step
  const canNext = useMemo(() => {
    if (step === 0) return Boolean(name.trim() && purpose);
    if (step === 1) return Boolean(companyName.trim());
    if (step === 2) return Boolean(objective.trim());
    return true;
  }, [step, name, purpose, companyName, objective]);

  const onSave = useCallback(async () => {
    setErrors([]);
    setToast("");
    setSaving(true);

    if (!name.trim()) {
      setErrors(["Agent name is required."]);
      setSaving(false);
      return;
    }
    if (!companyName.trim()) {
      setErrors(["Company name is required."]);
      setSaving(false);
      return;
    }

    try {
      // 1. Create base agent record
      const agent = await agentsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        purpose: purpose as any,
        companyName: companyName.trim() || "Your Company",
        primaryObjective: objective.trim() || "Qualify leads and book next steps.",
        defaultLanguage: language,
      });

      // 2. Persist company, languages, voice, and behavior sections
      try {
        await agentsApi.updateSection(agent.id, "company", {
          companyName: companyName.trim(),
          companyDescription: companyDescription.trim() || null,
          website: website.trim(),
          contactEmail: contactEmail.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        });

        await agentsApi.updateSection(agent.id, "languages", {
          supportedLanguages: [language],
          defaultLanguage: language,
          languageDetection: true,
          languageSwitching: true,
          fallbackLanguage: language,
        });

        await agentsApi.updateSection(agent.id, "voice", {
          voiceId,
          provider: "gemini",
          speed: 1.0,
          speakingStyle,
          greeting,
        });

        if (purpose === "sales" || purpose === "hybrid") {
          await agentsApi.updateSection(agent.id, "sales", {
            primaryObjective: objective.trim(),
            closingBehavior,
            secondaryObjectives: [],
            qualificationQuestions: textToList(qualificationQuestions),
            discoveryQuestions: textToList(discoveryQuestions),
            offers: [],
            objectionHandling: [],
            leadQualificationRules: textToList(leadQualificationRules),
          });
        }

        // 3. Publish if requested
        if (publishImmediately) {
          try {
            await agentsApi.publish(agent.id);
          } catch {
            // Keep in draft if validation requires additional fields
          }
        }
      } catch {
        // Fallback gracefully
      }

      setToast("Agent created successfully.");
      onClose?.({ refresh: true, openEdit: true, agentId: agent.id });
    } catch (err: any) {
      setErrors([err?.message || "Failed to create agent."]);
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    purpose,
    companyName,
    objective,
    language,
    companyDescription,
    website,
    contactEmail,
    voiceId,
    speakingStyle,
    greeting,
    closingBehavior,
    qualificationQuestions,
    discoveryQuestions,
    leadQualificationRules,
    publishImmediately,
    onClose,
  ]);

  const selectedPurpose = PURPOSE_CARDS.find((p) => p.id === purpose);
  const selectedVoice = VOICE_CARDS.find((v) => v.id === voiceId);

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

        {/* STEP 0: IDENTITY & ROLE */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">1. Agent Identity & Channel Role</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the voice agent&apos;s name, operational purpose, and primary language.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Agent Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Ava, Lucas, Maya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Default Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
                  Persona Role & Description
                </label>
                <textarea
                  className="h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Friendly senior sales consultant who explains software benefits and schedules product demos."
                />
              </div>
            </div>

            {/* Purpose Cards Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Operational Channel Purpose <span className="text-rose-500">*</span>
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
                      onClick={() => setPurpose(card.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPurpose(card.id);
                        }
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
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{card.title}</h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {card.badge}
                            </span>
                          </div>
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

        {/* STEP 1: COMPANY CONTEXT */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">2. Company Profile & Knowledge</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide real company details and context so the agent accurately answers caller inquiries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Cloud Solutions"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="hello@acme.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company Overview & Product Offerings
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Describe what your company does, key products/services, target customers, and primary value propositions..."
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VOICE & GOALS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">3. Voice Persona & Sales Behavior</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the AI speech synthesizer and configure the conversation goals.
              </p>
            </div>

            {/* Voice Cards */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Speech Synthesizer Voice <span className="text-rose-500">*</span>
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
                      onClick={() => setVoiceId(v.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setVoiceId(v.id);
                        }
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
                  onChange={(e) => setGreeting(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Primary Objective <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Closing Behavior
                </label>
                <input
                  type="text"
                  value={closingBehavior}
                  onChange={(e) => setClosingBehavior(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Qualification Questions
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={qualificationQuestions}
                  onChange={(e) => setQualificationQuestions(e.target.value)}
                  placeholder="One question per line"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Discovery Questions
                </label>
                <textarea
                  className="h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={discoveryQuestions}
                  onChange={(e) => setDiscoveryQuestions(e.target.value)}
                  placeholder="One question per line"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Lead Qualification Rules
                </label>
                <textarea
                  className="h-24 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 shadow-2xs leading-relaxed"
                  value={leadQualificationRules}
                  onChange={(e) => setLeadQualificationRules(e.target.value)}
                  placeholder="One rule per line"
                />
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Activate & Publish Agent Immediately
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Published agents are immediately selectable in outbound dialing campaigns.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publishImmediately}
                onClick={() => setPublishImmediately(!publishImmediately)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  publishImmediately ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    publishImmediately ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & SAVE */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">4. Review & Finalize Agent</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review persona setup and configuration before saving.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Identity */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Bot size={14} className="text-blue-600" />
                    Identity & Role
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
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Purpose: <strong className="text-slate-800 font-bold">{selectedPurpose?.title}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Language: <strong className="text-slate-800 font-bold">{language.toUpperCase()}</strong>
                  </p>
                </div>
                {description && (
                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg line-clamp-2">
                    &quot;{description}&quot;
                  </p>
                )}
              </div>

              {/* Card 2: Company */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600" />
                    Company Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">{companyName || "—"}</p>
                  {website && (
                    <p className="text-[11px] text-blue-600 truncate mt-0.5 font-mono">{website}</p>
                  )}
                  {contactEmail && (
                    <p className="text-[11px] text-slate-500 truncate font-mono">{contactEmail}</p>
                  )}
                </div>
                {companyDescription && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg line-clamp-3">
                    {companyDescription}
                  </p>
                )}
              </div>

              {/* Card 3: Voice & Behavior */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-blue-600" />
                    Voice & Objective
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-slate-400">Voice: </span>
                    <strong className="font-bold">{selectedVoice?.name} ({selectedVoice?.gender})</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Status: </span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] uppercase ${
                        publishImmediately ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {publishImmediately ? "Live / Published" : "Draft"}
                    </span>
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg line-clamp-3">
                  {objective}
                </p>
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
              onClick={onSave}
              disabled={saving || !name.trim() || !companyName.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save Agent"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default AgentNewCreateDrawer;
