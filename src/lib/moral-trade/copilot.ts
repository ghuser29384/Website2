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

type CopilotPromptTemplate = {
  key: string;
  label: string;
  purpose: string;
  instructionSummary: string[];
  safetyCodes: string[];
  outputRequirements: string[];
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

type CopilotRolloutReadinessSignal = {
  key: string;
  label: string;
  stages: string[];
  rule: string;
};

export type MoralTradeCopilotContract = {
  version: string;
  purpose: string;
  permittedRoles: CopilotRole[];
  promptTemplates: CopilotPromptTemplate[];
  strictInputBundle: string[];
  approvedOutputSections: string[];
  statusValues: string[];
  completenessFields: string[];
  trustAxes: string[];
  guardrails: CopilotGuardrail[];
  verificationLoop: CopilotVerificationStep[];
  redactionsAppliedByDefault: string[];
  rolloutStages: CopilotRolloutStage[];
  rolloutReadinessSignals: CopilotRolloutReadinessSignal[];
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

export type MoralTradeCopilotRolloutStageKey =
  | "shadow_mode"
  | "assist_mode"
  | "guarded_automation";

export interface MoralTradeCopilotRolloutReadinessInput {
  targetStage: MoralTradeCopilotRolloutStageKey;
  contract?: MoralTradeCopilotContract;
  observedRuns?: number;
  validatedOutputRate?: number;
  privacyIncidentCount?: number;
  stateMutationDisabled?: boolean;
  fallbackTested?: boolean;
  humanApprovalRequiredForStatusChanges?: boolean;
  evaluationAuditsPassing?: boolean;
  enabledTasks?: string[];
}

export interface MoralTradeCopilotRolloutReadiness {
  status: "pass" | "blocked";
  targetStage: MoralTradeCopilotRolloutStageKey;
  requiredSignals: string[];
  allowedTasks: string[];
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

const REQUIRED_PROMPT_TEMPLATES = [
  "system_prompt",
  "draft_repair_prompt",
  "matching_prompt",
  "reviewer_summary_prompt",
] as const;

const REQUIRED_PROMPT_SAFETY_CODES = [
  "no_global_moral_ranking",
  "no_autonomous_outreach",
  "no_chain_of_thought",
  "human_review_required",
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
const REQUIRED_ROLLOUT_READINESS_SIGNALS = [
  "state_mutation_disabled",
  "fallback_path_tested",
  "zero_privacy_incidents",
  "human_approval_for_status_changes",
  "minimum_observed_runs",
  "validated_output_rate",
  "sample_evaluation_audits_passing",
  "low_risk_task_scope",
] as const;

const REQUIRED_HUMAN_CONTROLLED_DECISIONS = [
  "safety_blocking",
  "matching_disclosure",
  "reviewed_completion",
  "dispute_resolution",
] as const;

const COPILOT_ROLLOUT_ALLOWED_TASKS: Record<MoralTradeCopilotRolloutStageKey, string[]> = {
  shadow_mode: ["draft_critique", "reviewer_summary_second_screen"],
  assist_mode: ["structured_field_prefill", "factor_code_prefill", "evidence_checklist_prefill"],
  guarded_automation: [
    "missing_field_detection",
    "explanation_generation",
    "evidence_checklist_drafting",
  ],
};

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

function rolloutSignalKeysForStage(
  contract: MoralTradeCopilotContract,
  targetStage: MoralTradeCopilotRolloutStageKey,
) {
  return contract.rolloutReadinessSignals
    .filter((signal) => signal.stages.includes(targetStage))
    .map((signal) => signal.key);
}

function getObservedRunMinimum(targetStage: MoralTradeCopilotRolloutStageKey) {
  if (targetStage === "guarded_automation") {
    return 100;
  }

  if (targetStage === "assist_mode") {
    return 20;
  }

  return 0;
}

function getValidatedOutputRateMinimum(targetStage: MoralTradeCopilotRolloutStageKey) {
  if (targetStage === "guarded_automation") {
    return 0.98;
  }

  if (targetStage === "assist_mode") {
    return 0.95;
  }

  return 0;
}

export function auditMoralTradeCopilotRolloutReadiness({
  targetStage,
  contract = copilotContract,
  observedRuns = 0,
  validatedOutputRate = 0,
  privacyIncidentCount = 0,
  stateMutationDisabled = false,
  fallbackTested = false,
  humanApprovalRequiredForStatusChanges = false,
  evaluationAuditsPassing = false,
  enabledTasks = [],
}: MoralTradeCopilotRolloutReadinessInput): MoralTradeCopilotRolloutReadiness {
  const blockers: string[] = [];
  const stageKnown = contract.rolloutStages.some((stage) => stage.key === targetStage);
  const requiredSignals = stageKnown ? rolloutSignalKeysForStage(contract, targetStage) : [];
  const allowedTasks = COPILOT_ROLLOUT_ALLOWED_TASKS[targetStage] ?? [];
  const minimumObservedRuns = getObservedRunMinimum(targetStage);
  const minimumValidatedOutputRate = getValidatedOutputRateMinimum(targetStage);

  if (!stageKnown) {
    blockers.push(`unknown_rollout_stage:${targetStage}`);
  }

  if (!stateMutationDisabled) {
    blockers.push(`state_mutation_must_remain_disabled:${targetStage}`);
  }

  if (!fallbackTested) {
    blockers.push(`fallback_path_not_tested:${targetStage}`);
  }

  if (privacyIncidentCount > 0) {
    blockers.push(`privacy_incidents_must_be_zero:${privacyIncidentCount}`);
  }

  if (!humanApprovalRequiredForStatusChanges) {
    blockers.push(`human_status_approval_required:${targetStage}`);
  }

  if (observedRuns < minimumObservedRuns) {
    blockers.push(`minimum_observed_runs_required:${minimumObservedRuns}`);
  }

  if (validatedOutputRate < minimumValidatedOutputRate) {
    blockers.push(`validated_output_rate_required:${minimumValidatedOutputRate}`);
  }

  if ((targetStage === "assist_mode" || targetStage === "guarded_automation") && !evaluationAuditsPassing) {
    blockers.push(`sample_evaluation_audits_required:${targetStage}`);
  }

  for (const task of enabledTasks) {
    if (!allowedTasks.includes(task)) {
      blockers.push(`task_not_allowed_for_${targetStage}:${task}`);
    }
  }

  if (
    targetStage === "guarded_automation" &&
    !hasAll(contract.humanControlledDecisions, REQUIRED_HUMAN_CONTROLLED_DECISIONS)
  ) {
    blockers.push("human_controlled_decisions_missing_for_guarded_automation");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    targetStage,
    requiredSignals,
    allowedTasks,
    blockers: Array.from(new Set(blockers)),
  };
}

export function getMoralTradeCopilotRolloutReadinessAudits(
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotRolloutReadiness[] {
  return [
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "shadow_mode",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: ["draft_critique", "reviewer_summary_second_screen"],
    }),
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "assist_mode",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: ["structured_field_prefill", "factor_code_prefill"],
    }),
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "guarded_automation",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: [
        "missing_field_detection",
        "explanation_generation",
        "evidence_checklist_drafting",
      ],
    }),
  ];
}

