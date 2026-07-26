const PROPUBLICA_SEARCH_ENDPOINT =
  "https://projects.propublica.org/nonprofits/api/v2/search.json";
const WIKIDATA_SEARCH_ENDPOINT = "https://www.wikidata.org/w/api.php";
const OPENALEX_INSTITUTIONS_ENDPOINT = "https://api.openalex.org/institutions";
const OPENALEX_FUNDERS_ENDPOINT = "https://api.openalex.org/funders";

export const PROPUBLICA_SEARCH_SOURCE = "ProPublica Nonprofit Explorer / IRS";
export const WIKIDATA_SEARCH_SOURCE = "Wikidata";
export const OPENALEX_INSTITUTION_SOURCE = "OpenAlex / ROR";
export const OPENALEX_FUNDER_SOURCE = "OpenAlex funders";
export const NONPROFIT_SEARCH_SOURCE = "Moral Trade multi-registry organization search";

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
  organizationId?: string | null;
  countryCode?: string | null;
  website?: string | null;
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

function stringArray(value: unknown, maximum = 180) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => text(item, maximum))
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizedKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedCountryCode(value: unknown) {
  const code = text(value, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
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

function queryTokens(value: string) {
  return normalizedKey(value)
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreOrganizationQueryMatch(label: string, aliases: string[], query: string) {
  const normalizedQuery = normalizedKey(query);
  if (!normalizedQuery) return 0;

  const requiredTokens = queryTokens(query);
  let best = 0;

  for (const candidate of [label, ...aliases]) {
    const normalizedCandidate = normalizedKey(candidate);
    if (!normalizedCandidate) continue;

    if (normalizedCandidate === normalizedQuery) best = Math.max(best, 1_000);
    else if (normalizedCandidate.startsWith(normalizedQuery)) best = Math.max(best, 840);
    else if (normalizedCandidate.includes(normalizedQuery)) best = Math.max(best, 740);

    const candidateTokens = normalizedCandidate.split(/\s+/).filter(Boolean);
    const exactMatches = requiredTokens.filter((token) => candidateTokens.includes(token)).length;
    const prefixMatches = requiredTokens.filter((token) =>
      candidateTokens.some((candidateToken) => candidateToken.startsWith(token)),
    ).length;

    if (requiredTokens.length && exactMatches === requiredTokens.length) {
      best = Math.max(best, 680 + Math.min(80, requiredTokens.length * 12));
    } else if (requiredTokens.length && prefixMatches === requiredTokens.length) {
      best = Math.max(best, 560 + Math.min(70, requiredTokens.length * 10));
    } else if (requiredTokens.length) {
      best = Math.max(best, Math.round((prefixMatches / requiredTokens.length) * 420));
    }
  }

  return best;
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

export function buildWikidataSearchUrl(query: string, maximumResults = 25) {
  const url = new URL(WIKIDATA_SEARCH_ENDPOINT);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", normalizeNonprofitSearchQuery(query));
  url.searchParams.set("language", "en");
  url.searchParams.set("uselang", "en");
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", String(Math.max(1, Math.min(maximumResults, 50))));
  url.searchParams.set("format", "json");
  return url.toString();
}

function buildOpenAlexSearchUrl(endpoint: string, query: string, maximumResults: number) {
  const url = new URL(endpoint);
  url.searchParams.set("search", normalizeNonprofitSearchQuery(query));
  url.searchParams.set("per-page", String(Math.max(1, Math.min(maximumResults, 100))));
  url.searchParams.set("mailto", "contact@moraltrade.org");
  return url.toString();
}

export function buildOpenAlexInstitutionSearchUrl(query: string, maximumResults = 25) {
  return buildOpenAlexSearchUrl(OPENALEX_INSTITUTIONS_ENDPOINT, query, maximumResults);
}

export function buildOpenAlexFunderSearchUrl(query: string, maximumResults = 25) {
  return buildOpenAlexSearchUrl(OPENALEX_FUNDERS_ENDPOINT, query, maximumResults);
}

export function mapProPublicaOrganizations(
  payload: unknown,
  maximumResults = 25,
  query = "",
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
    const aliases =
      alternateName && normalizedKey(alternateName) !== normalizedKey(label)
        ? [alternateName]
        : [];
    const providerScore = number(row.score) ?? 0;
    const queryScore = scoreOrganizationQueryMatch(label, aliases, query);

    results.push({
      label,
      description,
      aliases,
      kind: "organization",
      source: PROPUBLICA_SEARCH_SOURCE,
      ein,
      profileUrl: organizationProfileUrl(row),
      subsection,
      score: query
        ? queryScore + Math.min(20, Math.max(0, providerScore) / 10) + (subsection === 3 ? 6 : 0)
        : providerScore,
      countryCode: "US",
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}

const WIKIDATA_ORGANIZATION_PATTERN =
  /\b(charit(?:y|able)|non[- ]?profit|not[- ]for[- ]profit|non[- ]?governmental|ngo|foundation|fund|trust|organisation|organization|association|society|institute|institution|university|college|school|hospital|clinic|agency|aid group|relief group|campaign|coalition|network|movement|think tank|advocacy group|political party|trade union|labor union|museum|library|church|mosque|synagogue|temple)\b/i;
const WIKIDATA_NON_ORGANIZATION_PATTERN =
  /\b(album|song|film|television series|novel|book|video game|fictional character|surname|given name|species|taxon|village|city|municipality|railway station|mountain|river|asteroid|chemical compound|investment fund|mutual fund|hedge fund|exchange-traded fund)\b/i;

function isLikelyWikidataOrganization(label: string, description: string) {
  const combined = `${label} ${description}`;
  return (
    WIKIDATA_ORGANIZATION_PATTERN.test(combined) &&
    !WIKIDATA_NON_ORGANIZATION_PATTERN.test(description)
  );
}

export function mapWikidataOrganizations(
  payload: unknown,
  query: string,
  maximumResults = 25,
): NonprofitSuggestion[] {
  const rows = object(payload).search;
  if (!Array.isArray(rows)) return [];

  const results: NonprofitSuggestion[] = [];
  for (const [index, value] of rows.entries()) {
    const row = object(value);
    const label = text(row.label, 180);
    const description = text(row.description, 260);
    if (!label || !isLikelyWikidataOrganization(label, description)) continue;

    const aliases = uniqueStrings(stringArray(row.aliases));
    const id = text(row.id, 32);
    const conceptUri = text(row.concepturi, 320);
    const queryScore = scoreOrganizationQueryMatch(label, aliases, query);

    results.push({
      label,
      description: description || "Global organization",
      aliases,
      kind: "organization",
      source: WIKIDATA_SEARCH_SOURCE,
      ein: null,
      profileUrl:
        conceptUri.startsWith("https://")
          ? conceptUri
          : id
            ? `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`
            : null,
      subsection: null,
      score: queryScore + Math.max(0, 45 - index),
      organizationId: id || null,
      countryCode: null,
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}

function openAlexLocation(row: Record<string, unknown>) {
  const geo = object(row.geo);
  const city = text(geo.city, 100);
  const country = text(geo.country, 100);
  const countryCode = normalizedCountryCode(row.country_code ?? geo.country_code);
  return {
    countryCode,
    label: [city, country || countryCode || ""].filter(Boolean).join(", "),
  };
}

function openAlexInstitutionTypeLabel(value: unknown) {
  const type = text(value, 32).toLowerCase();
  const labels: Record<string, string> = {
    nonprofit: "Nonprofit institution",
    education: "Education institution",
    healthcare: "Healthcare institution",
    government: "Government institution",
    facility: "Research facility",
    archive: "Archive",
    other: "Research organization",
  };
  return labels[type] || "Research organization";
}

export function mapOpenAlexInstitutions(
  payload: unknown,
  query: string,
  maximumResults = 25,
): NonprofitSuggestion[] {
  const rows = object(payload).results;
  if (!Array.isArray(rows)) return [];

  const results: NonprofitSuggestion[] = [];
  for (const value of rows) {
    const row = object(value);
    const type = text(row.type, 32).toLowerCase();
    if (type === "company") continue;

    const label = text(row.display_name, 180);
    if (!label) continue;

    const aliases = uniqueStrings([
      ...stringArray(row.display_name_acronyms),
      ...stringArray(row.display_name_alternatives),
    ]);
    const location = openAlexLocation(row);
    const ror = text(row.ror, 320);
    const openAlexId = text(row.id, 320);
    const website = text(row.homepage_url, 320);
    const worksCount = Math.max(0, number(row.works_count) ?? 0);
    const relevanceScore = Math.max(0, number(row.relevance_score) ?? 0);
    const queryScore = scoreOrganizationQueryMatch(label, aliases, query);

    results.push({
      label,
      description: [openAlexInstitutionTypeLabel(type), location.label].filter(Boolean).join(" · "),
      aliases,
      kind: "organization",
      source: OPENALEX_INSTITUTION_SOURCE,
      ein: null,
      profileUrl: ror || openAlexId || website || null,
      subsection: null,
      score:
        queryScore +
        Math.min(20, relevanceScore / 10) +
        Math.min(18, Math.log10(worksCount + 1) * 3),
      organizationId: ror || openAlexId || null,
      countryCode: location.countryCode,
      website: website || null,
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}

export function mapOpenAlexFunders(
  payload: unknown,
  query: string,
  maximumResults = 25,
): NonprofitSuggestion[] {
  const rows = object(payload).results;
  if (!Array.isArray(rows)) return [];

  const results: NonprofitSuggestion[] = [];
  for (const value of rows) {
    const row = object(value);
    const label = text(row.display_name, 180);
    if (!label) continue;

    const aliases = uniqueStrings([
      ...stringArray(row.alternate_titles),
      ...stringArray(row.display_name_alternatives),
    ]);
    const countryCode = normalizedCountryCode(row.country_code);
    const ror = text(row.ror, 320);
    const openAlexId = text(row.id, 320);
    const website = text(row.homepage_url, 320);
    const grantsCount = Math.max(0, number(row.grants_count) ?? 0);
    const queryScore = scoreOrganizationQueryMatch(label, aliases, query);

    results.push({
      label,
      description: ["Research or philanthropic funder", countryCode || ""].filter(Boolean).join(" · "),
      aliases,
      kind: "organization",
      source: OPENALEX_FUNDER_SOURCE,
      ein: null,
      profileUrl: ror || openAlexId || website || null,
      subsection: null,
      score: queryScore + Math.min(18, Math.log10(grantsCount + 1) * 3),
      organizationId: ror || openAlexId || null,
      countryCode,
      website: website || null,
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }

  return results;
}

function sameOrganization(left: NonprofitSuggestion, right: NonprofitSuggestion) {
  if (left.ein && right.ein) {
    return left.ein.replace(/\D/g, "") === right.ein.replace(/\D/g, "");
  }

  if (normalizedKey(left.label) !== normalizedKey(right.label)) return false;
  if (left.countryCode && right.countryCode && left.countryCode !== right.countryCode) return false;
  return true;
}

function suggestionQuality(suggestion: NonprofitSuggestion) {
  return (
    suggestion.score +
    (suggestion.ein ? 18 : 0) +
    (suggestion.organizationId ? 8 : 0) +
    (suggestion.website ? 5 : 0)
  );
}

function richerDescription(left: string, right: string) {
  return right.length > left.length ? right : left;
}

function mergeTwoSuggestions(
  left: NonprofitSuggestion,
  right: NonprofitSuggestion,
): NonprofitSuggestion {
  const preferred = suggestionQuality(right) > suggestionQuality(left) ? right : left;
  const fallback = preferred === left ? right : left;
  return {
    ...preferred,
    description: richerDescription(preferred.description, fallback.description),
    aliases: uniqueStrings([
      ...preferred.aliases,
      fallback.label,
      ...fallback.aliases,
    ]).filter((alias) => normalizedKey(alias) !== normalizedKey(preferred.label)),
    ein: preferred.ein || fallback.ein,
    profileUrl: preferred.profileUrl || fallback.profileUrl,
    subsection: preferred.subsection ?? fallback.subsection,
    score: Math.max(preferred.score, fallback.score),
    organizationId: preferred.organizationId || fallback.organizationId || null,
    countryCode: preferred.countryCode || fallback.countryCode || null,
    website: preferred.website || fallback.website || null,
  };
}

export function mergeOrganizationSuggestions(
  groups: NonprofitSuggestion[][],
  maximumResults = 60,
) {
  const merged: NonprofitSuggestion[] = [];
  const candidates = groups
    .flat()
    .filter((suggestion) => suggestion.label)
    .sort((left, right) => suggestionQuality(right) - suggestionQuality(left));

  for (const candidate of candidates) {
    const existingIndex = merged.findIndex((existing) => sameOrganization(existing, candidate));
    if (existingIndex < 0) merged.push(candidate);
    else merged[existingIndex] = mergeTwoSuggestions(merged[existingIndex], candidate);
  }

  return merged
    .sort((left, right) => suggestionQuality(right) - suggestionQuality(left))
    .slice(0, Math.max(1, Math.min(maximumResults, 100)));
}
