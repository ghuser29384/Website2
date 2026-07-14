import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Service Updates",
  description:
    "Public Moral Trade service updates, transparency notes, governance changes, and case studies.",
  alternates: {
    canonical: "/updates",
  },
  openGraph: {
    title: "Moral Trade service updates",
    description:
      "A public archive for product changes, governance updates, case studies, and transparency notes.",
    url: getAbsoluteUrl("/updates"),
    type: "website",
  },
};

const updates = [
  {
    date: "July 14, 2026",
    tag: "Launch readiness",
    title: "Network onboarding and activation records are backed",
    summary:
      "The service now stores guided onboarding, referral attribution, working-session requests, email follow-up state, and privacy-safe funnel events in backed database tables.",
    href: "/cohort",
  },
  {
    date: "July 14, 2026",
    tag: "Information architecture",
    title: "Primary navigation and landing routes simplified",
    summary:
      "The public experience now centers on how Moral Trade works, complete examples, live records, moral public goods, research, and a direct join path.",
    href: "/",
  },
  {
    date: "May 31, 2026",
    tag: "Transparency",
    title: "Aggregate transparency report route",
    summary:
      "The service publishes thresholded counts for review outcomes, disclosure grants, reports, appeals, and operator timing without exposing private case files.",
    href: "/transparency",
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
  "First complete case study: one low-risk pledge swap or donation offset from draft through review.",
  "Governance roster update: named operators, advisors, reviewers, decision rights, and conflicts.",
  "Activation report: account creation, onboarding completion, first action, and serious invitation rates.",
] as const;

export default async function UpdatesPage() {
  const viewer = await getViewer();

  const updatesStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade service updates",
    url: getAbsoluteUrl("/updates"),
    description: "Public product changes, governance updates, case studies, and transparency notes.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(updatesStructuredData) }}
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
            <p className="eyebrow">Service updates</p>
            <h1>A public archive of product and governance changes.</h1>
            <p className="hero-text">
              Trust requires visible change control. This archive separates shipped capabilities,
              operating-rule changes, reviewed outcomes, and planned work.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/status">
                Check service status
              </Link>
              <a className="button button-secondary" href="mailto:support@moraltrade.org?subject=Service%20updates">
                Subscribe by email
              </a>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Archive rules</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Publish shipped changes</strong>
                  <p>Record material product, data, privacy, safety, and governance changes.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Separate plans from records</strong>
                  <p>Planned work, active experiments, and reviewed outcomes must remain distinct.</p>
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
            <h2 id="updates-archive-heading">Recent service notes</h2>
            <p>
              Entries are intentionally concise and link to the affected surface so claims can be
              inspected directly.
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
            <h2 id="upcoming-updates-heading">Evidence that would materially improve trust</h2>
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
