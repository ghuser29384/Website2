import {
  ANTI_THREAT_BASELINE_RULES,
  MARKETPLACE_REVIEW_FACTOR_PRIORITY,
  MORAL_TRADE_VERIFICATION_LOOP_STEPS,
  PROHIBITED_MORAL_TRADE_PATTERNS,
  PROHIBITED_PROPOSAL_FIXTURES,
  evaluateMoralTradeProtocolDraft,
  getOfferReviewWorkflowContract,
} from "@/lib/proposal-review";

import { getMoralTradeCopilotContract } from "./copilot";
import { getMoralTradeDisclosureContract } from "./disclosure";
import { getMoralTradeMatchSignalContract } from "./match-signal";
import { getMoralTradeProtocolProfile } from "./protocol";

export const MORAL_TRADE_POLICY_BUNDLE_VERSION =
  "moral-trade-policy-bundle-v0.1-2026-05";
export const MORAL_TRADE_POLICY_BUNDLE_VALIDATOR_VERSION =
  "moral-trade-policy-bundle-validator-v0.1";

type PolicyBundleEntry = {
  key: string;
  label: string;
  rule: string;
};

type ProhibitedPatternEntry = {
  code: string;
  label: string;
  patternCount: number;
  seededFixtureCount: number;
};

type FactorCodeEntry = {
  code: string;
  label: string;
  source: "core_protocol" | "review_workflow" | "match_signal" | "disclosure_grant";
  description: string;
};

type VerificationMethodEntry = {
  key: string;
  label: string;
  acceptedEvidence: string[];
  supportsClaimScopes: string[];
};

type RedactionPolicyEntry = {
  key: string;
  label: string;
  appliesTo: string[];
  defaultAction: "redact" | "summarize" | "gate_by_grant";
};

export type MoralTradePolicyBundleContract = {
  version: string;
  purpose: string;
  strictInputBundle: string[];
  policyRegistry: PolicyBundleEntry[];
  prohibitedPatternRegistry: ProhibitedPatternEntry[];
  factorCodeDictionary: FactorCodeEntry[];
  verificationMethodTaxonomy: VerificationMethodEntry[];
  redactionPolicy: RedactionPolicyEntry[];
  verificationLoop: Array<{
    key: string;
    label: string;
    blocksMatchable: boolean;
  }>;
  antiThreatRules: string[];
  contractTests: string[];
};

export type MoralTradePolicyBundleCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
};

export type MoralTradePolicyBundleValidation = {
  status: "pass" | "fail";
  validatorName: "moral-trade-policy-bundle-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePolicyBundleCheck[];
  blockers: string[];
};

const REQUIRED_INPUT_BUNDLE = [
  "structured_draft",
  "policy_registry",
  "prohibited_pattern_registry",
  "factor_code_dictionary",
  "verification_method_taxonomy",
  "redaction_policy",
  "evidence_metadata",
] as const;

const REQUIRED_PROHIBITED_PATTERN_CODES = [
  "anti_threat_baseline",
  "prohibited_illegal_or_fraud",
  "prohibited_doxxing_or_harassment",
  "prohibited_political_campaign_offset",
  "newly_escalated_harmful_behavior",
] as const;

const REQUIRED_VERIFICATION_METHODS = [
  "receipt_or_provider_record",
  "public_log",
  "attestation",
  "audit_or_external_review",
  "baseline_artifact",
  "payment_event",
  "manual_review",
] as const;

const REQUIRED_REDACTIONS = [
  "exact_private_wishes",
  "contact_details",
  "sensitive_constraints",
  "raw_profile_notes",
  "raw_source_notes",
  "private_feed_payloads",
] as const;

const REQUIRED_TESTS = [
  "policy_bundle_contract_validator",
  "prohibited_pattern_seed_fixtures",
  "factor_code_dictionary_coverage",
  "verification_method_taxonomy_contract",
  "redaction_policy_contract",
  "public_policy_bundle_route",
  "technical_spec_policy_bundle_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePolicyBundleCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function buildPolicyRegistry(): PolicyBundleEntry[] {
  const protocolProfile = getMoralTradeProtocolProfile();
  const copilotContract = getMoralTradeCopilotContract();

  return [
    ...protocolProfile.guardrails.map((guardrail) => ({
      key: guardrail.code,
      label: guardrail.label,
      rule: guardrail.rule,
    })),
    ...copilotContract.guardrails
      .filter((guardrail) => !protocolProfile.guardrails.some((entry) => entry.code === guardrail.code))
      .map((guardrail) => ({
        key: guardrail.code,
        label: guardrail.label,
        rule: guardrail.rule,
      })),
  ];
}

function buildProhibitedPatternRegistry(): ProhibitedPatternEntry[] {
  return PROHIBITED_MORAL_TRADE_PATTERNS.map((entry) => ({
    code: entry.code,
    label: entry.label,
    patternCount: entry.patterns.length,
    seededFixtureCount: PROHIBITED_PROPOSAL_FIXTURES.filter(
      (fixture) => fixture.code === entry.code,
    ).length,
  }));
}

