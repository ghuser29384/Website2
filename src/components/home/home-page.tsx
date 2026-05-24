import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  IconMark,
  MetricCard,
  MoralTradeHeroVisual,
  OfferCard,
  PageHero,
  SearchBar,
  SectionHeader,
  StepCard,
  TrustChip,
} from "@/components/ui/page-primitives";
import type { IconName } from "@/components/ui/page-primitives";
import type { MarketplaceOverview } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  LAUNCH_WEDGE_ROUTES,
  TRUST_BADGE_LADDER,
  VALIDATION_STATUS_STATES,
} from "@/lib/validation";

interface HomePageProps {
  isAuthenticated: boolean;
  marketplaceOverview: MarketplaceOverview;
}

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

const productCards: ReadonlyArray<{
  cta: string;
  example: string;
  explanation: string;
  href: string;
  icon: IconName;
  title: string;
}> = [
  {
    title: "Pledge swaps",
    href: "/pledge-swaps",
    icon: "swap",
    cta: "View pledge swaps",
    explanation: "Exchange bounded commitments when each side values the other's action more.",
    example: "I donate to your cause if you take the action I value.",
  },
  {
    title: "Donation offsets",
    href: "/donation-offsets",
    icon: "offset",
    cta: "View offsets",
    explanation: "Redirect opposed donations toward a named compromise destination.",
    example: "Redirect opposed donations into a shared compromise destination.",
  },
  {
    title: "Public Goods Fund",
    href: "/mpgf",
    icon: "fund",
    cta: "View fund",
    explanation: "Coordinate support for goods many moral views can value.",
    example: "Coordinate support for goods many moral views value.",
  },
] as const;

const credibilityCards: ReadonlyArray<{
  description: string;
  href: string;
  icon: IconName;
  linkLabel: string;
  title: string;
}> = [
  {
    title: "Research source notes",
    href: "/methodology#sources",
    icon: "source",
    linkLabel: "Read sources",
    description:
      "The methodology page points to Toby Ord's moral trade proposal and Forethought-style work on convergence, compromise, threats, and blockers.",
  },
  {
    title: "Pilot status is explicit",
    href: "/faq",
    icon: "pilot",
    linkLabel: "Open FAQ",
    description:
      "Worked examples are separated from live offers, and zero live counts are framed as pilot status rather than marketplace liquidity.",
  },
  {
    title: "Review before reliance",
    href: "/safety",
    icon: "safety",
    linkLabel: "Review safety",
    description:
      "Risky, coercive, deceptive, or unverifiable proposals are outside the public-offer path and require review before anyone relies on them.",
  },
] as const;

