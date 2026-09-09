import { db } from "@sonrat/database";
import { PermanentJobError } from "../lib/retry.js";
import type { JobHandler } from "./types.js";

export interface ProcessContactImportData {
  organizationId: string;
  importId: string;
  idempotencyKey?: string;
}

export const processContactImport: JobHandler<ProcessContactImportData> = async (
  job,
) => {
  const { organizationId, importId } = job.data;
  const imp = await db.contactImport.findFirst({
    where: { id: importId, organizationId },
  });
  if (!imp) throw new PermanentJobError(`Import not found: ${importId}`);

  await db.contactImport.update({
    where: { id: importId },
    data: { status: "COMMITTING" },
  });

  const rows = await db.contactImportRow.findMany({
    where: { importId, isValid: true, committed: false },
  });

  let committed = 0;
  for (const row of rows) {
    const data = row.normalizedData as {
      name: string;
      rawPhone: string;
      normalizedPhone: string;
      countryCode: string | null;
      email?: string | null;
      company?: string | null;
    } | null;
    if (!data?.normalizedPhone) continue;

    await db.contact.upsert({
      where: {
        organizationId_normalizedPhone: {
          organizationId,
          normalizedPhone: data.normalizedPhone,
        },
      },
      create: {
        organizationId,
        name: data.name,
        rawPhone: data.rawPhone,
        normalizedPhone: data.normalizedPhone,
        countryCode: data.countryCode,
        email: data.email ?? undefined,
        company: data.company ?? undefined,
        source: `import:${importId}`,
      },
      update: {
        name: data.name,
        email: data.email ?? undefined,
        company: data.company ?? undefined,
        deletedAt: null,
      },
    });

    await db.contactImportRow.update({
      where: { id: row.id },
      data: { committed: true },
    });
    committed += 1;
  }

  await db.contactImport.update({
    where: { id: importId },
    data: {
      status: "COMPLETED",
      summary: {
        ...(imp.summary as object),
        committed,
        committedAt: new Date().toISOString(),
      },
    },
  });

  return { committed };
};
