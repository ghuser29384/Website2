import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeCopilotContract,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";
import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";

export const metadata: Metadata = {
  title: "Reasoning standards",
  description:
    "The public standards Moral Trade uses to separate voluntary moral trade from coercion, unsupported verification, and overclaiming.",
  alternates: {
    canonical: "/reasoning-standards",
  },
  openGraph: {
    title: "Reasoning standards",
    description:
      "The public standards Moral Trade uses to separate voluntary moral trade from coercion, unsupported verification, and overclaiming.",
    url: getAbsoluteUrl("/reasoning-standards"),
    type: "website",
  },
};

function formatReasoningToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function ReasoningStandardsPage() {
  const viewer = await getViewer();
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const reviewWorkflowValidation =
    validateOfferReviewWorkflowContract(reviewWorkflowContract);
  const copilotContract = getMoralTradeCopilotContract();
  const copilotValidation = validateMoralTradeCopilotContract(copilotContract);
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidation = validateMoralTradeProvenanceContract(provenanceContract);
  const protocolContractStatus =
    reviewWorkflowValidation.status === "pass" &&
    copilotValidation.status === "pass" &&
    provenanceValidation.status === "pass"
      ? "pass"
      : "fail";
  const protocolContractCheckCount =
    reviewWorkflowValidation.checks.length +
    copilotValidation.checks.length +
    provenanceValidation.checks.length;
  const protocolContractBlockerCount =
    reviewWorkflowValidation.blockers.length +
    copilotValidation.blockers.length +
    provenanceValidation.blockers.length;

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
            <p className="eyebrow">Reasoning standards</p>
            <h1>Make trade records specific enough to judge.</h1>
            <p className="hero-text">
              Moral Trade is useful only when the parties can see the action, the reciprocal
              request, the verification rule, and the safety boundary before anyone relies on the
              exchange.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Review offers
              </Link>
              <Link className="button button-secondary" href="/safety">
                Safety policy
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Core test</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Voluntary</strong>
                  <p>Both sides can decline without threat, pressure, doxxing, or retaliation.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Mutually beneficial</strong>
                  <p>Each side can explain why the trade is better under its own moral view.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Verifiable</strong>
                  <p>The record names what evidence will count and who reviews it.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Trade standard</p>
            <h2>A valid offer should name the whole exchange</h2>
            <p>
              Public offers should show the action, reciprocal request, cause areas, minimum
              reciprocal impact, duration, exit rule, and evidence rule. Donation offsets add a
              named compromise destination, matched-redirection rule, unmatched-surplus rule,
              threshold, expiry, and anti-threat certification.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Not a threat market</h3>
              <p>
                Offers that rely on threats, coercion, fraud, harassment, doxxing, or pressure on
                vulnerable people are not moral trades. They should be blocked or sent to review.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Not generic charity advice</h3>
              <p>
                Moral public goods are presented as coordination mechanisms for shared consensus
                goods. The site is not a charity evaluator and should not claim that a destination
                is best for every donor.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Not legal escrow</h3>
              <p>
                Payment language must stay aligned with the terms. Evidence-gated review,
                third-party payment records, and pending verification are not legal escrow.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="protocol-backed-standards-heading">
          <div className="section-head">
            <p className="eyebrow">Protocol-backed standards</p>
            <h2 id="protocol-backed-standards-heading">
              The public standards now resolve to validator contracts.
            </h2>
            <p>
              The audit asked Moral Trade to move from policy prose to policy-enforced workflows.
              These checks expose the fixed review loop, approved copilot output, and provenance
              rules behind a draft before anyone treats it as matchable or complete.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Reasoning standard health</p>
              <div className="protocol-workflow-card-head">
                <h3>{protocolContractStatus}</h3>
                <StatusBadge tone={protocolContractStatus === "pass" ? "default" : "warning"}>
                  {protocolContractStatus}
                </StatusBadge>
              </div>
              <p>
                {protocolContractCheckCount} validator check(s),{" "}
                {protocolContractBlockerCount} blocker(s) across the review workflow, copilot
                contract, and provenance schema.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href="/api/moral-trade/review-workflow/contract">
                Review workflow JSON
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/copilot/contract">
                Copilot contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/provenance/schema">
                Provenance schema
              </Link>
            </div>
          </div>

          <div className="review-workflow-grid" aria-label="Review workflow standard cards">
            {reviewWorkflowContract.detailWorkflowCards.map((card) => (
              <article className="panel review-workflow-card" key={card.key}>
                <div className="review-workflow-card-head">
                  <p className="detail-kicker">{formatReasoningToken(card.key)}</p>
                  <StatusBadge tone="secondary">{card.requiredFactorCodes.length} factors</StatusBadge>
                </div>
                <h3>{card.label}</h3>
                <p className="route-text">{card.purpose}</p>
                <div className="review-factor-list" aria-label={`${card.label} required factor codes`}>
                  {card.requiredFactorCodes.map((factorCode) => (
                    <span key={factorCode}>{factorCode}</span>
                  ))}
                </div>
                <p className="review-next-step">
                  <strong>Rule:</strong> {card.nextStepRule}
                </p>
              </article>
            ))}
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card">
              <h3>Fixed verification loop</h3>
              <ol className="protocol-verification-list">
                {copilotContract.verificationLoop.map((step) => (
                  <li className="protocol-verification-step" key={step.key}>
                    <span className="protocol-step-status">
                      {step.blocksMatchable ? "Blocks" : "Routes"}
                    </span>
                    <strong>{step.label}</strong>
                    <small>{formatReasoningToken(step.key)}</small>
                  </li>
                ))}
              </ol>
            </article>

            <article className="panel data-card">
              <h3>Approved copilot output</h3>
              <ul className="clean-list">
                {copilotContract.approvedOutputSections.map((section) => (
                  <li key={section}>{formatReasoningToken(section)}</li>
                ))}
              </ul>
              <p className="panel-note">
                The contract permits summaries, cited evidence, uncertainty flags, and next steps;
                it does not permit hidden reasoning or autonomous status changes.
              </p>
            </article>

            <article className="panel data-card">
              <h3>Evidence object rules</h3>
              <ul className="clean-list">
                {provenanceContract.validationRules.slice(0, 6).map((rule) => (
                  <li key={rule.key}>{rule.label}</li>
                ))}
              </ul>
              <p className="panel-note">
                Artifacts, claims, review decisions, activities, agents, and traceability events
                stay separate so proof can be challenged without broad moral overclaiming.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Verification standard</p>
            <h2>Evidence has to be named before reliance</h2>
            <p>
              Records should state the evidence standard in plain language: receipt, third-party
              payment record, audit, dated public statement, manual reviewer decision, or another
              checkable rule. A submitted claim is not treated as verified merely because it was
              uploaded.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Donation offsets</h3>
              <p>
                Offset records should expose the matched action, compromise destination,
                verification rule, threshold, expiry, unmatched-surplus rule, and evidence
                standard.
              </p>
              <Link className="inline-link" href="/donation-offsets">
                Read offset standards
              </Link>
            </article>
            <article className="panel editorial-card">
              <h3>MPGF evidence</h3>
              <p>
                Manual external-payment evidence is available after sign-in and remains pending
                until review. Provider webhooks can record provider events only when the relevant
                payment mode is configured and approved.
              </p>
              <Link className="inline-link" href="/mpgf">
                Review MPGF workflow
              </Link>
            </article>
            <article className="panel editorial-card">
              <h3>Priority correction</h3>
              <p>
                The Priority Correction Fund records monthly calculations, arbiter assignments,
                support counts, dissent notes, and published reasoning instead of hiding allocation
                decisions in private messages.
              </p>
              <Link className="inline-link" href="/priority-correction-fund">
                Review the fund process
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">User guidance</p>
            <h2>Dense moral claims need practical field-level guidance</h2>
            <p>
              The current forms use structured fields and validation so a participant can see what
              is missing before publishing. The next product step is deeper onboarding and richer
              examples, not loosening these standards.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
