"use client";

import { Bot, Megaphone, PhoneCall, Users } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from "@/components/ui";
import {
  useAnalyticsOverview,
  useAgents,
  useCampaigns,
  useCalls,
} from "./hooks";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const overview = useAnalyticsOverview();
  const agents = useAgents({ limit: 5 });
  const campaigns = useCampaigns({ limit: 5 });
  const calls = useCalls({ limit: 8 });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Dashboard"
        description="Overview of agents, campaigns, and call activity"
      />
      <WorkspaceContent className="space-y-6">
        {overview.isError ? (
          <ErrorState
            description={overview.error.message}
            onRetry={() => overview.refetch()}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total calls",
                value: overview.data?.totalCalls,
                icon: PhoneCall,
              },
              {
                label: "Connected",
                value: overview.data?.connectedCalls,
                icon: PhoneCall,
              },
              {
                label: "Leads",
                value: overview.data?.leads,
                icon: Users,
              },
              {
                label: "Conversions",
                value: overview.data?.conversions,
                icon: Megaphone,
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    {stat.label}
                    <stat.icon className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="font-display text-2xl font-semibold">
                      {stat.value ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent agents
                <Link href="/agents" className="text-sm font-normal text-primary">
                  View all
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agents.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : agents.data?.items.length ? (
                agents.data.items.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}/general`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <Badge variant={agent.status === "PUBLISHED" ? "success" : "outline"}>
                      {agent.status}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No agents yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active campaigns
                <Link href="/campaigns" className="text-sm font-normal text-primary">
                  View all
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : campaigns.data?.items.length ? (
                campaigns.data.items.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium">{campaign.name}</span>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent calls
              <Link href="/calls" className="text-sm font-normal text-primary">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calls.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : calls.data?.items.length ? (
              calls.data.items.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {call.contact?.name || call.toNumber || call.fromNumber || "Call"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(call.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{call.status}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No calls yet.</p>
            )}
          </CardContent>
        </Card>
      </WorkspaceContent>
    </Workspace>
  );
}
