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
    "What Moral Trade is, what exists today, what does not exist yet, who is publicly accountable, and what the pilot will publish next.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Moral Trade",
    description:
      "A concise overview of Moral Trade's pilot status, boundaries, operators, and next publication commitments.",
    url: getAbsoluteUrl("/about"),
    type: "website",
  },
};

const aboutCards = [
  {
    title: "What exists today",
    detail:
      "A public primer, worked examples, donation routes, validation standards, safety rules, and the Public Goods Fund pilot.",
  },
  {
    title: "What does not exist yet",
    detail:
      "A liquid marketplace, escrow, custody, automated outreach, legal enforceability, mature reviewer governance, or broad social proof.",
  },
  {
    title: "What we will publish next",
    detail:
      "Named governance roles, transparency reports, pilot case studies, and measurement of where visitors drop out or get confused.",
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
            <h1>What exists today, and what does not.</h1>
            <p className="hero-text">
              Moral Trade is a pilot for small, voluntary, evidence-reviewed commitments across
              moral disagreement. The current job is to make the mechanism legible, trustworthy,
              and measurable before claiming marketplace maturity.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/projects">
                Browse projects
              </Link>
              <Link className="button button-secondary" href="/team-and-governance">
                Meet the operators
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">One sentence</p>
            <p className="hero-followup">
              Moral Trade helps serious participants test one reviewable commitment at a time,
              with explicit baselines, evidence rules, and no custody or escrow claim.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="about-overview-heading">
          <div className="section-head">
            <p className="eyebrow">Pilot clarity</p>
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
              <h3>What are you doing?</h3>
              <p className="route-text">See worked examples, the Public Goods Fund, and upcoming pilot surfaces.</p>
              <span className="inline-link">Open Projects</span>
            </Link>
            <Link className="panel data-card" href="/team-and-governance">
              <h3>Who runs this?</h3>
              <p className="route-text">Review current operator routes, reviewer responsibilities, and governance gaps.</p>
              <span className="inline-link">Open Team and Governance</span>
            </Link>
            <Link className="panel data-card" href="/pilot-updates">
              <h3>What changed recently?</h3>
              <p className="route-text">Read pilot logs, governance updates, and planned transparency reports.</p>
              <span className="inline-link">Open Updates</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
