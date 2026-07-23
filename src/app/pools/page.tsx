import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { MetricCard } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  loadLiveGroupBuyingSnapshot,
  type LiveGroupBuyingRoute,
} from "@/lib/moral-trade/group-buying-live";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  getSmartDeadlineUrgency,
  getSmartQueryCauseLabel,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  matchesSmartVerificationConstraint,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  type SmartQueryFacets,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
import {
  evidenceTextQuality,
  isVerifiedEvidenceText,
} from "@/lib/smart-query-records";
import {
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";

import liveStyles from "../moral-goods-group-buying/live-state.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Conditional pools",
  description:
    "Browse open conditional pools, funding limits, deadlines, and payment readiness.",
  alternates: { canonical: "/pools" },
  openGraph: {
    title: "Conditional pools at Moral Trade",
    description:
      "Browse open conditional pools, funding limits, deadlines, and payment readiness.",
    url: getAbsoluteUrl("/pools"),
    type: "website",
  },
};

interface PoolsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type PoolSort = "best_match" | "soonest_deadline" | "lowest_cost" | "most_verified";

interface RankedPoolRoute {
  causeIds: string[];
  evidenceQuality: number;
  route: LiveGroupBuyingRoute;
  score: number;
  semanticRelevance: number;
  verified: boolean;
}

const POOL_SORT_OPTIONS: ReadonlyArray<{ value: PoolSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "soonest_deadline", label: "Soonest deadline" },
  { value: "lowest_cost", label: "Lowest maximum funding" },
  { value: "most_verified", label: "Strongest evidence" },
];

const mechanismFacts = [
  ["Maximum exposure", "Every person sees the most they can be charged before authorizing."],
  [
    "Funding condition",
    "The threshold, eligible amount, deadline, and review gates are published together.",
  ],
  ["Failure behavior", "A condition that does not pass creates no successful settlement record."],
  [
    "State vocabulary",
    "Pledge, authorization, charge, refund, transfer, and outcome remain distinct.",
  ],
] as const;

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseSort(value: string, hasSmartSearch: boolean): PoolSort {
  if (POOL_SORT_OPTIONS.some((option) => option.value === value)) return value as PoolSort;
  return hasSmartSearch ? "best_match" : "soonest_deadline";
}

function formatMoney(amountCents: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase();
  let formatter = moneyFormatters.get(normalizedCurrency);

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(normalizedCurrency, formatter);
  }

  return formatter.format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "No public deadline";

  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      dateOnly
      locale="en-US"
      options={{ day: "numeric", month: "short", year: "numeric" }}
    />
  );
}

function readinessLabel(status: "ready" | "pending" | "blocked" | "unavailable") {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Pending review";
  if (status === "blocked") return "Blocked";
  return "Unavailable";
}

function poolFields(route: LiveGroupBuyingRoute) {
  return [
    { value: route.causeArea, weight: 1 },
    { value: `${route.title} ${route.summary}`, weight: 0.96 },
    { value: `${route.intervention} ${route.expectedEffect}`, weight: 0.88 },
    { value: route.verificationSummary, weight: 0.82 },
    { value: `${route.recipientName} ${route.timeline} ${route.statusSentence}`, weight: 0.68 },
  ] as const;
}

function routeCauseIds(route: LiveGroupBuyingRoute) {
  return parseSmartQuery(`${route.causeArea} ${route.title} ${route.summary}`, {
    surface: "pools",
  }).facets.causes;
}

function poolMatchesHardConstraints(
  route: LiveGroupBuyingRoute,
  facets: SmartQueryFacets,
  causeIds: readonly string[],
  verified: boolean,
) {
  if (facets.causes.length) {
    const direct = facets.causes.some((cause) => causeIds.includes(cause));
    if (!direct && smartCauseMatchScore(facets.causes, poolFields(route)) < 0.42) return false;
  }
  if (!matchesSmartVerificationConstraint(facets, verified)) return false;
  if (!matchesSmartAmountConstraint(facets, [route.targetFundingCents])) return false;
  if (!matchesSmartDeadlineConstraint(facets, route.deadlineAt)) return false;
  if (facets.actionTypes.length && !facets.actionTypes.includes("pool")) return false;
  if (
    facets.participantKinds.length ||
    facets.openToPayment !== null ||
    facets.openToPledges !== null ||
    facets.minCredit !== null ||
    facets.evidenceStates.length ||
    facets.poolKinds.length ||
    facets.location
  ) {
    return false;
  }
  return true;
}

