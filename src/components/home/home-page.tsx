import Link from "next/link";

import { MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { MutualStepFigure } from "@/components/home/mutual-step-figure";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark, type IconName } from "@/components/ui/page-primitives";
import type { MarketplaceOverview } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { VISITOR_PATHS } from "@/lib/visitor-paths";

interface HomePageProps {
  isAuthenticated: boolean;
  marketplaceOverview: MarketplaceOverview;
}

const mechanismSteps = [
  {
    number: "01",
    title: "Name the default.",
    description:
      "Write down what each person would otherwise do. That baseline keeps manufactured threats out of the bargain.",
  },
  {
    number: "02",
    title: "Make the exchange legible.",
    description:
      "Set bounded actions, evidence, timing, and exit rules before either participant relies on the arrangement.",
  },
  {
    number: "03",
    title: "Move only if both prefer it.",
    description:
      "Each side judges the result by its own values. Moral Trade does not impose a hidden moral ranking.",
  },
] as const;

const tradeLanes: ReadonlyArray<{
  description: string;
  href: string;
  icon: IconName;
  label: string;
  title: string;
}> = [
  {
    label: "01 / RECIPROCAL",
    title: "Pledge swaps",
    description: "Exchange small, bounded commitments that each participant values differently.",
    href: "/pledge-swaps",
    icon: "swap",
  },
  {
    label: "02 / REDIRECTION",
    title: "Donation offsets",
    description: "Redirect opposed giving into a clearer reciprocal or shared outcome.",
    href: "/donation-offsets",
    icon: "offset",
  },
  {
    label: "03 / SHARED",
    title: "Moral public goods",
    description: "Coordinate around goods that people value for different moral reasons.",
    href: "/moral-goods-group-buying",
    icon: "publicGoods",
  },
  {
    label: "04 / PRIVATE",
    title: "Consent-gated matching",
    description: "Discover broad overlap first; disclose exact asks only after mutual consent.",
    href: "/background-networking",
    icon: "lock",
  },
] as const;

const relianceRules = [
  ["Explicit baselines", "The no-trade alternative is recorded before terms are compared."],
  ["Reviewable evidence", "Receipts, logs, attestations, or public statements support claims."],
  ["Consent-gated disclosure", "Private asks and identities stay private until both sides opt in."],
  ["No custody or escrow", "The pilot does not hold money, assets, or participant commitments."],
] as const;

