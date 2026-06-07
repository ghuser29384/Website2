import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  validateMoralTradeCopilotContract,
} from "@/lib/moral-trade/copilot";
import {
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignalContract,
} from "@/lib/moral-trade/match-signal";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";
import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";
import {
  getMoralTradeProtocolProfile,
  validateMoralTradeProtocolProfile,
} from "@/lib/moral-trade/protocol";
import {
  getMoralTradeDataModelProfile,
  validateMoralTradeDataModelProfile,
} from "@/lib/moral-trade/data-model";
import {
  getMoralTradePolicyBundleContract,
  validateMoralTradePolicyBundleContract,
} from "@/lib/moral-trade/policy-bundle";
import {
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
} from "@/lib/moral-trade/release-gates";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";
import {
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
} from "@/lib/moral-trade/schema-registry";
import {
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPackets,
  validateMoralTradeReasoningPacketContract,
} from "@/lib/moral-trade/reasoning-packets";
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
  auditMoralTradeIncidentReadinessGate,
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";
import {
  getMoralTradeEvaluationSampleAudits,
  getMoralTradeEvaluationProfile,
  validateMoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";
import {
  auditMoralTradeRouteRecoveryManifest,
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
import {
  getMoralTradeDocumentCoverageProfile,
  validateMoralTradeDocumentCoverageProfile,
} from "@/lib/moral-trade/document-coverage";
import {
  getMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportContract,
} from "@/lib/moral-trade/transparency-report";
import {
  getBackgroundPrivateOverlapContract,
  validateBackgroundPrivateOverlapContract,
} from "@/lib/background-private-overlap";
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
  const dataModelProfile = getMoralTradeDataModelProfile();
  const dataModelValidation = validateMoralTradeDataModelProfile(dataModelProfile);
  const policyBundleContract = getMoralTradePolicyBundleContract();
  const policyBundleValidation =
    validateMoralTradePolicyBundleContract(policyBundleContract);
  const releaseGateContract = getMoralTradeReleaseGateContract();
  const releaseGateValidation =
    validateMoralTradeReleaseGateContract(releaseGateContract);
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidation = validateMoralTradeProvenanceContract(provenanceContract);
  const schemaRegistry = getMoralTradeSchemaRegistry();
  const schemaRegistryValidation = validateMoralTradeSchemaRegistry(schemaRegistry);
  const schemaRegistrySampleCount = schemaRegistry.schemaDocuments.reduce(
    (total, schema) => total + schema.sampleValidationCount,
    0,
  );
  const schemaRegistrySampleFailureCount = schemaRegistry.schemaDocuments.reduce(
    (total, schema) => total + schema.sampleValidationFailureCount,
    0,
  );
  const copilotContract = getMoralTradeCopilotContract();
  const copilotValidation = validateMoralTradeCopilotContract(copilotContract);
  const copilotRolloutReadiness =
    getMoralTradeCopilotRolloutReadinessAudits(copilotContract);
  const copilotBlockingVerificationSteps = copilotContract.verificationLoop.filter(
    (step) => step.blocksMatchable,
  );
  const matchSignalContract = getMoralTradeMatchSignalContract();
  const matchSignalValidation =
    validateMoralTradeMatchSignalContract(matchSignalContract);
  const challengeAppealContract = getMoralTradeChallengeAppealContract();
  const challengeAppealValidation =
    validateMoralTradeChallengeAppealContract(challengeAppealContract);
  const disclosureContract = getMoralTradeDisclosureContract();
  const disclosureValidation =
    validateMoralTradeDisclosureContract(disclosureContract);
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const reviewWorkflowValidation =
    validateOfferReviewWorkflowContract(reviewWorkflowContract);
  const reasoningPackets = getMoralTradeReasoningPackets();
  const reasoningPacketContract =
    getMoralTradeReasoningPacketContract(reasoningPackets);
  const reasoningPacketValidation =
    validateMoralTradeReasoningPacketContract(
      reasoningPacketContract,
      reasoningPackets,
    );
  const operationsProfile = getMoralTradeOperationsProfile();
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const securityProfile = getMoralTradeSecurityProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const incidentResponseProfile = getMoralTradeIncidentResponseProfile();
  const incidentResponseValidation =
    validateMoralTradeIncidentResponseProfile(incidentResponseProfile);
  const evaluationProfile = getMoralTradeEvaluationProfile();
  const evaluationValidation = validateMoralTradeEvaluationProfile(evaluationProfile);
  const evaluationSampleAudits = getMoralTradeEvaluationSampleAudits();
  const performanceProfile = getMoralTradePerformanceProfile();
  const performanceValidation = validateMoralTradePerformanceProfile(performanceProfile);
  const routeRecoveryAudit = auditMoralTradeRouteRecoveryManifest({
    profile: performanceProfile,
  });
  const externalityProfile = getMoralTradeExternalityProfile();
  const externalityValidation = validateMoralTradeExternalityProfile(externalityProfile);
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const aiGovernanceProfile = getMoralTradeAiGovernanceProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile(aiGovernanceProfile);
  const documentCoverageProfile = getMoralTradeDocumentCoverageProfile();
  const documentCoverageValidation =
    validateMoralTradeDocumentCoverageProfile(documentCoverageProfile);
  const transparencyReportContract = getMoralTradeTransparencyReportContract();
  const transparencyReportValidation =
    validateMoralTradeTransparencyReportContract(transparencyReportContract);
  const privateOverlapContract = getBackgroundPrivateOverlapContract();
  const privateOverlapValidation =
    validateBackgroundPrivateOverlapContract(privateOverlapContract);
  const documentCoverageEvidencePhraseCount = documentCoverageProfile.requirements.reduce(
    (total, requirement) => total + requirement.requiredEvidencePhrases.length,
    0,
  );
  const apiRateLimitSurfaces = Array.from(
    new Set(apiContractProfile.routes.map((route) => route.rateLimitSurface)),
  );
  const healthValidationBlockerCount = [
    validation,
    dataModelValidation,
    policyBundleValidation,
    releaseGateValidation,
    provenanceValidation,
    schemaRegistryValidation,
    copilotValidation,
    matchSignalValidation,
    challengeAppealValidation,
    disclosureValidation,
    reviewWorkflowValidation,
    reasoningPacketValidation,
    operationsValidation,
    securityValidation,
    incidentResponseValidation,
    evaluationValidation,
    performanceValidation,
    externalityValidation,
    apiContractValidation,
    aiGovernanceValidation,
    documentCoverageValidation,
    transparencyReportValidation,
    privateOverlapValidation,
  ].reduce((total, entry) => total + entry.blockers.length, 0);
  const publicContractReadiness = [
    {
      blockers: healthValidationBlockerCount,
      family: "Top-level readiness",
      href: "/api/moral-trade/health",
      label: "Protocol health",
      status: healthValidationBlockerCount ? "fail" : "pass",
      summary: `${documentCoverageProfile.canonicalInstruction.routeEvidence.length} canonical public route(s) cross-linked in one health surface.`,
    },
    {
      blockers: documentCoverageValidation.blockers.length,
      family: "Source traceability",
      href: "/api/moral-trade/document-coverage/health",
      label: "Document coverage",
      status: documentCoverageValidation.status,
      summary: `${documentCoverageValidation.sourceDocumentCount} source document(s), ${documentCoverageValidation.testingPlanLayerCount} testing layer(s).`,
    },
    {
      blockers: apiContractValidation.blockers.length,
      family: "API catalog",
      href: "/api/moral-trade/api-contract",
      label: "API contract",
      status: apiContractValidation.status,
      summary: `${apiContractProfile.routes.length} route(s), ${apiContractProfile.schemaDefinitions.length} schema definition(s).`,
    },
    {
      blockers: dataModelValidation.blockers.length,
      family: "Core schema",
      href: "/api/moral-trade/data-model/contract",
      label: "Data model",
      status: dataModelValidation.status,
      summary: `${dataModelProfile.entities.length} entity contract(s), ${dataModelProfile.offerRequiredFields.length} required offer field(s).`,
    },
    {
      blockers: schemaRegistryValidation.blockers.length,
      family: "Core schema",
      href: "/api/moral-trade/schemas",
      label: "Schema registry",
      status: schemaRegistryValidation.status,
      summary: `${schemaRegistry.schemaDocuments.length} schema document(s), ${schemaRegistrySampleCount} sample validation(s).`,
    },
    {
      blockers: policyBundleValidation.blockers.length,
      family: "Policy inputs",
      href: "/api/moral-trade/policy-bundle/contract",
      label: "Policy bundle",
      status: policyBundleValidation.status,
      summary: `${policyBundleContract.prohibitedPatternRegistry.length} prohibited pattern(s), ${policyBundleContract.verificationLoop.length} verification step(s).`,
    },
    {
      blockers: releaseGateValidation.blockers.length,
      family: "Policy inputs",
      href: "/api/moral-trade/release-gates/contract",
      label: "Release gates",
      status: releaseGateValidation.status,
      summary: `${releaseGateContract.stages.length} stage(s), ${releaseGateContract.requirementDefinitions.length} fail-closed requirement(s).`,
    },
    {
      blockers: copilotValidation.blockers.length,
      family: "Assisted drafting",
      href: "/api/moral-trade/copilot/contract",
      label: "Copilot contract",
      status: copilotValidation.status,
      summary: `${copilotContract.promptTemplates.length} prompt template(s), ${copilotContract.guardrails.length} guardrail(s).`,
    },
    {
      blockers: reviewWorkflowValidation.blockers.length,
      family: "Workflow cards",
      href: "/api/moral-trade/review-workflow/contract",
      label: "Review workflow",
      status: reviewWorkflowValidation.status,
      summary: `${reviewWorkflowContract.detailWorkflowCards.length} card contract(s), ${reviewWorkflowContract.marketplaceFactorPriority.length} marketplace factor(s).`,
    },
    {
      blockers: reasoningPacketValidation.blockers.length,
      family: "Workflow cards",
      href: "/api/moral-trade/reasoning/packets",
      label: "Reasoning packets",
      status: reasoningPacketValidation.status,
      summary: `${reasoningPacketContract.packetCount} public packet(s), ${reasoningPacketContract.supportedFilters.length} filter(s).`,
    },
    {
      blockers: provenanceValidation.blockers.length,
      family: "Evidence",
      href: "/api/moral-trade/provenance/schema",
      label: "Provenance schema",
      status: provenanceValidation.status,
      summary: `${provenanceContract.persistenceTables.length} append-only table contract(s), ${provenanceContract.validationRules.length} validation rule(s).`,
    },
    {
      blockers: matchSignalValidation.blockers.length,
      family: "Privacy and matching",
      href: "/api/moral-trade/match-signal/contract",
      label: "Match signal",
      status: matchSignalValidation.status,
      summary: `${matchSignalContract.approvedFactorCodes.length} approved factor code(s), preview-only stateMutation false.`,
    },
    {
      blockers: disclosureValidation.blockers.length,
      family: "Privacy and matching",
      href: "/api/moral-trade/disclosure/contract",
      label: "Disclosure grants",
      status: disclosureValidation.status,
      summary: `${disclosureContract.disclosureFields.length} field boundary(s), ${disclosureContract.searchPrivacyControls.length} search privacy control(s).`,
    },
    {
      blockers: privateOverlapValidation.blockers.length,
      family: "Privacy and matching",
      href: "/api/moral-trade/private-overlap/contract",
      label: "Private overlap guardrail",
      status: privateOverlapValidation.status,
      summary: `${privateOverlapContract.releaseState.replaceAll("_", " ")}; live endpoints remain ${privateOverlapContract.liveEndpointEnabled ? "enabled" : "blocked"}.`,
    },
    {
      blockers: challengeAppealValidation.blockers.length,
      family: "Challenge and remedy",
      href: "/api/moral-trade/challenge-appeal/contract",
      label: "Challenge appeal",
      status: challengeAppealValidation.status,
      summary: `${challengeAppealContract.appealTriggers.length} appeal trigger(s), ${challengeAppealContract.standingCategories.length} standing category/categories.`,
    },
    {
      blockers: externalityValidation.blockers.length,
      family: "Challenge and remedy",
      href: "/api/moral-trade/externality/health",
      label: "Externality health",
      status: externalityValidation.status,
      summary: `${externalityProfile.triggerCodes.length} trigger code(s), ${externalityProfile.reviewStandards.length} review standard(s).`,
    },
    {
      blockers: evaluationValidation.blockers.length,
      family: "Evaluation",
      href: "/api/moral-trade/evaluation/health",
      label: "Evaluation health",
      status: evaluationValidation.status,
      summary: `${evaluationProfile.metrics.length} metric(s), ${evaluationProfile.promotionGates.length} promotion gate(s).`,
    },
    {
      blockers: transparencyReportValidation.blockers.length,
      family: "Evaluation",
      href: "/api/moral-trade/transparency/report",
      label: "Transparency report",
      status: transparencyReportValidation.status,
      summary: `${transparencyReportContract.metricDefinitions.length} aggregate metric(s), minimum public count ${transparencyReportContract.minimumPublicCount}.`,
    },
    {
      blockers: operationsValidation.blockers.length,
      family: "Operations",
      href: "/api/moral-trade/operations/health",
      label: "Operations health",
      status: operationsValidation.status,
      summary: `${operationsProfile.rateLimitSurfaces.length} rate-limit surface(s), ${operationsProfile.retentionControls.length} retention control(s).`,
    },
    {
      blockers: securityValidation.blockers.length,
      family: "Operations",
      href: "/api/moral-trade/security/health",
      label: "Security health",
      status: securityValidation.status,
      summary: `${securityProfile.controls.length} control(s), ${securityProfile.scaleGates.length} sensitive-scale gate(s).`,
    },
    {
      blockers: incidentResponseValidation.blockers.length,
      family: "Operations",
      href: "/api/moral-trade/incident-response/health",
      label: "Incident response",
      status: incidentResponseValidation.status,
      summary: `${incidentResponseProfile.incidentCategories.length} incident category/categories, ${incidentResponseProfile.readinessGates.length} readiness gate(s).`,
    },
    {
      blockers: performanceValidation.blockers.length,
      family: "Operations",
      href: "/api/moral-trade/performance/health",
      label: "Performance health",
      status: performanceValidation.status,
      summary: `${performanceProfile.metricTargets.length} metric target(s), ${performanceProfile.routeFamilies.length} route family/families.`,
    },
    {
      blockers: aiGovernanceValidation.blockers.length,
      family: "AI governance",
      href: "/api/moral-trade/ai-governance/health",
      label: "AI governance",
      status: aiGovernanceValidation.status,
      summary: `${aiGovernanceProfile.documentationTemplates.length} documentation template(s), ${aiGovernanceProfile.prohibitedUses.length} prohibited use(s).`,
    },
  ] as const;
  const publicContractPassCount = publicContractReadiness.filter(
    (entry) => entry.status === "pass",
  ).length;
  const publicContractRouteSet = new Set<string>(
    publicContractReadiness.map((entry) => entry.href),
  );
  const unlistedCanonicalRoutes =
    documentCoverageProfile.canonicalInstruction.routeEvidence.filter(
      (route) => !publicContractRouteSet.has(route),
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
            { href: "/what-is-moral-trade", label: "Moral trade" },
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
              <Link className="button button-secondary" href="/api/moral-trade/schemas">
                View schema registry
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/data-model/contract">
                View data model
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/policy-bundle/contract">
                View policy bundle
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/copilot/contract">
                View copilot contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/match-signal/contract">
                View match contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/challenge-appeal/contract">
                View appeal contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/disclosure/contract">
                View disclosure contract
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/review-workflow/contract">
                View review workflow
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/reasoning/packets">
                View reasoning packets
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/operations/health">
                View operations health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/security/health">
                View security health
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/incident-response/health">
                View incident response
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
              <Link className="button button-secondary" href="/api/moral-trade/document-coverage/health">
                View document coverage
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
        <section className="section section-white" aria-labelledby="document-coverage-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Document coverage contract</p>
            <h2 id="document-coverage-heading">
              The improvement report is mapped to validator evidence.
            </h2>
            <p>
              The source Markdown and PDF are hash-checked, and the report testing plan is now
              mapped as schema, policy, evidence, privacy, fairness, UX, and resilience coverage
              before any broad completion claim is made.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">
                Document coverage {documentCoverageProfile.version}
              </p>
              <h3>Status {documentCoverageValidation.status}</h3>
              <p>
                {documentCoverageValidation.checks.length} check(s),{" "}
                {documentCoverageValidation.sourceDocumentCount} source document(s),{" "}
                {documentCoverageValidation.testingPlanLayerCount} testing-plan layer(s),{" "}
                {documentCoverageEvidencePhraseCount} implementation phrase gate(s).
              </p>
            </div>
            <Link
              className="button button-secondary"
              href="/api/moral-trade/document-coverage/health"
            >
              Open coverage JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Source artifacts</h3>
              <ul className="clean-list">
                {documentCoverageValidation.sourceDocumentArtifacts.map((artifact) => (
                  <li key={artifact.key}>
                    {artifact.key}: {artifact.hashMatches ? "hash matched" : "hash blocked"}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Testing plan coverage</h3>
              <ul className="clean-list">
                {documentCoverageProfile.testingPlanCoverage.map((layer) => (
                  <li key={layer.key}>{layer.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Recommended source stack</h3>
              <p>
                {documentCoverageProfile.sourceStackReferences.length} source family mappings
                connect Ord, product commitments, due diligence, provenance, AI governance, and
                HCI guidance to code and public routes.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Requirement phrase gates</h3>
              <ul className="clean-list">
                {documentCoverageProfile.requirements.map((requirement) => (
                  <li key={requirement.key}>
                    {requirement.label}: {requirement.requiredEvidencePhrases.length} phrase
                    gate(s)
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Canonical gates</h3>
              <ul className="clean-list">
                {documentCoverageProfile.canonicalInstruction.verificationCommands.map((command) => (
                  <li key={command}>{command}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="public-contract-matrix-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Public readiness matrix</p>
            <h2 id="public-contract-matrix-heading">
              Every canonical contract route is visible before readiness is claimed.
            </h2>
            <p>
              The build instruction lists the required public contract routes. This matrix keeps
              the user-facing spec aligned with that list so transparency, private-overlap
              guardrails, privacy, operations, and evaluation evidence are not hidden behind
              scattered JSON links.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Canonical public contracts</p>
              <h3>
                {publicContractPassCount}/{publicContractReadiness.length} route checks passing
              </h3>
              <p>
                {unlistedCanonicalRoutes.length
                  ? `${unlistedCanonicalRoutes.length} canonical route(s) still need a visible row.`
                  : "All canonical public contract routes have a visible readiness row."}
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/health">
              Open combined health JSON
            </Link>
          </div>
          <div className="mpgf-table protocol-check-table">
            <div className="mpgf-table-row mpgf-table-head">
              <span>Family</span>
              <span>Route</span>
              <span>Status</span>
              <span>Published evidence</span>
            </div>
            {publicContractReadiness.map((entry) => (
              <div className="mpgf-table-row" key={entry.href}>
                <span>{entry.family}</span>
                <span>
                  <Link className="inline-link" href={entry.href}>
                    {entry.label}
                  </Link>
                </span>
                <span>
                  {entry.status} ({entry.blockers} blocker(s))
                </span>
                <span>{entry.summary}</span>
              </div>
            ))}
          </div>
          <p className="panel-note">
            This matrix is repository validation evidence. It does not claim production liquidity,
            legal or tax treatment, payment custody, zero security risk, or objective moral
            endorsement.
          </p>
        </section>

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
              <h3>Decision pipeline</h3>
              <ul className="clean-list">
                {profile.decisionPipeline.map((step) => (
                  <li key={step.key}>
                    {step.label}: {step.failureStatus.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
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

        <section className="section section-white" aria-labelledby="data-model-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Data model contract</p>
            <h2 id="data-model-contract-heading">
              Core entities, privacy classes, and relationships are validator-backed.
            </h2>
            <p>
              The audit named the core Moral Trade objects explicitly: participants, profiles,
              offers, source notes, saved searches, privacy grants, evidence records, disputes,
              payment updates, notifications, and agreement events. This contract makes those
              entities inspectable and binds them to public privacy and relationship boundaries.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Data model {dataModelProfile.version}</p>
              <h3>Status {dataModelValidation.status}</h3>
              <p>
                {dataModelValidation.checks.length} check(s),{" "}
                {dataModelValidation.blockers.length} blocker(s),{" "}
                {dataModelProfile.entities.length} entity contract(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/data-model/contract">
              Open data model JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Offer fields</h3>
              <ul className="clean-list">
                {dataModelProfile.offerRequiredFields.map((field) => (
                  <li key={field}>{field.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Privacy classes</h3>
              <ul className="clean-list">
                {dataModelProfile.privacyClasses.slice(0, 6).map((privacyClass) => (
                  <li key={privacyClass.key}>{privacyClass.key.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Relationship boundaries</h3>
              <ul className="clean-list">
                {dataModelProfile.relationshipBoundaries.map((boundary) => (
                  <li key={boundary.key}>{boundary.key.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {dataModelProfile.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {dataModelProfile.entities.map((entity) => (
              <article className="panel data-card" key={entity.key}>
                <p className="detail-kicker">{entity.category}</p>
                <h3>{entity.label}</h3>
                <p>{entity.publicExposure}</p>
                <p>{entity.requiredFields.length} required field(s).</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="policy-bundle-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Policy bundle contract</p>
            <h2 id="policy-bundle-contract-heading">
              Copilot inputs are concrete registries, not broad application context.
            </h2>
            <p>
              The audit recommends a strict input bundle for any drafting or reviewer-summary
              assistance. This contract publishes the policy registry, prohibited-pattern registry,
              factor-code dictionary, verification-method taxonomy, redaction policy, already
              submitted evidence metadata boundary, and fixed verification loop used before any
              draft can be treated as matchable.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Policy bundle {policyBundleContract.version}</p>
              <h3>Status {policyBundleValidation.status}</h3>
              <p>
                {policyBundleValidation.checks.length} check(s),{" "}
                {policyBundleValidation.blockers.length} blocker(s),{" "}
                {policyBundleContract.prohibitedPatternRegistry.length} prohibited pattern
                code(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/policy-bundle/contract">
              Open policy bundle JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Strict input bundle</h3>
              <ul className="clean-list">
                {policyBundleContract.strictInputBundle.slice(0, 8).map((entry) => (
                  <li key={entry}>{entry.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Prohibited patterns</h3>
              <ul className="clean-list">
                {policyBundleContract.prohibitedPatternRegistry.map((entry) => (
                  <li key={entry.code}>{entry.code.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Evidence metadata boundary</h3>
              <p>
                The copilot review route accepts only redacted metadata for already submitted
                evidence. Raw artifacts, private notes, contact details, and exact wishes are
                rejected before they can enter a reviewer-summary packet.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Verification methods</h3>
              <ul className="clean-list">
                {policyBundleContract.verificationMethodTaxonomy.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Redaction policy</h3>
              <ul className="clean-list">
                {policyBundleContract.redactionPolicy.slice(0, 6).map((entry) => (
                  <li key={entry.key}>{entry.key.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {policyBundleContract.verificationLoop.map((step) => (
              <article className="panel data-card" key={step.key}>
                <p className="detail-kicker">{step.key}</p>
                <h3>{step.label}</h3>
                <p>
                  {step.blocksMatchable
                    ? "Blocks matchable status until resolved."
                    : "Routes, explains, or records without granting reliance."}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="release-gate-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Release gate contract</p>
            <h2 id="release-gate-contract-heading">
              Payable and reliance-bearing states fail closed unless first-class gate evidence passes.
            </h2>
            <p>
              Moraltrade60 requires policy snapshots, state interpretation, feature flags, and
              release-gate requirement results to be reviewable subjects. This contract makes
              missing, stale, unknown, under-review, or mutable states block launch unless a frozen
              policy snapshot explicitly marks a control not required for the current stage.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Release gates {releaseGateContract.version}</p>
              <h3>Status {releaseGateValidation.status}</h3>
              <p>
                {releaseGateValidation.checks.length} check(s),{" "}
                {releaseGateValidation.blockers.length} blocker(s),{" "}
                {releaseGateContract.firstClassRecordTables.length} first-class record table(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/release-gates/contract">
              Open release gate JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Stage flags</h3>
              <ul className="clean-list">
                {releaseGateContract.stages.map((stage) => (
                  <li key={stage.key}>
                    {stage.key.replaceAll("_", " ")}: {stage.featureFlagKey}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>First-class records</h3>
              <ul className="clean-list">
                {releaseGateContract.firstClassRecordTables.map((table) => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Privileged actions</h3>
              <ul className="clean-list">
                {releaseGateContract.privilegedActionKeys.slice(0, 7).map((action) => (
                  <li key={action}>{action.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>State interpretation</h3>
              <p>{releaseGateContract.stateInterpretationRule}</p>
            </article>
          </div>
          <div className="data-grid">
            {releaseGateContract.requirementDefinitions.slice(0, 8).map((requirement) => (
              <article className="panel data-card" key={requirement.key}>
                <p className="detail-kicker">{requirement.category}</p>
                <h3>{requirement.label}</h3>
                <p>{requirement.description}</p>
              </article>
            ))}
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
            <p>
              The match inbox turns those codes into participant-facing reason labels, trust badges,
              risk badges, and next safe actions so suggestions can be declined, reported, or moved
              toward consent without exposing exact wishes.
            </p>
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

        <section className="section section-white" aria-labelledby="match-signal-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Match signal contract</p>
            <h2 id="match-signal-contract-heading">
              Redacted profile matching is preview-only and human-reviewed.
            </h2>
            <p>
              The matching contract uses only broad cause areas, trade modes, verification
              preferences, location sensitivity, privacy stage, and stated exclusions. It never
              infers hidden preferences or authorizes disclosure, contact, reliance, or state
              changes.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Match signal {matchSignalContract.version}</p>
              <h3>Status {matchSignalValidation.status}</h3>
              <p>
                {matchSignalValidation.checks.length} check(s),{" "}
                {matchSignalValidation.blockers.length} blocker(s),{" "}
                {matchSignalContract.approvedFactorCodes.length} factor code(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/match-signal/contract">
              Open match contract JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Input boundary</h3>
              <ul className="clean-list">
                {matchSignalContract.requiredInputFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Redacted fields</h3>
              <ul className="clean-list">
                {matchSignalContract.redactedFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Evaluation route</h3>
              <p>
                POST /api/moral-trade/match-signal/evaluate returns redacted factor codes,
                blockers, confidence band, participant explanation copy, redacted fields, and
                humanReviewRequired with stateMutation false.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Participant explanation</h3>
              <p>{matchSignalContract.participantExplanationTemplate.matchableSummary}</p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {matchSignalContract.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {matchSignalContract.invariants.map((invariant) => (
              <article className="panel data-card" key={invariant}>
                <p className="detail-kicker">Match invariant</p>
                <p>{invariant}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="challenge-appeal-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Challenge appeal contract</p>
            <h2 id="challenge-appeal-contract-heading">
              Appeals are scoped to reviewed claims, standing, and remedy paths.
            </h2>
            <p>
              The challenge lane is now a validator-backed contract. It separates affected-party
              standing, duplicate proof, coercive baselines, wrong-scope evidence, privacy
              disclosure errors, externality remedy gaps, reviewer conflicts, and policy flags
              before any human-controlled state change.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">
                Challenge appeal {challengeAppealContract.version}
              </p>
              <h3>Status {challengeAppealValidation.status}</h3>
              <p>
                {challengeAppealValidation.checks.length} check(s),{" "}
                {challengeAppealValidation.blockers.length} blocker(s),{" "}
                {challengeAppealContract.appealTriggers.length} trigger(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/challenge-appeal/contract">
              Open appeal contract JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Subjects</h3>
              <ul className="clean-list">
                {challengeAppealContract.subjects.map((subject) => (
                  <li key={subject}>{subject.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Standing categories</h3>
              <ul className="clean-list">
                {challengeAppealContract.standingCategories.map((standing) => (
                  <li key={standing}>{standing.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Evaluation route</h3>
              <p>
                POST /api/moral-trade/challenge-appeal/evaluate returns scoped factor codes,
                standing checks, required artifacts, privacy actions, provenance activity, and
                stateMutation false. Requested outcomes are advisory and must match the appeal
                trigger before reviewers can route them.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {challengeAppealContract.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {challengeAppealContract.invariants.map((invariant) => (
              <article className="panel data-card" key={invariant}>
                <p className="detail-kicker">Appeal invariant</p>
                <p>{invariant}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="disclosure-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Disclosure grant contract</p>
            <h2 id="disclosure-contract-heading">
              Privacy grants now have a staged, field-level contract.
            </h2>
            <p>
              The privacy model is no longer only dashboard prose. Broad previews, exact wishes,
              source summaries, constraints, verification preferences, and contact details are
              mapped to explicit access levels, audience stages, redactions, owner approval, and
              non-mutating evaluation.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Disclosure grants {disclosureContract.version}</p>
              <h3>Status {disclosureValidation.status}</h3>
              <p>
                {disclosureValidation.checks.length} check(s),{" "}
                {disclosureValidation.blockers.length} blocker(s),{" "}
                {disclosureContract.disclosureFields.length} field boundary(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/disclosure/contract">
              Open disclosure contract JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Audience stages</h3>
              <ul className="clean-list">
                {disclosureContract.audienceStages.map((stage) => (
                  <li key={stage}>{stage.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Access levels</h3>
              <ul className="clean-list">
                {disclosureContract.accessLevels.map((level) => (
                  <li key={level}>{level.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Evaluation route</h3>
              <p>
                POST /api/moral-trade/disclosure/evaluate returns allowed fields, denied fields,
                privacy actions, expiry window, ownerApprovalRequired, and stateMutation false.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Redacted fields</h3>
              <ul className="clean-list">
                {disclosureContract.redactedFields.map((field) => (
                  <li key={field}>{field.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Search privacy controls</h3>
              <ul className="clean-list">
                {disclosureContract.searchPrivacyControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {disclosureContract.disclosureFields.map((field) => (
              <article className="panel data-card" key={field.key}>
                <p className="detail-kicker">{field.key}</p>
                <h3>{field.label}</h3>
                <p>{field.description}</p>
                <p>
                  {field.minStage} stage, max {field.maxLevel} access.
                </p>
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
              <p>
                {reviewWorkflowContract.policyEnforcedWorkflow.length} policy-enforced workflow
                step(s), {reviewWorkflowContract.reviewStateOutcomes.length} review-state
                outcome(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/review-workflow/contract">
              Open review workflow JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Workflow path</h3>
              <ol className="clean-list">
                {reviewWorkflowContract.policyEnforcedWorkflow.slice(0, 8).map((step) => (
                  <li key={step.key}>
                    {step.label} - {step.enforcement.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Review outcomes</h3>
              <ul className="clean-list">
                {reviewWorkflowContract.reviewStateOutcomes.map((outcome) => (
                  <li key={outcome}>{outcome.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
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
            <article className="panel protocol-contract-card">
              <h3>Participant copy</h3>
              <p>{reviewWorkflowContract.participantCopyTemplates.baselineHelperText}</p>
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

        <section className="section section-white" aria-labelledby="reasoning-packet-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Reasoning packet contract</p>
            <h2 id="reasoning-packet-contract-heading">
              The Reasoning Center publishes structured packets, not hidden reasoning.
            </h2>
            <p>
              Public packets are derived from canonical worked examples and expose only structured
              summaries, cited evidence rows, step-by-step decision gates, uncertainty flags,
              reviewer scope, factor codes, and the next human-controlled step. The packet route is
              validator-backed, supports the same public status filters as the Reasoning Center,
              and does not export live private offers.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">
                Reasoning packets {reasoningPacketContract.version}
              </p>
              <h3>Status {reasoningPacketValidation.status}</h3>
              <p>
                {reasoningPacketValidation.checks.length} check(s),{" "}
                {reasoningPacketValidation.blockers.length} blocker(s),{" "}
                {reasoningPacketContract.packetCount} public packet(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/reasoning/packets">
              Open packet JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Required packet fields</h3>
              <ul className="clean-list">
                {reasoningPacketContract.requiredPacketFields.slice(0, 8).map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Linked contracts</h3>
              <ul className="clean-list">
                <li>
                  Review workflow:{" "}
                  {reasoningPacketContract.linkedContracts.reviewWorkflowContractVersion}
                </li>
                <li>
                  Provenance:{" "}
                  {reasoningPacketContract.linkedContracts.provenanceSchemaVersion}
                </li>
                <li>
                  Provenance sample:{" "}
                  {reasoningPacketContract.linkedContracts.provenanceSampleBundleStatus}
                </li>
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Decision steps</h3>
              <ul className="clean-list">
                {reasoningPacketContract.samplePackets[0]?.decisionSteps.slice(0, 4).map((step) => (
                  <li key={step.key}>
                    {step.status}: {step.label}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Public filters</h3>
              <p>
                The packet API accepts the same status facet as the Reasoning Center, for example{" "}
                <code>/api/moral-trade/reasoning/packets?status=needs-evidence</code>.
              </p>
              <ul className="clean-list">
                {reasoningPacketContract.supportedFilters.map((filter) => (
                  <li key={filter.key}>
                    <Link href={filter.href}>{filter.label}</Link>:{" "}
                    {reasoningPacketContract.filterCounts[filter.key]} packet(s)
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Contract tests</h3>
              <ul className="clean-list">
                {reasoningPacketContract.contractTests.map((hook) => (
                  <li key={hook}>{hook.replaceAll("_", " ")}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="data-grid">
            {reasoningPacketContract.invariants.map((invariant) => (
              <article className="panel data-card" key={invariant}>
                <p className="detail-kicker">Packet invariant</p>
                <p>{invariant}</p>
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
            <article className="panel protocol-contract-card">
              <h3>Matchability gate</h3>
              <p>
                <code>validateMoralTradeCopilotOutput</code> rejects <code>matchable</code> output
                unless every blocking verification step has status <code>pass</code>.
              </p>
              <ul className="clean-list">
                {copilotBlockingVerificationSteps.map((step) => (
                  <li key={step.key}>{step.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Prompt template registry</h3>
              <ul className="clean-list">
                {copilotContract.promptTemplates.map((template) => (
                  <li key={template.key}>{template.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Rollout readiness gates</h3>
              <ul className="clean-list">
                {copilotRolloutReadiness.map((audit) => (
                  <li key={audit.targetStage}>
                    {audit.targetStage.replaceAll("_", " ")}: {audit.status}
                  </li>
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
          <div className="data-grid">
            {copilotRolloutReadiness.map((audit) => (
              <article className="panel data-card" key={audit.targetStage}>
                <p className="detail-kicker">Rollout readiness</p>
                <h3>{audit.targetStage.replaceAll("_", " ")}</h3>
                <p>
                  Status {audit.status}; {audit.requiredSignals.length} required signal(s),{" "}
                  {audit.allowedTasks.length} allowed task(s), {audit.blockers.length} blocker(s).
                </p>
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
              privacy/session controls, email-outbox safety gates, retention lifecycle boundaries,
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
            <article className="panel protocol-contract-card">
              <h3>Privacy/session controls</h3>
              <ul className="clean-list">
                {operationsProfile.privacyAndSessionControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Retention lifecycle</h3>
              <ul className="clean-list">
                {operationsProfile.retentionControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
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
            <article className="panel protocol-contract-card">
              <h3>Route recovery manifest</h3>
              <p>
                Status {routeRecoveryAudit.status}; {routeRecoveryAudit.coveredRouteCount}/
                {routeRecoveryAudit.routeCount} route(s) covered, recovery ratio{" "}
                {routeRecoveryAudit.coverageRatio}.
              </p>
              <ul className="clean-list">
                {routeRecoveryAudit.entries
                  .filter((entry) => entry.evidenceFile)
                  .map((entry) => (
                    <li key={`${entry.path}-${entry.evidenceFile}`}>
                      {entry.path}: {entry.evidenceFile}
                    </li>
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

        <section className="section section-subtle" aria-labelledby="incident-response-contract-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Incident response contract</p>
            <h2 id="incident-response-contract-heading">
              Incident intake, disclosure, and reopening rules are validator-backed.
            </h2>
            <p>
              The report flagged incident response as a scale prerequisite. This profile publishes
              the public incident lane: intake channels, severity SLAs, containment phases,
              affected-participant notices, aggregate public updates, validator backlog updates,
              and privacy-safe non-claims.
            </p>
          </div>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">
                Incident response {incidentResponseProfile.version}
              </p>
              <h3>Status {incidentResponseValidation.status}</h3>
              <p>
                {incidentResponseValidation.checks.length} check(s),{" "}
                {incidentResponseValidation.blockers.length} blocker(s),{" "}
                {incidentResponseProfile.readinessGates.length} readiness gate(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/incident-response/health">
              Open incident response JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Incident categories</h3>
              <ul className="clean-list">
                {incidentResponseProfile.incidentCategories.map((category) => (
                  <li key={category.key}>
                    {category.label}: {category.owner.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Severity SLAs</h3>
              <ul className="clean-list">
                {incidentResponseProfile.severityLevels.map((severity) => (
                  <li key={severity.key}>
                    {severity.label}: response {severity.responseSlaHours}h, notice{" "}
                    {severity.notificationSlaHours}h
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Readiness gates</h3>
              <ul className="clean-list">
                {incidentResponseProfile.readinessGates.map((gate) => {
                  const readiness = auditMoralTradeIncidentReadinessGate({
                    gateKey: gate.key,
                    profile: incidentResponseProfile,
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
            {incidentResponseProfile.disclosureRules.map((rule) => (
              <article className="panel data-card" key={rule.key}>
                <p className="detail-kicker">{rule.key}</p>
                <h3>{rule.label}</h3>
                <p>{rule.rule}</p>
              </article>
            ))}
          </div>
          <div className="data-grid">
            {incidentResponseProfile.publicNonClaims.map((nonClaim) => (
              <article className="panel data-card" key={nonClaim}>
                <p className="detail-kicker">Incident non-claim</p>
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
              <h3>Sample surfacing parity audit</h3>
              <p>
                Status {evaluationSampleAudits.surfacingParityAudit.status};{" "}
                {evaluationSampleAudits.surfacingParityAudit.eligibleCount} eligible,{" "}
                {evaluationSampleAudits.surfacingParityAudit.surfacedCount} surfaced, overall
                rate {evaluationSampleAudits.surfacingParityAudit.overallSurfacingRate};{" "}
                {evaluationSampleAudits.surfacingParityAudit.reviewedDeviationCount} reviewed
                deviation(s),{" "}
                {evaluationSampleAudits.surfacingParityAudit.unreviewedDeviationCount} unreviewed.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Sample UX readiness audit</h3>
              <p>
                Status {evaluationSampleAudits.uxReadinessAudit.status}; current period{" "}
                {evaluationSampleAudits.uxReadinessAudit.currentPeriod}, previous period{" "}
                {evaluationSampleAudits.uxReadinessAudit.previousPeriod}, blockers{" "}
                {evaluationSampleAudits.uxReadinessAudit.blockers.length}.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Executable audit check</h3>
              <p>
                The validator includes a sample-audits check so fairness, UX, and workflow quality
                audit code must execute successfully before the evaluation contract reports pass.
                Material surfacing parity deviations need a redacted review-log entry before they
                count as reviewed.
              </p>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Sample workflow quality audit</h3>
              <p>
                Status {evaluationSampleAudits.workflowQualityAudit.status}; blocked precision{" "}
                {evaluationSampleAudits.workflowQualityAudit.blockedProposalPrecision}, false
                match rate {evaluationSampleAudits.workflowQualityAudit.falseMatchRate}, human
                overrule rate {evaluationSampleAudits.workflowQualityAudit.humanOverruleRate},
                reason coverage{" "}
                {evaluationSampleAudits.workflowQualityAudit.overruleReasonCoverageRate}.
              </p>
            </article>
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
              <h3>Trigger-standard matrix</h3>
              <ul className="clean-list">
                {externalityProfile.triggerStandardMatrix.slice(0, 5).map((entry) => (
                  <li key={entry.triggerCode}>
                    {entry.triggerCode.replaceAll("_", " ")}:{" "}
                    {entry.requiredStandards.join(", ")}
                  </li>
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
                {aiGovernanceProfile.decisioningMode.replaceAll("_", " ")},{" "}
                {aiGovernanceProfile.sampleDocumentationPackets.length} sample documentation
                packet(s).
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
              <h3>Documentation templates</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.documentationTemplates.map((template) => (
                  <li key={template.key}>
                    {template.label}: {template.requiredFields.length} required fields; redacts{" "}
                    {template.redactedFields.slice(0, 2).join(" and ")}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Sample documentation packets</h3>
              <ul className="clean-list">
                {aiGovernanceProfile.sampleDocumentationPackets.map((packet) => (
                  <li key={packet.key}>
                    {packet.key.replaceAll("_", " ")}: {packet.reviewerStatus.replaceAll("_", " ")}
                  </li>
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
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Schema registry {schemaRegistry.version}</p>
              <h3>Status {schemaRegistryValidation.status}</h3>
              <p>
                {schemaRegistryValidation.checks.length} check(s),{" "}
                {schemaRegistryValidation.blockers.length} blocker(s),{" "}
                {schemaRegistry.schemaDocuments.length} public schema document(s), including the
                core data-model and public offer listing schemas;{" "}
                {schemaRegistrySampleCount} public payload sample(s) checked,{" "}
                {schemaRegistrySampleFailureCount} sample failure(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/schemas">
              Open schema registry JSON
            </Link>
          </div>
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>Public schema documents</h3>
              <ul className="clean-list">
                {schemaRegistry.schemaDocuments.map((schema) => (
                  <li key={schema.key}>
                    <Link href={schema.publicPath}>{schema.slug}</Link>:{" "}
                    {schema.topLevelRequiredFields.length} required top-level field(s),{" "}
                    {schema.sampleValidationCount} sample validation(s),{" "}
                    {schema.sampleValidationFailureCount} sample failure(s)
                  </li>
                ))}
              </ul>
            </article>
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
            <h2 id="provenance-schema-heading">
              Claims now have typed artifacts, traceability events, review records, and state
              changes.
            </h2>
            <p>
              The provenance layer uses fixed object schemas so duplicate proof, wrong-scope
              evidence, stale artifacts, missing agents, external entity dedupe failures, and
              external payment or charity-routing events without what/where/why links can be caught,
              while state transitions carry immutable event hashes before any reviewed completion
              claim is published.
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
              <h3>Append-only storage</h3>
              <p>
                {provenanceContract.persistenceTables.length} owner-scoped table(s) persist
                artifacts, claims, agents, activities, external references, traceability events,
                and state transitions.
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
            {provenanceContract.persistenceTables.slice(0, 6).map((table) => (
              <article className="panel protocol-contract-card" key={table.table}>
                <p className="detail-kicker">{table.objectSchemaKey}</p>
                <h3>{table.table}</h3>
                <p>{table.accessModel}</p>
              </article>
            ))}
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
