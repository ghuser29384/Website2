import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Safeguards by workflow",
  description:
    "Compatibility guide showing where Moral Trade integrity, consent, evidence, review, pool-governance, privacy, affected-party, and authority controls now live.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "/trade-controls",
  },
  openGraph: {
    title: "Safeguards by workflow | Moral Trade",
    description:
      "Find the live record and workflow responsible for each Moral Trade safeguard.",
    type: "website",
    url: getAbsoluteUrl("/trade-controls"),
  },
};

const workflowGroups = [
  {
    title: "Create and frozen terms",
    status: "Proposal boundary",
    detail:
      "Create now requires a specific no-deal baseline, an anti-manufacturing declaration, an affected-party screen, and individual-capacity confirmation. The final agreement separately freezes evidence, burden, privacy, and exit terms.",
    links: [
      { href: "/trades/new", label: "Open Create" },
      { href: "/commitments", label: "Open agreement records" },
    ],
  },
  {
    title: "Agreement safeguards",
    status: "Per-deal status",
    detail:
      "Every bilateral agreement shows a contextual Safeguards panel calculated from its persisted baseline, same-version confirmations, evidence state, review state, lifecycle, and custody boundary.",
    links: [
      { href: "/commitments", label: "Open commitments" },
      { href: "/evidence", label: "Open evidence" },
    ],
  },
  {
    title: "Evidence, verifiers, disputes, and appeals",
    status: "Dealroom workflow",
    detail:
      "Evidence submission, reviewer nomination, conflicts, graded decisions, replacement evidence, challenges, and appeals belong to the relevant agreement and milestone rather than a detached simulator.",
    links: [
      { href: "/validation", label: "Review validation rules" },
      { href: "/commitments", label: "Find the agreement" },
    ],
  },
  {
    title: "Pool governance and threshold settlement",
    status: "Pool-specific",
    detail:
      "Contributor eligibility, ballots, threshold state, failure handling, revalidation, and release conditions are properties of a particular pool and remain on the pool-governance surfaces.",
    links: [
      { href: "/mpgf/governance", label: "Open pool governance" },
      { href: "/pools/radar", label: "Open threshold radar" },
    ],
  },
  {
    title: "Private values and matching constraints",
    status: "Account-specific",
    detail:
      "Private priorities and hard constraints stay in the profile and matching system. They are not converted into a public moral score or repeated in each agreement.",
    links: [
      { href: "/complete-profile", label: "Edit private profile" },
      { href: "/privacy", label: "Review privacy practices" },
    ],
  },
  {
    title: "Affected parties and organizational authority",
    status: "Fail closed",
    detail:
      "Safety concerns use the safety route. The current bilateral flow is individual-only and creates no authority to bind an organization, program, employer, or fund.",
    links: [
      { href: "/safety", label: "Open safety rules" },
      {
        href: "/team-and-governance#organizational-authority",
        label: "Review authority boundary",
      },
    ],
  },
] as const;

export default async function TradeControlsPage() {
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
            <p className="eyebrow">Compatibility route</p>
            <h1>Safeguards now live with the records they govern.</h1>
            <p className="hero-text">
              The former Control simulator has been retired. It could preview decisions but could
              not change a trade, payment, verification, settlement, or authority record. This page
              now directs existing links to the operational workflow for each safeguard.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/trades/new">
                Create a proposal
              </Link>
              <Link className="button button-secondary" href="/commitments">
                Review an agreement
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current posture</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>No detached authorization</strong>
                  <p>A compatibility page cannot approve, settle, verify, or bind anything.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Use persisted context</strong>
                  <p>Operational statuses are shown on the proposal, agreement, milestone, pool, profile, or authority record that supplies the facts.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="workflow-map-heading">
          <div className="section-head">
            <p className="eyebrow">Workflow map</p>
            <h2 id="workflow-map-heading">Where each safeguard belongs</h2>
            <p>
              These destinations use the actual participant, terms, evidence, reviewer, pool, and
              authority records. A status shown there is still not a general safety certificate.
            </p>
          </div>

          <div className="data-grid">
            {workflowGroups.map((group) => (
              <article className="panel data-card" key={group.title}>
                <p className="detail-kicker">{group.status}</p>
                <h3>{group.title}</h3>
                <p className="route-text">{group.detail}</p>
                <div className="hero-actions">
                  {group.links.map((link) => (
                    <Link
                      className="button button-secondary button-mini"
                      href={link.href}
                      key={link.href}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="trade-circles-heading">
          <div className="section-head">
            <p className="eyebrow">Trade Circles</p>
            <h2 id="trade-circles-heading">The preview was removed; no live mechanism was implied.</h2>
            <p>
              Moral Trade does not currently offer durable multi-party Trade Circles. The former
              three-person example did not persist participants, freeze a common version, collect
              consent, assign evidence and settlement obligations, or handle a failed leg. It will not
              appear in Create unless those end-to-end requirements are implemented and tested.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Not an active product structure</p>
            <p className="route-text">
              Existing bilateral trades, donation redirects, Co-Fund structures, and threshold pools
              retain their own supported workflows. None is relabeled as a Trade Circle.
            </p>
            <Link className="button button-secondary" href="/status">
              Review operational status
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
