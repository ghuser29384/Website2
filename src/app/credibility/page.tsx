import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getActiveCredibilityModel } from "@/lib/credibility-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contextual Credibility",
  description:
    "How Moral Trade estimates context-specific transaction reliability, displays uncertainty, and chooses safeguards without ranking moral views.",
  alternates: {
    canonical: "/credibility",
  },
  openGraph: {
    title: "Contextual credibility at Moral Trade",
    description:
      "A transparent, evidence-weighted estimate of whether a participant will complete a particular kind of commitment.",
    url: getAbsoluteUrl("/credibility"),
    type: "website",
  },
};

const dimensions = [
  {
    key: "fulfilment" as const,
    title: "Fulfilment",
    detail: "Was the agreed commitment completed under the agreed deadline or amendment?",
  },
  {
    key: "evidence_integrity" as const,
    title: "Evidence integrity",
    detail: "Was required evidence authentic, sufficient, and consistent with the registered terms?",
  },
  {
    key: "settlement" as const,
    title: "Settlement compliance",
    detail: "Were payments, authorizations, or other settlement obligations completed correctly?",
  },
  {
    key: "dispute_conduct" as const,
    title: "Dispute conduct",
    detail: "Did the participant cooperate with review and comply with the final resolution?",
  },
  {
    key: "responsiveness" as const,
    title: "Responsiveness",
    detail: "Did the participant meet objective, agreed response requirements?",
  },
];

export default async function CredibilityPage() {
  const [viewer, model] = await Promise.all([getViewer(), getActiveCredibilityModel()]);

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
            <p className="eyebrow">Contextual credibility</p>
            <h1>Reliability for a specific commitment, not a score of the person.</h1>
            <p className="hero-text">
              Moral Trade estimates how likely a participant is to complete a particular kind of
              commitment with valid evidence and compliant settlement. It does not rank moral
              views, causes, popularity, wealth, or perceived virtue.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/people">
                Browse public records
              </Link>
              <Link className="button button-secondary" href="/trust">
                Review trust boundaries
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Published model</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Versioned</strong>
                  <p>{model.version}; parameters remain reproducible after future revisions.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Conservative</strong>
                  <p>
                    Public scores use the lower {Math.round(model.lowerQuantile * 100)}th percentile,
                    not the optimistic posterior mean.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Evidence-gated</strong>
                  <p>
                    Fewer than {model.minimumEffectiveObservations} effective observations displays
                    “Unproven,” not a precise number.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Prediction target</p>
            <h2>What the estimate means</h2>
            <p>
              For participant <em>u</em> and proposed trade <em>t</em>, the model estimates the
              probability of acceptable completion given the participant&apos;s role, trade class,
              stake, duration, complexity, verification method, and assurance structure.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="route-text">
              <strong>Acceptable completion</strong> means the material obligations were completed
              under the registered terms or a mutually agreed amendment, required evidence passed
              review, settlement obligations were met, and no attributable unresolved dispute or
              material deception remains.
            </p>
            <p className="route-text">
              Additionality and the no-trade baseline remain separate deal properties. A reliable
              participant can still offer a non-additional action, and a genuinely additional offer
              can come from a new participant with limited history.
            </p>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Bayesian calculation</p>
            <h2>Evidence accumulates with uncertainty preserved</h2>
            <p>
              Model v1 uses a Beta prior with {model.priorSuccess} virtual successes and {model.priorFailure}{" "}
              virtual failure. Verified outcomes update that prior after evidence, recency,
              independence, context, and capped stake weights are applied.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Posterior</h3>
              <p className="route-text">
                α = {model.priorSuccess} + weighted successes; β = {model.priorFailure} + weighted
                failures. The posterior mean is α ÷ (α + β).
              </p>
            </article>
            <article className="panel data-card">
              <h3>Public score</h3>
              <p className="route-text">
                100 × the posterior&apos;s lower {Math.round(model.lowerQuantile * 100)}th percentile.
                Sparse records therefore remain visibly uncertain.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Context transfer</h3>
              <p className="route-text">
                Exact role and category evidence receives full weight. Same-role evidence receives
                {" "}{Math.round(model.contextWeights.sameRole * 100)}%, same-category evidence{" "}
                {Math.round(model.contextWeights.sameCategory * 100)}%, and unrelated history only{" "}
                {Math.round(model.contextWeights.unrelated * 100)}%.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Dimensions</p>
            <h2>Objective performance, separated by function</h2>
            <p>
              Free-form ratings can provide context, but they do not directly determine the core
              estimate. Platform or independently reviewed transaction events carry the score.
            </p>
          </div>

          <div className="data-grid">
            {dimensions.map((dimension) => (
              <article className="panel data-card" key={dimension.key}>
                <div className="protocol-workflow-card-head">
                  <h3>{dimension.title}</h3>
                  <span className="impact-pill">
                    {Math.round(model.dimensionWeights[dimension.key] * 100)}%
                  </span>
                </div>
                <p className="route-text">{dimension.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Event weighting</p>
            <h2>What makes one observation more informative than another</h2>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Proof quality</h3>
              <p className="route-text">
                Platform-verified, independent, or adjudicated evidence receives full weight;
                bilateral confirmation receives partial weight; unilateral self-report receives little.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Recency</h3>
              <p className="route-text">
                Evidence decays exponentially with a {model.recencyHalfLifeDays}-day half-life. The
                model can later replace this parameter after observing behavioural drift.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Independence</h3>
              <p className="route-text">
                Repeated transactions with one counterparty have sharply diminishing evidentiary
                value, reducing wash-trade and reciprocal-rating incentives.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Stake</h3>
              <p className="route-text">
                Stake can increase evidentiary weight only logarithmically and is capped at 2×.
                Wealth therefore cannot purchase credibility linearly.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Safety separation</p>
            <h2>Severe integrity events are non-compensatory</h2>
            <p>
              Fraud, forged evidence, coercion, threats, identity duplication, and account compromise
              enter a separate eligibility system. They can require manual review or restrict an
              account; successful micro-transactions cannot wash them away.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              <li>No cause, worldview, political position, follower count, or popularity input.</li>
              <li>No donation total or wealth proxy for virtue.</li>
              <li>No score reduction from an unadjudicated complaint alone.</li>
              <li>Raw event evidence and restriction reasons remain private by default.</li>
              <li>Every material event is designed to carry a reason code and appeal path.</li>
            </ul>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Transaction safeguards</p>
            <h2>The estimate changes protection, not social status</h2>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Unproven</h3>
              <p className="route-text">
                Small pilot, staged performance, independent evidence, and low unsecured exposure.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Developing</h3>
              <p className="route-text">Moderate limits with standard or enhanced evidence.</p>
            </article>
            <article className="panel data-card">
              <h3>Established</h3>
              <p className="route-text">
                Higher limits for familiar trade classes, while preserving challenge windows.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Strong</h3>
              <p className="route-text">
                Lower friction for low-risk contexts; irreversible or high-stake trades still require
                proportionate safeguards.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Validation state</p>
            <h2>Version one is deployed but not yet statistically calibrated</h2>
            <p>
              The event ledger, weighting rules, uncertainty calculation, public aggregate boundary,
              and safety separation are active. Exact deal probabilities are labelled provisional
              until enough resolved trades exist for out-of-time calibration by role, category, stake,
              duration, and verification method.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/api/credibility/model">
              Inspect machine-readable model
            </Link>
            <Link className="button button-secondary" href="/validation">
              Review validation policy
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
