import type { Metadata } from "next";
import Link from "next/link";

import filterStyles from "@/components/discovery/discovery-filters.module.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { EmptyState } from "@/components/ui/page-primitives";
import {
  getViewer,
  listOpenOffersPage,
  OFFERS_PAGE_SIZE,
  type OfferRecord,
} from "@/lib/app-data";
import { categoryForOfferMode, type CredibilitySummary } from "@/lib/credibility";
import { listPublicCredibilityForLookups } from "@/lib/credibility-search";
import {
  collectOfferCauseOptions,
  CREDIT_FILTER_OPTIONS,
  OFFER_ACTION_FILTER_OPTIONS,
  OFFER_DISCOVERY_SORT_OPTIONS,
  OFFER_PAYMENT_FILTER_OPTIONS,
  offerMatchesFilters,
  rankOffers,
  type CreditFilter,
  type OfferActionFilter,
  type OfferDiscoveryFilters,
  type OfferDiscoverySort,
  type OfferPaymentFilter,
} from "@/lib/discovery-ranking";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Explore live proposals",
  description:
    "Explore live Moral Trade proposals with explicit baselines, terms, evidence, payment boundaries, and current review states.",
  alternates: { canonical: "/offers?view=live" },
  openGraph: {
    title: "Explore live Moral Trade proposals",
    description:
      "Browse participant proposals and open their complete terms without mixing examples or explanatory records into marketplace inventory.",
    url: getAbsoluteUrl("/offers?view=live"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface OfferFilterState {
  action: OfferActionFilter;
  cause: string;
  credit: CreditFilter;
  payment: OfferPaymentFilter;
  sort: OfferDiscoverySort;
}

const OFFER_DISCOVERY_LIMIT = 1_000;

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeOption<T extends string>(
  value: string,
  options: ReadonlyArray<{ value: T }>,
  fallback: T,
) {
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    hasNextPage: items.length > offset + pageSize,
    hasPreviousPage: page > 1,
  };
}

function buildLiveHref({
  filters,
  page,
  search,
}: {
  filters?: OfferFilterState;
  page?: number;
  search?: string;
}) {
  const params = new URLSearchParams({ view: "live" });

  if (search) {
    params.set("search", search);
  }

  if (filters?.cause) {
    params.set("cause", filters.cause);
  }
  if (filters && filters.payment !== "any") {
    params.set("payment", filters.payment);
  }
  if (filters && filters.action !== "all") {
    params.set("action", filters.action);
  }
  if (filters && filters.credit !== "any") {
    params.set("credit", filters.credit);
  }
  if (filters && filters.sort !== "match") {
    params.set("sort", filters.sort);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/offers?${params.toString()}`;
}

function formatCreditScore(credibility: CredibilitySummary | undefined) {
  if (!credibility) {
    return "Credit score: Unproven";
  }

  return credibility.score === null
    ? `Credit score: ${credibility.level}`
    : `Credit score ${credibility.score}/100`;
}

function optionLabel<T extends string>(
  value: T,
  options: ReadonlyArray<{ value: T; label: string }>,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function rankingDescription(sort: OfferDiscoverySort, hasSearch: boolean) {
  if (sort === "credit") {
    return "Highest credit prioritizes the confidence-adjusted conservative score, then relevance, evidence completeness, and recency.";
  }
  if (sort === "recent") {
    return "Newest remains primarily chronological; relevance and credit provide only small tie-breakers.";
  }
  if (hasSearch) {
    return "Best match is 70% text relevance and 15% confidence-adjusted credit, with smaller recency and evidence-completeness signals.";
  }
  return "Without a query, Best match emphasizes recent, complete offers; confidence-adjusted credit contributes 20% of ranking.";
}

function LiveProposalCard({
  credibility,
  offer,
}: {
  credibility: CredibilitySummary | undefined;
  offer: OfferRecord;
}) {
  const category = categoryForOfferMode(offer.mode);
  const participantName =
    offer.owner_alias || offer.ownerProfile?.resolvedName || "Participant";

  return (
    <article className="mt-market-card">
      <div className="mt-market-card-head">
        <span className="mt-market-eyebrow">{formatMode(offer.mode)}</span>
        <span className="mt-market-state is-live">Live proposal</span>
      </div>
      <h3>
        {offer.offered_cause}
        <span aria-hidden="true">↔</span>
        {offer.requested_cause}
      </h3>
      <p className="listing-alias">By {participantName}</p>
      <div
        className="tag-row"
        aria-label={`Transaction credit score for ${participantName}`}
        title="Contextual transaction credibility, not a financial credit or moral-worth score"
      >
        <span className="badge">{formatCreditScore(credibility)}</span>
        <span className="source-pill">
          {credibility?.level ?? "Unproven"} · {credibility?.confidence ?? "limited"} confidence
        </span>
        <Link
          className="text-button"
          href={`/people/${offer.owner_id}/credibility?role=committer&category=${category}`}
        >
          View score
        </Link>
      </div>
      <dl>
        <div>
          <dt>Offers</dt>
          <dd>{offer.offer_action}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{offer.request_action}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{offer.verification}</dd>
        </div>
      </dl>
      <div className="mt-market-card-foot">
        <span>{offer.duration}</span>
        <Link href={`/offers/${offer.id}`}>Open proposal ↗</Link>
      </div>
    </article>
  );
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);
  const search = readParam(resolvedSearchParams, "search").trim().slice(0, 120);
  const filters: OfferFilterState = {
    cause: readParam(resolvedSearchParams, "cause").trim().slice(0, 120),
    payment: normalizeOption(
      readParam(resolvedSearchParams, "payment"),
      OFFER_PAYMENT_FILTER_OPTIONS,
      "any",
    ),
    action: normalizeOption(
      readParam(resolvedSearchParams, "action"),
      OFFER_ACTION_FILTER_OPTIONS,
      "all",
    ),
    credit: normalizeOption(
      readParam(resolvedSearchParams, "credit"),
      CREDIT_FILTER_OPTIONS,
      "any",
    ),
    sort: normalizeOption(
      readParam(resolvedSearchParams, "sort"),
      OFFER_DISCOVERY_SORT_OPTIONS,
      "match",
    ),
  };
  const [viewer, candidatePage] = await Promise.all([
    getViewer(),
    hasSupabaseEnv()
      ? listOpenOffersPage(1, OFFER_DISCOVERY_LIMIT, "all", "")
      : Promise.resolve({
          items: [] as OfferRecord[],
          page: 1,
          pageSize: OFFER_DISCOVERY_LIMIT,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
  ]);
  const liveCandidates = candidatePage.items;
  const isAuthenticated = Boolean(viewer);
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const credibilityByOffer = await listPublicCredibilityForLookups(
    liveCandidates.map((offer) => ({
      key: offer.id,
      profileId: offer.owner_id,
      context: {
        role: "committer",
        category: categoryForOfferMode(offer.mode),
      },
    })),
  );
  const discoveryFilters: OfferDiscoveryFilters = {
    action: filters.action,
    cause: filters.cause,
    credit: filters.credit,
    payment: filters.payment,
    search,
  };
  const filteredLiveCandidates = liveCandidates.filter((offer) =>
    offerMatchesFilters(offer, credibilityByOffer.get(offer.id), discoveryFilters),
  );
  const rankedLiveCandidates = rankOffers(
    filteredLiveCandidates,
    credibilityByOffer,
    search,
    filters.sort,
  );
  const livePage = paginate(rankedLiveCandidates, page, OFFERS_PAGE_SIZE);
  const causeOptions = collectOfferCauseOptions(liveCandidates);
  const activeFilterLabels = [
    filters.cause ? `Cause: ${filters.cause}` : null,
    filters.payment !== "any"
      ? optionLabel(filters.payment, OFFER_PAYMENT_FILTER_OPTIONS)
      : null,
    filters.action !== "all"
      ? optionLabel(filters.action, OFFER_ACTION_FILTER_OPTIONS)
      : null,
    filters.credit !== "any" ? optionLabel(filters.credit, CREDIT_FILTER_OPTIONS) : null,
    filters.sort !== "match" ? optionLabel(filters.sort, OFFER_DISCOVERY_SORT_OPTIONS) : null,
  ].filter((label): label is string => Boolean(label));
  const hasLiveFilters = Boolean(search || activeFilterLabels.length);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Live marketplace</span>
        <span>Only participant proposals count as marketplace inventory on this route.</span>
        <Link href="/donate">Financial route available</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-explore-hero" aria-labelledby="explore-heading">
          <div className="mt-explore-copy">
            <p className="mt-product-kicker">Marketplace</p>
            <h1 id="explore-heading">Find a live proposal you can evaluate quickly.</h1>
            <p>
              Filter participant records, compare the no-deal default and maximum exposure, then
              open the complete terms before expressing interest or authorizing anything.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href={createHref}>Create a proposal</Link>
              <Link className="button button-secondary" href="/donate">
                Make a financial contribution
              </Link>
            </div>
          </div>
          <aside className="mt-explore-side">
            <p className="mt-product-kicker">Directory rule</p>
            <strong>Participant records only.</strong>
            <p>
              Explanatory material is kept in the learning layer. It is not presented here as live
              demand, completed trade volume, or available counterparties.
            </p>
          </aside>
        </section>

        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="mt-product-section is-white" aria-labelledby="directory-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Live directory</p>
              <h2 id="directory-heading">Open participant proposals</h2>
            </div>
            <p>
              Results combine relevance with a bounded, confidence-adjusted credit signal. Set the
              cause, money, action, and minimum-credit conditions directly.
            </p>
          </div>

          <form action="/offers" className={filterStyles.filterPanel} method="get" role="search">
            <input name="view" type="hidden" value="live" />
            <div className={filterStyles.filterGrid}>
              <label className={filterStyles.field}>
                <span>Search offers</span>
                <input
                  className={filterStyles.control}
                  defaultValue={search}
                  name="search"
                  placeholder="Cause, action, evidence, or participant"
                  type="search"
                />
              </label>
              <label className={filterStyles.field}>
                <span>Cause area</span>
                <select className={filterStyles.control} defaultValue={filters.cause} name="cause">
                  <option value="">Any cause area</option>
                  {causeOptions.map((cause) => (
                    <option key={cause} value={cause}>{cause}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Payment involved</span>
                <select className={filterStyles.control} defaultValue={filters.payment} name="payment">
                  {OFFER_PAYMENT_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Action involved</span>
                <select className={filterStyles.control} defaultValue={filters.action} name="action">
                  {OFFER_ACTION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Credit score</span>
                <select className={filterStyles.control} defaultValue={filters.credit} name="credit">
                  {CREDIT_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={filterStyles.field}>
                <span>Order by</span>
                <select className={filterStyles.control} defaultValue={filters.sort} name="sort">
                  {OFFER_DISCOVERY_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={filterStyles.actions}>
              <button className="button button-primary" type="submit">Apply filters</button>
              {hasLiveFilters ? (
                <Link className="button button-secondary" href={buildLiveHref({})}>
                  Clear all
                </Link>
              ) : null}
            </div>
            <div className={filterStyles.filterMeta}>
              <div className={filterStyles.activeFilters} aria-live="polite">
                <strong>{rankedLiveCandidates.length} matching offer(s)</strong>
                {activeFilterLabels.map((label) => (
                  <span className={filterStyles.activeChip} key={label}>{label}</span>
                ))}
              </div>
              <p className={filterStyles.rankingNote}>
                {rankingDescription(filters.sort, Boolean(search))}
              </p>
            </div>
          </form>

          <div className="mt-directory-view">
            {livePage.items.length ? (
              <div className="mt-market-grid">
                {livePage.items.map((offer) => (
                  <LiveProposalCard
                    credibility={credibilityByOffer.get(offer.id)}
                    key={offer.id}
                    offer={offer}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                actions={
                  <>
                    {hasLiveFilters ? (
                      <Link className="button button-primary" href={buildLiveHref({})}>
                        Clear filters
                      </Link>
                    ) : (
                      <Link className="button button-primary" href={createHref}>
                        Create the first proposal
                      </Link>
                    )}
                    <Link className="button button-secondary" href="/donate">
                      Fund a public good
                    </Link>
                  </>
                }
                icon="marketplace"
                title={hasLiveFilters ? "No live proposals match these filters" : "No live proposals are open"}
              >
                The marketplace does not substitute examples or demo records when participant
                inventory is empty.
              </EmptyState>
            )}

            {livePage.hasPreviousPage || livePage.hasNextPage ? (
              <nav className="pagination" aria-label="Live proposal pages">
                {livePage.hasPreviousPage ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={buildLiveHref({ filters, page: page - 1, search })}
                  >
                    Previous
                  </Link>
                ) : null}
                <span>Page {page}</span>
                {livePage.hasNextPage ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={buildLiveHref({ filters, page: page + 1, search })}
                  >
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="other-routes-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Other live routes</p>
              <h2 id="other-routes-heading">Coordinate without a bilateral listing</h2>
            </div>
            <p>
              Use an offset, conditional pool, or consent-gated introduction when a standard public
              proposal is not the right structure.
            </p>
          </div>
          <div className="mt-pool-link-grid">
            <Link className="mt-pool-link-card" href="/offsets">
              <div>
                <p className="mt-market-eyebrow">Opposed donations</p>
                <h3>Donation offsets</h3>
              </div>
              <p>Redirect matched planned donations toward a destination both participants prefer.</p>
              <span>Open offsets ↗</span>
            </Link>
            <Link className="mt-pool-link-card" href="/pools">
              <div>
                <p className="mt-market-eyebrow">Conditional funding</p>
                <h3>Funding pools</h3>
              </div>
              <p>Review maximum exposure, threshold, deadline, recipient, and failure behavior.</p>
              <span>Open pools ↗</span>
            </Link>
            <Link className="mt-pool-link-card" href="/background-networking">
              <div>
                <p className="mt-market-eyebrow">Private matching</p>
                <h3>Consent-gated introductions</h3>
              </div>
              <p>Share a broad preview without publishing exact wishes or contact details.</p>
              <span>Request matching ↗</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