function rankPoolRoutes(
  routes: LiveGroupBuyingRoute[],
  query: string,
  facets: SmartQueryFacets,
  personalPriorities: readonly string[],
  sort: PoolSort,
) {
  const base = parseSmartQuery(query, { surface: "pools" });
  const interpretation = { ...base, facets };
  const ranked = routes
    .map((route): RankedPoolRoute | null => {
      const causeIds = routeCauseIds(route);
      const verified = isVerifiedEvidenceText(route.verificationSummary);
      if (!poolMatchesHardConstraints(route, facets, causeIds, verified)) return null;

      const semanticRelevance = smartInterpretationScore(interpretation, poolFields(route));
      if (
        (interpretation.residualTerms.length || facets.causes.length) &&
        semanticRelevance < 0.16
      ) {
        return null;
      }
      const evidenceQuality = evidenceTextQuality(route.verificationSummary);
      const score = smartDiscoveryScore({
        semanticRelevance,
        evidenceQuality,
        personalMoralFit: smartPersonalPriorityScore(causeIds, personalPriorities),
        deadlineUrgency: getSmartDeadlineUrgency(route.deadlineAt),
        credit: 0,
      });
      return { causeIds, evidenceQuality, route, score, semanticRelevance, verified };
    })
    .filter((entry): entry is RankedPoolRoute => Boolean(entry));

  return ranked
    .sort((left, right) => {
      if (sort === "soonest_deadline") {
        const leftDeadline = left.route.deadlineAt
          ? Date.parse(left.route.deadlineAt)
          : Number.POSITIVE_INFINITY;
        const rightDeadline = right.route.deadlineAt
          ? Date.parse(right.route.deadlineAt)
          : Number.POSITIVE_INFINITY;
        return leftDeadline - rightDeadline || right.score - left.score ||
          left.route.id.localeCompare(right.route.id);
      }
      if (sort === "lowest_cost") {
        return left.route.targetFundingCents - right.route.targetFundingCents ||
          right.score - left.score || left.route.id.localeCompare(right.route.id);
      }
      if (sort === "most_verified") {
        return right.evidenceQuality - left.evidenceQuality || right.score - left.score ||
          left.route.id.localeCompare(right.route.id);
      }
      return right.score - left.score ||
        right.semanticRelevance - left.semanticRelevance ||
        left.route.id.localeCompare(right.route.id);
    })
    .map((entry) => entry.route);
}

function moneyConstraintLabel(facets: SmartQueryFacets) {
  if (facets.maxAmountCents !== null) {
    return `${facets.maxAmountInclusive ? "Maximum" : "Under"} ${formatMoney(facets.maxAmountCents, "USD")}`;
  }
  if (facets.minAmountCents !== null) {
    return `${facets.minAmountInclusive ? "At least" : "Over"} ${formatMoney(facets.minAmountCents, "USD")}`;
  }
  return null;
}

