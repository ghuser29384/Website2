import type { OfferRecord } from "@/lib/app-data";
import { formatMode, type OfferMode } from "@/lib/offers";
import {
  getActionEvidenceSummary,
  getBaselineConfidence,
  getExternalityReviewSummary,
  getScoreConfidence,
} from "@/lib/proposal-review";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

export const PUBLIC_OFFERS_API_CONTRACT_VERSION =
  "public-offers-api-v0.1-2026-05";
export const PUBLIC_OFFERS_API_VALIDATOR_VERSION =
  "public-offers-api-validator-v0.1";

export type PublicOfferFormat =
  | "pledge-swap"
  | "donation-offset"
  | "public-good"
  | "paid-action";
export type PublicOfferStatus = "draft" | "live" | "archived" | "deferred";
export type PublicOfferReviewState =
  | "unreviewed"
  | "manual-review-required"
  | "reviewed"
  | "disputed";
export type PublicOffersTab = "live" | "examples" | "all";
export type PublicOffersSort =
  | "newest"
  | "reviewed"
  | "highest-offered-impact"
  | "best-fit";
export type PublicOffersApiRoute =
  | "/api/offers"
  | "/api/offers/:slug"
  | "/api/offers/facets";

export interface PublicOfferDuration {
  value: number | null;
  unit: "days" | "months" | "years" | "open-ended";
  label: string;
}

export interface PublicOfferListing {
  id: string;
  slug: string;
  title: string;
  summary: string;
  format: PublicOfferFormat;
  status: PublicOfferStatus;
  source: "live" | "worked_example";
  isWorkedExample: boolean;
  reviewState: PublicOfferReviewState;
  primaryCause: string;
  secondaryCause: string | null;
  offeredAction: string;
  requestedAction: string;
  verificationMethod: string;
  verificationSummary: string | null;
  duration: PublicOfferDuration;
  offeredImpactScore: number | null;
  requestedImpactThreshold: number | null;
  displayName: string;
  canonicalUrl: string;
  createdAt: string;
  updatedAt: string;
  manualReviewRequired: boolean;
  evidenceGated: boolean;
  noEscrow: boolean;
}

export interface PublicOfferFacet {
  value: string;
  label: string;
  count: number;
}

export interface PublicOffersMeta {
  tab: PublicOffersTab;
  defaultTab: PublicOffersTab;
  page: number;
  pageSize: number;
  total: number;
  sort: PublicOffersSort;
  query: string;
  liveOfferCount: number;
  workedExampleCount: number;
  defaultedToWorkedExamples: boolean;
  hiddenZeroCountFacets: boolean;
  availableFacets: {
    cause: PublicOfferFacet[];
    format: PublicOfferFacet[];
    verificationMethod: PublicOfferFacet[];
    reviewState: PublicOfferFacet[];
    duration: PublicOfferFacet[];
  };
}

export interface PublicOffersContract {
  version: string;
  sourceRoute: "/offers";
  publicApiRoute: PublicOffersApiRoute;
  listingSchemaId: string;
  supportedFilters: string[];
  nonClaims: string[];
}

export interface PublicOffersCollectionPayload {
  contractVersion: string;
  meta: PublicOffersMeta;
  publicContract: PublicOffersContract;
  items: PublicOfferListing[];
}

export interface PublicOfferDetailAction {
  key: "save" | "create-similar" | "contact-after-sign-in";
  label: string;
  href: string;
  method: "GET";
  authRequired: boolean;
  available: boolean;
  description: string;
}

export interface PublicOfferDetailPayload {
  contractVersion: string;
  slug: string;
  publicContract: PublicOffersContract;
  item: PublicOfferListing | null;
  actions: PublicOfferDetailAction[];
}

