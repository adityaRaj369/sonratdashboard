"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceNavigate, useWorkspacePath } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import {
  Button,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  useAgentFlow,
  usePublishAgentFlow,
  useUpdateAgentFlowGraph,
} from "@/hooks/use-agent-flows";

const NODE_TYPES = [
  "START",
  "SAY",
  "ASK",
  "COLLECT",
  "IF",
  "SET_VARIABLE",
  "HTTP_REQUEST",
  "TRANSFER",
  "END",
] as const;

export default function AgentFlowDetailPage() {
  const path = useWorkspacePath();
  const id = path.split("/")[2] || "";
  const flow = useAgentFlow(id);
  const updateGraph = useUpdateAgentFlowGraph();
  const publish = usePublishAgentFlow();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const [jsonText, setJsonText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");

  useEffect(() => {
    if (!flow.data?.draftGraph) return;
    setJsonText(JSON.stringify(flow.data.draftGraph, null, 2));
    setDirty(false);
    const first = flow.data.draftGraph.nodes?.[0]?.id;
    if (first) setSelectedNodeId(first);
  }, [flow.data]);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(jsonText) as {
        nodes: Array<{
          id: string;
          type: string;
          label?: string;
          data?: Record<string, unknown>;
        }>;
        edges: Array<{ id: string; source: string; target: string; label?: string }>;
      };
    } catch {
      return null;
    }
  }, [jsonText]);

  const selected = parsed?.nodes.find((n) => n.id === selectedNodeId);

  return (
    <Workspace>
      <WorkspaceHeader
        title={flow.data?.name || "Flow"}
        description="Edit nodes as JSON (MVP). Publish to attach on an agent."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/flows")}>
              Back
            </Button>
            <Button
              loading={updateGraph.isPending}
              disabled={!dirty || !parsed}
              onClick={async () => {
                if (!parsed) return;
                try {
                  await updateGraph.mutateAsync({ id, graph: parsed });
                  setDirty(false);
                  toast({ title: "Graph saved", variant: "success" });
                } catch (err) {
                  toast({
                    title: "Save failed",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Save graph
            </Button>
            <Button
              loading={publish.isPending}
              onClick={async () => {
                try {
                  await publish.mutateAsync(id);
                  toast({ title: "Published", variant: "success" });
                } catch (err) {
                  toast({
                    title: "Publish failed",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Publish
            </Button>
          </div>
        }
      />
      <WorkspaceContent>
        {flow.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : flow.isError ? (
          <ErrorState
            description={flow.error.message}
            onRetry={() => flow.refetch()}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Field label="Node list">
                <Select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                >
                  {(parsed?.nodes || []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.type} — {n.label || n.id}
                    </option>
                  ))}
                </Select>
              </Field>
              {selected && (
                <>
                  <Field label="Type">
                    <Select
                      value={selected.type}
                      onChange={(e) => {
                        if (!parsed) return;
                        const nodes = parsed.nodes.map((n) =>
                          n.id === selected.id
                            ? { ...n, type: e.target.value }
                            : n,
                        );
                        setJsonText(JSON.stringify({ ...parsed, nodes }, null, 2));
                        setDirty(true);
                      }}
                    >
                      {NODE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Label">
                    <Input
                      value={selected.label || ""}
                      onChange={(e) => {
                        if (!parsed) return;
                        const nodes = parsed.nodes.map((n) =>
                          n.id === selected.id
                            ? { ...n, label: e.target.value }
                            : n,
                        );
                        setJsonText(JSON.stringify({ ...parsed, nodes }, null, 2));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field label="Node data (JSON)">
                    <Textarea
                      className="min-h-[120px] font-mono text-xs"
                      value={JSON.stringify(selected.data || {}, null, 2)}
                      onChange={(e) => {
                        if (!parsed) return;
                        try {
                          const data = JSON.parse(e.target.value);
                          const nodes = parsed.nodes.map((n) =>
                            n.id === selected.id ? { ...n, data } : n,
                          );
                          setJsonText(
                            JSON.stringify({ ...parsed, nodes }, null, 2),
                          );
                          setDirty(true);
                        } catch {
                          /* ignore while typing */
                        }
                      }}
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Field label="Full graph JSON">
                <Textarea
                  className="min-h-[420px] font-mono text-xs"
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              {!parsed && (
                <p className="mt-2 text-sm text-destructive">Invalid JSON</p>
              )}
            </div>
          </div>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
