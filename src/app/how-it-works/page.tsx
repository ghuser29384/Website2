import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const howItWorksDescription =
  "A plain-language walkthrough of Moral Trade: start with one low-risk example, write the baseline, agree on proof, review risks, and decide whether to continue.";

export const metadata: Metadata = {
  title: "How It Works",
  description: howItWorksDescription,
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Moral Trade works",
    description:
      "Start with one low-risk example, write what would happen without the trade, agree on proof, review risks, and decide whether to continue.",
    url: getAbsoluteUrl("/how-it-works"),
    type: "website",
  },
};

const steps = [
  {
    title: "Start with one low-risk example",
    detail:
      "Use a worked example or cohort-supported draft before treating Moral Trade as a live marketplace.",
  },
  {
    title: "Write the no-trade baseline",
    detail:
      "Say what each person would probably do without the trade, so threats and actions that would happen anyway do not get rewarded.",
  },
  {
    title: "Agree on proof",
    detail:
      "Name the receipt, public record, dated statement, log, or attestation that a reviewer could inspect later.",
  },
  {
    title: "Review risks before reliance",
    detail:
      "Check coercion, fraud, privacy, third-party externalities, and conflicts before anyone relies on a claim.",
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
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
            <p className="eyebrow">How it works</p>
            <h1>One reviewable commitment at a time.</h1>
            <p className="hero-text">
              Start with one low-risk example. Write what would happen without the trade. Agree
              on proof. Review risks. Then decide whether to continue.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                See a worked example
              </Link>
              <Link className="button button-secondary" href="/validation">
                Read evidence rules
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current boundary</p>
            <p className="hero-followup">
              The pilot records terms, evidence expectations, and review states. It does not hold
              funds, automate outreach, or promise legal enforceability.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="how-steps-heading">
          <div className="section-head">
            <p className="eyebrow">Process</p>
            <h2 id="how-steps-heading">The simplest version</h2>
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
            <h2 id="how-next-heading">Choose a low-friction first path</h2>
          </div>
          <div className="data-grid">
            <Link className="panel data-card" href="/worked-examples">
              <h3>Learn from an example</h3>
              <p className="route-text">See complete terms without mistaking examples for live demand.</p>
              <span className="inline-link">Open worked examples</span>
            </Link>
            <Link className="panel data-card" href="/cohort">
              <h3>Join the founding cohort</h3>
              <p className="route-text">Start with a small, reviewed action and one serious invite.</p>
              <span className="inline-link">Read the cohort guide</span>
            </Link>
            <Link className="panel data-card" href="/donate">
              <h3>Donate through a route</h3>
              <p className="route-text">Use Every.org first; MPGF evidence can import by webhook or reviewed fallback.</p>
              <span className="inline-link">Open donation routes</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
