import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const howItWorksDescription =
  "A plain-language walkthrough of Moral Trade: choose a real action, write the baseline, specify bounded terms, agree on proof, review risks, and accept only if both prefer the result.";

export const metadata: Metadata = {
  title: "How It Works",
  description: howItWorksDescription,
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Moral Trade works",
    description:
      "Choose a real action, write what would happen without the trade, specify bounded terms, agree on proof, review risks, and accept only if both prefer the result.",
    url: getAbsoluteUrl("/how-it-works"),
    type: "website",
  },
};

const steps = [
  {
    title: "Start with a real action",
    detail:
      "Use an existing counterparty, a planned donation, or a clearly stated public-good action rather than an abstract expression of interest.",
  },
  {
    title: "Write the no-trade baseline",
    detail:
      "State what each person would probably do without the trade, so threats and actions that would happen anyway do not get rewarded.",
  },
  {
    title: "Specify bounded terms",
    detail:
      "Name the actions, timing, privacy settings, exit conditions, evidence, and challenge window before anyone relies on the record.",
  },
  {
    title: "Review risks before acceptance",
    detail:
      "Check coercion, fraud, privacy, third-party externalities, conflicts, payment boundaries, and evidence scope before the parties accept.",
  },
  {
    title: "Accept only if both prefer the result",
    detail:
      "Each participant decides by their own values. Moral Trade does not impose a hidden moral ranking or collapse disagreement into consensus.",
  },
] as const;

export default async function HowItWorksPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const createHref = isAuthenticated ? "/create" : "/signup?returnTo=/create";
  const articleStructuredData = buildArticleJsonLd({
    headline: "How Moral Trade works",
    description: howItWorksDescription,
    path: "/how-it-works",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/how-it-works", label: "How it works" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">How it works</p>
            <h1>One reviewable commitment at a time.</h1>
            <p className="hero-text">
              Choose a real action. Record the default. Specify bounded terms. Agree on proof and
              privacy. Review risks. Then move only if each participant prefers the result.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/start">
                Choose a live action
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create a proposal
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Operating boundary</p>
            <p className="hero-followup">
              Moral Trade records terms, evidence expectations, privacy grants, and review states.
              The available donation route is provider-hosted; Moral Trade does not hold those funds,
              offer escrow, autonomously disclose private data, or promise legal enforceability.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="how-steps-heading">
          <div className="section-head">
            <p className="eyebrow">Process</p>
            <h2 id="how-steps-heading">The complete minimal workflow</h2>
          </div>

          <div className="data-grid">
            {steps.map((step, index) => (
              <article className="panel data-card" key={step.title}>
                <p className="detail-kicker">{String(index + 1).padStart(2, "0")}</p>
                <h3>{step.title}</h3>
                <p className="route-text">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="how-next-heading">
          <div className="section-head">
            <p className="eyebrow">Next action</p>
            <h2 id="how-next-heading">Choose the route that matches your use case</h2>
          </div>
          <div className="data-grid">
            <Link className="panel data-card" href="/donate">
              <h3>Make a financial contribution</h3>
              <p className="route-text">
                Choose a reviewed destination and complete payment with Every.org without Moral Trade
                taking custody.
              </p>
              <span className="inline-link">Open funding routes</span>
            </Link>
            <Link className="panel data-card" href={createHref}>
              <h3>Create a trade</h3>
              <p className="route-text">
                State the baseline, commitments, cap, duration, evidence, and exit rule.
              </p>
              <span className="inline-link">Create a bounded proposal</span>
            </Link>
            <Link className="panel data-card" href="/pools">
              <h3>Coordinate a public good</h3>
              <p className="route-text">
                Review production-backed pool inventory, thresholds, recipients, and payment state.
              </p>
              <span className="inline-link">Open conditional pools</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
