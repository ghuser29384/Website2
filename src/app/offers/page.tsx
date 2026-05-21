import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listOpenOffersPage, OFFERS_PAGE_SIZE, type OfferRecord } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Explore moral trade offers",
  description:
    "Browse live Moral Trade proposals and worked examples by cause, format, verification method, and review status.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Explore moral trade offers",
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

const IMPACT_FILTER_CHIPS = [
  { label: "Any offered impact", value: null },
  { label: "7+ offered impact", value: 7 },
  { label: "9+ offered impact", value: 9 },
] as const;

const REQUESTED_IMPACT_FILTERS = [
  { label: "Any requested threshold", value: null },
  { label: "6+ requested threshold", value: 6 },
  { label: "8+ requested threshold", value: 8 },
] as const;

const SORT_FILTER_CHIPS = [
  { label: "Newest", value: "newest" },
  { label: "Highest offered impact", value: "impact" },
  { label: "Best offered/requested ratio", value: "efficient" },
] as const;

const DIRECTORY_TABS = [
  { label: "Live offers", value: "live" },
  { label: "Worked examples", value: "examples" },
  { label: "All", value: "all" },
] as const;

const FORMAT_FILTERS = [
  { label: "All formats", value: "all" },
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
type FormatFilter = (typeof FORMAT_FILTERS)[number]["value"];
type ReviewStatusFilter = (typeof REVIEW_STATUS_FILTERS)[number]["value"];

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

function parseFormatFilter(value: string): FormatFilter {
  return FORMAT_FILTERS.some((option) => option.value === value)
    ? (value as FormatFilter)
    : "all";
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

function parseImpact(value: string, allowed: readonly number[]) {
  const parsed = Number.parseInt(value, 10);
  return allowed.includes(parsed) ? parsed : null;
}

function getEfficiency(listing: MarketplaceListing) {
  return listing.requestedImpact <= 0 ? listing.offerImpact : listing.offerImpact / listing.requestedImpact;
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

function listingMatchesFilters(
  listing: MarketplaceListing,
  filters: {
    cause: string;
    duration: string;
    format: FormatFilter;
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

  if (filters.format !== "all" && listing.mode !== filters.format) {
    return false;
  }

  if (
    filters.cause &&
    ![listing.offeredCause, listing.requestedCause].some((cause) =>
      cause.toLowerCase().includes(filters.cause.toLowerCase()),
    )
  ) {
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
  cause?: string;
  duration?: string;
  format?: FormatFilter;
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
  if (params.format && params.format !== "all") query.set("mode", params.format);
  if (params.searchQuery) query.set("search", params.searchQuery);
  if (params.cause) query.set("cause", params.cause);
  if (params.verification) query.set("verification", params.verification);
  if (params.duration) query.set("duration", params.duration);
  if (params.reviewStatus && params.reviewStatus !== "all") query.set("review", params.reviewStatus);
  if (params.minImpact) query.set("min_impact", String(params.minImpact));
  if (params.minRequestedImpact) query.set("min_requested", String(params.minRequestedImpact));
  if (params.reciprocal) query.set("reciprocal", "1");
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

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const formMessage = getFormMessage(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams.page);
  const view = parseDirectoryView(readParam(resolvedSearchParams, "view"));
  const format = parseFormatFilter(readParam(resolvedSearchParams, "mode"));
  const searchQuery = readParam(resolvedSearchParams, "search").trim().slice(0, 120);
  const cause = readParam(resolvedSearchParams, "cause");
  const verification = readParam(resolvedSearchParams, "verification");
  const duration = readParam(resolvedSearchParams, "duration");
  const reviewStatus = parseReviewStatus(readParam(resolvedSearchParams, "review"));
  const minImpact = parseImpact(readParam(resolvedSearchParams, "min_impact"), [7, 9]);
  const minRequestedImpact = parseImpact(readParam(resolvedSearchParams, "min_requested"), [6, 8]);
  const reciprocal = readParam(resolvedSearchParams, "reciprocal") === "1";
  const directorySort = parseDirectorySort(readParam(resolvedSearchParams, "sort"));
  const liveMode = format === "pledge" || format === "offset" || format === "payment" ? format : "all";
  const offersPage = hasSupabaseEnv()
    ? await listOpenOffersPage(page, OFFERS_PAGE_SIZE, liveMode, searchQuery)
    : { items: [], page, pageSize: OFFERS_PAGE_SIZE, hasNextPage: false, hasPreviousPage: page > 1 };
  const liveListings = offersPage.items.map(liveOfferToListing);
  const workedExampleListings = CANONICAL_WORKED_CASE_OFFERS.map(workedCaseToListing);
  const allListings = [...liveListings, ...workedExampleListings];
  const activeFilters = {
    cause,
    duration,
    format,
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
    cause,
    duration,
    format,
    minImpact,
    minRequestedImpact,
    reciprocal,
    reviewStatus,
    searchQuery,
    sort: directorySort,
    verification,
    view,
  };
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
    name: "Explore moral trade offers",
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

        <div className="hero-grid">
          <section className="hero-copy">
            <h1>Explore moral trade offers</h1>
            <p className="hero-text">
              Browse live proposals and worked examples by cause, format, verification method,
              and review status.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                Create trade
              </Link>
              <Link className="button button-secondary" href="/offers?view=examples">
                View worked examples
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Pilot directory</p>
            <p className="route-text">
              Live offers appear only after signed-in participants publish them. Worked examples
              remain clearly labeled and never count as marketplace liquidity.
            </p>
          </aside>
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

          <form action="/offers" className="marketplace-search marketplace-search-wide" role="search">
            <label className="field marketplace-search-field">
              <span>Search trades</span>
              <input
                defaultValue={searchQuery}
                name="search"
                placeholder="Search causes, actions, aliases, verification terms"
                type="search"
              />
            </label>
            {view !== "live" ? <input name="view" type="hidden" value={view} /> : null}
            {format !== "all" ? <input name="mode" type="hidden" value={format} /> : null}
            {cause ? <input name="cause" type="hidden" value={cause} /> : null}
            {verification ? <input name="verification" type="hidden" value={verification} /> : null}
            {duration ? <input name="duration" type="hidden" value={duration} /> : null}
            {reviewStatus !== "all" ? <input name="review" type="hidden" value={reviewStatus} /> : null}
            {minImpact ? <input name="min_impact" type="hidden" value={minImpact} /> : null}
            {minRequestedImpact ? <input name="min_requested" type="hidden" value={minRequestedImpact} /> : null}
            {reciprocal ? <input name="reciprocal" type="hidden" value="1" /> : null}
            {directorySort !== "newest" ? <input name="sort" type="hidden" value={directorySort} /> : null}
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

          <div className="marketplace-directory-layout">
            <details className="filter-sidebar panel" open>
              <summary className="filter-drawer-summary">Filters</summary>
              <div className="filter-sidebar-content" aria-label="Offer filters">
                <div className="filter-sidebar-head">
                  <h2>Filters</h2>
                  <Link className="text-button" href="/offers">
                    Clear
                  </Link>
                </div>

                <label className="field">
                  <span>Trade format</span>
                  <select name="mode" defaultValue={format} form="offer-filter-form">
                    {FORMAT_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <form action="/offers" className="filter-form" id="offer-filter-form">
                  {view !== "live" ? <input name="view" type="hidden" value={view} /> : null}
                  {searchQuery ? <input name="search" type="hidden" value={searchQuery} /> : null}
                  <label className="field">
                    <span>Cause area</span>
                    <select name="cause" defaultValue={cause}>
                      <option value="">All causes</option>
                      {CAUSE_FILTER_CHIPS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Verification method</span>
                    <select name="verification" defaultValue={verification}>
                      <option value="">Any verification method</option>
                      {VERIFICATION_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Duration</span>
                    <select name="duration" defaultValue={duration}>
                      <option value="">Any duration</option>
                      {DURATION_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Review status</span>
                    <select name="review" defaultValue={reviewStatus}>
                      {REVIEW_STATUS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Minimum offered-impact score</span>
                    <select name="min_impact" defaultValue={minImpact ?? ""}>
                      {IMPACT_FILTER_CHIPS.map((option) => (
                        <option key={option.label} value={option.value ?? ""}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Minimum requested-impact threshold</span>
                    <select name="min_requested" defaultValue={minRequestedImpact ?? ""}>
                      {REQUESTED_IMPACT_FILTERS.map((option) => (
                        <option key={option.label} value={option.value ?? ""}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="check-row">
                    <input defaultChecked={reciprocal} name="reciprocal" type="checkbox" value="1" />
                    <span>Has reciprocal match</span>
                  </label>
                  <button className="button button-secondary" type="submit">
                    Apply filters
                  </button>
                </form>
              </div>
            </details>

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
                  {format !== "all" ? <input name="mode" type="hidden" value={format} /> : null}
                  {searchQuery ? <input name="search" type="hidden" value={searchQuery} /> : null}
                  {cause ? <input name="cause" type="hidden" value={cause} /> : null}
                  {verification ? <input name="verification" type="hidden" value={verification} /> : null}
                  {duration ? <input name="duration" type="hidden" value={duration} /> : null}
                  {reviewStatus !== "all" ? <input name="review" type="hidden" value={reviewStatus} /> : null}
                  {minImpact ? <input name="min_impact" type="hidden" value={minImpact} /> : null}
                  {minRequestedImpact ? <input name="min_requested" type="hidden" value={minRequestedImpact} /> : null}
                  {reciprocal ? <input name="reciprocal" type="hidden" value="1" /> : null}
                  <label className="field compact-field">
                    <span>Sort</span>
                    <select name="sort" defaultValue={directorySort}>
                      {SORT_FILTER_CHIPS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    Sort
                  </button>
                </form>
              </div>

              <div className="listing-grid">
                {filteredListings.length ? (
                  filteredListings.map((listing) => (
                    <article className="listing-card panel" key={`${listing.source}-${listing.id}`}>
                      <div className="listing-card-head">
                        <span className="badge">{formatMode(listing.mode === "public-good" ? "pledge" : listing.mode)}</span>
                        <span className="badge badge-secondary">
                          {listing.source === "live" ? "Live offer" : "Worked example"}
                        </span>
                      </div>
                      <h3>{listing.title}</h3>
                      <p className="detail-kicker">{listing.alias}</p>
                      <dl className="listing-terms">
                        <div>
                          <dt>Offering</dt>
                          <dd>{listing.offering}</dd>
                        </div>
                        <div>
                          <dt>Requesting</dt>
                          <dd>{listing.requesting}</dd>
                        </div>
                      </dl>
                      <div className="tag-row">
                        <span className="source-pill">{listing.offeredCause}</span>
                        <span className="source-pill">{listing.requestedCause}</span>
                      </div>
                      <div className="listing-meta">
                        <span>{listing.verification}</span>
                        <span>{listing.duration}</span>
                        <span>{listing.reviewState}</span>
                      </div>
                      <Link className="text-button" href={listing.href}>
                        Inspect terms
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="empty-state marketplace-empty-state">
                    <div>
                      <strong>No live offers yet.</strong>
                      <p>
                        You can inspect worked examples or create the first public offer.
                      </p>
                      <div className="hero-actions">
                        <Link className="button button-secondary" href="/offers?view=examples">
                          View worked examples
                        </Link>
                        <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup?returnTo=/offers/new"}>
                          Create trade
                        </Link>
                      </div>
                    </div>
                  </div>
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

        <section className="section section-white" aria-labelledby="example-matches-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Pilot mode</p>
            <h2 id="example-matches-heading">Example matches by cause</h2>
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
      </main>

      <SiteFooter />
    </div>
  );
}
