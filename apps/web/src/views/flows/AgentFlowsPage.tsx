"use client";

import { useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  useToast,
} from "@/components/ui";
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import {
  useAgentFlows,
  useCreateAgentFlow,
  usePublishAgentFlow,
} from "@/hooks/use-agent-flows";
import { formatDate } from "@/lib/utils";

export default function AgentFlowsPage() {
  const flows = useAgentFlows({ limit: 50 });
  const create = useCreateAgentFlow();
  const publish = usePublishAgentFlow();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Workspace>
      <WorkspaceHeader
        title="Agent Flows"
        description="Conversation graphs (Start → Say/Ask → End). Attach a published flow on an agent’s General section."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New flow
          </Button>
        }
      />
      <WorkspaceToolbar>
        <span className="text-sm text-muted-foreground">
          Attach published flows on an agent&apos;s General section
        </span>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {flows.isLoading ? (
          <TableSkeleton />
        ) : flows.isError ? (
          <ErrorState
            description={flows.error.message}
            onRetry={() => flows.refetch()}
          />
        ) : !flows.data?.items.length ? (
          <EmptyState
            icon={<GitBranch className="h-8 w-8" />}
            title="No flows yet"
            description="Create a starter flow, publish it, then attach it to an agent."
            actionLabel="New flow"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {flows.data.items.map((flow) => (
                <TR key={flow.id}>
                  <TD className="font-medium">{flow.name}</TD>
                  <TD>
                    <Badge variant="outline">{flow.status}</Badge>
                  </TD>
                  <TD>{formatDate(flow.updatedAt)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/flows/${flow.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      {flow.status !== "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={publish.isPending}
                          onClick={async () => {
                            try {
                              await publish.mutateAsync(flow.id);
                              toast({
                                title: "Flow published",
                                variant: "success",
                              });
                            } catch (err) {
                              toast({
                                title: "Publish failed",
                                description:
                                  err instanceof Error ? err.message : undefined,
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Publish
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>

      <WorkspacePanel
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create agent flow"
        subtitle="Flows"
        description="Starter Start → Say → Ask → End graph. Publish before attaching to an agent."
      >
        <div className="space-y-3 p-5">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support intake"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Button
            loading={create.isPending}
            disabled={!name.trim()}
            onClick={async () => {
              try {
                await create.mutateAsync({
                  name: name.trim(),
                  description: description || undefined,
                });
                setOpen(false);
                setName("");
                setDescription("");
                toast({ title: "Flow created", variant: "success" });
              } catch (err) {
                toast({
                  title: "Create failed",
                  description: err instanceof Error ? err.message : undefined,
                  variant: "destructive",
                });
              }
            }}
          >
            Create
          </Button>
        </div>
      </WorkspacePanel>
    </Workspace>
  );
}
