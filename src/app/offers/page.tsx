import type { Metadata } from "next";
import Link from "next/link";

import filterStyles from "@/components/discovery/discovery-filters.module.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { TradeTemplateLibrary } from "@/components/trade-templates/trade-template-library";
import { getViewer, OFFERS_PAGE_SIZE } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const LIVE_METADATA: Metadata = {
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

export async function generateMetadata({ searchParams }: OffersPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const view = readParam(resolvedSearchParams, "view");
  const legacyTab = readParam(resolvedSearchParams, "tab");

  if (view === "templates" || legacyTab === "templates") {
    return {
      title: "Trade templates",
      description:
        "Choose a Moral Trade template and open its real editable draft in one click, or use a three-question guide to find the right starting point.",
      alternates: { canonical: "/offers?view=templates" },
      openGraph: {
        title: "Trade templates | Moral Trade",
        description:
          "Open a prefilled pledge, donation-offset, skill, favor, or threshold-pool draft and edit every term before saving.",
        url: getAbsoluteUrl("/offers?view=templates"),
        type: "website",
      },
    };
  }

  return LIVE_METADATA;
}

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type OfferMode = OfferRow["mode"];
type ModeFilter = "all" | OfferMode;

interface LiveOffersResult {
  items: OfferRow[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  error: string | null;
}

const MODE_OPTIONS: ReadonlyArray<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "Any proposal type" },
  { value: "pledge", label: "Pledge or reciprocal action" },
  { value: "payment", label: "Payment-supported action" },
  { value: "offset", label: "Donation offset" },
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

function parseMode(value: string): ModeFilter {
  return MODE_OPTIONS.some((option) => option.value === value)
    ? (value as ModeFilter)
    : "all";
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .slice(0, 120)
    .replace(/[,%()'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLiveHref({
  mode,
  page,
  search,
}: {
  mode?: ModeFilter;
  page?: number;
  search?: string;
}) {
  const params = new URLSearchParams({ view: "live" });

  if (search) {
    params.set("search", search);
  }
  if (mode && mode !== "all") {
    params.set("mode", mode);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/offers?${params.toString()}`;
}

async function listLiveOffers({
  mode,
  page,
  search,
}: {
  mode: ModeFilter;
  page: number;
  search: string;
}): Promise<LiveOffersResult> {
  if (!hasSupabaseEnv()) {
    return {
      items: [],
      total: 0,
      page,
      pageSize: OFFERS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      error: null,
    };
  }

  const supabase = await createClient();
  const offset = (page - 1) * OFFERS_PAGE_SIZE;
  let query = supabase
    .from("offers")
    .select("*", { count: "exact" })
    .eq("status", "open");

  if (mode !== "all") {
    query = query.eq("mode", mode);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      [
        `offered_cause.ilike.${pattern}`,
        `requested_cause.ilike.${pattern}`,
        `offer_action.ilike.${pattern}`,
        `request_action.ilike.${pattern}`,
        `verification.ilike.${pattern}`,
        `duration.ilike.${pattern}`,
        `owner_alias.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + OFFERS_PAGE_SIZE - 1);

  if (error) {
    console.error("[offers] Failed to load the live proposal directory", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      mode,
      page,
      searchPresent: Boolean(search),
    });

    return {
      items: [],
      total: 0,
      page,
      pageSize: OFFERS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      error: "The live directory could not be loaded. Please refresh or try again shortly.",
    };
  }

  const total = count ?? (data ?? []).length;

  return {
    items: (data ?? []) as OfferRow[],
    total,
    page,
    pageSize: OFFERS_PAGE_SIZE,
    hasNextPage: offset + OFFERS_PAGE_SIZE < total,
    hasPreviousPage: page > 1,
    error: null,
  };
}

function LiveProposalCard({ offer }: { offer: OfferRow }) {
  const participantName = offer.owner_alias || "Participant";

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
      <div className="tag-row" aria-label="Proposal boundaries">
        <span className="badge">{offer.discount_note || "Bounded terms"}</span>
        <span className="source-pill">Evidence named · explains what changes</span>
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
          <dt>Terms</dt>
          <dd>{offer.discount_note || "Open the complete proposal for its baseline and boundaries."}</dd>
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
  const view = readParam(resolvedSearchParams, "view");
  const legacyTab = readParam(resolvedSearchParams, "tab");

  if (view === "templates" || legacyTab === "templates") {
    return <TradeTemplateLibrary />;
  }

  const page = parsePage(resolvedSearchParams.page);
  const search = normalizeSearch(readParam(resolvedSearchParams, "search"));
  const mode = parseMode(readParam(resolvedSearchParams, "mode"));
  const [viewer, livePage] = await Promise.all([
    getViewer(),
    listLiveOffers({ mode, page, search }),
  ]);
  const isAuthenticated = Boolean(viewer);
  const formMessage = getFormMessage(resolvedSearchParams);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const hasFilters = Boolean(search || mode !== "all");
  const pageCount = Math.max(1, Math.ceil(livePage.total / livePage.pageSize));

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Live marketplace</span>
        <span>Participant proposals are paginated directly from the production registry.</span>
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
              Browse every published proposal in bounded pages, inspect the no-trade baseline and
              evidence rule, then open the complete terms before expressing interest.
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
            <strong>Live participant records only.</strong>
            <p>
              The directory queries one page at a time, so a large inventory remains inspectable
              without turning explanatory examples into apparent live demand.
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

        {livePage.error ? (
          <div className="status-banner status-banner-error" role="alert">
            {livePage.error}
          </div>
        ) : null}

        <section className="mt-product-section is-white" aria-labelledby="directory-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Live directory</p>
              <h2 id="directory-heading">Open participant proposals</h2>
            </div>
            <p>
              {livePage.total.toLocaleString()} live proposal{livePage.total === 1 ? "" : "s"} in
              the current result set. Open a record to review its full terms and verification state.
            </p>
          </div>

          <form action="/offers" className={filterStyles.filterPanel} method="get" role="search">
            <input name="view" type="hidden" value="live" />
            <div className={filterStyles.filterGrid}>
              <label className={filterStyles.field}>
                <span>Search proposals</span>
                <input
                  className={filterStyles.control}
                  defaultValue={search}
                  name="search"
                  placeholder="Cause, action, evidence, or participant"
                  type="search"
                />
              </label>
              <label className={filterStyles.field}>
                <span>Proposal type</span>
                <select className={filterStyles.control} defaultValue={mode} name="mode">
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={filterStyles.actions}>
              <button className="button button-primary" type="submit">Apply filters</button>
              {hasFilters ? (
                <Link className="button button-secondary" href={buildLiveHref({})}>
                  Clear all
                </Link>
              ) : null}
            </div>
            <div className={filterStyles.filterMeta}>
              <div className={filterStyles.activeFilters} aria-live="polite">
                <strong>{livePage.total.toLocaleString()} matching offer(s)</strong>
                {search ? <span className={filterStyles.activeChip}>Search: {search}</span> : null}
                {mode !== "all" ? (
                  <span className={filterStyles.activeChip}>
                    {MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode}
                  </span>
                ) : null}
              </div>
              <p className={filterStyles.rankingNote}>
                Newest published proposals appear first. Pagination keeps every live record reachable
                without loading the full registry into one request.
              </p>
            </div>
          </form>

          <div className="mt-directory-view">
            {livePage.items.length ? (
              <div className="mt-market-grid">
                {livePage.items.map((offer) => (
                  <LiveProposalCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <div className="panel empty-state">
                <h3>{hasFilters ? "No live proposals match these filters" : "No live proposals are open"}</h3>
                <p>
                  The marketplace does not substitute examples or demo records when participant
                  inventory is empty.
                </p>
                <div className="hero-actions">
                  {hasFilters ? (
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
                </div>
              </div>
            )}

            {livePage.hasPreviousPage || livePage.hasNextPage ? (
              <nav className="pagination" aria-label="Live proposal pages">
                {livePage.hasPreviousPage ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={buildLiveHref({ mode, page: page - 1, search })}
                  >
                    Previous
                  </Link>
                ) : null}
                <span>Page {page} of {pageCount}</span>
                {livePage.hasNextPage ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={buildLiveHref({ mode, page: page + 1, search })}
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
              <h2 id="other-routes-heading">Coordinate without a two-person listing</h2>
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
              <p>Review the most you could owe, the goal, deadline, recipient, and what happens if it fails.</p>
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
