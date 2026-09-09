"use client";

import { WorkspaceLink as Link, useWorkspaceParams, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
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
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  useAgent,
  useAgentVersions,
  usePublishAgent,
  useTestAgent,
  useValidateAgent,
} from "./hooks";
import { AGENT_SECTIONS, getSectionData } from "@/modules/agents/sections";
import {
  CallBehaviorSection,
  CompanySection,
  GeneralSection,
  KnowledgeSection,
  LanguagesSection,
  PersonalitySection,
  ProductsSection,
  SafetySection,
  SalesSection,
  SupportSection,
  ToolsSection,
  VoiceSection,
} from "@/modules/agents/section-forms";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

function TestAgentPanel({ agentId }: { agentId: string }) {
  const test = useTestAgent(agentId);
  const [message, setMessage] = useState("Hi, tell me about your product.");
  const [language, setLanguage] = useState("en");
  const [reply, setReply] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <div className="space-y-3">
      <Field label="Language">
        <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </Select>
      </Field>
      <Field label="Customer message">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Button
        loading={test.isPending}
        onClick={async () => {
          try {
            const result = await test.mutateAsync({ message, language });
            setReply(result.reply);
            setMeta(
              [
                result.language ? `Language: ${result.language}` : null,
                result.preview?.voiceId
                  ? `Voice: ${result.preview.voiceId}`
                  : null,
                result.tools?.length
                  ? `Tools: ${result.tools.map((t) => t.name).join(", ")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || null,
            );
          } catch (err) {
            toast({
              title: "Test failed",
              description: err instanceof Error ? err.message : undefined,
              variant: "destructive",
            });
          }
        }}
      >
        Run test
      </Button>
      {reply ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Agent reply
          </p>
          <p>{reply}</p>
          {meta ? (
            <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AgentSectionPage() {
  const params = useWorkspaceParams<{ id: string; section?: string }>();
  const id = params.id;
  const section = params.section || "general";
  const router = useWorkspaceNavigate();
  const agent = useAgent(id);
  const versions = useAgentVersions(id);
  const validate = useValidateAgent(id);
  const publish = usePublishAgent(id);
  const { toast } = useToast();

  if (agent.isLoading) {
    return (
      <Workspace>
        <WorkspaceHeader title="Agent" />
        <WorkspaceContent>
          <Skeleton className="h-64 w-full" />
        </WorkspaceContent>
      </Workspace>
    );
  }

  if (agent.isError || !agent.data) {
    return (
      <Workspace>
        <WorkspaceHeader title="Agent" />
        <WorkspaceContent>
          <ErrorState
            description={agent.error?.message || "Agent not found"}
            onRetry={() => agent.refetch()}
          />
        </WorkspaceContent>
      </Workspace>
    );
  }

  const draft = agent.data.draftConfig || {};
  const sectionData = getSectionData(draft, section === "test" ? "general" : section);

  return (
    <Workspace>
      <WorkspaceHeader
        title={agent.data.name}
        description={agent.data.description || "Agent configuration"}
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: agent.data.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                agent.data.status === "PUBLISHED"
                  ? "success"
                  : agent.data.status === "ARCHIVED"
                    ? "warning"
                    : "outline"
              }
            >
              {agent.data.status}
            </Badge>
            <Button
              variant="outline"
              loading={validate.isPending}
              onClick={async () => {
                try {
                  const report = await validate.mutateAsync();
                  toast({
                    title: report.valid ? "Validation passed" : "Validation failed",
                    description: report.valid
                      ? "Ready to publish"
                      : report.errors.map((e) => e.message).join("; "),
                    variant: report.valid ? "success" : "destructive",
                  });
                } catch (err) {
                  toast({
                    title: "Validation error",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Validate
            </Button>
            <Button
              loading={publish.isPending}
              onClick={async () => {
                try {
                  await publish.mutateAsync();
                  toast({ title: "Agent published", variant: "success" });
                } catch (err) {
                  toast({
                    title: "Publish failed",
                    description: err instanceof Error ? err.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Publish
            </Button>
          </div>
        }
      />
      <WorkspaceToolbar>
        <div className="flex w-full gap-4 overflow-x-auto">
          <nav className="flex min-w-0 flex-1 gap-1">
            {AGENT_SECTIONS.map((item) => (
              <Link
                key={item.id}
                href={`/agents/${id}/${item.id}`}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium",
                  section === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </WorkspaceToolbar>
      <WorkspaceContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-border bg-card p-4">
            {section === "general" && (
              <GeneralSection agentId={id} initialData={sectionData} />
            )}
            {section === "company" && (
              <CompanySection agentId={id} initialData={sectionData} />
            )}
            {section === "products" && (
              <ProductsSection agentId={id} initialData={sectionData} />
            )}
            {section === "knowledge" && (
              <KnowledgeSection agentId={id} initialData={sectionData} />
            )}
            {section === "personality" && (
              <PersonalitySection agentId={id} initialData={sectionData} />
            )}
            {section === "voice" && (
              <VoiceSection agentId={id} initialData={sectionData} />
            )}
            {section === "languages" && (
              <LanguagesSection agentId={id} initialData={sectionData} />
            )}
            {section === "sales" && (
              <SalesSection agentId={id} initialData={sectionData} />
            )}
            {section === "support" && (
              <SupportSection agentId={id} initialData={sectionData} />
            )}
            {section === "safety" && (
              <SafetySection agentId={id} initialData={sectionData} />
            )}
            {section === "callBehavior" && (
              <CallBehaviorSection agentId={id} initialData={sectionData} />
            )}
            {section === "tools" && (
              <ToolsSection agentId={id} initialData={sectionData} />
            )}
            {section === "test" && <TestAgentPanel agentId={id} />}
            {!AGENT_SECTIONS.some((s) => s.id === section) && (
              <p className="text-sm text-muted-foreground">Unknown section.</p>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Version history</h3>
              {versions.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : versions.data?.length ? (
                <ul className="space-y-2">
                  {versions.data.map((version) => (
                    <li
                      key={version.id}
                      className="rounded-md border border-border px-2 py-1.5 text-xs"
                    >
                      <p className="font-medium">v{version.versionNumber}</p>
                      <p className="text-muted-foreground">
                        {formatDate(version.publishedAt || version.createdAt)}
                      </p>
                      <Badge className="mt-1" variant="outline">
                        {version.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No published versions yet.
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push("/agents")}>
              Back to agents
            </Button>
          </aside>
        </div>
      </WorkspaceContent>
    </Workspace>
  );
}
