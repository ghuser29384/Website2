const PROPUBLICA_SEARCH_ENDPOINT =
  "https://projects.propublica.org/nonprofits/api/v2/search.json";

export const NONPROFIT_SEARCH_SOURCE = "ProPublica Nonprofit Explorer / IRS";

export interface NonprofitSuggestion {
  label: string;
  description: string;
  aliases: string[];
  kind: "organization";
  source: string;
  ein: string | null;
  profileUrl: string | null;
  subsection: number | null;
  score: number;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maximum = 240) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function subsectionLabel(subsection: number | null) {
  if (subsection === 3) return "501(c)(3) charity";
  if (subsection === 92) return "4947(a)(1) charitable trust";
  if (subsection && subsection > 0) return `501(c)(${subsection}) organization`;
  return "US tax-exempt organization";
}

function organizationLocation(row: Record<string, unknown>) {
  const city = text(row.city, 100);
  const state = text(row.state, 12);
  return [city, state].filter(Boolean).join(", ");
}

function organizationEin(row: Record<string, unknown>) {
  const formatted = text(row.strein, 20);
  if (/^\d{2}-\d{7}$/.test(formatted)) return formatted;

  const digits = String(row.ein ?? "").replace(/\D/g, "").padStart(9, "0");
  return /^\d{9}$/.test(digits) ? `${digits.slice(0, 2)}-${digits.slice(2)}` : null;
}

function organizationProfileUrl(row: Record<string, unknown>) {
  const digits = String(row.ein ?? row.strein ?? "").replace(/\D/g, "");
  return digits
    ? `https://projects.propublica.org/nonprofits/organizations/${encodeURIComponent(digits)}`
    : null;
}

export function normalizeNonprofitSearchQuery(value: unknown) {
  return text(value, 300)
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function buildProPublicaSearchUrl(query: string) {
  const url = new URL(PROPUBLICA_SEARCH_ENDPOINT);
  url.searchParams.set("q", normalizeNonprofitSearchQuery(query));
  return url.toString();
}

export function mapProPublicaOrganizations(
  payload: unknown,
  maximumResults = 25,
): NonprofitSuggestion[] {
  const rows = object(payload).organizations;
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const results: NonprofitSuggestion[] = [];

  for (const value of rows) {
    const row = object(value);
    const label = text(row.name, 180) || text(row.sub_name, 180);
    if (!label) continue;

    const ein = organizationEin(row);
    const key = `${normalizedKey(label)}|${ein ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const subsection = number(row.subseccd);
    const location = organizationLocation(row);
    const description = [
      subsectionLabel(subsection),
      location,
      ein ? `EIN ${ein}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const alternateName = text(row.sub_name, 180);

    results.push({
      label,
      description,
      aliases:
        alternateName && normalizedKey(alternateName) !== normalizedKey(label)
          ? [alternateName]
          : [],
      kind: "organization",
      source: NONPROFIT_SEARCH_SOURCE,
      ein,
      profileUrl: organizationProfileUrl(row),
      subsection,
      score: number(row.score) ?? 0,
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}
