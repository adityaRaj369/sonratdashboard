"use client";

import { WorkspaceLink as Link, useWorkspaceParams } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import {
  Badge,
  ErrorState,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useCall, useCallTranscript, useCallRecording } from "./hooks";
import { formatDate, formatDuration, titleCase } from "@/lib/utils";

export default function CallDetailPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const call = useCall(id);
  const transcript = useCallTranscript(id);
  const recording = useCallRecording(id);

  if (call.isLoading) {
    return (
      <Workspace>
        <WorkspaceHeader title="Call" />
        <WorkspaceContent>
          <Skeleton className="h-64 w-full" />
        </WorkspaceContent>
      </Workspace>
    );
  }

  if (call.isError || !call.data) {
    return (
      <Workspace>
        <WorkspaceHeader title="Call" />
        <WorkspaceContent>
          <ErrorState
            description={call.error?.message || "Call not found"}
            onRetry={() => call.refetch()}
          />
        </WorkspaceContent>
      </Workspace>
    );
  }

  const data = call.data;
  const outcome =
    data.outcomeDetail || data.outcomeRecord || null;

  return (
    <Workspace>
      <WorkspaceHeader
        title={data.contact?.name || data.toNumber || "Call detail"}
        description={`${data.direction} · ${formatDate(data.startedAt || data.createdAt)}`}
        breadcrumbs={[
          { label: "Calls", href: "/calls" },
          { label: data.contact?.name || "Detail" },
        ]}
        actions={
          <div className="flex gap-2">
            <Badge variant="outline">{data.status}</Badge>
            {data.outcome ? <Badge variant="accent">{data.outcome}</Badge> : null}
          </div>
        }
      />
      <WorkspaceContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Agent", data.agent?.name || "—"],
            ["Campaign", data.campaign?.name || "—"],
            ["Duration", formatDuration(data.durationSeconds)],
            ["Language", data.language || outcome?.language || "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {data.summary || outcome?.summary ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Summary</h3>
            <p className="text-sm text-muted-foreground">
              {data.summary || outcome?.summary}
            </p>
          </div>
        ) : null}

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="outcome">Outcome</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline">
            <div className="space-y-2">
              {(data.events || []).length ? (
                data.events!.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {titleCase(event.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="transcript">
            {transcript.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : transcript.data?.turns?.length ? (
              <div className="space-y-2">
                {transcript.data.turns.map((turn, idx) => (
                  <div
                    key={turn.id || idx}
                    className="rounded-md border border-border bg-card px-3 py-2"
                  >
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {turn.speaker || turn.role || "unknown"}
                      {turn.language ? ` · ${turn.language}` : ""}
                    </p>
                    <p className="text-sm">{turn.text || turn.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Transcript not available yet.
              </p>
            )}
          </TabsContent>
          <TabsContent value="recording">
            {recording.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : recording.data?.streamPath ? (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  Duration:{" "}
                  {formatDuration(recording.data.durationSeconds ?? data.durationSeconds)}
                </p>
                <audio
                  controls
                  className="w-full"
                  src={recording.data.streamPath}
                  preload="metadata"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Recording not available yet. It appears after Exotel finishes the
                call and our worker stores the audio.
              </p>
            )}
          </TabsContent>
          <TabsContent value="outcome">
            {outcome || data.outcome ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Outcome", data.outcome || outcome?.outcome || "—"],
                  ["Intent", outcome?.intent || "—"],
                  ["Sentiment", outcome?.sentiment || "—"],
                  ["Lead status", outcome?.leadStatus || "—"],
                  ["Interest", outcome?.interestLevel || "—"],
                  ["Next action", outcome?.nextAction || "—"],
                  [
                    "Callback required",
                    outcome?.callbackRequired ? "Yes" : "No",
                  ],
                  [
                    "Human handoff",
                    outcome?.humanHandoff ? "Yes" : "No",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-border bg-card px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-medium">{value}</p>
                  </div>
                ))}
                {outcome?.objections?.length ? (
                  <div className="sm:col-span-2 rounded-md border border-border bg-card px-3 py-2">
                    <p className="text-xs text-muted-foreground">Objections</p>
                    <ul className="mt-1 list-disc pl-4 text-sm">
                      {outcome.objections.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No structured outcome recorded yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </WorkspaceContent>
    </Workspace>
  );
}
