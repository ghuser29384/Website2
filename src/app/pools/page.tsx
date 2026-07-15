import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { MetricCard } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { loadLiveGroupBuyingSnapshot } from "@/lib/moral-trade/group-buying-live";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import liveStyles from "../moral-goods-group-buying/live-state.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live conditional pools",
  description:
    "Browse current production conditional pools and see their actual financial state. Demo, test, sandbox, and simulated inventory is excluded.",
  alternates: { canonical: "/pools" },
  openGraph: {
    title: "Live conditional pools at Moral Trade",
    description:
      "Current production pool inventory, conditional exposure, charges, refunds, transfers, and payment-readiness state.",
    url: getAbsoluteUrl("/pools"),
    type: "website",
  },
};

const mechanismFacts = [
  ["Maximum exposure", "Every person sees the most they can be charged before authorizing."],
  ["Funding condition", "The threshold, eligible amount, deadline, and review gates are published together."],
  ["Failure behavior", "A condition that does not pass creates no successful settlement record."],
  ["State vocabulary", "Pledge, authorization, charge, refund, transfer, and outcome remain distinct."],
] as const;

const moneyFormatters = new Map<string, Intl.NumberFormat>();

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
  if (!value) {
    return "No public deadline";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function readinessLabel(status: "ready" | "pending" | "blocked" | "unavailable") {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "pending") {
    return "Pending review";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  return "Unavailable";
}

export default async function PoolsPage() {
  const [viewer, snapshot] = await Promise.all([getViewer(), loadLiveGroupBuyingSnapshot()]);
  const isAuthenticated = Boolean(viewer);
  const liveDataAvailable = snapshot.sourceStatus === "live";
  const financial = snapshot.financial;
  const readiness = snapshot.paymentReadiness;

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Live pools</span>
        <span>
          {liveDataAvailable
            ? "Production inventory and financial totals are current. Demo and test records are excluded."
            : "Production data is unavailable. No demo fallback is being shown."}
        </span>
        <Link href="/status">Status</Link>
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
        <section className="mt-mechanism-hero" aria-labelledby="pools-heading">
          <div className="mt-mechanism-copy">
            <p className="mt-product-kicker">Live conditional pools</p>
            <h1 id="pools-heading">Only show pools that exist.</h1>
            <p>
              Browse reviewed production inventory and the money states actually recorded for it.
              An empty marketplace stays empty instead of being filled with examples.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href="#live-pools">
                Explore live pools
              </Link>
              <Link className="button button-secondary" href="/mpgf/pools/new">
                Propose a pool
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Pool data rules">
              <li>Production records</li>
              <li>Test rows excluded</li>
              <li>Financial state separated</li>
              <li>No demo demand</li>
            </ul>
          </div>

          <aside className="hero-panel panel">
            <p className="eyebrow">Production state</p>
            <h2>{liveDataAvailable ? `${snapshot.routes.length} live routes` : "Data unavailable"}</h2>
            <dl className="detail-grid">
              <div>
                <dt>Open cycles</dt>
                <dd>{liveDataAvailable ? snapshot.openCycleCount : "—"}</dd>
              </div>
              <div>
                <dt>Open exposure</dt>
                <dd>
                  {liveDataAvailable
                    ? formatMoney(financial.openConditionalExposureCents, financial.currency)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Net charged</dt>
                <dd>
                  {liveDataAvailable
                    ? formatMoney(financial.netChargedCents, financial.currency)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Payment acceptance</dt>
                <dd>{liveDataAvailable ? readinessLabel(readiness.status) : "Unavailable"}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section
          className="mt-product-section is-white"
          id="live-pools"
          aria-labelledby="live-pools-heading"
        >
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Marketplace</p>
              <h2 id="live-pools-heading">Current production inventory.</h2>
            </div>
            <p>
              A route appears only after a reviewed proposal is attached to an open, non-demo
              production cycle. Pledge-only routes may be live inventory without being financial
              transactions.
            </p>
          </div>

          {liveDataAvailable ? (
            snapshot.routes.length > 0 ? (
              <div className="mt-pool-list">
                {snapshot.routes.map((route) => (
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
                    <Link className="button button-primary" href={route.href}>
                      Request access
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <article className={liveStyles.emptyState}>
                <div className={liveStyles.stateHeader}>
                  <div>
                    <p className="eyebrow">Current production result</p>
                    <h3>No live conditional pools are open.</h3>
                  </div>
                  <span className={liveStyles.liveBadge}>0 routes</span>
                </div>
                <p>
                  The database currently contains no approved, non-demo pool inventory. This is the
                  actual marketplace state, not an error and not an invitation to infer demand from
                  worked examples.
                </p>
                <div className="mt-product-actions">
                  <Link className="button button-primary" href="/mpgf/pools/new">
                    Propose a pool
                  </Link>
                  <Link className="button button-secondary" href="/contact">
                    Contact the operator
                  </Link>
                </div>
              </article>
            )
          ) : (
            <article className={liveStyles.unavailableState}>
              <div className={liveStyles.stateHeader}>
                <div>
                  <p className="eyebrow">Data source</p>
                  <h3>Live inventory is temporarily unavailable.</h3>
                </div>
                <span className={liveStyles.unavailableBadge}>No fallback</span>
              </div>
              <p>
                The page is withholding inventory rather than substituting seed or test records.
              </p>
              <div className="mt-product-actions">
                <Link className="button button-secondary" href="/status">
                  Check service status
                </Link>
              </div>
            </article>
          )}
        </section>

        <section className="mt-product-section" aria-labelledby="pool-financial-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Financial state</p>
              <h2 id="pool-financial-heading">Current production totals.</h2>
            </div>
            <p>
              These totals come from live public-goods payment mandates, attempts, refunds,
              transfers, and real-money recurring commitments. Pledge-only records are excluded.
            </p>
          </div>

          <div className="pilot-metric-grid">
            <MetricCard
              label="Open conditional exposure"
              value={
                liveDataAvailable
                  ? formatMoney(financial.openConditionalExposureCents, financial.currency)
                  : "Unavailable"
              }
              detail="Uncharged maximums on open live mandates."
            />
            <MetricCard
              label="Net charged"
              value={
                liveDataAvailable
                  ? formatMoney(financial.netChargedCents, financial.currency)
                  : "Unavailable"
              }
              detail="Successful live charges less recorded refunds."
            />
            <MetricCard
              label="Transferred"
              value={
                liveDataAvailable
                  ? formatMoney(financial.transferredCents, financial.currency)
                  : "Unavailable"
              }
              detail="Settlement transfers in transferred state."
            />
            <MetricCard
              label="Refunded"
              value={
                liveDataAvailable
                  ? formatMoney(financial.refundedCents, financial.currency)
                  : "Unavailable"
              }
              detail="Refunded amount recorded against payment attempts."
            />
          </div>

          <article className={liveStyles.readinessPanel}>
            <div className={liveStyles.readinessCopy}>
              <p className="eyebrow">Payment acceptance</p>
              <h3>{liveDataAvailable ? readinessLabel(readiness.status) : "Unavailable"}</h3>
              <p>
                {liveDataAvailable && readiness.status === "ready"
                  ? "All recorded live payment gates pass. Route-specific review and participant acceptance still apply."
                  : liveDataAvailable && readiness.status === "blocked"
                    ? "One or more live payment gates are blocked. No authorization or settlement claim is offered here."
                    : liveDataAvailable && readiness.status === "pending"
                      ? "One or more required live reviews remain pending."
                      : "Payment readiness could not be determined from the production source."}
              </p>
            </div>
            <dl className={liveStyles.readinessFacts}>
              <div>
                <dt>Passed</dt>
                <dd>{liveDataAvailable ? readiness.passedGateCount : "—"}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd>{liveDataAvailable ? readiness.pendingGateCount : "—"}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{liveDataAvailable ? readiness.blockedGateCount : "—"}</dd>
              </div>
              <div>
                <dt>Live mandates</dt>
                <dd>{liveDataAvailable ? financial.liveMandateCount : "—"}</dd>
              </div>
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
                <span>Required field</span>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-product-actions">
            <Link className="button button-primary" href="/moral-goods-group-buying">
              Open full live state
            </Link>
            <Link className="button button-secondary" href="/trust">
              Review safeguards
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
