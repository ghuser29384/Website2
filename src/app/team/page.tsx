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
    "Public accountability for Moral Trade operators, reviewer responsibilities, advisor roles, conflicts, decision rights, and publication commitments.",
  alternates: {
    canonical: "/team-and-governance",
  },
  openGraph: {
    title: "Moral Trade team and governance",
    description:
      "See what is public about Moral Trade's operators, governance responsibilities, reviewer roles, conflicts, and publication commitments.",
    url: getAbsoluteUrl("/team-and-governance"),
    type: "website",
  },
};

const governanceRows = [
  {
    title: "Service operators",
    status: "Public route active",
    detail:
      "The public operator route is support@moraltrade.org for safety, evidence, partnership, account, and network questions.",
  },
  {
    title: "Reviewer responsibilities",
    status: "Rulebook public",
    detail:
      "Reviewer roles, conflict rules, appeal paths, evidence states, and externality review are published in the validation rulebook.",
  },
  {
    title: "Named external advisors and reviewers",
    status: "Not represented as active",
    detail:
      "No named external advisor or reviewer roster is implied until those roles are formal, consented, scoped, and listed here.",
  },
] as const;

const publicationCommitments = [
  "List named operators, advisors, and reviewers as soon as those roles are formal and consented.",
  "Publish what each role can approve, what it cannot approve, and how conflicts are handled.",
  "Keep the public member directory separate from operator and governance accountability.",
  "Use backed transparency reports for reviewed outcomes instead of generic endorsements.",
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
            <h1>Who is accountable for Moral Trade.</h1>
            <p className="hero-text">
              Moral Trade should not ask for trust through abstraction alone. This page separates
              operator routes, reviewer responsibilities, decision rights, and roles that are not yet
              represented as active.
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
                  <p>Unpublished advisors, reviewers, affiliations, or endorsements are not implied.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Name decision ownership</strong>
                  <p>People should be able to see who owns a review, correction, disclosure, or incident decision.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="governance-now-heading">
          <div className="section-head">
            <p className="eyebrow">Current accountability</p>
            <h2 id="governance-now-heading">What is public now</h2>
            <p>
              This surface states the current operating reality without implying roles, endorsements,
              or review capacity that have not been formalized.
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
            <h2 id="governance-commitments-heading">What this page will add next</h2>
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
