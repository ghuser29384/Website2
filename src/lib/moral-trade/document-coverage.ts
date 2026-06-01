import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const MORAL_TRADE_DOCUMENT_COVERAGE_VALIDATOR_VERSION =
  "moral-trade-document-coverage-validator-v0.6";

export type MoralTradeDocumentSource = {
  key: string;
  label: string;
  path: string;
  required: boolean;
  expectedSha256: string;
  requiredPhrases: string[];
};

export type MoralTradeDocumentRequirement = {
  key: string;
  label: string;
  recommendation: string;
  sourceDocumentKeys: string[];
  evidenceFiles: string[];
  requiredEvidencePhrases: string[];
  testFiles: string[];
  routeEvidence: string[];
};

export type MoralTradeCanonicalInstruction = {
  path: string;
  requiredPhrases: string[];
  verificationCommands: string[];
  routeEvidence: string[];
};

export type MoralTradeRecommendedSourceReference = {
  key: string;
  priority: "highest" | "high" | "medium_high" | "medium";
  source: string;
  guidance: string;
  evidenceFiles: string[];
  routeEvidence: string[];
};

export type MoralTradeTestingPlanLayer = {
  key: string;
  label: string;
  passCondition: string;
  evidenceFiles: string[];
  testFiles: string[];
  routeEvidence: string[];
};

export type MoralTradeDocumentCoverageProfile = {
  version: string;
  purpose: string;
  sourceDocuments: MoralTradeDocumentSource[];
  canonicalInstruction: MoralTradeCanonicalInstruction;
  sourceStackReferences: MoralTradeRecommendedSourceReference[];
  testingPlanCoverage: MoralTradeTestingPlanLayer[];
  requirements: MoralTradeDocumentRequirement[];
  nonClaims: string[];
};

export type MoralTradeDocumentCoverageCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
};

export type MoralTradeSourceDocumentArtifact = {
  key: string;
  path: string;
  artifactHash: string | null;
  expectedHash: string;
  present: boolean;
  hashMatches: boolean;
};

export type MoralTradeDocumentCoverageValidation = {
  status: "pass" | "fail";
  validatorName: "moral-trade-document-coverage";
  validatorVersion: string;
  profileVersion: string;
  sourceDocumentCount: number;
  sourceStackCount: number;
  testingPlanLayerCount: number;
  requirementCount: number;
  sourceDocumentArtifacts: MoralTradeSourceDocumentArtifact[];
  canonicalInstructionHash: string | null;
  checks: MoralTradeDocumentCoverageCheck[];
  blockers: string[];
};

function rootPath(filePath: string) {
  return path.join(process.cwd(), filePath);
}

function fileExists(filePath: string) {
  return existsSync(rootPath(filePath));
}

function readTextIfExists(filePath: string) {
  const absolutePath = rootPath(filePath);

  if (!existsSync(absolutePath)) {
    return null;
  }

  return readFileSync(absolutePath, "utf8");
}

function hashFileIfExists(filePath: string) {
  const absolutePath = rootPath(filePath);

  if (!existsSync(absolutePath)) {
    return null;
  }

  return `sha256:${createHash("sha256").update(readFileSync(absolutePath)).digest("hex")}`;
}

function hashText(text: string) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeDocumentCoverageCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

const REQUIRED_RECOMMENDED_SOURCE_STACK_KEYS = [
  "toby_ord_moral_trade",
  "moraltrade_public_materials",
  "oecd_due_diligence",
  "un_guiding_principles",
  "ilo_principles",
  "eti_fairtrade_standards",
  "open_supply_hub",
  "w3c_prov",
  "gs1_epcis",
  "nist_ai_rmf_xai",
  "fairness_and_ml_docs",
  "human_ai_interaction",
] as const;

const REQUIRED_TESTING_PLAN_LAYER_KEYS = [
  "schema_tests",
  "policy_tests",
  "evidence_tests",
  "privacy_tests",
  "fairness_tests",
  "ux_tests",
  "resilience_tests",
] as const;

