import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface NormalizedPhone {
  raw: string;
  normalized: string | null;
  countryCode: string | null;
  valid: boolean;
  e164: string | null;
}

export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = "IN",
): NormalizedPhone {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw, normalized: null, countryCode: null, valid: false, e164: null };
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    return {
      raw: trimmed,
      normalized: null,
      countryCode: null,
      valid: false,
      e164: null,
    };
  }

  return {
    raw: trimmed,
    normalized: parsed.number,
    countryCode: parsed.country ?? null,
    valid: true,
    e164: parsed.format("E.164"),
  };
}
