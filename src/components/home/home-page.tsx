import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  MetricCard,
  OfferCard,
  PageHero,
  SearchBar,
  SectionHeader,
  StepCard,
  TrustChip,
} from "@/components/ui/page-primitives";
import type { MarketplaceOverview } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

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
  { label: "Pledge swaps", href: "/offers?mode=pledge" },
  { label: "Donation offsets", href: "/offers?mode=offset" },
  { label: "Paid action offers", href: "/offers?mode=payment" },
  { label: "Public-good contributions", href: "/mpgf" },
] as const;

const productCards = [
  {
    title: "Pledge swaps",
    href: "/offers?mode=pledge",
    cta: "View pledge swaps",
    explanation: "Exchange bounded commitments when each side values the other's action more.",
    example: "I donate to your cause if you take the action I value.",
  },
  {
    title: "Donation offsets",
    href: "/donation-offsets",
    cta: "View offsets",
    explanation: "Redirect opposed donations toward a named compromise destination.",
    example: "Redirect opposed donations into a shared compromise destination.",
  },
  {
    title: "Public Goods Fund",
    href: "/mpgf",
    cta: "View fund",
    explanation: "Coordinate support for goods many moral views can value.",
    example: "Coordinate support for goods many moral views value.",
  },
] as const;

const howItWorksSteps = [
  {
    title: "Choose a trade format.",
    text: "Pick a pledge swap, donation offset, paid action, or public-good contribution.",
  },
  {
    title: "State reciprocal terms.",
    text: "Name the action, requested action, duration, exit rule, and evidence method.",
  },
  {
    title: "Publish after checks.",
    text: "Public offers rely on explicit terms, evidence rules, and safety review.",
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

export function HomePage({ isAuthenticated, marketplaceOverview }: HomePageProps) {
  const createTradeHref = isAuthenticated ? "/offers/new" : "/signup?returnTo=/offers/new";
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
          eyebrow="A marketplace for voluntary moral trade"
          title="Turn moral disagreement into mutually beneficial action."
          description="Create pledge swaps, donation offsets, and public-good commitments with explicit terms, evidence rules, and safety review."
          actions={
            <>
              <Link className="button button-primary" href="/offers">
                Browse offers
              </Link>
              <Link className="button button-secondary" href={createTradeHref}>
                Create a trade
              </Link>
              <Link className="text-button" href="#how-it-works">
                Learn how it works
              </Link>
            </>
          }
        >
          <aside className="pilot-status-card panel" aria-label="Operating standards">
            <strong>Built for review, not hype</strong>
            <p>
              Worked examples show the structure while live participation grows through signed-in
              users and reviewable evidence.
            </p>
          </aside>
        </PageHero>

        <div className="trust-chip-row trust-chip-row-wide" aria-label="Trust standards">
          <TrustChip>Voluntary only</TrustChip>
          <TrustChip>Evidence-gated</TrustChip>
          <TrustChip>Worked examples clearly labeled</TrustChip>
          <TrustChip>No escrow or custody claim</TrustChip>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="search-strip-heading">
          <SectionHeader eyebrow="Marketplace search" id="search-strip-heading" title="Find examples by cause or format.">
            Start with broad categories, then inspect exact terms before relying on any proposal.
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
          <SectionHeader eyebrow="Trade formats" id="products-heading" title="Three ways to make terms legible." />
          <div className="format-card-grid">
            {productCards.map((card) => (
              <article className="panel format-card" key={card.title}>
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
          <SectionHeader eyebrow="Marketplace snapshot" id="snapshot-heading" title="Pilot numbers, stated plainly." />
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
              label="Live offers"
              value={liveOfferCount}
            />
            <MetricCard
              action={{ href: "/offers?view=examples", label: "View examples" }}
              detail="Seeded examples are not live liquidity."
              label="Worked examples"
              value={String(CANONICAL_WORKED_CASE_COUNT)}
            />
            <MetricCard
              action={{ href: "/people", label: "View directory" }}
              detail="Only opt-in public profiles are counted."
              label="Public profiles"
              value={publicProfileCount}
            />
            <MetricCard
              action={{ href: "/donation-offsets", label: "Open offsets" }}
              detail="Reviewed external evidence only."
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
                modeLabel={formatMode(offer.mode)}
                offeredAction={offer.offerAction}
                offeredScore={offer.offerImpact}
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
          <SectionHeader eyebrow="How it works" id="how-heading" title="From idea to reviewable proposal." />
          <div className="step-card-grid">
            {howItWorksSteps.map((step, index) => (
              <StepCard index={index + 1} key={step.title} title={step.title}>
                {step.text}
              </StepCard>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="trust-heading">
          <SectionHeader eyebrow="Safety and trust" id="trust-heading" title="Clear boundaries protect the trade." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>No coercive proposals</h3>
              <p>No threats, harassment, doxxing, fraud, or pressure on vulnerable people.</p>
            </article>
            <article className="panel concept-card">
              <h3>Risky claims are reviewed</h3>
              <p>Unverifiable baselines and risky proposals require manual review before reliance.</p>
            </article>
            <article className="panel concept-card">
              <h3>No money custody claim</h3>
              <p>External payment evidence only unless provider-approved checkout exists.</p>
            </article>
            <article className="panel concept-card">
              <h3>No legal or tax services</h3>
              <p>The prototype does not provide legal, tax, custody, or escrow services.</p>
            </article>
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
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
