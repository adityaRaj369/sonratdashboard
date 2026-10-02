import { useState } from "react";
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
  EmptyState,
  ErrorState,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { useCampaign, useCampaignContacts } from "./hooks";
import { parseCsvText } from "@/lib/csv";
import { contactsApi } from "@/services/api/contacts";
import { campaignsApi } from "@/services/api/campaigns";
import { Upload, Users } from "lucide-react";

export default function CampaignContactsPage() {
  const params = useWorkspaceParams<{ id: string }>();
  const id = params.id;
  const campaign = useCampaign(id);
  const contacts = useCampaignContacts(id, { limit: 50 });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      if (!parsed.length) {
        toast({
          title: "No valid contacts found in CSV",
          description: "Ensure the file contains Name and Phone headers.",
          variant: "destructive",
        });
        return;
      }
      const batchRes = await contactsApi.batchCreate(parsed);
      const contactIds = batchRes.items.map((c) => c.id);
      if (contactIds.length > 0) {
        await campaignsApi.addContacts(id, contactIds);
        await contacts.refetch();
        await campaign.refetch();
        toast({
          title: `Added ${contactIds.length} contacts`,
          description: `Imported and linked to campaign from ${file.name}`,
          variant: "success",
        });
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Workspace>
      <WorkspaceHeader
        title={campaign.data?.name || "Campaign contacts"}
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.data?.name || "Campaign", href: `/campaigns/${id}` },
          { label: "Contacts" },
        ]}
        actions={
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              className="sr-only"
              disabled={uploading}
              onChange={handleUploadCsv}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Importing…" : "Upload CSV"}
            </span>
          </label>
        }
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
        ) : !contacts.data?.items.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No contacts enrolled yet"
            description="Upload a CSV with names and phone numbers to add leads directly to this campaign."
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
              {contacts.data?.items.map((row: any) => {
                const contact = row.contact || row;
                return (
                  <TR key={row.id}>
                    <TD>{contact.name}</TD>
                    <TD>{contact.normalizedPhone || contact.rawPhone}</TD>
                    <TD>
                      <Badge variant="outline">{row.status || "—"}</Badge>
                    </TD>
                    <TD>{row.attemptCount ?? 0}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