export interface PublicOffersFacetsPayload {
  contractVersion: string;
  meta: Pick<
    PublicOffersMeta,
    | "tab"
    | "defaultTab"
    | "total"
    | "query"
    | "liveOfferCount"
    | "workedExampleCount"
    | "defaultedToWorkedExamples"
    | "hiddenZeroCountFacets"
  >;
  publicContract: PublicOffersContract;
  availableFacets: PublicOffersMeta["availableFacets"];
}

export interface PublicOffersValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface PublicOffersValidation {
  status: "pass" | "fail";
  validatorName:
    | "public-offers-collection-api"
    | "public-offers-detail-api"
    | "public-offers-facets-api";
  validatorVersion: string;
  contractVersion: string;
  checks: PublicOffersValidationCheck[];
  blockers: string[];
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const LISTING_SCHEMA_ID =
  "https://www.moraltrade.org/schemas/moral-trade/public-offer-listing.schema.json";
const SUPPORTED_FILTERS = [
  "q",
  "search",
  "tab",
  "view",
  "cause",
  "format",
  "mode",
  "reviewState",
  "review",
  "sort",
  "page",
  "pageSize",
] as const;
const PUBLIC_OFFER_NON_CLAIMS = [
  "The public offers API is not escrow, custody, legal advice, tax advice, or contract formation.",
  "Participant scores are participant-stated context, not platform moral rankings.",
  "Worked examples are not live liquidity and require manual review before reliance.",
  "The collection response must not expose private wishes, contact details, raw source notes, raw evidence artifacts, or personalized cart state.",
] as const;
const PUBLIC_OFFER_DETAIL_NON_CLAIMS = [
  ...PUBLIC_OFFER_NON_CLAIMS,
  "The detail response is a public display record only; it does not grant contact access, create a saved search, or form an agreement.",
] as const;
const REQUIRED_LISTING_KEYS = [
  "id",
  "slug",
  "title",
  "summary",
  "format",
  "status",
  "source",
  "isWorkedExample",
  "reviewState",
  "primaryCause",
  "secondaryCause",
  "offeredAction",
  "requestedAction",
  "verificationMethod",
  "verificationSummary",
  "duration",
  "offeredImpactScore",
  "requestedImpactThreshold",
  "displayName",
  "canonicalUrl",
  "createdAt",
  "updatedAt",
  "manualReviewRequired",
  "evidenceGated",
  "noEscrow",
] as const satisfies ReadonlyArray<keyof PublicOfferListing>;

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readFirst(searchParams: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value) {
      return value;
    }
  }

  return "";
}

function readAll(searchParams: URLSearchParams, ...keys: string[]) {
  return keys.flatMap((key) => searchParams.getAll(key)).filter(Boolean);
}

