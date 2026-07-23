import { normalizeSmartQueryText } from "./smart-query";

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_PATTERN = Object.keys(MONTHS).join("|");

function validIsoDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month ||
    value.getUTCDate() !== day
  ) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

export function extractSmartRecordDeadline(
  values: Array<string | null | undefined>,
  now: Date | string = new Date(),
) {
  const current = now instanceof Date ? now : new Date(now);
  const currentDate = Number.isFinite(current.getTime()) ? current : new Date();
  const text = normalizeSmartQueryText(values.filter(Boolean).join(" "));
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const monthFirst = text.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(20\\d{2}))?\\b`, "i"),
  );
  const dayFirst = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?\\b`, "i"),
  );
  const match = monthFirst ?? dayFirst;
  if (!match) return null;

  const monthName = (monthFirst ? match[1] : match[2]).toLowerCase();
  const month = MONTHS[monthName];
  const day = Number(monthFirst ? match[2] : match[1]);
  const explicitYear = Number(match[3]);
  let year = Number.isInteger(explicitYear) && explicitYear >= 2000
    ? explicitYear
    : currentDate.getUTCFullYear();
  let result = validIsoDate(year, month, day);
  if (!result) return null;
  if (!explicitYear && result < currentDate.toISOString().slice(0, 10)) {
    year += 1;
    result = validIsoDate(year, month, day);
  }
  return result;
}

export function isVerifiedEvidenceText(value: string | null | undefined) {
  const normalized = normalizeSmartQueryText(value);
  if (!normalized) return false;
  if (/\b(unverified|none|no evidence|self report only|self-report only|not required)\b/.test(normalized)) {
    return false;
  }
  return /\b(verified|reviewed|receipt|receipts|proof|attestation|audit|third party|third-party|evidence|validation|accepted)\b/.test(
    normalized,
  );
}

export function evidenceTextQuality(value: string | null | undefined) {
  const normalized = normalizeSmartQueryText(value);
  if (!normalized) return 0;
  if (!isVerifiedEvidenceText(normalized)) return 0.15;
  if (/\b(third party|third-party|independent|audit|accepted|reviewed)\b/.test(normalized)) return 1;
  if (/\b(receipt|receipts|proof|attestation|validation)\b/.test(normalized)) return 0.84;
  return 0.68;
}
