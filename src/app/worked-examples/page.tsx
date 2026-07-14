import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import {
  getActionEvidenceSummary,
  getBaselineConfidence,
  getExternalityReviewSummary,
} from "@/lib/proposal-review";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { buildBreadcrumbJsonLd, getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const workedExamplesDescription =
  "Public Moral Trade worked examples with structured actions, reciprocal requests, baselines, evidence rules, and manual-review notes.";

export const metadata: Metadata = {
  title: "Worked examples",
  description: workedExamplesDescription,
  alternates: {
    canonical: "/worked-examples",
  },
  openGraph: {
    title: "Moral Trade worked examples",
    description: workedExamplesDescription,
    url: getAbsoluteUrl("/worked-examples"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moral Trade worked examples",
    description: workedExamplesDescription,
  },
};

export default async function WorkedExamplesPage() {
  const viewer = await getViewer();
  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Moral Trade worked examples",
    url: getAbsoluteUrl("/worked-examples"),
    description: workedExamplesDescription,
    itemListElement: CANONICAL_WORKED_CASE_OFFERS.map((offer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
      url: getAbsoluteUrl(`/offers/examples/${offer.id}`),
      description: truncateDescription(
        `${offer.offerAction} Requested in return: ${offer.requestAction}`,
      ),
    })),
  };
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/worked-examples", label: "Worked examples" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListStructuredData),
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
        <Breadcrumbs items={[{ href: "/worked-examples", label: "Worked examples" }]} />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Worked examples</p>
            <h1>Public examples for reviewable moral trades.</h1>
            <p className="hero-text">
              These records show how pledge swaps, donation offsets, and deferred paid-action
              examples should state actions, baselines, evidence, and review boundaries. They are
              not live marketplace demand.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Browse all offers
              </Link>
              <Link className="button button-secondary" href="/validation">
                Read validation rules
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Indexing boundary</p>
            <p className="hero-followup">
              Worked examples are crawlable public learning records. They should not be cited as
              real offers, guaranteed payments, legal commitments, or completed agreements.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="worked-example-list-heading">
          <div className="section-head">
            <p className="eyebrow">Canonical examples</p>
            <h2 id="worked-example-list-heading">Examples with explicit review fields</h2>
            <p>
              Each example has a canonical detail page for citation and retrieval. Clone one only
              after editing the terms, baseline, evidence, and exit rules for the real situation.
            </p>
          </div>

          <div className="data-grid">
            {CANONICAL_WORKED_CASE_OFFERS.map((offer) => (
              <article className="panel data-card" key={offer.id}>
                <div className="listing-status-stack">
                  <StatusBadge tone="secondary">Worked example</StatusBadge>
                  <StatusBadge tone={offer.mode === "payment" ? "warning" : "secondary"}>
                    {formatMode(offer.mode)}
                  </StatusBadge>
                </div>
                <p className="detail-kicker">{offer.alias}</p>
                <h3>
                  <Link href={`/offers/examples/${offer.id}`}>
                    {offer.offeredCause} for {offer.requestedCause}
                  </Link>
                </h3>
                <p className="route-text">{offer.notes}</p>
                <dl className="listing-terms">
                  <div>
                    <dt>Offered action</dt>
                    <dd>{offer.offerAction}</dd>
                  </div>
                  <div>
                    <dt>Requested action</dt>
                    <dd>{offer.requestAction}</dd>
                  </div>
                </dl>
                <div className="listing-review-fields" aria-label="Review fields">
                  <div>
                    <strong>Action evidence</strong>
                    <span>{getActionEvidenceSummary(offer)}</span>
                  </div>
                  <div>
                    <strong>Baseline confidence</strong>
                    <span>{getBaselineConfidence(offer)}</span>
                  </div>
                  <div>
                    <strong>Externality review</strong>
                    <span>{getExternalityReviewSummary(offer)}</span>
                  </div>
                </div>
                <Link className="button button-primary button-mini" href={`/offers/examples/${offer.id}`}>
                  Inspect example
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