function formatOptionalCount(value: number | null) {
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

export function HomePage({ isAuthenticated, marketplaceOverview }: HomePageProps) {
  const cohortHref = isAuthenticated ? "/dashboard" : "/cohort";
  const featuredExamples = CANONICAL_WORKED_CASE_OFFERS.slice(0, 3);
  const metrics = [
    ["Live offers", formatOptionalCount(marketplaceOverview.openOfferCount)],
    ["Worked examples", String(CANONICAL_WORKED_CASE_COUNT)],
    ["Public profiles", formatOptionalCount(marketplaceOverview.publicProfileCount)],
    ["Completed agreements", formatOptionalCount(marketplaceOverview.completedAgreementCount)],
  ] as const;

  return (
    <div className="page-shell mt-site-shell mt-home-shell">
      <header className="mt-home-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showSearch={false}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-home-main" id="main-content" tabIndex={-1}>
        <section className="mt-home-hero" aria-labelledby="home-hero-heading">
          <div className="mt-home-hero-copy">
            <p className="mt-home-kicker">
              <span aria-hidden="true" />
              A pilot institution for cooperation
            </p>
            <h1 id="home-hero-heading">
              Cooperate
              <span>without agreeing.</span>
            </h1>
            <p className="mt-home-hero-text">
              Moral Trade helps people with different values exchange small, reviewable
              commitments so each prefers the result to the status quo.
            </p>
            <div className="mt-home-hero-actions">
              <Link className="button button-primary" href="/what-is-moral-trade">
                See how it works
                <span aria-hidden="true">↗</span>
              </Link>
              <Link className="mt-text-link" href="/worked-examples">
                Browse worked examples
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="mt-home-assurances" aria-label="Core operating principles">
              <li>Voluntary</li>
              <li>Evidence-reviewed</li>
              <li>Baseline-aware</li>
            </ul>
          </div>

          <MutualStepFigure />
        </section>

        <section className="mt-home-thesis" aria-labelledby="home-thesis-heading">
          <p className="mt-home-section-index">01 / THE PREMISE</p>
          <div>
            <h2 id="home-thesis-heading">Disagreement can create gains.</h2>
            <p>
              When two people care differently about two outcomes, each may be able to give up
              less and create more value for the other. The point is not moral convergence. It is
              a better outcome by each participant&apos;s own lights.
            </p>
          </div>
          <MutualStepMark className="mt-home-thesis-mark" />
        </section>

        <section className="mt-home-process" aria-labelledby="home-process-heading">
          <div className="mt-home-section-head">
            <p className="mt-home-section-index">02 / THE MECHANISM</p>
            <h2 id="home-process-heading">A small protocol for a hard problem.</h2>
          </div>
          <ol className="mt-home-process-grid">
            {mechanismSteps.map((step) => (
              <li key={step.number}>
                <span className="mt-home-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-home-process-action">
            <Link className="mt-text-link" href="/how-it-works">
              Read the full protocol
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="mt-home-lanes" aria-labelledby="home-lanes-heading">
          <div className="mt-home-section-head mt-home-section-head-split">
            <div>
              <p className="mt-home-section-index">03 / WAYS TO TRADE</p>
              <h2 id="home-lanes-heading">Start with something bounded.</h2>
            </div>
            <p>
              The pilot starts with low-risk structures that can be read, reviewed, and exited
              without pretending the institution is more mature than it is.
            </p>
          </div>
          <div className="mt-home-lane-grid">
            {tradeLanes.map((lane) => (
              <Link className="mt-home-lane-card" href={lane.href} key={lane.title}>
                <div className="mt-home-lane-card-head">
                  <span>{lane.label}</span>
                  <IconMark name={lane.icon} />
                </div>
                <h3>{lane.title}</h3>
                <p>{lane.description}</p>
                <span className="mt-home-card-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-home-pilot" aria-labelledby="home-pilot-heading">
          <div className="mt-home-pilot-copy">
            <p className="mt-home-section-index">04 / LIVE PILOT</p>
            <h2 id="home-pilot-heading">See the institution as it is.</h2>
            <p>
              Moral Trade is early. Counts come from the current public pilot; worked examples
              are clearly separated from live offers, and no liquidity or impact total is implied.
            </p>
            <Link className="button button-primary" href="/offers">
              Open the coordination feed
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <dl className="mt-home-metrics" aria-label="Current public pilot inventory">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-home-examples" aria-labelledby="home-examples-heading">
          <div className="mt-home-section-head mt-home-section-head-split">
            <div>
              <p className="mt-home-section-index">05 / IN PRACTICE</p>
              <h2 id="home-examples-heading">Read the terms before the theory.</h2>
            </div>
            <Link className="mt-text-link" href="/worked-examples">
              All {CANONICAL_WORKED_CASE_COUNT} examples
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-home-example-grid">
            {featuredExamples.map((offer, index) => (
              <article className="mt-home-example-card" key={offer.id}>
                <div className="mt-home-example-meta">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{formatMode(offer.mode)}</span>
                  <span>Worked example</span>
                </div>
                <h3>
                  {offer.offeredCause}
                  <span aria-hidden="true">↔</span>
                  {offer.requestedCause}
                </h3>
                <dl>
                  <div>
                    <dt>Offers</dt>
                    <dd>{offer.offerAction}</dd>
                  </div>
                  <div>
                    <dt>Requests</dt>
                    <dd>{offer.requestAction}</dd>
                  </div>
                </dl>
                <div className="mt-home-example-footer">
                  <span>{offer.verification}</span>
                  <Link aria-label={`View ${offer.offeredCause} and ${offer.requestedCause} example`} href={`/offers/examples/${offer.id}`}>
                    View terms <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-home-reliance" aria-labelledby="home-reliance-heading">
          <div className="mt-home-reliance-copy">
            <p className="mt-home-section-index">06 / BOUNDARIES</p>
            <h2 id="home-reliance-heading">Trust comes from legible limits.</h2>
            <p>
              The pilot makes its non-guarantees visible before anyone reaches a form or relies
              on a claim.
            </p>
            <Link className="mt-text-link mt-text-link-light" href="/trust">
              What you can rely on
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ol className="mt-home-reliance-list">
            {relianceRules.map(([title, description], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-home-start" aria-labelledby="home-start-heading">
          <div className="mt-home-section-head">
            <p className="mt-home-section-index">07 / YOUR FIRST MOVE</p>
            <h2 id="home-start-heading">Enter at the right depth.</h2>
          </div>
          <div className="mt-home-start-grid">
            {VISITOR_PATHS.map((path, index) => (
              <Link href={path.href} key={path.key}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-home-final" aria-labelledby="home-final-heading">
          <MutualStepMark className="mt-home-final-mark" />
          <div>
            <p className="mt-home-section-index">THE INVITATION</p>
            <h2 id="home-final-heading">Bring one real disagreement.</h2>
            <p>
              Start with one serious counterparty, one bounded commitment, and terms both sides
              can review before relying on them.
            </p>
          </div>
          <div className="mt-home-final-actions">
            <Link className="button button-primary" href={cohortHref}>
              {isAuthenticated ? "Open your dashboard" : "Join the founding cohort"}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="mt-text-link" href="/safety">
              Review safety rules
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