function buildFactorCodeDictionary(): FactorCodeEntry[] {
  const protocolProfile = getMoralTradeProtocolProfile();
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const matchSignalContract = getMoralTradeMatchSignalContract();
  const disclosureContract = getMoralTradeDisclosureContract();
  const entries = [
    ...protocolProfile.factorCodes.map((factor) => ({
      code: factor.code,
      label: factor.label,
      source: "core_protocol" as const,
      description: factor.description,
    })),
    ...reviewWorkflowContract.marketplaceFactorPriority.map((code) => ({
      code,
      label: code.replaceAll("_", " "),
      source: "review_workflow" as const,
      description: "Marketplace review factor derived from the review workflow contract.",
    })),
    ...matchSignalContract.approvedFactorCodes.map((code) => ({
      code,
      label: code.replaceAll("_", " "),
      source: "match_signal" as const,
      description: "Privacy-safe match signal factor code.",
    })),
    ...disclosureContract.approvedFactorCodes.map((code) => ({
      code,
      label: code.replaceAll("_", " "),
      source: "disclosure_grant" as const,
      description: "Consent-gated disclosure grant factor code.",
    })),
  ];
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.source}:${entry.code}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildVerificationMethodTaxonomy(): VerificationMethodEntry[] {
  return [
    {
      key: "receipt_or_provider_record",
      label: "Receipt or provider record",
      acceptedEvidence: ["receipt", "provider_record", "external_reference"],
      supportsClaimScopes: ["factual_action", "payment_event"],
    },
    {
      key: "public_log",
      label: "Public log",
      acceptedEvidence: ["public_log", "timestamped_update", "public_pledge"],
      supportsClaimScopes: ["factual_action", "reviewed_completion"],
    },
    {
      key: "attestation",
      label: "Attestation",
      acceptedEvidence: ["reviewer_attestation", "counterparty_attestation", "witness_attestation"],
      supportsClaimScopes: ["factual_action", "externality_review"],
    },
    {
      key: "audit_or_external_review",
      label: "Audit or external review",
      acceptedEvidence: ["audit_report", "external_reviewer_note", "standard_reference"],
      supportsClaimScopes: ["factual_action", "externality_review", "destination_review"],
    },
    {
      key: "baseline_artifact",
      label: "Baseline artifact",
      acceptedEvidence: ["dated_intent_note", "prior_behavior_record", "baseline_statement"],
      supportsClaimScopes: ["counterfactual_baseline"],
    },
    {
      key: "payment_event",
      label: "Payment event",
      acceptedEvidence: ["provider_payment_event", "donation_receipt", "external_payment_reference"],
      supportsClaimScopes: ["payment_event", "factual_action"],
    },
    {
      key: "manual_review",
      label: "Manual review",
      acceptedEvidence: ["review_decision", "challenge_packet", "appeal_packet"],
      supportsClaimScopes: ["policy_flag", "privacy_disclosure", "dispute_resolution"],
    },
  ];
}

function buildRedactionPolicy(): RedactionPolicyEntry[] {
  const copilotContract = getMoralTradeCopilotContract();
  const matchSignalContract = getMoralTradeMatchSignalContract();
  const disclosureContract = getMoralTradeDisclosureContract();
  const redactionKeys = uniq([
    ...copilotContract.redactionsAppliedByDefault,
    ...matchSignalContract.redactedFields,
    ...disclosureContract.redactedFields,
  ]);

  return redactionKeys.map((key) => ({
    key,
    label: key.replaceAll("_", " "),
    appliesTo:
      key.includes("contact")
        ? ["public_profile", "match_suggestion", "notification"]
        : key.includes("source") || key.includes("feed") || key.includes("profile_notes")
          ? ["source_note", "source_connection", "reasoning_packet"]
          : ["public_profile", "match_suggestion", "copilot_output"],
    defaultAction: key.includes("summary") ? "summarize" : "redact",
  }));
}

export function getMoralTradePolicyBundleContract(): MoralTradePolicyBundleContract {
  return {
    version: MORAL_TRADE_POLICY_BUNDLE_VERSION,
    purpose:
      "Public contract for the strict Moral Trade copilot input bundle: policy registry, prohibited-pattern registry, factor-code dictionary, verification-method taxonomy, redaction policy, evidence metadata boundary, and fixed verification loop.",
    strictInputBundle: [...getMoralTradeCopilotContract().strictInputBundle],
    policyRegistry: buildPolicyRegistry(),
    prohibitedPatternRegistry: buildProhibitedPatternRegistry(),
    factorCodeDictionary: buildFactorCodeDictionary(),
    verificationMethodTaxonomy: buildVerificationMethodTaxonomy(),
    redactionPolicy: buildRedactionPolicy(),
    verificationLoop: [...MORAL_TRADE_VERIFICATION_LOOP_STEPS],
    antiThreatRules: [...ANTI_THREAT_BASELINE_RULES],
    contractTests: [...REQUIRED_TESTS],
  };
}

