import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, IconMark, PageHero, StatusBadge, type IconName } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  MORAL_GOODS_FAILURE_MESSAGE_TEMPLATES,
  MORAL_GOODS_FEATURE_CAPABILITIES,
  MORAL_GOODS_SEED_ENVELOPES,
  buildCommitmentCard,
  buildDealCardModel,
  buildSettlementPlan,
  formatMinorMoney,
  getMoralGoodsDiscoverySurface,
  getGuidedStandingBudgetSteps,
  getPrivateProposalIntakeFields,
  MORAL_GOODS_PUBLIC_REVIEW_CTA_LABEL,
  MORAL_GOODS_SEED_CREDITED_UNITS,
  MORAL_GOODS_SEED_FUNDING_SOURCES,
  MORAL_GOODS_SEED_OBLIGATIONS,
} from "@/lib/moral-trade/group-buying";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Moral Goods Group Buying",
  description:
    "Fund verified moral actions, apply to participate, set small recurring budgets, and view aggregate results under frozen rules.",
  alternates: {
    canonical: "/moral-goods-group-buying",
  },
  openGraph: {
    title: "Moral Goods Group Buying",
    description:
      "A first-class Moral Trade mechanism for adjusted-impact rounds, crowdfunded pledge-swap lots, baskets, standing budgets, and private proposal review.",
    url: getAbsoluteUrl("/moral-goods-group-buying"),
    type: "website",
  },
};

const navigationTabs = ["Fund", "Participate", "Results"] as const;

interface MoralGoodsGroupBuyingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type DiscoverySurface = ReturnType<typeof getMoralGoodsDiscoverySurface>;
type DiscoveryCard = DiscoverySurface["cards"][number];
type DiscoveryCategory = DiscoverySurface["categories"][number];

const discoveryCategoryIcons: Record<DiscoveryCategory["key"], IconName> = {
  all: "marketplace",
  baskets: "fund",
  budgets: "payment",
  lots: "swap",
  results: "evidence",
  rounds: "review",
};

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildChipHref(label: string) {
  const params = new URLSearchParams({ q: label });
  return `/moral-goods-group-buying?${params.toString()}#deals`;
}

function DiscoveryShortcut({
  active,
  category,
}: {
  active: boolean;
  category: DiscoveryCategory;
}) {
  return (
    <Link
      className={["moral-goods-shortcut", active ? "is-active" : ""].filter(Boolean).join(" ")}
      href={category.href}
    >
      <IconMark name={discoveryCategoryIcons[category.key]} />
      <span>
        <strong>{category.label}</strong>
        <small>
          {category.count} {category.count === 1 ? "route" : "routes"}
        </small>
      </span>
      <em>{category.description}</em>
    </Link>
  );
}

function DiscoveryDealRow({ card }: { card: DiscoveryCard }) {
  return (
    <article className="moral-goods-deal-row">
      <div className="moral-goods-deal-media">
        <IconMark name={discoveryCategoryIcons[card.categoryKey]} />
        <span>{card.primaryLabel}</span>
      </div>
      <div className="moral-goods-deal-main">
        <p className="eyebrow">{card.routeLabel}</p>
        <h3>
          <Link href={card.href}>{card.title}</Link>
        </h3>
        <p>{card.statusSentence}</p>
        <div className="moral-goods-proof-row" aria-label={`${card.title} review signals`}>
          {card.proofTags.map((tag) => (
            <span key={`${card.envelopeId}-${tag}`}>{tag}</span>
          ))}
        </div>
        <div className="moral-goods-progress" aria-label={card.progressLabel}>
          <span style={{ width: `${card.progressBps / 100}%` }} />
        </div>
        <div className="moral-goods-deal-meta">
          <span>{card.progressLabel}</span>
          <span>{card.deadlineLabel}</span>
          <span>{card.limitLabel}</span>
        </div>
        <p className="panel-note">{card.safeActionNote}</p>
      </div>
      <div className="moral-goods-price-block">
        <strong>{card.priceLabel}</strong>
        <span>{card.targetLabel}</span>
        <Link className="button button-primary button-mini" href={card.href}>
          {card.ctaLabel}
        </Link>
      </div>
    </article>
  );
}

