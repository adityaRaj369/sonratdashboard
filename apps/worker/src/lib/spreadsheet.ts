import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { getConfig } from "@sonrat/config";
import { PermanentJobError } from "./retry.js";

export type SpreadsheetTable = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

function normalizeHeader(value: unknown, index: number): string {
  const text = String(value ?? "").trim();
  return text || `column_${index + 1}`;
}

function rowToRecord(
  headers: string[],
  cells: unknown[],
): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, idx) => {
    const cell = cells[idx];
    record[header] =
      cell == null || cell === ""
        ? ""
        : typeof cell === "string"
          ? cell.trim()
          : String(cell).trim();
  });
  return record;
}

export function parseSpreadsheetBuffer(
  buffer: Buffer,
  fileName: string,
): SpreadsheetTable {
  const config = getConfig();
  const lower = fileName.toLowerCase();
  let matrix: unknown[][] = [];

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    matrix = parse(buffer, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown[][];
  } else {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new PermanentJobError("Spreadsheet has no sheets");
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new PermanentJobError(`Sheet not found: ${sheetName}`);
    }
    matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
  }

  if (!matrix.length) {
    throw new PermanentJobError("Spreadsheet is empty");
  }

  const headers = (matrix[0] as unknown[]).map(normalizeHeader);
  const dataRows = matrix.slice(1).filter((row) =>
    (row as unknown[]).some((cell) => String(cell ?? "").trim() !== ""),
  );

  if (dataRows.length > config.MAX_IMPORT_ROWS) {
    throw new PermanentJobError(
      `Import exceeds max rows (${config.MAX_IMPORT_ROWS})`,
    );
  }

  return {
    headers,
    rows: dataRows.map((row) => rowToRecord(headers, row as unknown[])),
  };
}

export function suggestColumnMapping(
  headers: string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map((h) => ({ raw: h, key: h.toLowerCase() }));

  const find = (...candidates: string[]) =>
    lower.find((h) => candidates.some((c) => h.key.includes(c)))?.raw;

  const name = find("name", "full name", "contact");
  const phone = find("phone", "mobile", "cell", "tel");
  const email = find("email", "mail");
  const company = find("company", "organization", "org");
  const tags = find("tag");
  const notes = find("note", "comment");
  const source = find("source");
  const timezone = find("timezone", "tz");
  const leadStatus = find("lead", "status");

  if (name) mapping.name = name;
  if (phone) mapping.phone = phone;
  if (email) mapping.email = email;
  if (company) mapping.company = company;
  if (tags) mapping.tags = tags;
  if (notes) mapping.notes = notes;
  if (source) mapping.source = source;
  if (timezone) mapping.timezone = timezone;
  if (leadStatus) mapping.leadStatus = leadStatus;

  return mapping;
}
