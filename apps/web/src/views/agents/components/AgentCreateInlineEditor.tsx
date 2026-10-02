"use client";

import { useState } from "react";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { useCreateAgent } from "../hooks";
import { agentsApi } from "@/services/api/agents";

type Props = {
  onClose?: () => void;
};

type AgentPurpose = "sales" | "support" | "whatsapp";

export default function AgentCreateInlineEditor({ onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<AgentPurpose>("sales");
  const [companyName, setCompanyName] = useState("");
  const [objective, setObjective] = useState("");
  const [language, setLanguage] = useState("en");
  const createAgent = useCreateAgent();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const onCreate = async () => {
    try {
      const agent = await createAgent.mutateAsync({
        name,
        description: description || undefined,
        purpose,
        companyName: companyName.trim() || "Your company",
        primaryObjective:
          objective.trim() ||
          "Understand whether the customer is a good fit and offer the next step.",
        defaultLanguage: language,
      });
      // The agent record is already created. Persist the context separately so
      // optional setup validation can never make creation appear to fail.
      try {
        await agentsApi.updateSection(agent.id, "company", {
          companyName: companyName.trim() || "Your company",
          companyDescription: null,
          website: "",
          address: null,
          contactEmail: "",
          contactPhone: null,
          businessHours: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          locations: [],
        });
        await agentsApi.updateSection(agent.id, "languages", {
          supportedLanguages: [language],
          defaultLanguage: language,
          languageDetection: true,
          languageSwitching: true,
          fallbackLanguage: language,
        });
        if (purpose === "sales") {
          await agentsApi.updateSection(agent.id, "sales", {
            primaryObjective:
              objective.trim() ||
              "Understand whether the customer is a good fit and offer the next step.",
            secondaryObjectives: [],
            qualificationQuestions: [],
            discoveryQuestions: [],
            offers: [],
            objectionHandling: [],
            closingBehavior:
              "Ask permission before scheduling a follow-up or creating a lead.",
            leadQualificationRules: [],
          });
        }
      } catch {
        // The configuration page remains available to complete any setup that
        // could not be saved during creation.
      }
      toast({ title: "Agent created", variant: "success" });
      onClose?.();
      router.push(`/agents/${agent.id}/general`);
    } catch (err) {
      toast({
        title: "Could not create agent",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="mx-auto max-w-xl space-y-3 rounded-lg border border-border bg-card p-4">
        <Field label="Name" htmlFor="agent-name">
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ava"
            autoFocus
          />
        </Field>
        <Field label="Company name" htmlFor="agent-company">
          <Input
            id="agent-company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
          />
        </Field>
        <Field label="Primary goal" htmlFor="agent-objective">
          <Input
            id="agent-objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Qualify leads and book demos"
          />
        </Field>
        <Field label="Default language" htmlFor="agent-language">
          <Select
            id="agent-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="en-IN">English (India)</option>
          </Select>
        </Field>
        <Field label="Agent type" htmlFor="agent-purpose">
          <Select
            id="agent-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as AgentPurpose)}
          >
            <option value="sales">Sales call agent</option>
            <option value="support">Customer support (call)</option>
            <option value="whatsapp">WhatsApp support agent</option>
          </Select>
        </Field>
        <Field label="Description" htmlFor="agent-desc">
          <Textarea
            id="agent-desc"
            maxLength={10000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this agent should do for your company"
          />
        </Field>
        <p className="-mt-2 text-right text-xs text-muted-foreground">
          {description.length}/10,000 characters
        </p>
        <p className="text-xs text-slate-500">
          Next: add company knowledge (text/FAQs), languages, and publish. Live
          calls use that knowledge — not a generic Gemini greeting.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onClose?.()}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            loading={createAgent.isPending}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
