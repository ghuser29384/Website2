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

interface HomePageProps {
  isAuthenticated: boolean;
  marketplaceOverview: MarketplaceOverview;
}

const startPaths: ReadonlyArray<{
  description: string;
  href: string;
  icon: IconName;
  title: string;
}> = [
  {
    title: "Find a counterparty",
    description: "Invite one serious counterparty and explore a private match.",
    href: "/background-networking",
    icon: "profile",
  },
  {
    title: "Support a public good",
    description: "Propose or join a public-good commitment with clear terms.",
    href: "/mpgf",
    icon: "fund",
  },
  {
    title: "Start from an example",
    description: "Clone a worked example and adapt it to your context.",
    href: "/offers?view=examples",
    icon: "example",
  },
] as const;

const activationCards: ReadonlyArray<{
  description: string;
  href: string;
  title: string;
}> = [
  {
    title: "Clone a worked example",
    description: "Use a seeded pledge swap or offset as the first draft, then edit the terms.",
    href: "/offers?view=examples",
  },
  {
    title: "Create a broad wish preview",
    description: "Describe the kind of trade you would consider before revealing specifics.",
    href: "/signup?returnTo=/dashboard%23wish-profile",
  },
  {
    title: "Invite one serious counterparty",
    description: "The fastest early loop is one thoughtful invite, not a generic referral blast.",
    href: "/cohort",
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
            <h1>Cooperate across moral disagreement</h1>
            <p className="hero-text">
              A privacy-first place for pledge swaps, donation offsets, and shared public-good
              commitments with explicit terms, evidence review, and no escrow or custody claim.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={cohortHref}>
                Join the founding cohort
              </Link>
              <Link className="button button-secondary" href="/offers?view=examples">
                Browse worked examples
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
          </aside>
        </div>

        <div className="growth-trust-row" aria-label="Trust standards">
          <TrustChip>Privacy-first matching</TrustChip>
          <TrustChip>No escrow or custody claim</TrustChip>
          <TrustChip>Explicit terms and evidence review</TrustChip>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="growth-start-section section section-white" aria-labelledby="start-heading">
          <div className="section-head section-head-compact">
            <h2 id="start-heading">Three paths to start</h2>
          </div>
          <div className="growth-start-grid">
            {startPaths.map((path) => (
              <Link className="growth-path-card panel" href={path.href} key={path.title}>
                <IconMark name={path.icon} />
                <div>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </div>
                <span className="inline-link">Learn more</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="activation-heading">
          <div className="section-head section-head-compact">
            <h2 id="activation-heading">Start with one low-risk action</h2>
            <p>
              The founding cohort is designed for early users who want to learn by doing one small,
              reviewable thing before publishing a full trade.
            </p>
          </div>
          <div className="growth-activation-grid">
            {activationCards.map((card) => (
              <Link className="growth-activation-card panel" href={card.href} key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="inline-link">Start here</span>
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
                modeIcon={getOfferModeIcon(offer.mode)}
                modeLabel={formatMode(offer.mode)}
                offeredAction={offer.offerAction}
                offeredScore={offer.offerImpact}
                primaryActionLabel="View example"
                requestedAction={offer.requestAction}
                requestedThreshold={offer.minCounterpartyImpact}
                reviewState="Worked example. Manual review required before reliance."
                secondaryAction={
                  <Link
                    className="button button-secondary button-mini"
                    href={
                      isAuthenticated
                        ? `/offers/new?mode=${offer.mode}`
                        : `/signup?returnTo=${encodeURIComponent(`/offers/new?mode=${offer.mode}`)}`
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
              Open cohort guide
            </Link>
          </div>
        </section>

        <section className="section section-subtle growth-cohort-callout" aria-labelledby="cohort-heading">
          <div>
            <h2 id="cohort-heading">Build the first market through trust distribution</h2>
            <p>
              Moral Trade is early. The strongest path is a founding cohort of effective givers,
              organizers, founders, and serious counterparties who can test low-risk examples and
              invite one relevant person at a time.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/cohort">
              Join the founding cohort
            </Link>
            <Link className="button button-secondary" href="/safety">
              Review safety policy
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
