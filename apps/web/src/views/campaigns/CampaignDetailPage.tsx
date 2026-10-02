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
  Button,
  ErrorState,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useCampaign,
  useCampaignActions,
  useCampaignPreflight,
} from "./hooks";
import { useCampaignAnalytics } from "@/hooks/use-analytics";
import { formatDate } from "@/lib/utils";

export default function CampaignDetailPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const campaign = useCampaign(id);
  const actions = useCampaignActions(id);
  const preflight = useCampaignPreflight(id);
  const analytics = useCampaignAnalytics(id);
  const { toast } = useToast();

  if (campaign.isLoading) {
    return (
      <Workspace>
        <WorkspaceHeader title="Campaign" />
        <WorkspaceContent>
          <Skeleton className="h-48 w-full" />
        </WorkspaceContent>
      </Workspace>
    );
  }

  if (campaign.isError || !campaign.data) {
    return (
      <Workspace>
        <WorkspaceHeader title="Campaign" />
        <WorkspaceContent>
          <ErrorState
            description={campaign.error?.message || "Not found"}
            onRetry={() => campaign.refetch()}
          />
        </WorkspaceContent>
      </Workspace>
    );
  }

  const data = campaign.data;

  const run = async (
    action: "start" | "pause" | "cancel",
    label: string,
  ) => {
    try {
      await actions[action].mutateAsync();
      toast({ title: label, variant: "success" });
    } catch (err) {
      toast({
        title: `Could not ${action}`,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Workspace>
      <WorkspaceHeader
        title={data.name}
        description={data.description || data.objective}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: data.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                data.status === "RUNNING"
                  ? "success"
                  : data.status === "FAILED"
                    ? "destructive"
                    : "outline"
              }
            >
              {data.status}
            </Badge>
            <Button
              loading={actions.start.isPending}
              onClick={() =>
                run(
                  "start",
                  data.status === "PAUSED"
                    ? "Sale resumed"
                    : data.status === "COMPLETED"
                      ? "Sale restarted"
                      : "Sale started",
                )
              }
              disabled={data.status === "RUNNING" || data.status === "CANCELLED" || preflight.data?.ready === false}
            >
              {data.status === "PAUSED"
                ? "Resume"
                : data.status === "COMPLETED"
                  ? "Restart"
                  : "Start"}
            </Button>
            <Button
              variant="outline"
              loading={actions.pause.isPending}
              onClick={() => run("pause", "Sale paused")}
              disabled={data.status !== "RUNNING"}
            >
              Pause
            </Button>
            <Button
              variant="destructive"
              loading={actions.cancel.isPending}
              onClick={() => run("cancel", "Sale cancelled")}
              disabled={["COMPLETED", "CANCELLED"].includes(data.status)}
            >
              Cancel
            </Button>
          </div>
        }
      />
      <WorkspaceToolbar>
        <Link className="text-sm font-medium text-primary" href={`/campaigns/${id}`}>
          Overview
        </Link>
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href={`/campaigns/${id}/contacts`}
        >
          Contacts
        </Link>
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href={`/campaigns/${id}/calls`}
        >
          Calls
        </Link>
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href={`/campaigns/${id}/results`}
        >
          Results
        </Link>
      </WorkspaceToolbar>
      <WorkspaceContent className="space-y-4">
        {data.status !== "RUNNING" && preflight.data && !preflight.data.ready ? (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20">
            <p className="font-semibold">Campaign needs attention before it can start</p>
            <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
              {preflight.data.checks.map((check) => (
                <p key={check.id}>
                  <span className={check.ready ? "text-emerald-600" : "text-amber-700"}>
                    {check.ready ? "Ready" : "Required"}
                  </span>{" "}{check.label}: {check.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Agent", data.agent?.name || "—"],
            ["Phone", data.phoneNumber?.phoneNumber || "Default"],
            ["Window", `${data.callingHoursStart}–${data.callingHoursEnd}`],
            ["Updated", formatDate(data.updatedAt)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Objective</h3>
          <p className="text-sm text-muted-foreground">{data.objective}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Live metrics</h3>
          {analytics.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : analytics.data ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Contacts", analytics.data.totalContacts],
                ["Attempted", analytics.data.callsAttempted],
                ["Connected", analytics.data.callsConnected],
                ["Completed", analytics.data.callsCompleted],
                ["Leads", analytics.data.leads],
                ["Conversions", analytics.data.conversions],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-display text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No metrics yet.</p>
          )}
        </div>
      </WorkspaceContent>
    </Workspace>
  );
}
