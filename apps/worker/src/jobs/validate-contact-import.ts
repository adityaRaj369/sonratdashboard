import { db, Prisma } from "@sonrat/database";
import { normalizePhone } from "@sonrat/shared";
import { PermanentJobError } from "../lib/retry.js";
import { getStorage } from "../lib/storage.js";
import {
  parseSpreadsheetBuffer,
  suggestColumnMapping,
} from "../lib/spreadsheet.js";
import type { JobHandler } from "./types.js";

export interface ValidateContactImportData {
  organizationId: string;
  importId: string;
  objectKey?: string;
  defaultCountry?: string;
}

function applyMapping(
  raw: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (!source) continue;
    mapped[target] = String(raw[source] ?? "").trim();
  }
  if (!mapped.name) {
    mapped.name = String(raw.name ?? raw.Name ?? "").trim();
  }
  if (!mapped.phone) {
    mapped.phone = String(
      raw.phone ?? raw.Phone ?? raw.mobile ?? raw.Mobile ?? "",
    ).trim();
  }
  return mapped;
}

/**
 * Downloads the uploaded file from object storage, parses it, upserts rows,
 * and validates. Parsing never happens in the API HTTP handler.
 */
export const validateContactImport: JobHandler<ValidateContactImportData> = async (
  job,
) => {
  const { organizationId, importId, defaultCountry = "IN" } = job.data;
  const imp = await db.contactImport.findFirst({
    where: { id: importId, organizationId },
  });
  if (!imp) throw new PermanentJobError(`Import not found: ${importId}`);

  await db.contactImport.update({
    where: { id: importId },
    data: { status: "VALIDATING" },
  });

  let rows = await db.contactImportRow.findMany({
    where: { importId },
    orderBy: { rowNumber: "asc" },
  });

  // First pass: parse from object storage when rows are not yet materialized.
  if (rows.length === 0) {
    const objectKey = job.data.objectKey ?? imp.objectKey;
    const storage = getStorage();
    let body: Buffer;
    try {
      const obj = await storage.getObject(objectKey);
      body = obj.body;
    } catch (err) {
      throw new PermanentJobError(
        `Failed to load import object ${objectKey}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
    }

    const table = parseSpreadsheetBuffer(body, imp.fileName);
    const suggestedMapping = suggestColumnMapping(table.headers);
    const existingMapping = (imp.columnMapping as Record<string, string>) || {};
    const columnMapping =
      Object.keys(existingMapping).length > 0 ? existingMapping : suggestedMapping;

    // Replace any partial rows, then insert in chunks.
    await db.contactImportRow.deleteMany({ where: { importId } });

    const CHUNK = 500;
    for (let i = 0; i < table.rows.length; i += CHUNK) {
      const slice = table.rows.slice(i, i + CHUNK);
      await db.contactImportRow.createMany({
        data: slice.map((rawData, idx) => ({
          importId,
          rowNumber: i + idx + 1,
          rawData,
        })),
      });
    }

    await db.contactImport.update({
      where: { id: importId },
      data: {
        totalRows: table.rows.length,
        columnMapping,
        summary: {
          ...((imp.summary as object) || {}),
          headers: table.headers,
          sampleRows: table.rows.slice(0, 25),
          suggestedMapping,
          parsedAt: new Date().toISOString(),
        },
      },
    });

    rows = await db.contactImportRow.findMany({
      where: { importId },
      orderBy: { rowNumber: "asc" },
    });
  }

  const latest = await db.contactImport.findUniqueOrThrow({ where: { id: importId } });
  const mapping = (latest.columnMapping as Record<string, string>) || {};

  let validRows = 0;
  let invalidRows = 0;

  for (const row of rows) {
    const raw = row.rawData as Record<string, unknown>;
    const mapped = applyMapping(raw, mapping);
    const name = mapped.name;
    const phoneRaw = mapped.phone;
    const errors: string[] = [];

    if (!name) errors.push("name is required");
    if (!phoneRaw) errors.push("phone is required");
    const phone = normalizePhone(phoneRaw || "", defaultCountry as "IN");
    if (!phone.valid) errors.push("invalid phone");

    const isValid = errors.length === 0;
    if (isValid) validRows += 1;
    else invalidRows += 1;

    await db.contactImportRow.update({
      where: { id: row.id },
      data: {
        isValid,
        errors,
        normalizedData: isValid
          ? {
              name,
              rawPhone: phoneRaw,
              normalizedPhone: phone.e164,
              countryCode: phone.countryCode,
              email: mapped.email || null,
              company: mapped.company || null,
              notes: mapped.notes || null,
              source: mapped.source || null,
              timezone: mapped.timezone || null,
              leadStatus: mapped.leadStatus || null,
              tags: mapped.tags
                ? mapped.tags.split(",").map((t) => t.trim()).filter(Boolean)
                : [],
            }
          : Prisma.JsonNull,
      },
    });
  }

  await db.contactImport.update({
    where: { id: importId },
    data: {
      status: "PREVIEW_READY",
      totalRows: rows.length,
      validRows,
      invalidRows,
      summary: {
        ...((latest.summary as object) || {}),
        validatedAt: new Date().toISOString(),
      },
    },
  });

  return { validRows, invalidRows, totalRows: rows.length };
};
