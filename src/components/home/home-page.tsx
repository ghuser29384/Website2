import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import type { MarketplaceOverview } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
  marketplaceOverview: MarketplaceOverview;
}

const formatCards = [
  {
    title: "Pledge swaps",
    href: "/offers?view=examples&mode=pledge",
    cta: "View examples",
    definition:
      "Two parties exchange bounded commitments when each values the other's action more than its own cost.",
    terms: ["Action and reciprocal action", "Duration and exit rule", "Evidence standard"],
  },
  {
    title: "Donation offsets",
    href: "/donation-offsets",
    cta: "Open guide",
    definition:
      "Opposed donations can be redirected toward a named compromise destination instead of cancelling out.",
    terms: ["Matched action", "Compromise destination", "Threshold, expiry, and surplus rule"],
  },
  {
    title: "Moral public goods",
    href: "/mpgf",
    cta: "Open fund",
    definition:
      "Shared consensus goods can coordinate funding where different moral views have overlapping reasons to contribute.",
    terms: ["External-payment evidence", "Manual review state", "Allocation and pool records"],
  },
] as const;

const howItWorksSteps = [
  {
    title: "Choose a format.",
    text: "Start with a pledge swap, donation offset, paid action, or public-good contribution path.",
  },
  {
    title: "State reciprocal terms.",
    text: "Name the action, request, threshold, duration, exit rule, and evidence standard before anyone relies on it.",
  },
  {
    title: "Review evidence before relying on the trade.",
    text: "Evidence must be checked before a proposal is counted as fulfilled, verified, or contribution-ready.",
  },
] as const;

const trustItems = [
  { label: "No threats or extortion", href: "/safety" },
  { label: "No illegal or deceptive asks", href: "/safety" },
  { label: "Evidence is reviewed before counting", href: "/methodology" },
  { label: "Political campaign contribution offsets prohibited", href: "/safety" },
] as const;

const pilotMetrics = [
  { label: `${CANONICAL_WORKED_CASE_COUNT} worked examples`, detail: "Seeded examples for inspection" },
  { label: "3 trade formats", detail: "Pledge, offset, paid action" },
  { label: "Manual review before reliance", detail: "No automatic verification claim" },
  { label: "External-payment evidence only", detail: "No escrow or custody claim" },
] as const;

function formatOptionalCount(value: number | null) {
  return value === null ? "Unavailable" : new Intl.NumberFormat("en-US").format(value);
}

