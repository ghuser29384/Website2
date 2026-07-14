import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { EmptyState, IconMark, StatusBadge } from "@/components/ui/page-primitives";
import {
  getViewer,
  listOpenOffersPage,
  OFFERS_PAGE_SIZE,
  type OfferRecord,
} from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { REVIEWED_MARKETPLACE_SEED_TEMPLATES } from "@/lib/marketplace-seed-templates";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Explore Moral Trade",
  description:
    "Explore live Moral Trade proposals, inspect complete worked examples, adapt reviewed templates, or open the moral public-goods workflow.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Explore Moral Trade",
    description:
      "Live proposals, complete examples, reviewed templates, and moral public-good coordination routes with explicit terms and review boundaries.",
    url: getAbsoluteUrl("/offers"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type DirectoryView = "live" | "examples" | "templates" | "public-goods";

const directoryTabs: ReadonlyArray<{
  label: string;
  value: DirectoryView;
}> = [
  { label: "Live proposals", value: "live" },
  { label: "Worked examples", value: "examples" },
  { label: "Reviewed templates", value: "templates" },
  { label: "Moral public goods", value: "public-goods" },
];

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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

function buildDirectoryHref({
  page,
  search,
  view,
}: {
  page?: number;
  search?: string;
  view: DirectoryView;
}) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (search) {
    params.set("search", search);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/offers?${params.toString()}`;
}

function LiveProposalCard({ offer }: { offer: OfferRecord }) {
  return (
    <article className="panel data-card listing-card">
      <div className="protocol-workflow-card-head">
        <div className="listing-card-head">
          <IconMark name={offer.mode === "offset" ? "offset" : offer.mode === "payment" ? "payment" : "swap"} />
          <div>
            <p className="detail-kicker">{formatMode(offer.mode)}</p>
            <h3>
              {offer.offered_cause} <span aria-hidden="true">↔</span> {offer.requested_cause}
            </h3>
          </div>
        </div>
        <StatusBadge>Live proposal</StatusBadge>
      </div>
      <p className="listing-alias">By {offer.owner_alias || offer.ownerProfile?.resolvedName || "Participant"}</p>
      <dl className="listing-terms">
        <div>
          <dt>Offers</dt>
          <dd>{offer.offer_action}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{offer.request_action}</dd>
        </div>
      </dl>
      <div className="listing-meta">
        <span>{offer.duration}</span>
        <span>{offer.verification}</span>
        <span>Manual review before reliance</span>
      </div>
      <Link className="button button-primary button-mini" href={`/offers/${offer.id}`}>
        Inspect terms
      </Link>
    </article>
  );
}

function WorkedExampleCard({
  example,
}: {
  example: (typeof CANONICAL_WORKED_CASE_OFFERS)[number];
}) {
  return (
    <article className="panel data-card listing-card">
      <div className="protocol-workflow-card-head">
        <div className="listing-card-head">
          <IconMark name={example.mode === "offset" ? "offset" : example.mode === "payment" ? "payment" : "swap"} />
          <div>
            <p className="detail-kicker">{formatMode(example.mode)}</p>
            <h3>
              {example.offeredCause} <span aria-hidden="true">↔</span> {example.requestedCause}
            </h3>
          </div>
        </div>
        <StatusBadge tone="secondary">Worked example</StatusBadge>
      </div>
      <p className="listing-summary">
        A complete instructional record. It is not a live participant proposal.
      </p>
      <dl className="listing-terms">
        <div>
          <dt>Offers</dt>
          <dd>{example.offerAction}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{example.requestAction}</dd>
        </div>
      </dl>
      <div className="listing-meta">
        <span>{example.duration}</span>
        <span>{example.verification}</span>
        <span>Example only</span>
      </div>
      <Link className="button button-primary button-mini" href={`/offers/examples/${example.id}`}>
        Inspect example
      </Link>
    </article>
  );
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);
  const search = readParam(resolvedSearchParams, "search").trim().slice(0, 120);
  const [viewer, livePage] = await Promise.all([
    getViewer(),
    hasSupabaseEnv()
      ? listOpenOffersPage(page, OFFERS_PAGE_SIZE, "all", search)
      : Promise.resolve({
          items: [] as OfferRecord[],
          page,
          pageSize: OFFERS_PAGE_SIZE,
          hasNextPage: false,
          hasPreviousPage: page > 1,
        }),
  ]);
  const view = parseView(readParam(resolvedSearchParams, "view"), livePage.items.length > 0);
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = viewer ? "/offers/new" : "/signup?returnTo=/offers/new";

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
    live: livePage.items.length,
    examples: workedExamples.length,
    templates: templates.length,
    "public-goods": null,
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Explore</p>
            <h1>Find a live proposal or start from complete terms.</h1>
            <p className="hero-text">
              Live proposals, worked examples, and reviewed templates are deliberately separated.
              Start with the route that matches what you are trying to do.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={createHref}>
                Create a trade
              </Link>
              <Link className="button button-secondary" href="/background-networking">
                Request private matching
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Directory rule</p>
            <h2>Examples are not liquidity.</h2>
            <p>
              A worked example or reviewed template can be inspected and adapted, but it is never
              counted or presented as a live participant proposal.
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

        <section className="section section-white offers-directory-shell" aria-labelledby="directory-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Directory</p>
            <h2 id="directory-heading">Choose a record type</h2>
          </div>

          <nav className="hub-tabs" aria-label="Offer directory views">
            {directoryTabs.map((tab) => (
              <Link
                aria-current={view === tab.value ? "page" : undefined}
                className={view === tab.value ? "is-active" : undefined}
                href={buildDirectoryHref({ search, view: tab.value })}
                key={tab.value}
              >
                {tab.label}
                {tabCounts[tab.value] !== null ? ` (${tabCounts[tab.value]})` : ""}
              </Link>
            ))}
          </nav>

          <form action="/offers" className="marketplace-search marketplace-search-wide" method="get" role="search">
            <input name="view" type="hidden" value={view} />
            <label className="field marketplace-search-field">
              <span>Search this view</span>
              <input
                defaultValue={search}
                name="search"
                placeholder="Cause, action, evidence, or template"
                type="search"
              />
            </label>
            <button className="button button-primary" type="submit">
              Search
            </button>
            {search ? (
              <Link className="button button-secondary" href={buildDirectoryHref({ view })}>
                Clear
              </Link>
            ) : null}
          </form>

          {view === "live" ? (
            <div className="directory-view-stack">
              <div className="section-head section-head-compact">
                <h2>Live participant proposals</h2>
                <p>
                  These records were submitted by participants. Inspect the baseline, terms,
                  evidence, privacy, and review state before expressing interest.
                </p>
              </div>
              {livePage.items.length ? (
                <div className="listing-grid">
                  {livePage.items.map((offer) => (
                    <LiveProposalCard key={offer.id} offer={offer} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  actions={
                    <>
                      <Link className="button button-primary" href={createHref}>
                        Create the first proposal
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={buildDirectoryHref({ search, view: "examples" })}
                      >
                        Inspect examples
                      </Link>
                    </>
                  }
                  icon="marketplace"
                  title={search ? "No live proposals match this search" : "No live proposals are open"}
                >
                  The service does not substitute examples or demo records when no participant
                  proposal exists.
                </EmptyState>
              )}
              {livePage.hasPreviousPage || livePage.hasNextPage ? (
                <nav className="pagination" aria-label="Live proposal pages">
                  {livePage.hasPreviousPage ? (
                    <Link
                      className="button button-secondary button-mini"
                      href={buildDirectoryHref({ page: page - 1, search, view })}
                    >
                      Previous
                    </Link>
                  ) : null}
                  <span>Page {page}</span>
                  {livePage.hasNextPage ? (
                    <Link
                      className="button button-secondary button-mini"
                      href={buildDirectoryHref({ page: page + 1, search, view })}
                    >
                      Next
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          ) : null}

          {view === "examples" ? (
            <div className="directory-view-stack">
              <div className="section-head section-head-compact">
                <h2>Complete worked examples</h2>
                <p>
                  Examples show the full shape of a trade without implying a real counterparty or
                  active demand.
                </p>
              </div>
              {workedExamples.length ? (
                <div className="listing-grid">
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
            <div className="directory-view-stack">
              <div className="section-head section-head-compact">
                <h2>Reviewed templates</h2>
                <p>
                  Templates provide prefilled structure. They remain drafts until a participant
                  supplies a real baseline, accepts the terms, and submits the resulting record.
                </p>
              </div>
              {templates.length ? (
                <div className="data-grid">
                  {templates.map((template) => {
                    const target = template.templateHref;
                    const href = viewer
                      ? target
                      : `/signup?returnTo=${encodeURIComponent(target)}`;

                    return (
                      <article className="panel data-card" key={template.id}>
                        <div className="protocol-workflow-card-head">
                          <div>
                            <p className="detail-kicker">{template.formatLabel}</p>
                            <h3>{template.prefill.title}</h3>
                          </div>
                          <StatusBadge tone="secondary">Reviewed template</StatusBadge>
                        </div>
                        <p className="route-text">{template.publicSummary}</p>
                        <dl className="listing-terms">
                          <div>
                            <dt>Baseline prompt</dt>
                            <dd>{template.prefill.baselineStatement}</dd>
                          </div>
                          <div>
                            <dt>Exit rule</dt>
                            <dd>{template.prefill.exitCondition}</dd>
                          </div>
                        </dl>
                        <Link className="button button-primary button-mini" href={href}>
                          Adapt template
                        </Link>
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
            <div className="directory-view-stack">
              <div className="section-head section-head-compact">
                <h2>Moral public-good coordination</h2>
                <p>
                  Public-good rounds use their own threshold, evidence, governance, authorization,
                  and settlement rules. They are linked here but are not mixed into bilateral offer
                  counts.
                </p>
              </div>
              <div className="data-grid">
                <Link className="panel data-card" href="/mpgf">
                  <IconMark name="publicGoods" />
                  <h3>Common Ground Budget</h3>
                  <p className="route-text">
                    Build a bounded budget, state project preferences, inspect frozen terms, and
                    count contributions only after the relevant gates pass.
                  </p>
                  <span className="inline-link">Open Public Goods Fund</span>
                </Link>
                <Link className="panel data-card" href="/mpgf/pools">
                  <IconMark name="fund" />
                  <h3>Candidate pools</h3>
                  <p className="route-text">
                    Inspect public reasoning, destination types, evidence requirements, and review
                    states for candidate public-good pools.
                  </p>
                  <span className="inline-link">Browse candidate pools</span>
                </Link>
                <Link className="panel data-card" href="/moral-goods-group-buying">
                  <IconMark name="hands" />
                  <h3>Group buying</h3>
                  <p className="route-text">
                    Coordinate thresholded moral actions through rounds, lots, baskets, or standing
                    budgets with explicit evidence and exit rules.
                  </p>
                  <span className="inline-link">Open group-buying tools</span>
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
