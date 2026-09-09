"use client";

import { WorkspaceLink as Link, useWorkspaceParams } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import {
  Badge,
  ErrorState,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useCampaign, useCampaignCalls } from "./hooks";
import { formatDate, formatDuration } from "@/lib/utils";

export default function CampaignCallsPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const campaign = useCampaign(id);
  const calls = useCampaignCalls(id, { limit: 50 });

  return (
    <Workspace>
      <WorkspaceHeader
        title={campaign.data?.name || "Campaign calls"}
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.data?.name || "Campaign", href: `/campaigns/${id}` },
          { label: "Calls" },
        ]}
      />
      <WorkspaceToolbar>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}`}>
          Overview
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/contacts`}>
          Contacts
        </Link>
        <Link className="text-sm font-medium text-primary" href={`/campaigns/${id}/calls`}>
          Calls
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/results`}>
          Results
        </Link>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {calls.isLoading ? (
          <TableSkeleton />
        ) : calls.isError ? (
          <ErrorState description={calls.error.message} onRetry={() => calls.refetch()} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Contact</TH>
                <TH>Status</TH>
                <TH>Outcome</TH>
                <TH>Duration</TH>
                <TH>Started</TH>
              </TR>
            </THead>
            <TBody>
              {calls.data?.items.map((call) => (
                <TR key={call.id}>
                  <TD>
                    <Link
                      href={`/calls/${call.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {call.contact?.name || call.toNumber || call.id.slice(0, 8)}
                    </Link>
                  </TD>
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
