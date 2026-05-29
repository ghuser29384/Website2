import Link from "next/link";

import { MoralTradeAnimations } from "@/components/home/moral-trade-animations";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  IconMark,
  OfferCard,
  SearchBar,
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
  getOfferReviewCardInstrumentation,
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
    title: "Read what exists today",
    description: "See what the pilot supports, what it does not promise, and why review matters.",
    href: "/moral-trade",
    icon: "source",
    actionLabel: "Read the plain-language primer",
  },
  {
    title: "See a worked example",
    description: "Inspect a complete, non-live example before drafting or relying on a real trade.",
    href: "/offers?view=examples",
    icon: "example",
    actionLabel: "Open worked examples",
  },
  {
    title: "Donate through a vetted route",
    description: "Choose a cause, complete payment on Every.org, and optionally record the gift here.",
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

const categoryPills = [
  { label: "Global health", href: "/offers?search=Global%20health" },
  { label: "Animal welfare", href: "/offers?search=Animal%20welfare" },
  { label: "Climate", href: "/offers?search=Climate" },
  { label: "Long-run future", href: "/offers?search=Future" },
  { label: "Public health", href: "/offers?search=Public%20health" },
  { label: "Financial support", href: "/offers?search=Financial%20support" },
] as const;

const formatPills = [
  { label: "Pledge swaps", href: "/pledge-swaps" },
  { label: "Donation offsets", href: "/donation-offsets" },
  { label: "Public-good contributions", href: "/mpgf" },
  { label: "Private matching", href: "/background-networking" },
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
            <h1>Cooperate across deep value differences.</h1>
            <p className="hero-text">
              Moral Trade helps serious participants test one small, reviewable commitment, such
              as a pledge swap, donation offset, or public-good contribution, without pretending
              this is already a mature marketplace.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers?view=examples">
                See a worked example
              </Link>
              <Link className="button button-secondary" href={cohortHref}>
                Join the founding cohort
              </Link>
              <Link className="button button-secondary" href="/donate">
                Donate through a vetted route
              </Link>
            </div>
          </section>

          <aside className="growth-progress-card panel" aria-label="Founding progress">
            <div className="growth-progress-stat">
              <IconMark name="marketplace" />
              <span>Live offers</span>
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
            <div className="growth-progress-stat">
              <IconMark name="review" />
              <span>Completed agreements</span>
              <strong>{formatOptionalCount(marketplaceOverview.completedAgreementCount)}</strong>
            </div>
          </aside>
        </div>

        <div className="growth-trust-row" aria-label="Trust standards">
          <TrustChip>Pilot stage</TrustChip>
          <TrustChip>No custody or escrow</TrustChip>
          <TrustChip>Manual review before reliance</TrustChip>
          <TrustChip>Privacy-first matching</TrustChip>
          <TrustChip>{formatOptionalCount(marketplaceOverview.completedAgreementCount)} completed agreements - transparency first</TrustChip>
        </div>
        <div className="growth-no-automation-strip" aria-label="Non-automation posture">
          <strong>No surprise exposure. No autonomous outreach. No private-feed mining.</strong>
          <span>Matching uses broad previews and consent-gated disclosure.</span>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="marketplace-search-heading">
          <div className="section-head section-head-compact">
            <h2 id="marketplace-search-heading">Search the marketplace</h2>
            <p>
              Start with broad categories, then inspect exact terms, baselines, and evidence states
              before relying on any offer.
            </p>
          </div>
          <SearchBar placeholder="Search by cause, action, or trade type" />
          <div className="pill-group" aria-label="Cause categories">
            {categoryPills.map((pill) => (
              <Link className="source-pill source-pill-link" href={pill.href} key={pill.label}>
                {pill.label}
              </Link>
            ))}
          </div>
          <div className="pill-group" aria-label="Trade formats">
            {formatPills.map((pill) => (
              <Link className="badge badge-secondary" href={pill.href} key={pill.label}>
                {pill.label}
              </Link>
            ))}
          </div>
        </section>

        <MoralTradeAnimations />

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
              reviewable thing before publishing a full offer.
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
            <h2 id="featured-examples-heading">Marketplace preview</h2>
            <p>
              Examples show the terms, evidence rules, and review states a real offer should
              expose before anyone relies on it.
            </p>
          </div>
          <div className="listing-grid compact-listing-grid">
            {featuredExamples.map((offer) => {
              const reviewInstrumentation = getOfferReviewCardInstrumentation({
                ...offer,
                currentStatus: "Worked example; manual review required before reliance",
                minCounterpartyImpact: offer.minCounterpartyImpact,
              });

              return (
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
                  reviewFactorCodes={reviewInstrumentation.factorCodes}
                  reviewNextStep={reviewInstrumentation.nextStep}
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
              );
            })}
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