export function validateMoralTradePolicyBundleContract(
  contract: MoralTradePolicyBundleContract = getMoralTradePolicyBundleContract(),
): MoralTradePolicyBundleValidation {
  const prohibitedCodes = contract.prohibitedPatternRegistry.map((entry) => entry.code);
  const fixtureResults = PROHIBITED_PROPOSAL_FIXTURES.map((fixture) => ({
    code: fixture.code,
    title: fixture.title,
    review: evaluateMoralTradeProtocolDraft(fixture.draft),
  }));
  const verificationMethodKeys = contract.verificationMethodTaxonomy.map((entry) => entry.key);
  const redactionKeys = contract.redactionPolicy.map((entry) => entry.key);
  const factorCodes = contract.factorCodeDictionary.map((entry) => entry.code);
  const policyKeys = contract.policyRegistry.map((entry) => entry.key);
  const verificationLoopKeys = contract.verificationLoop.map((entry) => entry.key);
  const failedFixtures = fixtureResults.filter(
    (result) =>
      result.review.status !== "blocked" ||
      !result.review.policyConflicts.includes(result.code),
  );
  const checks = [
    check(
      "strict-input-bundle-sources",
      "Strict input bundle sources are concrete",
      hasAll(contract.strictInputBundle, REQUIRED_INPUT_BUNDLE),
      contract.strictInputBundle.join(", "),
    ),
    check(
      "policy-registry-coverage",
      "Policy registry covers core guardrails",
      hasAll(policyKeys, [
        "anti_threat_baseline",
        "no_autonomous_outreach",
        "no_global_moral_ranking",
        "privacy_redaction_required",
        "separate_trust_axes",
      ]) && contract.policyRegistry.every((entry) => entry.rule.length >= 20),
      policyKeys.join(", "),
    ),
    check(
      "prohibited-pattern-registry",
      "Prohibited patterns have codes, patterns, and seeded fixtures",
      hasAll(prohibitedCodes, REQUIRED_PROHIBITED_PATTERN_CODES) &&
        contract.prohibitedPatternRegistry.every(
          (entry) => entry.patternCount > 0 && entry.seededFixtureCount > 0,
        ),
      contract.prohibitedPatternRegistry
        .map((entry) => `${entry.code}:${entry.patternCount}/${entry.seededFixtureCount}`)
        .join(", "),
    ),
    check(
      "seed-fixture-blocks",
      "Seeded harmful fixtures are blocked with exact policy reasons",
      failedFixtures.length === 0,
      failedFixtures.length
        ? failedFixtures.map((entry) => `${entry.title}:${entry.review.status}`).join(", ")
        : `${fixtureResults.length} fixture(s) blocked.`,
    ),
    check(
      "factor-code-dictionary",
      "Factor-code dictionary covers protocol, workflow, matching, and disclosure explanations",
      ["terms_complete", "baseline_credibility", "cause_area_overlap", "purpose_bound_disclosure"].every(
        (code) => factorCodes.includes(code),
      ) &&
        contract.factorCodeDictionary.some((entry) => entry.source === "core_protocol") &&
        contract.factorCodeDictionary.some((entry) => entry.source === "review_workflow") &&
        contract.factorCodeDictionary.some((entry) => entry.source === "match_signal") &&
        contract.factorCodeDictionary.some((entry) => entry.source === "disclosure_grant"),
      `${contract.factorCodeDictionary.length} factor-code entries.`,
    ),
    check(
      "verification-method-taxonomy",
      "Verification-method taxonomy covers receipts, logs, attestations, audits, baselines, payments, and manual review",
      hasAll(verificationMethodKeys, REQUIRED_VERIFICATION_METHODS) &&
        contract.verificationMethodTaxonomy.every(
          (entry) => entry.acceptedEvidence.length > 0 && entry.supportsClaimScopes.length > 0,
        ),
      verificationMethodKeys.join(", "),
    ),
    check(
      "redaction-policy",
      "Redaction policy covers exact wishes, contacts, constraints, notes, source notes, and private feeds",
      hasAll(redactionKeys, REQUIRED_REDACTIONS) &&
        contract.redactionPolicy.every((entry) => entry.appliesTo.length > 0),
      redactionKeys.join(", "),
    ),
    check(
      "verification-loop",
      "Fixed verification loop runs before matchability",
      hasAll(verificationLoopKeys, [
        "schema_completeness",
        "anti_threat",
        "baseline_credibility",
        "evidence_sufficiency",
        "externality_trigger",
        "privacy_redaction",
        "match_explanation",
        "human_review_routing",
      ]) &&
        contract.verificationLoop
          .filter((entry) =>
            ["schema_completeness", "anti_threat", "baseline_credibility", "evidence_sufficiency", "privacy_redaction"].includes(
              entry.key,
            ),
          )
          .every((entry) => entry.blocksMatchable),
      verificationLoopKeys.join(", "),
    ),
    check(
      "contract-tests",
      "Policy bundle contract test hooks are named",
      hasAll(contract.contractTests, REQUIRED_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-policy-bundle-contract",
    validatorVersion: MORAL_TRADE_POLICY_BUNDLE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
