import copilotContractJson from "../../../config/moral-trade/copilot-contract.json";

import {
  evaluateMoralTradeProtocolDraft,
  type MoralTradeProtocolDraftInput,
  type MoralTradeProtocolDraftReview,
  type MoralTradeVerificationStepStatus,
  type ProtocolReviewStatus,
  type ProtocolTrustRating,
} from "@/lib/proposal-review";

export const MORAL_TRADE_COPILOT_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-copilot-contract-validator-v0.1";

type CopilotRole = {
  key: string;
  label: string;
  description: string;
};

type CopilotGuardrail = {
  code: string;
  label: string;
  rule: string;
};

type CopilotVerificationStep = {
  key: string;
  label: string;
  blocksMatchable: boolean;
};

type CopilotRolloutStage = {
  key: string;
  label: string;
  rule: string;
};

export type MoralTradeCopilotContract = {
  version: string;
  purpose: string;
  permittedRoles: CopilotRole[];
  strictInputBundle: string[];
  approvedOutputSections: string[];
  statusValues: string[];
  completenessFields: string[];
  trustAxes: string[];
  guardrails: CopilotGuardrail[];
  verificationLoop: CopilotVerificationStep[];
  redactionsAppliedByDefault: string[];
  rolloutStages: CopilotRolloutStage[];
  humanControlledDecisions: string[];
  fallbackRule: string;
};

export interface MoralTradeCopilotContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeCopilotContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-copilot-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeCopilotContractCheck[];
  blockers: string[];
}

export interface MoralTradeCopilotOutput {
  status: ProtocolReviewStatus;
  completeness: {
    missing_required_fields: string[];
    underspecified_fields: string[];
    policy_conflicts: string[];
  };
  trade_structure: {
    format: string;
    offered_action: string;
    requested_action: string;
    duration: string;
    exit_conditions: string;
    verification_method: string;
  };
  trust_assessment: {
    factual_trust: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    counterfactual_baseline: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    externality_review: {
      required: boolean;
      flags: string[];
    };
    party_relative_benefit: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    privacy_redaction: {
      rating: ProtocolTrustRating;
      flags: string[];
      reasons: string[];
    };
  };
  match_explanation: {
    factor_codes: string[];
    confidence_band: ProtocolTrustRating;
    redactions_applied: string[];
  };
  verification_loop: Array<{
    key: string;
    label: string;
    status: MoralTradeVerificationStepStatus;
    detail: string;
    blocks_matchable: boolean;
  }>;
  clarification_questions: Array<{
    field: string;
    question: string;
  }>;
  uncertainty_flags: string[];
  next_step_checklist: string[];
  cited_evidence_table: Array<{
    claim: string;
    evidence_type: string;
    citation: string;
    status: string;
    reviewer_note: string;
  }>;
  review_instructions: {
    artifacts_to_request: string[];
    review_scope: string[];
    appeal_triggers: string[];
  };
  reviewer_summary: string;
  citations: string[];
}

const copilotContract = copilotContractJson as MoralTradeCopilotContract;

const REQUIRED_INPUT_BUNDLE = [
  "structured_draft",
  "policy_registry",
  "prohibited_pattern_registry",
  "factor_code_dictionary",
  "verification_method_taxonomy",
  "redaction_policy",
  "evidence_metadata",
  "redacted_profile_pair",
  "match_constraint_set",
  "stated_exclusions",
] as const;

const REQUIRED_OUTPUT_SECTIONS = [
  "status",
  "completeness",
  "trade_structure",
  "trust_assessment",
  "match_explanation",
  "verification_loop",
  "clarification_questions",
  "uncertainty_flags",
  "next_step_checklist",
  "cited_evidence_table",
  "review_instructions",
  "reviewer_summary",
  "citations",
] as const;

const REQUIRED_GUARDRAILS = [
  "approved_json_only",
  "no_chain_of_thought",
  "no_global_moral_ranking",
  "no_autonomous_outreach",
  "no_private_feed_ingestion",
  "separate_trust_axes",
  "anti_threat_escalation",
] as const;

const REQUIRED_VERIFICATION_STEPS = [
  "schema_completeness",
  "anti_threat",
  "baseline_credibility",
  "evidence_sufficiency",
  "externality_trigger",
  "privacy_redaction",
  "match_explanation",
  "human_review_routing",
] as const;

