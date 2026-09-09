"use client";

import { useState } from "react";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Button, Field, Input, Textarea, useToast } from "@/components/ui";
import { useCreateAgent } from "../hooks";

type Props = {
  onClose?: () => void;
};

export default function AgentCreateInlineEditor({ onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createAgent = useCreateAgent();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const onCreate = async () => {
    try {
      const agent = await createAgent.mutateAsync({
        name,
        description: description || undefined,
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
        <Field label="Description" htmlFor="agent-desc">
          <Textarea
            id="agent-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outbound sales voice agent"
          />
        </Field>
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
