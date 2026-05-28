import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pilot Updates",
  description:
    "Public Moral Trade pilot updates, transparency notes, governance logs, and case-study placeholders.",
  alternates: {
    canonical: "/updates",
  },
  openGraph: {
    title: "Moral Trade pilot updates",
    description:
      "A public archive for pilot logs, governance updates, case studies, and transparency notes.",
    url: getAbsoluteUrl("/updates"),
    type: "website",
  },
};

const updates = [
  {
    date: "May 27, 2026",
    tag: "Pilot log",
    title: "Audit response: make the pilot easier to understand",
    summary:
      "The public site now foregrounds a plain-English first action, a Projects hub, donation handoff clarity, and visible trust/governance routes.",
    href: "/projects",
  },
  {
    date: "May 26, 2026",
    tag: "Public goods",
    title: "Public Goods Fund surfaces gathered for inspection",
    summary:
      "Candidate pools, contribution evidence, real-money terms, and technical notes are grouped so reviewers can inspect the pilot without treating it as custody or escrow.",
    href: "/mpgf",
  },
  {
    date: "May 19, 2026",
    tag: "Review rulebook",
    title: "Validation roles, evidence states, and challenge windows",
    summary:
      "The validation rulebook keeps reviewer scope, conflict handling, appeal paths, and quality metrics public before reliance grows.",
    href: "/validation",
  },
] as const;

const upcomingReports = [
  "First transparency report: review outcomes, rejected proposal classes, and unresolved objections.",
  "First case study: one low-risk pledge swap or donation offset from draft through review.",
  "Governance roster update: named operators, advisors, reviewers, and conflicts once roles are formal.",
] as const;

export default async function UpdatesPage() {
  const viewer = await getViewer();

  const updatesStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade pilot updates",
    url: getAbsoluteUrl("/updates"),
    description: "Public pilot logs, governance updates, case studies, and transparency notes.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: updates.map((update, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: update.title,
        url: getAbsoluteUrl(update.href),
        description: update.summary,
      })),
    },
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(updatesStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Pilot updates</p>
            <h1>A public archive for what changed and what was learned.</h1>
            <p className="hero-text">
              Moral Trade is early, so trust depends on visible iteration. This archive collects
              pilot logs, governance updates, case studies, and short transparency notes.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/status">
                Check pilot status
              </Link>
              <a className="button button-secondary" href="mailto:support@moraltrade.org?subject=Pilot%20updates">
                Subscribe by email
              </a>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Archive promise</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Short notes are enough</strong>
                  <p>Monthly logs should be public even before there are polished case studies.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>No fake proof</strong>
                  <p>Updates should label plans, active pilots, and reviewed outcomes separately.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="updates-archive-heading">
          <div className="section-head">
            <p className="eyebrow">Archive</p>
            <h2 id="updates-archive-heading">Recent pilot notes</h2>
            <p>
              These are intentionally concise. The point is to make progress and uncertainty
              visible before the pilot has mature social proof.
            </p>
          </div>

          <div className="updates-list">
            {updates.map((update) => (
              <article className="panel data-card update-card" key={update.title}>
                <div className="update-card-meta">
                  <span>{update.date}</span>
                  <span className="badge">{update.tag}</span>
                </div>
                <h3>{update.title}</h3>
                <p className="route-text">{update.summary}</p>
                <Link className="text-button" href={update.href}>
                  Read the related surface
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="upcoming-updates-heading">
          <div className="section-head">
            <p className="eyebrow">Next to publish</p>
            <h2 id="upcoming-updates-heading">Transparency work that would build trust</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {upcomingReports.map((report) => (
                <li key={report}>{report}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
