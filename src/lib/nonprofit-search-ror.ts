import {
  normalizeNonprofitSearchQuery,
  scoreOrganizationQueryMatch,
  type NonprofitSuggestion,
} from "@/lib/nonprofit-search";

const ROR_SEARCH_ENDPOINT = "https://api.ror.org/v2/organizations";

export const ROR_SEARCH_SOURCE = "Research Organization Registry (ROR)";

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maximum = 240) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalized(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalized(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function names(row: Record<string, unknown>) {
  const entries = Array.isArray(row.names) ? row.names.map(object) : [];
  const values = entries
    .map((entry) => ({
      value: text(entry.value, 180),
      types: Array.isArray(entry.types)
        ? entry.types.map((type) => text(type, 32).toLowerCase()).filter(Boolean)
        : [],
    }))
    .filter((entry) => entry.value);

  const display =
    values.find((entry) => entry.types.includes("ror_display"))?.value ||
    values.find((entry) => entry.types.includes("label"))?.value ||
    values[0]?.value ||
    "";

  return {
    display,
    aliases: unique(values.map((entry) => entry.value)).filter(
      (value) => normalized(value) !== normalized(display),
    ),
  };
}

function organizationTypes(row: Record<string, unknown>) {
  if (!Array.isArray(row.types)) return [] as string[];
  return row.types.map((value) => text(value, 40).toLowerCase()).filter(Boolean);
}

function typeLabel(types: string[]) {
  const labels: Array<[string, string]> = [
    ["nonprofit", "Nonprofit organization"],
    ["funder", "Funding organization"],
    ["healthcare", "Healthcare institution"],
    ["education", "Education institution"],
    ["government", "Government organization"],
    ["facility", "Research facility"],
    ["archive", "Archive"],
  ];

  return labels.find(([type]) => types.includes(type))?.[1] || "Research organization";
}

function location(row: Record<string, unknown>) {
  const locations = Array.isArray(row.locations) ? row.locations.map(object) : [];
  const details = object(locations[0]?.geonames_details);
  const city = text(details.name, 100);
  const country = text(details.country_name, 100);
  const countryCode = text(details.country_code, 2).toUpperCase();

  return {
    countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    label: [city, country || countryCode].filter(Boolean).join(", "),
  };
}

function website(row: Record<string, unknown>) {
  const links = Array.isArray(row.links) ? row.links.map(object) : [];
  const value = text(
    links.find((link) => text(link.type, 40).toLowerCase() === "website")?.value,
    320,
  );
  return /^https?:\/\//i.test(value) ? value : null;
}

function isEligibleType(types: string[]) {
  return !types.includes("company");
}

function typeWeight(types: string[]) {
  if (types.includes("nonprofit")) return 18;
  if (types.includes("funder")) return 16;
  if (types.includes("healthcare")) return 11;
  if (types.includes("education")) return 10;
  if (types.includes("government")) return 8;
  return 5;
}

export function buildRorSearchUrl(query: string, page = 1) {
  const url = new URL(ROR_SEARCH_ENDPOINT);
  url.searchParams.set("query", normalizeNonprofitSearchQuery(query));
  url.searchParams.set("page", String(Math.max(1, Math.min(Math.trunc(page), 500))));
  return url.toString();
}

export function mapRorOrganizations(
  payload: unknown,
  query: string,
  maximumResults = 20,
): NonprofitSuggestion[] {
  const rows = object(payload).items;
  if (!Array.isArray(rows)) return [];

  const results: NonprofitSuggestion[] = [];
  for (const [index, value] of rows.entries()) {
    const row = object(value);
    const types = organizationTypes(row);
    if (!isEligibleType(types)) continue;

    const organizationNames = names(row);
    if (!organizationNames.display) continue;

    const rorId = text(row.id, 320);
    const organizationLocation = location(row);
    const organizationWebsite = website(row);
    const queryScore = scoreOrganizationQueryMatch(
      organizationNames.display,
      organizationNames.aliases,
      query,
    );

    results.push({
      label: organizationNames.display,
      description: [typeLabel(types), organizationLocation.label].filter(Boolean).join(" · "),
      aliases: organizationNames.aliases,
      kind: "organization",
      source: ROR_SEARCH_SOURCE,
      ein: null,
      profileUrl: /^https:\/\/ror\.org\//i.test(rorId) ? rorId : null,
      subsection: null,
      score: queryScore + typeWeight(types) + Math.max(0, 30 - index),
      organizationId: rorId || null,
      countryCode: organizationLocation.countryCode,
      website: organizationWebsite,
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}
