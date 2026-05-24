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
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listOpenOffersPage, OFFERS_PAGE_SIZE, type OfferRecord } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
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

const DURATION_FILTERS = ["30 days", "3 months", "6 months", "12 months", "Open-ended"] as const;

const SORT_FILTER_CHIPS = [
  { label: "Newest", value: "newest" },
  { label: "Highest offered impact", value: "impact" },
  { label: "Highest example fit", value: "efficient" },
] as const;

const DIRECTORY_TABS = [
  { label: "Live offers", value: "live" },
  { label: "Worked examples", value: "examples" },
  { label: "All", value: "all" },
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

type DirectoryView = (typeof DIRECTORY_TABS)[number]["value"];
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
  requesting: string;
  offeredCause: string;
  requestedCause: string;
  verification: string;
  duration: string;
  reviewState: string;
  offerImpact: number;
  requestedImpact: number;
  hasReciprocalMatch: boolean;
  href: string;
  summary: string;
}

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
  if (value === "live" || value === "examples" || value === "all") {
    return value;
  }

  return fallback;
}

function parseFormatFilters(values: readonly string[]): ListingFormat[] {
  return values.filter((value): value is ListingFormat =>
    FORMAT_FILTERS.some((option) => option.value === value),
  );
}

function parseDirectorySort(value: string): DirectorySort {
  if (value === "impact" || value === "efficient") {
    return value;
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
  return {
    alias: offer.alias,
    duration: offer.duration,
    hasReciprocalMatch: true,
    href: `/offers/examples/${offer.id}`,
    id: offer.id,
    mode: offer.mode,
    offeredCause: offer.offeredCause,
    offering: offer.offerAction,
    offerImpact: offer.offerImpact,
    requestedCause: offer.requestedCause,
    requestedImpact: offer.minCounterpartyImpact,
    requesting: offer.requestAction,
    reviewState: "Worked example; manual review required before reliance",
    source: "example",
    summary: `A ${offer.duration.toLowerCase()} ${formatMode(offer.mode).toLowerCase()} with ${offer.verification.toLowerCase()} evidence.`,
    title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
    verification: offer.verification,
  };
}

function liveOfferToListing(offer: OfferRecord): MarketplaceListing {
  return {
    alias: offer.ownerProfile?.resolvedName ?? offer.owner_alias,
    duration: offer.duration,
    hasReciprocalMatch: offer.recommendationCount > 0,
    href: `/offers/${offer.id}`,
    id: offer.id,
    mode: offer.mode,
    offeredCause: offer.offered_cause,
    offering: offer.offer_action,
    offerImpact: offer.offer_impact,
    requestedCause: offer.requested_cause,
    requestedImpact: offer.min_counterparty_impact,
    requesting: offer.request_action,
    reviewState: "Live offer; evidence review required before reliance",
    source: "live",
    summary: truncateDescription(offer.notes || `${offer.duration} ${formatMode(offer.mode).toLowerCase()} with named evidence rules.`, 150),
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

  if (filters.view === "examples" && listing.source !== "example") {
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
    if (sort === "impact") {
      return right.offerImpact - left.offerImpact || getEfficiency(right) - getEfficiency(left);
    }

    if (sort === "efficient") {
      return getEfficiency(right) - getEfficiency(left) || right.offerImpact - left.offerImpact;
    }

    return left.source === right.source ? left.title.localeCompare(right.title) : left.source === "live" ? -1 : 1;
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

  if (params.view) query.set("view", params.view);
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
    labels.push(
      filters.view === "examples"
        ? "Worked examples"
        : filters.view === "live"
          ? "Live offers"
          : "All listings",
    );
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
    labels.push(`${filters.minImpact}+ offered impact`);
  }

  if (filters.minRequestedImpact !== null) {
    labels.push(`${filters.minRequestedImpact}+ requested threshold`);
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
  const target = `/offers/new?mode=${mode}`;

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
  const formats = parseFormatFilters(readParams(resolvedSearchParams, "mode"));
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
  const defaultView = liveOfferCount > 0 ? "live" : "examples";
  const view = parseDirectoryView(
    readParam(resolvedSearchParams, "tab") || readParam(resolvedSearchParams, "view"),
    defaultView,
  );
  const tabCounts: Record<DirectoryView, number> = {
    all: allListings.length,
    examples: workedExampleCount,
    live: liveOfferCount,
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
  const countScope = allListings.filter((listing) => {
    if (view === "live" && listing.source !== "live") return false;
    if (view === "examples" && listing.source !== "example") return false;
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
      active: view === "examples",
      href: createTabHref(view === "examples" ? "live" : "examples", filterHrefParams),
      label: "Worked examples",
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
      "Live offers and worked examples that state actions, reciprocal requests, and verification terms.",
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
              Explore live offers and worked examples by cause area, format, evidence method, and
              review state.
            </p>
            <div className="collection-stats" aria-label="Marketplace counts">
              <span>
                <strong>{liveOfferCount}</strong> live {liveOfferCount === 1 ? "offer" : "offers"}
              </span>
              <span>
                <strong>{workedExampleCount}</strong> worked{" "}
                {workedExampleCount === 1 ? "example" : "examples"}
              </span>
            </div>
          </section>

          <aside className="collection-action-panel panel" aria-label="Collection actions">
            <div className="collection-action-copy">
              <strong>{defaultView === "examples" ? "Examples are first today." : "Live offers are ready."}</strong>
              <p>
                {defaultView === "examples"
                  ? "The live directory has no public offers yet, so this page opens on reviewed examples that show the expected structure."
                  : "Start with live offers, then inspect examples when you want to understand the evidence model."}
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                Create an offer
              </Link>
              <Link className="button button-secondary" href={viewer ? "/dashboard#saved-searches" : "/login?returnTo=/dashboard"}>
                Save search
              </Link>
            </div>
          </aside>
        </div>

        <details className="pilot-note panel">
          <summary>About this pilot</summary>
          <p>
            Moral Trade currently prioritizes donation offsets, moral public goods, and bounded
            pledge swaps because they have clearer baselines, evidence, and review states. Paid
            action offers remain deferred while identity, dispute, and compliance workflows mature.
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
            <input name="view" type="hidden" value={view} />
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
            <p className="toolbar-result-count" role="status" aria-live="polite">
              {filteredListings.length} {filteredListings.length === 1 ? "result" : "results"}
            </p>
          </form>

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
                  <input name="view" type="hidden" value={view} />
                  {searchQuery ? <input name="search" type="hidden" value={searchQuery} /> : null}
                  {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}

                  <details className="filter-group" open>
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

                  <details className="filter-group" open>
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

                  <details className="filter-group" open>
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
                    <summary>Impact scores</summary>
                    <label className="field range-field">
                      <span>Minimum offered-impact score</span>
                      <input
                        aria-describedby="offered-impact-help"
                        defaultValue={minImpact ?? 0}
                        max="10"
                        min="0"
                        name="min_impact"
                        step="1"
                        type="range"
                      />
                      <small id="offered-impact-help">0 keeps all listings; higher values narrow the pilot estimate.</small>
                    </label>
                    <label className="field range-field">
                      <span>Minimum requested-impact threshold</span>
                      <input
                        aria-describedby="requested-impact-help"
                        defaultValue={minRequestedImpact ?? 0}
                        max="10"
                        min="0"
                        name="min_requested"
                        step="1"
                        type="range"
                      />
                      <small id="requested-impact-help">Internal estimate only; inspect terms before relying on it.</small>
                    </label>
                  </details>

                  <details className="filter-group">
                    <summary>Match state</summary>
                    <label className="check-row">
                      <input defaultChecked={reciprocal} name="reciprocal" type="checkbox" value="1" />
                      <span>{withCount("Has reciprocal match", reciprocalCount)}</span>
                    </label>
                  </details>

                  <button className="button button-secondary sticky-filter-action" type="submit">
                    Apply filters
                  </button>
                </form>
            </FilterSidebar>

            <section className="marketplace-results" aria-labelledby="results-heading">
              <div className="marketplace-results-head">
                <div>
                  <p className="eyebrow">Directory</p>
                  <h2 id="results-heading">
                    {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"}
                  </h2>
                </div>
                <p className="results-sort-note">Sorted by {findLabel(SORT_FILTER_CHIPS, directorySort).toLowerCase()}.</p>
              </div>

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
                {filteredListings.length ? (
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
                            key={`${listing.source}-${listing.id}`}
                            modeIcon={getListingModeIcon(listing.mode)}
                            modeLabel={formatListingMode(listing.mode)}
                            offeredAction={listing.offering}
                            offeredScore={listing.offerImpact}
                            primaryActionLabel="View details"
                            requestedAction={listing.requesting}
                            requestedThreshold={listing.requestedImpact}
                            reviewState={listing.reviewState}
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
                          <Link className="button button-secondary" href="/offers?view=examples">
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
                        : "Reset filters, inspect worked examples, or create a structured proposal."}
                    </EmptyState>

                    {view === "live" ? (
                      <section className="empty-example-preview" aria-labelledby="empty-example-preview-heading">
                        <div className="empty-example-preview-head">
                          <div>
                            <p className="eyebrow">Worked examples</p>
                            <h3 id="empty-example-preview-heading">Study the structure before live offers arrive.</h3>
                          </div>
                          <Link className="text-button" href="/offers?view=examples">
                            Open all examples
                          </Link>
                        </div>
                        <p>
                          These examples are not live liquidity. They show the terms, evidence rules,
                          and review states a public offer would need before anyone relies on it.
                        </p>
                        <div className="compact-listing-grid empty-example-grid">
                          {highlightedWorkedExamples.map((listing) => (
                            <OfferCard
                              alias={listing.alias}
                              causeExchange={`${listing.offeredCause} <-> ${listing.requestedCause}`}
                              ctaHref={listing.href}
                              duration={listing.duration}
                              evidence={listing.verification}
                              key={`empty-preview-${listing.id}`}
                              modeIcon={getListingModeIcon(listing.mode)}
                              modeLabel={formatListingMode(listing.mode)}
                              offeredAction={listing.offering}
                              offeredScore={listing.offerImpact}
                              primaryActionLabel="View details"
                              requestedAction={listing.requesting}
                              requestedThreshold={listing.requestedImpact}
                              reviewState={listing.reviewState}
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
                <li>Review states appear on every card</li>
                <li>No escrow, custody, legal, or tax service</li>
                <li>Safety boundaries apply to every proposal</li>
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
              <h2 id="participate-heading">Sign in to save interest and create proposals.</h2>
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
                    <Link className="text-button" href={`/offers?view=examples&cause=${encodeURIComponent(entry.cause)}`}>
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
              standards explain how review works before anyone relies on a proposal.
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