export function validateMoralTradeCopilotContract(
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotContractValidation {
  const readinessAudits = getMoralTradeCopilotRolloutReadinessAudits(contract);
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
      "prompt-templates",
      "Approved prompt template registry",
      hasAll(
        contract.promptTemplates.map((template) => template.key),
        REQUIRED_PROMPT_TEMPLATES,
      ) &&
        contract.promptTemplates.every(
          (template) =>
            template.instructionSummary.length > 0 &&
            template.safetyCodes.length > 0 &&
            template.outputRequirements.length > 0,
        ),
      contract.promptTemplates.map((template) => template.key).join(", "),
    ),
    check(
      "prompt-template-safety",
      "Prompt templates preserve copilot guardrails",
      hasAll(
        Array.from(
          new Set(contract.promptTemplates.flatMap((template) => template.safetyCodes)),
        ),
        REQUIRED_PROMPT_SAFETY_CODES,
      ) &&
        contract.promptTemplates.some(
          (template) =>
            template.key === "reviewer_summary_prompt" &&
            template.safetyCodes.includes("no_escrow_legal_tax_claims"),
        ) &&
        contract.promptTemplates.some(
          (template) =>
            template.key === "matching_prompt" &&
            template.safetyCodes.includes("no_private_inference"),
        ),
      contract.promptTemplates
        .map((template) => `${template.key}:${template.safetyCodes.join("+")}`)
        .join(", "),
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
      "rollout-readiness-signals",
      "Rollout readiness signals",
      hasAll(
        contract.rolloutReadinessSignals.map((signal) => signal.key),
        REQUIRED_ROLLOUT_READINESS_SIGNALS,
      ) &&
        contract.rolloutReadinessSignals.every((signal) =>
          signal.stages.every((stage) => contract.rolloutStages.some((entry) => entry.key === stage)),
        ),
      contract.rolloutReadinessSignals.map((signal) => signal.key).join(", "),
    ),
    check(
      "rollout-readiness-audit",
      "Default rollout audit starts in shadow mode and blocks higher automation until evidence exists",
      readinessAudits.find((audit) => audit.targetStage === "shadow_mode")?.status === "pass" &&
        readinessAudits
          .filter((audit) => audit.targetStage !== "shadow_mode")
          .every((audit) => audit.status === "blocked"),
      readinessAudits.map((audit) => `${audit.targetStage}:${audit.status}`).join(", "),
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
