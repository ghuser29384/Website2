import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CredibilityPassport } from "@/components/credibility/credibility-passport";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getOfferById, getViewer } from "@/lib/app-data";
import { estimateDealCredibility, inferDealRiskFromOffer } from "@/lib/credibility";
import { getPublicCredibilitySummary } from "@/lib/credibility-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface OfferCredibilityPageProps {
  params: Promise<{ offerId: string }>;
}

function percentage(value: number | null) {
  return value === null ? "Not published" : `${Math.round(value * 100)}%`;
}

function assuranceLabel(value: "standard" | "enhanced" | "staged" | "manual_review") {
  if (value === "manual_review") {
    return "Manual review required";
  }
  if (value === "staged") {
    return "Staged performance";
  }
  if (value === "enhanced") {
    return "Enhanced verification";
  }
  return "Standard safeguards";
}

export async function generateMetadata({ params }: OfferCredibilityPageProps): Promise<Metadata> {
  const { offerId } = await params;
  const offer = await getOfferById(offerId);

  if (!offer) {
    return { title: "Offer credibility" };
  }

  return {
    title: `Credibility: ${offer.offered_cause} for ${offer.requested_cause}`,
    description: truncateDescription(
      `Contextual reliability evidence and safeguards for ${offer.offered_cause} for ${offer.requested_cause}.`,
    ),
    alternates: {
      canonical: `/offers/${offerId}/credibility`,
    },
    openGraph: {
      title: `Contextual credibility for ${offer.offered_cause} for ${offer.requested_cause}`,
      description:
        "Evidence-weighted participant reliability, explicit uncertainty, and transaction-specific safeguards.",
      url: getAbsoluteUrl(`/offers/${offerId}/credibility`),
      type: "article",
    },
  };
}

export default async function OfferCredibilityPage({ params }: OfferCredibilityPageProps) {
  const { offerId } = await params;
  const [offer, viewer] = await Promise.all([getOfferById(offerId), getViewer()]);

  if (!offer) {
    notFound();
  }

  const riskInputs = inferDealRiskFromOffer(offer);
  const credibility = await getPublicCredibilitySummary(offer.owner_id, {
    role: riskInputs.role,
    category: riskInputs.category,
  });
  const estimate = estimateDealCredibility(credibility, riskInputs);
  const ownerName = offer.ownerProfile?.resolvedName ?? offer.owner_alias;

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
            <p className="eyebrow">Deal-specific assurance</p>
            <h1>{ownerName}: contextual credibility for this offer.</h1>
            <div className="hero-actions">
              <Link className="button button-primary" href={`/offers/${offer.id}`}>
                Return to offer
              </Link>
              <Link className="button button-secondary" href="/credibility">
                Read calculation method
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current recommendation</p>
            <h2>{assuranceLabel(estimate.assuranceLevel)}</h2>
            <div className="tag-row">
              <span className="source-pill">{credibility.level}</span>
              <span className="source-pill">{credibility.confidence} confidence</span>
              <span className="source-pill">
                Provisional risk index {Math.round(estimate.riskIndex * 100)}/100
              </span>
            </div>
            <p className="route-text">
              Provisional completion estimate: {percentage(estimate.estimatedProbability)}. Conservative
              estimate: {percentage(estimate.conservativeProbability)}.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Relevant record</p>
            <h2>Credibility passport for this role and trade class</h2>
            <p>
              Context: {riskInputs.role?.replaceAll("_", " ")} in a{" "}
              {riskInputs.category?.replaceAll("_", " ")} commitment.
            </p>
          </div>
          <CredibilityPassport summary={credibility} heading={`${ownerName}'s contextual record`} />
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Transaction factors</p>
            <h2>Why the safeguard recommendation changes</h2>
          </div>
          <div className="data-grid">
            {estimate.factors.map((factor) => (
              <article className="panel data-card" key={factor.label}>
                <div className="protocol-workflow-card-head">
                  <h3>{factor.label}</h3>
                  <span
                    className={factor.direction === "protective" ? "impact-pill" : "source-pill"}
                  >
                    {factor.value}
                  </span>
                </div>
                <p className="route-text">
                  {factor.direction === "protective"
                      ? "Protective"
                    : factor.direction === "risk"
                      ? "Additional safeguards recommended"
                      : "No material adjustment"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Recommended safeguards</p>
            <h2>Protection for this transaction</h2>
            <p>
              Moral Trade does not itself provide escrow, custody, legal enforcement, or payment
              protection.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <ol className="compact-list">
              {estimate.safeguards.map((safeguard) => (
                <li key={safeguard}>{safeguard}</li>
              ))}
            </ol>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
