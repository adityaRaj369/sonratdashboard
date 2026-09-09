"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useCalls } from "./hooks";
import { formatDate, formatDuration } from "@/lib/utils";

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const calls = useCalls({
    search: search || undefined,
    status: status || undefined,
    limit: 50,
  });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Calls"
        description="Inspect call history, outcomes, and transcripts"
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search calls…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="RINGING">Ringing</option>
          <option value="AI_ACTIVE">AI active</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="NO_ANSWER">No answer</option>
        </Select>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {calls.isLoading ? (
          <TableSkeleton />
        ) : calls.isError ? (
          <ErrorState
            description={calls.error.message}
            onRetry={() => calls.refetch()}
          />
        ) : !calls.data?.items.length ? (
          <EmptyState
            icon={<PhoneCall className="h-8 w-8" />}
            title="No calls yet"
            description="Calls appear here once campaigns start or inbound traffic arrives."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Contact</TH>
                <TH>Direction</TH>
                <TH>Status</TH>
                <TH>Outcome</TH>
                <TH>Duration</TH>
                <TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {calls.data.items.map((call) => (
                <TR key={call.id}>
                  <TD>
                    <Link
                      href={`/calls/${call.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {call.contact?.name ||
                        call.toNumber ||
                        call.fromNumber ||
                        call.id.slice(0, 8)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {call.agent?.name || "—"}
                    </p>
                  </TD>
                  <TD>{call.direction}</TD>
                  <TD>
                    <Badge variant="outline">{call.status}</Badge>
                  </TD>
                  <TD>{call.outcome || "—"}</TD>
                  <TD>{formatDuration(call.durationSeconds)}</TD>
                  <TD className="text-muted-foreground">
                    {formatDate(call.startedAt || call.createdAt)}
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
