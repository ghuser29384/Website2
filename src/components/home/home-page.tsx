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
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
}

const productModes = [
  {
    index: "01",
    label: "Fund",
    description: "Complete a donation through a reviewed external payment route.",
    href: "/donate",
    status: "Available",
  },
  {
    index: "02",
    label: "Trade",
    description: "Exchange bounded actions or commitments that each side values differently.",
    href: "/create?mode=trade",
    status: "Create",
  },
  {
    index: "03",
    label: "Offset",
    description: "Redirect matched opposed donations into a shared destination.",
    href: "/offsets",
    status: "Coordinate",
  },
  {
    index: "04",
    label: "Pool",
    description: "Pledge up to a maximum and fund only when the published condition passes.",
    href: "/pools",
    status: "Review",
  },
] as const;

const trustCards = [
  {
    number: "01",
    title: "The default is visible",
    description:
      "A proposal is compared with a stated no-deal alternative, not an invented threat or undefined status quo.",
  },
  {
    number: "02",
    title: "Exposure is capped",
    description:
      "Money, time, action burden, deadlines, evidence, and cancellation rules are visible before acceptance.",
  },
  {
    number: "03",
    title: "Threats are ineligible",
    description:
      "Coercion, fraud, forged evidence, identity abuse, and value-destroying threats block a proposal.",
  },
] as const;

export function HomePage({ isAuthenticated }: HomePageProps) {
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Payment route</span>
        <span>Donations are completed on Every.org. Moral Trade does not hold the funds.</span>
        <Link href="/donate">Fund a public good</Link>
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
            <p className="mt-product-kicker">Moral Trade</p>
            <h1 id="home-hero-heading">
              Do more good
              <span>without agreeing.</span>
            </h1>
            <p className="mt-product-hero-text">
              Create bounded agreements, browse active offers, fund a public good, redirect
              offsetting donations, or join a conditional pool.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href={createHref}>
                Create an agreement
              </Link>
              <Link className="button button-secondary" href="/offers">
                Browse active offers
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Core operating boundaries">
              <li>Clear terms</li>
              <li>Bounded exposure</li>
              <li>Reviewable evidence</li>
              <li>No platform custody</li>
            </ul>
          </div>
          <div className="mt-product-hero-visual">
            <GainField />
          </div>
        </section>

        <nav className="mt-mode-rail" aria-label="Available actions">
          {productModes.map((mode) => (
            <Link className="mt-mode-card" href={mode.href} key={mode.label}>
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

        <section className="mt-product-section is-white" aria-labelledby="offset-heading">
          <div className="mt-feature-split">
            <div className="mt-feature-copy">
              <p className="mt-product-kicker">Offset</p>
              <h2 id="offset-heading">Turn opposed donations into a shared gain.</h2>
              <p>
                Stop matched amounts from going to opposing campaigns and redirect them to a named
                destination both donors prefer.
              </p>
              <div className="mt-product-actions">
                <Link className="button button-primary" href="/offsets">Open offsets</Link>
                <Link className="button button-secondary" href="/donate">
                  Fund a public good
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
              <h2 id="pool-heading">Fund only when enough people join.</h2>
              <p>
                Review the threshold, deadline, recipient, maximum exposure, settlement rule, and
                failure behavior before pledging.
              </p>
              <div className="mt-product-actions">
                <Link className="button button-primary" href="/pools">Review pools</Link>
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
              <p className="mt-product-kicker">Deal Receipt</p>
              <h2 id="receipt-heading">Keep the complete terms in one record.</h2>
              <p>
                The record separates the no-deal default, commitments, condition, maximum exposure,
                evidence, settlement, exit, externalities, and current state.
              </p>
              <Link className="button button-secondary" href="/safety">
                Read safety rules
              </Link>
            </div>
            <DealReceipt
              note="Illustrative record. It is not a live proposal or completed transaction."
              rows={VICTORIA_PAUL_RECEIPT_ROWS}
              state="Draft"
              title="Victoria ↔ Paul"
            />
          </div>
        </section>

        <section className="mt-product-section is-dark" aria-labelledby="safety-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Safety</p>
              <h2 id="safety-heading">Threats and coercion are not valid offers.</h2>
            </div>
            <p>
              Defaults, exposure, evidence, cancellation, disputes, and third-party effects remain
              explicit throughout the record.
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
            <Link className="button button-primary" href="/safety">Read safety rules</Link>
            <Link className="button button-secondary" href="/status">Service status</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
