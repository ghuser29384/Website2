const EVERY_ORG_API_BASE = "https://partners.every.org/v0.2";
const EVERY_ORG_PROFILE_HOSTS = new Set(["every.org", "www.every.org"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;

export const EVERY_ORG_NONPROFIT_SOURCE = "Every.org nonprofit directory";

export interface EveryOrgNonprofitSearchResult {
  identifier: string;
  name: string;
  description: string;
  ein: string | null;
  slug: string;
  profileUrl: string;
  websiteUrl: string | null;
}

export interface EveryOrgNonprofitIdentity {
  id: string;
  name: string;
  primarySlug: string;
  ein: string | null;
  isDisbursable: boolean;
  description: string;
  locationAddress: string;
  nteeCode: string;
  profileUrl: string;
  websiteUrl: string | null;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizeEin(value: unknown) {
  const digits = text(value, 24).replace(/\D/g, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

function normalizeSlug(value: unknown) {
  const slug = text(value, 120).toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : "";
}

function httpsUrl(value: unknown, allowedHosts?: Set<string>) {
  const candidate = text(value, 500);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    if (allowedHosts && !allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function websiteUrl(value: unknown) {
  const candidate = text(value, 500);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function slugFromEveryOrgProfileUrl(value: unknown) {
  const profileUrl = httpsUrl(value, EVERY_ORG_PROFILE_HOSTS);
  if (!profileUrl) return "";
  const pathname = new URL(profileUrl).pathname;
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return normalizeSlug(segment);
}

export function normalizeEveryOrgIdentifier(value: unknown) {
  const candidate = text(value, 500);
  if (!candidate) return "";

  const profileSlug = slugFromEveryOrgProfileUrl(candidate);
  if (profileSlug) return profileSlug;

  const ein = normalizeEin(candidate);
  if (ein) return ein;

  if (UUID_PATTERN.test(candidate)) return candidate.toLowerCase();
  return normalizeSlug(candidate);
}

export function buildEveryOrgSearchUrl(query: string, apiKey: string, take = 20) {
  const normalizedQuery = text(query, 120).replace(/\s+/g, " ");
  const url = new URL(
    `${EVERY_ORG_API_BASE}/search/${encodeURIComponent(normalizedQuery)}`,
  );
  url.searchParams.set("apiKey", apiKey.trim());
  url.searchParams.set("take", String(Math.max(1, Math.min(take, 50))));
  return url.toString();
}

export function buildEveryOrgDetailsUrl(identifier: string, apiKey: string) {
  const normalizedIdentifier = normalizeEveryOrgIdentifier(identifier);
  if (!normalizedIdentifier) throw new Error("A valid Every.org nonprofit identifier is required.");
  const url = new URL(
    `${EVERY_ORG_API_BASE}/nonprofit/${encodeURIComponent(normalizedIdentifier)}`,
  );
  url.searchParams.set("apiKey", apiKey.trim());
  return url.toString();
}

export function mapEveryOrgSearchResults(
  payload: unknown,
  maximumResults = 20,
): EveryOrgNonprofitSearchResult[] {
  const rows = asObject(payload).nonprofits;
  if (!Array.isArray(rows)) return [];

  const results: EveryOrgNonprofitSearchResult[] = [];
  const seen = new Set<string>();
  for (const value of rows) {
    const row = asObject(value);
    const name = text(row.name, 180);
    const profileUrl = httpsUrl(row.profileUrl, EVERY_ORG_PROFILE_HOSTS);
    const slug = slugFromEveryOrgProfileUrl(profileUrl);
    const ein = normalizeEin(row.ein);
    const identifier = ein || slug;
    if (!name || !profileUrl || !slug || !identifier || seen.has(identifier)) continue;
    seen.add(identifier);

    results.push({
      identifier,
      name,
      description: text(row.description, 400),
      ein,
      slug,
      profileUrl,
      websiteUrl: websiteUrl(row.websiteUrl),
    });

    if (results.length >= Math.max(1, Math.min(maximumResults, 50))) break;
  }
  return results;
}

export function mapEveryOrgNonprofitDetails(
  payload: unknown,
): EveryOrgNonprofitIdentity | null {
  const row = asObject(asObject(asObject(payload).data).nonprofit);
  const id = text(row.id, 64).toLowerCase();
  const name = text(row.name, 180);
  const primarySlug = normalizeSlug(row.primarySlug);
  const profileUrl = httpsUrl(row.profileUrl, EVERY_ORG_PROFILE_HOSTS);
  if (!UUID_PATTERN.test(id) || !name || !primarySlug || !profileUrl) return null;

  return {
    id,
    name,
    primarySlug,
    ein: normalizeEin(row.ein),
    isDisbursable: row.isDisbursable === true,
    description: text(row.description, 1_000),
    locationAddress: text(row.locationAddress, 240),
    nteeCode: text(row.nteeCode, 32),
    profileUrl,
    websiteUrl: websiteUrl(row.websiteUrl),
  };
}

export function buildEveryOrgIdentitySnapshot(identity: EveryOrgNonprofitIdentity) {
  return {
    schemaVersion: "every-org-nonprofit-identity-v1",
    provider: "every_org",
    providerNonprofitId: identity.id,
    nonprofitSlug: identity.primarySlug,
    displayName: identity.name,
    nonprofitEin: identity.ein ?? "",
    isDisbursable: identity.isDisbursable,
    profileUrl: identity.profileUrl,
    websiteUrl: identity.websiteUrl ?? "",
    description: identity.description,
    locationAddress: identity.locationAddress,
    nteeCode: identity.nteeCode,
  } as const;
}
