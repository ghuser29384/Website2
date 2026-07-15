import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  MORAL_GOODS_FEATURE_CAPABILITIES,
  MORAL_GOODS_SEED_ENVELOPES,
  buildDealCardModel,
  formatMinorMoney,
  getPrivateProposalIntakeFields,
  type MoralGoodsPurchaseEnvelope,
} from "@/lib/moral-trade/group-buying";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./moral-goods-group-buying.module.css";

export const metadata: Metadata = {
  title: "Fund verified actions together",
  description:
    "Compare small, conditional ways to fund verified moral actions, with the action, consideration, deadline, evidence, and failure rule shown together.",
  alternates: {
    canonical: "/moral-goods-group-buying",
  },
  openGraph: {
    title: "Fund verified actions together | Moral Trade",
    description:
      "A clear preview of group-funded moral-action routes, recurring budgets, participant proof, and public reporting.",
    url: getAbsoluteUrl("/moral-goods-group-buying"),
    type: "website",
  },
};

const routePresentation: Record<
  string,
  {
    eyebrow: string;
    title: string;
    summary: string;
  }
> = {
  "lot:no-meat-2-day-50": {
    eyebrow: "Fund one verified action",
    title: "Fund one 2-day no-meat pledge",
    summary:
      "One selected adult avoids meat and fish for two days. If the action verifies under the frozen rules, $50 is donated to an approved charity selected by the participant.",
  },
  "basket:no-meat-5x50": {
    eyebrow: "Fund several similar actions",
    title: "Fund a basket of five 2-day pledges",
    summary:
      "Five participant obligations are funded together, while each person keeps an independent acceptance, evidence, failure, and settlement record.",
  },
  "round:vegetarian-30-day": {
    eyebrow: "Fund a reviewed round",
    title: "Sponsor a 30-day vegetarian round",
    summary:
      "Selected adults complete a longer diet-shift window. Participant payouts depend on verified, protocol-adjusted action units rather than a single group-wide success claim.",
  },
  "standing-pool:animal-welfare-5-month": {
    eyebrow: "Set a bounded recurring budget",
    title: "Allocate up to $5 a month across eligible routes",
    summary:
      "A standing preference can direct small amounts to compatible lots or baskets. It is an allocation rule, not a stored wallet balance or an impact claim by itself.",
  },
};

const routePriority = new Map([
  ["lot:no-meat-2-day-50", 0],
  ["basket:no-meat-5x50", 1],
  ["round:vegetarian-30-day", 2],
  ["standing-pool:animal-welfare-5-month", 3],
]);

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "No fixed deadline";
}

function formatStartingAmount(envelope: MoralGoodsPurchaseEnvelope) {
  const amountMinor =
    envelope.funding.microPledgeDefaultMinor ??
    envelope.funding.providerMinimumMinor ??
    envelope.funding.targetMinor;

  return formatMinorMoney({
    amountMinor,
    currency: envelope.currency,
  });
}

function statusClass(envelope: MoralGoodsPurchaseEnvelope) {
  if (
    envelope.stateGroup === "funding" ||
    envelope.stateGroup === "funded_awaiting_acceptance" ||
    envelope.stateGroup === "accepted_not_active"
  ) {
    return styles.statusFunding;
  }

  if (
    envelope.stateGroup === "active" ||
    envelope.stateGroup === "evidence_due" ||
    envelope.stateGroup === "under_review" ||
    envelope.stateGroup === "settling" ||
    envelope.stateGroup === "completed"
  ) {
    return styles.statusAction;
  }

  return "";
}