export const moralTradeDocumentCoverageProfile: MoralTradeDocumentCoverageProfile = {
  version: "moral-trade-document-coverage-v0.7-2026-05",
  purpose:
    "Requirement-to-evidence coverage map for the Moral Trade improvement documents: the public validator suite should show which implementation artifacts answer each recommendation without inventing production evidence.",
  sourceDocuments: [
    {
      key: "moral_trade_feature_audit_markdown",
      label: "Improving the Moral Trade Feature at MoralTrade.org markdown",
      path: "moral trade4.md",
      required: true,
      expectedSha256:
        "sha256:8d9c8cc38efcc51011306b93019a400c0236af9aa1c8989444e45744fde6cd11",
      requiredPhrases: [
        "formalize the core moral-trade data model and public validator suite",
        "instrumented workflow cards",
        "provenance-first evidence objects",
        "schema-bound drafting, critique, and verification copilot",
        "Never rank moral value globally",
        "Evaluation metrics",
      ],
    },
    {
      key: "moral_trade_feature_audit_pdf",
      label: "Improving the Moral Trade Feature at MoralTrade.org PDF",
      path: "Improving the Moral Trade Feature at MoralTrade.org.pdf",
      required: true,
      expectedSha256:
        "sha256:c006e0c0bfcb915b45585c24d39a4216ac1e61721bf24e12d859240240b0f509",
      requiredPhrases: [],
    },
  ],
  canonicalInstruction: {
    path: "docs/moral-trade/codex-build-instruction.md",
    requiredPhrases: [
      "Core Moral Trade Codex Build Instruction",
      "canonical repository instruction",
      "validator-backed, privacy-preserving, reviewable product behavior",
      "No global platform ranking of moral value.",
      "No autonomous outreach or counterparty disclosure.",
      "No raw private-feed mining.",
      "Matching and copilot output remain factor-code, confidence-band, consent-gated, and human-reviewed.",
      "Required Public Contracts",
      "Required Local Gates",
      "Review Checklist",
      "does not prove live production liquidity",
    ],
    verificationCommands: [
      "node --import tsx --test src/lib/moral-trade/*.test.ts src/lib/background-ai-shadow.test.ts src/lib/background-networking.test.ts src/lib/background-notification-policy.test.ts src/lib/background-notifications.test.ts src/lib/background-privacy-controls.test.ts src/lib/background-explanations.test.ts src/lib/background-opportunity-briefs.test.ts src/lib/background-private-overlap.test.ts src/lib/wish-registry.test.ts src/lib/public-route-smoke.test.ts",
      "npm run lint",
      "git diff --check",
    ],
    routeEvidence: [
      "/api/moral-trade/health",
      "/api/moral-trade/document-coverage/health",
      "/api/moral-trade/api-contract",
      "/api/moral-trade/data-model/contract",
      "/api/moral-trade/schemas",
      "/api/moral-trade/copilot/contract",
      "/api/moral-trade/review-workflow/contract",
      "/api/moral-trade/reasoning/packets",
      "/api/moral-trade/provenance/schema",
      "/api/moral-trade/match-signal/contract",
      "/api/moral-trade/disclosure/contract",
      "/api/moral-trade/challenge-appeal/contract",
      "/api/moral-trade/evaluation/health",
      "/api/moral-trade/operations/health",
      "/api/moral-trade/security/health",
      "/api/moral-trade/performance/health",
      "/api/moral-trade/incident-response/health",
      "/api/moral-trade/externality/health",
      "/api/moral-trade/ai-governance/health",
      "/api/moral-trade/private-overlap/contract",
      "/api/moral-trade/transparency/report",
    ],
  },
  sourceStackReferences: [
    {
      key: "toby_ord_moral_trade",
      priority: "highest",
      source: "amirrorclear.net / Toby Ord, Moral Trade",
      guidance:
        "Default baselines, Pareto improvement, factual trust, counterfactual trust, bargaining, and perverse-incentive controls.",
      evidenceFiles: [
        "src/lib/moral-trade/protocol.ts",
        "src/lib/proposal-review.ts",
        "src/app/anti-threat-baseline/page.tsx",
      ],
      routeEvidence: ["/api/moral-trade/health", "/validation"],
    },
    {
      key: "moraltrade_public_materials",
      priority: "highest",
      source: "MoralTrade.org public materials",
      guidance:
        "Current product commitments, safety boundaries, deterministic matching posture, privacy model, and review-state language remain authoritative.",
      evidenceFiles: [
        "docs/moral-trade/codex-build-instruction.md",
        "src/app/moral-trade/technical-spec/page.tsx",
        "src/lib/moral-trade/api-contract.ts",
      ],
      routeEvidence: [
        "/moral-trade/technical-spec",
        "/api/moral-trade/document-coverage/health",
      ],
    },
    {
      key: "oecd_due_diligence",
      priority: "high",
      source: "OECD Due Diligence Guidance for Responsible Business Conduct",
      guidance:
        "Use the six-step due-diligence process for policy embedding, impact identification, mitigation, tracking, communication, and remediation.",
      evidenceFiles: [
        "config/moral-trade/externality-profile.json",
        "src/lib/moral-trade/externality.ts",
      ],
      routeEvidence: ["/api/moral-trade/externality/health"],
    },
    {
      key: "un_guiding_principles",
      priority: "high",
      source: "UN Guiding Principles on Business and Human Rights",
      guidance:
        "Externality and remedy logic must preserve affected-party standing, human-rights impact review, and remedy paths.",
      evidenceFiles: [
        "config/moral-trade/externality-profile.json",
        "src/lib/moral-trade/challenge-appeal.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/externality/health",
        "/api/moral-trade/challenge-appeal/contract",
      ],
    },
    {
      key: "ilo_principles",
      priority: "high",
      source: "ILO MNE Declaration and Fundamental Principles and Rights at Work",
      guidance:
        "Labor, supplier, pressure, forced-labor, child-labor, discrimination, association, and workplace claims require explicit externality standards.",
      evidenceFiles: [
        "config/moral-trade/externality-profile.json",
        "src/lib/moral-trade/externality.ts",
      ],
      routeEvidence: ["/api/moral-trade/externality/health"],
    },
    {
      key: "eti_fairtrade_standards",
      priority: "high",
      source: "ETI Base Code and Fairtrade Standards",
      guidance:
        "Ethical-trade, destination, producer, and certification-style claims need practical standard gates before reliance.",
      evidenceFiles: [
        "config/moral-trade/externality-profile.json",
        "src/lib/moral-trade/externality.ts",
      ],
      routeEvidence: ["/api/moral-trade/externality/health"],
    },
    {
      key: "open_supply_hub",
      priority: "high",
      source: "Open Supply Hub",
      guidance:
        "Supplier-like external entities need public identifier, deduplication, and traceability discipline.",
      evidenceFiles: [
        "src/lib/moral-trade/provenance.ts",
        "config/moral-trade/externality-profile.json",
      ],
      routeEvidence: [
        "/api/moral-trade/provenance/schema",
        "/api/moral-trade/externality/health",
      ],
    },
    {
      key: "w3c_prov",
      priority: "high",
      source: "W3C PROV",
      guidance:
        "Evidence claims should be represented as entities, activities, agents, traceability events, and scoped claim-artifact links.",
      evidenceFiles: [
        "src/lib/moral-trade/provenance.ts",
        "supabase/migrations/20260529_moral_trade_provenance_persistence.sql",
      ],
      routeEvidence: ["/api/moral-trade/provenance/schema"],
    },
    {
      key: "gs1_epcis",
      priority: "medium_high",
      source: "GS1 EPCIS 2.0",
      guidance:
        "Event-style traceability should keep interoperable what/where/why/agent records for external evidence.",
      evidenceFiles: ["src/lib/moral-trade/provenance.ts"],
      routeEvidence: ["/api/moral-trade/provenance/schema"],
    },
    {
      key: "nist_ai_rmf_xai",
      priority: "high",
      source: "NIST AI RMF 1.0 and NIST XAI principles",
      guidance:
        "Any AI assistance needs governance, explainability, privacy, security, accountability, human control, and documented explanation layers.",
      evidenceFiles: [
        "config/moral-trade/ai-governance-profile.json",
        "src/lib/moral-trade/ai-governance.ts",
        "src/lib/moral-trade/copilot.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/ai-governance/health",
        "/api/moral-trade/copilot/contract",
      ],
    },
    {
      key: "fairness_and_ml_docs",
      priority: "high",
      source:
        "Hardt/Price/Srebro, Kleinberg/Mullainathan/Raghavan, Model Cards, and Datasheets for Datasets",
      guidance:
        "Fairness trade-offs, benchmark slices, model cards, datasheets, and promotion audits are required before any ML scaling.",
      evidenceFiles: [
        "config/moral-trade/evaluation-profile.json",
        "config/moral-trade/ai-governance-profile.json",
        "src/lib/moral-trade/evaluation.ts",
        "src/lib/moral-trade/ai-governance.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/evaluation/health",
        "/api/moral-trade/ai-governance/health",
      ],
    },
    {
      key: "human_ai_interaction",
      priority: "high",
      source: "Amershi et al. and Kulesza et al.",
      guidance:
        "Human-AI interaction should use staged explanation, bounded outputs, reviewer summaries, reversible assistance, and explanatory debugging.",
      evidenceFiles: [
        "config/moral-trade/copilot-contract.json",
        "src/lib/moral-trade/copilot.ts",
        "src/lib/moral-trade/evaluation.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/copilot/contract",
        "/api/moral-trade/evaluation/health",
      ],
    },
  ],
  testingPlanCoverage: [
    {
      key: "schema_tests",
      label: "Schema tests",
      passCondition:
        "No invalid state transitions; no missing required fields enter matchable status.",
      evidenceFiles: [
        "src/lib/moral-trade/protocol.ts",
        "src/lib/moral-trade/data-model.ts",
        "src/lib/moral-trade/schema-registry.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/protocol.test.ts",
        "src/lib/moral-trade/data-model.test.ts",
        "src/lib/moral-trade/schema-registry.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/health",
        "/api/moral-trade/data-model/contract",
        "/api/moral-trade/schemas",
      ],
    },
    {
      key: "policy_tests",
      label: "Policy tests",
      passCondition:
        "Seeded threats, coercion, fraud, illegal asks, doxxing, political-campaign offsets, and escalated-harm fixtures never silently pass.",
      evidenceFiles: [
        "src/lib/moral-trade/policy-bundle.ts",
        "src/lib/moral-trade/copilot.ts",
        "src/lib/proposal-review.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/policy-bundle.test.ts",
        "src/lib/moral-trade/copilot.test.ts",
        "src/lib/proposal-review.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/policy-bundle/contract",
        "/api/moral-trade/copilot/review",
        "/api/moral-trade/review-workflow/evaluate",
      ],
    },
    {
      key: "evidence_tests",
      label: "Evidence tests",
      passCondition:
        "Wrong-scope, duplicate, stale, unhashable, or unreviewed artifacts cannot produce reviewed completion.",
      evidenceFiles: [
        "src/lib/moral-trade/provenance.ts",
        "src/lib/moral-trade/evidence-persistence.ts",
        "src/lib/moral-trade/agreement-write-path.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/provenance.test.ts",
        "src/lib/moral-trade/evidence-persistence.test.ts",
        "src/lib/moral-trade/agreement-write-path.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/provenance/schema",
        "/api/moral-trade/reasoning/packets",
      ],
    },
    {
      key: "privacy_tests",
      label: "Privacy tests",
      passCondition:
        "Exact wish text, sensitive constraints, raw source notes, contact details, and private match text stay out of public cards and analytics.",
      evidenceFiles: [
        "src/lib/moral-trade/disclosure.ts",
        "src/lib/moral-trade/match-signal.ts",
        "src/lib/background-privacy-controls.ts",
        "src/lib/moral-trade/transparency-report.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/disclosure.test.ts",
        "src/lib/moral-trade/match-signal.test.ts",
        "src/lib/background-privacy-controls.test.ts",
        "src/lib/moral-trade/transparency-report.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/disclosure/contract",
        "/api/moral-trade/match-signal/contract",
        "/api/moral-trade/transparency/report",
      ],
    },
    {
      key: "fairness_tests",
      label: "Fairness tests",
      passCondition:
        "Cause-area, geography, mode, privacy-stage, and governed sensitive-attribute surfacing deviations are thresholded, redacted, and reviewed.",
      evidenceFiles: [
        "config/moral-trade/evaluation-profile.json",
        "src/lib/moral-trade/evaluation.ts",
        "src/lib/moral-trade/ai-governance.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/evaluation.test.ts",
        "src/lib/moral-trade/ai-governance.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/evaluation/health",
        "/api/moral-trade/ai-governance/health",
      ],
    },
    {
      key: "ux_tests",
      label: "UX tests",
      passCondition:
        "Time to first valid draft, explanation usefulness, reviewer efficiency, and overrule stability improve or receive a public reason code before promotion.",
      evidenceFiles: [
        "config/moral-trade/evaluation-profile.json",
        "src/lib/moral-trade/evaluation.ts",
        "src/app/moral-trade/technical-spec/page.tsx",
      ],
      testFiles: [
        "src/lib/moral-trade/evaluation.test.ts",
        "src/lib/public-route-smoke.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/evaluation/health",
        "/moral-trade/technical-spec",
      ],
    },
    {
      key: "resilience_tests",
      label: "Resilience tests",
      passCondition:
        "Copilot failures, provider outages, route errors, and state-transition replays fall back to deterministic or manual paths without mutating state.",
      evidenceFiles: [
        "src/lib/moral-trade/operations.ts",
        "src/lib/moral-trade/performance.ts",
        "src/lib/moral-trade/copilot.ts",
        "src/lib/moral-trade/offer-write-path.ts",
      ],
      testFiles: [
        "src/lib/moral-trade/operations.test.ts",
        "src/lib/moral-trade/performance.test.ts",
        "src/lib/moral-trade/copilot.test.ts",
        "src/lib/moral-trade/offer-write-path.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/operations/health",
        "/api/moral-trade/performance/health",
        "/api/moral-trade/copilot/review",
      ],
    },
  ],
  requirements: [
    {
      key: "core_data_model_public_validator_suite",
      label: "Core data model and public validators",
      recommendation:
        "Formalize the core Moral Trade data model, state transitions, schemas, and public validator suite in the MPGF style.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/moral-trade/protocol.ts",
        "src/lib/moral-trade/data-model.ts",
        "src/lib/moral-trade/schema-registry.ts",
        "src/app/api/moral-trade/data-model/contract/route.ts",
        "src/app/api/moral-trade/schemas/route.ts",
      ],
      requiredEvidencePhrases: [
        "MORAL_TRADE_SCHEMA_REGISTRY_VERSION",
        "validateMoralTradeSchemaRegistry",
        "profile-json-schema-conformance",
      ],
      testFiles: [
        "src/lib/moral-trade/protocol.test.ts",
        "src/lib/moral-trade/data-model.test.ts",
        "src/lib/moral-trade/schema-registry.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/health",
        "/api/moral-trade/data-model/contract",
        "/api/moral-trade/schemas",
      ],
    },
    {
      key: "workflow_cards_factor_codes",
      label: "Workflow cards and factor codes",
      recommendation:
        "Replace text-heavy reliance decisions with workflow cards that expose why a draft passed, failed, or needs review using structured factor codes.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/proposal-review.ts",
        "src/app/offers/[offerId]/page.tsx",
        "src/app/offers/examples/[exampleId]/page.tsx",
        "src/app/moral-trade/page.tsx",
        "src/app/reasoning-center/page.tsx",
      ],
      requiredEvidencePhrases: [
        "getOfferReviewWorkflowCards",
        "no_global_moral_ranking",
        "reviewer_summary",
      ],
      testFiles: [
        "src/lib/proposal-review.test.ts",
        "src/lib/public-route-smoke.test.ts",
        "src/lib/moral-trade/reasoning-packets.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/review-workflow/contract",
        "/api/moral-trade/review-workflow/evaluate",
        "/api/moral-trade/reasoning/packets",
      ],
    },
    {
      key: "provenance_first_evidence",
      label: "Provenance-first evidence objects",
      recommendation:
        "Track evidence as entities, activities, agents, traceability events, artifact hashes, and append-only state transitions.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/moral-trade/provenance.ts",
        "src/lib/moral-trade/evidence-persistence.ts",
        "src/lib/moral-trade/agreement-write-path.ts",
        "supabase/migrations/20260529_moral_trade_provenance_persistence.sql",
        "supabase/migrations/20260529_moral_trade_review_decision_idempotency.sql",
      ],
      requiredEvidencePhrases: [
        "MoralTradeProvenanceActivity",
        "provenance_agent",
        "traceability_event",
        "persistence-append-only-policies",
      ],
      testFiles: [
        "src/lib/moral-trade/provenance.test.ts",
        "src/lib/moral-trade/evidence-persistence.test.ts",
        "src/lib/moral-trade/agreement-write-path.test.ts",
      ],
      routeEvidence: ["/api/moral-trade/provenance/schema"],
    },
    {
      key: "schema_bound_copilot",
      label: "Schema-bound copilot",
      recommendation:
        "Use Codex only for bounded drafting, critique, evidence checklists, and reviewer summaries; never for hidden moral ranking, outreach, private-feed mining, or state changes.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "config/moral-trade/copilot-contract.json",
        "src/lib/moral-trade/copilot.ts",
        "src/app/api/moral-trade/copilot/contract/route.ts",
        "src/app/api/moral-trade/copilot/review/route.ts",
        "src/lib/moral-trade/policy-bundle.ts",
      ],
      requiredEvidencePhrases: [
        "MoralTradeCopilotOutput",
        "no_global_moral_ranking",
        "validateMoralTradeCopilotOutput",
      ],
      testFiles: [
        "src/lib/moral-trade/copilot.test.ts",
        "src/lib/moral-trade/policy-bundle.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/copilot/contract",
        "/api/moral-trade/copilot/review",
        "/api/moral-trade/policy-bundle/contract",
      ],
    },
    {
      key: "privacy_match_disclosure_guardrails",
      label: "Privacy, matching, and disclosure guardrails",
      recommendation:
        "Keep exact wishes, contact details, raw source notes, and counterparties hidden until staged consent validates; matching remains rule-based and redacted.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/moral-trade/match-signal.ts",
        "src/lib/moral-trade/disclosure.ts",
        "src/lib/background-privacy-controls.ts",
        "src/app/api/moral-trade/match-signal/evaluate/route.ts",
        "src/app/api/moral-trade/disclosure/evaluate/route.ts",
      ],
      requiredEvidencePhrases: [
        "redacted_profile_match_preview_only",
        "evaluateMoralTradeDisclosureGrant",
        "raw_source_notes_redacted",
      ],
      testFiles: [
        "src/lib/moral-trade/match-signal.test.ts",
        "src/lib/moral-trade/disclosure.test.ts",
        "src/lib/background-privacy-controls.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/match-signal/contract",
        "/api/moral-trade/disclosure/contract",
        "/api/moral-trade/background-rls-audit/contract",
      ],
    },
    {
      key: "externality_challenge_appeal_review",
      label: "Externality, challenge, and appeal review",
      recommendation:
        "Separate factual proof, counterfactual baseline credibility, externality review, challenge windows, remedies, standing, and narrow appeal scope.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/moral-trade/externality.ts",
        "src/lib/moral-trade/challenge-appeal.ts",
        "src/lib/moral-trade/protocol.ts",
        "src/app/validation/page.tsx",
      ],
      requiredEvidencePhrases: [
        "evaluateMoralTradeExternalityReview",
        "affected_party_standing",
        "challenge_window_required",
        "deterministic_challenge_appeal_scope_only",
      ],
      testFiles: [
        "src/lib/moral-trade/externality.test.ts",
        "src/lib/moral-trade/challenge-appeal.test.ts",
        "src/lib/moral-trade/protocol.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/externality/health",
        "/api/moral-trade/challenge-appeal/contract",
        "/validation",
      ],
    },
    {
      key: "evaluation_operations_security_performance",
      label: "Evaluation, operations, security, and performance gates",
      recommendation:
        "Publish evaluation metrics, privacy-safe reporting, route resilience, API/security posture, rate limits, retention, incident response, and guarded rollout gates before claiming readiness.",
      sourceDocumentKeys: ["moral_trade_feature_audit_markdown"],
      evidenceFiles: [
        "src/lib/moral-trade/evaluation.ts",
        "src/lib/moral-trade/operations.ts",
        "src/lib/moral-trade/security.ts",
        "src/lib/moral-trade/performance.ts",
        "src/lib/moral-trade/incident-response.ts",
        "src/lib/moral-trade/transparency-report.ts",
        "src/lib/moral-trade/ai-governance.ts",
        "src/lib/moral-trade/api-contract.ts",
        "src/lib/moral-trade/email-copy.ts",
      ],
      requiredEvidencePhrases: [
        "validateMoralTradeEvaluationProfile",
        "validateMoralTradeOperationsProfile",
        "validateMoralTradeSecurityProfile",
        "validateMoralTradePerformanceProfile",
        "validateMoralTradeIncidentResponseProfile",
        "MORAL_TRADE_TRANSPARENCY_REPORT_VERSION",
        "validateMoralTradeAiGovernanceProfile",
        "sampleDocumentationPacketFailures",
      ],
      testFiles: [
        "src/lib/moral-trade/evaluation.test.ts",
        "src/lib/moral-trade/operations.test.ts",
        "src/lib/moral-trade/security.test.ts",
        "src/lib/moral-trade/performance.test.ts",
        "src/lib/moral-trade/incident-response.test.ts",
        "src/lib/moral-trade/transparency-report.test.ts",
        "src/lib/moral-trade/ai-governance.test.ts",
        "src/lib/moral-trade/api-contract.test.ts",
        "src/lib/moral-trade/email-copy.test.ts",
      ],
      routeEvidence: [
        "/api/moral-trade/evaluation/health",
        "/api/moral-trade/operations/health",
        "/api/moral-trade/security/health",
        "/api/moral-trade/performance/health",
        "/api/moral-trade/incident-response/health",
        "/api/moral-trade/transparency/report",
        "/api/moral-trade/ai-governance/health",
        "/api/moral-trade/api-contract",
      ],
    },
  ],
  nonClaims: [
    "This coverage profile proves repository artifacts and validator coverage, not live production liquidity or successful real-world trades.",
    "The attached PDF and Markdown source are verified as present and hash-checked; the Markdown source is the phrase-checked requirements artifact used by this validator.",
    "MPGF production evidence files remain separately governed and are not fabricated by this Moral Trade document-coverage profile.",
  ],
};

