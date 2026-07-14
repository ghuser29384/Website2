import type { Metadata } from "next";
import Link from "next/link";

import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";
import { ThresholdField } from "@/components/marketplace/gain-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getMoralGoodsDiscoverySurface } from "@/lib/moral-trade/group-buying";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditional pools",
  description:
    "Pledge up to a maximum and fund a moral public good only when the published threshold and review conditions pass.",
  alternates: { canonical: "/pools" },
  openGraph: {
    title: "Conditional funding pools at Moral Trade",
    description:
      "Explore reviewed pools with explicit maximum exposure, threshold, deadline, recipient, settlement, evidence, and failure rules.",
    url: getAbsoluteUrl("/pools"),
    type: "website",
  },
};

const receiptRows: readonly DealReceiptRow[] = [
  {
    label: "Without this pool",
    value: "No conditional contribution is made through this record.",
  },
  {
    label: "Your commitment",
    value: "Pledge up to $0.50 to the named recipient under the frozen rules.",
  },
  {
    label: "Other commitments",
    value: "Enough eligible commitments to reach the published $10,000 funding condition.",
  },
  {
    label: "Condition",
    value: "The threshold and review gates pass by the stated deadline.",
  },
  {
    label: "Maximum exposure",
    value: "$0.50. No charge if the condition does not pass.",
    emphasis: true,
  },
  {
    label: "Evidence",
    value: "Recipient, eligibility, authorization, threshold, settlement, and receipt records.",
  },
  {
    label: "Exit",
    value: "Withdrawal and expiry behavior follows the frozen pool terms shown before authorization.",
  },
];

const mechanismFacts = [
  ["Maximum exposure", "Every person sees the most they can be charged before authorizing."],
  ["Funding condition", "The threshold, eligible amount, deadline, and relevant gates are published together."],
  ["Failure behavior", "No successful threshold means no settlement under the pool record."],
  ["State vocabulary", "Pledged, authorized, active, completed, challenged, cancelled, and reversed remain distinct."],
] as const;

export default async function PoolsPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const surface = getMoralGoodsDiscoverySurface({});
  const featuredCards = surface.cards.slice(0, 4);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Pool</span>
        <span>A pledge is a maximum conditional exposure, not a completed donation.</span>
        <Link href="/moral-goods-group-buying">Advanced tools</Link>
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
            <p className="mt-product-kicker">Conditional pools</p>
            <h1 id="pools-heading">Pledge a little. Fund it only when enough people join.</h1>
            <p>
              Choose a named maximum exposure. The pool settles only when the threshold and the
              published review conditions pass by the deadline.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href="#featured-pools">Explore pools</Link>
              <Link className="button button-secondary" href="/mpgf">Build a public-good budget</Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Pool terms">
              <li>Maximum exposure</li>
              <li>Funding condition</li>
              <li>Deadline</li>
              <li>Failure rule</li>
            </ul>
          </div>
          <div className="mt-mechanism-visual">
            <ThresholdField progress={64} />
          </div>
        </section>

        <section className="mt-product-section is-white" id="featured-pools" aria-labelledby="featured-pools-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Marketplace</p>
              <h2 id="featured-pools-heading">Open a safe preview before authorizing.</h2>
            </div>
            <p>
              Reviewed routes remain separate from completed funding. Every card shows its current
              state, progress language, deadline, limit, and the next action that is actually available.
            </p>
          </div>

          <div className="mt-pool-list">
            {featuredCards.length ? (
              featuredCards.map((card) => (
                <article className="mt-pool-row" key={card.envelopeId}>
                  <div>
                    <p className="mt-market-eyebrow">{card.routeLabel}</p>
                    <h3>{card.title}</h3>
                    <p>{card.statusSentence}</p>
                  </div>
                  <div className="mt-pool-row-meta">
                    <strong>{card.priceLabel}</strong>
                    <span>{card.targetLabel}</span>
                    <span>{card.progressLabel}</span>
                    <span>{card.deadlineLabel}</span>
                    <span>{card.limitLabel}</span>
                  </div>
                  <Link className="button button-primary" href={card.href}>
                    {card.ctaLabel}
                  </Link>
                </article>
              ))
            ) : (
              <article className="mt-pool-row">
                <div>
                  <h3>No reviewed pool routes are available</h3>
                  <p>The marketplace does not substitute demonstrations for open participant inventory.</p>
                </div>
                <Link className="button button-secondary" href="/moral-goods-group-buying">
                  Review the mechanism
                </Link>
              </article>
            )}
          </div>

          <div className="mt-product-actions">
            <Link className="button button-primary" href="/moral-goods-group-buying#deals">
              Explore all reviewed routes
            </Link>
            <Link className="button button-secondary" href="/mpgf/pools">
              Browse candidate pools
            </Link>
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="pool-terms-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Before you pledge</p>
              <h2 id="pool-terms-heading">The condition is part of the product.</h2>
            </div>
            <p>
              Threshold progress is not enough. The recipient, settlement, evidence, authorization,
              visibility, refund or release behavior, and challenge path must travel with it.
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
        </section>

        <section className="mt-product-section is-white" aria-labelledby="pool-receipt-heading">
          <div className="mt-receipt-layout">
            <div className="mt-receipt-copy">
              <p className="mt-product-kicker">Deal Receipt</p>
              <h2 id="pool-receipt-heading">Conditionality, leverage, and pivotality are different claims.</h2>
              <p>
                Moral Trade can show the condition that controls settlement and the total amount
                coordinated. It should not routinely claim that the outcome depended on one specific
                pledge without separate counterfactual evidence.
              </p>
              <Link className="button button-secondary" href="/moral-goods-group-buying">
                Review pool mechanics
              </Link>
            </div>
            <DealReceipt
              note="Illustrative pool. It is not an open funding round, payment authorization, completed donation, or pivotality claim."
              rows={receiptRows}
              state="Draft"
              title="$0.50 → $10,000 condition"
            />
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="pool-claims-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Claim discipline</p>
              <h2 id="pool-claims-heading">Say exactly what the mechanism establishes.</h2>
            </div>
            <p>
              This keeps the product persuasive without converting a conditional funding rule into an
              unsupported impact multiplier or individual pivotality claim.
            </p>
          </div>
          <div className="mt-caveat-panel">
            <article>
              <h3>Conditionality</h3>
              <p>“You are charged only if the published funding condition passes.”</p>
            </article>
            <article>
              <h3>Coordination ratio</h3>
              <p>“Your maximum pledge participates in a pool targeting this total coordinated amount.”</p>
            </article>
            <article>
              <h3>Pivotality</h3>
              <p>“The larger outcome would not have occurred without you” is a separate counterfactual claim.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
