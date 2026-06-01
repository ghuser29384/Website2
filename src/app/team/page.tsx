import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Team and Governance",
  description:
    "Current public accountability surface for Moral Trade operators, reviewer responsibilities, advisor roles, conflicts, and publication commitments.",
  alternates: {
    canonical: "/team-and-governance",
  },
  openGraph: {
    title: "Moral Trade team and governance",
    description:
      "See what is public about Moral Trade's pilot operators, governance responsibilities, reviewer roles, and publication commitments.",
    url: getAbsoluteUrl("/team-and-governance"),
    type: "website",
  },
};

const governanceRows = [
  {
    title: "Pilot operators",
    status: "Public route active",
    detail:
      "The current public operator route is support@moraltrade.org for safety, evidence, partnership, and cohort questions.",
  },
  {
    title: "Reviewer responsibilities",
    status: "Rulebook public",
    detail:
      "Reviewer roles, conflict rules, appeal paths, and evidence states are published in the validation rulebook.",
  },
  {
    title: "Named advisors and reviewers",
    status: "Not public yet",
    detail:
      "No named advisor or external reviewer roster should be implied until those roles are formal, consented, and listed here.",
  },
] as const;

const publicationCommitments = [
  "List named operators, advisors, and reviewers before marketing mature reviewer governance.",
  "Publish what each role can approve, what it cannot approve, and how conflicts are handled.",
  "Keep the public member directory separate from team and governance accountability.",
  "Use transparency reports for reviewed outcomes instead of generic endorsements.",
] as const;

export default async function TeamPage() {
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
            <p className="eyebrow">Team and governance</p>
            <h1>Who is publicly accountable for the pilot.</h1>
            <p className="hero-text">
              Moral Trade should not ask for trust through abstraction alone. This page separates
              operator routes, reviewer responsibilities, and the still-missing named governance
              roster.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="mailto:support@moraltrade.org?subject=Governance%20question">
                Contact operators
              </a>
              <Link className="button button-secondary" href="/validation">
                Review rulebook
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Trust posture</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Do not invent social proof</strong>
                  <p>Unpublished advisors, reviewers, or endorsements should not be implied.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Name roles before reliance</strong>
                  <p>Accountability improves when people can see who owns which decision.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="governance-now-heading">
          <div className="section-head">
            <p className="eyebrow">Current status</p>
            <h2 id="governance-now-heading">What is public now</h2>
            <p>
              This is intentionally candid: it gives visitors a trust surface today without
              pretending the full governance roster already exists.
            </p>
          </div>

          <div className="data-grid">
            {governanceRows.map((row) => (
              <article className="panel data-card" key={row.title}>
                <p className="detail-kicker">{row.status}</p>
                <h3>{row.title}</h3>
                <p className="route-text">{row.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="governance-commitments-heading">
          <div className="section-head">
            <p className="eyebrow">Publication commitments</p>
            <h2 id="governance-commitments-heading">What this page should publish next</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {publicationCommitments.map((commitment) => (
                <li key={commitment}>{commitment}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
