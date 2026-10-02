"use client";

import { useState } from "react";
import { WorkspaceLink as Link, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Plus, Bot } from "lucide-react";
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
  Input,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useAgents } from "./hooks";
import { formatDate } from "@/lib/utils";

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const navigate = useWorkspaceNavigate();
  const agents = useAgents({ search: search || undefined, limit: 50 });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Agents"
        description="Train AI agents with company knowledge for sales, support, and WhatsApp"
        actions={
          <Button onClick={() => navigate.push("/agents/new")}>
            <Plus className="h-4 w-4" />
            New agent
          </Button>
        }
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </WorkspaceToolbar>
      <WorkspaceContent>
        {agents.isLoading ? (
          <TableSkeleton />
        ) : agents.isError ? (
          <ErrorState
            description={agents.error.message}
            onRetry={() => agents.refetch()}
          />
        ) : !agents.data?.items.length ? (
          <EmptyState
            icon={<Bot className="h-8 w-8" />}
            title="Create your first AI agent"
            description="Configure personality, voice, languages, and sales behavior."
            actionLabel="New agent"
            onAction={() => navigate.push("/agents/new")}
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
              {agents.data.items.map((agent) => (
                <TR key={agent.id}>
                  <TD>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.description || "No description"}
                      </p>
                    </div>
                  </TD>
                  <TD>
                    <Badge
                      variant={
                        agent.status === "PUBLISHED"
                          ? "success"
                          : agent.status === "ARCHIVED"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {agent.status}
                    </Badge>
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(agent.updatedAt)}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/agents/${agent.id}/general`}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-medium shadow-sm hover:bg-muted"
                    >
                      Configure
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
