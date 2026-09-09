"use client";

import { useState } from "react";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { useCreateAgent } from "../hooks";

type Props = {
  onClose?: () => void;
};

type AgentPurpose = "sales" | "support" | "whatsapp";

export default function AgentCreateInlineEditor({ onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<AgentPurpose>("sales");
  const createAgent = useCreateAgent();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const onCreate = async () => {
    try {
      const agent = await createAgent.mutateAsync({
        name,
        description: description || undefined,
        purpose,
      });
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this agent should do for your company"
          />
        </Field>
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