function RouteCard({
  envelope,
  featured = false,
}: {
  envelope: MoralGoodsPurchaseEnvelope;
  featured?: boolean;
}) {
  const card = buildDealCardModel(envelope, "funder");
  const presentation = routePresentation[envelope.id] ?? {
    eyebrow: card.primaryLabel,
    title: envelope.title,
    summary: card.rows.statusSentence,
  };
  const targetAmount = formatMinorMoney({
    amountMinor: envelope.funding.targetMinor,
    currency: envelope.currency,
  });

  return (
    <article
      className={[
        styles.routeCard,
        featured ? styles.routeCardFeatured : "",
      ]
        .filter(Boolean)
        .join(" ")}
      id={envelope.slug}
    >
      <header className={styles.routeCardHeader}>
        <div>
          <p className={styles.cardKicker}>{presentation.eyebrow}</p>
          <h3>{presentation.title}</h3>
        </div>
        <div className={styles.statusStack}>
          <span className={styles.demoBadge}>Illustrative route</span>
          <span
            className={[styles.statusBadge, statusClass(envelope)]
              .filter(Boolean)
              .join(" ")}
          >
            {card.rows.status}
          </span>
        </div>
      </header>

      <p className={styles.routeSummary}>{presentation.summary}</p>

      <div className={styles.routeMetrics}>
        <div>
          <span className={styles.routeMetaLabel}>Starting amount</span>
          <strong>{formatStartingAmount(envelope)}</strong>
        </div>
        <div>
          <span className={styles.routeMetaLabel}>Route target</span>
          <strong>{targetAmount}</strong>
        </div>
        <div>
          <span className={styles.routeMetaLabel}>Funding deadline</span>
          <strong>{formatDate(envelope.deadlines.fundingAt)}</strong>
        </div>
      </div>

      <dl className={styles.routeTerms}>
        <div>
          <dt>Participant action</dt>
          <dd>{card.rows.action}</dd>
        </div>
        <div>
          <dt>What funding provides</dt>
          <dd>{card.rows.consideration}</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd>{card.rows.statusSentence}</dd>
        </div>
        <div>
          <dt>If it does not complete</dt>
          <dd>{card.rows.failureBehavior}</dd>
        </div>
      </dl>

      <div className={styles.cardFooter}>
        <p className={styles.cardNote}>
          This is a route preview. Opening it does not authorize money, instruct a participant,
          or create a completed impact claim.
        </p>
        <div className={styles.cardActions}>
          <Link className="button button-primary" href="/contact">
            Request pilot access
          </Link>
        </div>
      </div>

      <details className={styles.disclosure}>
        <summary>Evidence, privacy, and settlement terms</summary>
        <div className={styles.disclosureBody}>
          <div>
            <strong>Evidence</strong>
            <p>{card.details.verification}</p>
          </div>
          <div>
            <strong>Method</strong>
            <p>{card.details.methodology}</p>
          </div>
          <div>
            <strong>Privacy</strong>
            <p>{card.details.privacy}</p>
          </div>
          <div>
            <strong>Money and tax limits</strong>
            <p>{card.details.donationTaxLimits}</p>
          </div>
          <div>
            <strong>Dispute window</strong>
            <p>{card.details.disputes}</p>
          </div>
          <div>
            <strong>Public record</strong>
            <p className={styles.mono}>{card.details.snapshotIdentifier}</p>
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function MoralGoodsGroupBuyingPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const routes = [...MORAL_GOODS_SEED_ENVELOPES].sort(
    (a, b) => (routePriority.get(a.id) ?? 99) - (routePriority.get(b.id) ?? 99),
  );
  const reportRoutes = routes.filter((route) => route.publicReport.rawUnits > 0);
  const productionCapability = MORAL_GOODS_FEATURE_CAPABILITIES.find(
    (capability) => capability.featureModule === "production_real_money_movement",
  );
  const participantHref = isAuthenticated
    ? "/contact"
    : "/signup?returnTo=/onboarding";
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/moral-goods-group-buying", label: "Moral Goods Group Buying" },
  ]);

  return (
    <div className="page-shell marketplace-product-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />

      <div className="mt-beta-strip">
        <span>Preview</span>
        <span>These group-buying records are illustrative. No live payment starts on this page.</span>
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
            <p className={styles.kicker}>Conditional funding for verified action</p>
            <h1 id="group-buying-heading">Fund verified actions together.</h1>
            <p className={styles.heroText}>
              Compare a small number of group-funded routes without reading a wall of policy
              text. Each route keeps the participant action, consideration, deadline, evidence,
              and failure rule together.
            </p>
            <div className={styles.heroActions}>
              <Link className="button button-primary" href="#fund">
                Browse funding routes
              </Link>
              <Link className="button button-secondary" href="#participate">
                Apply to participate
              </Link>
            </div>
            <ul className={styles.proofLine} aria-label="Group-buying safeguards">
              <li>Maximum exposure shown</li>
              <li>No action before acceptance</li>
              <li>Evidence before settlement</li>
              <li>Failure rule published</li>
            </ul>
          </div>

          <div className={styles.heroSummary}>
            <article className={styles.summaryPanel}>
              <header>
                <div>
                  <p className={styles.cardKicker}>At a glance</p>
                  <h2>Four bounded ways to coordinate.</h2>
                </div>
                <span className={styles.previewBadge}>Demo data</span>
              </header>
              <div className={styles.summaryMetrics}>
                <div>
                  <span className={styles.metricLabel}>Routes</span>
                  <strong>{routes.length}</strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>One-off formats</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>Recurring format</span>
                  <strong>1</strong>
                </div>
                <div>
                  <span className={styles.metricLabel}>Charged here</span>
                  <strong>$0</strong>
                </div>
              </div>
              <p className={styles.summaryNote}>
                The preview separates interest, authorization, participant acceptance, proof,
                and settlement. Those states are not interchangeable.
              </p>
            </article>
          </div>
        </section>

        <nav className={styles.routeNav} aria-label="Group-buying page sections">
          <Link href="#fund">
            <span>01</span>
            <strong>Funding routes</strong>
          </Link>
          <Link href="#participate">
            <span>02</span>
            <strong>Participate</strong>
          </Link>
          <Link href="#results">
            <span>03</span>
            <strong>Results</strong>
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
              <p className={styles.sectionKicker}>Fund</p>
              <h2 id="fund-heading">Choose a route.</h2>
            </div>
            <p>
              The most commonly requested route appears first. Additional evidence, privacy,
              methodology, tax, and dispute detail stays available without dominating the card.
            </p>
          </div>

          <div className={styles.routeList}>
            {routes.map((route, index) => (
              <RouteCard envelope={route} featured={index === 0} key={route.id} />
            ))}
          </div>
        </section>

        <section
          className={styles.section}
          id="participate"
          aria-labelledby="participate-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Participate</p>
              <h2 id="participate-heading">Apply first. Act only when invited.</h2>
            </div>
            <p>
              Participant eligibility, baseline, consideration, action window, evidence, and
              withdrawal rights are reviewed before a person is told to begin.
            </p>
          </div>

          <div className={styles.participantPanel}>
            <article className={styles.participantNotice}>
              <p className={styles.cardKicker}>Your next instruction</p>
              <h3>Do not start until your record says “Start now.”</h3>
              <p>
                Funding interest alone does not activate an action. A selected participant must
                accept the frozen terms and see the final action window, evidence request, and
                failure consequences first.
              </p>
              <div className={styles.sectionActions}>
                <Link className="button button-primary" href={participantHref}>
                  Apply to participate
                </Link>
                <Link className="button button-secondary" href="/trust">
                  Review participant protections
                </Link>
              </div>
            </article>

            <article className={styles.privateProposal}>
              <p className={styles.cardKicker}>Suggest another action</p>
              <h3>Private until reviewed.</h3>
              <p>
                A suggestion is not listed, funded, or treated as an obligation unless it passes
                review and is converted into a bounded route.
              </p>
              <details className={styles.disclosure}>
                <summary>What the intake asks for</summary>
                <ul className={styles.privateFields}>
                  {getPrivateProposalIntakeFields().map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </details>
              <Link className="button button-secondary" href="/contact">
                Suggest an action privately
              </Link>
            </article>
          </div>
        </section>

        <section
          className={[styles.section, styles.sectionWhite].join(" ")}
          id="results"
          aria-labelledby="results-heading"
        >
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Results</p>
              <h2 id="results-heading">Report states separately.</h2>
            </div>
            <p>
              These are illustrative reporting records. Raw actions, protocol-adjusted units,
              and paid or donated amounts remain separate; none is presented as a universal moral
              score.
            </p>
          </div>

          <div className={styles.reportList}>
            {reportRoutes.map((route) => {
              const card = buildDealCardModel(route, "public");
              const totalExecuted =
                route.publicReport.participantPayoutTotalMinor +
                route.publicReport.donationTotalMinor;

              return (
                <article className={styles.reportRow} key={route.id}>
                  <div className={styles.reportIdentity}>
                    <p className={styles.reportEyebrow}>Illustrative public report</p>
                    <h3>{routePresentation[route.id]?.title ?? route.title}</h3>
                    <p>{card.rows.status}</p>
                  </div>
                  <div className={styles.reportMetric}>
                    <span className={styles.metricLabel}>Raw action units</span>
                    <strong>{route.publicReport.rawUnits.toLocaleString("en-US")}</strong>
                    <p>Counted under the route’s action definition.</p>
                  </div>
                  <div className={styles.reportMetric}>
                    <span className={styles.metricLabel}>Protocol-adjusted</span>
                    <strong>
                      {(route.publicReport.adjustedUnitsMilli / 1000).toLocaleString("en-US")}
                    </strong>
                    <p>Method-relative, not a platform moral ranking.</p>
                  </div>
                  <div className={styles.reportMetric}>
                    <span className={styles.metricLabel}>Paid or donated</span>
                    <strong>
                      {formatMinorMoney({
                        amountMinor: totalExecuted,
                        currency: route.currency,
                      })}
                    </strong>
                    <p>{route.publicReport.smallCellSuppression}</p>
                  </div>
                </article>
              );
            })}
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
              <h2 id="how-it-works-heading">One route. Four explicit gates.</h2>
            </div>
            <p>
              The user journey stays short. The mechanism remains inspectable before anyone
              relies on it.
            </p>
          </div>

          <ol className={styles.processGrid}>
            <li>
              <span>01</span>
              <h3>Review the route</h3>
              <p>See the action, consideration, maximum amount, deadline, and failure rule together.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Accept frozen terms</h3>
              <p>Funding and participant acceptance remain separate. Neither silently activates the other.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Complete and evidence</h3>
              <p>The participant follows the stated window and submits only the evidence named in advance.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Settle or release</h3>
              <p>Successful records settle under the published rule; failed or expired records follow the stated release path.</p>
            </li>
          </ol>

          <div className={styles.safeguardGrid}>
            <article>
              <span>01</span>
              <h3>Terms do not drift</h3>
              <p>Material changes require a new review and renewed acceptance rather than silent edits.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Participants are not inventory</h3>
              <p>Selection, welfare review, withdrawal rights, privacy, and action timing remain explicit.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Failure is a normal state</h3>
              <p>Nothing is labelled completed merely because funding interest or an authorization exists.</p>
            </article>
          </div>

          <details className={styles.advancedPanel}>
            <summary>Advanced mechanism and capability detail</summary>
            <div className={styles.advancedContent}>
              <article>
                <h3>Payment capability</h3>
                <p>
                  {productionCapability?.publicReason ??
                    "Payment capability is disclosed before a user can rely on it."}
                </p>
              </article>
              <article>
                <h3>Public records</h3>
                <p>
                  Every route keeps a frozen public identifier, a separate evidence state, and a
                  separate settlement state. Raw participant evidence stays private by default.
                </p>
              </article>
            </div>
          </details>

          <div className={styles.resourceLinks}>
            <Link className="button button-primary" href="/trust">
              What you can rely on
            </Link>
            <Link className="button button-secondary" href="/methodology">
              Review methodology
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
