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
import { useCampaign, useCampaignContacts } from "./hooks";

export default function CampaignContactsPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const campaign = useCampaign(id);
  const contacts = useCampaignContacts(id, { limit: 50 });

  return (
    <Workspace>
      <WorkspaceHeader
        title={campaign.data?.name || "Campaign contacts"}
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.data?.name || "Campaign", href: `/campaigns/${id}` },
          { label: "Contacts" },
        ]}
      />
      <WorkspaceToolbar>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}`}>
          Overview
        </Link>
        <Link className="text-sm font-medium text-primary" href={`/campaigns/${id}/contacts`}>
          Contacts
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/calls`}>
          Calls
        </Link>
        <Link className="text-sm text-muted-foreground" href={`/campaigns/${id}/results`}>
          Results
        </Link>
      </WorkspaceToolbar>
      <WorkspaceContent>
        {contacts.isLoading ? (
          <TableSkeleton />
        ) : contacts.isError ? (
          <ErrorState
            description={contacts.error.message}
            onRetry={() => contacts.refetch()}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Status</TH>
                <TH>Attempts</TH>
              </TR>
            </THead>
            <TBody>
              {contacts.data?.items.map((contact) => (
                <TR key={contact.id}>
                  <TD>{contact.name}</TD>
                  <TD>{contact.normalizedPhone || contact.rawPhone}</TD>
                  <TD>
                    <Badge variant="outline">{contact.status || "—"}</Badge>
                  </TD>
                  <TD>{contact.attemptCount ?? 0}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
