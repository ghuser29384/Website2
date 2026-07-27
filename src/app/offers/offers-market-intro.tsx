import Link from "next/link";

import {
  formatMarketplaceCutoff,
  formatMarketplaceIntroductionDate,
  type MarketplaceClearingRound,
} from "@/lib/marketplace-clearing-round";
import type { MarketplaceFamilyMetrics } from "@/lib/marketplace-offer-families";

import styles from "./offers-market.module.css";

interface OffersMarketIntroProps {
  clearingRound: MarketplaceClearingRound;
  createHref: string;
  error: string | null;
  formMessage: { text: string; tone: "error" | "success" } | null;
  metrics: MarketplaceFamilyMetrics;
}

export function OffersMarketIntro({
  clearingRound,
  createHref,
  error,
  formMessage,
  metrics,
}: OffersMarketIntroProps) {
  return (
    <>
      <section className="mt-explore-hero" aria-labelledby="explore-heading">
        <div className="mt-explore-copy">
          <p className="mt-product-kicker">Live marketplace</p>
          <h1 id="explore-heading">
            Construct a concrete trade from live participant menus.
          </h1>
          <p>
            Select an action a participant can offer, pair it with an actual request,
            then propose the match, counteroffer, save it, or ask a question without
            searching through generated combinations one by one.
          </p>
          <div className="mt-product-actions">
            <Link className="button button-primary" href={createHref}>
              Create a proposal
            </Link>
            <Link className="button button-secondary" href="/worked-examples">
              Review worked examples
            </Link>
          </div>
        </div>

        <aside className={styles.roundPanel} aria-labelledby="round-heading">
          <p className={styles.roundKicker}>Next clearing round</p>
          <h2 id="round-heading">Submit before the weekly review cutoff.</h2>
          <div className={styles.roundCutoff}>
            <span>Submissions close</span>
            <strong>{formatMarketplaceCutoff(clearingRound.cutoffAt)}</strong>
          </div>
          <p className={styles.roundRule}>
            Eligible open proposals are reviewed after the cutoff. Compatible parties
            receive a <strong>consent-based introduction on {formatMarketplaceIntroductionDate(clearingRound.introductionDate)}</strong>.
            A match is never guaranteed.
          </p>
        </aside>
      </section>

      {formMessage ? (
        <div
          className={`status-banner ${
            formMessage.tone === "error"
              ? "status-banner-error"
              : "status-banner-success"
          }`}
        >
          {formMessage.text}
        </div>
      ) : null}

      {error ? (
        <div className="status-banner status-banner-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="mt-product-section is-white" aria-labelledby="pulse-heading">
        <div className="mt-product-section-head">
          <div>
            <p className="mt-product-kicker">Market pulse</p>
            <h2 id="pulse-heading">People, offer families, and pairings</h2>
          </div>
          <p>
            Pairing inventory is kept distinct from participant liquidity. These figures
            describe the current filtered view and do not imply completed trades.
          </p>
        </div>
        <div className={styles.pulseGrid}>
          <article>
            <strong>{metrics.participantCount.toLocaleString()}</strong>
            <span>distinct participants</span>
          </article>
          <article>
            <strong>{metrics.offerFamilyCount.toLocaleString()}</strong>
            <span>distinct offer families</span>
          </article>
          <article>
            <strong>{metrics.pairingCount.toLocaleString()}</strong>
            <span>available combinations</span>
          </article>
        </div>
      </section>
    </>
  );
}