function CommitmentPreview({ surface }: { surface: DiscoverySurface }) {
  return (
    <aside className="moral-goods-commitment-preview panel" aria-label="Safe commitment preview">
      <p className="eyebrow">Commitment preview</p>
      <h2>{surface.commitmentPreview.title}</h2>
      <strong className="moral-goods-preview-amount">{surface.commitmentPreview.amountLabel}</strong>
      <p>{surface.commitmentPreview.noChargeLabel}</p>
      <dl className="moral-goods-preview-lines">
        {surface.commitmentPreview.lines.map((line) => (
          <div key={line.label}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      <Link className="button button-primary" href={surface.commitmentPreview.ctaHref}>
        {surface.commitmentPreview.ctaLabel}
      </Link>
      <p className="panel-note">Review, reserve, payment, proof, dispute, and receipt gates stay visible before reliance.</p>
    </aside>
  );
}

function DiscoverySection({ surface }: { surface: DiscoverySurface }) {
  return (
    <section className="section section-white moral-goods-discovery" id="deals" aria-labelledby="deals-heading">
      <div className="moral-goods-discovery-head">
        <div>
          <p className="eyebrow">Discovery</p>
          <h2 id="deals-heading">Browse reviewed routes</h2>
          <p>
            Search moral-action routes, compare review signals, and open a safe commitment preview before
            any authorization or participant instruction.
          </p>
        </div>
        <form action="/moral-goods-group-buying#deals" className="moral-goods-search" method="get" role="search">
          {surface.activeCategory !== "all" ? (
            <input name="category" type="hidden" value={surface.activeCategory} />
          ) : null}
          <label className="sr-only" htmlFor="moral-goods-search-input">
            Search group-buying routes
          </label>
          <input
            defaultValue={surface.query}
            id="moral-goods-search-input"
            name="q"
            placeholder="Search action, proof, or consideration"
            type="search"
          />
          <button className="button button-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="moral-goods-shortcut-grid" aria-label="Group-buying discovery categories">
        {surface.categories.map((category) => (
          <DiscoveryShortcut
            active={category.key === surface.activeCategory}
            category={category}
            key={category.key}
          />
        ))}
      </div>

      <div className="moral-goods-chip-row" aria-label="Quick filters">
        {surface.filterChips.map((chip) => (
          <Link href={buildChipHref(chip)} key={chip}>
            {chip}
          </Link>
        ))}
      </div>

      <div className="moral-goods-discovery-layout">
        <div className="moral-goods-deal-list">
          <div className="moral-goods-result-count" role="status">
            {surface.resultCount} {surface.resultCount === 1 ? "route" : "routes"} shown
            {surface.query ? ` for "${surface.query}"` : ""}
          </div>
          {surface.cards.length ? (
            surface.cards.map((card) => <DiscoveryDealRow card={card} key={card.envelopeId} />)
          ) : (
            <article className="panel detail-block">
              <h3>No reviewed route matches this search</h3>
              <p>Try a broader action, proof, consideration, or review-state term.</p>
              <Link className="button button-secondary" href="/moral-goods-group-buying#deals">
                Clear filters
              </Link>
            </article>
          )}
        </div>
        <CommitmentPreview surface={surface} />
      </div>
    </section>
  );
}

function DealCard({
  envelope,
  role,
}: {
  envelope: (typeof MORAL_GOODS_SEED_ENVELOPES)[number];
  role: "public" | "funder" | "participant" | "sponsor";
}) {
  const card = buildDealCardModel(envelope, role);

  return (
    <article className="panel detail-block">
      <p className="eyebrow">{card.primaryLabel}</p>
      <h3>{card.title}</h3>
      <p className="panel-note">{card.secondaryLabel}</p>
      <dl className="detail-grid">
        <div>
          <dt>Action</dt>
          <dd>{card.rows.action}</dd>
        </div>
        <div>
          <dt>Consideration</dt>
          <dd>{card.rows.consideration}</dd>
        </div>
        <div>
          <dt>Your role</dt>
          <dd>{card.rows.role}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{card.rows.status}</dd>
        </div>
      </dl>
      <p>{card.rows.statusSentence}</p>
      <div className="hero-actions">
        <Link className="button-primary" href={`/moral-goods-group-buying#${envelope.slug}`}>
          {MORAL_GOODS_PUBLIC_REVIEW_CTA_LABEL}
        </Link>
      </div>
      <p className="panel-note">{card.rows.failureBehavior}</p>
      <details className="home-deep-dive">
        <summary>Details</summary>
        <div>
          <p>{card.details.methodology}</p>
          <p>{card.details.verification}</p>
          <p>{card.details.fees}</p>
          <p>{card.details.privacy}</p>
          <p>{card.details.disputes}</p>
          <p>{card.details.donationTaxLimits}</p>
          <p>Public snapshot identifier: {card.details.snapshotIdentifier}</p>
        </div>
      </details>
    </article>
  );
}

function Timeline() {
  const items = [
    "Terms accepted under frozen snapshot",
    "Authorization or allocation recorded",
    "Participant selected, invited, or told not to start yet",
    "Action window opens after reserve and compliance checks",
    "Proof submitted and reviewed",
    "Settlement plan approved",
    "Charge, release, donation, payout, or hold recorded",
    "Receipt and public report updated",
  ];

  return (
    <ol className="detail-grid">
      {items.map((item) => (
        <li key={item} className="panel detail-block">
          {item}
        </li>
      ))}
    </ol>
  );
}

export default async function MoralGoodsGroupBuyingPage({ searchParams }: MoralGoodsGroupBuyingPageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const discoverySurface = getMoralGoodsDiscoverySurface({
    category: readSearchParam(resolvedSearchParams, "category"),
    query: readSearchParam(resolvedSearchParams, "q"),
  });
  const topbarActions = getTopbarActions(Boolean(viewer));
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  )!;
  const settlementPlan = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope: lot,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES,
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });
  const commitmentCard = buildCommitmentCard({
    deadlineSummary:
      "Cancel, withdrawal, evidence, dispute, and support windows are shown before commitment.",
    failureBehavior:
      "If this expires or the participant does not verify the action, money is released or handled under the frozen cancellation policy.",
    moneyVerb: "authorized",
    receiptSummary: "Your receipt keeps the frozen snapshot identifier and timeline.",
    startsSummary:
      "Your card is authorized now; it is charged only if this clears and settles under the frozen rules.",
    userAgreement: "You may fund up to $0.50 of this pledge-swap basket.",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/moral-goods-group-buying", label: "Moral Goods Group Buying" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />
      <SiteTopbar
        authLink={topbarActions.authLink}
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        primaryAction={topbarActions.primaryAction}
      />

      <main>
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/moral-goods-group-buying", label: "Moral Goods Group Buying" },
          ]}
        />

        <PageHero
          eyebrow="Moral Goods Group Buying"
          title="Fund verified actions"
          description="Group buying lets many funders conditionally buy additional, verified moral-impact units or jointly fund fixed pledge-swap consideration. Participants do not start until frozen terms, reserve, acceptance, and verification rules are ready."
          actions={
            <>
              <Link className="button-primary" href="#fund">
                Fund verified actions
              </Link>
              <Link className="button-secondary" href="#participate">
                Apply to participate
              </Link>
              <Link className="button-secondary" href="#results">
                View results
              </Link>
            </>
          }
        />

        <DiscoverySection surface={discoverySurface} />

        <section className="section section-white" aria-labelledby="entry-heading">
          <div className="section-head" id="entry-heading">
            <h2>Start Here</h2>
            <p>Choose by what you want to do, not by internal mechanism names.</p>
          </div>
          <div className="data-grid">
            {[
              "Fund verified actions",
              "Apply to participate",
              "Set a small recurring budget",
              "View results",
              "Suggest an action privately",
            ].map((entry) => (
              <article className="panel detail-block" key={entry}>
                <h3>{entry}</h3>
                <p>
                  {entry === "Suggest an action privately"
                    ? "Private until reviewed. Submitting it does not list it for funding or create an obligation."
                    : "One primary next step, with methodology, fees, privacy, tax, dispute, and receipt details available before commitment."}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="tabs-heading">
          <div className="section-head" id="tabs-heading">
            <h2>Fund, Participate, Results</h2>
            <p>Public navigation uses three main tabs and keeps recurring budgets under Fund.</p>
          </div>
          <div className="status-chip-row" role="list">
            {navigationTabs.map((tab) => (
              <StatusBadge key={tab} tone="default">
                {tab}
              </StatusBadge>
            ))}
          </div>
        </section>

        <section className="section section-white" id="fund" aria-labelledby="fund-heading">
          <div className="section-head" id="fund-heading">
            <h2>Fund</h2>
            <p>
              Cards show the action, consideration, your role, status, next step, what happens if it
              does not complete, and one Details disclosure.
            </p>
          </div>
          <div className="data-grid">
            {MORAL_GOODS_SEED_ENVELOPES.map((envelope) => (
              <DealCard envelope={envelope} key={envelope.id} role="funder" />
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="participate" aria-labelledby="participate-heading">
          <div className="section-head" id="participate-heading">
            <h2>Participate</h2>
            <p>
              Participant flow is eligibility, baseline, consideration or charity choice, terms,
              wait for selection, action instructions, proof, result, and payout or donation status.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel detail-block">
              <h3>Next Instruction</h3>
              <p>Do not start yet unless your dashboard says Start now.</p>
              <p>Withdrawal remains visible and explains payment or donation consequences.</p>
            </article>
            <article className="panel detail-block">
              <h3>Private Proposal</h3>
              <p>This is private until reviewed. Submitting it does not list it for funding and does not create an obligation.</p>
              <ul>
                {getPrivateProposalIntakeFields().map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-white" id="results" aria-labelledby="results-heading">
          <div className="section-head" id="results-heading">
            <h2>Results</h2>
            <p>
              Reports separate consideration accounting, protocol impact accounting, and optional
              net-impact claims.
            </p>
          </div>
          <div className="data-grid">
            {MORAL_GOODS_SEED_ENVELOPES.slice(0, 3).map((envelope) => (
              <article className="panel detail-block" id={envelope.slug} key={envelope.id}>
                <p className="eyebrow">{envelope.publicReport.publicSnapshotIdentifier}</p>
                <h3>{envelope.title}</h3>
                <p>{envelope.publicReport.noTradeBaselineSummary}</p>
                <dl className="detail-grid">
                  <div>
                    <dt>Raw units</dt>
                    <dd>{envelope.publicReport.rawUnits.toLocaleString("en-US")}</dd>
                  </div>
                  <div>
                    <dt>Adjusted units</dt>
                    <dd>{(envelope.publicReport.adjustedUnitsMilli / 1000).toLocaleString("en-US")}</dd>
                  </div>
                  <div>
                    <dt>Paid or donated</dt>
                    <dd>
                      {formatMinorMoney({
                        amountMinor:
                          envelope.publicReport.participantPayoutTotalMinor +
                          envelope.publicReport.donationTotalMinor,
                        currency: envelope.currency,
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Released</dt>
                    <dd>
                      {formatMinorMoney({
                        amountMinor: envelope.publicReport.releasedMinor,
                        currency: envelope.currency,
                      })}
                    </dd>
                  </div>
                </dl>
                <p className="panel-note">{envelope.publicReport.smallCellSuppression}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="budget-heading">
          <div className="section-head" id="budget-heading">
            <h2>Small Recurring Budget</h2>
            <p>Guided setup uses safe defaults and keeps advanced constraints available.</p>
          </div>
          <ol className="detail-grid">
            {getGuidedStandingBudgetSteps().map((step) => (
              <li className="panel detail-block" key={step}>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="section section-white" aria-labelledby="commitment-heading">
          <div className="section-head" id="commitment-heading">
            <h2>Commitment Card</h2>
            <p>Every material user action ends with the same five-part confirmation order.</p>
          </div>
          <div className="data-grid">
            {Object.entries(commitmentCard).map(([key, value]) => (
              <article className="panel detail-block" key={key}>
                <h3>{key.replaceAll(/([A-Z])/g, " $1")}</h3>
                <p>{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="receipt-heading">
          <div className="section-head" id="receipt-heading">
            <h2>Receipt Timeline</h2>
            <p>User-facing support shows one chronological timeline per commitment.</p>
          </div>
          <Timeline />
        </section>

        <section className="section section-white" aria-labelledby="ops-heading">
          <div className="section-head" id="ops-heading">
            <h2>Controls</h2>
            <p>
              Admin and reviewer views start with checklists and blockers before raw policy JSON.
            </p>
          </div>
          <div className="data-grid">
            {[
              "Publication readiness",
              "Launch readiness",
              "Reserve readiness",
              "Evidence readiness",
              "Settlement readiness",
              "Public-report readiness",
              "Feature capability gates",
              "Operational pause and repair",
            ].map((item) => (
              <article className="panel detail-block" key={item}>
                <h3>{item}</h3>
                <p>Checked from server state, frozen snapshots, receipts, and reconciliation records.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="failure-heading">
          <div className="section-head" id="failure-heading">
            <h2>Failure Messages</h2>
            <p>Reusable templates are non-blaming and specific about money, action, and receipts.</p>
          </div>
          <div className="data-grid">
            {MORAL_GOODS_FAILURE_MESSAGE_TEMPLATES.slice(0, 6).map((template) => (
              <article className="panel detail-block" key={template.key}>
                <h3>{template.title}</h3>
                <p>{template.message}</p>
                <p className="panel-note">{template.moneyConsequence}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="settlement-heading">
          <div className="section-head" id="settlement-heading">
            <h2>Settlement Preview</h2>
            <p>
              The preview binds funding sources, credited units, obligations, fees, release
              operations, and ledger entries under plan hashes.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel detail-block">
              <h3>Plan Status</h3>
              <p>{settlementPlan.planStatus}</p>
              <p className="panel-note">{settlementPlan.blockers.join(", ") || "No blockers"}</p>
            </article>
            <article className="panel detail-block">
              <h3>Fixed Consideration</h3>
              <p>
                {formatMinorMoney({
                  amountMinor: settlementPlan.fixedConsiderationEarnedMinor,
                  currency: settlementPlan.currency,
                })}
              </p>
            </article>
            <article className="panel detail-block">
              <h3>Input Hash</h3>
              <p>{settlementPlan.calculationInputHash.slice(0, 24)}...</p>
            </article>
            <article className="panel detail-block">
              <h3>Capability Gates</h3>
              <ul>
                {MORAL_GOODS_FEATURE_CAPABILITIES.slice(0, 5).map((capability) => (
                  <li key={capability.id}>
                    {capability.featureModule}: {capability.status}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
