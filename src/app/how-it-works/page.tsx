import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const howItWorksDescription =
  "Create a bounded Moral Trade agreement: state the no-deal default, specify commitments and limits, agree on evidence, review risks, and accept only if both parties prefer the result.";

export const metadata: Metadata = {
  title: "How It Works",
  description: howItWorksDescription,
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Moral Trade works",
    description: howItWorksDescription,
    url: getAbsoluteUrl("/how-it-works"),
    type: "website",
  },
};

const steps = [
  {
    title: "State the no-deal default",
    detail:
      "Record what each person would probably do without an agreement, so threats and actions that would happen anyway do not get rewarded.",
  },
  {
    title: "Specify bounded commitments",
    detail:
      "Name each action, the maximum exposure, timing, privacy settings, cancellation terms, and exit conditions.",
  },
  {
    title: "Agree on evidence",
    detail:
      "Set the proof requirement, reviewer, challenge window, and the outcome when evidence is missing or disputed.",
  },
  {
    title: "Review risks",
    detail:
      "Check coercion, fraud, identity abuse, privacy, third-party externalities, conflicts, and payment boundaries before acceptance.",
  },
  {
    title: "Accept only on mutual gain",
    detail:
      "Each participant decides by their own priorities. Moral Trade does not impose a shared moral ranking.",
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
            <h1>One reviewable agreement at a time.</h1>
            <p className="hero-text">
              State the default, write bounded commitments, agree on evidence, review risks, and
              accept only when each party prefers the result.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={createHref}>
                Create an agreement
              </Link>
              <Link className="button button-secondary" href="/offers">
                Browse active offers
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="hero-followup">
              Moral Trade records terms, evidence expectations, privacy grants, and review states. It
              does not hold donations, offer escrow, autonomously disclose private data, or promise
              legal enforceability.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="agreement-steps-heading">
          <h2 className="sr-only" id="agreement-steps-heading">Agreement steps</h2>
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

        <section className="section section-subtle" aria-label="Available actions">
          <div className="data-grid">
            <Link className="panel data-card" href={createHref}>
              <h3>Create an agreement</h3>
              <p className="route-text">Write the default, commitments, cap, evidence, and exit rule.</p>
              <span className="inline-link">Create</span>
            </Link>
            <Link className="panel data-card" href="/donate">
              <h3>Fund a public good</h3>
              <p className="route-text">
                Choose a reviewed destination and complete payment with Every.org.
              </p>
              <span className="inline-link">Choose a funding route</span>
            </Link>
            <Link className="panel data-card" href="/pools">
              <h3>Join a conditional pool</h3>
              <p className="route-text">Review the threshold, recipient, maximum exposure, and state.</p>
              <span className="inline-link">Review pools</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