const REQUIRED_ROLLOUT_STAGES = ["shadow_mode", "assist_mode", "guarded_automation"] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeCopilotContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function getConfidenceBand(review: MoralTradeProtocolDraftReview): ProtocolTrustRating {
  if (review.status === "blocked" || review.status === "draft" || review.status === "needs_clarification") {
    return "low";
  }

  if (
    review.trustAssessment.factualTrust.rating === "high" &&
    review.trustAssessment.counterfactualBaseline.rating === "high" &&
    review.trustAssessment.partyRelativeBenefit.rating === "high" &&
    review.trustAssessment.privacyRedaction.rating === "high" &&
    !review.trustAssessment.externalityReview.required
  ) {
    return "high";
  }

  if (
    review.trustAssessment.factualTrust.rating === "low" ||
    review.trustAssessment.partyRelativeBenefit.rating === "low" ||
    review.trustAssessment.privacyRedaction.rating === "low"
  ) {
    return "low";
  }

  return "medium";
}

export function getMoralTradeCopilotContract() {
  return copilotContract;
}

export function validateMoralTradeCopilotContract(
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotContractValidation {
  const checks = [
    check(
      "strict-input-bundle",
      "Strict input bundle",
      hasAll(contract.strictInputBundle, REQUIRED_INPUT_BUNDLE),
      contract.strictInputBundle.join(", "),
    ),
    check(
      "approved-output-sections",
      "Approved output sections",
      hasAll(contract.approvedOutputSections, REQUIRED_OUTPUT_SECTIONS),
      contract.approvedOutputSections.join(", "),
    ),
    check(
      "status-values",
      "Status values",
      hasAll(contract.statusValues, [
        "draft",
        "needs_clarification",
        "needs_evidence",
        "needs_human_review",
        "blocked",
        "matchable",
      ]),
      contract.statusValues.join(", "),
    ),
    check(
      "trust-axes",
      "Trust axes stay separate",
      hasAll(contract.trustAxes, [
        "factual_trust",
        "counterfactual_baseline",
        "externality_review",
        "party_relative_benefit",
        "privacy_redaction",
      ]),
      contract.trustAxes.join(", "),
    ),
    check(
      "guardrails",
      "Copilot guardrails",
      hasAll(
        contract.guardrails.map((guardrail) => guardrail.code),
        REQUIRED_GUARDRAILS,
      ),
      `${contract.guardrails.length} guardrail(s), including no outreach and no global ranking.`,
    ),
    check(
      "verification-loop",
      "Fixed verification loop",
      hasAll(
        contract.verificationLoop.map((step) => step.key),
        REQUIRED_VERIFICATION_STEPS,
      ),
      contract.verificationLoop.map((step) => step.key).join(", "),
    ),
    check(
      "rollout-stages",
      "Constrained rollout stages",
      hasAll(
        contract.rolloutStages.map((stage) => stage.key),
        REQUIRED_ROLLOUT_STAGES,
      ) &&
        contract.humanControlledDecisions.includes("safety_blocking") &&
        contract.humanControlledDecisions.includes("dispute_resolution"),
      contract.rolloutStages.map((stage) => stage.key).join(", "),
    ),
    check(
      "safe-fallback",
      "Safe fallback",
      /deterministic|manual/i.test(contract.fallbackRule) && /without changing proposal state/i.test(contract.fallbackRule),
      contract.fallbackRule,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-copilot-contract",
    validatorVersion: MORAL_TRADE_COPILOT_CONTRACT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

export function buildMoralTradeCopilotOutput(
  input: MoralTradeProtocolDraftInput,
  citations: string[] = [],
): MoralTradeCopilotOutput {
  const review = evaluateMoralTradeProtocolDraft(input);

  return {
    status: review.status,
    completeness: {
      missing_required_fields: review.missingRequiredFields,
      underspecified_fields: review.underspecifiedFields,
      policy_conflicts: review.policyConflicts,
    },
    trade_structure: {
      format: clean(input.format),
      offered_action: clean(input.offeredAction),
      requested_action: clean(input.requestedAction),
      duration: clean(input.duration),
      exit_conditions: clean(input.exitConditions),
      verification_method: clean(input.verificationMethod),
    },
    trust_assessment: {
      factual_trust: review.trustAssessment.factualTrust,
      counterfactual_baseline: review.trustAssessment.counterfactualBaseline,
      externality_review: review.trustAssessment.externalityReview,
      party_relative_benefit: review.trustAssessment.partyRelativeBenefit,
      privacy_redaction: review.trustAssessment.privacyRedaction,
    },
    match_explanation: {
      factor_codes: review.factorCodes,
      confidence_band: getConfidenceBand(review),
      redactions_applied: copilotContract.redactionsAppliedByDefault,
    },
    verification_loop: review.verificationLoop.map((step) => ({
      key: step.key,
      label: step.label,
      status: step.status,
      detail: step.detail,
      blocks_matchable: step.blocksMatchable,
    })),
    clarification_questions: review.clarificationQuestions,
    uncertainty_flags: review.uncertaintyFlags,
    next_step_checklist: review.nextStepChecklist,
    cited_evidence_table: review.citedEvidenceTable.map((row) => ({
      claim: row.claim,
      evidence_type: row.evidenceType,
      citation: row.citation,
      status: row.status,
      reviewer_note: row.reviewerNote,
    })),
    review_instructions: {
      artifacts_to_request: review.reviewInstructions.artifactsToRequest,
      review_scope: review.reviewInstructions.reviewScope,
      appeal_triggers: review.reviewInstructions.appealTriggers,
    },
    reviewer_summary: review.reviewerSummary,
    citations,
  };
}

export function validateMoralTradeCopilotOutput(output: MoralTradeCopilotOutput) {
  const blockers: string[] = [];

  if (!copilotContract.statusValues.includes(output.status)) {
    blockers.push("status: unrecognized copilot status");
  }

  if (output.status === "matchable" && output.completeness.policy_conflicts.length > 0) {
    blockers.push("policy_conflicts: blocked proposals cannot be matchable");
  }

  if (output.status === "matchable" && output.completeness.missing_required_fields.length > 0) {
    blockers.push("missing_required_fields: incomplete drafts cannot be matchable");
  }

  if (!output.match_explanation.redactions_applied.length) {
    blockers.push("redactions_applied: privacy-safe outputs must name default redactions");
  }

  if (
    !hasAll(
      output.verification_loop.map((step) => step.key),
      copilotContract.verificationLoop.map((step) => step.key),
    ) ||
    output.verification_loop.some(
      (step) => !step.label || !step.status || !step.detail || typeof step.blocks_matchable !== "boolean",
    )
  ) {
    blockers.push("verification_loop: every fixed verification step needs status and detail");
  }

  if (output.clarification_questions.length > 5) {
    blockers.push("clarification_questions: at most five field-tied questions are allowed");
  }

  if (
    (output.completeness.missing_required_fields.length > 0 ||
      output.completeness.underspecified_fields.length > 0) &&
    output.clarification_questions.length === 0
  ) {
    blockers.push("clarification_questions: incomplete drafts need field-tied questions");
  }

  if (!output.next_step_checklist.length) {
    blockers.push("next_step_checklist: required next steps are missing");
  }

  if (
    !output.cited_evidence_table.length ||
    output.cited_evidence_table.some(
      (row) => !row.claim || !row.citation || !row.status || !row.reviewer_note,
    )
  ) {
    blockers.push("cited_evidence_table: structured claim evidence rows with citations are required");
  }

  if (!output.reviewer_summary || output.reviewer_summary.split(/\s+/).filter(Boolean).length > 180) {
    blockers.push("reviewer_summary: bounded reviewer summary is missing or over 180 words");
  }

  if (
    !output.trust_assessment.factual_trust ||
    !output.trust_assessment.counterfactual_baseline ||
    !output.trust_assessment.externality_review ||
    !output.trust_assessment.party_relative_benefit ||
    !output.trust_assessment.privacy_redaction
  ) {
    blockers.push(
      "trust_assessment: factual, baseline, externality, party-relative, and privacy-redaction axes are required",
    );
  }

  return {
    status: blockers.length ? "fail" : "pass",
    blockers,
  };
}
