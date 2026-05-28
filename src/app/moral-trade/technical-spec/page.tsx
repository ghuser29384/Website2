import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeCopilotContract,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";
import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";
import {
  getMoralTradeProtocolProfile,
  validateMoralTradeProtocolProfile,
} from "@/lib/moral-trade/protocol";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";
import {
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";
import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";
import {
  getMoralTradeEvaluationProfile,
  validateMoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";
import {
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";
import {
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";
import {
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";
import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Moral Trade Technical Spec",
  description:
    "Public validator evidence for the core Moral Trade proposal contract, factor codes, evidence schemas, and provenance model.",
  alternates: {
    canonical: "/moral-trade/technical-spec",
  },
  openGraph: {
    title: "Moral Trade Technical Spec",
    description:
      "Validator evidence for the core proposal contract, factor codes, evidence schemas, and provenance model.",
    url: getAbsoluteUrl("/moral-trade/technical-spec"),
    type: "website",
  },
};

export default async function MoralTradeTechnicalSpecPage() {
  const viewer = await getViewer();
  const profile = getMoralTradeProtocolProfile();
  const validation = validateMoralTradeProtocolProfile();
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidation = validateMoralTradeProvenanceContract(provenanceContract);
  const copilotContract = getMoralTradeCopilotContract();
  const copilotValidation = validateMoralTradeCopilotContract(copilotContract);
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const reviewWorkflowValidation =
    validateOfferReviewWorkflowContract(reviewWorkflowContract);
  const operationsProfile = getMoralTradeOperationsProfile();
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const securityProfile = getMoralTradeSecurityProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const evaluationProfile = getMoralTradeEvaluationProfile();
  const evaluationValidation = validateMoralTradeEvaluationProfile(evaluationProfile);
  const performanceProfile = getMoralTradePerformanceProfile();
  const performanceValidation = validateMoralTradePerformanceProfile(performanceProfile);
  const externalityProfile = getMoralTradeExternalityProfile();
  const externalityValidation = validateMoralTradeExternalityProfile(externalityProfile);
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const aiGovernanceProfile = getMoralTradeAiGovernanceProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile(aiGovernanceProfile);
  const apiRateLimitSurfaces = Array.from(
    new Set(apiContractProfile.routes.map((route) => route.rateLimitSurface)),
  );

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs
          items={[
            { href: "/moral-trade", label: "Moral trade" },
            { href: "/moral-trade/technical-spec", label: "Technical spec" },
          ]}
        />

        <PageHero
          eyebrow="Core protocol"
          title="Moral Trade has a public validator contract."
          description="The core feature now publishes its required proposal fields, review statuses, guardrails, evidence schemas, factor codes, and provenance model as a validator-backed profile."
          actions={
            <>
              <Link className="button button-primary" href="/api/moral-trade/health">
                View health JSON
              </Link>
              <Link className="button button-secondary" href="/validation">
                Review validation rules
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/provenance/schema">
                View provenance schema
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/copilot/contract">
                View copilot contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/review-workflow/contract">
                View review workflow
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/operations/health">
                View operations health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/security/health">
                View security health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/evaluation/health">
                View evaluation health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/performance/health">
                View performance health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/externality/health">
                View externality health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/ai-governance/health">
                View AI governance
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/api-contract">
                View API contract
              </Link>
            </>
          }
        >
          <aside className="hero-panel panel">
            <p className="eyebrow">Validator result</p>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Status</dt>
                <dd>{validation.status}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{profile.version}</dd>
              </div>
              <div>
                <dt>Checks</dt>
                <dd>{validation.checks.length}</dd>
              </div>
              <div>
                <dt>Blockers</dt>
                <dd>{validation.blockers.length}</dd>
              </div>
            </dl>
          </aside>
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Public contract</p>
            <h2 id="contract-heading">Fields, states, and guardrails are inspectable.</h2>
            <p>
              This mirrors the MPGF validator posture for the core moral-trade workflow: a proposal
              is not merely prose; it is a record with required fields, review states, explicit
              rejection rules, and provenance-bearing evidence.
            </p>
          </div>

          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Required proposal fields</h3>
              <ul className="clean-list">
                {profile.requiredProposalFields.map((field) => (
                  <li key={field.key}>{field.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Review statuses</h3>
              <div className="tag-row">
                {profile.statusValues.map((status) => (
                  <StatusBadge key={status} tone={status === "blocked" ? "warning" : "secondary"}>
                    {status.replaceAll("_", " ")}
                  </StatusBadge>
                ))}
              </div>
            </article>
            <article className="panel protocol-contract-card">
              <h3>State transitions</h3>
              <ul className="clean-list">
                {profile.stateTransitionRules.map((rule) => (
                  <li key={rule.key}>
                    {rule.from.replaceAll("_", " ")} {"->"} {rule.allowedTo.join(", ")}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Guardrails</h3>
              <ul className="clean-list">
                {profile.guardrails.map((guardrail) => (
                  <li key={guardrail.code}>{guardrail.label}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="checks-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Validator evidence</p>
            <h2 id="checks-heading">Core checks run without hidden ranking or AI decisions.</h2>
          </div>
          <div className="mpgf-table protocol-check-table">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Check</span>
              <span>Status</span>
              <span>Evidence</span>
            </div>
            {validation.checks.map((check) => (
              <div className="mpgf-table-row" key={check.id}>
                <span>{check.label}</span>
                <span>{check.status}</span>
                <span>{check.evidence}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="factor-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Explanation layer</p>
            <h2 id="factor-heading">Factor codes explain matches without private-text leakage.</h2>
          </div>
          <div className="data-grid">
            {profile.factorCodes.map((factor) => (
              <article className="panel data-card" key={factor.code}>
                <p className="detail-kicker">{factor.code}</p>
                <h3>{factor.label}</h3>
                <p>{factor.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="review-workflow-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Review workflow contract</p>
            <h2 id="review-workflow-contract-heading">
              Marketplace cards and detail pages share one factor-code source.
            </h2>
            <p>
              The report recommends replacing prose-heavy pages with instrumented workflow cards.
              This contract publishes the card keys, factor-code requirements, next-step rules, and
              non-ranking invariants used by offer details, worked examples, marketplace listings,
              and the homepage preview.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Review workflow {reviewWorkflowContract.version}</p>
              <h3>Status {reviewWorkflowValidation.status}</h3>
              <p>
                {reviewWorkflowValidation.checks.length} check(s),{" "}
                {reviewWorkflowValidation.blockers.length} blocker(s),{" "}
                {reviewWorkflowContract.detailWorkflowCards.length} card contract(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/review-workflow/contract">
              Open review workflow JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Marketplace priority</h3>
              <ul className="clean-list">
                {reviewWorkflowContract.marketplaceFactorPriority.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Invariants</h3>
              <ul className="clean-list">
                {reviewWorkflowContract.invariants.slice(0, 4).map((invariant) => (
                  <li key={invariant}>{invariant}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {reviewWorkflowContract.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Evaluation route</h3>
              <p>
                POST /api/moral-trade/review-workflow/evaluate returns deterministic workflow
                cards and marketplace factors with stateMutation false.
              </p>
            </article>
          </div>
          <div className="data-grid">
            {reviewWorkflowContract.detailWorkflowCards.map((card) => (
              <article className="panel data-card" key={card.key}>
                <p className="detail-kicker">{card.key}</p>
                <h3>{card.label}</h3>
                <p>{card.purpose}</p>
                <ul className="clean-list">
                  {card.requiredFactorCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="copilot-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Copilot contract</p>
            <h2 id="copilot-contract-heading">Any AI assistance is schema-bound and reversible.</h2>
            <p>
              The copilot role is limited to drafting, critique, explanation, evidence checklists,
              and reviewer summaries. It cannot rank moral value, contact counterparties, consume
              raw private feeds, or change proposal state when output validation fails.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Contract {copilotContract.version}</p>
              <h3>Status {copilotValidation.status}</h3>
              <p>
                {copilotValidation.checks.length} check(s), {copilotValidation.blockers.length}{" "}
                blocker(s), {copilotContract.verificationLoop.length} fixed verification step(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/copilot/contract">
              Open contract JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Strict input bundle</h3>
              <ul className="clean-list">
                {copilotContract.strictInputBundle.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Approved output sections</h3>
              <ul className="clean-list">
                {copilotContract.approvedOutputSections.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Hard guardrails</h3>
              <ul className="clean-list">
                {copilotContract.guardrails.map((guardrail) => (
                  <li key={guardrail.code}>{guardrail.label}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {copilotContract.verificationLoop.map((step) => (
              <article className="panel data-card" key={step.key}>
                <p className="detail-kicker">{step.key}</p>
                <h3>{step.label}</h3>
                <p>{step.blocksMatchable ? "Blocks matchable status until resolved." : "Routes or explains without changing state."}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="operations-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Operations contract</p>
            <h2 id="operations-contract-heading">Security, rate limits, metrics, and fallbacks are inspectable.</h2>
            <p>
              The core feature now publishes the operating controls that were previously scattered
              across code and policy pages: security headers, private-cache rules, abuse throttles,
              observability metrics, safe fallbacks, and rollout gates.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Operations {operationsProfile.version}</p>
              <h3>Status {operationsValidation.status}</h3>
              <p>
                {operationsValidation.checks.length} check(s), {operationsValidation.blockers.length}{" "}
                blocker(s), {operationsProfile.operationalTests.length} operational test hook(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/operations/health">
              Open operations JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Security headers</h3>
              <ul className="clean-list">
                {operationsProfile.securityHeaders.map((header) => (
                  <li key={header.code}>{header.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Rate-limit surfaces</h3>
              <ul className="clean-list">
                {operationsProfile.rateLimitSurfaces.map((surface) => (
                  <li key={surface.key}>
                    {surface.key.replaceAll("_", " ")}: {surface.limit} per {surface.window}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Operational metrics</h3>
              <ul className="clean-list">
                {operationsProfile.observabilityMetrics.map((metric) => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {operationsProfile.fallbackControls.map((control) => (
              <article className="panel data-card" key={control.key}>
                <p className="detail-kicker">{control.key}</p>
                <h3>{control.label}</h3>
                <p>{control.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="performance-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Performance contract</p>
            <h2 id="performance-contract-heading">
              Route resilience and Web Vitals are measured before readiness is claimed.
            </h2>
            <p>
              The report flagged repeated loading states, route failure recovery, and unspecified
              Web Vitals, API latency, cache, and bundle strategy. This profile turns those into
              public targets, privacy-safe telemetry boundaries, and release gates.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Performance {performanceProfile.version}</p>
              <h3>Status {performanceValidation.status}</h3>
              <p>
                {performanceValidation.checks.length} check(s),{" "}
                {performanceValidation.blockers.length} blocker(s),{" "}
                {performanceProfile.metricTargets.length} metric target(s), cadence{" "}
                {performanceProfile.measurementCadence.replaceAll("_", " ")}.
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/performance/health">
              Open performance JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Metric targets</h3>
              <ul className="clean-list">
                {performanceProfile.metricTargets.slice(0, 5).map((metric) => (
                  <li key={metric.key}>
                    {metric.label}: {metric.target}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Instrumentation controls</h3>
              <ul className="clean-list">
                {performanceProfile.instrumentationControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Route families</h3>
              <ul className="clean-list">
                {performanceProfile.routeFamilies.map((family) => (
                  <li key={family.key}>{family.key.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {performanceProfile.releaseGates.map((gate) => (
              <article className="panel data-card" key={gate.key}>
                <p className="detail-kicker">{gate.key}</p>
                <h3>{gate.label}</h3>
                <p>{gate.rule}</p>
              </article>
            ))}
          </div>
          <div className="data-grid">
            {performanceProfile.publicNonClaims.map((nonClaim) => (
              <article className="panel data-card" key={nonClaim}>
                <p className="detail-kicker">Performance non-claim</p>
                <p>{nonClaim}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="security-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Security contract</p>
            <h2 id="security-contract-heading">
              Security posture is explicit about controls, boundaries, and non-claims.
            </h2>
            <p>
              The report flagged encryption details, 2FA, device/session review, key management,
              and abuse throttling as unspecified. This profile publishes what is implemented,
              what is a provider boundary, and what must be ready before sensitive scale.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Security {securityProfile.version}</p>
              <h3>Status {securityValidation.status}</h3>
              <p>
                {securityValidation.checks.length} check(s),{" "}
                {securityValidation.blockers.length} blocker(s),{" "}
                {securityProfile.scaleGates.length} scale gate(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/security/health">
              Open security JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Implemented controls</h3>
              <ul className="clean-list">
                {securityProfile.controls
                  .filter((control) => control.status === "implemented")
                  .map((control) => (
                    <li key={control.key}>{control.label}</li>
                  ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Provider boundaries and non-claims</h3>
              <ul className="clean-list">
                {securityProfile.controls
                  .filter(
                    (control) =>
                      control.status === "provider_boundary" || control.status === "not_claimed",
                  )
                  .map((control) => (
                    <li key={control.key}>{control.label}</li>
                  ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Scale gates</h3>
              <ul className="clean-list">
                {securityProfile.scaleGates.map((gate) => {
                  const readiness = auditMoralTradeSecurityScaleReadiness({
                    gateKey: gate.key,
                    profile: securityProfile,
                  });

                  return (
                    <li key={gate.key}>
                      {gate.label}: {readiness.status}
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {securityProfile.publicNonClaims.map((nonClaim) => (
              <article className="panel data-card" key={nonClaim}>
                <p className="detail-kicker">Public non-claim</p>
                <p>{nonClaim}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="evaluation-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Evaluation contract</p>
            <h2 id="evaluation-contract-heading">Quality metrics are public, privacy-bounded, and rollout-gated.</h2>
            <p>
              The report recommends measuring whether protocol and copilot workflows actually help.
              This profile names the metrics, privacy boundaries, cohort slices, and promotion
              gates required before assisted workflow changes can scale.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Evaluation {evaluationProfile.version}</p>
              <h3>Status {evaluationValidation.status}</h3>
              <p>
                {evaluationValidation.checks.length} check(s), {evaluationValidation.blockers.length}{" "}
                blocker(s), {evaluationProfile.metrics.length} metric(s), cadence{" "}
                {evaluationProfile.cadence.replaceAll("_", " ")}.
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/evaluation/health">
              Open evaluation JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Codex-assisted workflow metrics</h3>
              <ul className="clean-list">
                {evaluationProfile.metrics.slice(0, 5).map((metric) => (
                  <li key={metric.key}>
                    {metric.label}: {metric.direction}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Privacy and fairness slices</h3>
              <ul className="clean-list">
                {evaluationProfile.cohortSlices.map((slice) => (
                  <li key={slice}>{slice.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Measurement boundaries</h3>
              <ul className="clean-list">
                {evaluationProfile.privacyBoundaries.map((boundary) => (
                  <li key={boundary}>{boundary.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {evaluationProfile.promotionGates.map((gate) => (
              <article className="panel data-card" key={gate.stage}>
                <p className="detail-kicker">{gate.stage}</p>
                <h3>{gate.stage.replaceAll("_", " ")}</h3>
                <p>{gate.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="externality-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Externality contract</p>
            <h2 id="externality-contract-heading">
              Third-party impacts now have due-diligence and remedy gates.
            </h2>
            <p>
              Externality review is not a vague warning label. Material triggers require
              affected-party standing, remediation paths, privacy-safe reporting, human approval,
              and relevant source standards before reliance.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Externality {externalityProfile.version}</p>
              <h3>Status {externalityValidation.status}</h3>
              <p>
                {externalityValidation.checks.length} check(s),{" "}
                {externalityValidation.blockers.length} blocker(s),{" "}
                {externalityProfile.triggerCodes.length} trigger code(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/externality/health">
              Open externality JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Due-diligence steps</h3>
              <ul className="clean-list">
                {externalityProfile.dueDiligenceSteps.map((step) => (
                  <li key={step.key}>{step.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Review standards</h3>
              <ul className="clean-list">
                {externalityProfile.reviewStandards.map((standard) => (
                  <li key={standard.key}>{standard.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Remedy controls</h3>
              <ul className="clean-list">
                {externalityProfile.remedyControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {externalityProfile.triggerCodes.map((trigger) => (
              <article className="panel data-card" key={trigger.key}>
                <p className="detail-kicker">{trigger.key}</p>
                <h3>{trigger.label}</h3>
                <p>{trigger.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="ai-governance-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">AI governance contract</p>
            <h2 id="ai-governance-heading">
              Undocumented ML cannot rank, match, disclose, or change state.
            </h2>
            <p>
              The report says any move beyond deterministic rules must be documented with model
              cards, dataset datasheets, benchmark slices, fairness audits, and human-control
              gates. This profile keeps that requirement explicit before any ranking or scoring
              layer can be promoted.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">AI governance {aiGovernanceProfile.version}</p>
              <h3>Status {aiGovernanceValidation.status}</h3>
              <p>
                {aiGovernanceValidation.checks.length} check(s),{" "}
                {aiGovernanceValidation.blockers.length} blocker(s), decisioning mode{" "}
                {aiGovernanceProfile.decisioningMode.replaceAll("_", " ")}.
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/ai-governance/health">
              Open AI governance JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Required before ML</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.requiredDocumentationBeforeMl.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Prohibited uses</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.prohibitedUses.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Standards</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.externalStandards.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Explanation controls</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.explanationControls.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {aiGovernanceProfile.permittedAutomation.map((entry) => (
              <article className="panel data-card" key={entry.key}>
                <p className="detail-kicker">{entry.key}</p>
                <h3>{entry.label}</h3>
                <p>{entry.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="api-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">API contract</p>
            <h2 id="api-contract-heading">
              Core routes now publish privacy, schema, rate-limit, and fallback metadata.
            </h2>
            <p>
              The core Moral Trade API surface is now cataloged with method, auth posture, privacy
              class, schema names, rate-limit surface, cache behavior, and safe fallback rules.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">API {apiContractProfile.version}</p>
              <h3>Status {apiContractValidation.status}</h3>
              <p>
                {apiContractValidation.checks.length} check(s),{" "}
                {apiContractValidation.blockers.length} blocker(s),{" "}
                {apiContractProfile.routes.length} route(s),{" "}
                {apiContractProfile.schemaDefinitions.length} schema definition(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/api-contract">
              Open API contract JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Route catalog</h3>
              <ul className="clean-list">
                {apiContractProfile.routes
                  .slice(0, 5)
                  .map((route) => (
                    <li key={route.key}>
                      {route.method} {route.path}
                    </li>
                  ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Schema definitions</h3>
              <ul className="clean-list">
                {apiContractProfile.schemaDefinitions.slice(0, 6).map((schema) => (
                  <li key={schema.key}>
                    {schema.key}: {schema.fields.length} field(s)
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Privacy classes</h3>
              <ul className="clean-list">
                {apiContractProfile.privacyClasses.map((entry) => (
                  <li key={entry.key}>{entry.key.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Private and thresholded routes</h3>
              <ul className="clean-list">
                {apiContractProfile.routes
                  .filter((route) => route.privacyClass !== "public_contract")
                  .map((route) => (
                    <li key={route.key}>
                      {route.key}: {route.privacyClass.replaceAll("_", " ")}
                    </li>
                  ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Rate-limit surfaces</h3>
              <ul className="clean-list">
                {apiRateLimitSurfaces.map((surface) => (
                  <li key={surface}>{surface.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>API test hooks</h3>
              <ul className="clean-list">
                {apiContractProfile.apiTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {apiContractProfile.schemaDefinitions.slice(0, 6).map((schema) => (
              <article className="panel data-card" key={schema.key}>
                <p className="detail-kicker">Field-level schema</p>
                <h3>{schema.key}</h3>
                <p>{schema.purpose}</p>
                {schema.fields.length > 0 ? (
                  <ul className="clean-list">
                    {schema.fields.slice(0, 4).map((field) => (
                      <li key={field.key}>
                        {field.key}: {field.type}, {field.privacy}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No body fields.</p>
                )}
              </article>
            ))}
          </div>
          <div className="data-grid">
            {apiContractProfile.routes.slice(0, 6).map((route) => (
              <article className="panel data-card" key={route.key}>
                <p className="detail-kicker">{route.key}</p>
                <h3>
                  {route.method} {route.path}
                </h3>
                <p>{route.fallback}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="provenance-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Provenance</p>
            <h2 id="provenance-heading">Evidence records name entities, activities, and agents.</h2>
            <p>
              This does not prove moral correctness. It does make each claim easier to audit:
              what artifact was submitted, what activity changed state, and which participant,
              reviewer, or provider was involved.
            </p>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Entities</h3>
              <p>{profile.provenanceModel.entities.join(", ")}</p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Activities</h3>
              <p>{profile.provenanceModel.activities.join(", ")}</p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Agents</h3>
              <p>{profile.provenanceModel.agents.join(", ")}</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="provenance-schema-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Evidence object contract</p>
            <h2 id="provenance-schema-heading">Claims now have typed artifacts, traceability events, and review records.</h2>
            <p>
              The provenance layer uses fixed object schemas so duplicate proof, wrong-scope
              evidence, stale artifacts, missing agents, external entity dedupe failures, and
              external payment or charity-routing events without what/where/why links can be caught
              before any reviewed completion claim is published.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Provenance contract {provenanceContract.schemaVersion}</p>
              <h3>Status {provenanceValidation.status}</h3>
              <p>
                {provenanceValidation.checks.length} check(s),{" "}
                {provenanceValidation.blockers.length} blocker(s),{" "}
                {provenanceContract.sampleBundleSummary.traceabilityEventCount} synthetic
                traceability event(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/provenance/schema">
              Open provenance JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Validator rules</h3>
              <ul className="clean-list">
                {provenanceContract.validationRules.slice(0, 5).map((rule) => (
                  <li key={rule.key}>{rule.key}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Sample bundle</h3>
              <p>
                {provenanceContract.sampleBundleSummary.artifactCount} artifact,{" "}
                {provenanceContract.sampleBundleSummary.claimCount} claim,{" "}
                {provenanceContract.sampleBundleSummary.reviewDecisionCount} review decision,{" "}
                {provenanceContract.sampleBundleSummary.agentCount} agents.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {provenanceContract.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="protocol-contract-grid">
            {profile.provenanceObjectSchemas.map((schema) => (
              <article className="panel protocol-contract-card" key={schema.key}>
                <p className="detail-kicker">{schema.key}</p>
                <h3>{schema.label}</h3>
                <ul className="clean-list">
                  {schema.required.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
