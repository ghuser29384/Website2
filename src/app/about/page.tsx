import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Moral Trade is, what the service supports, what it does not claim, who is accountable, and what will be published next.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Moral Trade",
    description:
      "A concise overview of Moral Trade's operating model, service boundaries, accountability, and publication commitments.",
    url: getAbsoluteUrl("/about"),
    type: "website",
  },
};

const aboutCards = [
  {
    title: "What exists today",
    detail:
      "Accounts, guided onboarding, worked examples, live offer records, private matching, evidence and review workflows, donation routes, and moral public-good tools.",
  },
  {
    title: "What the service does not do",
    detail:
      "Moral Trade does not hold funds, provide escrow, guarantee legal enforceability, autonomously disclose private data, or claim that marketplace liquidity already exists.",
  },
  {
    title: "What we publish",
    detail:
      "Operating boundaries, governance roles, public health contracts, transparency reports, service updates, and backed activity metrics rather than promotional estimates.",
  },
] as const;

export default async function AboutPage() {
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
            <p className="eyebrow">About</p>
            <h1>A service for cooperation across moral disagreement.</h1>
            <p className="hero-text">
              Moral Trade helps people structure voluntary exchanges and shared public-good
              commitments without requiring agreement on a common moral theory. The operating
              model separates baselines, terms, evidence, privacy, review, and recourse.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/projects">
                Browse projects
              </Link>
              <Link className="button button-secondary" href="/team-and-governance">
                Review accountability
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">One sentence</p>
            <p className="hero-followup">
              Moral Trade turns one concrete disagreement into bounded, reviewable terms that each
              participant can evaluate by their own lights.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="about-overview-heading">
          <div className="section-head">
            <p className="eyebrow">Service clarity</p>
            <h2 id="about-overview-heading">A short operating overview</h2>
          </div>

          <div className="data-grid">
            {aboutCards.map((card) => (
              <article className="panel data-card" key={card.title}>
                <h3>{card.title}</h3>
                <p className="route-text">{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="about-next-heading">
          <div className="section-head">
            <p className="eyebrow">Start here</p>
            <h2 id="about-next-heading">Choose the page that answers your first question</h2>
          </div>
          <div className="data-grid">
            <Link className="panel data-card" href="/projects">
              <h3>What can I use?</h3>
              <p className="route-text">See trade workflows, worked examples, moral public goods, and supported actions.</p>
              <span className="inline-link">Open projects</span>
            </Link>
            <Link className="panel data-card" href="/team-and-governance">
              <h3>Who is accountable?</h3>
              <p className="route-text">Review operator routes, reviewer responsibilities, decision rights, and governance gaps.</p>
              <span className="inline-link">Open team and governance</span>
            </Link>
            <Link className="panel data-card" href="/pilot-updates">
              <h3>What changed recently?</h3>
              <p className="route-text">Read service changes, governance updates, and publication notes.</p>
              <span className="inline-link">Open updates</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
