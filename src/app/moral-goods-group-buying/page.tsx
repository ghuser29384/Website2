import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  loadLiveGroupBuyingSnapshot,
  type LiveGroupBuyingRoute,
} from "@/lib/moral-trade/group-buying-live";
import { getPrivateProposalIntakeFields } from "@/lib/moral-trade/group-buying";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import liveStyles from "./live-state.module.css";
import styles from "./moral-goods-group-buying.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live group buying",
  description:
    "View current production group-buying inventory and financial state. Demo, test, sandbox, and simulated records are excluded.",
  alternates: {
    canonical: "/moral-goods-group-buying",
  },
  openGraph: {
    title: "Live group buying | Moral Trade",
    description:
      "Current production inventory, conditional exposure, charges, refunds, transfers, and payment-readiness state for Moral Trade group buying.",
    url: getAbsoluteUrl("/moral-goods-group-buying"),
    type: "website",
  },
};

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

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No live financial activity recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
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

function readinessBadgeClass(status: "ready" | "pending" | "blocked" | "unavailable") {
  if (status === "ready") {
    return liveStyles.readyBadge;
  }

  if (status === "pending") {
    return liveStyles.pendingBadge;
  }

  if (status === "blocked") {
    return liveStyles.blockedBadge;
  }

  return liveStyles.unavailableBadge;
}

function gateStatusClass(status: "passed" | "pending" | "blocked" | "unknown") {
  if (status === "passed") {
    return liveStyles.gateStatusPassed;
  }

  if (status === "pending") {
    return liveStyles.gateStatusPending;
  }

  if (status === "blocked") {
    return liveStyles.gateStatusBlocked;
  }

  return "";
}

function FinancialMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className={liveStyles.financialMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function RouteCard({ route }: { route: LiveGroupBuyingRoute }) {
  const minimum = route.minimumFundingCents
    ? formatMoney(route.minimumFundingCents, route.currency)
    : "No minimum recorded";

  return (
    <article className={styles.routeCard} id={route.publicKey}>
      <header className={styles.routeCardHeader}>
        <div>
          <p className={styles.cardKicker}>{route.causeArea}</p>
          <h3>{route.title}</h3>
        </div>
        <div className={styles.statusStack}>
          <span className={liveStyles.liveBadge}>Live inventory</span>
          <span className={[styles.statusBadge, styles.statusFunding].join(" ")}>
            {route.statusLabel}
          </span>
        </div>
      </header>

      <p className={styles.routeSummary}>{route.summary}</p>

      <div className={styles.routeMetrics}>
        <div>
          <span className={styles.routeMetaLabel}>Minimum condition</span>
          <strong>{minimum}</strong>
        </div>
        <div>
          <span className={styles.routeMetaLabel}>Maximum requested</span>
          <strong>{formatMoney(route.targetFundingCents, route.currency)}</strong>
        </div>
        <div>
          <span className={styles.routeMetaLabel}>Current deadline</span>
          <strong>{formatDate(route.deadlineAt)}</strong>
        </div>
      </div>

      <dl className={styles.routeTerms}>
        <div>
          <dt>Intervention</dt>
          <dd>{route.intervention}</dd>
        </div>
        <div>
          <dt>Recipient</dt>
          <dd>{route.recipientName}</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd>{route.statusSentence}</dd>
        </div>
        <div>
          <dt>If it does not complete</dt>
          <dd>{route.failureBehavior}</dd>
        </div>
      </dl>

      <div className={styles.cardFooter}>
        <p className={styles.cardNote}>
          This record comes from current production inventory. A pledge-only route records real
          participant intent but is not a charge, donation, transfer, or completed impact claim.
        </p>
        <div className={styles.cardActions}>
          <Link className="button button-primary" href={route.href}>
            Request route access
          </Link>
        </div>
      </div>

      <details className={styles.disclosure}>
        <summary>Verification and public reporting terms</summary>
        <div className={styles.disclosureBody}>
          <div>
            <strong>Verification</strong>
            <p>{route.verificationSummary}</p>
          </div>
          <div>
            <strong>Expected effect</strong>
            <p>{route.expectedEffect}</p>
          </div>
          <div>
            <strong>Timeline</strong>
            <p>{route.timeline}</p>
          </div>
          <div>
            <strong>Funding mode</strong>
            <p>{route.fundingMode === "real_money" ? "Live real-money" : "Live pledge-only"}</p>
          </div>
          <div>
            <strong>Cause area</strong>
            <p>{route.causeArea}</p>
          </div>
          <div>
            <strong>Public key</strong>
            <p className={styles.mono}>{route.publicKey}</p>
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function MoralGoodsGroupBuyingPage() {
  const [viewer, snapshot] = await Promise.all([getViewer(), loadLiveGroupBuyingSnapshot()]);
  const isAuthenticated = Boolean(viewer);
  const participantHref = isAuthenticated ? "/contact" : "/signup?returnTo=/onboarding";
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/moral-goods-group-buying", label: "Moral Goods Group Buying" },
  ]);
  const financial = snapshot.financial;
  const readiness = snapshot.paymentReadiness;
  const liveDataAvailable = snapshot.sourceStatus === "live";
  const stripMessage = liveDataAvailable
    ? "Production inventory and financial totals are live. Demo, test, sandbox, and simulated rows are excluded."
    : "Production inventory could not be read. No demo fallback is being shown.";

  return (
    <div className="page-shell marketplace-product-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />

      <div className="mt-beta-strip">
        <span>Live state</span>
        <span>{stripMessage}</span>
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

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <Breadcrumbs
          items={[
            {
              href: "/moral-goods-group-buying",
              label: "Moral Goods Group Buying",
            },
          ]}
        />

        <section className={styles.hero} aria-labelledby="group-buying-heading">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Production inventory and financial state</p>
            <h1 id="group-buying-heading">Live group buying, without demo inventory.</h1>
            <p className={styles.heroText}>
              See only approved production routes and the money states actually recorded for them.
              Empty inventory appears as empty inventory; test data is never substituted for demand.
            </p>
            <div className={styles.heroActions}>
              <Link className="button button-primary" href="#fund">
                View live inventory
              </Link>
              <Link className="button button-secondary" href="#financial-state">
                View financial state
              </Link>
            </div>
            <ul className={styles.proofLine} aria-label="Live-data rules">
              <li>Production records only</li>
              <li>Test rows excluded</li>
              <li>Money states separated</li>
              <li>No inferred impact claims</li>
            </ul>
          </div>

          <div className={styles.heroSummary}>
            <article className={styles.summaryPanel}>
              <header>
                <div>
                  <p className={styles.cardKicker}>Current state</p>
                  <h2>{liveDataAvailable ? "Read from production." : "Live data unavailable."}</h2>
                </div>
                <span className={liveDataAvailable ? liveStyles.liveBadge : liveStyles.unavailableBadge}>
                  {liveDataAvailable ? "Live data" : "Unavailable"}
                </span>
              </header>
              <div className={styles.summaryMetrics}>
                <div>
                  <span className={styles.metricLabel}>Live routes</span>
                  <strong>{liveDataAvailable ? snapshot.routes.length : "—"}</strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>Open cycles</span>
                  <strong>{liveDataAvailable ? snapshot.openCycleCount : "—"}</strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>Open exposure</span>
                  <strong>
                    {liveDataAvailable
                      ? formatMoney(financial.openConditionalExposureCents, financial.currency)
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>Net charged</span>
                  <strong>
                    {liveDataAvailable
                      ? formatMoney(financial.netChargedCents, financial.currency)
                      : "—"}
                  </strong>
                </div>
              </div>
              <p className={styles.summaryNote}>
                Checked {formatTimestamp(snapshot.checkedAt)}. Pledge-only records are inventory or
                intent, not live financial transactions.
              </p>
            </article>
          </div>
        </section>

        <nav className={styles.routeNav} aria-label="Group-buying page sections">
          <Link href="#fund">
            <span>01</span>
            <strong>Live inventory</strong>
          </Link>
          <Link href="#financial-state">
            <span>02</span>
            <strong>Financial state</strong>
          </Link>
          <Link href="#participate">
            <span>03</span>
            <strong>Participate</strong>
          </Link>
          <Link href="#how-it-works">
            <span>04</span>
            <strong>How it works</strong>
          </Link>
        </nav>

        <section
          className={[styles.section, styles.sectionWhite].join(" ")}
          id="fund"
          aria-labelledby="fund-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Live inventory</p>
              <h2 id="fund-heading">Routes that exist now.</h2>
            </div>
            <p>
              A route appears here only when a reviewed production proposal is attached to a
              non-demo, non-test cycle. The absence of a route is not replaced by a worked example.
            </p>
          </div>

          {liveDataAvailable ? (
            snapshot.routes.length > 0 ? (
              <div className={styles.routeList}>
                {snapshot.routes.map((route) => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </div>
            ) : (
              <article className={liveStyles.emptyState}>
                <div className={liveStyles.stateHeader}>
                  <div>
                    <p className={styles.cardKicker}>Current production result</p>
                    <h3>No live group-funded routes are open.</h3>
                  </div>
                  <span className={liveStyles.liveBadge}>0 routes</span>
                </div>
                <p>
                  The production database currently contains no approved, non-demo group-buying
                  inventory. Demo cycles, test destinations, simulated pledges, and illustrative
                  outcomes are intentionally omitted.
                </p>
                <div className={styles.cardActions}>
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
                  <p className={styles.cardKicker}>Data source</p>
                  <h3>Live inventory is temporarily unavailable.</h3>
                </div>
                <span className={liveStyles.unavailableBadge}>No fallback</span>
              </div>
              <p>
                The page could not read the production source. It is withholding inventory and
                financial totals rather than presenting seed records as live activity.
              </p>
              <div className={styles.cardActions}>
                <Link className="button button-secondary" href="/status">
                  Check service status
                </Link>
              </div>
            </article>
          )}
        </section>

        <section
          className={styles.section}
          id="financial-state"
          aria-labelledby="financial-state-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Financial state</p>
              <h2 id="financial-state-heading">Money that is actually recorded.</h2>
            </div>
            <p>
              Conditional exposure, successful charges, refunds, transfers, and recurring
              commitments are reported separately. Pledge-only intent is excluded from these totals.
            </p>
          </div>

          {liveDataAvailable ? (
            <>
              <div className={liveStyles.financialGrid}>
                <FinancialMetric
                  label="Open conditional exposure"
                  value={formatMoney(financial.openConditionalExposureCents, financial.currency)}
                  detail="Uncharged maximums on open live public-goods payment mandates."
                />
                <FinancialMetric
                  label="Net charged"
                  value={formatMoney(financial.netChargedCents, financial.currency)}
                  detail="Successful live payment attempts less recorded refunds."
                />
                <FinancialMetric
                  label="Transferred"
                  value={formatMoney(financial.transferredCents, financial.currency)}
                  detail="Settlement transfers whose live state is transferred."
                />
                <FinancialMetric
                  label="Refunded"
                  value={formatMoney(financial.refundedCents, financial.currency)}
                  detail="Refunded amount recorded against charged payment attempts."
                />
                <FinancialMetric
                  label="Active monthly commitments"
                  value={formatMoney(financial.activeRecurringMonthlyCents, financial.currency)}
                  detail={`${financial.activeRecurringCommitmentCount} recurring commitment${
                    financial.activeRecurringCommitmentCount === 1 ? "" : "s"
                  } in real-money mode.`}
                />
                <FinancialMetric
                  label="Live payment mandates"
                  value={String(financial.liveMandateCount)}
                  detail={`${financial.openMandateCount} currently open for setup, authorization, or charge.`}
                />
              </div>

              <article className={liveStyles.readinessPanel}>
                <div className={liveStyles.readinessCopy}>
                  <div className={liveStyles.readinessHeader}>
                    <div>
                      <p className={styles.cardKicker}>Payment acceptance</p>
                      <h3>{readinessLabel(readiness.status)}</h3>
                    </div>
                    <span className={readinessBadgeClass(readiness.status)}>
                      {readinessLabel(readiness.status)}
                    </span>
                  </div>
                  <p>
                    {readiness.status === "ready"
                      ? "All recorded live payment gates pass. Route-level review, terms, and participant acceptance still apply."
                      : readiness.status === "blocked"
                        ? "One or more live payment gates are blocked. This page does not offer authorization or claim that funds can settle."
                        : readiness.status === "pending"
                          ? "No live payment gate is blocked, but one or more required reviews are still pending."
                          : "Live payment readiness could not be determined from the production source."}
                  </p>
                  <p className={liveStyles.truthNote}>
                    Latest financial activity: {formatTimestamp(financial.latestFinancialActivityAt)}.
                  </p>
                </div>

                <div>
                  <dl className={liveStyles.readinessFacts}>
                    <div>
                      <dt>Passed gates</dt>
                      <dd>{readiness.passedGateCount}</dd>
                    </div>
                    <div>
                      <dt>Pending gates</dt>
                      <dd>{readiness.pendingGateCount}</dd>
                    </div>
                    <div>
                      <dt>Blocked gates</dt>
                      <dd>{readiness.blockedGateCount}</dd>
                    </div>
                    <div>
                      <dt>Checked</dt>
                      <dd>{formatTimestamp(snapshot.checkedAt)}</dd>
                    </div>
                  </dl>

                  <details className={liveStyles.gateDisclosure}>
                    <summary>Review live payment gates</summary>
                    <div className={liveStyles.gateList}>
                      {readiness.gates.length > 0 ? (
                        readiness.gates.map((gate) => (
                          <div className={liveStyles.gateRow} key={gate.key}>
                            <strong>{gate.label}</strong>
                            <span
                              className={[
                                liveStyles.gateStatus,
                                gateStatusClass(gate.status),
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {gate.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className={liveStyles.gateRow}>
                          <strong>No live gate records available</strong>
                          <span className={liveStyles.gateStatus}>unknown</span>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </article>
            </>
          ) : (
            <article className={liveStyles.unavailableState}>
              <h3>Financial totals are withheld.</h3>
              <p>
                The production source could not be read. The page shows dashes in the summary and
                does not convert missing data into zero-dollar claims.
              </p>
            </article>
          )}
        </section>

        <section
          className={[styles.section, styles.sectionWhite].join(" ")}
          id="participate"
          aria-labelledby="participate-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Participate</p>
              <h2 id="participate-heading">Create the next reviewed route.</h2>
            </div>
            <p>
              A proposal, participant application, and payment authorization are different records.
              None of them silently creates the others.
            </p>
          </div>

          <div className={styles.participantPanel}>
            <article className={styles.participantNotice}>
              <p className={styles.cardKicker}>Propose inventory</p>
              <h3>Submit a pool for review.</h3>
              <p>
                A proposal becomes visible inventory only after review, assignment to a production
                cycle, and publication of its funding and failure rules.
              </p>
              <div className={styles.sectionActions}>
                <Link className="button button-primary" href="/mpgf/pools/new">
                  Draft a pool proposal
                </Link>
                <Link className="button button-secondary" href="/trust">
                  Review safeguards
                </Link>
              </div>
            </article>

            <article className={styles.privateProposal}>
              <p className={styles.cardKicker}>Participant intake</p>
              <h3>Do not start from a listing alone.</h3>
              <p>
                A selected participant acts only after accepting the frozen action window,
                consideration, evidence request, withdrawal rights, and failure consequences.
              </p>
              <details className={styles.disclosure}>
                <summary>What the private intake asks for</summary>
                <ul className={styles.privateFields}>
                  {getPrivateProposalIntakeFields().map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </details>
              <Link className="button button-secondary" href={participantHref}>
                Apply to participate
              </Link>
            </article>
          </div>
        </section>

        <section
          className={[styles.section, styles.sectionDark].join(" ")}
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>How it works</p>
              <h2 id="how-it-works-heading">Live means backed and state-specific.</h2>
            </div>
            <p>
              Inventory, participant acceptance, payment state, verification, and settlement remain
              separate so the page never upgrades an intention into a completed result.
            </p>
          </div>

          <ol className={styles.processGrid}>
            <li>
              <span>01</span>
              <h3>Publish reviewed inventory</h3>
              <p>A non-demo proposal must be approved and attached to an open production cycle.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Accept frozen terms</h3>
              <p>Funders and participants see limits, deadlines, evidence, and failure rules first.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Record each money state</h3>
              <p>Exposure, charge, refund, transfer, and recurring commitment are not conflated.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Report outcomes separately</h3>
              <p>Verification and impact reporting require their own records after action completes.</p>
            </li>
          </ol>

          <div className={styles.safeguardGrid}>
            <article>
              <span>01</span>
              <h3>No demo substitution</h3>
              <p>Seed, sandbox, simulated, and test-only records do not fill an empty marketplace.</p>
            </article>
            <article>
              <span>02</span>
              <h3>No money-state shortcuts</h3>
              <p>A pledge is not a charge, and a charge is not a transfer or verified outcome.</p>
            </article>
            <article>
              <span>03</span>
              <h3>No false precision</h3>
              <p>When the live source is unavailable, the page says so instead of inventing zeros.</p>
            </article>
          </div>

          <details className={styles.advancedPanel}>
            <summary>What counts as live, and what is excluded</summary>
            <div className={styles.advancedContent}>
              <article>
                <h3>Included</h3>
                <p>
                  Reviewed non-demo inventory, live conditional payment mandates, successful payment
                  attempts, recorded refunds, transferred settlements, and real-money recurring
                  commitments.
                </p>
              </article>
              <article>
                <h3>Excluded</h3>
                <p>
                  Demo cycles, approved-demo alternatives, test destinations, sandbox payments,
                  simulated reports, pledge-only amounts from financial totals, and inferred impact.
                </p>
              </article>
            </div>
          </details>

          <div className={styles.resourceLinks}>
            <Link className="button button-primary" href="/trust">
              What you can rely on
            </Link>
            <Link className="button button-secondary" href="/mpgf/pools/new">
              Propose a pool
            </Link>
            <Link className="button button-secondary" href="/status">
              Current capability status
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
