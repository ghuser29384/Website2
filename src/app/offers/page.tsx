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
import { REVIEWED_MARKETPLACE_SEED_TEMPLATES } from "@/lib/marketplace-seed-templates";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Explore live Moral Trade proposals, worked examples, reviewed templates, donation offsets, and conditional funding pools without mixing their states.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Explore Moral Trade",
    description:
      "Browse a marketplace of live proposals and inspect complete examples, templates, offsets, and pools with explicit terms and states.",
    url: getAbsoluteUrl("/offers"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type DirectoryView = "live" | "examples" | "templates" | "public-goods";

interface OfferFilterState {
  action: OfferActionFilter;
  cause: string;
  credit: CreditFilter;
  payment: OfferPaymentFilter;
  sort: OfferDiscoverySort;
}

const OFFER_DISCOVERY_LIMIT = 1_000;

const directoryTabs: ReadonlyArray<{ label: string; value: DirectoryView }> = [
  { label: "Live", value: "live" },
  { label: "Examples", value: "examples" },
  { label: "Templates", value: "templates" },
  { label: "Pools", value: "public-goods" },
];

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

function parseView(value: string, hasLiveOffers: boolean): DirectoryView {
  if (
    value === "live" ||
    value === "examples" ||
    value === "templates" ||
    value === "public-goods"
  ) {
    return value;
  }

  return hasLiveOffers ? "live" : "examples";
}

function matchesSearch(values: readonly string[], query: string) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalized));
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

function buildDirectoryHref({
  filters,
  page,
  search,
  view,
}: {
  filters?: OfferFilterState;
  page?: number;
  search?: string;
  view: DirectoryView;
}) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (search) {
    params.set("search", search);
  }

  if (view === "live" && filters) {
    if (filters.cause) {
      params.set("cause", filters.cause);
    }
    if (filters.payment !== "any") {
      params.set("payment", filters.payment);
    }
    if (filters.action !== "all") {
      params.set("action", filters.action);
    }
    if (filters.credit !== "any") {
      params.set("credit", filters.credit);
    }
    if (filters.sort !== "match") {
      params.set("sort", filters.sort);
    }
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
        <Link href={`/offers/${offer.id}`}>Inspect Deal Receipt ↗</Link>
      </div>
    </article>
  );
}

