import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { useAgents } from "@/hooks/use-agents";
import { useContacts } from "@/hooks/use-contacts";
import { useCreateCampaign } from "../hooks";
import { usePhoneNumbers } from "@/hooks/use-settings";
import { parseCsvText } from "@/lib/csv";
import { contactsApi } from "@/services/api/contacts";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Upload, Search, CheckSquare, Square } from "lucide-react";

const STEPS = [
  "Details",
  "Agent",
  "Phone",
  "Contacts",
  "Objective",
  "Rules",
  "Review",
] as const;

type Props = {
  onClose?: () => void;
  onCreated?: (campaignId: string) => void;
};

/** Create-campaign wizard used inside WorkspacePanel (SEAM inline editor pattern). */
export default function CampaignCreateInlineEditor({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [recentlyUploaded, setRecentlyUploaded] = useState<Contact[]>([]);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    agentId: "",
    phoneNumberId: "",
    contactIds: [] as string[],
    objective: "",
    salesInstructions: "",
    campaignInstructions: "",
    callingHoursStart: "00:00",
    callingHoursEnd: "23:59",
    timezone: "Asia/Kolkata",
    maxAttempts: 1,
    retryDelayMinutes: 60,
    concurrencyLimit: 1,
    callTimeoutSeconds: 60,
    callbackBehavior: "Offer a callback during business hours",
    priority: 5,
  });
  const agents = useAgents({ limit: 100 });
  const phones = usePhoneNumbers();
  const contacts = useContacts({ limit: 250 });
  const create = useCreateCampaign();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const displayedContacts = useMemo(() => {
    const list = [...recentlyUploaded, ...(contacts.data?.items || [])];
    const seen = new Set<string>();
    return list.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [recentlyUploaded, contacts.data?.items]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(form.name.trim());
    if (step === 1) return Boolean(form.agentId);
    if (step === 2) return Boolean(form.phoneNumberId);
    if (step === 3) return form.contactIds.length > 0;
    if (step === 4) return Boolean(form.objective.trim());
    return true;
  }, [form, step]);

  const submit = async () => {
    try {
      const campaign = await create.mutateAsync({
        name: form.name,
        description: form.description || null,
        agentId: form.agentId,
        phoneNumberId: form.phoneNumberId || null,
        objective: form.objective,
        salesInstructions: form.salesInstructions || null,
        campaignInstructions: form.campaignInstructions || null,
        callingHoursStart: form.callingHoursStart,
        callingHoursEnd: form.callingHoursEnd,
        timezone: form.timezone,
        maxAttempts: form.maxAttempts,
        retryDelayMinutes: form.retryDelayMinutes,
        concurrencyLimit: form.concurrencyLimit,
        callTimeoutSeconds: form.callTimeoutSeconds,
        callbackBehavior: form.callbackBehavior || null,
        priority: form.priority,
        contactIds: form.contactIds,
      });
      toast({ title: "Campaign created", variant: "success" });
      onCreated?.(campaign.id);
      onClose?.();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast({
        title: "Could not create campaign",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              idx === step
                ? "bg-primary text-primary-foreground"
                : idx < step
                  ? "bg-secondary text-foreground"
                  : "bg-muted text-muted-foreground",
            )}
            onClick={() => setStep(idx)}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-card p-4">
        {step === 0 && (
          <>
            <Field label="Campaign name">
              <Input
                placeholder="Test call to me"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                placeholder="One test outbound call to verify Exotel + AI"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <Field label="Select agent">
            <Select
              value={form.agentId}
              onChange={(e) => setForm({ ...form, agentId: e.target.value })}
            >
              <option value="">Choose published agent…</option>
              {agents.data?.items.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.status})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {step === 2 && (
          <Field label="Caller phone number">
            <Select
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
            >
              <option value="">Optional — use org default</option>
              {phones.data?.items.map((phone) => (
                <option key={phone.id} value={phone.id}>
                  {phone.label || phone.phoneNumber}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {/* Direct CSV dropzone */}
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center transition-colors hover:border-primary/60">
              <Upload className="mx-auto h-6 w-6 text-primary mb-1.5" />
              <h4 className="text-sm font-semibold text-foreground">
                Upload CSV / Excel Contact List
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                Upload a spreadsheet with Name and Phone columns. Contacts will be added and selected automatically.
              </p>
              <div className="mt-3 flex justify-center">
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="sr-only"
                    disabled={uploadingCsv}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingCsv(true);
                      try {
                        const text = await file.text();
                        const parsed = parseCsvText(text);
                        if (!parsed.length) {
                          toast({
                            title: "No valid contacts found in CSV",
                            description: "Make sure your file has Name and Phone columns.",
                            variant: "destructive",
                          });
                          return;
                        }
                        const res = await contactsApi.batchCreate(parsed);
                        if (res.items.length > 0) {
                          setRecentlyUploaded((prev) => [...res.items, ...prev]);
                          const newIds = res.items.map((c) => c.id);
                          setForm((prev) => ({
                            ...prev,
                            contactIds: Array.from(new Set([...prev.contactIds, ...newIds])),
                          }));
                        }
                        await qc.invalidateQueries({ queryKey: ["contacts"] });
                        await contacts.refetch();
                        toast({
                          title: `Added ${res.count} contacts`,
                          description: `Successfully loaded from ${file.name}`,
                          variant: "success",
                        });
                      } catch (err) {
                        toast({
                          title: "Upload failed",
                          description: err instanceof Error ? err.message : undefined,
                          variant: "destructive",
                        });
                      } finally {
                        setUploadingCsv(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingCsv ? "Parsing & importing…" : "Select CSV file"}
                  </span>
                </label>
              </div>
            </div>

            {/* Contact list controls */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contacts ({form.contactIds.length} selected of {displayedContacts.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const allIds = displayedContacts.map((c) => c.id);
                      setForm((prev) => ({
                        ...prev,
                        contactIds: Array.from(new Set([...prev.contactIds, ...allIds])),
                      }));
                    }}
                  >
                    <CheckSquare className="mr-1 h-3.5 w-3.5" />
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setForm((prev) => ({ ...prev, contactIds: [] }))}
                  >
                    <Square className="mr-1 h-3.5 w-3.5" />
                    Deselect all
                  </Button>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-xs h-8"
                  placeholder="Filter contacts by name or phone…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>

              {/* Scrollable contact list */}
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
                {displayedContacts
                  .filter((contact) => {
                    if (!contactSearch.trim()) return true;
                    const q = contactSearch.toLowerCase();
                    return (
                      contact.name?.toLowerCase().includes(q) ||
                      contact.normalizedPhone?.includes(q) ||
                      contact.rawPhone?.includes(q) ||
                      contact.company?.toLowerCase().includes(q)
                    );
                  })
                  .map((contact) => {
                    const checked = form.contactIds.includes(contact.id);
                    return (
                      <label
                        key={contact.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer",
                          checked ? "bg-primary/10 font-medium" : "hover:bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          checked={checked}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              contactIds: e.target.checked
                                ? [...form.contactIds, contact.id]
                                : form.contactIds.filter((id) => id !== contact.id),
                            });
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {contact.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {contact.normalizedPhone || contact.rawPhone}
                            {contact.company ? ` · ${contact.company}` : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                {!displayedContacts.length && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No contacts in organization yet. Upload a CSV above to create contacts instantly.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <>
            <Field label="Objective">
              <Textarea
                placeholder="Qualify interest and book a short demo"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </Field>
            <Field label="Sales instructions">
              <Textarea
                placeholder="Be concise, polite, ask one question at a time"
                value={form.salesInstructions}
                onChange={(e) =>
                  setForm({ ...form, salesInstructions: e.target.value })
                }
              />
            </Field>
            <Field label="Campaign instructions">
              <Textarea
                placeholder="This is a test call. Keep it under 2 minutes."
                value={form.campaignInstructions}
                onChange={(e) =>
                  setForm({ ...form, campaignInstructions: e.target.value })
                }
              />
            </Field>
          </>
        )}

        {step === 5 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Calling hours start">
              <Input
                value={form.callingHoursStart}
                onChange={(e) =>
                  setForm({ ...form, callingHoursStart: e.target.value })
                }
              />
            </Field>
            <Field label="Calling hours end">
              <Input
                value={form.callingHoursEnd}
                onChange={(e) =>
                  setForm({ ...form, callingHoursEnd: e.target.value })
                }
              />
            </Field>
            <Field label="Timezone">
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </Field>
            <Field label="Max attempts">
              <Input
                type="number"
                value={form.maxAttempts}
                onChange={(e) =>
                  setForm({ ...form, maxAttempts: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Retry delay (minutes)">
              <Input
                type="number"
                value={form.retryDelayMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    retryDelayMinutes: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Concurrency limit">
              <Input
                type="number"
                value={form.concurrencyLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    concurrencyLimit: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Call timeout (seconds)">
              <Input
                type="number"
                value={form.callTimeoutSeconds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    callTimeoutSeconds: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Priority">
              <Input
                type="number"
                min={1}
                max={10}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Callback behavior" className="sm:col-span-2">
              <Textarea
                value={form.callbackBehavior}
                onChange={(e) =>
                  setForm({ ...form, callbackBehavior: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {form.name}
            </p>
            <p>
              <span className="text-muted-foreground">Agent:</span>{" "}
              {agents.data?.items.find((a) => a.id === form.agentId)?.name || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Contacts:</span>{" "}
              {form.contactIds.length}
            </p>
            <p>
              <span className="text-muted-foreground">Objective:</span>{" "}
              {form.objective}
            </p>
            <p>
              <span className="text-muted-foreground">Window:</span>{" "}
              {form.callingHoursStart}–{form.callingHoursEnd} ({form.timezone})
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button loading={create.isPending} onClick={submit}>
              Create campaign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
