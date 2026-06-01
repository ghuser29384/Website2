import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { formatMode } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import {
  THIRD_PARTY_EXTERNALITY_PROMPTS,
  getActionEvidenceSummary,
  getBaselineConfidence,
  getBaselineEvidenceSummary,
  getExternalityReviewSummary,
  getOfferReviewWorkflowCards,
  getScoreConfidence,
} from "@/lib/proposal-review";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface WorkedExamplePageProps {
  params: Promise<{ exampleId: string }>;
}

function findWorkedExample(exampleId: string) {
  return CANONICAL_WORKED_CASE_OFFERS.find((offer) => offer.id === exampleId) ?? null;
}

export function generateStaticParams() {
  return CANONICAL_WORKED_CASE_OFFERS.map((offer) => ({
    exampleId: offer.id,
  }));
}

export async function generateMetadata({ params }: WorkedExamplePageProps): Promise<Metadata> {
  const { exampleId } = await params;
  const offer = findWorkedExample(exampleId);

  if (!offer) {
    return {
      title: "Worked example not found",
    };
  }

  const title = `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`;
  const description = truncateDescription(
    `${offer.offerAction} Requested action: ${offer.requestAction}`,
    155,
  );
  const canonical = `/offers/examples/${offer.id}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: getAbsoluteUrl(canonical),
    },
  };
}

export default async function WorkedExamplePage({ params }: WorkedExamplePageProps) {
  const { exampleId } = await params;
  const offer = findWorkedExample(exampleId);
  const viewer = await getViewer();

  if (!offer) {
    notFound();
  }

  const canonicalPath = `/offers/examples/${offer.id}`;
  const title = `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`;
  const cloneTarget = `/offers/new?mode=${offer.mode}&example=${offer.id}`;
  const createHref = viewer
    ? cloneTarget
    : `/signup?returnTo=${encodeURIComponent(cloneTarget)}`;
  const actionEvidence = getActionEvidenceSummary(offer);
  const baselineConfidence = getBaselineConfidence(offer);
  const baselineEvidence = getBaselineEvidenceSummary(offer);
  const externalityReview = getExternalityReviewSummary(offer);
  const scoreConfidence = getScoreConfidence(offer);
  const reviewWorkflowCards = getOfferReviewWorkflowCards({
    ...offer,
    currentStatus: "Worked example; manual review required before reliance",
    offerImpact: offer.offerImpact,
    minCounterpartyImpact: offer.minCounterpartyImpact,
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: truncateDescription(`${offer.offerAction} Requested action: ${offer.requestAction}`, 180),
    url: getAbsoluteUrl(canonicalPath),
    mainEntityOfPage: getAbsoluteUrl(canonicalPath),
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Worked examples",
        item: getAbsoluteUrl("/offers"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: getAbsoluteUrl(canonicalPath),
      },
    ],
  };

  return (
    <div className="page-shell page-shell-focused">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
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
        <Breadcrumbs
          items={[
            { href: "/worked-examples", label: "Worked examples" },
            { href: canonicalPath, label: title },
          ]}
        />

        <div className="page-hero-content">
          <section className="hero-copy">
            <p className="eyebrow">Worked example</p>
            <h1>{title}</h1>
            <p className="hero-text">
              A non-live example showing the term structure, evidence rule, and review state a
              public Moral Trade listing should expose before anyone relies on it.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={createHref}>
                Create similar
              </Link>
              <Link className="button button-secondary" href="/worked-examples">
                Back to examples
              </Link>
              <Link className="button button-secondary" href="/what-is-moral-trade">
                Read primer
              </Link>
            </div>
          </section>

          <aside className="panel pilot-status-card">
            <IconMark name={offer.mode === "offset" ? "offset" : offer.mode === "payment" ? "payment" : "swap"} />
            <span>Status</span>
            <strong>Worked example; manual review required before reliance</strong>
            <p>
              This page is a canonical example record, not live liquidity or a matched agreement.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="terms-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Structured terms</p>
            <h2 id="terms-heading">What this example trades</h2>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Format</p>
              <h3>{formatMode(offer.mode)}</h3>
              <p className="route-text">
                {offer.offeredCause} for {offer.requestedCause}
              </p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Duration</p>
              <h3>{offer.duration}</h3>
              <p className="route-text">Exit conditions and reliance rules must be confirmed in a real agreement room.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Evidence method</p>
              <h3>{offer.verification}</h3>
              <p className="route-text">Evidence must be named before either side treats the trade as complete.</p>
            </article>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Offered action</p>
              <h3>{offer.offerAction}</h3>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Requested action</p>
              <h3>{offer.requestAction}</h3>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="review-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Review context</p>
            <h2 id="review-heading">Why this is still only an example</h2>
            <p>
              The worked record demonstrates scanability and terms, but a real listing still needs
              identity checks, evidence review, challenge windows, and an agreement room after a
              mutual introduction.
            </p>
          </div>
          <div className="review-workflow-grid">
            {reviewWorkflowCards.map((card) => (
              <article
                className={`panel review-workflow-card review-workflow-card-${card.status}`}
                key={card.key}
              >
                <div className="review-workflow-card-head">
                  <p className="detail-kicker">{card.key.replaceAll("_", " ")}</p>
                  <span className="review-workflow-status">{card.status.replaceAll("_", " ")}</span>
                </div>
                <h3>{card.label}</h3>
                <p className="route-text">{card.summary}</p>
                <div className="review-factor-list" aria-label={`${card.label} factor codes`}>
                  {card.factorCodes.map((factorCode) => (
                    <span key={factorCode}>{factorCode}</span>
                  ))}
                </div>
                <p className="review-next-step">
                  <strong>Next step:</strong> {card.nextStep}
                </p>
              </article>
            ))}
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Participant-stated importance</p>
              <h3>{offer.offerImpact}/10</h3>
              <p className="route-text">
                Not a platform moral ranking. This score reflects the participant&apos;s stated
                view, not Moral Trade&apos;s assessment of moral value.
              </p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Counterparty minimum acceptable importance</p>
              <h3>{offer.minCounterpartyImpact}/10</h3>
              <p className="route-text">A counterparty would still need to agree this threshold is adequate.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Confidence</p>
              <h3>{scoreConfidence}</h3>
              <p className="route-text">Confidence is about the stated score and review context, not objective moral value.</p>
            </article>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Action evidence</p>
              <h3>{offer.verification}</h3>
              <p className="route-text">{actionEvidence}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Baseline confidence</p>
              <h3>{baselineConfidence}</h3>
              <p className="route-text">{baselineEvidence}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Third-party externality review</p>
              <h3>Required before reliance</h3>
              <p className="route-text">{externalityReview}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Safety boundary</p>
              <h3>No escrow or custody claim</h3>
              <p className="route-text">Moral Trade records terms and evidence; it is not legal, tax, custody, or escrow service.</p>
            </article>
          </div>
          <div className="panel data-card data-card-wide">
            <h3>Externality questions</h3>
            <ul className="trust-check-list">
              {THIRD_PARTY_EXTERNALITY_PROMPTS.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