export function getMoralTradeDocumentCoverageProfile() {
  return moralTradeDocumentCoverageProfile;
}

export function validateMoralTradeDocumentCoverageProfile(
  profile: MoralTradeDocumentCoverageProfile = moralTradeDocumentCoverageProfile,
): MoralTradeDocumentCoverageValidation {
  const sourceKeys = profile.sourceDocuments.map((source) => source.key);
  const sourceStackKeys = profile.sourceStackReferences.map((source) => source.key);
  const testingPlanLayerKeys = profile.testingPlanCoverage.map((layer) => layer.key);
  const requirementKeys = profile.requirements.map((requirement) => requirement.key);
  const duplicateSourceStackKeys = sourceStackKeys.filter(
    (key, index) => sourceStackKeys.indexOf(key) !== index,
  );
  const duplicateRequirementKeys = requirementKeys.filter(
    (key, index) => requirementKeys.indexOf(key) !== index,
  );
  const duplicateTestingPlanLayerKeys = testingPlanLayerKeys.filter(
    (key, index) => testingPlanLayerKeys.indexOf(key) !== index,
  );
  const sourceChecks = profile.sourceDocuments.map((source) => {
    const exists = fileExists(source.path);
    const text = exists && source.requiredPhrases.length ? readTextIfExists(source.path) : null;
    const missingPhrases = source.requiredPhrases.filter(
      (phrase) => !text?.toLowerCase().includes(phrase.toLowerCase()),
    );

    return check(
      `source:${source.key}`,
      source.label,
      (!source.required || exists) && missingPhrases.length === 0,
      missingPhrases.length
        ? `Missing phrase(s): ${missingPhrases.join(" | ")}`
        : exists
          ? `${source.path} exists${source.requiredPhrases.length ? " and contains required phrases" : ""}.`
          : `${source.path} is optional and absent.`,
    );
  });
  const sourceDocumentArtifacts = profile.sourceDocuments.map((source) => {
    const artifactHash = hashFileIfExists(source.path);

    return {
      key: source.key,
      path: source.path,
      artifactHash,
      expectedHash: source.expectedSha256,
      present: artifactHash != null,
      hashMatches: artifactHash === source.expectedSha256,
    } satisfies MoralTradeSourceDocumentArtifact;
  });
  const sourceArtifactChecks = sourceDocumentArtifacts.map((artifact) =>
    check(
      `source-artifact:${artifact.key}`,
      `${artifact.path} source artifact hash`,
      artifact.present && artifact.hashMatches,
      artifact.present
        ? `hash=${artifact.artifactHash}; expected=${artifact.expectedHash}`
        : `${artifact.path} missing`,
    ),
  );
  const sourceStackChecks = profile.sourceStackReferences.map((source) => {
    const missingEvidence = source.evidenceFiles.filter((filePath) => !fileExists(filePath));
    const hasRoutes = source.routeEvidence.length > 0;

    return check(
      `source-stack:${source.key}`,
      `${source.source} implementation trace`,
      missingEvidence.length === 0 && hasRoutes,
      [
        `priority=${source.priority}`,
        `evidence=${source.evidenceFiles.length - missingEvidence.length}/${source.evidenceFiles.length}`,
        `routes=${source.routeEvidence.length}`,
        missingEvidence.length ? `missingEvidence=${missingEvidence.join("|")}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  });
  const testingPlanChecks = profile.testingPlanCoverage.map((layer) => {
    const missingEvidence = layer.evidenceFiles.filter((filePath) => !fileExists(filePath));
    const missingTests = layer.testFiles.filter((filePath) => !fileExists(filePath));
    const hasRoutes = layer.routeEvidence.length > 0;

    return check(
      `testing-plan:${layer.key}`,
      `${layer.label} coverage`,
      missingEvidence.length === 0 &&
        missingTests.length === 0 &&
        hasRoutes &&
        layer.passCondition.length >= 30,
      [
        `evidence=${layer.evidenceFiles.length - missingEvidence.length}/${layer.evidenceFiles.length}`,
        `tests=${layer.testFiles.length - missingTests.length}/${layer.testFiles.length}`,
        `routes=${layer.routeEvidence.length}`,
        missingEvidence.length ? `missingEvidence=${missingEvidence.join("|")}` : "",
        missingTests.length ? `missingTests=${missingTests.join("|")}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  });
  const requirementChecks = profile.requirements.map((requirement) => {
    const missingEvidence = requirement.evidenceFiles.filter((filePath) => !fileExists(filePath));
    const missingTests = requirement.testFiles.filter((filePath) => !fileExists(filePath));
    const missingSources = requirement.sourceDocumentKeys.filter((key) => !sourceKeys.includes(key));
    const evidenceTexts = requirement.evidenceFiles
      .map((filePath) => readTextIfExists(filePath))
      .filter((text): text is string => text != null);
    const missingEvidencePhrases = requirement.requiredEvidencePhrases.filter(
      (phrase) =>
        !evidenceTexts.some((text) => text.toLowerCase().includes(phrase.toLowerCase())),
    );
    const hasRoutes = requirement.routeEvidence.length > 0;

    return check(
      `requirement:${requirement.key}`,
      requirement.label,
      missingEvidence.length === 0 &&
        missingTests.length === 0 &&
        missingSources.length === 0 &&
        missingEvidencePhrases.length === 0 &&
        hasRoutes,
      [
        `evidence=${requirement.evidenceFiles.length - missingEvidence.length}/${requirement.evidenceFiles.length}`,
        `evidencePhrases=${requirement.requiredEvidencePhrases.length - missingEvidencePhrases.length}/${requirement.requiredEvidencePhrases.length}`,
        `tests=${requirement.testFiles.length - missingTests.length}/${requirement.testFiles.length}`,
        `routes=${requirement.routeEvidence.length}`,
        missingSources.length ? `missingSources=${missingSources.join("|")}` : "sources=linked",
        missingEvidence.length ? `missingEvidence=${missingEvidence.join("|")}` : "",
        missingEvidencePhrases.length
          ? `missingEvidencePhrases=${missingEvidencePhrases.join("|")}`
          : "",
        missingTests.length ? `missingTests=${missingTests.join("|")}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  });
  const canonicalInstructionText = readTextIfExists(profile.canonicalInstruction.path);
  const canonicalInstructionHash = canonicalInstructionText
    ? hashText(canonicalInstructionText)
    : null;
  const missingInstructionPhrases = profile.canonicalInstruction.requiredPhrases.filter(
    (phrase) =>
      !canonicalInstructionText?.toLowerCase().includes(phrase.toLowerCase()),
  );
  const missingInstructionCommands = profile.canonicalInstruction.verificationCommands.filter(
    (command) => !canonicalInstructionText?.includes(command),
  );
  const missingInstructionRoutes = profile.canonicalInstruction.routeEvidence.filter(
    (route) => !canonicalInstructionText?.includes(route),
  );
  const instructionChecks = [
    check(
      "instruction:canonical-build",
      "Canonical build instruction is present and validator-bound",
      Boolean(canonicalInstructionText) &&
        missingInstructionPhrases.length === 0 &&
        missingInstructionCommands.length === 0 &&
        missingInstructionRoutes.length === 0,
      [
        canonicalInstructionText
          ? `${profile.canonicalInstruction.path} exists`
          : `${profile.canonicalInstruction.path} missing`,
        canonicalInstructionHash ? `hash=${canonicalInstructionHash}` : "",
        missingInstructionPhrases.length
          ? `missingPhrases=${missingInstructionPhrases.join("|")}`
          : "phrases=complete",
        missingInstructionCommands.length
          ? `missingCommands=${missingInstructionCommands.join("|")}`
          : "commands=complete",
        missingInstructionRoutes.length
          ? `missingRoutes=${missingInstructionRoutes.join("|")}`
          : "routes=complete",
      ]
        .filter(Boolean)
        .join(", "),
    ),
  ];
  const structureChecks = [
    check(
      "structure:requirement-coverage",
      "Coverage includes every document recommendation family",
      hasAll(requirementKeys, [
        "core_data_model_public_validator_suite",
        "workflow_cards_factor_codes",
        "provenance_first_evidence",
        "schema_bound_copilot",
        "privacy_match_disclosure_guardrails",
        "externality_challenge_appeal_review",
        "evaluation_operations_security_performance",
      ]),
      requirementKeys.join(", "),
    ),
    check(
      "structure:unique-keys",
      "Coverage keys are unique",
      duplicateRequirementKeys.length === 0,
      duplicateRequirementKeys.length ? duplicateRequirementKeys.join(", ") : "No duplicate keys.",
    ),
    check(
      "structure:recommended-source-stack",
      "Coverage maps every recommended source-stack family",
      hasAll(sourceStackKeys, REQUIRED_RECOMMENDED_SOURCE_STACK_KEYS) &&
        duplicateSourceStackKeys.length === 0,
      [
        sourceStackKeys.join(", "),
        duplicateSourceStackKeys.length ? `duplicates=${duplicateSourceStackKeys.join("|")}` : "",
      ]
        .filter(Boolean)
        .join("; "),
    ),
    check(
      "structure:testing-plan-coverage",
      "Coverage maps every report testing-plan layer",
      hasAll(testingPlanLayerKeys, REQUIRED_TESTING_PLAN_LAYER_KEYS) &&
        duplicateTestingPlanLayerKeys.length === 0,
      [
        testingPlanLayerKeys.join(", "),
        duplicateTestingPlanLayerKeys.length
          ? `duplicates=${duplicateTestingPlanLayerKeys.join("|")}`
          : "",
      ]
        .filter(Boolean)
        .join("; "),
    ),
    check(
      "structure:non-claims",
      "Coverage publishes non-claims",
      profile.nonClaims.some((nonClaim) => /not live production liquidity/i.test(nonClaim)) &&
        profile.nonClaims.some((nonClaim) => /hash-checked/i.test(nonClaim)) &&
        profile.nonClaims.some((nonClaim) => /not fabricated/i.test(nonClaim)),
      profile.nonClaims.join(" | "),
    ),
  ];
  const checks = [
    ...sourceChecks,
    ...sourceArtifactChecks,
    ...instructionChecks,
    ...sourceStackChecks,
    ...testingPlanChecks,
    ...requirementChecks,
    ...structureChecks,
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-document-coverage",
    validatorVersion: MORAL_TRADE_DOCUMENT_COVERAGE_VALIDATOR_VERSION,
    profileVersion: profile.version,
    sourceDocumentCount: profile.sourceDocuments.length,
    sourceStackCount: profile.sourceStackReferences.length,
    testingPlanLayerCount: profile.testingPlanCoverage.length,
    requirementCount: profile.requirements.length,
    sourceDocumentArtifacts,
    canonicalInstructionHash,
    checks,
    blockers,
  };
}
