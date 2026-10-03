export interface ParsedCsvContact {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
}

/**
 * Auto-detect the most likely delimiter from comma, semicolon, tab, or pipe.
 */
function detectDelimiter(lines: string[]): string {
  const candidates = [",", ";", "\t", "|"];
  const sample = lines.slice(0, 5).join("\n");
  let best = ",";
  let maxCount = -1;

  for (const delim of candidates) {
    const count = (sample.match(new RegExp(`\\${delim}`, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      best = delim;
    }
  }

  return maxCount > 0 ? best : ",";
}

/**
 * Robust CSV/TSV/DSV parser with quote-escaping, delimiter detection,
 * header fuzzy-matching, and phone/name auto-detection.
 */
export function parseCsvText(text: string): ParsedCsvContact[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);

  const splitRow = (row: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    values.push(current.trim());
    return values;
  };

  const firstLine = lines[0];
  if (!firstLine) return [];
  const headerRow = splitRow(firstLine);
  const headers = headerRow.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );

  const NAME_MATCHERS = [
    "user",
    "users",
    "username",
    "name",
    "fullname",
    "contactname",
    "customername",
    "leadname",
    "first",
    "firstname",
    "clientname",
    "client",
    "lead",
    "prospect",
    "prospectname",
    "displayname",
    "person",
  ];

  const PHONE_MATCHERS = [
    "phone",
    "phonenumber",
    "phoneno",
    "mobile",
    "mobilenumber",
    "mobileno",
    "telephone",
    "telephonenumber",
    "cell",
    "cellphone",
    "contactno",
    "contactnumber",
    "contact",
    "number",
    "tel",
    "primaryphone",
  ];

  let nameIdx = headers.findIndex((h) => NAME_MATCHERS.includes(h));
  let phoneIdx = headers.findIndex((h) => PHONE_MATCHERS.includes(h));
  const emailIdx = headers.findIndex((h) =>
    ["email", "emailaddress", "emailid", "mail"].includes(h),
  );
  const companyIdx = headers.findIndex((h) =>
    ["company", "companyname", "organization", "org", "business", "firm", "account"].includes(h),
  );
  const notesIdx = headers.findIndex((h) =>
    ["note", "notes", "remark", "remarks", "comment", "comments", "description"].includes(h),
  );

  let startIdx = 1;
  // If first row does not look like headers, check if it's already row data
  const firstRowLooksLikeHeader = nameIdx !== -1 || phoneIdx !== -1 || emailIdx !== -1 || companyIdx !== -1;
  if (!firstRowLooksLikeHeader) {
    nameIdx = 0;
    phoneIdx = 1;
    startIdx = 0;
  } else if (nameIdx === -1 && phoneIdx !== -1) {
    nameIdx = phoneIdx === 0 ? 1 : 0;
  } else if (phoneIdx === -1 && nameIdx !== -1) {
    phoneIdx = nameIdx === 0 ? 1 : 0;
  }

  const isNumericPhone = (val: string) => {
    const clean = val.replace(/[\s\-()+.]/g, "");
    return clean.length >= 7 && /^\d+$/.test(clean);
  };

  const results: ParsedCsvContact[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const row = splitRow(line);
    if (row.length === 0 || row.every((c) => !c)) continue;

    let rawName = row[nameIdx] ?? "";
    let rawPhone = row[phoneIdx] ?? "";

    // If name and phone were inverted in this row (e.g. column 0 is digits, column 1 is text)
    if (isNumericPhone(rawName) && !isNumericPhone(rawPhone) && rawPhone.trim()) {
      const temp = rawName;
      rawName = rawPhone;
      rawPhone = temp;
    }

    if (!rawName.trim() && !rawPhone.trim()) continue;

    results.push({
      name: rawName.trim() || `Contact ${results.length + 1}`,
      phone: rawPhone.trim() || rawName.trim(),
      email: emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : undefined,
      company: companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : undefined,
      notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : undefined,
    });
  }

  return results;
}

export async function parseLeadFile(file: File): Promise<ParsedCsvContact[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) return [];
    return parseCsvText(XLSX.utils.sheet_to_csv(sheet));
  }

  return parseCsvText(await file.text());
}
