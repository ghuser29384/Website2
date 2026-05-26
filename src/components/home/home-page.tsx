import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  IconMark,
  OfferCard,
  TrustChip,
} from "@/components/ui/page-primitives";
import type { IconName } from "@/components/ui/page-primitives";
import type { MarketplaceOverview } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  getActionEvidenceSummary,
  getBaselineConfidence,
  getExternalityReviewSummary,
  getScoreConfidence,
} from "@/lib/proposal-review";

interface HomePageProps {
  isAuthenticated: boolean;
  marketplaceOverview: MarketplaceOverview;
}

const startPaths: ReadonlyArray<{
  actionLabel: string;
  description: string;
  href: string;
  icon: IconName;
  title: string;
}> = [
  {
    title: "Learn the idea",
    description: "Read the core concept, examples, boundaries, and the counterfactual trust problem.",
    href: "/moral-trade",
    icon: "source",
    actionLabel: "Read the moral trade primer",
  },
  {
    title: "Test an example",
    description: "Inspect and clone a seeded pledge swap or offset before publishing anything live.",
    href: "/offers?view=examples",
    icon: "example",
    actionLabel: "Browse worked examples",
  },
  {
    title: "Donate through a route",
    description: "Use a verified Every.org path, then log the gift when it belongs in a site workflow.",
    href: "/donate",
    icon: "fund",
    actionLabel: "Open donation routes",
  },
  {
    title: "Join or build",
    description: "Enter the founding cohort, invite one serious counterparty, and start small.",
    href: "/cohort",
    icon: "profile",
    actionLabel: "Join the founding cohort",
  },
] as const;

const activationCards: ReadonlyArray<{
  actionLabel: string;
  description: string;
  href: string;
  title: string;
}> = [
  {
    title: "Join a small cohort",
    description: "Start with a group small enough for review, baseline checks, and human introductions.",
    href: "/cohort",
    actionLabel: "Open the cohort guide",
  },
  {
    title: "Clone a worked example",
    description: "Prefill a low-risk case, adjust terms, and keep scores party-relative.",
    href: "/offers?view=examples",
    actionLabel: "Choose a worked example",
  },
  {
    title: "Invite one serious counterparty",
    description: "The fastest early loop is one thoughtful invite, not a generic referral blast.",
    href: "/cohort",
    actionLabel: "Draft a cohort invite",
  },
  {
    title: "Submit one reviewable proof artifact",
    description: "Use receipts, logs, attestations, or public statements before anyone relies on a claim.",
    href: "/validation",
    actionLabel: "Review evidence standards",
  },
] as const;