export default async function PoolsPage({ searchParams }: PoolsPageProps) {
  const resolvedSearchParams = await searchParams;
  const [viewer, snapshot] = await Promise.all([getViewer(), loadLiveGroupBuyingSnapshot()]);
  const isAuthenticated = Boolean(viewer);
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);
  const parsed = parseSmartQuery(query, { surface: "pools" });
  const facets = mergeSmartQueryFacets(
    parsed.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams),
  );
  const hasSmartSearch = Boolean(query || hasSmartQueryConstraints(facets));
  const sort = parseSort(readParam(resolvedSearchParams, "sort") || facets.sort || "", hasSmartSearch);
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const liveDataAvailable = snapshot.sourceStatus === "live";
  const routes = liveDataAvailable
    ? rankPoolRoutes(snapshot.routes, query, facets, personalPriorities, sort)
    : [];
  const financial = snapshot.financial;
  const readiness = snapshot.paymentReadiness;
  const activeConstraints = [
    ...facets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    facets.verified === true ? "Verified evidence" : facets.verified === false ? "No verified evidence" : null,
    moneyConstraintLabel(facets),
    facets.deadlineBefore
      ? `${facets.deadlineBeforeInclusive ? "By" : "Before"} ${facets.deadlineBefore}`
      : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <div className="page-shell marketplace-product-shell">
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-mechanism-hero" aria-labelledby="pools-heading">
          <div className="mt-mechanism-copy">
            <h1 id="pools-heading">Live conditional pools.</h1>
            <p>
              Search by cause, maximum target funding, evidence standard, or deadline. Hard constraints
              are enforced before semantic fit, evidence quality, saved cause priorities, and urgency.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href="#live-pools">
                Explore live pools
              </Link>
              <Link className="button button-secondary" href="/mpgf/pools/new">
                Propose a pool
              </Link>
            </div>
          </div>

          <aside className="hero-panel panel" aria-label="Pool summary">
            <h2>
              {liveDataAvailable
                ? `${routes.length} matching open route${routes.length === 1 ? "" : "s"}`
                : "Unavailable"}
            </h2>
            <dl className="detail-grid">
              <div><dt>Open cycles</dt><dd>{liveDataAvailable ? snapshot.openCycleCount : "—"}</dd></div>
              <div>
                <dt>Open exposure</dt>
                <dd>{liveDataAvailable ? formatMoney(financial.openConditionalExposureCents, financial.currency) : "—"}</dd>
              </div>
              <div>
                <dt>Net charged</dt>
                <dd>{liveDataAvailable ? formatMoney(financial.netChargedCents, financial.currency) : "—"}</dd>
              </div>
              <div><dt>Payment acceptance</dt><dd>{liveDataAvailable ? readinessLabel(readiness.status) : "Unavailable"}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="mt-product-section is-white" id="live-pools" aria-label="Live pools">
          <SmartQueryForm action="/pools" className="panel stack-form" method="get" queryName="q" surface="pools">
            <div className="field-grid">
              <label className="field">
                <span>Search pools</span>
                <input
                  defaultValue={query}
                  name="q"
                  placeholder="e.g. verified public-health pools under $10,000 before October 1"
                  type="search"
                />
              </label>
              <label className="field">
                <span>Sort</span>
                <select defaultValue={sort} name="sort">
                  {POOL_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">Apply smart search</button>
              {hasSmartSearch ? <Link className="button button-secondary" href="/pools">Clear search</Link> : null}
            </div>
            {query || activeConstraints.length ? (
              <div className="tag-row" aria-live="polite">
                {query ? <span className="badge">Query: {query}</span> : null}
                {activeConstraints.map((label) => <span className="badge" key={label}>{label}</span>)}
              </div>
            ) : null}
            <p className="form-help">
              Generic money limits apply to the pool’s published maximum target funding. A pool with
              no public deadline or verification state cannot satisfy a hard constraint on that field.
            </p>
          </SmartQueryForm>

          {liveDataAvailable ? (
            routes.length > 0 ? (
              <div className="mt-pool-list">
                {routes.map((route) => (
                  <article className="mt-pool-row" key={route.id}>
                    <div>
                      <p className="mt-market-eyebrow">{route.causeArea}</p>
                      <h3>{route.title}</h3>
                      <p>{route.statusSentence}</p>
                    </div>
                    <div className="mt-pool-row-meta">
                      <strong>
                        {route.minimumFundingCents
                          ? `${formatMoney(route.minimumFundingCents, route.currency)} minimum`
                          : "No minimum recorded"}
                      </strong>
                      <span>{formatMoney(route.targetFundingCents, route.currency)} maximum</span>
                      <span>{formatDate(route.deadlineAt)}</span>
                      <span>{route.fundingMode === "real_money" ? "Real-money" : "Pledge-only"}</span>
                    </div>
                    <Link className="button button-primary" href={route.href}>Request access</Link>
                  </article>
                ))}
              </div>
            ) : (
              <article className={liveStyles.emptyState}>
                <div className={liveStyles.stateHeader}>
                  <h3>{hasSmartSearch ? "No pool satisfies every hard constraint." : "No open pools."}</h3>
                  <span className={liveStyles.liveBadge}>0</span>
                </div>
                <p>
                  {hasSmartSearch
                    ? "Remove one budget, deadline, cause, or verification constraint. Unknown fields are not treated as matches."
                    : "Propose a pool with explicit exposure, threshold, deadline, and evidence terms."}
                </p>
                <div className="mt-product-actions">
                  {hasSmartSearch ? <Link className="button button-primary" href="/pools">Clear search</Link> : null}
                  <Link className="button button-secondary" href="/mpgf/pools/new">Propose a pool</Link>
                  <Link className="button button-secondary" href="/contact">Contact the operator</Link>
                </div>
              </article>
            )
          ) : (
            <article className={liveStyles.unavailableState}>
              <div className={liveStyles.stateHeader}>
                <h3>Pool inventory unavailable.</h3>
                <span className={liveStyles.unavailableBadge}>Unavailable</span>
              </div>
              <div className="mt-product-actions">
                <Link className="button button-secondary" href="/status">Check service status</Link>
              </div>
            </article>
          )}
        </section>

        <section className="mt-product-section" aria-labelledby="pool-financial-heading">
          <div className="mt-product-section-head">
            <div><h2 id="pool-financial-heading">Financial state</h2></div>
          </div>

          <div className="pilot-metric-grid">
            <MetricCard
              label="Open conditional exposure"
              value={liveDataAvailable ? formatMoney(financial.openConditionalExposureCents, financial.currency) : "—"}
              detail="Uncharged maximums on open live mandates."
            />
            <MetricCard
              label="Net charged"
              value={liveDataAvailable ? formatMoney(financial.netChargedCents, financial.currency) : "—"}
              detail="Successful live charges less recorded refunds."
            />
            <MetricCard
              label="Transferred"
              value={liveDataAvailable ? formatMoney(financial.transferredCents, financial.currency) : "—"}
              detail="Settlement transfers in transferred state."
            />
            <MetricCard
              label="Refunded"
              value={liveDataAvailable ? formatMoney(financial.refundedCents, financial.currency) : "—"}
              detail="Refunded amount recorded against payment attempts."
            />
          </div>

          <article className={liveStyles.readinessPanel}>
            <div className={liveStyles.readinessCopy}>
              <p className="eyebrow">Payment acceptance</p>
              <h3>{liveDataAvailable ? readinessLabel(readiness.status) : "Unavailable"}</h3>
            </div>
            <dl className={liveStyles.readinessFacts}>
              <div><dt>Passed</dt><dd>{liveDataAvailable ? readiness.passedGateCount : "—"}</dd></div>
              <div><dt>Pending</dt><dd>{liveDataAvailable ? readiness.pendingGateCount : "—"}</dd></div>
              <div><dt>Blocked</dt><dd>{liveDataAvailable ? readiness.blockedGateCount : "—"}</dd></div>
              <div><dt>Live mandates</dt><dd>{liveDataAvailable ? financial.liveMandateCount : "—"}</dd></div>
            </dl>
          </article>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="pool-terms-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Before you pledge</p>
              <h2 id="pool-terms-heading">The condition is part of the product.</h2>
            </div>
            <p>
              Threshold progress is not enough. Recipient, authorization, evidence, settlement,
              refund or release behavior, visibility, and challenge rights travel with the route.
            </p>
          </div>
          <div className="mt-mechanism-facts">
            {mechanismFacts.map(([title, description]) => (
              <article className="mt-mechanism-fact" key={title}>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-product-actions">
            <Link className="button button-primary" href="/moral-goods-group-buying">Group-buying details</Link>
            <Link className="button button-secondary" href="/trust">Review safeguards</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
