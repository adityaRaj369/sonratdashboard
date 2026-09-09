"use client";

import { WorkspaceLink as Link, useWorkspaceParams } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import { ErrorState, Skeleton } from "@/components/ui";
import { useCampaign } from "./hooks";
import { useCampaignAnalytics } from "@/hooks/use-analytics";
import { formatDuration } from "@/lib/utils";

export default function CampaignResultsPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const campaign = useCampaign(id);
  const analytics = useCampaignAnalytics(id);

  return (
    <Workspace>
      <WorkspaceHeader
        title={campaign.data?.name || "Campaign results"}
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.data?.name || "Campaign", href: `/campaigns/${id}` },
          { label: "Results" },
        ]}
      />
      <WorkspaceToolbar>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}`}>
          Overview
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/contacts`}>
          Contacts
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/calls`}>
          Calls
        </Link>
        <Link className="text-sm font-medium text-primary" href={`/campaigns/${id}/results`}>
          Results
        </Link>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {analytics.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : analytics.isError ? (
          <ErrorState
            description={analytics.error.message}
            onRetry={() => analytics.refetch()}
          />
        ) : analytics.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Attempted", analytics.data.callsAttempted],
              ["Connected", analytics.data.callsConnected],
              ["Completed", analytics.data.callsCompleted],
              ["No answer", analytics.data.noAnswer],
              ["Busy", analytics.data.busy],
              ["Failed", analytics.data.failed],
              ["Interested", analytics.data.interested],
              ["Not interested", analytics.data.notInterested],
              ["Callbacks", analytics.data.callbacks],
              ["Conversions", analytics.data.conversions],
              ["Leads", analytics.data.leads],
              ["Avg duration", formatDuration(analytics.data.averageDurationSeconds)],
              ["Transfer rate", `${Math.round(analytics.data.transferRate * 100)}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No results yet.</p>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