function WorkedExampleCard({
  example,
}: {
  example: (typeof CANONICAL_WORKED_CASE_OFFERS)[number];
}) {
  return (
    <article className="mt-market-card">
      <div className="mt-market-card-head">
        <span className="mt-market-eyebrow">{formatMode(example.mode)}</span>
        <span className="mt-market-state">Worked example</span>
      </div>
      <h3>
        {example.offeredCause}
        <span aria-hidden="true">↔</span>
        {example.requestedCause}
      </h3>
      <dl>
        <div>
          <dt>Offers</dt>
          <dd>{example.offerAction}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{example.requestAction}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{example.verification}</dd>
        </div>
      </dl>
      <div className="mt-market-card-foot">
        <span>{example.duration}</span>
        <Link href={`/offers/examples/${example.id}`}>Inspect example ↗</Link>
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
  const view = parseView(readParam(resolvedSearchParams, "view"), liveCandidates.length > 0);
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const credibilityByOffer =
    view === "live"
      ? await listPublicCredibilityForLookups(
          liveCandidates.map((offer) => ({
            key: offer.id,
            profileId: offer.owner_id,
            context: {
              role: "committer",
              category: categoryForOfferMode(offer.mode),
            },
          })),
        )
      : new Map<string, CredibilitySummary>();
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
    filters.action !== "all" ? optionLabel(filters.action, OFFER_ACTION_FILTER_OPTIONS) : null,
    filters.credit !== "any" ? optionLabel(filters.credit, CREDIT_FILTER_OPTIONS) : null,
    filters.sort !== "match" ? optionLabel(filters.sort, OFFER_DISCOVERY_SORT_OPTIONS) : null,
  ].filter((label): label is string => Boolean(label));
  const hasLiveFilters = Boolean(search || activeFilterLabels.length);

  const workedExamples = CANONICAL_WORKED_CASE_OFFERS.filter((example) =>
    matchesSearch(
      [
        example.alias,
        example.offeredCause,
        example.requestedCause,
        example.offerAction,
        example.requestAction,
        example.verification,
      ],
      search,
    ),
  );
  const templates = REVIEWED_MARKETPLACE_SEED_TEMPLATES.filter((template) =>
    matchesSearch(
      [
        template.prefill.title,
        template.prefill.description,
        template.prefill.offeredCause,
        template.prefill.requestedCause,
        template.publicSummary,
        template.formatLabel,
      ],
      search,
    ),
  );

  const tabCounts: Record<DirectoryView, number | null> = {
    live: liveCandidates.length,
    examples: workedExamples.length,
    templates: templates.length,
    "public-goods": null,
  };

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Explore</span>
        <span>Live proposals, examples, templates, and pools are separate record types.</span>
        <Link href="/status">Current status</Link>
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
            <h1 id="explore-heading">Find a deal, offset, or pool you can understand quickly.</h1>
            <p>
              Browse by current state, inspect the no-deal default and maximum exposure, then open
              the complete terms before expressing interest or authorizing anything.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href={createHref}>Create</Link>
              <Link className="button button-secondary" href="/background-networking">
                Request private matching
              </Link>
            </div>
          </div>
          <aside className="mt-explore-side">
            <p className="mt-product-kicker">Directory rule</p>
            <strong>Examples are not liquidity.</strong>
            <p>
              Worked examples and reviewed templates make the mechanism legible. They are never
              presented as live counterparty demand, completed trade volume, or participant inventory.
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
              <p className="mt-product-kicker">Directory</p>
              <h2 id="directory-heading">Choose the record state you need.</h2>
            </div>
            <p>
              Live results combine relevance with a bounded, confidence-adjusted credit signal.
              Filters let you set the cause, money, action, and minimum-credit conditions directly.
            </p>
          </div>

          <div className="mt-directory-toolbar">
            <nav className="mt-directory-tabs" aria-label="Marketplace record types">
              {directoryTabs.map((tab) => (
                <Link
                  aria-current={view === tab.value ? "page" : undefined}
                  href={buildDirectoryHref({
                    filters: tab.value === "live" ? filters : undefined,
                    search,
                    view: tab.value,
                  })}
                  key={tab.value}
                >
                  <span>{tab.label}</span>
                  <span>{tabCounts[tab.value] !== null ? tabCounts[tab.value] : "→"}</span>
                </Link>
              ))}
            </nav>

            {view !== "live" ? (
              <form action="/offers" className="mt-directory-search" method="get" role="search">
                <input name="view" type="hidden" value={view} />
                <label>
                  <span>Search</span>
                  <input
                    defaultValue={search}
                    name="search"
                    placeholder="Cause, action, evidence, or template"
                    type="search"
                  />
                </label>
                <button className="button button-primary" type="submit">Search</button>
                {search ? (
                  <Link className="button button-secondary" href={buildDirectoryHref({ view })}>
                    Clear
                  </Link>
                ) : null}
              </form>
            ) : null}
          </div>

          {view === "live" ? (
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
                  <Link className="button button-secondary" href={buildDirectoryHref({ view: "live" })}>
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
          ) : null}

          {view === "live" ? (
            <div className="mt-directory-view">
              <div className="mt-directory-view-head">
                <div>
                  <p className="mt-market-eyebrow">Live participant records</p>
                  <h2>Open proposals</h2>
                </div>
                <p>
                  Compare the owner&apos;s score, baseline, terms, evidence, privacy, externality,
                  review, and settlement state before expressing interest.
                </p>
              </div>
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
                        <Link className="button button-primary" href={buildDirectoryHref({ view: "live" })}>
                          Clear filters
                        </Link>
                      ) : (
                        <Link className="button button-primary" href={createHref}>Create the first proposal</Link>
                      )}
                      <Link className="button button-secondary" href={buildDirectoryHref({ search, view: "examples" })}>
                        Inspect examples
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
                      href={buildDirectoryHref({ filters, page: page - 1, search, view })}
                    >
                      Previous
                    </Link>
                  ) : null}
                  <span>Page {page}</span>
                  {livePage.hasNextPage ? (
                    <Link
                      className="button button-secondary button-mini"
                      href={buildDirectoryHref({ filters, page: page + 1, search, view })}
                    >
                      Next
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          ) : null}

          {view === "examples" ? (
            <div className="mt-directory-view">
              <div className="mt-directory-view-head">
                <div>
                  <p className="mt-market-eyebrow">Instructional records</p>
                  <h2>Worked examples</h2>
                </div>
                <p>
                  Complete sample terms show the shape of a proposal without implying a real
                  counterparty, current demand, or completed transaction.
                </p>
              </div>
              {workedExamples.length ? (
                <div className="mt-market-grid">
                  {workedExamples.map((example) => (
                    <WorkedExampleCard example={example} key={example.id} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="example" title="No worked examples match this search">
                  Clear the search or inspect the reviewed templates instead.
                </EmptyState>
              )}
            </div>
          ) : null}

          {view === "templates" ? (
            <div className="mt-directory-view">
              <div className="mt-directory-view-head">
                <div>
                  <p className="mt-market-eyebrow">Drafting aids</p>
                  <h2>Reviewed templates</h2>
                </div>
                <p>
                  A template supplies structure only. It remains a draft until a participant provides
                  a real baseline, edits the terms, and submits the resulting proposal.
                </p>
              </div>
              {templates.length ? (
                <div className="mt-template-grid">
                  {templates.map((template) => {
                    const target = template.templateHref;
                    const href = isAuthenticated
                      ? target
                      : `/signup?returnTo=${encodeURIComponent(target)}`;

                    return (
                      <article className="mt-template-card" key={template.id}>
                        <div>
                          <p className="mt-market-eyebrow">{template.formatLabel}</p>
                          <h3>{template.prefill.title}</h3>
                        </div>
                        <p>{template.publicSummary}</p>
                        <div>
                          <p><strong>Baseline prompt:</strong> {template.prefill.baselineStatement}</p>
                          <p><strong>Exit rule:</strong> {template.prefill.exitCondition}</p>
                        </div>
                        <Link className="button button-primary" href={href}>Adapt template</Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon="review" title="No reviewed templates match this search">
                  Clear the search or start from a worked example.
                </EmptyState>
              )}
            </div>
          ) : null}

          {view === "public-goods" ? (
            <div className="mt-directory-view">
              <div className="mt-directory-view-head">
                <div>
                  <p className="mt-market-eyebrow">Conditional coordination</p>
                  <h2>Pools and public goods</h2>
                </div>
                <p>
                  Pools use their own threshold, authorization, evidence, governance, settlement,
                  and failure rules. They are linked here without being mixed into bilateral offer counts.
                </p>
              </div>
              <div className="mt-pool-link-grid">
                <Link className="mt-pool-link-card" href="/pools">
                  <div>
                    <p className="mt-market-eyebrow">Consumer route</p>
                    <h3>Conditional pools</h3>
                  </div>
                  <p>Review maximum exposure, threshold, deadline, recipient, progress, and failure behavior.</p>
                  <span>Explore pools ↗</span>
                </Link>
                <Link className="mt-pool-link-card" href="/mpgf">
                  <div>
                    <p className="mt-market-eyebrow">Allocation tools</p>
                    <h3>Common Ground Budget</h3>
                  </div>
                  <p>Build a bounded budget and inspect frozen contribution and allocation rules.</p>
                  <span>Open budget tools ↗</span>
                </Link>
                <Link className="mt-pool-link-card" href="/moral-goods-group-buying">
                  <div>
                    <p className="mt-market-eyebrow">Advanced mechanism</p>
                    <h3>Group buying</h3>
                  </div>
                  <p>Open reviewed rounds, lots, baskets, standing budgets, and settlement detail.</p>
                  <span>Open advanced tools ↗</span>
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
