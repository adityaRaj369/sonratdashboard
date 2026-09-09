"use client";

/**
 * Customer Support module — inbound call history.
 * Reuses Calls API filtered to INBOUND so the live agent path stays unchanged.
 */
import { useState } from "react";
import { Headset } from "lucide-react";
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
import { useCalls } from "@/views/calls/hooks";
import { formatDate, formatDuration } from "@/lib/utils";

export default function SupportCallsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const calls = useCalls({
    search: search || undefined,
    status: status || undefined,
    direction: "INBOUND",
    limit: 50,
  });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Customer Support"
        description="Inbound support calls handled by your trained support agent — full transcripts and outcomes"
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search support calls…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="AI_ACTIVE">AI active</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="HUMAN_HANDOFF">Human handoff</option>
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
            icon={<Headset className="h-8 w-8" />}
            title="No support calls yet"
            description="Bind a phone number to a published Support agent in Settings. Inbound callers will appear here with full conversation details."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Started</TH>
                <TH>Duration</TH>
                <TH>Outcome</TH>
              </TR>
            </THead>
            <TBody>
              {calls.data.items.map((call) => (
                <TR key={call.id}>
                  <TD>
                    <Link
                      href={`/support/${call.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {call.contact?.name || call.fromNumber || call.toNumber || "Caller"}
                    </Link>
                  </TD>
                  <TD>
                    <Badge>{call.status}</Badge>
                  </TD>
                  <TD>{formatDate(call.startedAt || call.createdAt)}</TD>
                  <TD>{formatDuration(call.durationSeconds)}</TD>
                  <TD>{call.outcome || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
