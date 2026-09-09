"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceLink as Link, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  useToast,
} from "@/components/ui";
import {
  useCommitContactImport,
  useContactImport,
  usePreviewContactImport,
  useUploadContactImport,
} from "./hooks";
import { cn } from "@/lib/utils";

const TARGET_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "tags",
  "leadStatus",
  "notes",
  "source",
  "timezone",
];

export default function ContactImportPage() {
  const [step, setStep] = useState(0);
  const [importId, setImportId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const upload = useUploadContactImport();
  const importQuery = useContactImport(importId || undefined);
  const preview = usePreviewContactImport(importId || "");
  const commit = useCommitContactImport(importId || "");
  const router = useWorkspaceNavigate();
  const { toast } = useToast();

  const headers = importQuery.data?.preview?.headers || [];
  const previewRows = importQuery.data?.preview?.rows || [];
  const status = importQuery.data?.status;
  const parsing =
    Boolean(importId) &&
    (status === "UPLOADED" || status === "VALIDATING" || !headers.length);

  useEffect(() => {
    if (!importQuery.data) return;
    const suggested =
      importQuery.data.preview?.suggestedMapping ||
      importQuery.data.columnMapping ||
      {};
    if (Object.keys(suggested).length && Object.keys(mapping).length === 0) {
      setMapping(suggested);
    }
  }, [importQuery.data, mapping]);

  const mappingReady = useMemo(() => {
    return Boolean(mapping.name && mapping.phone && headers.length);
  }, [mapping, headers.length]);

  return (
    <Workspace>
      <WorkspaceHeader
        title="Import contacts"
        description="Upload CSV or Excel, map columns, preview, then commit"
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Import" },
        ]}
      />
      <WorkspaceContent>
        <div className="mb-4 flex gap-2">
          {["Upload", "Map columns", "Preview", "Commit"].map((label, idx) => (
            <span
              key={label}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                idx === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {idx + 1}. {label}
            </span>
          ))}
        </div>

        <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-border bg-card p-4">
          {step === 0 && (
            <div className="space-y-3">
              <Field label="Spreadsheet file (.csv, .xlsx)">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await upload.mutateAsync(file);
                      setImportId(result.id);
                      setMapping(
                        result.preview?.suggestedMapping ||
                          result.columnMapping ||
                          {},
                      );
                      setStep(1);
                      toast({ title: "File uploaded", variant: "success" });
                    } catch (err) {
                      toast({
                        title: "Upload failed",
                        description:
                          err instanceof Error ? err.message : undefined,
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </Field>
              {upload.isPending ? (
                <p className="text-sm text-muted-foreground">Uploading…</p>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {parsing ? (
                <p className="text-sm text-muted-foreground">
                  Parsing spreadsheet… status {status || "queued"}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Map spreadsheet columns to contact fields. Name and phone are
                  required.
                </p>
              )}
              {TARGET_FIELDS.map((field) => (
                <Field key={field} label={field}>
                  <Select
                    value={mapping[field] || ""}
                    disabled={parsing}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field]: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  disabled={!mappingReady || !importId || parsing}
                  loading={preview.isPending}
                  onClick={async () => {
                    try {
                      await preview.mutateAsync(mapping);
                      setStep(2);
                    } catch (err) {
                      toast({
                        title: "Preview failed",
                        description:
                          err instanceof Error ? err.message : undefined,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Preview
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Total: {importQuery.data?.totalRows ?? 0}
                </Badge>
                <Badge variant="success">
                  Valid: {importQuery.data?.validRows ?? 0}
                </Badge>
                <Badge variant="destructive">
                  Invalid: {importQuery.data?.invalidRows ?? 0}
                </Badge>
                <Badge variant="outline">
                  Status: {importQuery.data?.status || "—"}
                </Badge>
              </div>
              {status === "VALIDATING" ? (
                <p className="text-sm text-muted-foreground">
                  Re-validating with your column mapping…
                </p>
              ) : null}
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-xs">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx} className="border-t border-border">
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-2 py-1.5">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  disabled={status !== "PREVIEW_READY"}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm">
                Commit will create contacts for all valid rows. Invalid rows are
                retained in the import report.
              </p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  loading={commit.isPending}
                  disabled={status !== "PREVIEW_READY"}
                  onClick={async () => {
                    try {
                      await commit.mutateAsync();
                      toast({ title: "Import committed", variant: "success" });
                      router.push("/contacts");
                    } catch (err) {
                      toast({
                        title: "Commit failed",
                        description:
                          err instanceof Error ? err.message : undefined,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Commit import
                </Button>
              </div>
            </div>
          )}
        </div>
      </WorkspaceContent>
    </Workspace>
  );
}
