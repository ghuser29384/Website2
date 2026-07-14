import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  MarketplaceBottomNav,
  PledgeFundingPanel,
  PledgeFundingSheet,
} from "@/components/marketplace/marketplace-components";
import { Breadcrumbs, IconMark } from "@/components/ui/page-primitives";
import { marketplaceDealFromPledgeFundingRound } from "@/lib/marketplace-deals";
import {
  getPledgeFundingMechanismState,
  getPledgeFundingReceiptAtom,
  getPledgeFundingRoundById,
  getPledgeFundingRounds,
  PLEDGE_FUNDING_BACKEND_REQUIREMENTS,
} from "@/lib/moral-trade/pledge-funding-rounds";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface FundingRoundPageProps {
  params: Promise<{ roundId: string }>;
}

export function generateStaticParams() {
  return getPledgeFundingRounds().map((round) => ({
    roundId: round.id,
  }));
}

export async function generateMetadata({ params }: FundingRoundPageProps): Promise<Metadata> {
  const { roundId } = await params;
  const round = getPledgeFundingRoundById(roundId);

  if (!round) {
    return {
      title: "Funding round unavailable",
    };
  }

  return {
    alternates: {
      canonical: `/funding-rounds/${round.id}`,
    },
    description: truncateDescription(round.pledgeSummary, 155),
    openGraph: {
      description: truncateDescription(round.pledgeSummary, 155),
      title: round.title,
      type: "article",
      url: getAbsoluteUrl(`/funding-rounds/${round.id}`),
    },
    title: round.title,
  };
}

export default async function FundingRoundPage({ params }: FundingRoundPageProps) {
  const { roundId } = await params;
  const round = getPledgeFundingRoundById(roundId);

  if (!round) {
    notFound();
  }

  const receipt = getPledgeFundingReceiptAtom(round);
  const mechanism = getPledgeFundingMechanismState(round);
  const deal = marketplaceDealFromPledgeFundingRound(round);

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/offers", label: "Browse offers" },
            { href: `/funding-rounds/${round.id}`, label: round.title },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="v72-detail-screen pledge-funding-detail" aria-labelledby="funding-round-heading">
          <div className="v72-top-controls">
            <Link className="text-button" href="/offers?search=pledge%20funding">
              Back to offers
            </Link>
          </div>

          <article className="v72-decision-block panel">
            <div className="v72-decision-main">
              <span className="moral-deal-visual" aria-hidden="true">
                <IconMark name="fund" />
              </span>
              <div>
                <p className="detail-kicker">
                  Pledge funding · {mechanism.modeLabel} · {receipt.state}
                </p>
                <h1 id="funding-round-heading">{round.title}</h1>
                <p>{round.pledgeSummary}</p>
              </div>
            </div>

            <dl className="v72-receipt-facts v72-economics-band">
              <div>
                <dt>State</dt>
                <dd>{receipt.state}</dd>
              </div>
              <div>
                <dt>Exposure</dt>
                <dd>{receipt.exposure}</dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd>{receipt.conditionOrProtection}</dd>
              </div>
            </dl>

            <div className="v72-trust-strip" aria-label="Funding trust facts">
              <span>{receipt.protection}</span>
              <span>{round.baselineStatement}</span>
              <span>{round.evidenceReviewStatus}</span>
            </div>
          </article>

          <div className="marketplace-detail-grid">
            <PledgeFundingPanel round={round} />
            <div className="marketplace-detail-side">
              <PledgeFundingSheet round={round} />
              {mechanism.safeStateReason ? (
                <section className="v72-safe-state panel pledge-funding-safe-state" aria-labelledby="funding-safe-heading">
                  <h2 id="funding-safe-heading">Not connected yet</h2>
                  <p>{mechanism.safeStateReason}</p>
                  <p className="v72-receipt-fragment">
                    {receipt.state} · {receipt.exposure} · {receipt.conditionOrProtection}
                  </p>
                  <Link className="button button-secondary" href="/offers">
                    Back to offers
                  </Link>
                </section>
              ) : null}
            </div>
          </div>

          <div className="v72-sticky-footer panel">
            <span>
              {receipt.state} · {receipt.exposure} · {receipt.conditionOrProtection}
            </span>
            <Link className="button button-primary" href={`${deal.href}#funding-sheet`}>
              {receipt.primaryCta}
            </Link>
          </div>

          <details className="v72-explain-row">
            <summary>Requirements & rules</summary>
            <p>
              Live pledge funding still needs real contribution rows, idempotent payment
              authorization, refund/release transitions, ledger rows, RLS policies, and sponsor
              charity payout infrastructure before the route can claim live funding.
            </p>
          </details>
        </section>

        <section className="section section-white" aria-labelledby="funding-backend-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Live blocker</p>
            <h2 id="funding-backend-heading">Backend work required before live funding</h2>
            <p>
              These preview rounds do not create charges, refunds, charity payouts, sponsor
              bonuses, receipts, support codes, queues, or pledge commitments.
            </p>
          </div>
          <div className="data-grid">
            {PLEDGE_FUNDING_BACKEND_REQUIREMENTS.slice(0, 4).map((requirement) => (
              <article className="panel data-card" key={requirement}>
                <p className="detail-kicker">Required</p>
                <h3>{requirement}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>

      <MarketplaceBottomNav active="browse" />
      <SiteFooter />
    </div>
  );
}