const howItWorksSteps = [
  {
    title: "Choose the launch wedge.",
    text: "Start with a verified donation offset, a threshold public-good cycle, or a bounded pledge swap.",
  },
  {
    title: "State baseline and exit terms.",
    text: "Name the no-trade default, reciprocal action, duration, exit rule, and evidence method.",
  },
  {
    title: "Move through validation.",
    text: "Evidence claims get screened, challenged when needed, and completed only after review.",
  },
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

function getOfferModeIcon(mode: (typeof CANONICAL_WORKED_CASE_OFFERS)[number]["mode"]): IconName {
  if (mode === "pledge") return "swap";
  if (mode === "offset") return "offset";
  if (mode === "payment") return "payment";
  return "fund";
}

export function HomePage({ isAuthenticated, marketplaceOverview }: HomePageProps) {
  const createTradeHref = isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new";
  const createOffsetHref = isAuthenticated
    ? "/offers/new?mode=offset"
    : "/signup?returnTo=/offers/new%3Fmode%3Doffset";
  const featuredExamples = CANONICAL_WORKED_CASE_OFFERS.slice(0, 4);
  const liveOfferCount = formatOptionalCount(marketplaceOverview.openOfferCount);
  const publicProfileCount = formatOptionalCount(marketplaceOverview.publicProfileCount);
  const reviewedOffsets = formatOptionalUsd(marketplaceOverview.redirectedOffsetCents);

  return (
    <div className="page-shell page-shell-focused">
      <header className="hero landing-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <PageHero
          eyebrow="A verified coordination platform for bounded moral trade"
          title="Make one reviewable moral trade."
          description="Start narrow: verified donation offsets, threshold public-goods commitments, and bounded pledge swaps with explicit baselines, evidence rules, and safety review."
          actions={
            <>
              <Link className="button button-primary" href={createOffsetHref}>
                Create verified offset
              </Link>
              <Link className="button button-secondary" href="/mpgf">
                Fund a shared public good
              </Link>
              <Link className="text-button" href="/background-networking">
                Find counterparties privately
              </Link>
            </>
          }
        >
          <MoralTradeHeroVisual />
        </PageHero>

        <div className="trust-chip-row trust-chip-row-wide" aria-label="Trust standards">
          <TrustChip>Voluntary only</TrustChip>
          <TrustChip>Evidence-gated</TrustChip>
          <TrustChip>Challenge windows</TrustChip>
          <TrustChip>No escrow or custody claim</TrustChip>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="routes-heading">
          <SectionHeader eyebrow="Choose your route" id="routes-heading" title="The pilot is intentionally narrow.">
            The next product wedge is verified offsets, moral public goods, bounded pledge swaps, and concierge-assisted private matching. General paid action offers stay de-emphasized until review and compliance systems mature.
          </SectionHeader>
          <div className="format-card-grid launch-route-grid">
            {LAUNCH_WEDGE_ROUTES.map((route) => (
              <Link className="panel format-card" href={route.href} key={route.title}>
                <IconMark name={route.icon as IconName} />
                <div>
                  <h3>{route.title}</h3>
                  <p>{route.description}</p>
                </div>
                <span className="inline-link">{route.cta}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="search-strip-heading">
          <SectionHeader eyebrow="Marketplace search" id="search-strip-heading" title="Find reviewable examples by cause or format.">
            Start with broad categories, then inspect exact terms, baselines, and evidence states before relying on any proposal.
          </SectionHeader>
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

        <section className="section section-subtle" aria-labelledby="products-heading">
          <SectionHeader eyebrow="Core formats" id="products-heading" title="Keep the public product focused." />
          <div className="format-card-grid">
            {productCards.map((card) => (
              <article className="panel format-card" key={card.title}>
                <IconMark name={card.icon} />
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.explanation}</p>
                </div>
                <p className="example-line">Example: {card.example}</p>
                <Link className="inline-link" href={card.href}>
                  {card.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="snapshot-heading">
          <SectionHeader eyebrow="Marketplace snapshot" id="snapshot-heading" title="Pilot status at a glance.">
            Live activity is separated from worked examples so early-stage numbers do not overstate liquidity.
          </SectionHeader>
          <div className="pilot-metric-grid">
            <MetricCard
              action={
                marketplaceOverview.openOfferCount === 0
                  ? { href: "/offers?view=examples", label: "Inspect worked examples" }
                  : { href: "/offers?view=live", label: "Browse live offers" }
              }
              detail={
                marketplaceOverview.openOfferCount === 0
                  ? "0 live offers — inspect worked examples or create the first offer."
                  : "Signed-in participants have published these proposals."
              }
              icon="marketplace"
              label="Live offers"
              value={liveOfferCount}
            />
            <MetricCard
              action={{ href: "/offers?view=examples", label: "View examples" }}
              detail="Seeded examples are not live liquidity."
              icon="example"
              label="Worked examples"
              value={String(CANONICAL_WORKED_CASE_COUNT)}
            />
            <MetricCard
              action={{ href: "/people", label: "View directory" }}
              detail="Only opt-in public profiles are counted."
              icon="profile"
              label="Public profiles"
              value={publicProfileCount}
            />
            <MetricCard
              action={{ href: "/donation-offsets", label: "Open offsets" }}
              detail="Reviewed external evidence only."
              icon="review"
              label="Reviewed offsets"
              value={reviewedOffsets}
            />
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="featured-examples-heading">
          <SectionHeader
            eyebrow="Featured worked examples"
            id="featured-examples-heading"
            title="Worked examples, not live offers."
          >
            Example cards show comparable terms without implying market activity.
          </SectionHeader>
          <div className="listing-grid compact-listing-grid">
            {featuredExamples.map((offer) => (
              <OfferCard
                alias={offer.alias}
                causeExchange={`${offer.offeredCause} -> ${offer.requestedCause}`}
                ctaHref={`/offers?view=examples&search=${encodeURIComponent(offer.alias)}`}
                duration={offer.duration}
                evidence={offer.verification}
                key={offer.id}
                modeIcon={getOfferModeIcon(offer.mode)}
                modeLabel={formatMode(offer.mode)}
                offeredAction={offer.offerAction}
                offeredScore={offer.offerImpact}
                primaryActionLabel="View worked example"
                requestedAction={offer.requestAction}
                requestedThreshold={offer.minCounterpartyImpact}
                reviewState="Worked example. Manual review required before reliance."
                sourceLabel="Worked example"
                title={`${offer.offeredCause} for ${offer.requestedCause}`}
              />
            ))}
          </div>
        </section>

        <section className="section section-white" id="how-it-works" aria-labelledby="how-heading">
          <SectionHeader eyebrow="How it works" id="how-heading" title="From intention to reviewed completion." />
          <div className="step-card-grid">
            {howItWorksSteps.map((step, index) => (
              <StepCard index={index + 1} key={step.title} title={step.title}>
                {step.text}
              </StepCard>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="trust-heading">
          <SectionHeader eyebrow="Validation ladder" id="trust-heading" title="Trust signals are earned from evidence." />
          <div className="concept-grid">
            {TRUST_BADGE_LADDER.slice(0, 4).map((badge) => (
              <article className="panel concept-card" key={badge}>
                <IconMark name={badge.includes("Payment") ? "evidence" : "review"} />
                <h3>{badge}</h3>
                <p>
                  This badge should appear only when tied to a specific transaction record, provider
                  receipt, identity check, or reviewed evidence packet.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="states-heading">
          <SectionHeader eyebrow="Evidence states" id="states-heading" title="Manual review needs visible state, not vague trust.">
            The public surface should show whether a claim is merely drafted, awaiting evidence, inside a challenge window, completed, disputed, or unresolved.
          </SectionHeader>
          <div className="data-grid">
            {VALIDATION_STATUS_STATES.slice(0, 4).map((state) => (
              <article className="panel data-card" key={state.state}>
                <p className="detail-kicker">{state.state}</p>
                <h3>{state.reviewerAction}</h3>
                <p>{state.meaning}</p>
              </article>
            ))}
          </div>
          <div className="section-actions">
            <Link className="button button-secondary" href="/validation">
              View validation rulebook
            </Link>
            <Link className="text-button" href={createTradeHref}>
              Draft a bounded pledge swap
            </Link>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="credibility-heading">
          <SectionHeader eyebrow="Credibility in pilot mode" id="credibility-heading" title="Trust signals without invented proof.">
            Moral Trade does not show testimonials, ratings, press logos, completed-impact claims, or decorative proof badges until those records exist.
          </SectionHeader>
          <div className="teaser-grid credibility-grid">
            {credibilityCards.map((card) => (
              <Link className="panel teaser-card credibility-card" href={card.href} key={card.title}>
                <IconMark name={card.icon} />
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="inline-link">{card.linkLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-white" id="about" aria-labelledby="learn-more-heading">
          <SectionHeader eyebrow="Learn more" id="learn-more-heading" title="Keep the theory close, not crowded." />
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/methodology">
              <h3>Methodology</h3>
              <p>How trade records, evidence, and matching boundaries are structured.</p>
            </Link>
            <Link className="panel teaser-card" href="/safety">
              <h3>Safety</h3>
              <p>What distinguishes voluntary trade from threats, fraud, and pressure.</p>
            </Link>
            <Link className="panel teaser-card" href="/faq">
              <h3>FAQ</h3>
              <p>Plain-language answers about offers, examples, review, and payments.</p>
            </Link>
            <Link className="panel teaser-card" href="/methodology#sources">
              <h3>Toby Ord / Forethought source notes</h3>
              <p>Research sources for moral trade, compromise, and public goods.</p>
            </Link>
            <Link className="panel teaser-card" href="/paid-action-offers">
              <h3>Paid action offers are deferred</h3>
              <p>Why the pilot keeps paid action offers out of the mainstream creation path.</p>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
