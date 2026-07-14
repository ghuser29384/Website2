import Link from "next/link";

import { MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { MutualStepFigure } from "@/components/home/mutual-step-figure";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark, type IconName } from "@/components/ui/page-primitives";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_COUNT, CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
}

const mechanismSteps = [
  {
    number: "01",
    title: "Name the default.",
    description:
      "Record what each person would otherwise do. The baseline prevents manufactured threats from becoming bargaining leverage.",
  },
  {
    number: "02",
    title: "Specify bounded terms.",
    description:
      "Define the actions, timing, evidence, privacy level, exit conditions, and challenge process before anyone relies on the agreement.",
  },
  {
    number: "03",
    title: "Move only if both prefer it.",
    description:
      "Each participant evaluates the change by their own values. Moral Trade does not require a shared moral ranking.",
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
    description: "Exchange small commitments that each participant values differently.",
    href: "/pledge-swaps",
    icon: "swap",
  },
  {
    label: "02 / REDIRECTION",
    title: "Donation offsets",
    description: "Redirect opposed giving toward a reciprocal or mutually preferred destination.",
    href: "/donation-offsets",
    icon: "offset",
  },
  {
    label: "03 / SHARED",
    title: "Moral public goods",
    description: "Coordinate funding for goods that many people value for different reasons.",
    href: "/moral-goods-group-buying",
    icon: "publicGoods",
  },
  {
    label: "04 / PRIVATE",
    title: "Consent-gated matching",
    description: "Find broad compatibility before identities, exact asks, or contact details are disclosed.",
    href: "/background-networking",
    icon: "lock",
  },
] as const;

const relianceRules = [
  ["Explicit baselines", "The no-trade alternative is recorded before terms are compared."],
  ["Reviewable evidence", "Receipts, logs, attestations, or public records support completion claims."],
  ["Consent-gated disclosure", "Private wishes and identities remain private until both sides approve disclosure."],
  ["Clear exits and challenges", "Participants can see withdrawal, review, dispute, and appeal paths before relying on terms."],
] as const;

export function HomePage({ isAuthenticated }: HomePageProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup?returnTo=/onboarding";
  const primaryLabel = isAuthenticated ? "Open your workspace" : "Join the network";
  const createHref = isAuthenticated ? "/offers/new" : "/signup?returnTo=/onboarding";
  const featuredExamples = CANONICAL_WORKED_CASE_OFFERS.slice(0, 3);

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
              A coordination platform for moral disagreement
            </p>
            <h1 id="home-hero-heading">
              Cooperate
              <span>without agreeing.</span>
            </h1>
            <p className="mt-home-hero-text">
              Moral Trade turns value disagreement into voluntary, bounded exchanges and shared
              public-good commitments. Each participant judges the result by their own lights.
            </p>
            <div className="mt-home-hero-actions">
              <Link className="button button-primary" href={primaryHref}>
                {primaryLabel}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link className="mt-text-link" href="/offers/examples/seed-victoria">
                See a complete example
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="mt-home-assurances" aria-label="Core operating principles">
              <li>Voluntary</li>
              <li>Explicit baselines</li>
              <li>Evidence-reviewed</li>
            </ul>
          </div>

          <MutualStepFigure />
        </section>

        <section className="mt-home-thesis" aria-labelledby="home-thesis-heading">
          <p className="mt-home-section-index">01 / THE PREMISE</p>
          <div>
            <h2 id="home-thesis-heading">Different values can support the same better outcome.</h2>
            <p>
              When people care differently about two outcomes, each may be able to give up less
              and create more value for the other. The objective is not moral convergence. It is a
              Pareto improvement relative to an explicit default.
            </p>
          </div>
          <MutualStepMark className="mt-home-thesis-mark" />
        </section>

        <section className="mt-home-process" aria-labelledby="home-process-heading">
          <div className="mt-home-section-head">
            <p className="mt-home-section-index">02 / THE PROTOCOL</p>
            <h2 id="home-process-heading">A legible process for a difficult coordination problem.</h2>
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
              <p className="mt-home-section-index">03 / WAYS TO COORDINATE</p>
              <h2 id="home-lanes-heading">Choose a concrete route.</h2>
            </div>
            <p>
              Every route starts with a baseline, bounded terms, evidence requirements, privacy
              controls, and a clear exit.
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

        <section className="mt-home-examples" aria-labelledby="home-examples-heading">
          <div className="mt-home-section-head mt-home-section-head-split">
            <div>
              <p className="mt-home-section-index">04 / COMPLETE EXAMPLES</p>
              <h2 id="home-examples-heading">Inspect the terms before creating anything.</h2>
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
                  <Link
                    aria-label={`View ${offer.offeredCause} and ${offer.requestedCause} example`}
                    href={`/offers/examples/${offer.id}`}
                  >
                    View terms <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-home-reliance" aria-labelledby="home-reliance-heading">
          <div className="mt-home-reliance-copy">
            <p className="mt-home-section-index">05 / RELIABILITY</p>
            <h2 id="home-reliance-heading">Built for serious, reviewable use.</h2>
            <p>
              The service exposes its operating rules and limits instead of asking participants to
              rely on hidden judgment or implied guarantees.
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

        <section className="mt-home-final" aria-labelledby="home-final-heading">
          <MutualStepMark className="mt-home-final-mark" />
          <div>
            <p className="mt-home-section-index">YOUR FIRST MOVE</p>
            <h2 id="home-final-heading">Bring one real disagreement.</h2>
            <p>
              Start with one serious counterparty, one bounded commitment, and terms both sides
              can inspect before relying on them.
            </p>
          </div>
          <div className="mt-home-final-actions">
            <Link className="button button-primary" href={createHref}>
              {isAuthenticated ? "Create a trade" : "Join the network"}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="mt-text-link" href="/how-it-works">
              Review the protocol
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
