import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trust",
  description:
    "A plain-language guide to what Moral Trade checks, what reviewed status means, and what the service does not guarantee.",
  alternates: {
    canonical: "/trust",
  },
  openGraph: {
    title: "Trust should be specific",
    description:
      "See what Moral Trade records and reviews, how to read proposal status, and where the service's limits are.",
    url: getAbsoluteUrl("/trust"),
    type: "website",
  },
};

const trustChecks = [
  {
    title: "Clear terms",
    detail:
      "The action, no-deal baseline, timing, evidence requirements, maximum exposure, and exit terms should be visible before anyone relies on a proposal.",
  },
  {
    title: "Named evidence",
    detail:
      "Receipts, logs, attestations, or public records are identified in advance. Review applies only to the evidence and scope that were actually checked.",
  },
  {
    title: "Contextual reliability",
    detail:
      "Reliability is shown for a particular role and type of commitment. Moral Trade does not assign a universal score for virtue, status, or social worth.",
  },
] as const;

const reviewStates = [
  {
    title: "Worked example",
    detail: "Illustrative only. It is not an active agreement.",
  },
  {
    title: "Draft",
    detail: "Participant-stated terms that have not been reviewed.",
  },
  {
    title: "Evidence submitted",
    detail: "Proof has been named for inspection, but no review conclusion is implied.",
  },
  {
    title: "Reviewed",
    detail:
      "A human reviewer checked the named scope and evidence. Reviewed does not mean guaranteed.",
  },
] as const;

const limits = [
  "No escrow, custody, or payment protection.",
  "No legal, tax, or investment advice.",
  "No objective ranking of moral views or people.",
  "Reviewed status does not guarantee performance.",
  "Bilateral agreement does not eliminate possible harms to third parties.",
] as const;

const recourseRoutes = [
  {
    title: "Challenge evidence or a baseline",
    detail:
      "Use this when proof appears incomplete, duplicated, or out of scope, or when the claimed no-deal baseline looks wrong.",
    href: "mailto:support@moraltrade.org?subject=Challenge%20evidence%20or%20baseline",
    action: "Email a review challenge",
  },
  {
    title: "Report a safety or privacy concern",
    detail:
      "Use this for threats, coercion, harassment, fraud, identity misuse, account compromise, or inappropriate disclosure.",
    href: "mailto:support@moraltrade.org?subject=Safety%20or%20privacy%20concern",
    action: "Email a safety concern",
  },
  {
    title: "Raise a third-party harm",
    detail:
      "Use this when a proposal may impose material costs on people, groups, animals, or values not represented by the parties.",
    href: "mailto:support@moraltrade.org?subject=Externality%20or%20third-party%20harm",
    action: "Request externality review",
  },
] as const;

export default async function TrustPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <h1>Trust should be specific.</h1>
            <p className="hero-text">
              Moral Trade records what was promised, what evidence counts, and what has been
              reviewed. It does not guarantee outcomes, hold funds, or decide which moral views
              are right.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Explore proposals
              </Link>
              <Link className="button button-secondary" href="/credibility">
                Read the methodology
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel" aria-label="Trust at a glance">
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Terms are visible</strong>
                  <p>See the baseline, commitment, evidence, timing, and exit conditions.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Review is scoped</strong>
                  <p>A review covers named evidence and a defined role, not the whole person.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Decisions can be challenged</strong>
                  <p>Evidence, baselines, privacy, safety, and externalities have review routes.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <h2>What Moral Trade checks</h2>
            <p>
              Trust is attached to a specific proposal, type of evidence, and role. Evidence asks
              whether the action happened; baseline confidence asks what would likely have happened
              without the agreement. Those questions remain separate.
            </p>
          </div>

          <div className="data-grid">
            {trustChecks.map((check) => (
              <article className="panel data-card" key={check.title}>
                <h3>{check.title}</h3>
                <p className="route-text">{check.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <h2>How to read proposal status</h2>
            <p>
              Status communicates how far a record has moved through the review process. It
              should never be read as a blanket guarantee.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            <div className="flow-card">
              {reviewStates.map((state, index) => (
                <div className="flow-step" key={state.title}>
                  <span className="flow-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{state.title}</strong>
                    <p>{state.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="limits-heading">
          <div className="section-head">
            <h2 id="limits-heading">What Moral Trade does not guarantee</h2>
            <p>These limits should remain visible before a visitor relies on a proposal.</p>
          </div>

          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {limits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </div>

          <div className="section-head">
            <h2 id="recourse-heading">When something looks wrong</h2>
            <p>
              Choose the route that matches the problem. Technical contracts and aggregate
              governance data remain available on the transparency page.
            </p>
          </div>

          <div className="data-grid" aria-labelledby="recourse-heading">
            {recourseRoutes.map((route) => (
              <article className="panel data-card" key={route.title}>
                <h3>{route.title}</h3>
                <p className="route-text">{route.detail}</p>
                <a className="text-button" href={route.href}>
                  {route.action}
                </a>
              </article>
            ))}
          </div>

          <div className="hero-actions">
            <Link className="button button-secondary" href="/transparency">
              View transparency details
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact the team
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
