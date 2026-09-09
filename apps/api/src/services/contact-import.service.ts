import { randomUUID } from "node:crypto";
import { getConfig } from "@sonrat/config";
import { db } from "@sonrat/database";
import { NotFoundError, ValidationError } from "@sonrat/shared";
import { z } from "zod";
import { getStorage } from "../lib/storage.js";
import { enqueueJob, QUEUE_NAMES } from "../lib/queue.js";
import { suggestColumnMapping } from "../lib/spreadsheet.js";
import { AuditService } from "./audit.service.js";

const mappingSchema = z.record(z.string());

function toPreview(imp: {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columnMapping: unknown;
  summary: unknown;
  objectKey: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const summary = (imp.summary ?? {}) as Record<string, unknown>;
  const headers = Array.isArray(summary.headers)
    ? (summary.headers as string[])
    : [];
  const sampleRows = Array.isArray(summary.sampleRows)
    ? (summary.sampleRows as Array<Record<string, string>>)
    : [];
  const suggestedMapping =
    (summary.suggestedMapping as Record<string, string> | undefined) ||
    (headers.length ? suggestColumnMapping(headers) : {});

  return {
    id: imp.id,
    fileName: imp.fileName,
    status: imp.status,
    totalRows: imp.totalRows,
    validRows: imp.validRows,
    invalidRows: imp.invalidRows,
    columnMapping:
      (imp.columnMapping as Record<string, string>) || suggestedMapping,
    summary,
    objectKey: imp.objectKey,
    createdAt: imp.createdAt,
    updatedAt: imp.updatedAt,
    preview: {
      headers,
      rows: sampleRows,
      suggestedMapping,
    },
  };
}

/**
 * Contact import HTTP path: upload to object storage + enqueue async job.
 * Never parse large spreadsheets synchronously in the request handler.
 */
export class ContactImportService {
  constructor(private readonly audit = new AuditService()) {}

  async upload(
    organizationId: string,
    userId: string,
    file: { name: string; type: string; data: Buffer },
  ) {
    const config = getConfig();
    if (file.data.byteLength > config.MAX_UPLOAD_BYTES) {
      throw new ValidationError(
        `File exceeds max upload size of ${config.MAX_UPLOAD_BYTES} bytes`,
      );
    }

    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const lower = file.name.toLowerCase();
    if (
      !allowed.includes(file.type) &&
      !lower.endsWith(".csv") &&
      !lower.endsWith(".xlsx") &&
      !lower.endsWith(".xls")
    ) {
      throw new ValidationError("Only CSV or Excel files are supported");
    }

    const objectKey = `imports/${organizationId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storage = getStorage();
    await storage.putObject({
      key: objectKey,
      body: file.data,
      contentType: file.type || "application/octet-stream",
    });

    const imp = await db.contactImport.create({
      data: {
        organizationId,
        fileName: file.name,
        objectKey,
        contentType: file.type || "application/octet-stream",
        status: "UPLOADED",
      },
    });

    await enqueueJob(
      QUEUE_NAMES.CONTACT_IMPORT,
      "validate_contact_import",
      {
        organizationId,
        importId: imp.id,
        objectKey,
      },
      { jobId: `import-validate-${imp.id}` },
    );

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "contact_import.upload",
      resource: "contact_import",
      resourceId: imp.id,
    });

    return toPreview(imp);
  }

  async get(organizationId: string, importId: string) {
    const imp = await db.contactImport.findFirst({
      where: { id: importId, organizationId },
    });
    if (!imp) throw new NotFoundError("ContactImport");
    return toPreview(imp);
  }

  async preview(
    organizationId: string,
    importId: string,
    columnMapping?: Record<string, string>,
  ) {
    const existing = await db.contactImport.findFirst({
      where: { id: importId, organizationId },
    });
    if (!existing) throw new NotFoundError("ContactImport");

    if (["UPLOADED", "VALIDATING"].includes(existing.status)) {
      return toPreview(existing);
    }

    if (columnMapping) {
      if (!columnMapping.name || !columnMapping.phone) {
        throw new ValidationError("name and phone column mappings are required");
      }

      await db.contactImport.update({
        where: { id: importId },
        data: {
          columnMapping,
          status: "VALIDATING",
        },
      });

      // Re-validate asynchronously — do not re-parse the file in the HTTP path.
      await enqueueJob(
        QUEUE_NAMES.CONTACT_IMPORT,
        "validate_contact_import",
        {
          organizationId,
          importId,
        },
        { jobId: `import-revalidate-${importId}-${Date.now()}` },
      );

      return this.get(organizationId, importId);
    }

    const sampleRows = await db.contactImportRow.findMany({
      where: { importId },
      orderBy: { rowNumber: "asc" },
      take: 50,
    });

    const summary = {
      ...((existing.summary as object) || {}),
      sampleRows: sampleRows.slice(0, 25).map((r) => r.rawData),
    };

    return {
      ...toPreview(existing),
      summary,
      preview: {
        headers:
          ((existing.summary as { headers?: string[] })?.headers) ||
          Object.keys((sampleRows[0]?.rawData as object) || {}),
        rows: sampleRows.slice(0, 25).map((r) => r.rawData as Record<string, string>),
        suggestedMapping:
          (existing.columnMapping as Record<string, string>) ||
          ((existing.summary as { suggestedMapping?: Record<string, string> })
            ?.suggestedMapping ?? {}),
      },
    };
  }

  async commit(
    organizationId: string,
    userId: string,
    importId: string,
    input: unknown,
  ) {
    const imp = await db.contactImport.findFirst({
      where: { id: importId, organizationId },
    });
    if (!imp) throw new NotFoundError("ContactImport");

    if (imp.status !== "PREVIEW_READY") {
      throw new ValidationError(`Import not ready to commit (status=${imp.status})`);
    }

    const body = z
      .object({
        columnMapping: mappingSchema.optional(),
      })
      .parse(input ?? {});

    if (body.columnMapping) {
      await db.contactImport.update({
        where: { id: importId },
        data: { columnMapping: body.columnMapping },
      });
    }

    await db.contactImport.update({
      where: { id: importId },
      data: { status: "COMMITTING" },
    });

    await enqueueJob(
      QUEUE_NAMES.CONTACT_IMPORT,
      "process_contact_import",
      {
        organizationId,
        importId,
      },
      { jobId: `import-commit-${importId}` },
    );

    await this.audit.log({
      organizationId,
      actorUserId: userId,
      action: "contact_import.commit",
      resource: "contact_import",
      resourceId: importId,
    });

    return this.get(organizationId, importId);
  }
}
