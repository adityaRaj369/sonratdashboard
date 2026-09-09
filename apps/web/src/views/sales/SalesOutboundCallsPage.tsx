"use client";

/**
 * Sales outbound call history — Calls API filtered to OUTBOUND.
 */
import { useState } from "react";
import { Megaphone } from "lucide-react";
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
import { useCalls } from "@/hooks/use-calls";
import { formatDate, formatDuration } from "@/lib/utils";

export default function SalesOutboundCallsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const calls = useCalls({
    search: search || undefined,
    status: status || undefined,
    direction: "OUTBOUND",
    limit: 50,
  });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Outbound sales calls"
        description="Bulk and campaign sales calls — transcripts, status, and outcomes"
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search outbound calls…"
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
          <option value="BUSY">Busy</option>
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
            icon={<Megaphone className="h-8 w-8" />}
            title="No outbound sales calls yet"
            description="Create a sale and start dialing to see calls here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Contact</TH>
                <TH>Agent</TH>
                <TH>Status</TH>
                <TH>Duration</TH>
                <TH>Started</TH>
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
                      {call.contact?.name || call.toNumber || "Unknown"}
                    </Link>
                  </TD>
                  <TD>{call.agent?.name || "—"}</TD>
                  <TD>
                    <Badge variant="outline">{call.status}</Badge>
                  </TD>
                  <TD>{formatDuration(call.durationSeconds)}</TD>
                  <TD>{formatDate(call.startedAt || call.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
