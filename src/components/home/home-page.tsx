import Link from "next/link";

import { PoolSection } from "@/components/home/pool-section";
import {
  GainField,
  OffsetFlowFigure,
} from "@/components/marketplace/gain-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
}

const productModes = [
  {
    index: "01",
    label: "Fund",
    description: "Complete a real donation through a reviewed external payment route.",
    href: "/donate",
    status: "Payment available",
    later: false,
  },
  {
    index: "02",
    label: "Trade",
    description: "Exchange actions or commitments that each side values differently.",
    href: "/create?mode=trade",
    status: "Create",
    later: false,
  },
  {
    index: "03",
    label: "Offset",
    description: "Redirect matched opposed donations into a shared destination.",
    href: "/offsets",
    status: "Coordinate",
    later: false,
  },
  {
    index: "04",
    label: "Pool",
    description: "Pledge up to a maximum and fund only when the published condition passes.",
    href: "/pools",
    status: "Live-backed",
    later: false,
  },
] as const;

const actionRoutes = [
  {
    key: "fund",
    eyebrow: "Financial",
    state: "Available now",
    title: "Complete a real donation",
    details: [
      ["Route", "Reviewed Every.org destination"],
      ["Payment", "Provider-hosted checkout"],
      ["Boundary", "No Moral Trade custody or escrow"],
    ],
    foot: "Payment methods set by provider",
    href: "/donate",
    linkLabel: "Choose a funding route ↗",
  },
  {
    key: "trade",
    eyebrow: "Coordination",
    state: "Create",
    title: "Write a bounded trade",
    details: [
      ["Default", "What each side would otherwise do"],
      ["Terms", "Action, cap, deadline, evidence, and exit"],
      ["Decision", "Each side evaluates the proposal independently"],
    ],
    foot: "Account required to save",
    href: "/create",
    linkLabel: "Create a proposal ↗",
  },
  {
    key: "pool",
    eyebrow: "Public goods",
    state: "Production state",
    title: "Review current pools",
    details: [
      ["Condition", "Published threshold and deadline"],
      ["Exposure", "Maximum amount visible before authorization"],
      ["Inventory", "No demo fallback when no live route exists"],
    ],
    foot: "Route-specific payment readiness",
    href: "/pools",
    linkLabel: "Open live pools ↗",
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
    title: "Authorize, evidence, resolve.",
    description: "Move through explicit states and produce a Deal Receipt rather than a vague success claim.",
  },
] as const;

const paymentSteps = [
  {
    number: "01",
    title: "Choose a reviewed destination",
    description: "Select a configured Every.org route that matches the public good you want to fund.",
  },
  {
    number: "02",
    title: "Pay with the provider",
    description: "Every.org presents the payment flow and supported methods. Moral Trade does not hold the donation.",
  },
  {
    number: "03",
    title: "Attach evidence when needed",
    description: "A linked workflow can use provider import or a reviewed fallback without turning a receipt into an automatic verification claim.",
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

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Financial route available</span>
        <span>
          Complete a real donation through reviewed Every.org destinations. Conditional payment and
          settlement remain route-specific.
        </span>
        <Link href="/donate">Fund now</Link>
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
            <p className="mt-product-kicker">Coordination for productive difference</p>
            <h1 id="home-hero-heading">
              Do more good
              <span>without agreeing.</span>
            </h1>
            <p className="mt-product-hero-text">
              Make a financial contribution, exchange bounded commitments, redirect offsetting
              donations, or join a conditional funding pool. Every route keeps the material terms and
              operating boundaries visible before anyone relies on it.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href="/start">
                Choose a real action
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create a proposal
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Core operating principles">
              <li>Real payment route</li>
              <li>Clear terms</li>
              <li>No platform custody</li>
              <li>Reviewable evidence</li>
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

        <section className="mt-product-section is-white" aria-labelledby="action-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Act</p>
              <h2 id="action-heading">Start with a live route.</h2>
            </div>
            <p>
              Choose the action that fits the current need. Financial payment is available through a
              reviewed external provider; trades and pools keep their own authorization and review
              states.
            </p>
          </div>

          <div className="mt-market-grid">
            {actionRoutes.map((action) => (
              <article className="mt-market-card" key={action.key}>
                <div className="mt-market-card-head">
                  <span className="mt-market-eyebrow">{action.eyebrow}</span>
                  <span className="mt-market-state">{action.state}</span>
                </div>
                <h3>{action.title}</h3>
                <dl>
                  {action.details.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-market-card-foot">
                  <span>{action.foot}</span>
                  <Link href={action.key === "trade" ? createHref : action.href}>
                    {action.linkLabel}
                  </Link>
                </div>
              </article>
            ))}
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
                <Link className="button button-secondary" href="/donate">
                  Open funding routes
                </Link>
              </div>
            </div>
            <div className="mt-feature-visual">
              <OffsetFlowFigure />
            </div>
          </div>
        </section>

        <PoolSection />

        <section className="mt-product-section is-white" aria-labelledby="payment-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Financial contribution</p>
              <h2 id="payment-heading">A real payment path is available now.</h2>
            </div>
            <p>
              Payment occurs with Every.org. Moral Trade provides the reviewed route and optional
              workflow evidence without acting as an escrow or custodian.
            </p>
          </div>
          <ol className="mt-how-grid">
            {paymentSteps.map((step) => (
              <li className="mt-how-step" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-product-actions">
            <Link className="button button-primary" href="/donate">
              Make a financial contribution
            </Link>
            <Link className="button button-secondary" href="/status">
              Review payment capabilities
            </Link>
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
            <Link className="button button-primary" href="/status">Service status</Link>
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