function formatOptionalCount(value: number | null) {
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

function getOfferModeIcon(mode: (typeof CANONICAL_WORKED_CASE_OFFERS)[number]["mode"]): IconName {
  if (mode === "pledge") return "swap";
  if (mode === "offset") return "offset";
  if (mode === "payment") return "payment";
  return "fund";
}

export function HomePage({ isAuthenticated, marketplaceOverview }: HomePageProps) {
  const cohortHref = isAuthenticated ? "/dashboard" : "/cohort";
  const featuredExamples = CANONICAL_WORKED_CASE_OFFERS.slice(0, 3);
  const liveOfferCount = formatOptionalCount(marketplaceOverview.openOfferCount);
  const publicProfileCount = formatOptionalCount(marketplaceOverview.publicProfileCount);

  return (
    <div className="page-shell page-shell-focused growth-shell">
      <header className="growth-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="growth-hero-inner">
          <section className="growth-hero-copy">
            <h1>Can people with different moral views make each other better off?</h1>
            <p className="hero-text">
              Moral Trade is a pilot for voluntary, evidence-reviewed cooperation across moral
              disagreement. It helps people test low-risk pledge swaps, donation offsets, and
              shared public-good commitments without escrow, custody, legal advice, or hidden
              automation.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={cohortHref}>
                Join the founding cohort
              </Link>
              <Link className="button button-secondary" href="/moral-trade">
                Read the moral trade primer
              </Link>
              <Link className="button button-secondary" href="/offers?view=examples">
                Browse worked examples
              </Link>
            </div>
          </section>

          <aside className="growth-progress-card panel" aria-label="Founding progress">
            <div className="growth-progress-stat">
              <IconMark name="marketplace" />
              <span>Live proposals</span>
              <strong>{liveOfferCount}</strong>
            </div>
            <div className="growth-progress-stat">
              <IconMark name="example" />
              <span>Worked examples</span>
              <strong>{CANONICAL_WORKED_CASE_COUNT}</strong>
            </div>
            <div className="growth-progress-stat">
              <IconMark name="profile" />
              <span>Public profiles</span>
              <strong>{publicProfileCount}</strong>
            </div>
          </aside>
        </div>

        <div className="growth-trust-row" aria-label="Trust standards">
          <TrustChip>Founding cohort first</TrustChip>
          <TrustChip>Worked examples before live liquidity</TrustChip>
          <TrustChip>No escrow or custody claim</TrustChip>
          <TrustChip>Anti-threat baseline review</TrustChip>
        </div>
        <div className="growth-no-automation-strip" aria-label="Non-automation posture">
          <strong>No surprise exposure. No autonomous outreach. No private-feed mining.</strong>
          <span>Matching uses broad previews and consent-gated disclosure.</span>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="growth-start-section section section-white" aria-labelledby="start-heading">
          <div className="section-head section-head-compact">
            <h2 id="start-heading">Choose the right first path</h2>
            <p>
              The pilot routes visitors by intent before exposing deeper marketplace mechanics:
              learn, test, donate, or join/build.
            </p>
          </div>
          <div className="growth-start-grid">
            {startPaths.map((path) => (
              <Link className="growth-path-card panel" href={path.href} key={path.title}>
                <IconMark name={path.icon} />
                <div>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </div>
                <span className="inline-link">{path.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="activation-heading">
          <div className="section-head section-head-compact">
            <h2 id="activation-heading">Start with one low-risk action</h2>
            <p>
              The founding cohort is designed for early users who want to learn by doing one small,
              reviewable thing before publishing a full proposal.
            </p>
          </div>
          <div className="growth-activation-grid">
            {activationCards.map((card) => (
              <Link className="growth-activation-card panel" href={card.href} key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="inline-link">{card.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="featured-examples-heading">
          <div className="section-head section-head-compact">
            <h2 id="featured-examples-heading">Worked examples, not live liquidity</h2>
            <p>
              Examples show the terms, evidence rules, and review states a real proposal should
              expose before anyone relies on it.
            </p>
          </div>
          <div className="listing-grid compact-listing-grid">
            {featuredExamples.map((offer) => (
              <OfferCard
                alias={offer.alias}
                causeExchange={`${offer.offeredCause} -> ${offer.requestedCause}`}
                ctaHref={`/offers/examples/${offer.id}`}
                duration={offer.duration}
                evidence={offer.verification}
                key={offer.id}
                actionEvidence={getActionEvidenceSummary(offer)}
                baselineConfidence={getBaselineConfidence(offer)}
                externalityReview={getExternalityReviewSummary(offer)}
                modeIcon={getOfferModeIcon(offer.mode)}
                modeLabel={formatMode(offer.mode)}
                offeredAction={offer.offerAction}
                offeredScore={offer.offerImpact}
                primaryActionLabel="View example"
                requestedAction={offer.requestAction}
                requestedThreshold={offer.minCounterpartyImpact}
                reviewState="Worked example. Manual review required before reliance."
                scoreConfidence={getScoreConfidence(offer)}
                secondaryAction={
                  <Link
                    className="button button-secondary button-mini"
                    href={
                      isAuthenticated
                        ? `/offers/new?mode=${offer.mode}&example=${offer.id}`
                        : `/signup?returnTo=${encodeURIComponent(`/offers/new?mode=${offer.mode}&example=${offer.id}`)}`
                    }
                  >
                    Create similar
                  </Link>
                }
                sourceLabel="Worked example"
                title={`${offer.offeredCause} for ${offer.requestedCause}`}
              />
            ))}
          </div>
          <div className="section-actions">
            <Link className="button button-primary" href="/offers?view=examples">
              Browse all worked examples
            </Link>
            <Link className="button button-secondary" href="/cohort">
              Read the cohort guide
            </Link>
          </div>
        </section>

        <section className="section section-subtle growth-cohort-callout" aria-labelledby="cohort-heading">
          <div>
            <h2 id="cohort-heading">Build the pilot through trust and review</h2>
            <p>
              Moral Trade is early. The strongest path is a founding cohort of effective givers,
              organizers, founders, and serious counterparties who can test low-risk examples and
              invite one relevant person at a time before the site tries to solve liquidity.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/cohort">
              Join the founding cohort
            </Link>
            <Link className="button button-secondary" href="/safety">
              Review safety and baseline rules
            </Link>
            <Link className="button button-secondary" href="/research">
              Research and governance
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
