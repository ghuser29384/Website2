import Link from "next/link";

import {
  DealReceipt,
  VICTORIA_PAUL_RECEIPT_ROWS,
} from "@/components/marketplace/deal-receipt";
import {
  GainField,
  OffsetFlowFigure,
  ThresholdField,
} from "@/components/marketplace/gain-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
}

const productModes = [
  {
    index: "01",
    label: "Trade",
    description: "Exchange actions or commitments that each side values differently.",
    href: "/create?mode=trade",
    status: "Available",
    later: false,
  },
  {
    index: "02",
    label: "Offset",
    description: "Redirect matched opposed donations into a shared destination.",
    href: "/offsets",
    status: "Available",
    later: false,
  },
  {
    index: "03",
    label: "Pool",
    description: "Pledge up to a maximum and fund only when the published condition passes.",
    href: "/pools",
    status: "Available",
    later: false,
  },
  {
    index: "04",
    label: "Back",
    description: "Help close a compensation gap for a more impactful path.",
    href: "/create?mode=back",
    status: "Later lane",
    later: true,
  },
] as const;

const processSteps = [
  {
    number: "01",
    title: "Name the no-deal default.",
    description: "Record what each side would otherwise do before a proposal creates new leverage.",
  },
  {
    number: "02",
    title: "Set bounded terms.",
    description: "State the exact action, maximum exposure, deadline, evidence, settlement, and exit rule.",
  },
  {
    number: "03",
    title: "Match only on mutual gain.",
    description: "Each side judges the proposal by their own priorities.",
  },
  {
    number: "04",
    title: "Authorize, evidence, settle.",
    description: "The record moves through explicit states and produces a Deal Receipt rather than a vague success claim.",
  },
] as const;

const trustCards = [
  {
    number: "01",
    title: "The default is visible",
    description: "A proposal is compared with a stated no-deal alternative, not an invented threat or undefined status quo.",
  },
  {
    number: "02",
    title: "Exposure is capped",
    description: "Money, time, action burden, deadlines, and cancellation rules are inspectable before authorization.",
  },
  {
    number: "03",
    title: "Safety is non-compensatory",
    description: "Threats, coercion, fraud, forged evidence, and identity abuse are eligibility blockers, not low points in a score.",
  },
] as const;

