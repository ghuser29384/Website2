import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const MORAL_TRADE_DOCUMENT_COVERAGE_VALIDATOR_VERSION =
  "moral-trade-document-coverage-validator-v0.1";

export type MoralTradeDocumentSource = {
  key: string;
  label: string;
  path: string;
  required: boolean;
  requiredPhrases: string[];
};

export type MoralTradeDocumentRequirement = {
  key: string;
  label: string;
  recommendation: string;
  sourceDocumentKeys: string[];
  evidenceFiles: string[];
  testFiles: string[];
  routeEvidence: string[];
};

export type MoralTradeDocumentCoverageProfile = {
  version: string;
  purpose: string;
  sourceDocuments: MoralTradeDocumentSource[];
  requirements: MoralTradeDocumentRequirement[];
  nonClaims: string[];
};

export type MoralTradeDocumentCoverageCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
};

export type MoralTradeDocumentCoverageValidation = {
  status: "pass" | "fail";
  validatorName: "moral-trade-document-coverage";
  validatorVersion: string;
  profileVersion: string;
  sourceDocumentCount: number;
  requirementCount: number;
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

export const moralTradeDocumentCoverageProfile: MoralTradeDocumentCoverageProfile = {
  version: "moral-trade-document-coverage-v0.2-2026-05",
  purpose:
    "Requirement-to-evidence coverage map for the Moral Trade improvement documents: the public validator suite should show which implementation artifacts answer each recommendation without inventing production evidence.",
  sourceDocuments: [
    {
      key: "moral_trade_feature_audit_markdown",
      label: "Improving the Moral Trade Feature at MoralTrade.org markdown",
      path: "moral trade4.md",
      required: true,
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
      requiredPhrases: [],
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
    "The attached PDF is verified as present; the Markdown source is the phrase-checked requirements artifact used by this validator.",
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
  const requirementKeys = profile.requirements.map((requirement) => requirement.key);
  const duplicateRequirementKeys = requirementKeys.filter(
    (key, index) => requirementKeys.indexOf(key) !== index,
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
  const requirementChecks = profile.requirements.map((requirement) => {
    const missingEvidence = requirement.evidenceFiles.filter((filePath) => !fileExists(filePath));
    const missingTests = requirement.testFiles.filter((filePath) => !fileExists(filePath));
    const missingSources = requirement.sourceDocumentKeys.filter((key) => !sourceKeys.includes(key));
    const hasRoutes = requirement.routeEvidence.length > 0;

    return check(
      `requirement:${requirement.key}`,
      requirement.label,
      missingEvidence.length === 0 &&
        missingTests.length === 0 &&
        missingSources.length === 0 &&
        hasRoutes,
      [
        `evidence=${requirement.evidenceFiles.length - missingEvidence.length}/${requirement.evidenceFiles.length}`,
        `tests=${requirement.testFiles.length - missingTests.length}/${requirement.testFiles.length}`,
        `routes=${requirement.routeEvidence.length}`,
        missingSources.length ? `missingSources=${missingSources.join("|")}` : "sources=linked",
        missingEvidence.length ? `missingEvidence=${missingEvidence.join("|")}` : "",
        missingTests.length ? `missingTests=${missingTests.join("|")}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  });
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
      "structure:non-claims",
      "Coverage publishes non-claims",
      profile.nonClaims.some((nonClaim) => /not live production liquidity/i.test(nonClaim)) &&
        profile.nonClaims.some((nonClaim) => /PDF is verified as present/i.test(nonClaim)) &&
        profile.nonClaims.some((nonClaim) => /not fabricated/i.test(nonClaim)),
      profile.nonClaims.join(" | "),
    ),
  ];
  const checks = [...sourceChecks, ...requirementChecks, ...structureChecks];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-document-coverage",
    validatorVersion: MORAL_TRADE_DOCUMENT_COVERAGE_VALIDATOR_VERSION,
    profileVersion: profile.version,
    sourceDocumentCount: profile.sourceDocuments.length,
    requirementCount: profile.requirements.length,
    checks,
    blockers,
  };
}