function formatOptionalUsd(cents: number | null) {
  if (cents === null) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

export function HomePage({ isAuthenticated, marketplaceOverview }: HomePageProps) {
  const createTradeHref = isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new";
  const previewOffers = CANONICAL_WORKED_CASE_OFFERS.slice(0, 6);
  const liveCountsAreZero =
    !marketplaceOverview.hasLiveData ||
    (marketplaceOverview.openOfferCount === 0 &&
      marketplaceOverview.publicProfileCount === 0 &&
      marketplaceOverview.redirectedOffsetCents === 0);

  return (
    <div className="page-shell page-shell-focused">
      <header className="hero landing-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="landing-hero-grid">
          <section className="landing-hero-copy">
            <h1>Trade across moral disagreement.</h1>
            <p className="hero-text">
              Moral Trade helps people structure voluntary pledge swaps, donation offsets, and
              public-good contributions with explicit terms, evidence, and safety checks.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Explore trades
              </Link>
              <Link className="button button-secondary" href={createTradeHref}>
                Create a trade
              </Link>
              <Link className="text-button" href="#how-it-works">
                How it works
              </Link>
            </div>
            <div className="trust-chip-row" aria-label="Operating standards">
              <span className="trust-chip">Voluntary only</span>
              <span className="trust-chip">Evidence-gated</span>
              <span className="trust-chip">No escrow or custody claim</span>
            </div>
          </section>

          <aside className="pilot-status-card panel" aria-label="Pilot status">
            <span>Pilot status</span>
            <strong>Worked examples first</strong>
            <p>
              Live participation stays modest until offers, evidence records, and review states are
              backed by signed-in users and configured data storage.
            </p>
          </aside>
        </div>

        <section className="pilot-metric-grid" aria-label="Pilot trust indicators">
          {pilotMetrics.map((metric) => (
            <article className="stat-card" key={metric.label}>
              <strong>{metric.label}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </section>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="formats-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Trade formats</p>
            <h2 id="formats-heading">Choose the structure before the counterpart.</h2>
            <p>
              Each path starts from concrete terms and evidence rules, not vague agreement or
              pressure to participate.
            </p>
          </div>

          <div className="format-card-grid">
            {formatCards.map((card) => (
              <article className="panel format-card" key={card.title}>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.definition}</p>
                </div>
                <ul className="clean-list">
                  {card.terms.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
                <Link className="inline-link" href={card.href}>
                  {card.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="how-it-works" aria-labelledby="how-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">How it works</p>
            <h2 id="how-heading">A short path from idea to reviewable terms.</h2>
          </div>

          <div className="step-card-grid">
            {howItWorksSteps.map((step, index) => (
              <article className="panel step-card" key={step.title}>
                <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="marketplace-preview-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Marketplace preview</p>
            <h2 id="marketplace-preview-heading">Worked examples, not live offers.</h2>
            <p>
              These examples show how public listing cards should expose the action, reciprocal
              request, causes, duration, verification method, and review status.
            </p>
          </div>

          <div className="listing-grid compact-listing-grid">
            {previewOffers.map((offer) => (
              <article className="listing-card panel" key={offer.id}>
                <div className="listing-card-head">
                  <span className="badge">{formatMode(offer.mode)}</span>
                  <span className="badge badge-secondary">Worked example</span>
                </div>
                <h3>{offer.alias}: {offer.offeredCause} for {offer.requestedCause}</h3>
                <dl className="listing-terms">
                  <div>
                    <dt>Offering</dt>
                    <dd>{offer.offerAction}</dd>
                  </div>
                  <div>
                    <dt>Requesting</dt>
                    <dd>{offer.requestAction}</dd>
                  </div>
                </dl>
                <div className="tag-row">
                  <span className="source-pill">{offer.offeredCause}</span>
                  <span className="source-pill">{offer.requestedCause}</span>
                </div>
                <div className="listing-meta">
                  <span>{offer.duration}</span>
                  <span>{offer.verification}</span>
                  <span>Manual review required</span>
                </div>
                <Link className="text-button" href={`/offers?view=examples&search=${encodeURIComponent(offer.alias)}`}>
                  Inspect terms
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="trust-strip" aria-label="Safety and trust rules">
          {trustItems.map((item) => (
            <Link className="trust-strip-item" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </section>

        <section className="section section-subtle" id="about" aria-labelledby="learn-more-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Learn</p>
            <h2 id="learn-more-heading">Theory stays available without turning the homepage into a memo.</h2>
            <p>
              Read the method, safety rules, background networking notes, and public-goods details
              when you need the full reasoning trail.
            </p>
          </div>
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/methodology">
              <h3>Methodology</h3>
              <p>Trade, compromise, threats, power, and review standards.</p>
            </Link>
            <Link className="panel teaser-card" href="/background-networking">
              <h3>Background networking</h3>
              <p>Consent-preserving discovery without private-feed ingestion or autonomous outreach.</p>
            </Link>
            <Link className="panel teaser-card" href="/mpgf">
              <h3>Public Goods Fund</h3>
              <p>External-payment evidence, candidate pools, and allocation process notes.</p>
            </Link>
          </div>
        </section>

        {liveCountsAreZero ? (
          <section className="section section-white" aria-labelledby="pilot-counts-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">Pilot status</p>
              <h2 id="pilot-counts-heading">Live marketplace counts are intentionally quiet while the pilot is seeded.</h2>
              <p>
                Zero live counts are not presented as headline trust metrics. They remain visible
                here so the pilot state is transparent without overstating liquidity.
              </p>
            </div>
            <div className="pilot-count-grid">
              <article className="stat-card">
                <strong>{formatOptionalCount(marketplaceOverview.openOfferCount)}</strong>
                <span>Live offers</span>
              </article>
              <article className="stat-card">
                <strong>{formatOptionalCount(marketplaceOverview.publicProfileCount)}</strong>
                <span>Public profiles</span>
              </article>
              <article className="stat-card">
                <strong>{formatOptionalUsd(marketplaceOverview.redirectedOffsetCents)}</strong>
                <span>Reviewed offsets</span>
              </article>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
