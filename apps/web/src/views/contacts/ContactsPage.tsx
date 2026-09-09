"use client";

import { useState } from "react";
import { WorkspaceLink as Link, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { Plus, Upload, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema } from "@sonrat/shared";
import type { z } from "zod";
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
  Field,
  Input,
  Select,
  Table,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  useToast,
} from "@/components/ui";
import WorkspacePanel from "@/components/common/workspacepanel/WorkspacePanel";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from "./hooks";
import { formatDate } from "@/lib/utils";

type FormValues = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [callability, setCallability] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const contacts = useContacts({
    search: search || undefined,
    callability: callability || undefined,
    limit: 50,
  });
  const create = useCreateContact();
  const update = useUpdateContact();
  const remove = useDeleteContact();
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
      tags: [],
      customFields: {},
      callability: "callable",
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      name: "",
      phone: "",
      email: "",
      company: "",
      tags: [],
      customFields: {},
      callability: "callable",
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, body: values });
        toast({ title: "Contact updated", variant: "success" });
      } else {
        await create.mutateAsync(values);
        toast({ title: "Contact created", variant: "success" });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  });

  return (
    <Workspace>
      <WorkspaceHeader
        title="Contacts"
        description="Manage customers and import spreadsheets"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/contacts/import")}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add contact
            </Button>
          </div>
        }
      />
      <WorkspaceToolbar>
        <Input
          className="max-w-sm"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-44"
          value={callability}
          onChange={(e) => setCallability(e.target.value)}
        >
          <option value="">All callability</option>
          <option value="callable">Callable</option>
          <option value="do_not_call">Do not call</option>
          <option value="blocked">Blocked</option>
          <option value="invalid">Invalid</option>
          <option value="consent_required">Consent required</option>
        </Select>
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
            icon={<Users className="h-8 w-8" />}
            title="Add contacts or import a spreadsheet"
            description="Build your calling audience manually or upload CSV/Excel."
            actionLabel="Add contact"
            onAction={openCreate}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Company</TH>
                <TH>Status</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {contacts.data.items.map((contact) => (
                <TR key={contact.id}>
                  <TD>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.email || "—"}
                    </p>
                  </TD>
                  <TD>{contact.normalizedPhone || contact.rawPhone}</TD>
                  <TD>{contact.company || "—"}</TD>
                  <TD>
                    <Badge variant="outline">{contact.callability}</Badge>
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(contact.updatedAt)}
                  </TD>
                  <TD className="space-x-2 text-right">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => {
                        setEditingId(contact.id);
                        form.reset({
                          name: contact.name,
                          phone: contact.rawPhone,
                          email: contact.email || "",
                          company: contact.company || "",
                          tags: contact.tags || [],
                          customFields: contact.customFields || {},
                          leadStatus: contact.leadStatus,
                          notes: contact.notes,
                          source: contact.source,
                          timezone: contact.timezone,
                          callability: contact.callability as FormValues["callability"],
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm text-destructive hover:underline"
                      onClick={async () => {
                        try {
                          await remove.mutateAsync(contact.id);
                          toast({ title: "Contact archived", variant: "success" });
                        } catch (err) {
                          toast({
                            title: "Delete failed",
                            description:
                              err instanceof Error ? err.message : undefined,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Need bulk upload?{" "}
          <Link href="/contacts/import" className="text-primary hover:underline">
            Open import wizard
          </Link>
        </p>
      </WorkspaceContent>

      <WorkspacePanel
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Contact" : "Add Contact"}
        subtitle="Contacts"
        widthClass="w-[80vw] max-w-[720px] min-w-[360px]"
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="mx-auto max-w-xl space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </Field>
              <Field label="Phone" error={form.formState.errors.phone?.message}>
                <Input {...form.register("phone")} />
              </Field>
              <Field label="Email">
                <Input {...form.register("email")} />
              </Field>
              <Field label="Company">
                <Input {...form.register("company")} />
              </Field>
              <Field label="Callability">
                <Select {...form.register("callability")}>
                  <option value="callable">Callable</option>
                  <option value="do_not_call">Do not call</option>
                  <option value="blocked">Blocked</option>
                  <option value="invalid">Invalid</option>
                  <option value="consent_required">Consent required</option>
                </Select>
              </Field>
              <Field label="Source">
                <Input {...form.register("source")} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea {...form.register("notes")} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                loading={create.isPending || update.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </WorkspacePanel>
    </Workspace>
  );
}
