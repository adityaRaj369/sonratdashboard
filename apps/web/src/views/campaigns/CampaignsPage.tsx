"use client";

import { useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace/WorkspaceNav";
import { Megaphone, Plus } from "lucide-react";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "@/components/shell";
import {
  Badge,
  Button,
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
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import CampaignCreateInlineEditor from "@/views/campaigns/components/CampaignCreateInlineEditor";
import { useCampaigns } from "./hooks";
import { formatDate } from "@/lib/utils";

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const campaigns = useCampaigns({
    search: search || undefined,
    status: status || undefined,
    limit: 50,
  });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Sales"
        description="Upload lead lists and run bulk outbound AI sales calls"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New sale
          </Button>
        }
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search sales..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="RUNNING">Running</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {campaigns.isLoading ? (
          <TableSkeleton />
        ) : campaigns.isError ? (
          <ErrorState
            description={campaigns.error.message}
            onRetry={() => campaigns.refetch()}
          />
        ) : !campaigns.data?.items.length ? (
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="Create your first sale"
            description="Select an agent, contacts, and calling rules to start outbound calling."
            actionLabel="New sale"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Agent</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {campaigns.data.items.map((campaign) => (
                <TR key={campaign.id}>
                  <TD>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.objective}
                    </p>
                  </TD>
                  <TD>
                    <Badge
                      variant={
                        campaign.status === "RUNNING"
                          ? "success"
                          : campaign.status === "FAILED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </TD>
                  <TD>{campaign.agent?.name || "—"}</TD>
                  <TD className="text-muted-foreground">
                    {formatDate(campaign.updatedAt)}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/sales/${campaign.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>

      <WorkspacePanel
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create sale"
        subtitle="Sales"
        description="Upload contacts and configure outbound AI calling"
        widthClass="w-[80vw] max-w-[1600px] min-w-[360px]"
      >
        <CampaignCreateInlineEditor onClose={() => setCreateOpen(false)} />
      </WorkspacePanel>
    </Workspace>
  );
}
