import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const howItWorksDescription =
  "A plain-language walkthrough of Moral Trade: write the baseline, specify bounded terms, agree on proof, review risks, and accept only if both prefer the result.";

export const metadata: Metadata = {
  title: "How It Works",
  description: howItWorksDescription,
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Moral Trade works",
    description:
      "Write what would happen without the trade, specify bounded terms, agree on proof, review risks, and accept only if both prefer the result.",
    url: getAbsoluteUrl("/how-it-works"),
    type: "website",
  },
};

const steps = [
  {
    title: "Start with a concrete use case",
    detail:
      "Use a worked example, an existing counterparty, or a clearly stated public-good action rather than an abstract expression of interest.",
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
      "Check coercion, fraud, privacy, third-party externalities, conflicts, and evidence scope before the parties accept.",
  },
  {
    title: "Accept only if both prefer the result",
    detail:
      "Each participant decides by their own values. Moral Trade does not impose a hidden moral ranking or collapse disagreement into consensus.",
  },
] as const;

export default async function HowItWorksPage() {
  const viewer = await getViewer();
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
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">How it works</p>
            <h1>One reviewable commitment at a time.</h1>
            <p className="hero-text">
              Record the default. Specify bounded terms. Agree on proof and privacy. Review risks.
              Then move only if each participant prefers the result.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                See a worked example
              </Link>
              <Link className="button button-secondary" href="/signup?returnTo=/onboarding">
                Join the network
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Operating boundary</p>
            <p className="hero-followup">
              Moral Trade records terms, evidence expectations, privacy grants, and review states.
              It does not hold funds, autonomously disclose private data, or promise legal enforceability.
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
            <Link className="panel data-card" href="/worked-examples">
              <h3>Inspect complete terms</h3>
              <p className="route-text">See how baselines, actions, evidence, and exit rules fit together.</p>
              <span className="inline-link">Open worked examples</span>
            </Link>
            <Link className="panel data-card" href="/cohort">
              <h3>Join the network</h3>
              <p className="route-text">Choose one first action and bring a serious use case or counterparty.</p>
              <span className="inline-link">Open network onboarding</span>
            </Link>
            <Link className="panel data-card" href="/moral-goods-group-buying">
              <h3>Coordinate a public good</h3>
              <p className="route-text">Use thresholded commitments, external evidence, and explicit participation rules.</p>
              <span className="inline-link">Open public-good tools</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