function clampPage(value: string) {
  const parsed = Number.parseInt(value || "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function clampPageSize(value: string) {
  const parsed = Number.parseInt(value || String(DEFAULT_PAGE_SIZE), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
}

function parseTab(searchParams: URLSearchParams, defaultTab: PublicOffersTab) {
  const value = readFirst(searchParams, "tab", "view");

  if (value === "live" || value === "examples" || value === "all") {
    return value;
  }

  return defaultTab;
}

function parseSort(value: string): PublicOffersSort {
  if (
    value === "reviewed" ||
    value === "highest-offered-impact" ||
    value === "best-fit"
  ) {
    return value;
  }

  if (value === "impact") {
    return "highest-offered-impact";
  }

  if (value === "efficient") {
    return "best-fit";
  }

  return "newest";
}

function publicFormatFromMode(mode: OfferMode | "public-good"): PublicOfferFormat {
  if (mode === "pledge") return "pledge-swap";
  if (mode === "offset") return "donation-offset";
  if (mode === "payment") return "paid-action";
  return "public-good";
}

function parseFormat(value: string): PublicOfferFormat | null {
  const normalized = normalizeToken(value);

  if (normalized === "pledge" || normalized === "pledge-swap") return "pledge-swap";
  if (normalized === "offset" || normalized === "donation-offset") return "donation-offset";
  if (normalized === "payment" || normalized === "paid-action") return "paid-action";
  if (normalized === "public-good" || normalized === "public-good-contribution") {
    return "public-good";
  }

  return null;
}

export function getPublicOffersLiveModeFromSearchParams(
  searchParams: URLSearchParams,
): OfferMode | "all" {
  const formats = readAll(searchParams, "format", "mode")
    .map(parseFormat)
    .filter((format): format is PublicOfferFormat => Boolean(format));
  const uniqueFormats = Array.from(new Set(formats));

  if (uniqueFormats.length !== 1) {
    return "all";
  }

  if (uniqueFormats[0] === "pledge-swap") return "pledge";
  if (uniqueFormats[0] === "donation-offset") return "offset";
  if (uniqueFormats[0] === "paid-action") return "payment";
  return "all";
}

function parseDuration(label: string): PublicOfferDuration {
  if (/open/i.test(label)) {
    return { value: null, unit: "open-ended", label };
  }

  const match = label.match(/(\d+(?:\.\d+)?)\s*(day|days|month|months|year|years)/i);
  const value = match ? Number.parseFloat(match[1]) : null;
  const unitText = match?.[2]?.toLowerCase() ?? "";
  const unit = unitText.startsWith("day")
    ? "days"
    : unitText.startsWith("month")
      ? "months"
      : unitText.startsWith("year")
        ? "years"
        : "open-ended";

  return {
    value,
    unit,
    label,
  };
}

function safeDisplayName(value: string, fallback: string) {
  const normalized = value.trim();

  if (
    !normalized ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalized) ||
    /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(normalized)
  ) {
    return fallback;
  }

  return normalized.slice(0, 80);
}

function buildPublicOffersContract({
  publicApiRoute,
  supportedFilters = [...SUPPORTED_FILTERS],
  nonClaims = [...PUBLIC_OFFER_NON_CLAIMS],
}: {
  publicApiRoute: PublicOffersApiRoute;
  supportedFilters?: string[];
  nonClaims?: string[];
}): PublicOffersContract {
  return {
    version: PUBLIC_OFFERS_API_CONTRACT_VERSION,
    sourceRoute: "/offers",
    publicApiRoute,
    listingSchemaId: LISTING_SCHEMA_ID,
    supportedFilters,
    nonClaims,
  };
}

function workedExampleToPublicListing(
  offer: (typeof CANONICAL_WORKED_CASE_OFFERS)[number],
): PublicOfferListing {
  const baselineConfidence = getBaselineConfidence(offer);
  const createdAt = new Date(offer.createdAt).toISOString();

  return {
    id: offer.id,
    slug: `examples/${offer.id}`,
    title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
    summary: truncateDescription(
      `A ${offer.duration.toLowerCase()} ${formatMode(offer.mode).toLowerCase()} with ${offer.verification.toLowerCase()} evidence and ${baselineConfidence.toLowerCase()} baseline confidence.`,
      260,
    ),
    format: publicFormatFromMode(offer.mode),
    status: "archived",
    source: "worked_example",
    isWorkedExample: true,
    reviewState: "manual-review-required",
    primaryCause: offer.offeredCause,
    secondaryCause: offer.requestedCause,
    offeredAction: offer.offerAction,
    requestedAction: offer.requestAction,
    verificationMethod: offer.verification,
    verificationSummary: getActionEvidenceSummary(offer),
    duration: parseDuration(offer.duration),
    offeredImpactScore: offer.offerImpact,
    requestedImpactThreshold: offer.minCounterpartyImpact,
    displayName: safeDisplayName(offer.alias, "Worked example participant"),
    canonicalUrl: getAbsoluteUrl(`/offers/examples/${offer.id}`),
    createdAt,
    updatedAt: createdAt,
    manualReviewRequired: true,
    evidenceGated: true,
    noEscrow: true,
  };
}

function liveOfferToPublicListing(offer: OfferRecord): PublicOfferListing {
  const baselineConfidence = getBaselineConfidence({
    baselineAmountUsd: offer.donationOffset
      ? offer.donationOffset.baseline_amount_cents / 100
      : null,
    baselineOpposedCause: offer.donationOffset?.baseline_opposed_cause ?? "",
    evidenceUrl: offer.donationOffset?.evidence_url ?? "",
    mode: offer.mode,
    moderationStatus: offer.donationOffset?.moderation_status ?? null,
    offeredCause: offer.offered_cause,
    requestedCause: offer.requested_cause,
    trustLevel: offer.trust_level,
    verification: offer.verification,
  });

  return {
    id: offer.id,
    slug: offer.id,
    title: `${offer.offered_cause} for ${offer.requested_cause}`,
    summary: truncateDescription(
      offer.notes ||
        `${offer.duration} ${formatMode(offer.mode).toLowerCase()} with named evidence rules and ${baselineConfidence.toLowerCase()} baseline confidence.`,
      260,
    ),
    format: publicFormatFromMode(offer.mode),
    status: offer.status === "open" ? "live" : "draft",
    source: "live",
    isWorkedExample: false,
    reviewState: "manual-review-required",
    primaryCause: offer.offered_cause,
    secondaryCause: offer.requested_cause || null,
    offeredAction: offer.offer_action,
    requestedAction: offer.request_action,
    verificationMethod: offer.verification,
    verificationSummary: [
      getActionEvidenceSummary({
        evidenceUrl: offer.donationOffset?.evidence_url ?? "",
        mode: offer.mode,
        moderationStatus: offer.donationOffset?.moderation_status ?? null,
        verification: offer.verification,
      }),
      getExternalityReviewSummary({
        mode: offer.mode,
        offeredCause: offer.offered_cause,
        requestedCause: offer.requested_cause,
        verification: offer.verification,
      }),
      getScoreConfidence({
        mode: offer.mode,
        trustLevel: offer.trust_level,
        verification: offer.verification,
      }),
    ].join(" | "),
    duration: parseDuration(offer.duration),
    offeredImpactScore: offer.offer_impact,
    requestedImpactThreshold: offer.min_counterparty_impact,
    displayName: safeDisplayName(
      offer.ownerProfile?.resolvedName ?? offer.owner_alias,
      "Public participant",
    ),
    canonicalUrl: getAbsoluteUrl(`/offers/${offer.id}`),
    createdAt: offer.created_at,
    updatedAt: offer.updated_at,
    manualReviewRequired: true,
    evidenceGated: true,
    noEscrow: true,
  };
}

export function buildPublicOfferListingFromLiveOffer(offer: OfferRecord) {
  return liveOfferToPublicListing(offer);
}

function listingMatchesSearch(listing: PublicOfferListing, query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    listing.displayName,
    listing.title,
    listing.summary,
    listing.primaryCause,
    listing.secondaryCause,
    listing.offeredAction,
    listing.requestedAction,
    listing.verificationMethod,
    listing.reviewState,
    listing.format,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function listingMatchesCause(listing: PublicOfferListing, cause: string) {
  const normalizedCause = normalizeToken(cause);

  if (!normalizedCause) {
    return true;
  }

  return [listing.primaryCause, listing.secondaryCause ?? ""].some(
    (candidate) => normalizeToken(candidate).includes(normalizedCause),
  );
}

function listingEfficiency(listing: PublicOfferListing) {
  const requested = listing.requestedImpactThreshold ?? 0;
  const offered = listing.offeredImpactScore ?? 0;

  return requested <= 0 ? offered : offered / requested;
}

function sortListings(
  listings: PublicOfferListing[],
  sort: PublicOffersSort,
) {
  return [...listings].sort((left, right) => {
    if (sort === "highest-offered-impact") {
      return (right.offeredImpactScore ?? 0) - (left.offeredImpactScore ?? 0);
    }

    if (sort === "best-fit") {
      return listingEfficiency(right) - listingEfficiency(left);
    }

    if (sort === "reviewed") {
      return Number(right.manualReviewRequired) - Number(left.manualReviewRequired);
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

function facetValue(label: string) {
  return normalizeToken(label);
}

function buildFacet(
  listings: readonly PublicOfferListing[],
  getValues: (listing: PublicOfferListing) => readonly string[],
) {
  const counts = new Map<string, { label: string; count: number }>();

  listings.forEach((listing) => {
    getValues(listing)
      .filter(Boolean)
      .forEach((label) => {
        const value = facetValue(label);
        const existing = counts.get(value);

        if (existing) {
          existing.count += 1;
        } else {
          counts.set(value, { label, count: 1 });
        }
      });
  });

  return [...counts.entries()]
    .map(([value, entry]) => ({ value, ...entry }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function getPublicWorkedExampleOfferListings() {
  return CANONICAL_WORKED_CASE_OFFERS.map(workedExampleToPublicListing);
}

function normalizePublicOfferSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function publicOfferLookupKeys(listing: PublicOfferListing) {
  const canonicalPath = (() => {
    try {
      return new URL(listing.canonicalUrl).pathname.replace(/^\/offers\/?/, "");
    } catch {
      return "";
    }
  })();

  return [listing.id, listing.slug, canonicalPath]
    .map((value) => value.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}

export function getPublicOfferSlugFromSegments(segments: readonly string[]) {
  return normalizePublicOfferSlug(segments.join("/")).replace(/^\/+|\/+$/g, "");
}

export function getPublicOfferListingBySlug({
  liveOffers,
  slug,
}: {
  liveOffers: readonly OfferRecord[];
  slug: string;
}) {
  const lookup = normalizePublicOfferSlug(slug).replace(/^\/+|\/+$/g, "");
  const listings = [
    ...liveOffers
      .filter((offer) => offer.status === "open")
      .map(liveOfferToPublicListing),
    ...getPublicWorkedExampleOfferListings(),
  ];

  return (
    listings.find((listing) =>
      publicOfferLookupKeys(listing).some((key) => key === lookup),
    ) ?? null
  );
}

function canonicalPathForListing(listing: PublicOfferListing) {
  try {
    return new URL(listing.canonicalUrl).pathname;
  } catch {
    return listing.isWorkedExample
      ? `/offers/${listing.slug}`
      : `/offers/${encodeURIComponent(listing.id)}`;
  }
}

function modeFromPublicFormat(format: PublicOfferFormat) {
  if (format === "pledge-swap") return "pledge";
  if (format === "donation-offset") return "offset";
  if (format === "paid-action") return "payment";
  return "pledge";
}

function buildPublicOfferDetailActions(
  listing: PublicOfferListing | null,
): PublicOfferDetailAction[] {
  if (!listing) {
    return [] as PublicOfferDetailAction[];
  }

  const canonicalPath = canonicalPathForListing(listing);
  const signInReturnTo = encodeURIComponent(canonicalPath);
  const createSimilarHref = listing.isWorkedExample
    ? `/offers/new?mode=${modeFromPublicFormat(listing.format)}&example=${encodeURIComponent(listing.id)}`
    : `/offers/new?mode=${modeFromPublicFormat(listing.format)}&source_offer=${encodeURIComponent(listing.id)}`;

  return [
    {
      key: "save",
      label: "Save",
      href: `/signup?returnTo=${signInReturnTo}`,
      method: "GET",
      authRequired: true,
      available: true,
      description:
        "Signed-in users can save interest or create a saved search without exposing private wishes.",
    },
    {
      key: "create-similar",
      label: "Create similar",
      href: createSimilarHref,
      method: "GET",
      authRequired: true,
      available: true,
      description:
        "Start a new offer draft from the public terms without copying private evidence or contact details.",
    },
    {
      key: "contact-after-sign-in",
      label: "Contact after sign-in",
      href: `/signup?returnTo=${signInReturnTo}`,
      method: "GET",
      authRequired: true,
      available: !listing.isWorkedExample,
      description:
        "Contact paths remain sign-in and consent gated; the public API never releases contact details.",
    },
  ];
}

export function buildPublicOfferDetailPayload({
  liveOffers,
  slug,
}: {
  liveOffers: readonly OfferRecord[];
  slug: string;
}): PublicOfferDetailPayload {
  const item = getPublicOfferListingBySlug({ liveOffers, slug });

  return {
    contractVersion: PUBLIC_OFFERS_API_CONTRACT_VERSION,
    slug,
    publicContract: buildPublicOffersContract({
      publicApiRoute: "/api/offers/:slug",
      supportedFilters: [],
      nonClaims: [...PUBLIC_OFFER_DETAIL_NON_CLAIMS],
    }),
    item,
    actions: buildPublicOfferDetailActions(item),
  };
}

export function buildPublicOffersCollectionPayload({
  liveOffers,
  searchParams,
}: {
  liveOffers: readonly OfferRecord[];
  searchParams: URLSearchParams;
}): PublicOffersCollectionPayload {
  const liveListings = liveOffers.map(liveOfferToPublicListing);
  const workedExampleListings = getPublicWorkedExampleOfferListings();
  const allListings = [...liveListings, ...workedExampleListings];
  const liveOfferCount = liveListings.length;
  const workedExampleCount = workedExampleListings.length;
  const defaultTab: PublicOffersTab = liveOfferCount > 0 ? "live" : "examples";
  const requestedTab = readFirst(searchParams, "tab", "view");
  const tab = parseTab(searchParams, defaultTab);
  const query = readFirst(searchParams, "q", "search").trim().slice(0, 120);
  const page = clampPage(readFirst(searchParams, "page"));
  const pageSize = clampPageSize(readFirst(searchParams, "pageSize", "page_size"));
  const sort = parseSort(readFirst(searchParams, "sort"));
  const causes = readAll(searchParams, "cause");
  const formats = readAll(searchParams, "format", "mode")
    .map(parseFormat)
    .filter((format): format is PublicOfferFormat => Boolean(format));
  const reviewStates = readAll(searchParams, "reviewState", "review").map(normalizeToken);

  const tabListings = allListings.filter((listing) => {
    if (tab === "live") return listing.source === "live";
    if (tab === "examples") return listing.source === "worked_example";
    return true;
  });
  const facetScope = tabListings.filter((listing) => listingMatchesSearch(listing, query));
  const filtered = sortListings(
    facetScope.filter((listing) => {
      if (causes.length && !causes.some((cause) => listingMatchesCause(listing, cause))) {
        return false;
      }

      if (formats.length && !formats.includes(listing.format)) {
        return false;
      }

      if (
        reviewStates.length &&
        !reviewStates.includes(normalizeToken(listing.reviewState))
      ) {
        return false;
      }

      return true;
    }),
    sort,
  );
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    contractVersion: PUBLIC_OFFERS_API_CONTRACT_VERSION,
    meta: {
      tab,
      defaultTab,
      page,
      pageSize,
      total: filtered.length,
      sort,
      query,
      liveOfferCount,
      workedExampleCount,
      defaultedToWorkedExamples: !requestedTab && defaultTab === "examples",
      hiddenZeroCountFacets: true,
      availableFacets: {
        cause: buildFacet(facetScope, (listing) => [
          listing.primaryCause,
          listing.secondaryCause ?? "",
        ]),
        format: buildFacet(facetScope, (listing) => [listing.format]),
        verificationMethod: buildFacet(facetScope, (listing) => [
          listing.verificationMethod,
        ]),
        reviewState: buildFacet(facetScope, (listing) => [listing.reviewState]),
        duration: buildFacet(facetScope, (listing) => [listing.duration.label]),
      },
    },
    publicContract: buildPublicOffersContract({
      publicApiRoute: "/api/offers",
    }),
    items,
  };
}

export function buildPublicOffersFacetsPayload({
  liveOffers,
  searchParams,
}: {
  liveOffers: readonly OfferRecord[];
  searchParams: URLSearchParams;
}): PublicOffersFacetsPayload {
  const collection = buildPublicOffersCollectionPayload({
    liveOffers,
    searchParams,
  });

  return {
    contractVersion: PUBLIC_OFFERS_API_CONTRACT_VERSION,
    meta: {
      tab: collection.meta.tab,
      defaultTab: collection.meta.defaultTab,
      total: collection.meta.total,
      query: collection.meta.query,
      liveOfferCount: collection.meta.liveOfferCount,
      workedExampleCount: collection.meta.workedExampleCount,
      defaultedToWorkedExamples: collection.meta.defaultedToWorkedExamples,
      hiddenZeroCountFacets: collection.meta.hiddenZeroCountFacets,
    },
    publicContract: buildPublicOffersContract({
      publicApiRoute: "/api/offers/facets",
      supportedFilters: [...SUPPORTED_FILTERS].filter(
        (filter) => filter !== "page" && filter !== "pageSize",
      ),
    }),
    availableFacets: collection.meta.availableFacets,
  };
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): PublicOffersValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function listingHasRequiredFields(listing: PublicOfferListing) {
  return REQUIRED_LISTING_KEYS.every((key) => {
    const value = listing[key];

    if (value === null) {
      return key === "secondaryCause" ||
        key === "verificationSummary" ||
        key === "offeredImpactScore" ||
        key === "requestedImpactThreshold";
    }

    if (typeof value === "object") {
      return Object.keys(value).length > 0;
    }

    return value !== undefined && String(value).length > 0;
  });
}

function listingLeaksPrivateFields(listing: PublicOfferListing) {
  const serialized = JSON.stringify(listing);

  return /owner_id|authUser|contactEmail|isInCart|privateWish|rawSourceNotes|cartState/i.test(
    serialized,
  );
}

function actionsPreservePublicBoundaries(actions: readonly PublicOfferDetailAction[]) {
  return actions.every(
    (action) =>
      action.authRequired &&
      action.method === "GET" &&
      action.href.startsWith("/") &&
      !/contactEmail|privateWish|rawSourceNotes|cartState/i.test(JSON.stringify(action)),
  );
}

function visibleFacetsHavePositiveCounts(
  facets: PublicOffersMeta["availableFacets"],
) {
  return Object.values(facets)
    .flat()
    .every((facet) => facet.count > 0);
}

export function validatePublicOffersCollectionPayload(
  payload: PublicOffersCollectionPayload,
): PublicOffersValidation {
  const allFacetCounts = Object.values(payload.meta.availableFacets).flat();
  const checks = [
    validationCheck(
      "contract-shape",
      "Public offers contract and schema id are published",
      payload.contractVersion === PUBLIC_OFFERS_API_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/offers" &&
        payload.publicContract.sourceRoute === "/offers" &&
        payload.publicContract.listingSchemaId === LISTING_SCHEMA_ID &&
        payload.publicContract.supportedFilters.includes("q") &&
        payload.publicContract.supportedFilters.includes("tab"),
      `${payload.publicContract.publicApiRoute}; ${payload.publicContract.listingSchemaId}`,
    ),
    validationCheck(
      "zero-live-default",
      "Zero live inventory defaults to worked examples",
      payload.meta.liveOfferCount > 0 ||
        payload.meta.defaultTab === "examples",
      `live=${payload.meta.liveOfferCount}; default=${payload.meta.defaultTab}`,
    ),
    validationCheck(
      "listing-field-shape",
      "Listings expose the approved public fields",
      payload.items.every(listingHasRequiredFields) &&
        payload.items.every((listing) => {
          try {
            return Boolean(new URL(listing.canonicalUrl).protocol.match(/^https?:$/));
          } catch {
            return false;
          }
        }),
      `${payload.items.length} item(s).`,
    ),
    validationCheck(
      "facet-zero-counts-hidden",
      "Available facets hide zero-count options",
      payload.meta.hiddenZeroCountFacets &&
        allFacetCounts.every((facet) => facet.count > 0),
      `${allFacetCounts.length} visible facet(s).`,
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Listings omit private fields and preserve non-claims",
      payload.items.every((listing) => !listingLeaksPrivateFields(listing)) &&
        payload.items.every((listing) => listing.noEscrow && listing.manualReviewRequired) &&
        payload.publicContract.nonClaims.some((claim) => /not escrow|custody/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /not platform moral rankings/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "public-offers-collection-api",
    validatorVersion: PUBLIC_OFFERS_API_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}

export function validatePublicOfferDetailPayload(
  payload: PublicOfferDetailPayload,
): PublicOffersValidation {
  const checks = [
    validationCheck(
      "contract-shape",
      "Public offer detail contract and schema id are published",
      payload.contractVersion === PUBLIC_OFFERS_API_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/offers/:slug" &&
        payload.publicContract.sourceRoute === "/offers" &&
        payload.publicContract.listingSchemaId === LISTING_SCHEMA_ID,
      `${payload.publicContract.publicApiRoute}; ${payload.publicContract.listingSchemaId}`,
    ),
    validationCheck(
      "listing-found",
      "Requested public offer slug resolves to a live listing or worked example",
      Boolean(payload.item),
      payload.item ? payload.item.slug : payload.slug,
    ),
    validationCheck(
      "listing-field-shape",
      "Detail response reuses the approved public listing fields",
      payload.item ? listingHasRequiredFields(payload.item) : false,
      payload.item ? payload.item.canonicalUrl : "No public item.",
    ),
    validationCheck(
      "actions-consent-gated",
      "Detail actions are sign-in and consent gated",
      Boolean(payload.item) && actionsPreservePublicBoundaries(payload.actions),
      `${payload.actions.length} action(s).`,
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Detail omits private fields and preserves non-claims",
      Boolean(payload.item) &&
        !listingLeaksPrivateFields(payload.item as PublicOfferListing) &&
        payload.publicContract.nonClaims.some((claim) => /does not grant contact access/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /not escrow|custody/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "public-offers-detail-api",
    validatorVersion: PUBLIC_OFFERS_API_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}

export function validatePublicOffersFacetsPayload(
  payload: PublicOffersFacetsPayload,
): PublicOffersValidation {
  const checks = [
    validationCheck(
      "contract-shape",
      "Public offer facets contract and schema id are published",
      payload.contractVersion === PUBLIC_OFFERS_API_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/offers/facets" &&
        payload.publicContract.sourceRoute === "/offers" &&
        payload.publicContract.listingSchemaId === LISTING_SCHEMA_ID &&
        payload.publicContract.supportedFilters.includes("q") &&
        payload.publicContract.supportedFilters.includes("tab"),
      `${payload.publicContract.publicApiRoute}; ${payload.publicContract.listingSchemaId}`,
    ),
    validationCheck(
      "facet-zero-counts-hidden",
      "Facet endpoint hides zero-count options",
      payload.meta.hiddenZeroCountFacets &&
        visibleFacetsHavePositiveCounts(payload.availableFacets),
      `${Object.values(payload.availableFacets).flat().length} visible facet(s).`,
    ),
    validationCheck(
      "zero-live-default",
      "Zero live inventory defaults facets to worked examples",
      payload.meta.liveOfferCount > 0 ||
        payload.meta.defaultTab === "examples",
      `live=${payload.meta.liveOfferCount}; default=${payload.meta.defaultTab}`,
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Facets expose counts only and preserve non-claims",
      !/owner_id|authUser|contactEmail|privateWish|rawSourceNotes|cartState/i.test(
        JSON.stringify(payload.availableFacets),
      ) &&
        payload.publicContract.nonClaims.some((claim) => /not escrow|custody/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /not platform moral rankings/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "public-offers-facets-api",
    validatorVersion: PUBLIC_OFFERS_API_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}
