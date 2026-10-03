"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  agentCallBehaviorSchema,
  agentCompanySchema,
  agentGeneralSchema,
  agentLanguageSchema,
  agentPersonalitySchema,
  agentSafetySchema,
  agentSalesSchema,
  agentSupportSchema,
  agentToolsSchema,
  agentVoiceSchema,
} from "@sonrat/shared";
import { z } from "zod";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { useUpdateAgentSection } from "@/hooks/use-agents";
import { useAgentFlows } from "@/hooks/use-agent-flows";
import { agentsApi, type AgentSection } from "@/services/api/agents";
import {
  ArrowRight,
  HelpCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
  Target,
  Trash2,
} from "lucide-react";

function StringListEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder || "Add item"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!draft.trim()) return;
              onChange([...value, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            if (!draft.trim()) return;
            onChange([...value, draft.trim()]);
            setDraft("");
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {value.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs shadow-xs transition-colors hover:border-slate-300"
            >
              <span className="flex-1 font-medium text-slate-900">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-rose-600 shrink-0 ml-2"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionFormShell({
  dirty,
  saving,
  onSave,
  children,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button type="submit" loading={saving} disabled={!dirty}>
          Save section
        </Button>
      </div>
      {children}
    </form>
  );
}

type SectionProps = {
  agentId: string;
  initialData: unknown;
};

export function GeneralSection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const flows = useAgentFlows({ limit: 100 });
  const { toast } = useToast();
  const form = useForm<z.infer<typeof agentGeneralSchema>>({
    resolver: zodResolver(agentGeneralSchema),
    defaultValues: (initialData as z.infer<typeof agentGeneralSchema>) || {
      name: "",
      role: "",
      purpose: "sales",
      flowId: null,
    },
  });

  React.useEffect(() => {
    if (initialData) form.reset(initialData as z.infer<typeof agentGeneralSchema>);
  }, [initialData, form]);

  return (
    <SectionFormShell
      dirty={form.formState.isDirty}
      saving={update.isPending}
      onSave={form.handleSubmit(async (values) => {
        try {
          await update.mutateAsync({ section: "general", data: values });
          form.reset(values);
          toast({ title: "General saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Role" error={form.formState.errors.role?.message}>
          <Input {...form.register("role")} />
        </Field>
        <Field label="Industry">
          <Input {...form.register("industry")} />
        </Field>
        <Field label="Purpose">
          <Select {...form.register("purpose")}>
            <option value="sales">Sales call agent</option>
            <option value="support">Customer support (call)</option>
            <option value="whatsapp">WhatsApp support agent</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </Field>
        <Field label="Conversation flow" className="sm:col-span-2">
          <Select {...form.register("flowId")}>
            <option value="">None — free-form from knowledge</option>
            {(flows.data?.items || [])
              .filter((f) => f.status === "PUBLISHED" || f.activeVersionId)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.status})
                </option>
              ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Publish a flow under Agents → Flows, then attach it here.
          </p>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea {...form.register("description")} />
        </Field>
      </div>
    </SectionFormShell>
  );
}

export function CompanySection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof agentCompanySchema>>({
    resolver: zodResolver(agentCompanySchema),
    defaultValues: (initialData as z.infer<typeof agentCompanySchema>) || {
      companyName: "",
      timezone: "UTC",
      businessHours: [],
      locations: [],
    },
  });

  React.useEffect(() => {
    if (initialData) form.reset(initialData as z.infer<typeof agentCompanySchema>);
  }, [initialData, form]);

  return (
    <SectionFormShell
      dirty={form.formState.isDirty}
      saving={update.isPending}
      onSave={form.handleSubmit(async (values) => {
        try {
          await update.mutateAsync({ section: "company", data: values });
          form.reset(values);
          toast({ title: "Company saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name" error={form.formState.errors.companyName?.message}>
          <Input {...form.register("companyName")} />
        </Field>
        <Field label="Website">
          <Input {...form.register("website")} />
        </Field>
        <Field label="Contact email">
          <Input {...form.register("contactEmail")} />
        </Field>
        <Field label="Contact phone">
          <Input {...form.register("contactPhone")} />
        </Field>
        <Field label="Timezone">
          <Input {...form.register("timezone")} />
        </Field>
        <Field label="Address">
          <Input {...form.register("address")} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea {...form.register("companyDescription")} />
        </Field>
      </div>
    </SectionFormShell>
  );
}

export function PersonalitySection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof agentPersonalitySchema>>({
    resolver: zodResolver(agentPersonalitySchema),
    defaultValues: (initialData as z.infer<typeof agentPersonalitySchema>) || {
      personality: "",
      tone: "",
      friendliness: 7,
      professionalism: 8,
      verbosity: "concise",
      speakingStyle: "",
    },
  });

  React.useEffect(() => {
    if (initialData) form.reset(initialData as z.infer<typeof agentPersonalitySchema>);
  }, [initialData, form]);

  return (
    <SectionFormShell
      dirty={form.formState.isDirty}
      saving={update.isPending}
      onSave={form.handleSubmit(async (values) => {
        try {
          await update.mutateAsync({ section: "personality", data: values });
          form.reset(values);
          toast({ title: "Personality saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Personality">
          <Input {...form.register("personality")} />
        </Field>
        <Field label="Tone">
          <Input {...form.register("tone")} />
        </Field>
        <Field label="Speaking style">
          <Input {...form.register("speakingStyle")} />
        </Field>
        <Field label="Verbosity">
          <Select {...form.register("verbosity")}>
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </Select>
        </Field>
        <Field label="Friendliness (1-10)">
          <Input type="number" min={1} max={10} {...form.register("friendliness", { valueAsNumber: true })} />
        </Field>
        <Field label="Professionalism (1-10)">
          <Input type="number" min={1} max={10} {...form.register("professionalism", { valueAsNumber: true })} />
        </Field>
      </div>
    </SectionFormShell>
  );
}

export function VoiceSection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof agentVoiceSchema>>({
    resolver: zodResolver(agentVoiceSchema),
    defaultValues: (initialData as z.infer<typeof agentVoiceSchema>) || {
      voiceProvider: "gemini",
      voiceId: "Kore",
      voiceGender: "neutral",
      language: "en",
    },
  });

  React.useEffect(() => {
    if (initialData) form.reset(initialData as z.infer<typeof agentVoiceSchema>);
  }, [initialData, form]);

  return (
    <SectionFormShell
      dirty={form.formState.isDirty}
      saving={update.isPending}
      onSave={form.handleSubmit(async (values) => {
        try {
          await update.mutateAsync({ section: "voice", data: values });
          form.reset(values);
          toast({ title: "Voice saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Voice ID">
          <Select {...form.register("voiceId")}>
            <option value="Puck">Puck (upbeat)</option>
            <option value="Charon">Charon</option>
            <option value="Kore">Kore (natural)</option>
            <option value="Fenrir">Fenrir</option>
            <option value="Aoede">Aoede</option>
          </Select>
        </Field>
        <Field label="Gender">
          <Select {...form.register("voiceGender")}>
            <option value="neutral">Neutral</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>
        <Field label="Language">
          <Input {...form.register("language")} />
        </Field>
        <Field label="Style">
          <Input {...form.register("style")} />
        </Field>
      </div>
    </SectionFormShell>
  );
}

export function LanguagesSection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  const defaults = React.useMemo<z.infer<typeof agentLanguageSchema>>(
    () => ({
      supportedLanguages: ["en", "hi"],
      defaultLanguage: "en",
      languageDetection: true,
      languageSwitching: true,
      fallbackLanguage: "en",
    }),
    [],
  );
  const data = (initialData as z.infer<typeof agentLanguageSchema>) || defaults;
  const [values, setValues] = React.useState(data);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setValues((initialData as z.infer<typeof agentLanguageSchema>) || defaults);
    setDirty(false);
  }, [initialData, defaults]);

  const applyPreset = (codes: string[]) => {
    setValues((v) => ({
      ...v,
      supportedLanguages: codes,
      defaultLanguage: codes[0] || "en",
      fallbackLanguage: codes.includes("en") ? "en" : codes[0] || "en",
    }));
    setDirty(true);
  };

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        const parsed = agentLanguageSchema.safeParse(values);
        if (!parsed.success) {
          toast({ title: "Invalid languages config", variant: "destructive" });
          return;
        }
        try {
          await update.mutateAsync({ section: "languages", data: parsed.data });
          setDirty(false);
          toast({ title: "Languages saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => applyPreset(["en", "hi"])}
        >
          EN + HI
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => applyPreset(["en", "hi", "ta", "te", "kn", "ml"])}
        >
          South India
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => applyPreset(["en", "hi", "bn", "mr", "gu", "pa"])}
        >
          North / West
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => applyPreset(["en"])}
        >
          English only
        </Button>
      </div>
      <Field label="Supported languages">
        <StringListEditor
          value={values.supportedLanguages}
          onChange={(supportedLanguages) => {
            setValues((v) => ({ ...v, supportedLanguages }));
            setDirty(true);
          }}
          placeholder="en"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Default language">
          <Input
            value={values.defaultLanguage}
            onChange={(e) => {
              setValues((v) => ({ ...v, defaultLanguage: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Fallback language">
          <Input
            value={values.fallbackLanguage}
            onChange={(e) => {
              setValues((v) => ({ ...v, fallbackLanguage: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.languageDetection}
          onChange={(e) => {
            setValues((v) => ({ ...v, languageDetection: e.target.checked }));
            setDirty(true);
          }}
        />
        Language detection
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.languageSwitching}
          onChange={(e) => {
            setValues((v) => ({ ...v, languageSwitching: e.target.checked }));
            setDirty(true);
          }}
        />
        Allow mid-call language switching
      </label>
    </SectionFormShell>
  );
}

function ArraySection({
  agentId,
  section,
  schema,
  initialData,
  fields,
}: {
  agentId: string;
  section: AgentSection;
  schema: z.ZodTypeAny;
  initialData: unknown;
  fields: Array<{ key: string; label: string; type?: "text" | "textarea" | "list" }>;
}) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  const [values, setValues] = React.useState<Record<string, unknown>>(
    (initialData as Record<string, unknown>) || {},
  );
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setValues((initialData as Record<string, unknown>) || {});
    setDirty(false);
  }, [initialData]);

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
          toast({ title: "Validation failed", variant: "destructive" });
          return;
        }
        try {
          await update.mutateAsync({ section, data: parsed.data });
          setDirty(false);
          toast({ title: "Section saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-3">
        {fields.map((field) => (
          <Field key={field.key} label={field.label}>
            {field.type === "list" ? (
              <StringListEditor
                value={(values[field.key] as string[]) || []}
                onChange={(next) => {
                  setValues((v) => ({ ...v, [field.key]: next }));
                  setDirty(true);
                }}
              />
            ) : field.type === "textarea" ? (
              <Textarea
                value={(values[field.key] as string) || ""}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [field.key]: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <Input
                value={(values[field.key] as string) || ""}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [field.key]: e.target.value }));
                  setDirty(true);
                }}
              />
            )}
          </Field>
        ))}
      </div>
    </SectionFormShell>
  );
}

export function SalesSection(props: SectionProps) {
  const update = useUpdateAgentSection(props.agentId);
  const { toast } = useToast();
  type SalesConfig = z.infer<typeof agentSalesSchema>;
  const defaults: SalesConfig = {
    primaryObjective: "",
    secondaryObjectives: [],
    qualificationQuestions: [],
    discoveryQuestions: [],
    offers: [],
    objectionHandling: [],
    closingBehavior: "",
    leadQualificationRules: [],
  };

  const [values, setValues] = React.useState<SalesConfig>(() => ({
    ...defaults,
    ...((props.initialData as SalesConfig) || {}),
  }));
  const [dirty, setDirty] = React.useState(false);

  // Dedicated objection handler draft state
  const [objectionTrigger, setObjectionTrigger] = React.useState("");
  const [objectionResponse, setObjectionResponse] = React.useState("");

  React.useEffect(() => {
    setValues({
      ...defaults,
      ...((props.initialData as SalesConfig) || {}),
    });
    setDirty(false);
  }, [props.initialData]);

  const addObjection = (trigger: string, response: string) => {
    if (!trigger.trim() || !response.trim()) return;
    const formatted = `When prospect says: "${trigger.trim()}" -> Pitch: ${response.trim()}`;
    setValues((prev) => ({
      ...prev,
      objectionHandling: [...prev.objectionHandling, formatted],
    }));
    setDirty(true);
    setObjectionTrigger("");
    setObjectionResponse("");
  };

  const OBJECTION_PRESETS = [
    {
      title: "Too expensive",
      trigger: "It's too expensive / We don't have the budget right now.",
      response: "Acknowledge budget constraints, emphasize average 3x ROI achieved within 90 days, and offer the flexible monthly tier or starter pilot.",
    },
    {
      title: "Send an email",
      trigger: "Can you just send me an email with the details?",
      response: "Agree to email immediately, then ask one quick qualifying question so the sent info is specifically customized to their current setup.",
    },
    {
      title: "Using competitor",
      trigger: "We are already using another vendor / solution.",
      response: "Respect their current choice, ask what they like most about it, and highlight our distinct advantage in AI automation and instant setup.",
    },
    {
      title: "Bad timing",
      trigger: "I'm busy / Now is not a good time.",
      response: "Apologize politely for catching them at a busy time, and propose a specific 5-minute callback time tomorrow morning or afternoon.",
    },
  ];

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        const parsed = agentSalesSchema.safeParse(values);
        if (!parsed.success) {
          toast({
            title: "Validation failed",
            description: parsed.error.issues[0]?.message || "Check required fields",
            variant: "destructive",
          });
          return;
        }
        try {
          await update.mutateAsync({ section: "sales", data: parsed.data });
          setDirty(false);
          toast({ title: "Sales playbook saved successfully", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-6">
        {/* Playbook Overview Header */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-transparent p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">
                  Sales & Outbound Playbook
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-xl">
                Configure your AI agent&apos;s pitch strategy, qualification criteria, offer catalog, and objection-handling playbook for outbound sales calls.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                {values.qualificationQuestions.length} Qualification Qs
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                {values.offers.length} Offers
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                {values.objectionHandling.length} Objection Handlers
              </span>
            </div>
          </div>
        </div>

        {/* Card 1: Core Strategy & Closing */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-700" />
              Core Strategy & Closing
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Define the primary conversion goal and the exact closing behavior.
            </p>
          </div>

          <Field label="Primary objective *">
            <p className="text-[11px] text-slate-500 mb-1">
              The #1 outcome of the call (e.g. Schedule a demo, close a trial, qualify interest)
            </p>
            <Input
              placeholder="e.g. Qualify interest in our AI receptionist and book a 15-minute product walkthrough"
              value={values.primaryObjective}
              onChange={(e) => {
                setValues((v) => ({ ...v, primaryObjective: e.target.value }));
                setDirty(true);
              }}
            />
          </Field>

          <Field label="Secondary objectives">
            <p className="text-[11px] text-slate-500 mb-1">
              Additional milestones if primary objective is met or blocked
            </p>
            <StringListEditor
              value={values.secondaryObjectives}
              placeholder="e.g. Get direct email of head of operations"
              onChange={(next) => {
                setValues((v) => ({ ...v, secondaryObjectives: next }));
                setDirty(true);
              }}
            />
          </Field>

          <Field label="Closing behavior">
            <p className="text-[11px] text-slate-500 mb-1">
              How the agent should secure commitment and wrap up the call
            </p>
            <Textarea
              placeholder="e.g. Confirm the prospect's email and phone number, propose two concrete time slots for the demo, warmly thank them, and inform them they will receive a calendar invite."
              rows={3}
              value={values.closingBehavior || ""}
              onChange={(e) => {
                setValues((v) => ({ ...v, closingBehavior: e.target.value }));
                setDirty(true);
              }}
            />
          </Field>
        </div>

        {/* Card 2: Discovery & Qualification Scripting */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-700" />
              Discovery & Qualification Scripting
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Questions the AI will ask to qualify prospects and uncover pain points.
            </p>
          </div>

          <Field label="Qualification questions">
            <p className="text-[11px] text-slate-500 mb-1">
              Questions to verify if the prospect fits your ideal customer profile
            </p>
            <StringListEditor
              value={values.qualificationQuestions}
              placeholder="e.g. How many inbound calls does your team currently handle each week?"
              onChange={(next) => {
                setValues((v) => ({ ...v, qualificationQuestions: next }));
                setDirty(true);
              }}
            />
          </Field>

          <Field label="Discovery questions">
            <p className="text-[11px] text-slate-500 mb-1">
              Probing questions to uncover bottlenecks and urgency
            </p>
            <StringListEditor
              value={values.discoveryQuestions}
              placeholder="e.g. What happens when a customer calls after business hours?"
              onChange={(next) => {
                setValues((v) => ({ ...v, discoveryQuestions: next }));
                setDirty(true);
              }}
            />
          </Field>

          <Field label="Lead qualification rules">
            <p className="text-[11px] text-slate-500 mb-1">
              Rules that mark a contact as an active qualified lead
            </p>
            <StringListEditor
              value={values.leadQualificationRules}
              placeholder="e.g. Qualify if company receives >20 calls/day and agrees to a demo"
              onChange={(next) => {
                setValues((v) => ({ ...v, leadQualificationRules: next }));
                setDirty(true);
              }}
            />
          </Field>
        </div>

        {/* Card 3: Offers & Promotions */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-700" />
              Offers, Pricing & Value Propositions
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Packages, discounts, and hooks the agent can pitch to incentivize action.
            </p>
          </div>

          <Field label="Active offers & incentives">
            <p className="text-[11px] text-slate-500 mb-1">
              Promotions the AI can offer to hesitant prospects
            </p>
            <StringListEditor
              value={values.offers}
              placeholder="e.g. 14-day risk-free pilot with 500 free calling minutes included"
              onChange={(next) => {
                setValues((v) => ({ ...v, offers: next }));
                setDirty(true);
              }}
            />
          </Field>
        </div>

        {/* Card 4: Objection Handling Matrix */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-700" />
                  Objection Handling Matrix
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Train the agent how to counter pushback with winning responses.
                </p>
              </div>
            </div>
          </div>

          {/* Quick preset chips */}
          <div>
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
              Quick-add common objection handlers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {OBJECTION_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => addObjection(preset.trigger, preset.response)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-900 transition-colors hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                >
                  <Plus className="h-3 w-3 text-slate-700" />
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Objection Input Builder */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-900">
              Add custom objection handler
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  When prospect says:
                </label>
                <Input
                  className="text-xs"
                  placeholder="e.g. We don't have the budget right now"
                  value={objectionTrigger}
                  onChange={(e) => setObjectionTrigger(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Agent pitch / counter-argument:
                </label>
                <Input
                  className="text-xs"
                  placeholder="e.g. Explain our flexible starter plan and 3x cost savings"
                  value={objectionResponse}
                  onChange={(e) => setObjectionResponse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addObjection(objectionTrigger, objectionResponse);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={!objectionTrigger.trim() || !objectionResponse.trim()}
                onClick={() => addObjection(objectionTrigger, objectionResponse)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add objection rule
              </Button>
            </div>
          </div>

          {/* List of active objection handlers */}
          <div className="space-y-2">
            {values.objectionHandling.map((item, idx) => {
              const arrowIdx = item.indexOf("->");
              const isFormatted = arrowIdx !== -1;
              const trigger = isFormatted
                ? item.substring(0, arrowIdx).replace(/^When (prospect|customer) says:\s*"?/, "").replace(/"?\s*$/, "")
                : "Objection";
              const pitch = isFormatted
                ? item.substring(arrowIdx + 2).replace(/^(Pitch|Counter|Response):\s*/, "").trim()
                : item;

              return (
                <div
                  key={`${item}-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-colors hover:border-slate-300"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Prospect Objection
                      </span>
                      <span className="text-xs font-medium text-slate-900">
                        &ldquo;{trigger}&rdquo;
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-700 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {pitch}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 shrink-0"
                    onClick={() =>
                      setValues((prev) => ({
                        ...prev,
                        objectionHandling: prev.objectionHandling.filter(
                          (_, i) => i !== idx,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {!values.objectionHandling.length && (
              <p className="text-xs text-slate-500 italic text-center py-3">
                No objection handling rules configured yet. Click a preset above or add a custom rule.
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionFormShell>
  );
}

export function SupportSection(props: SectionProps) {
  return (
    <ArraySection
      {...props}
      section="support"
      schema={agentSupportSchema}
      fields={[
        { key: "supportWorkflows", label: "Support workflows", type: "list" },
        { key: "escalationRules", label: "Escalation rules", type: "list" },
        { key: "humanHandoffRules", label: "Human handoff rules", type: "list" },
        { key: "prohibitedAnswers", label: "Prohibited answers", type: "list" },
        { key: "issueCategories", label: "Issue categories", type: "list" },
      ]}
    />
  );
}

export function SafetySection(props: SectionProps) {
  return (
    <ArraySection
      {...props}
      section="safety"
      schema={agentSafetySchema}
      fields={[
        { key: "prohibitedTopics", label: "Prohibited topics", type: "list" },
        { key: "unsupportedClaims", label: "Unsupported claims", type: "list" },
        { key: "privacyBehavior", label: "Privacy behavior", type: "textarea" },
        { key: "sensitiveInformationRules", label: "Sensitive information rules", type: "list" },
        { key: "escalationRequirements", label: "Escalation requirements", type: "list" },
      ]}
    />
  );
}

export function CallBehaviorSection(props: SectionProps) {
  const update = useUpdateAgentSection(props.agentId);
  const { toast } = useToast();
  type CallBehavior = z.infer<typeof agentCallBehaviorSchema>;
  const defaults: CallBehavior = {
    greeting: "",
    interruptionHandling: "Stop speaking immediately and listen.",
    silenceBehavior: "Ask a brief clarifying question after 5 seconds.",
    closing: "",
    maximumCallDurationSeconds: 600,
    callbackBehavior: "",
    callEndRules: [],
  };
  const [values, setValues] = React.useState<CallBehavior>(
    (props.initialData as CallBehavior) || defaults,
  );
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setValues((props.initialData as CallBehavior) || defaults);
    setDirty(false);
    // defaults is stable module-level config for this section
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialData]);

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        const parsed = agentCallBehaviorSchema.safeParse(values);
        if (!parsed.success) {
          toast({
            title: "Validation failed",
            description: parsed.error.issues.map((i) => i.message).join("; "),
            variant: "destructive",
          });
          return;
        }
        try {
          await update.mutateAsync({
            section: "callBehavior",
            data: parsed.data,
          });
          setDirty(false);
          toast({ title: "Call behavior saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-3">
        <Field label="Greeting">
          <Textarea
            value={values.greeting}
            onChange={(e) => {
              setValues((v) => ({ ...v, greeting: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Interruption handling">
          <Textarea
            value={values.interruptionHandling}
            onChange={(e) => {
              setValues((v) => ({
                ...v,
                interruptionHandling: e.target.value,
              }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Silence behavior">
          <Textarea
            value={values.silenceBehavior}
            onChange={(e) => {
              setValues((v) => ({ ...v, silenceBehavior: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Closing">
          <Textarea
            value={values.closing}
            onChange={(e) => {
              setValues((v) => ({ ...v, closing: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Maximum call duration (seconds)">
          <Input
            type="number"
            min={30}
            max={3600}
            value={values.maximumCallDurationSeconds}
            onChange={(e) => {
              setValues((v) => ({
                ...v,
                maximumCallDurationSeconds: Number(e.target.value),
              }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Callback behavior">
          <Textarea
            value={values.callbackBehavior || ""}
            onChange={(e) => {
              setValues((v) => ({ ...v, callbackBehavior: e.target.value }));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Call end rules">
          <StringListEditor
            value={values.callEndRules}
            onChange={(callEndRules) => {
              setValues((v) => ({ ...v, callEndRules }));
              setDirty(true);
            }}
          />
        </Field>
      </div>
    </SectionFormShell>
  );
}

export function ToolsSection(props: SectionProps) {
  const update = useUpdateAgentSection(props.agentId);
  const { toast } = useToast();
  const data = (props.initialData as z.infer<typeof agentToolsSchema>) || {
    enabledTools: [],
  };
  const [values, setValues] = React.useState(data);
  const [dirty, setDirty] = React.useState(false);
  const available = [
    "schedule_callback",
    "create_lead",
    "transfer_call",
    "update_contact",
    "book_appointment",
  ];

  React.useEffect(() => {
    setValues(
      (props.initialData as z.infer<typeof agentToolsSchema>) || {
        enabledTools: [],
      },
    );
    setDirty(false);
  }, [props.initialData]);

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        const parsed = agentToolsSchema.safeParse(values);
        if (!parsed.success) {
          toast({ title: "Invalid tools config", variant: "destructive" });
          return;
        }
        try {
          await update.mutateAsync({ section: "tools", data: parsed.data });
          setDirty(false);
          toast({ title: "Tools saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-2">
        {available.map((tool) => {
          const checked = values.enabledTools.includes(tool);
          return (
            <label
              key={tool}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  setValues((v) => ({
                    enabledTools: e.target.checked
                      ? [...v.enabledTools, tool]
                      : v.enabledTools.filter((t) => t !== tool),
                  }));
                  setDirty(true);
                }}
              />
              {tool}
            </label>
          );
        })}
      </div>
    </SectionFormShell>
  );
}

export function ProductsSection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  type ProductItem = {
    name: string;
    description?: string | null;
    features: string[];
    benefits: string[];
    currency: string;
  };
  const [products, setProducts] = React.useState<ProductItem[]>(
    (initialData as ProductItem[]) || [],
  );
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setProducts((initialData as ProductItem[]) || []);
    setDirty(false);
  }, [initialData]);

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        try {
          await update.mutateAsync({ section: "products", data: products });
          setDirty(false);
          toast({ title: "Products saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-3">
        {products.map((product, idx) => (
          <div key={idx} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <Field label="Product name">
              <Input
                value={product.name}
                onChange={(e) => {
                  const next = [...products];
                  next[idx] = { ...product, name: e.target.value };
                  setProducts(next);
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={product.description || ""}
                onChange={(e) => {
                  const next = [...products];
                  next[idx] = { ...product, description: e.target.value };
                  setProducts(next);
                  setDirty(true);
                }}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setProducts(products.filter((_, i) => i !== idx));
                setDirty(true);
              }}
            >
              Remove product
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setProducts([
              ...products,
              {
                name: "",
                description: "",
                features: [],
                benefits: [],
                currency: "USD",
              },
            ]);
            setDirty(true);
          }}
        >
          Add product
        </Button>
      </div>
    </SectionFormShell>
  );
}

export function KnowledgeSection({ agentId, initialData }: SectionProps) {
  const update = useUpdateAgentSection(agentId);
  const { toast } = useToast();
  type KnowledgeDoc = {
    id: string;
    fileName: string;
    objectKey: string;
    contentType: string;
    extractedText: string;
    uploadedAt: string;
  };
  type Knowledge = {
    faqs: Array<{ question: string; answer: string }>;
    policies: string[];
    supportInformation: string[];
    salesInformation: string[];
    additionalKnowledge: string[];
    documents: KnowledgeDoc[];
  };
  const defaults = React.useMemo<Knowledge>(
    () => ({
      faqs: [],
      policies: [],
      supportInformation: [],
      salesInformation: [],
      additionalKnowledge: [],
      documents: [],
    }),
    [],
  );
  const [values, setValues] = React.useState<Knowledge>({
    ...defaults,
    ...((initialData as Knowledge) || {}),
    documents: ((initialData as Knowledge)?.documents as KnowledgeDoc[]) || [],
  });
  const [dirty, setDirty] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setValues({
      ...defaults,
      ...((initialData as Knowledge) || {}),
      documents: ((initialData as Knowledge)?.documents as KnowledgeDoc[]) || [],
    });
    setDirty(false);
  }, [initialData, defaults]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await agentsApi.uploadKnowledgeDocument(agentId, file);
      setValues((v) => ({
        ...v,
        ...(result.knowledge as Knowledge),
        documents: (result.knowledge as Knowledge).documents || [
          ...(v.documents || []),
          result.document,
        ],
      }));
      toast({
        title: "Knowledge file uploaded",
        description: result.document.extractedText
          ? `Extracted ${result.document.extractedText.length} characters into the agent brain.`
          : "File stored. Add notes if text extraction was empty.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <SectionFormShell
      dirty={dirty}
      saving={update.isPending}
      onSave={async () => {
        try {
          await update.mutateAsync({ section: "knowledge", data: values });
          setDirty(false);
          toast({ title: "Knowledge saved", variant: "success" });
        } catch (err) {
          toast({
            title: "Save failed",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }}
    >
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Company documents</p>
            <p className="text-xs text-slate-500">
              Upload PDF / TXT / MD / CSV. Text is extracted into the live agent prompt on publish.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload file
            </Button>
          </div>
        </div>
        {(values.documents || []).length ? (
          <ul className="space-y-2">
            {values.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {doc.extractedText
                      ? `${doc.extractedText.length} chars extracted`
                      : "No text extracted yet"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const result = await agentsApi.removeKnowledgeDocument(
                        agentId,
                        doc.id,
                      );
                      setValues((v) => ({
                        ...v,
                        ...(result.knowledge as Knowledge),
                      }));
                      toast({ title: "Document removed", variant: "success" });
                    } catch (err) {
                      toast({
                        title: "Remove failed",
                        description:
                          err instanceof Error ? err.message : undefined,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No documents uploaded yet.</p>
        )}
      </div>
      <Field label="Policies">
        <StringListEditor
          value={values.policies}
          onChange={(policies) => {
            setValues((v) => ({ ...v, policies }));
            setDirty(true);
          }}
        />
      </Field>
      <Field label="Sales information">
        <StringListEditor
          value={values.salesInformation}
          onChange={(salesInformation) => {
            setValues((v) => ({ ...v, salesInformation }));
            setDirty(true);
          }}
        />
      </Field>
      <Field label="Support information">
        <StringListEditor
          value={values.supportInformation}
          onChange={(supportInformation) => {
            setValues((v) => ({ ...v, supportInformation }));
            setDirty(true);
          }}
        />
      </Field>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">FAQs</p>
        {values.faqs.map((faq, idx) => (
          <div key={idx} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
            <Input
              placeholder="Question"
              value={faq.question}
              onChange={(e) => {
                const faqs = [...values.faqs];
                faqs[idx] = { ...faq, question: e.target.value };
                setValues((v) => ({ ...v, faqs }));
                setDirty(true);
              }}
            />
            <Input
              placeholder="Answer"
              value={faq.answer}
              onChange={(e) => {
                const faqs = [...values.faqs];
                faqs[idx] = { ...faq, answer: e.target.value };
                setValues((v) => ({ ...v, faqs }));
                setDirty(true);
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues((v) => ({
              ...v,
              faqs: [...v.faqs, { question: "", answer: "" }],
            }));
            setDirty(true);
          }}
        >
          Add FAQ
        </Button>
      </div>
    </SectionFormShell>
  );
}
