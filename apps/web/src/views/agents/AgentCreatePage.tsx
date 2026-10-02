"use client";

import AgentCreateInlineEditor from "@/views/agents/components/AgentCreateInlineEditor";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";

/** Full-page create route (also accessible via top subpage button). */
export default function AgentCreatePage() {
  const router = useWorkspaceNavigate();
  return (
    <Workspace>
      <WorkspaceHeader
        title="Create agent"
        description="Configure agent identity, role, and purpose to start training"
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: "New" },
        ]}
      />
      <WorkspaceContent>
        <AgentCreateInlineEditor onClose={() => router.push("/agents")} />
      </WorkspaceContent>
    </Workspace>
  );
}
