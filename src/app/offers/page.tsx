import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  EmptyState,
  IconMark,
  MoralTradeHeroVisual,
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
  title: "Browse moral trade offers",
  description:
    "Browse live Moral Trade proposals and worked examples by cause, format, verification method, and review status.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Browse moral trade offers",
    description:
      "Browse live Moral Trade proposals and worked examples by cause, format, verification method, and review status.",
    url: getAbsoluteUrl("/offers"),
    type: "website",
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

const DURATION_FILTERS = ["3 months", "6 months", "12 months", "Open-ended"] as const;

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
  { label: "Paid action", value: "payment" },
  { label: "Public-good contribution", value: "public-good" },
] as const;

const REVIEW_STATUS_FILTERS = [
  { label: "Any review status", value: "all" },
  { label: "Live offer", value: "live" },
  { label: "Worked example", value: "worked-example" },
  { label: "Manual review required", value: "manual-review-required" },
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

function parseDirectoryView(value: string): DirectoryView {
  if (value === "live" || value === "examples" || value === "all") {
    return value;
  }

  return "live";
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
    href: `/offers?view=examples&search=${encodeURIComponent(offer.alias)}`,
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

  if (params.view && params.view !== "live") query.set("view", params.view);
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

  if (filters.view !== "live") {
    labels.push(filters.view === "examples" ? "Worked examples" : "All listings");
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

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const formMessage = getFormMessage(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams.page);
  const view = parseDirectoryView(readParam(resolvedSearchParams, "view"));
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
  const reciprocalCount = countBy(countScope, (listing) => listing.hasReciprocalMatch);
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
    name: "Browse moral trade offers",
    url: getAbsoluteUrl("/offers"),
    description:
      "Live proposals and worked examples that state actions, reciprocal requests, and verification terms.",
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

  return (
    <div className="page-shell page-shell-focused">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offersStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero marketplace-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/offers", label: "Browse offers" }]} />

        <div className="hero-grid">
          <section className="hero-copy">
            <h1>Browse moral trade offers</h1>
            <p className="hero-text">
              Discover voluntary moral trades that align with your values. Compare proposals by
              cause, impact score, verification method, and review status.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                Create trade
              </Link>
              {!viewer ? (
                <Link className="button button-secondary" href="/login?returnTo=/offers">
                  Sign in to participate
                </Link>
              ) : null}
              <Link className="button button-secondary" href="/offers?view=examples">
                View worked examples
              </Link>
            </div>
          </section>

          <MoralTradeHeroVisual />
        </div>
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
                {tab.label}
              </Link>
            ))}
          </div>

          <form action="/offers" className="marketplace-search marketplace-search-wide marketplace-search-with-category" role="search">
            <label className="field marketplace-search-field">
              <span>Search trades</span>
              <input
                defaultValue={searchQuery}
                name="search"
                placeholder="Search causes, actions, aliases, verification terms"
                type="search"
              />
            </label>
            <label className="field marketplace-category-field">
              <span>Cause</span>
              <select name="cause" defaultValue={causes[0] ?? ""}>
                <option value="">All causes</option>
                {causeCounts.map((option) => (
                  <option key={option.label} value={option.label}>
                    {withCount(option.label, option.count)}
                  </option>
                ))}
              </select>
            </label>
            {view !== "live" ? <input name="view" type="hidden" value={view} /> : null}
            {formats.map((selectedFormat) => (
              <input key={selectedFormat} name="mode" type="hidden" value={selectedFormat} />
            ))}
            {verification ? <input name="verification" type="hidden" value={verification} /> : null}
            {duration ? <input name="duration" type="hidden" value={duration} /> : null}
            {reviewStatus !== "all" ? <input name="review" type="hidden" value={reviewStatus} /> : null}
            {minImpact ? <input name="min_impact" type="hidden" value={minImpact} /> : null}
            {minRequestedImpact ? <input name="min_requested" type="hidden" value={minRequestedImpact} /> : null}
            {reciprocal ? <input name="reciprocal" type="hidden" value="1" /> : null}
            {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}
            {directorySort !== "newest" ? <input name="sort" type="hidden" value={directorySort} /> : null}
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

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
                  {view !== "live" ? <input name="view" type="hidden" value={view} /> : null}
                  {searchQuery ? <input name="search" type="hidden" value={searchQuery} /> : null}
                  {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}

                  <details className="filter-group" open>
                    <summary>Format</summary>
                    <div className="filter-option-list">
                      {formatCounts.map((option) => (
                        <label className="check-row" key={option.value}>
                          <input
                            defaultChecked={formats.includes(option.value)}
                            name="mode"
                            type="checkbox"
                            value={option.value}
                          />
                          <span>{withCount(option.label, option.count)}</span>
                        </label>
                      ))}
                    </div>
                  </details>

                  <details className="filter-group" open>
                    <summary>Cause area</summary>
                    <div className="filter-option-list">
                      {causeCounts.map((option) => (
                        <label className="check-row" key={option.label}>
                          <input
                            defaultChecked={causes.includes(option.label)}
                            name="cause"
                            type="checkbox"
                            value={option.label}
                          />
                          <span>{withCount(option.label, option.count)}</span>
                        </label>
                      ))}
                    </div>
                  </details>

                  <details className="filter-group" open>
                    <summary>Evidence and duration</summary>
                    <label className="field">
                      <span>Verification method</span>
                      <select name="verification" defaultValue={verification}>
                        <option value="">Any verification method</option>
                        {verificationCounts.map((option) => (
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
                        {durationCounts.map((option) => (
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
                        {reviewStatusCounts.map((option) => (
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
                <form action="/offers" className="sort-control">
                  {view !== "live" ? <input name="view" type="hidden" value={view} /> : null}
                  {formats.map((selectedFormat) => (
                    <input key={selectedFormat} name="mode" type="hidden" value={selectedFormat} />
                  ))}
                  {searchQuery ? <input name="search" type="hidden" value={searchQuery} /> : null}
                  {causes.map((selectedCause) => (
                    <input key={selectedCause} name="cause" type="hidden" value={selectedCause} />
                  ))}
                  {verification ? <input name="verification" type="hidden" value={verification} /> : null}
                  {duration ? <input name="duration" type="hidden" value={duration} /> : null}
                  {reviewStatus !== "all" ? <input name="review" type="hidden" value={reviewStatus} /> : null}
                  {minImpact ? <input name="min_impact" type="hidden" value={minImpact} /> : null}
                  {minRequestedImpact ? <input name="min_requested" type="hidden" value={minRequestedImpact} /> : null}
                  {reciprocal ? <input name="reciprocal" type="hidden" value="1" /> : null}
                  {layout !== "grid" ? <input name="layout" type="hidden" value={layout} /> : null}
                  <label className="field compact-field">
                    <span>Sort</span>
                    <select name="sort" defaultValue={directorySort}>
                      {SORT_FILTER_CHIPS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small>Example fit compares offered score with requested threshold.</small>
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    Sort
                  </button>
                </form>
              </div>

              <div className="view-toggle" aria-label="Listing layout">
                <Link
                  aria-current={layout === "grid" ? "page" : undefined}
                  className={layout === "grid" ? "is-active" : ""}
                  href={buildOffersHref({ ...filterHrefParams, layout: "grid" })}
                >
                  Grid
                </Link>
                <Link
                  aria-current={layout === "list" ? "page" : undefined}
                  className={layout === "list" ? "is-active" : ""}
                  href={buildOffersHref({ ...filterHrefParams, layout: "list" })}
                >
                  List
                </Link>
              </div>

              <div className={`listing-grid ${layout === "list" ? "listing-grid-list" : ""}`}>
                {filteredListings.length ? (
                  filteredListings.map((listing) => (
                    <OfferCard
                      alias={listing.alias}
                      causeExchange={`${listing.offeredCause} <-> ${listing.requestedCause}`}
                      ctaHref={listing.href}
                      duration={listing.duration}
                      evidence={listing.verification}
                      key={`${listing.source}-${listing.id}`}
                      modeLabel={formatListingMode(listing.mode)}
                      offeredAction={listing.offering}
                      offeredScore={listing.offerImpact}
                      requestedAction={listing.requesting}
                      requestedThreshold={listing.requestedImpact}
                      reviewState={listing.reviewState}
                      secondaryAction={
                        viewer ? (
                          <Link className="button button-secondary button-mini" href={`${listing.href}#interest`}>
                            Register interest
                          </Link>
                        ) : null
                      }
                      sourceLabel={listing.source === "live" ? "Live offer" : "Worked example"}
                      title={listing.title}
                    />
                  ))
                ) : (
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
                      ? "Browse worked examples or create the first public offer."
                      : "Reset filters, inspect worked examples, or create a structured proposal."}
                  </EmptyState>
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
          <div className="section-head section-head-compact">
            <p className="eyebrow">Pilot mode</p>
            <h2 id="example-matches-heading">Illustrative fit ranking</h2>
            <p>
              During the seeded pilot, these examples help visitors inspect structure without
              implying real marketplace rankings or live cost-efficiency results.
            </p>
          </div>
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
