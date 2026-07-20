import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getPrivateProposalIntakeFields } from "@/lib/moral-trade/group-buying";
import {
  loadLiveGroupBuyingSnapshot,
  type LiveGroupBuyingRoute,
} from "@/lib/moral-trade/group-buying-live";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import liveStyles from "./live-state.module.css";
import styles from "./moral-goods-group-buying.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Group buying",
  description:
    "Browse group-funded routes, financial state, payment readiness, and participation terms.",
  alternates: {
    canonical: "/moral-goods-group-buying",
  },
  openGraph: {
    title: "Group buying | Moral Trade",
    description:
      "Browse group-funded routes, financial state, payment readiness, and participation terms.",
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

function formatTimestamp(value: string | null) {
  if (!value) {
    return "None";
  }

  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      locale="en-US"
      options={{
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        timeZoneName: "short",
        year: "numeric",
      }}
    />
  );
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
          <span className={liveStyles.liveBadge}>Open</span>
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
          <span className={styles.routeMetaLabel}>Deadline</span>
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
        <div className={styles.cardActions}>
          <Link className="button button-primary" href={route.href}>
            Request route access
          </Link>
        </div>
      </div>

      <details className={styles.disclosure}>
        <summary>Verification and reporting terms</summary>
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
            <p>{route.fundingMode === "real_money" ? "Real-money" : "Pledge-only"}</p>
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

  return (
    <div className="page-shell marketplace-product-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />

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
            <h1 id="group-buying-heading">Live group buying.</h1>
            <div className={styles.heroActions}>
              <Link className="button button-primary" href="#fund">
                View open routes
              </Link>
              <Link className="button button-secondary" href="#financial-state">
                View financial state
              </Link>
            </div>
          </div>

          <div className={styles.heroSummary}>
            <article className={styles.summaryPanel}>
              <header>
                <h2>
                  {liveDataAvailable
                    ? `${snapshot.routes.length} open route${snapshot.routes.length === 1 ? "" : "s"}`
                    : "Unavailable"}
                </h2>
                <span className={liveDataAvailable ? liveStyles.liveBadge : liveStyles.unavailableBadge}>
                  {liveDataAvailable ? "Live" : "Unavailable"}
                </span>
              </header>
              <div className={styles.summaryMetrics}>
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
                <div>
                  <span className={styles.metricLabel}>Payment acceptance</span>
                  <strong>{liveDataAvailable ? readinessLabel(readiness.status) : "—"}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

        <nav className={styles.routeNav} aria-label="Group-buying page sections">
          <Link href="#fund">
            <span>01</span>
            <strong>Open routes</strong>
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
            <strong>Process</strong>
          </Link>
        </nav>

        <section
          className={[styles.section, styles.sectionWhite].join(" ")}
          id="fund"
          aria-label="Open group-buying routes"
        >
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
                  <h3>No open routes.</h3>
                  <span className={liveStyles.liveBadge}>0</span>
                </div>
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
                <h3>Route inventory unavailable.</h3>
                <span className={liveStyles.unavailableBadge}>Unavailable</span>
              </div>
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
              <h2 id="financial-state-heading">Financial state</h2>
            </div>
          </div>

          {liveDataAvailable ? (
            <>
              <div className={liveStyles.financialGrid}>
                <FinancialMetric
                  label="Open conditional exposure"
                  value={formatMoney(financial.openConditionalExposureCents, financial.currency)}
                  detail="Uncharged maximums on open payment mandates."
                />
                <FinancialMetric
                  label="Net charged"
                  value={formatMoney(financial.netChargedCents, financial.currency)}
                  detail="Successful charges less recorded refunds."
                />
                <FinancialMetric
                  label="Transferred"
                  value={formatMoney(financial.transferredCents, financial.currency)}
                  detail="Settlement transfers in transferred state."
                />
                <FinancialMetric
                  label="Refunded"
                  value={formatMoney(financial.refundedCents, financial.currency)}
                  detail="Refunds recorded against payment attempts."
                />
                <FinancialMetric
                  label="Active monthly commitments"
                  value={formatMoney(financial.activeRecurringMonthlyCents, financial.currency)}
                  detail={`${financial.activeRecurringCommitmentCount} recurring commitment${
                    financial.activeRecurringCommitmentCount === 1 ? "" : "s"
                  }.`}
                />
                <FinancialMetric
                  label="Payment mandates"
                  value={String(financial.liveMandateCount)}
                  detail={`${financial.openMandateCount} open for setup, authorization, or charge.`}
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
                  <p className={liveStyles.truthNote}>
                    Latest activity: {formatTimestamp(financial.latestFinancialActivityAt)}
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
                    <summary>Payment gates</summary>
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
                          <strong>No gate records</strong>
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
              <h3>Financial state unavailable.</h3>
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
              <h2 id="participate-heading">Create a reviewed route.</h2>
            </div>
          </div>

          <div className={styles.participantPanel}>
            <article className={styles.participantNotice}>
              <p className={styles.cardKicker}>Propose a pool</p>
              <h3>Submit terms for review.</h3>
              <p>
                Specify the funding condition, deadline, recipient, evidence, and failure behavior.
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
              <h3>Review the terms before accepting.</h3>
              <p>
                Check the action window, consideration, evidence request, withdrawal rights, and
                failure consequences.
              </p>
              <details className={styles.disclosure}>
                <summary>Intake fields</summary>
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
              <p className={styles.sectionKicker}>Process</p>
              <h2 id="how-it-works-heading">From proposal to outcome.</h2>
            </div>
          </div>

          <ol className={styles.processGrid}>
            <li>
              <span>01</span>
              <h3>Review the proposal</h3>
              <p>Confirm the recipient, condition, deadline, evidence, and failure behavior.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Accept the terms</h3>
              <p>Funders and participants accept the limits, evidence request, and exit rules.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Fund conditionally</h3>
              <p>Authorization follows the published threshold and payment gates.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Verify and report</h3>
              <p>Evidence is reviewed before an outcome is reported.</p>
            </li>
          </ol>

          <div className={styles.resourceLinks}>
            <Link className="button button-primary" href="/trust">
              Review safeguards
            </Link>
            <Link className="button button-secondary" href="/mpgf/pools/new">
              Propose a pool
            </Link>
            <Link className="button button-secondary" href="/status">
              Service status
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
