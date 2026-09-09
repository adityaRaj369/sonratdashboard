"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import {
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import {
  useAgentAnalytics,
  useAnalyticsOverview,
  useCampaignAnalytics,
} from "./hooks";
import { useAgents } from "@/hooks/use-agents";
import { useCampaigns } from "@/hooks/use-campaigns";
import { formatDuration } from "@/lib/utils";

export default function AnalyticsPage() {
  const overview = useAnalyticsOverview();
  const agents = useAgents({ limit: 100 });
  const campaigns = useCampaigns({ limit: 100 });
  const [agentId, setAgentId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const agentAnalytics = useAgentAnalytics(agentId);
  const campaignAnalytics = useCampaignAnalytics(campaignId);

  const volume = useMemo(
    () => overview.data?.callVolumeByDay || [],
    [overview.data],
  );
  const outcomes = useMemo(
    () => overview.data?.outcomes || [],
    [overview.data],
  );

  return (
    <Workspace>
      <WorkspaceHeader
        title="Analytics"
        description="Organization, campaign, and agent performance foundations"
      />
      <WorkspaceToolbar>
        <Select
          className="max-w-xs"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">Campaign metrics…</option>
          {campaigns.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-xs"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
        >
          <option value="">Agent metrics…</option>
          {agents.data?.items.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </WorkspaceToolbar>
      <WorkspaceContent className="space-y-6">
        {overview.isError ? (
          <ErrorState
            description={overview.error.message}
            onRetry={() => overview.refetch()}
          />
        ) : !overview.isLoading &&
          !(overview.data?.totalCalls || overview.data?.callVolumeByDay?.length) ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-medium">No analytics yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Metrics appear after calls start flowing through campaigns.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total calls", overview.data?.totalCalls ?? 0],
                ["Connected", overview.data?.connectedCalls ?? 0],
                ["Leads", overview.data?.leads ?? 0],
                [
                  "Avg duration",
                  formatDuration(overview.data?.averageDurationSeconds),
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {overview.isLoading ? (
                    <Skeleton className="mt-2 h-8 w-16" />
                  ) : (
                    <p className="mt-1 font-display text-2xl font-semibold">
                      {value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Call volume</h3>
                <div className="h-64">
                  {overview.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={volume}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#1e406e"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Outcomes</h3>
                <div className="h-64">
                  {overview.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="outcome" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2a7a9b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {campaignId && campaignAnalytics.data ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Selected campaign</h3>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Attempted", campaignAnalytics.data.callsAttempted],
                ["Connected", campaignAnalytics.data.callsConnected],
                ["Completed", campaignAnalytics.data.callsCompleted],
                ["Leads", campaignAnalytics.data.leads],
                ["Conversions", campaignAnalytics.data.conversions],
                ["Callbacks", campaignAnalytics.data.callbacks],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-display text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {agentId && agentAnalytics.data ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Selected agent</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Calls</p>
                <p className="font-display text-xl font-semibold">
                  {agentAnalytics.data.calls}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Success rate</p>
                <p className="font-display text-xl font-semibold">
                  {Math.round(agentAnalytics.data.successRate * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Escalation rate</p>
                <p className="font-display text-xl font-semibold">
                  {Math.round(agentAnalytics.data.escalationRate * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg duration</p>
                <p className="font-display text-xl font-semibold">
                  {formatDuration(agentAnalytics.data.averageDurationSeconds)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </WorkspaceContent>
    </Workspace>
  );
}
