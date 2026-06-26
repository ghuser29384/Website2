import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  EmptyState,
  IconMark,
  OfferCard,
  FilterSidebar,
} from "@/components/ui/page-primitives";
import {
  BASELINE_BOND_TOOLTIP,
  formatPostedBaselineBondBadge,
  normalizeBaselineBondStatus,
} from "@/lib/baseline-bonds";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listOpenOffersPage, OFFERS_PAGE_SIZE, type OfferRecord } from "@/lib/app-data";
import {
  REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT,
  REVIEWED_MARKETPLACE_SEED_TEMPLATES,
  REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT,
} from "@/lib/marketplace-seed-templates";
import { MARKETPLACE_PUBLIC_GOODS_BOUNDARY } from "@/lib/moral-trade/marketplace-boundary";
import { demoMpgfAssuranceRound, demoMpgfMatchPool, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { getMpgfCrecV1125AuditBundleApi } from "@/lib/mpgf/public-goods-crecm-route-contract";
import { getMpgfPublicGoodsEcmRulebookReportApi } from "@/lib/mpgf/public-goods-ecm-rulebook";
import { formatUsd } from "@/lib/mpgf/mechanism";
import { formatMode } from "@/lib/offers";
import { buildPublicGoodsEntryCard } from "@/lib/public-offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import {
  getActionEvidenceSummary,
  getBaselineConfidence,
  getExternalityReviewSummary,
  getOfferReviewCardInstrumentation,
  getScoreConfidence,
  getWorkedExampleLaunchOrder,
} from "@/lib/proposal-review";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Browse Moral Trade Offers and Worked Examples",
  description:
    "Browse live moral trade offers and worked examples by cause area, format, evidence method, and review state.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Browse Moral Trade Offers and Worked Examples",
    description:
      "Explore live offers and reviewed examples with explicit terms, evidence rules, and safety boundaries.",
    url: getAbsoluteUrl("/offers"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Moral Trade Offers and Worked Examples",
    description:
      "Explore live offers and reviewed examples with explicit terms, evidence rules, and safety boundaries.",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CAUSE_FILTER_CHIPS = [
  "Global poverty",
  "Animal welfare",
  "Climate",
  "Existential risk",
  "Future flourishing",
  "Public health",
] as const;

const VERIFICATION_FILTERS = [
  "Annual receipts",
  "Peer witness",
  "Evidence-gated",
  "Manual review required",
  "Payment pending verification",
  "Public pledge",
] as const;

const DURATION_FILTERS = [
  "One meal",
  "A few meals",
  "One day",
  "A few days",
  "30 days",
  "3 months",
  "6 months",
  "12 months",
  "Open-ended",
] as const;

const SORT_FILTER_CHIPS = [
  { label: "Newest", value: "newest" },
  { label: "Review-ready first", value: "reviewed" },
  { label: "Closest template fit", value: "template-fit" },
] as const;

const DIRECTORY_TABS = [
  { label: "Live offers", value: "live" },
  { label: "Create from template", value: "templates" },
  { label: "Worked examples", value: "worked_examples" },
  { label: "Demo data", value: "demo" },
  { label: "Common Ground Budget", value: "public_goods" },
] as const;

const MARKETPLACE_BOOTSTRAP_TABS = [
  "live",
  "templates",
  "worked_examples",
  "demo",
  "public_goods",
] as const;

const FORMAT_FILTERS = [
  { label: "Pledge swap", value: "pledge" },
  { label: "Donation offset", value: "offset" },
  { label: "Paid action (deferred)", value: "payment" },
  { label: "Public-good contribution", value: "public-good" },
] as const;

const REVIEW_STATUS_FILTERS = [
  { label: "Any review status", value: "all" },
  { label: "Live offer", value: "live" },
  { label: "Worked example", value: "worked-example" },
  { label: "Manual review required", value: "manual-review-required" },
] as const;

const CAUSE_GROUPS = [
  { id: "global-poverty", label: "Global poverty" },
  { id: "animal-welfare", label: "Animal welfare" },
  { id: "climate", label: "Climate" },
  { id: "existential-risk", label: "Existential risk" },
  { id: "future-flourishing", label: "Future flourishing" },
  { id: "public-health", label: "Public health" },
] as const;

type PublicDirectoryView = (typeof DIRECTORY_TABS)[number]["value"];
type DirectoryView = PublicDirectoryView | "all";
type DirectorySort = (typeof SORT_FILTER_CHIPS)[number]["value"];
type ListingFormat = (typeof FORMAT_FILTERS)[number]["value"];
type ReviewStatusFilter = (typeof REVIEW_STATUS_FILTERS)[number]["value"];
type LayoutView = "grid" | "list";

interface MarketplaceListing {
  id: string;
  source: "live" | "example";
  mode: "pledge" | "offset" | "payment" | "public-good";
  alias: string;
  title: string;
  offering: string;
  actionEvidence: string;
  baselineBondBadge: string | null;
  baselineConfidence: string;
  externalityReview: string;
  scoreConfidence: string;
  requesting: string;
  offeredCause: string;
  requestedCause: string;
  verification: string;
  duration: string;
  reviewFactorCodes: string[];
  reviewNextStep: string;
  reviewStatusReason: string;
  reviewState: string;
  offerImpact: number;
  requestedImpact: number;
  hasReciprocalMatch: boolean;
  href: string;
  launchOrder: number;
  summary: string;
}

const DIRECTORY_VIEW_LABELS: Record<DirectoryView, string> = {
  all: "All listings",
  demo: "Demo data",
  live: "Live offers",
  public_goods: "Common Ground Budget",
  templates: "Create from template",
  worked_examples: "Worked examples",
};

const PUBLIC_GOODS_MODULE = {
  href: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.href,
  label: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.userFacingLabel,
  sourceNote: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.sourceOfTruthNote,
  summary:
    "Public-goods rounds are linked from this marketplace but are not specified, counted, or promoted as live non-public-goods offers.",
} as const;

function readParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readParams(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseDirectoryView(value: string, fallback: DirectoryView = "live"): DirectoryView {
  if (
    value === "live" ||
    value === "templates" ||
    value === "demo" ||
    value === "public_goods" ||
    value === "all"
  ) {
    return value;
  }

  if (value === "examples" || value === "worked-examples" || value === "worked_examples") {
    return "worked_examples";
  }

  if (value === "create" || value === "create-from-template" || value === "create_from_template") {
    return "templates";
  }

  if (
    value === "external_crecm" ||
    value === "crecm" ||
    value === "mpgf" ||
    value === "public-goods" ||
    value === "rounds"
  ) {
    return "public_goods";
  }

  return fallback;
}

function parseFormatFilters(values: readonly string[]): ListingFormat[] {
  return values.filter((value): value is ListingFormat =>
    FORMAT_FILTERS.some((option) => option.value === value),
  );
}

function isPublicGoodsDirectoryIntent(params: {
  formats: readonly ListingFormat[];
  searchQuery: string;
}) {
  if (params.formats.includes("public-good")) {
    return true;
  }

  const normalizedSearch = params.searchQuery.toLowerCase();

  return [
    "moral public goods",
    "public goods",
    "public good",
    "common ground budget",
    "public goods fund",
    "crecm",
    "mpgf",
    "assurance matching",
    "conditional public-good pledge",
    "cross-view funding",
  ].some((token) => normalizedSearch.includes(token));
}

function parseDirectorySort(value: string): DirectorySort {
  if (value === "reviewed") {
    return "reviewed";
  }

  if (value === "template-fit") {
    return "template-fit";
  }

  if (value === "impact") {
    return "reviewed";
  }

  if (value === "efficient" || value === "best-fit") {
    return "template-fit";
  }

  return "newest";
}

function parseReviewStatus(value: string): ReviewStatusFilter {
  return REVIEW_STATUS_FILTERS.some((option) => option.value === value)
    ? (value as ReviewStatusFilter)
    : "all";
}

function parseMinimumScore(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(Math.max(parsed, 1), 10);
}

function parseLayoutView(value: string): LayoutView {
  return value === "list" ? "list" : "grid";
}

function findLabel<TValue extends string | number>(
  options: readonly { label: string; value: TValue }[],
  value: TValue,
) {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

function getEfficiency(listing: MarketplaceListing) {
  return listing.requestedImpact <= 0 ? listing.offerImpact : listing.offerImpact / listing.requestedImpact;
}

function formatListingMode(mode: MarketplaceListing["mode"]) {
  return mode === "public-good" ? "Public-good contribution" : formatMode(mode);
}

function workedCaseToListing(offer: (typeof CANONICAL_WORKED_CASE_OFFERS)[number]): MarketplaceListing {
  const baselineConfidence = getBaselineConfidence(offer);
  const reviewInstrumentation = getOfferReviewCardInstrumentation({
    ...offer,
    currentStatus: "Worked example; manual review required before reliance",
    minCounterpartyImpact: offer.minCounterpartyImpact,
  });

  return {
    actionEvidence: getActionEvidenceSummary(offer),
    alias: offer.alias,
    baselineBondBadge: null,
    baselineConfidence,
    duration: offer.duration,
    externalityReview: getExternalityReviewSummary(offer),
    hasReciprocalMatch: true,
    href: `/offers/examples/${offer.id}`,
    id: offer.id,
    launchOrder: getWorkedExampleLaunchOrder(offer.id),
    mode: offer.mode,
    offeredCause: offer.offeredCause,
    offering: offer.offerAction,
    offerImpact: offer.offerImpact,
    requestedCause: offer.requestedCause,
    requestedImpact: offer.minCounterpartyImpact,
    requesting: offer.requestAction,
    reviewFactorCodes: reviewInstrumentation.factorCodes,
    reviewNextStep: reviewInstrumentation.nextStep,
    reviewStatusReason: reviewInstrumentation.statusReason,
    reviewState: "Worked example; manual review required before reliance",
    scoreConfidence: getScoreConfidence(offer),
    source: "example",
    summary: `A ${offer.duration.toLowerCase()} ${formatMode(offer.mode).toLowerCase()} with ${offer.verification.toLowerCase()} evidence and ${baselineConfidence.toLowerCase()} baseline confidence.`,
    title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
    verification: offer.verification,
  };
}

function liveOfferToListing(offer: OfferRecord): MarketplaceListing {
  const reviewInput = {
    mode: offer.mode,
    verification: offer.verification,
    trustLevel: offer.trust_level,
    baselineAmountUsd: offer.donationOffset ? offer.donationOffset.baseline_amount_cents / 100 : null,
    baselineOpposedCause: offer.donationOffset?.baseline_opposed_cause ?? "",
    evidenceUrl: offer.donationOffset?.evidence_url ?? "",
    moderationStatus: offer.donationOffset?.moderation_status ?? null,
    offeredCause: offer.offered_cause,
    requestedCause: offer.requested_cause,
  };
  const baselineConfidence = getBaselineConfidence(reviewInput);
  const baselineBondStatus = normalizeBaselineBondStatus(
    offer.donationOffset?.baseline_bond_status,
  );
  const reviewInstrumentation = getOfferReviewCardInstrumentation({
    ...reviewInput,
    currentStatus: "Live offer; evidence and baseline review required before reliance",
    offerImpact: offer.offer_impact,
    minCounterpartyImpact: offer.min_counterparty_impact,
  });

  return {
    actionEvidence: getActionEvidenceSummary(reviewInput),
    alias: offer.ownerProfile?.resolvedName ?? offer.owner_alias,
    baselineBondBadge:
      offer.donationOffset && baselineBondStatus === "posted"
        ? formatPostedBaselineBondBadge(
            offer.donationOffset.baseline_bond_amount_cents,
            offer.donationOffset.baseline_bond_currency,
          )
        : null,
    baselineConfidence,
    duration: offer.duration,
    externalityReview: getExternalityReviewSummary(reviewInput),
    hasReciprocalMatch: offer.recommendationCount > 0,
    href: `/offers/${offer.id}`,
    id: offer.id,
    launchOrder: -1,
    mode: offer.mode,
    offeredCause: offer.offered_cause,
    offering: offer.offer_action,
    offerImpact: offer.offer_impact,
    requestedCause: offer.requested_cause,
    requestedImpact: offer.min_counterparty_impact,
    requesting: offer.request_action,
    reviewFactorCodes: reviewInstrumentation.factorCodes,
    reviewNextStep: reviewInstrumentation.nextStep,
    reviewStatusReason: reviewInstrumentation.statusReason,
    reviewState: "Live offer; evidence and baseline review required before reliance",
    scoreConfidence: getScoreConfidence(reviewInput),
    source: "live",
    summary: truncateDescription(offer.notes || `${offer.duration} ${formatMode(offer.mode).toLowerCase()} with named evidence rules and ${baselineConfidence.toLowerCase()} baseline confidence.`, 150),
    title: `${offer.offered_cause} for ${offer.requested_cause}`,
    verification: offer.verification,
  };
}

function listingMatchesSearch(listing: MarketplaceListing, query: string) {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    listing.alias,
    listing.title,
    listing.offering,
    listing.requesting,
    listing.offeredCause,
    listing.requestedCause,
    listing.verification,
    listing.duration,
    listing.reviewState,
  ]
    .join(" ")
    .toLowerCase();

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function listingMatchesCause(listing: MarketplaceListing, cause: string) {
  const normalizedCause = cause.toLowerCase();

  return [listing.offeredCause, listing.requestedCause].some((candidate) =>
    candidate.toLowerCase().includes(normalizedCause),
  );
}

function listingMatchesFilters(
  listing: MarketplaceListing,
  filters: {
    causes: readonly string[];
    duration: string;
    formats: readonly ListingFormat[];
    minImpact: number | null;
    minRequestedImpact: number | null;
    reciprocal: boolean;
    reviewStatus: ReviewStatusFilter;
    searchQuery: string;
    verification: string;
    view: DirectoryView;
  },
) {
  if (filters.view === "live" && listing.source !== "live") {
    return false;
  }

  if (filters.view === "worked_examples" && listing.source !== "example") {
    return false;
  }

  if (filters.view === "templates" || filters.view === "demo" || filters.view === "public_goods") {
    return false;
  }

  if (filters.formats.length && !filters.formats.includes(listing.mode)) {
    return false;
  }

  if (filters.causes.length && !filters.causes.some((cause) => listingMatchesCause(listing, cause))) {
    return false;
  }

  if (filters.verification && listing.verification !== filters.verification) {
    return false;
  }

  if (filters.duration && listing.duration !== filters.duration) {
    return false;
  }

  if (filters.reviewStatus === "live" && listing.source !== "live") {
    return false;
  }

  if (filters.reviewStatus === "worked-example" && listing.source !== "example") {
    return false;
  }

  if (
    filters.reviewStatus === "manual-review-required" &&
    !listing.reviewState.toLowerCase().includes("manual review")
  ) {
    return false;
  }

  if (filters.minImpact !== null && listing.offerImpact < filters.minImpact) {
    return false;
  }

  if (filters.minRequestedImpact !== null && listing.requestedImpact < filters.minRequestedImpact) {
    return false;
  }

  if (filters.reciprocal && !listing.hasReciprocalMatch) {
    return false;
  }

  return listingMatchesSearch(listing, filters.searchQuery);
}

function sortListings(listings: MarketplaceListing[], sort: DirectorySort) {
  return [...listings].sort((left, right) => {
    if (sort === "reviewed") {
      return (
        Number(right.reviewState.toLowerCase().includes("review")) -
          Number(left.reviewState.toLowerCase().includes("review")) ||
        right.offerImpact - left.offerImpact ||
        left.title.localeCompare(right.title)
      );
    }

    if (sort === "template-fit") {
      return getEfficiency(right) - getEfficiency(left) || right.offerImpact - left.offerImpact;
    }

    if (left.source !== right.source) {
      return left.source === "live" ? -1 : 1;
    }

    if (left.source === "example" && right.source === "example") {
      return left.launchOrder - right.launchOrder || left.title.localeCompare(right.title);
    }

    return left.title.localeCompare(right.title);
  });
}

function buildOffersHref(params: {
  causes?: readonly string[];
  duration?: string;
  formats?: readonly ListingFormat[];
  layout?: LayoutView;
  minImpact?: number | null;
  minRequestedImpact?: number | null;
  reciprocal?: boolean;
  reviewStatus?: ReviewStatusFilter;
  searchQuery?: string;
  sort?: DirectorySort;
  verification?: string;
  view?: DirectoryView;
}) {
  const query = new URLSearchParams();

  if (params.view) query.set("tab", params.view);
  params.formats?.forEach((format) => query.append("mode", format));
  if (params.searchQuery) query.set("search", params.searchQuery);
  params.causes?.forEach((cause) => query.append("cause", cause));
  if (params.verification) query.set("verification", params.verification);
  if (params.duration) query.set("duration", params.duration);
  if (params.reviewStatus && params.reviewStatus !== "all") query.set("review", params.reviewStatus);
  if (params.minImpact) query.set("min_impact", String(params.minImpact));
  if (params.minRequestedImpact) query.set("min_requested", String(params.minRequestedImpact));
  if (params.reciprocal) query.set("reciprocal", "1");
  if (params.layout && params.layout !== "grid") query.set("layout", params.layout);
  if (params.sort && params.sort !== "newest") query.set("sort", params.sort);

  const serialized = query.toString();
  return serialized ? `/offers?${serialized}` : "/offers";
}

function createTabHref(
  view: DirectoryView,
  filters: Parameters<typeof buildOffersHref>[0],
) {
  return buildOffersHref({ ...filters, view });
}

function buildActiveFilterLabels(filters: {
  causes: readonly string[];
  defaultView: DirectoryView;
  directorySort: DirectorySort;
  duration: string;
  formats: readonly ListingFormat[];
  layout: LayoutView;
  minImpact: number | null;
  minRequestedImpact: number | null;
  reciprocal: boolean;
  reviewStatus: ReviewStatusFilter;
  searchQuery: string;
  verification: string;
  view: DirectoryView;
}) {
  const labels: string[] = [];

  if (filters.view !== filters.defaultView) {
    labels.push(DIRECTORY_VIEW_LABELS[filters.view]);
  }

  if (filters.searchQuery) {
    labels.push(`Search: ${filters.searchQuery}`);
  }

  filters.formats.forEach((format) => {
    labels.push(findLabel(FORMAT_FILTERS, format));
  });

  if (filters.causes.length) {
    labels.push(...filters.causes);
  }

  if (filters.layout === "list") {
    labels.push("List view");
  }

  if (filters.verification) {
    labels.push(`Evidence: ${filters.verification}`);
  }

  if (filters.duration) {
    labels.push(`Duration: ${filters.duration}`);
  }

  if (filters.reviewStatus !== "all") {
    labels.push(findLabel(REVIEW_STATUS_FILTERS, filters.reviewStatus));
  }

  if (filters.minImpact !== null) {
    labels.push(`Participant threshold ${filters.minImpact}+`);
  }

  if (filters.minRequestedImpact !== null) {
    labels.push(`Counterparty threshold ${filters.minRequestedImpact}+`);
  }

  if (filters.reciprocal) {
    labels.push("Has reciprocal match");
  }

  if (filters.directorySort !== "newest") {
    labels.push(`Sorted by ${findLabel(SORT_FILTER_CHIPS, filters.directorySort).toLowerCase()}`);
  }

  return labels;
}

function countBy(listings: readonly MarketplaceListing[], predicate: (listing: MarketplaceListing) => boolean) {
  return listings.reduce((count, listing) => (predicate(listing) ? count + 1 : count), 0);
}

function withCount(label: string, count: number) {
  return `${label} (${count})`;
}

function appendUnique<T>(values: readonly T[], value: T) {
  return values.includes(value) ? values : [...values, value];
}

function toggleValue<T>(values: readonly T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getListingModeIcon(mode: MarketplaceListing["mode"]) {
  if (mode === "pledge") return "swap";
  if (mode === "offset") return "offset";
  if (mode === "payment") return "payment";
  return "fund";
}

function getCreateSimilarHref(listing: MarketplaceListing, viewerPresent: boolean) {
  const mode = listing.mode === "public-good" ? "pledge" : listing.mode;
  const exampleParam = listing.source === "example" ? `&example=${listing.id}` : "";
  const target = `/offers/new?mode=${mode}${exampleParam}`;

  return viewerPresent ? target : `/signup?returnTo=${encodeURIComponent(target)}`;
}

function getSeedTemplateHref(templateId: string, viewerPresent: boolean) {
  const target = `/offers/new?template=${encodeURIComponent(templateId)}`;

  return viewerPresent ? target : `/signup?returnTo=${encodeURIComponent(target)}`;
}

function getCauseGroup(listing: MarketplaceListing) {
  return (
    CAUSE_GROUPS.find((group) => listingMatchesCause(listing, group.label)) ?? {
      id: "other-causes",
      label: "Other causes",
    }
  );
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const formMessage = getFormMessage(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams.page);
  const formats = parseFormatFilters([
    ...readParams(resolvedSearchParams, "mode"),
    ...readParams(resolvedSearchParams, "format"),
  ]);
  const searchQuery = readParam(resolvedSearchParams, "search").trim().slice(0, 120);
  const causes = readParams(resolvedSearchParams, "cause").filter((value) =>
    CAUSE_FILTER_CHIPS.includes(value as (typeof CAUSE_FILTER_CHIPS)[number]),
  );
  const verification = readParam(resolvedSearchParams, "verification");
  const duration = readParam(resolvedSearchParams, "duration");
  const reviewStatus = parseReviewStatus(readParam(resolvedSearchParams, "review"));
  const minImpact = parseMinimumScore(readParam(resolvedSearchParams, "min_impact"));
  const minRequestedImpact = parseMinimumScore(readParam(resolvedSearchParams, "min_requested"));
  const reciprocal = readParam(resolvedSearchParams, "reciprocal") === "1";
  const directorySort = parseDirectorySort(readParam(resolvedSearchParams, "sort"));
  const layout = parseLayoutView(readParam(resolvedSearchParams, "layout"));
  const liveMode = formats.length === 1 && formats[0] !== "public-good" ? formats[0] : "all";
  const offersPage = hasSupabaseEnv()
    ? await listOpenOffersPage(page, OFFERS_PAGE_SIZE, liveMode, searchQuery)
    : { items: [], page, pageSize: OFFERS_PAGE_SIZE, hasNextPage: false, hasPreviousPage: page > 1 };
  const liveListings = offersPage.items.map(liveOfferToListing);
  const workedExampleListings = CANONICAL_WORKED_CASE_OFFERS.map(workedCaseToListing);
  const allListings = [...liveListings, ...workedExampleListings];
  const liveOfferCount = liveListings.length;
  const workedExampleCount = workedExampleListings.length;
  const seedRoundProjects = demoMpgfPublicGoodsCampaigns
    .filter((campaign) => campaign.reviewStatus === "approved")
    .slice(0, 7);
  const seedTemplates = REVIEWED_MARKETPLACE_SEED_TEMPLATES;
  const seedTemplateCount: number = seedTemplates.length;
  const seedRoundCount = demoMpgfAssuranceRound.id ? 1 : 0;
  const seedRoundHref = `/mpgf/rounds/${demoMpgfAssuranceRound.id}#common-ground-budget-preview`;
  const publicGoodsRulebook = getMpgfPublicGoodsEcmRulebookReportApi(demoMpgfAssuranceRound.id);
  const publicGoodsAuditBundle = getMpgfCrecV1125AuditBundleApi(demoMpgfAssuranceRound.id);
  const publicGoodsRulebookHref = `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/rulebook`;
  const publicGoodsAuditBundleHref = publicGoodsAuditBundle
    ? `/api/mpgf/rounds/${demoMpgfAssuranceRound.id}/audit-bundle`
    : null;
  const createTemplateHref = viewer ? "/offers/new" : "/signup?returnTo=/offers/new";
  const createDonationOffsetTemplateHref = viewer
    ? "/offers/new?mode=offset"
    : "/signup?returnTo=/offers/new%3Fmode%3Doffset";
  const createPledgeSwapTemplateHref = viewer
    ? "/offers/new?mode=pledge"
    : "/signup?returnTo=/offers/new%3Fmode%3Dpledge";
  const publicGoodsSearchIntent = isPublicGoodsDirectoryIntent({ formats, searchQuery });
  const explicitViewParam = readParam(resolvedSearchParams, "tab") || readParam(resolvedSearchParams, "view");
  const defaultView: DirectoryView = publicGoodsSearchIntent
    ? "public_goods"
    : liveOfferCount > 0
      ? "live"
      : "worked_examples";
  const view = parseDirectoryView(explicitViewParam, defaultView);
  const showPublicGoodsEntryCard = publicGoodsSearchIntent || view === "public_goods";
  const publicGoodsEntry = showPublicGoodsEntryCard
    ? buildPublicGoodsEntryCard({
        liveOfferCount,
        publicGoodsIntent: publicGoodsSearchIntent,
        reviewedSeedTemplateCount: seedTemplateCount,
        workedExampleCount,
      })
    : null;
  const tabCounts: Record<PublicDirectoryView, number> = {
    demo: seedRoundProjects.length,
    live: liveOfferCount,
    public_goods: seedRoundCount,
    templates: seedTemplateCount,
    worked_examples: workedExampleCount,
  };
  const activeFilters = {
    causes,
    duration,
    formats,
    minImpact,
    minRequestedImpact,
    reciprocal,
    reviewStatus,
    searchQuery,
    verification,
    view,
  };
  const filteredListings = sortListings(
    allListings.filter((listing) => listingMatchesFilters(listing, activeFilters)),
    directorySort,
  );
  const filterHrefParams = {
    causes,
    duration,
    formats,
    layout,
    minImpact,
    minRequestedImpact,
    reciprocal,
    reviewStatus,
    searchQuery,
    sort: directorySort,
    verification,
    view,
  };
  const activeFilterLabels = buildActiveFilterLabels({
    causes,
    defaultView,
    directorySort,
    duration,
    formats,
    layout,
    minImpact,
    minRequestedImpact,
    reciprocal,
    reviewStatus,
    searchQuery,
    verification,
    view,
  });
  const activeViewLabel = DIRECTORY_VIEW_LABELS[view];
  const resultCountLabel =
    view === "templates"
      ? `${seedTemplateCount} reviewed ${seedTemplateCount === 1 ? "template" : "templates"}`
      : view === "public_goods"
        ? `${seedRoundCount} Common Ground Budget ${seedRoundCount === 1 ? "module" : "modules"}`
        : view === "demo"
        ? `${seedRoundProjects.length} demo ${seedRoundProjects.length === 1 ? "record" : "records"}`
        : `${filteredListings.length} ${filteredListings.length === 1 ? "listing" : "listings"}`;
  const toolbarResultCountLabel =
    view === "templates"
      ? `Showing ${seedTemplateCount} reviewed ${seedTemplateCount === 1 ? "template" : "templates"} in ${activeViewLabel.toLowerCase()}.`
      : view === "public_goods"
        ? `Showing ${seedRoundCount} linked Common Ground Budget ${seedRoundCount === 1 ? "module" : "modules"}.`
        : `Showing ${filteredListings.length} ${filteredListings.length === 1 ? "result" : "results"} in ${activeViewLabel.toLowerCase()}.`;
  const countScope = allListings.filter((listing) => {
    if (view === "live" && listing.source !== "live") return false;
    if (view === "worked_examples" && listing.source !== "example") return false;
    if (view === "templates" || view === "public_goods" || view === "demo") return false;
    return listingMatchesSearch(listing, searchQuery);
  });
  const formatCounts = FORMAT_FILTERS.map((option) => ({
    ...option,
    count: countBy(countScope, (listing) => listing.mode === option.value),
  }));
  const causeCounts = CAUSE_FILTER_CHIPS.map((option) => ({
    label: option,
    count: countBy(countScope, (listing) => listingMatchesCause(listing, option)),
  }));
  const verificationCounts = VERIFICATION_FILTERS.map((option) => ({
    label: option,
    count: countBy(countScope, (listing) => listing.verification === option),
  }));
  const durationCounts = DURATION_FILTERS.map((option) => ({
    label: option,
    count: countBy(countScope, (listing) => listing.duration === option),
  }));
  const reviewStatusCounts = REVIEW_STATUS_FILTERS.map((option) => ({
    ...option,
    count:
      option.value === "all"
        ? countScope.length
        : countBy(countScope, (listing) => {
            if (option.value === "live") return listing.source === "live";
            if (option.value === "worked-example") return listing.source === "example";
            return listing.reviewState.toLowerCase().includes("manual review");
          }),
  }));
  const visibleFormatCounts = formatCounts.filter(
    (option) => option.count > 0 || formats.includes(option.value),
  );
  const visibleCauseCounts = causeCounts.filter(
    (option) => option.count > 0 || causes.includes(option.label),
  );
  const visibleVerificationCounts = verificationCounts.filter(
    (option) => option.count > 0 || verification === option.label,
  );
  const visibleDurationCounts = durationCounts.filter(
    (option) => option.count > 0 || duration === option.label,
  );
  const visibleReviewStatusCounts = reviewStatusCounts.filter(
    (option) => option.value === "all" || option.count > 0 || reviewStatus === option.value,
  );
  const reciprocalCount = countBy(countScope, (listing) => listing.hasReciprocalMatch);
  const popularFilterLinks = [
    {
      active: causes.includes("Animal welfare"),
      href: buildOffersHref({ ...filterHrefParams, causes: toggleValue(causes, "Animal welfare") }),
      label: "Animal welfare",
    },
    {
      active: formats.includes("offset"),
      href: buildOffersHref({ ...filterHrefParams, formats: toggleValue(formats, "offset") }),
      label: "Verified offsets",
    },
    {
      active: formats.includes("pledge"),
      href: buildOffersHref({ ...filterHrefParams, formats: toggleValue(formats, "pledge") }),
      label: "Bounded pledge swaps",
    },
    {
      active: view === "worked_examples",
      href: createTabHref(view === "worked_examples" ? "live" : "worked_examples", filterHrefParams),
      label: "Worked examples",
    },
    {
      active: view === "templates",
      href: createTabHref(view === "templates" ? "live" : "templates", filterHrefParams),
      label: "Reviewed templates",
    },
    {
      active: reviewStatus === "manual-review-required",
      href: buildOffersHref({
        ...filterHrefParams,
        reviewStatus: reviewStatus === "manual-review-required" ? "all" : "manual-review-required",
      }),
      label: "Manual review required",
    },
  ];
  const bootstrapLanes = [
    {
      value: "live",
      label: "Live offers",
      href: createTabHref("live", filterHrefParams),
      count: String(liveOfferCount),
      status: liveOfferCount ? "Review-gated directory" : "None public yet",
      description:
        "Live offers remain separated from worked examples and still require review before reliance.",
    },
    {
      value: "templates",
      label: "Create from template",
      href: createTabHref("templates", filterHrefParams),
      count: String(seedTemplateCount),
      status: "Draft scaffolds only",
      description:
        "Reviewed donation-offset and micro-pledge templates create bounded drafts, not live offers.",
    },
    {
      value: "worked_examples",
      label: "Worked examples",
      href: createTabHref("worked_examples", filterHrefParams),
      count: String(workedExampleCount),
      status: "Examples only",
      description:
        "Inspect complete example structures without treating them as live liquidity or completed trades.",
    },
    {
      value: "demo",
      label: "Demo data",
      href: createTabHref("demo", filterHrefParams),
      count: String(seedRoundProjects.length),
      status: "Labeled sandbox records",
      description:
        "Demo rounds and seed projects stay clearly labeled and cannot inflate live offer or agreement counts.",
    },
    {
      value: "public_goods",
      label: "Common Ground Budget",
      href: createTabHref("public_goods", filterHrefParams),
      count: String(seedRoundCount),
      status: "Public Goods Fund",
      description:
        "Public-goods rounds stay outside this non-public-goods marketplace brief and route to the Common Ground Budget.",
    },
  ] satisfies Array<{
    value: (typeof MARKETPLACE_BOOTSTRAP_TABS)[number];
    label: string;
    href: string;
    count: string;
    status: string;
    description: string;
  }>;
  const groupedListings = filteredListings.reduce<
    Array<{ id: string; label: string; listings: MarketplaceListing[] }>
  >((groups, listing) => {
    const group = getCauseGroup(listing);
    const existing = groups.find((candidate) => candidate.id === group.id);

    if (existing) {
      existing.listings.push(listing);
    } else {
      groups.push({ ...group, listings: [listing] });
    }

    return groups;
  }, []);
  const relevantWorkedExamples = workedExampleListings.filter((listing) => {
    const matchesSelectedCause =
      !causes.length || causes.some((cause) => listingMatchesCause(listing, cause));
    const matchesSelectedFormat = !formats.length || formats.includes(listing.mode);

    return matchesSelectedCause && matchesSelectedFormat;
  });
  const highlightedWorkedExamples = (relevantWorkedExamples.length
    ? relevantWorkedExamples
    : workedExampleListings
  ).slice(0, 3);
  const exampleMatchesByCause = CAUSE_FILTER_CHIPS.map((causeLabel) => ({
    cause: causeLabel,
    listing: workedExampleListings.find((listing) =>
      [listing.offeredCause, listing.requestedCause].some((candidate) =>
        candidate.toLowerCase().includes(causeLabel.toLowerCase()),
      ),
    ),
  })).filter((entry) => entry.listing);
  const offersStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browse Moral Trade Offers and Worked Examples",
    url: getAbsoluteUrl("/offers"),
    description:
      "Live offers and worked examples that state actions, reciprocal requests, evidence, and baseline confidence.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: filteredListings.slice(0, 20).map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(listing.href),
        name: listing.title,
        description: truncateDescription(`${listing.offering} Requested: ${listing.requesting}`, 140),
      })),
    },
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse offers",
        item: getAbsoluteUrl("/offers"),
      },
    ],
  };

  return (
    <div className="page-shell page-shell-focused">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offersStructuredData),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="collection-header offers-collection-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/offers", label: "Browse offers" }]} />

        <div className="collection-header-body">
          <section className="collection-header-copy">
            <h1>Browse offers</h1>
            <p className="hero-text">
              {publicGoodsSearchIntent
                ? "Public-goods searches open the Common Ground Budget result before ordinary offer listings."
                : "Explore live offers, reviewed templates, worked examples, demo data, and the Common Ground Budget public-goods module without mixing their counts."}
            </p>
            {publicGoodsSearchIntent ? (
              <Link className="button button-primary public-goods-primary-action" href={publicGoodsEntry?.primaryCta.href ?? seedRoundHref}>
                {publicGoodsEntry?.primaryCta.label ?? "Preview a Common Ground Budget"}
              </Link>
            ) : null}
            {publicGoodsSearchIntent ? null : (
              <div className="collection-stats" aria-label="Marketplace counts">
                <span>
                  <strong>{liveOfferCount}</strong> live {liveOfferCount === 1 ? "offer" : "offers"}
                </span>
                <span>
                  <strong>{workedExampleCount}</strong> worked{" "}
                  {workedExampleCount === 1 ? "example" : "examples"}
                </span>
                <span>
                  <strong>{seedRoundCount}</strong> Common Ground Budget{" "}
                  {seedRoundCount === 1 ? "module" : "modules"}
                </span>
                <span>
                  <strong>{seedRoundProjects.length}</strong> demo{" "}
                  {seedRoundProjects.length === 1 ? "record" : "records"}
                </span>
                <span>
                  <strong>{seedTemplateCount}</strong> reviewed{" "}
                  {seedTemplateCount === 1 ? "template" : "templates"}
                </span>
              </div>
            )}
          </section>

          {publicGoodsSearchIntent ? null : (
          <aside className="collection-action-panel panel" aria-label="Collection actions">
            <div className="collection-action-copy">
              <strong>
                {publicGoodsSearchIntent
                  ? "Common Ground Budget result available."
                  : defaultView === "worked_examples"
                    ? "Examples are first today."
                    : "Live offers are ready."}
              </strong>
              <p>
                {publicGoodsSearchIntent
                  ? "Public-goods searches open the Common Ground Budget entry before ordinary offer listings."
                  : defaultView === "worked_examples"
                    ? "The live directory has no public offers yet, so this page opens on reviewed examples that show the expected structure."
                    : "Start with live offers, then inspect examples when you want to understand the evidence model."}
              </p>
            </div>
            <div className="hero-actions">
              {publicGoodsSearchIntent ? (
                <>
                  <Link className="button button-primary" href={publicGoodsEntry?.primaryCta.href ?? seedRoundHref}>
                    {publicGoodsEntry?.primaryCta.label ?? "Preview a Common Ground Budget"}
                  </Link>
                  {publicGoodsEntry?.secondaryCtas.map((action) => (
                    <Link className="button button-secondary" href={action.href} key={action.key}>
                      {action.label}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                    Create an offer
                  </Link>
                  <Link className="button button-secondary" href={viewer ? "/dashboard#saved-searches" : "/login?returnTo=/dashboard"}>
                    Save search
                  </Link>
                </>
              )}
            </div>
          </aside>
          )}
        </div>

        {publicGoodsSearchIntent ? null : (
        <details className="pilot-note panel">
          <summary>About this pilot</summary>
          <p>
            Moral Trade currently prioritizes donation offsets and bounded non-public-goods pledge
            swaps on this page because they have clearer baselines, evidence, and review states.
            {" "}
            {MARKETPLACE_PUBLIC_GOODS_BOUNDARY.sourceOfTruthNote}
          </p>
          <div className="pilot-note-links">
            <Link className="text-button" href="/donation-offsets">
              Offset guide
            </Link>
            <Link className="text-button" href="/validation">
              Validation rules
            </Link>
          </div>
        </details>
        )}
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {showPublicGoodsEntryCard ? (
          <section
            className="marketplace-bootstrap panel"
            data-primary-result="common-ground-budget"
            id="public-goods-result-card"
            aria-describedby="public-goods-result-announcement public-goods-result-summary"
            aria-labelledby="public-goods-intent-heading"
            aria-live="polite"
          >
            <p className="sr-only" id="public-goods-result-announcement" role="status" aria-live="polite">
              Common Ground Budget result available.
            </p>
            <div className="marketplace-bootstrap-head">
              <div>
                <p className="eyebrow">{publicGoodsEntry?.eyebrow ?? "Public Goods Fund"}</p>
                <h2 id="public-goods-intent-heading">
                  {publicGoodsEntry?.label ?? "Common Ground Budget"}
                </h2>
                <p>No ordinary moral-trade offers match this search.</p>
                <p>
                  The moral-public-goods route is separate: Common Ground Budget / Public Goods
                  Fund.
                </p>
                <p id="public-goods-result-summary">
                  {publicGoodsEntry?.summary ??
                    "Fund public goods only if enough different-view support joins. No charge now. Exact live progress may be hidden until the round closes."}
                </p>
                <p>
                  Projects must pass threshold, review, challenge, payment, and authorization
                  gates. This search card only chooses presentation and CTA order; it does not
                  create, edit, clear, authorize, capture, release, reward, credit, certify, or
                  audit any CRECM record.
                </p>
                <p>
                  Search terms, clicks, browsing, and CTA selection do not infer allocatable
                  project stances or create a pledge. Review, identity, payment, authorization,
                  sponsor, sealed-progress, failure-bonus, reward, credit, certificate, and audit
                  gates still apply.
                </p>
                <p>
                  The Common Ground Budget path keeps live progress sealed before close, makes no
                  escrow or custody claim unless a valid custody route records one, separates gross,
                  fee, net-recipient, actual, counted, and match-eligible accounting channels, and
                  requires final review before any binding budget or project stance is saved.
                </p>
                <p>
                  It makes no payment-protection, tax-treatment, legal-advice, impact-certainty,
                  guaranteed-match, or capture-timing claim beyond the recorded CRECM state.
                </p>
              </div>
            </div>
            <div className="tag-row" aria-label="Common Ground Budget text status labels">
              <span className="badge badge-secondary">
                {publicGoodsEntry?.mechanismVersion ?? MARKETPLACE_PUBLIC_GOODS_BOUNDARY.mechanismVersion}
              </span>
              {(publicGoodsEntry?.statusChips ?? [
                "Capped pilot preview",
                "No charge now",
                "No escrow claim",
                "Sealed progress before close",
                "Separated accounting",
                "Final review consent",
              ]).map((chip) => (
                <span className="badge badge-secondary" key={chip}>
                  {chip}
                </span>
              ))}
              <span className="badge badge-secondary">Review gates required</span>
            </div>
            <dl className="mpgf-summary-grid" aria-label="Common Ground Budget search-result summary">
              <div>
                <dt>Current mode</dt>
                <dd>capped pilot</dd>
              </div>
              <div>
                <dt>No charge in this preview</dt>
                <dd>disabled</dd>
              </div>
              <div>
                <dt>Current safe action</dt>
                <dd>preview budget</dd>
              </div>
              <div>
                <dt>Current round state</dt>
                <dd>open preview</dd>
              </div>
              <div>
                <dt>Qualitative progress</dt>
                <dd>Needs more support</dd>
              </div>
              <div>
                <dt>Candidate projects</dt>
                <dd>{seedRoundProjects.length}</dd>
              </div>
              <div>
                <dt>Sponsor pools</dt>
                <dd>{demoMpgfMatchPool.budgetCents > 0 ? "backed" : "not backed"}</dd>
              </div>
              <div>
                <dt>Capture enabled</dt>
                <dd>disabled</dd>
              </div>
              <div>
                <dt>Accounting lanes</dt>
                <dd>gross, fee, net-recipient, actual, counted, and match-eligible kept separate</dd>
              </div>
              <div>
                <dt>Consent boundary</dt>
                <dd>Budget to Projects to Review; no binding save before final review</dd>
              </div>
            </dl>
            <div className="marketplace-bootstrap-actions">
              {publicGoodsEntry?.secondaryCtas.map((action) => (
                <Link className="button button-secondary" href={action.href} key={action.key}>
                  {action.label}
                </Link>
              ))}
              <Link className="button button-secondary" href="/offers?tab=live">
                Browse ordinary offers instead
              </Link>
            </div>
            <details className="pilot-note" aria-label="Collapsed separated-lane drawer for public-goods search">
              <summary>Browse separated lanes</summary>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Live offers</dt>
                  <dd>{liveOfferCount}</dd>
                </div>
                <div>
                  <dt>Reviewed templates</dt>
                  <dd>{seedTemplateCount}</dd>
                </div>
                <div>
                  <dt>Worked examples</dt>
                  <dd>{workedExampleCount}</dd>
                </div>
                <div>
                  <dt>Demo records</dt>
                  <dd>{seedRoundProjects.length}</dd>
                </div>
                <div>
                  <dt>Public-goods module</dt>
                  <dd>{seedRoundCount}</dd>
                </div>
              </dl>
            </details>
            <details className="pilot-note" aria-label="Collapsed advanced Common Ground Budget audit details">
              <summary>Advanced details</summary>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Lane counts</dt>
                  <dd>shown separately; no merged marketplace count</dd>
                </div>
                <div>
                  <dt>Live offers lane</dt>
                  <dd>{liveOfferCount}</dd>
                </div>
                <div>
                  <dt>Reviewed templates lane</dt>
                  <dd>{seedTemplateCount}</dd>
                </div>
                <div>
                  <dt>Worked examples lane</dt>
                  <dd>{workedExampleCount}</dd>
                </div>
                <div>
                  <dt>Demo records lane</dt>
                  <dd>{seedRoundProjects.length}</dd>
                </div>
                <div>
                  <dt>Public-goods module lane</dt>
                  <dd>{seedRoundCount}</dd>
                </div>
                <div>
                  <dt>Rulebook hash</dt>
                  <dd>{publicGoodsRulebook?.calcHash ?? "unavailable"}</dd>
                </div>
                <div>
                  <dt>Calculation version</dt>
                  <dd>{publicGoodsRulebook?.clearingContract.policy ?? "crecm_v1_125"}</dd>
                </div>
                <div>
                  <dt>Deployment mode</dt>
                  <dd>capped pilot</dd>
                </div>
                <div>
                  <dt>Audit bundle</dt>
                  <dd>
                    {publicGoodsAuditBundleHref ? (
                      <Link href={publicGoodsAuditBundleHref}>Audit bundle contract</Link>
                    ) : (
                      "Final audit bundle not available before close"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Rulebook report</dt>
                  <dd>
                    <Link href={publicGoodsRulebookHref}>View current rulebook report</Link>
                  </dd>
                </div>
              </dl>
              <p>
                Public exact threshold, counterparty, supporter, active-cluster, and
                success-without-me progress stays sealed before close.
              </p>
            </details>
          </section>
        ) : null}

        {showPublicGoodsEntryCard ? null : (
        <section className="marketplace-bootstrap panel" aria-labelledby="marketplace-bootstrap-heading">
          <div className="marketplace-bootstrap-head">
            <div>
              <p className="eyebrow">Common Ground Marketplace</p>
              <h2 id="marketplace-bootstrap-heading">Start from live offers, reviewed templates, worked examples, demo data, or the Common Ground Budget.</h2>
              <p>
                Live, template, worked-example, demo, and public-goods module surfaces stay
                separated so the marketplace can build liquidity without implying custody, escrow,
                completed trades, or automated clearing.
              </p>
            </div>
            <Link className="button button-primary" href={PUBLIC_GOODS_MODULE.href}>
              Open Common Ground Budget
            </Link>
          </div>

          <nav className="marketplace-tabs marketplace-bootstrap-tabs" aria-label="Marketplace lanes" role="tablist">
            {bootstrapLanes.map((lane) => (
              <Link className="marketplace-tab" href={lane.href} key={lane.label}>
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </nav>

          <div className="marketplace-bootstrap-grid">
            <article className="marketplace-bootstrap-card marketplace-bootstrap-card-primary">
              <p className="eyebrow">Public Goods Fund</p>
              <h3>{demoMpgfAssuranceRound.name}</h3>
              <p>
                {PUBLIC_GOODS_MODULE.sourceNote} {seedRoundProjects.length} admin-reviewed
                public-good projects are available for no-capture budget preview in that separate
                module. Settlement remains sandboxed until later release gates pass.
              </p>
              <dl className="mpgf-summary-grid" aria-label="Seed round snapshot">
                <div>
                  <dt>Round closes</dt>
                  <dd>{new Date(demoMpgfAssuranceRound.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</dd>
                </div>
                <div>
                  <dt>Small starter budget</dt>
                  <dd>{formatUsd(2_500)}</dd>
                </div>
                <div>
                  <dt>No charge in this preview</dt>
                  <dd>disabled</dd>
                </div>
              </dl>
              <ul className="marketplace-bootstrap-projects" aria-label="Seed round projects">
                {seedRoundProjects.slice(0, 3).map((campaign) => (
                  <li key={campaign.id}>
                    <span>{campaign.title}</span>
                    <strong>{formatUsd(campaign.thresholdAmountCents)} threshold</strong>
                  </li>
                ))}
              </ul>
              <div className="marketplace-bootstrap-actions">
                <Link className="button button-primary" href={seedRoundHref}>
                  Preview budget
                </Link>
                <Link className="button button-secondary" href={PUBLIC_GOODS_MODULE.href}>
                  View Public Goods Fund
                </Link>
              </div>
            </article>

            <article className="marketplace-bootstrap-card">
              <p className="eyebrow">Template lane</p>
              <h3>Create from template</h3>
              <p>
                {REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT} admin-reviewed donation-offset
                templates and {REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT} micro-pledge swap
                templates are visible, but remain draft or preview-only until review and later
                release gates approve reliance.
              </p>
              <ul className="marketplace-bootstrap-projects" aria-label="Reviewed seed templates">
                {seedTemplates.map((template) => (
                  <li key={template.id}>
                    <span>
                      <Link href={getSeedTemplateHref(template.id, Boolean(viewer))}>
                        {template.prefill.title}
                      </Link>
                    </span>
                    <strong>{template.formatLabel}</strong>
                  </li>
                ))}
              </ul>
              <div className="marketplace-bootstrap-actions">
                <Link className="button button-primary button-mini" href={createTemplateHref}>
                  Start template
                </Link>
                <Link className="button button-secondary button-mini" href={createDonationOffsetTemplateHref}>
                  Donation offset
                </Link>
                <Link className="button button-secondary button-mini" href={createPledgeSwapTemplateHref}>
                  Pledge swap
                </Link>
              </div>
            </article>

            <article className="marketplace-bootstrap-card">
              <p className="eyebrow">Directory state</p>
              <h3>Live offers are separate from examples</h3>
              <p>
                The live directory currently has {liveOfferCount} public {liveOfferCount === 1 ? "offer" : "offers"}.
                Worked examples stay in their own lane and do not count as agreements.
              </p>
              <div className="marketplace-bootstrap-actions">
                <Link className="button button-secondary button-mini" href={createTabHref("live", filterHrefParams)}>
                  Live offers
                </Link>
                <Link className="button button-secondary button-mini" href={createTabHref("worked_examples", filterHrefParams)}>
                  Worked examples
                </Link>
              </div>
            </article>
          </div>
        </section>
        )}

        <section className="marketplace-shell" aria-label="Offer marketplace">
          <div className="marketplace-tabs" role="tablist" aria-label="Directory view">
            {DIRECTORY_TABS.map((tab) => (
              <Link
                aria-current={view === tab.value ? "page" : undefined}
                className={`marketplace-tab ${view === tab.value ? "is-active" : ""}`}
                href={createTabHref(tab.value, filterHrefParams)}
                key={tab.value}
              >
                <span>{tab.label}</span>
                <strong>{tabCounts[tab.value]}</strong>
              </Link>
            ))}
          </div>

          <form action="/offers" className="marketplace-search marketplace-search-wide marketplace-search-with-category" role="search">
            {showPublicGoodsEntryCard ? (
              <>
                <label className="field marketplace-search-field">
                  <span>Search public-goods funding</span>
                  <input
                    defaultValue={searchQuery || "moral public goods"}
                    name="search"
                    placeholder="Search public-goods funding"
                    type="search"
                  />
                </label>
                <label className="field marketplace-category-field">
                  <span>Deployment mode</span>
                  <select name="publicGoodsDeploymentMode" defaultValue="any">
                    <option value="any">Any</option>
                    <option value="shadow">Shadow</option>
                    <option value="capped_pilot">Capped pilot</option>
                    <option value="full">Full</option>
                  </select>
                </label>
                <label className="field marketplace-format-field">
                  <span>Round state</span>
                  <select name="publicGoodsRoundState" defaultValue="open">
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="cleared">Cleared</option>
                    <option value="payable">Payable</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="field marketplace-review-field">
                  <span>Project bucket</span>
                  <select name="publicGoodsProjectBucket" defaultValue="any">
                    <option value="any">Any</option>
                    <option value="global_health">Global health</option>
                    <option value="animal_welfare">Animal welfare</option>
                    <option value="long_run_future">Long-run future</option>
                    <option value="public_interest_knowledge">Public-interest knowledge</option>
                    <option value="institutional_resilience">Institutional resilience</option>
                  </select>
                </label>
                <label className="field marketplace-sort-field">
                  <span>Review state</span>
                  <select name="publicGoodsReviewState" defaultValue="any">
                    <option value="any">Any</option>
                    <option value="clear">Clear</option>
                    <option value="needs_review">Needs review</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="field marketplace-search-field">
                  <span>Search offers</span>
                  <input
                    defaultValue={searchQuery}
                    name="search"
                    placeholder="Search offers or cause areas"
                    type="search"
                  />
                </label>
                <label className="field marketplace-category-field">
                  <span>Cause</span>
                  <select name="cause" defaultValue={causes[0] ?? ""}>
                    <option value="">All causes</option>
                    {visibleCauseCounts.map((option) => (
                      <option key={option.label} value={option.label}>
                        {withCount(option.label, option.count)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field marketplace-format-field">
                  <span>Format</span>
                  <select name="mode" defaultValue={formats[0] ?? ""}>
                    <option value="">All formats</option>
                    {visibleFormatCounts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {withCount(option.label, option.count)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field marketplace-review-field">
                  <span>Review state</span>
                  <select name="review" defaultValue={reviewStatus}>
                    {visibleReviewStatusCounts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {withCount(option.label, option.count)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field marketplace-sort-field">
                  <span>Sort</span>
                  <select name="sort" defaultValue={directorySort}>
                    {SORT_FILTER_CHIPS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <input name="tab" type="hidden" value={view} />
            {formats.slice(1).map((selectedFormat) => (
              <input key={selectedFormat} name="mode" type="hidden" value={selectedFormat} />
            ))}
            {causes.slice(1).map((selectedCause) => (
              <input key={selectedCause} name="cause" type="hidden" value={selectedCause} />
            ))}
            {verification ? <input name="verification" type="hidden" value={verification} /> : null}
            {duration ? <input name="duration" type="hidden" value={duration} /> : null}
            {minImpact ? <input name="min_impact" type="hidden" value={minImpact} /> : null}
            {minRequestedImpact ? <input name="min_requested" type="hidden" value={minRequestedImpact} /> : null}
            {reciprocal ? <input name="reciprocal" type="hidden" value="1" /> : null}
            {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

          <div className="marketplace-reliance-strip" aria-label="Worked example reliance guidance">
            <div>
              <IconMark name="safety" />
              <span>
                <strong>Worked example, not live liquidity</strong>
                <small>These are past or simulated agreements for learning.</small>
              </span>
            </div>
            <div>
              <IconMark name="review" />
              <span>
                <strong>Manual review before reliance</strong>
                <small>Review terms and evidence before adapting an example.</small>
              </span>
            </div>
          </div>

          <div className="toolbar-utility-row" aria-label="Result display controls">
            <p className="toolbar-result-count" role="status" aria-live="polite">
              {toolbarResultCountLabel}
            </p>
            <div className="view-toggle" aria-label="Listing layout">
              <Link
                aria-current={layout === "grid" ? "page" : undefined}
                className={layout === "grid" ? "is-active" : ""}
                href={buildOffersHref({ ...filterHrefParams, layout: "grid" })}
                title="Grid view"
              >
                <span aria-hidden="true" className="view-toggle-icon view-toggle-icon-grid" />
                <span className="sr-only">Grid view</span>
              </Link>
              <Link
                aria-current={layout === "list" ? "page" : undefined}
                className={layout === "list" ? "is-active" : ""}
                href={buildOffersHref({ ...filterHrefParams, layout: "list" })}
                title="List view"
              >
                <span aria-hidden="true" className="view-toggle-icon view-toggle-icon-list" />
                <span className="sr-only">List view</span>
              </Link>
            </div>
          </div>

          <div className="popular-filter-row" aria-label="Popular marketplace filters">
            <span>Popular filters</span>
            <div>
              {popularFilterLinks.map((filterLink) => (
                <Link
                  aria-current={filterLink.active ? "true" : undefined}
                  className={`source-pill source-pill-link ${filterLink.active ? "is-active" : ""}`}
                  href={filterLink.href}
                  key={filterLink.label}
                >
                  {filterLink.label}
                </Link>
              ))}
            </div>
          </div>

          {activeFilterLabels.length ? (
            <div className="active-filter-bar" aria-label="Active marketplace filters">
              <span>Active filters</span>
              <div>
                {activeFilterLabels.map((label) => (
                  <span className="active-filter-chip" key={label}>
                    {label}
                  </span>
                ))}
              </div>
              <Link className="text-button" href="/offers">
                Reset filters
              </Link>
            </div>
          ) : null}

          <div className="marketplace-directory-layout">
            <FilterSidebar>
                <div className="filter-sidebar-head">
                  <h2>Filters</h2>
                  <Link className="text-button" href="/offers">
                    Clear
                  </Link>
                </div>

                <form action="/offers" className="filter-form" id="offer-filter-form">
                  <input name="tab" type="hidden" value={view} />
                  {searchQuery && !showPublicGoodsEntryCard ? (
                    <input name="search" type="hidden" value={searchQuery} />
                  ) : null}
                  {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}

                  {showPublicGoodsEntryCard ? (
                    <div className="filter-group" aria-label="Search public-goods funding">
                      <label className="field">
                        <span>Search public-goods funding</span>
                        <input
                          name="search"
                          type="search"
                          defaultValue={searchQuery || "moral public goods"}
                        />
                      </label>
                      <label className="field">
                        <span>Deployment mode</span>
                        <select name="publicGoodsDeploymentMode" defaultValue="any">
                          <option value="any">Any</option>
                          <option value="shadow">Shadow</option>
                          <option value="capped_pilot">Capped pilot</option>
                          <option value="full">Full</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Round state</span>
                        <select name="publicGoodsRoundState" defaultValue="open">
                          <option value="open">Open</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="cleared">Cleared</option>
                          <option value="payable">Payable</option>
                          <option value="closed">Closed</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Project bucket</span>
                        <select name="publicGoodsProjectBucket" defaultValue="any">
                          <option value="any">Any</option>
                          <option value="global_health">Global health</option>
                          <option value="animal_welfare">Animal welfare</option>
                          <option value="long_run_future">Long-run future</option>
                          <option value="public_interest_knowledge">Public-interest knowledge</option>
                          <option value="institutional_resilience">Institutional resilience</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Review state</span>
                        <select name="publicGoodsReviewState" defaultValue="any">
                          <option value="any">Any</option>
                          <option value="clear">Clear</option>
                          <option value="needs_review">Needs review</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  <details
                    className="filter-group"
                    aria-label={
                      showPublicGoodsEntryCard
                        ? "Collapsed ordinary-offer filters for public-goods search"
                        : "Directory filters"
                    }
                  >
                    <summary>
                      {showPublicGoodsEntryCard ? "Ordinary-offer filters remain separated" : "Directory filters"}
                    </summary>
                    <div className="filter-drawer-content">
                      <details className="filter-group">
                        <summary>Cause area</summary>
                        <div className="filter-option-list">
                          {visibleCauseCounts.length ? visibleCauseCounts.map((option) => (
                            <label className="check-row" key={option.label}>
                              <input
                                defaultChecked={causes.includes(option.label)}
                                name="cause"
                                type="checkbox"
                                value={option.label}
                              />
                              <span>{withCount(option.label, option.count)}</span>
                            </label>
                          )) : <p className="filter-empty-note">No cause facets available for this view.</p>}
                        </div>
                      </details>

                      <details className="filter-group">
                        <summary>Format</summary>
                        <div className="filter-option-list">
                          {visibleFormatCounts.length ? visibleFormatCounts.map((option) => (
                            <label className="check-row" key={option.value}>
                              <input
                                defaultChecked={formats.includes(option.value)}
                                name="mode"
                                type="checkbox"
                                value={option.value}
                              />
                              <span>{withCount(option.label, option.count)}</span>
                            </label>
                          )) : <p className="filter-empty-note">No formats available for this view.</p>}
                        </div>
                      </details>

                      <details className="filter-group">
                        <summary>Evidence and duration</summary>
                        <label className="field">
                          <span>Verification method</span>
                          <select name="verification" defaultValue={verification}>
                            <option value="">Any verification method</option>
                            {visibleVerificationCounts.map((option) => (
                              <option key={option.label} value={option.label}>
                                {withCount(option.label, option.count)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Duration</span>
                          <select name="duration" defaultValue={duration}>
                            <option value="">Any duration</option>
                            {visibleDurationCounts.map((option) => (
                              <option key={option.label} value={option.label}>
                                {withCount(option.label, option.count)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </details>

                      <details className="filter-group">
                        <summary>Review status</summary>
                        <label className="field">
                          <span>Review status</span>
                          <select name="review" defaultValue={reviewStatus}>
                            {visibleReviewStatusCounts.map((option) => (
                              <option key={option.value} value={option.value}>
                                {withCount(option.label, option.count)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </details>

                      <details className="filter-group">
                        <summary>Reviewer detail thresholds</summary>
                        <label className="field range-field">
                          <span>Participant-stated offer threshold</span>
                          <input
                            aria-describedby="offer-threshold-help"
                            defaultValue={minImpact ?? 0}
                            max="10"
                            min="0"
                            name="min_impact"
                            step="1"
                            type="range"
                          />
                          <small id="offer-threshold-help">
                            Optional reviewer detail; not a public moral score or ranking.
                          </small>
                        </label>
                        <label className="field range-field">
                          <span>Counterparty acceptance threshold</span>
                          <input
                            aria-describedby="counterparty-threshold-help"
                            defaultValue={minRequestedImpact ?? 0}
                            max="10"
                            min="0"
                            name="min_requested"
                            step="1"
                            type="range"
                          />
                          <small id="counterparty-threshold-help">
                            Internal trade parameter only; inspect terms before relying on it.
                          </small>
                        </label>
                      </details>

                      <details className="filter-group">
                        <summary>Match state</summary>
                        <label className="check-row">
                          <input defaultChecked={reciprocal} name="reciprocal" type="checkbox" value="1" />
                          <span>{withCount("Has reciprocal match", reciprocalCount)}</span>
                        </label>
                      </details>
                    </div>
                  </details>

                  <button className="button button-secondary sticky-filter-action" type="submit">
                    Apply filters
                  </button>
                </form>
            </FilterSidebar>

            <section className="marketplace-results" aria-labelledby="results-heading">
              <div className="marketplace-results-head">
                <div>
                  <p className="eyebrow">
                    {view === "templates" || view === "public_goods" || view === "demo"
                      ? "Marketplace lane"
                      : "Directory"}
                  </p>
                  <h2 id="results-heading">{resultCountLabel}</h2>
                </div>
                <p className="results-sort-note">Sorted by {findLabel(SORT_FILTER_CHIPS, directorySort).toLowerCase()}.</p>
              </div>

              {groupedListings.length ? (
                <nav aria-label="Jump to cause group" className="cause-jump-row">
                  {groupedListings.map((group) => (
                    <Link className="source-pill source-pill-link" href={`#${group.id}`} key={group.id}>
                      {group.label} ({group.listings.length})
                    </Link>
                  ))}
                </nav>
              ) : null}

              <div className="listing-groups">
                {view === "templates" ? (
                  <section
                    aria-labelledby="marketplace-templates-heading"
                    className="listing-group marketplace-lane-results"
                    id="marketplace-templates-lane"
                  >
                    <div className="listing-group-head">
                      <h3 id="marketplace-templates-heading">Reviewed non-public-goods templates</h3>
                      <span>{seedTemplateCount} draft scaffolds</span>
                    </div>
                    <article className="marketplace-bootstrap-card">
                      <p className="eyebrow">Template gallery</p>
                      <h4>Create from a reviewed donation-offset or micro-pledge scaffold.</h4>
                      <p>
                        Templates stay non-reliance-bearing until a reviewer approves the frozen
                        preview and the participant completes final-lock confirmation.
                      </p>
                      <dl className="mpgf-summary-grid" aria-label="Template lane snapshot">
                        <div>
                          <dt>Donation offsets</dt>
                          <dd>{REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT}</dd>
                        </div>
                        <div>
                          <dt>Pledge swaps</dt>
                          <dd>{REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT}</dd>
                        </div>
                        <div>
                          <dt>Live offer count</dt>
                          <dd>not counted</dd>
                        </div>
                      </dl>
                      <ul className="marketplace-bootstrap-projects" aria-label="Reviewed template lane records">
                        {seedTemplates.map((template) => (
                          <li key={`template-lane-${template.id}`}>
                            <span>
                              <Link href={getSeedTemplateHref(template.id, Boolean(viewer))}>
                                {template.prefill.title}
                              </Link>
                            </span>
                            <strong>
                              {"microPledgeDefaults" in template
                                ? "Micro-pledge default"
                                : template.formatLabel}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      <div className="marketplace-bootstrap-actions">
                        <Link className="button button-primary" href={createTemplateHref}>
                          Start reviewed template
                        </Link>
                        <Link className="button button-secondary" href={createPledgeSwapTemplateHref}>
                          Micro-pledge swap
                        </Link>
                      </div>
                    </article>
                  </section>
                ) : view === "public_goods" ? (
                  <section
                    aria-labelledby="marketplace-crecm-heading"
                    className="listing-group marketplace-lane-results"
                    id="marketplace-crecm-lane"
                  >
                    <div className="listing-group-head">
                      <h3 id="marketplace-crecm-heading">{PUBLIC_GOODS_MODULE.label}</h3>
                      <span>{seedRoundCount} linked Common Ground Budget module</span>
                    </div>
                    <article className="marketplace-bootstrap-card marketplace-bootstrap-card-primary">
                      <p className="eyebrow">Public Goods Fund scope</p>
                      <h4>{demoMpgfAssuranceRound.name}</h4>
                      <p>
                        {PUBLIC_GOODS_MODULE.summary} {PUBLIC_GOODS_MODULE.sourceNote}
                      </p>
                      <dl className="mpgf-summary-grid" aria-label="Common Ground Budget lane snapshot">
                        <div>
                          <dt>Reviewed projects</dt>
                          <dd>{seedRoundProjects.length}</dd>
                        </div>
                        <div>
                          <dt>No charge in this preview</dt>
                          <dd>disabled</dd>
                        </div>
                        <div>
                          <dt>Escrow or custody claim</dt>
                          <dd>none unless recorded by a valid custody route</dd>
                        </div>
                        <div>
                          <dt>Accounting lanes</dt>
                          <dd>separated; not merged into ordinary-offer counts</dd>
                        </div>
                        <div>
                          <dt>Consent boundary</dt>
                          <dd>final Common Ground Budget review before binding save</dd>
                        </div>
                        <div>
                          <dt>Public offer count</dt>
                          <dd>not counted</dd>
                        </div>
                      </dl>
                      <div className="marketplace-bootstrap-actions">
                        <Link className="button button-primary" href={seedRoundHref}>
                          Preview Common Ground Budget
                        </Link>
                        <Link className="button button-secondary" href={PUBLIC_GOODS_MODULE.href}>
                          Open Public Goods Fund
                        </Link>
                      </div>
                    </article>
                  </section>
                ) : view === "demo" ? (
                  <section
                    aria-labelledby="marketplace-demo-heading"
                    className="listing-group marketplace-lane-results"
                    id="marketplace-demo-lane"
                  >
                    <div className="listing-group-head">
                      <h3 id="marketplace-demo-heading">Demo records</h3>
                      <span>{seedRoundProjects.length} sandbox projects</span>
                    </div>
                    <article className="marketplace-bootstrap-card">
                      <p className="eyebrow">Demo lane</p>
                      <h4>Reviewed seed projects stay labeled as demo data.</h4>
                      <p>
                        These records support inspection of allocation previews and cannot count as
                        live offers, completed agreements, payment volume, or verified liquidity.
                      </p>
                      <ul className="marketplace-bootstrap-projects" aria-label="Demo seed projects">
                        {seedRoundProjects.map((campaign) => (
                          <li key={campaign.id}>
                            <span>{campaign.title}</span>
                            <strong>{formatUsd(campaign.thresholdAmountCents)} threshold</strong>
                          </li>
                        ))}
                      </ul>
                      <div className="marketplace-bootstrap-actions">
                        <Link className="button button-secondary" href="/mpgf">
                          Open demo fund
                        </Link>
                        <Link className="button button-primary" href={seedRoundHref}>
                          Preview round
                        </Link>
                      </div>
                    </article>
                  </section>
                ) : filteredListings.length ? (
                  groupedListings.map((group) => (
                    <section className="listing-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-heading`}>
                      <div className="listing-group-head">
                        <h3 id={`${group.id}-heading`}>{group.label}</h3>
                        <span>{group.listings.length} {group.listings.length === 1 ? "listing" : "listings"}</span>
                      </div>
                      <div className={`listing-grid ${layout === "list" ? "listing-grid-list" : ""}`}>
                        {group.listings.map((listing) => (
                          <OfferCard
                            alias={listing.alias}
                            causeExchange={`${listing.offeredCause} <-> ${listing.requestedCause}`}
                            ctaHref={listing.href}
                            duration={listing.duration}
                            evidence={listing.verification}
                            actionEvidence={listing.actionEvidence}
                            baselineBondBadge={listing.baselineBondBadge}
                            baselineBondTooltip={BASELINE_BOND_TOOLTIP}
                            baselineConfidence={listing.baselineConfidence}
                            externalityReview={listing.externalityReview}
                            key={`${listing.source}-${listing.id}`}
                            modeIcon={getListingModeIcon(listing.mode)}
                            modeLabel={formatListingMode(listing.mode)}
                            offeredAction={listing.offering}
                            offeredScore={listing.offerImpact}
                            primaryActionLabel="View details"
                            requestedAction={listing.requesting}
                            requestedThreshold={listing.requestedImpact}
                            reviewFactorCodes={listing.reviewFactorCodes}
                            reviewNextStep={listing.reviewNextStep}
                            reviewStatusReason={listing.reviewStatusReason}
                            reviewState={listing.reviewState}
                            scoreConfidence={listing.scoreConfidence}
                            secondaryAction={
                              <Link className="button button-secondary button-mini" href={getCreateSimilarHref(listing, Boolean(viewer))}>
                                Create similar
                              </Link>
                            }
                            sourceLabel={listing.source === "live" ? "Live offer" : "Worked example"}
                            summary={listing.summary}
                            title={listing.title}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <>
                    <EmptyState
                      icon="marketplace"
                      actions={
                        <>
                          <Link className="button button-secondary" href="/worked-examples">
                            View worked examples
                          </Link>
                          <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                            Create trade
                          </Link>
                        </>
                      }
                      title={view === "live" ? "No live offers yet." : "No matching listings."}
                    >
                      {view === "live"
                        ? "Browse worked examples or create the first public offer. The live directory is still in pilot mode."
                        : "Reset filters, inspect worked examples, or create a structured offer."}
                    </EmptyState>

                    {view === "live" ? (
                      <section className="empty-example-preview" aria-labelledby="empty-example-preview-heading">
                        <div className="empty-example-preview-head">
                          <div>
                            <p className="eyebrow">Worked examples</p>
                            <h3 id="empty-example-preview-heading">Study the structure before live offers arrive.</h3>
                          </div>
                          <Link className="text-button" href="/worked-examples">
                            Open all examples
                          </Link>
                        </div>
                        <p>
                          These examples are not live liquidity. They show the terms, evidence rules,
                          baseline checks, and review states a public offer would need before anyone relies on it.
                        </p>
                        <div className="compact-listing-grid empty-example-grid">
                          {highlightedWorkedExamples.map((listing) => (
                            <OfferCard
                              alias={listing.alias}
                              causeExchange={`${listing.offeredCause} <-> ${listing.requestedCause}`}
                              ctaHref={listing.href}
                              duration={listing.duration}
                              evidence={listing.verification}
                              actionEvidence={listing.actionEvidence}
                              baselineBondBadge={listing.baselineBondBadge}
                              baselineBondTooltip={BASELINE_BOND_TOOLTIP}
                              baselineConfidence={listing.baselineConfidence}
                              externalityReview={listing.externalityReview}
                              key={`empty-preview-${listing.id}`}
                              modeIcon={getListingModeIcon(listing.mode)}
                              modeLabel={formatListingMode(listing.mode)}
                              offeredAction={listing.offering}
                              offeredScore={listing.offerImpact}
                              primaryActionLabel="View details"
                              requestedAction={listing.requesting}
                              requestedThreshold={listing.requestedImpact}
                              reviewFactorCodes={listing.reviewFactorCodes}
                              reviewNextStep={listing.reviewNextStep}
                              reviewStatusReason={listing.reviewStatusReason}
                              reviewState={listing.reviewState}
                              scoreConfidence={listing.scoreConfidence}
                              secondaryAction={
                                <Link
                                  className="button button-secondary button-mini"
                                  href={getCreateSimilarHref(listing, Boolean(viewer))}
                                >
                                  Create similar
                                </Link>
                              }
                              sourceLabel="Worked example"
                              summary={listing.summary}
                              title={listing.title}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                )}
              </div>

              {offersPage.hasPreviousPage || offersPage.hasNextPage ? (
                <div className="offer-actions">
                  {offersPage.hasPreviousPage ? (
                    <Link
                      className="button button-secondary"
                      href={`${buildOffersHref(filterHrefParams)}${
                        buildOffersHref(filterHrefParams).includes("?") ? "&" : "?"
                      }page=${offersPage.page - 1}`}
                    >
                      Previous page
                    </Link>
                  ) : (
                    <span />
                  )}

                  {offersPage.hasNextPage ? (
                    <Link
                      className="button button-secondary"
                      href={`${buildOffersHref(filterHrefParams)}${
                        buildOffersHref(filterHrefParams).includes("?") ? "&" : "?"
                      }page=${offersPage.page + 1}`}
                    >
                      Next page
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </section>

            <aside className="trust-panel collection-trust-panel panel" aria-labelledby="trust-panel-heading">
              <p className="eyebrow">Before you rely on a listing</p>
              <h2 id="trust-panel-heading">Evidence first, pressure never.</h2>
              <ul className="trust-check-list">
                <li>Voluntary terms only</li>
                <li>Evidence must be named before reliance</li>
                <li>Baseline confidence is separate from action evidence</li>
                <li>Third-party objections can trigger external review</li>
                <li>Review states appear on every card</li>
                <li>No escrow, custody, legal, or tax service</li>
                <li>Safety boundaries apply to every offer</li>
              </ul>
              <div className="trust-links">
                <Link href="/methodology">Methodology</Link>
                <Link href="/reasoning-standards">Evidence standards</Link>
                <Link href="/safety">Safety policy</Link>
              </div>
            </aside>
          </div>
        </section>

        {!viewer ? (
          <section className="section section-subtle marketplace-participation-callout" aria-labelledby="participate-heading">
            <div>
              <p className="eyebrow">Account workspace</p>
              <h2 id="participate-heading">Sign in to save interest and create offers.</h2>
              <p>
                Accounts keep draft terms, saved offers, and evidence workflows separate from public
                worked examples.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href="/signup?returnTo=/offers">
                Create account
              </Link>
              <Link className="button button-secondary" href="/login?returnTo=/offers">
                Sign in
              </Link>
            </div>
          </section>
        ) : null}

        <section className="section section-white" aria-labelledby="example-matches-heading">
          <details className="pilot-info-box panel">
            <summary>
              <span>
                <span className="eyebrow">Pilot mode</span>
                <strong id="example-matches-heading">Illustrative fit ranking</strong>
              </span>
              <span className="pilot-info-box-control">Show examples</span>
            </summary>
            <div className="pilot-info-box-body">
              <p>
                During the seeded pilot, these examples help visitors inspect structure without
                implying real marketplace rankings or live cost-efficiency results.
              </p>
              <div className="data-grid">
                {exampleMatchesByCause.map((entry) => (
                  <article className="panel data-card" key={entry.cause}>
                    <p className="detail-kicker">{entry.cause}</p>
                    <h3>{entry.listing?.title}</h3>
                    <p className="route-text">{entry.listing?.offering}</p>
                    <Link className="text-button" href={`/worked-examples&cause=${encodeURIComponent(entry.cause)}`}>
                      Inspect example
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </details>
        </section>

        <section className="section section-subtle process-link-section" aria-labelledby="process-links-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Due diligence</p>
            <h2 id="process-links-heading">Learn more about evidence and process.</h2>
            <p>
              Marketplace cards summarize terms for scanning. The full methodology and evidence
              standards explain how review works before anyone relies on an offer.
            </p>
          </div>
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/methodology">
              <IconMark name="source" />
              <h3>Methodology</h3>
              <p>How Moral Trade distinguishes voluntary exchange from threats, fraud, and pressure.</p>
            </Link>
            <Link className="panel teaser-card" href="/reasoning-standards">
              <IconMark name="evidence" />
              <h3>Evidence standards</h3>
              <p>How action records, receipts, witnesses, and manual review are presented.</p>
            </Link>
            <Link className="panel teaser-card" href="/validation">
              <IconMark name="review" />
              <h3>Validation rulebook</h3>
              <p>Reviewer scope, evidence states, challenge windows, and proof uniqueness checks.</p>
            </Link>
            <Link className="panel teaser-card" href="/anti-threat-rules">
              <IconMark name="safety" />
              <h3>Anti-threat baseline rules</h3>
              <p>No threat creation, no compensation for newly escalated harmful behavior, and third-party externality review.</p>
            </Link>
            <Link className="panel teaser-card" href="/safety">
              <IconMark name="safety" />
              <h3>Safety policy</h3>
              <p>Boundaries for coercion, harassment, political contribution offsets, and risky asks.</p>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
