"use client";

import CampaignCreateInlineEditor from "@/views/campaigns/components/CampaignCreateInlineEditor";
import { useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";

/** Full-page create route (also available via WorkspacePanel from Campaigns). */
export default function CampaignCreatePage() {
  const router = useWorkspaceNavigate();
  return (
    <Workspace>
      <WorkspaceHeader
        title="Create campaign"
        description="Configure outbound calling in seven steps"
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: "New" },
        ]}
      />
      <WorkspaceContent>
        <CampaignCreateInlineEditor onClose={() => router.push("/campaigns")} />
      </WorkspaceContent>
    </Workspace>
  );
}