export function HomePage({ isAuthenticated }: HomePageProps) {
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const featuredExamples = CANONICAL_WORKED_CASE_OFFERS.slice(0, 3);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Beta</span>
        <span>Review current payment and settlement capabilities before relying on a record.</span>
        <Link href="/status">Status</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-product-hero" aria-labelledby="home-hero-heading">
          <div className="mt-product-hero-copy">
            <p className="mt-product-kicker">A marketplace for productive difference</p>
            <h1 id="home-hero-heading">
              Do more good
              <span>without agreeing.</span>
            </h1>
            <p className="mt-product-hero-text">
              Swap commitments, redirect offsetting donations, or join a conditional funding pool.
              Every proposal keeps the no-deal default and the complete terms visible before anyone
              relies on it.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href="/offers">
                Explore the marketplace
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create a proposal
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Core operating principles">
              <li>Clear terms</li>
              <li>Conditional settlement</li>
              <li>Reviewable evidence</li>
              <li>No moral ranking</li>
            </ul>
          </div>
          <div className="mt-product-hero-visual">
            <GainField />
          </div>
        </section>

        <nav className="mt-mode-rail" aria-label="Ways to use Moral Trade">
          {productModes.map((mode) => (
            <Link
              className={["mt-mode-card", mode.later ? "is-later" : ""].filter(Boolean).join(" ")}
              href={mode.href}
              key={mode.label}
            >
              <span className="mt-mode-card-index">
                <span>{mode.index}</span>
                <span>{mode.status}</span>
              </span>
              <div>
                <h2>{mode.label}</h2>
                <p>{mode.description}</p>
              </div>
              <span className="mt-mode-card-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>

        <section className="mt-product-section is-white" aria-labelledby="marketplace-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Explore</p>
              <h2 id="marketplace-heading">Understand one complete deal in under a minute.</h2>
            </div>
            <p>
              Live participant proposals remain separate from worked examples. These examples show
              the shape of the terms without pretending that a counterparty or liquidity exists.
            </p>
          </div>

          <div className="mt-market-grid">
            {featuredExamples.map((example) => (
              <article className="mt-market-card" key={example.id}>
                <div className="mt-market-card-head">
                  <span className="mt-market-eyebrow">{formatMode(example.mode)}</span>
                  <span className="mt-market-state">Worked example</span>
                </div>
                <h3>
                  {example.offeredCause}
                  <span aria-hidden="true">↔</span>
                  {example.requestedCause}
                </h3>
                <dl>
                  <div>
                    <dt>Offers</dt>
                    <dd>{example.offerAction}</dd>
                  </div>
                  <div>
                    <dt>Requests</dt>
                    <dd>{example.requestAction}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>{example.verification}</dd>
                  </div>
                </dl>
                <div className="mt-market-card-foot">
                  <span>{example.duration}</span>
                  <Link href={`/offers/examples/${example.id}`}>Inspect terms ↗</Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-product-actions">
            <Link className="button button-primary" href="/offers">
              Explore all records
            </Link>
            <Link className="button button-secondary" href="/worked-examples">
              View worked examples
            </Link>
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="process-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">How it works</p>
              <h2 id="process-heading">Agree on the deal, not the values.</h2>
            </div>
            <p>
              The interface uses plain actions first. Mechanism detail, evidence scope, and limits
              remain available before authorization and settlement.
            </p>
          </div>
          <ol className="mt-how-grid">
            {processSteps.map((step) => (
              <li className="mt-how-step" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <Link className="button button-secondary" href="/how-it-works">
            Review the full process
          </Link>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="offset-heading">
          <div className="mt-feature-split">
            <div className="mt-feature-copy">
              <p className="mt-product-kicker">Offset</p>
              <h2 id="offset-heading">Turn a zero-sum donation into a shared gain.</h2>
              <p>
                Two opposed planned donations can stop at a matched amount and redirect that amount
                into a named destination both donors prefer to the original pair of donations.
              </p>
              <div className="mt-product-actions">
                <Link className="button button-primary" href="/offsets">Open offsets</Link>
                <Link className="button button-secondary" href="/offers?view=examples&search=offset">
                  Inspect an example
                </Link>
              </div>
            </div>
            <div className="mt-feature-visual">
              <OffsetFlowFigure />
            </div>
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="pool-heading">
          <div className="mt-feature-split">
            <div className="mt-feature-copy">
              <p className="mt-product-kicker">Pool</p>
              <h2 id="pool-heading">Pledge a little. Fund it only when enough people join.</h2>
              <p>
                A pool shows each person&apos;s maximum exposure, the funding condition, deadline,
                recipient, settlement rule, progress visibility, and failure behavior.
              </p>
              <div className="mt-product-actions">
                <Link className="button button-primary" href="/pools">Explore pools</Link>
                <Link className="button button-secondary" href="/mpgf">Open public-goods tools</Link>
              </div>
            </div>
            <div className="mt-feature-visual">
              <ThresholdField progress={64} />
            </div>
          </div>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="receipt-heading">
          <div className="mt-receipt-layout">
            <div className="mt-receipt-copy">
              <p className="mt-product-kicker">The trust object</p>
              <h2 id="receipt-heading">Every proposal becomes a Deal Receipt.</h2>
              <p>
                The receipt is the stable interface across trades, offsets, and pools. It separates
                the default, commitments, condition, maximum exposure, evidence, settlement, exit,
                externalities, and state.
              </p>
              <Link className="button button-secondary" href="/trust">
                Review trust boundaries
              </Link>
            </div>
            <DealReceipt
              note="Illustrative worked example. It is not a live proposal or completed transaction."
              rows={VICTORIA_PAUL_RECEIPT_ROWS}
              state="Draft"
              title="Victoria ↔ Paul"
            />
          </div>
        </section>

        <section className="mt-product-section is-dark" aria-labelledby="trust-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Trust infrastructure</p>
              <h2 id="trust-heading">The mechanism is the ornament.</h2>
            </div>
            <p>
              Safety, evidence, payment, dispute, and exit states are part of the product surface—not
              a compliance appendix hidden after the conversion.
            </p>
          </div>
          <div className="mt-trust-grid">
            {trustCards.map((card) => (
              <article className="mt-trust-card" key={card.number}>
                <span>{card.number}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-product-actions">
            <Link className="button button-primary" href="/trust">What you can rely on</Link>
            <Link className="button button-secondary" href="/safety">Safety and anti-threat rules</Link>
          </div>
        </section>

        <section className="mt-product-section is-white" aria-label="Research role">
          <div className="mt-research-footnote">
            <strong>5%</strong>
            <p>
              Research supplies the theory, tests mechanism claims, and records uncertainty. The
              other 95% of the public experience is marketplace discovery, coordination, terms,
              authorization, evidence, settlement, and recourse.
            </p>
            <Link href="/research">Research layer →</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
