export const MORAL_TRADE_CHALLENGE_APPEAL_CONTRACT_VERSION =
  "moral-trade-challenge-appeal-v0.1";
export const MORAL_TRADE_CHALLENGE_APPEAL_VALIDATOR_VERSION =
  "moral-trade-challenge-appeal-validator-v0.1";

export type MoralTradeChallengeSubject =
  | "claim"
  | "evidence_row"
  | "baseline_concern"
  | "disclosure_decision"
  | "externality_trigger"
  | "completion_state"
  | "policy_flag";

export type MoralTradeChallengeStanding =
  | "participant"
  | "counterparty"
  | "affected_party"
  | "reviewer"
  | "admin_safety"
  | "external_verifier";

export type MoralTradeAppealTrigger =
  | "duplicate_proof"
  | "coercive_baseline"
  | "wrong_scope_evidence"
  | "material_factual_error"
  | "privacy_disclosure_error"
  | "externality_remedy_gap"
  | "reviewer_conflict"
  | "policy_misapplied";

export type MoralTradeChallengeAppealOutcome =
  | "uphold_decision"
  | "request_evidence"
  | "route_human_review"
  | "open_challenge_window"
  | "block_reliance"
  | "record_remedy"
  | "close_unresolved"
  | "correct_record";

export type MoralTradeChallengeAppealStatus =
  | "ready_for_human_review"
  | "needs_scope"
  | "needs_standing"
  | "needs_redaction"
  | "disputed_unresolved";

export type MoralTradeChallengeAppealFactorCode =
  | "specific_reviewed_claim"
  | "standing_established"
  | "affected_party_standing"
  | "evidence_scope_named"
  | "duplicate_proof_review"
  | "coercive_baseline_review"
  | "wrong_scope_evidence_review"
  | "material_factual_error_review"
  | "privacy_disclosure_review"
  | "externality_remedy_review"
  | "reviewer_conflict_review"
  | "policy_flag_review"
  | "challenge_window_required"
  | "human_review_required"
  | "no_unrelated_moral_disagreement"
  | "provenance_activity_required"
  | "private_details_redacted";

export interface MoralTradeChallengeAppealInput {
  requestId: string;
  subject: MoralTradeChallengeSubject;
  standing: MoralTradeChallengeStanding;
  trigger: MoralTradeAppealTrigger;
  summary: string;
  claimId?: string;
  evidenceRowId?: string;
  priorDecisionId?: string;
  challengeWindowOpen?: boolean;
  containsPrivateDetails?: boolean;
  requestedOutcome?: MoralTradeChallengeAppealOutcome;
  affectedPartyStandingSummary?: string;
  remedyRequested?: string;
  reviewerConflictDeclared?: boolean;
}

export interface MoralTradeChallengeAppealDecision {
  status: MoralTradeChallengeAppealStatus;
  outcome: MoralTradeChallengeAppealOutcome;
  factorCodes: MoralTradeChallengeAppealFactorCode[];
  humanReviewRequired: true;
  stateMutation: false;
  standingAccepted: boolean;
  reviewScope: MoralTradeChallengeSubject[];
  requiredArtifacts: string[];
  privacyActions: string[];
  provenanceActivity: "challenge_window_opened" | "review_completed";
  traceabilityBusinessStep: "challenge_opened" | "review_decision_recorded";
  appealScopeStatement: string;
  blockers: string[];
}

export interface MoralTradeChallengeAppealContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeChallengeAppealValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-challenge-appeal-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeChallengeAppealContractCheck[];
  blockers: string[];
}

export interface MoralTradeChallengeAppealDecisionValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-challenge-appeal-decision";
  validatorVersion: string;
  checks: MoralTradeChallengeAppealContractCheck[];
  blockers: string[];
}

export interface MoralTradeChallengeAppealContract {
  version: string;
  purpose: string;
  decisioningMode: "deterministic_challenge_appeal_scope_only";
  stateMutation: false;
  subjects: MoralTradeChallengeSubject[];
  standingCategories: MoralTradeChallengeStanding[];
  appealTriggers: MoralTradeAppealTrigger[];
  allowedOutcomes: MoralTradeChallengeAppealOutcome[];
  approvedFactorCodes: MoralTradeChallengeAppealFactorCode[];
  invariants: string[];
  sampleInput: MoralTradeChallengeAppealInput;
  sampleDecision: MoralTradeChallengeAppealDecision;
  contractTests: string[];
}

const CHALLENGE_SUBJECTS = [
  "claim",
  "evidence_row",
  "baseline_concern",
  "disclosure_decision",
  "externality_trigger",
  "completion_state",
  "policy_flag",
] as const satisfies readonly MoralTradeChallengeSubject[];

const STANDING_CATEGORIES = [
  "participant",
  "counterparty",
  "affected_party",
  "reviewer",
  "admin_safety",
  "external_verifier",
] as const satisfies readonly MoralTradeChallengeStanding[];

const APPEAL_TRIGGERS = [
  "duplicate_proof",
  "coercive_baseline",
  "wrong_scope_evidence",
  "material_factual_error",
  "privacy_disclosure_error",
  "externality_remedy_gap",
  "reviewer_conflict",
  "policy_misapplied",
] as const satisfies readonly MoralTradeAppealTrigger[];

const ALLOWED_OUTCOMES = [
  "uphold_decision",
  "request_evidence",
  "route_human_review",
  "open_challenge_window",
  "block_reliance",
  "record_remedy",
  "close_unresolved",
  "correct_record",
] as const satisfies readonly MoralTradeChallengeAppealOutcome[];

const APPROVED_FACTOR_CODES = [
  "specific_reviewed_claim",
  "standing_established",
  "affected_party_standing",
  "evidence_scope_named",
  "duplicate_proof_review",
  "coercive_baseline_review",
  "wrong_scope_evidence_review",
  "material_factual_error_review",
  "privacy_disclosure_review",
  "externality_remedy_review",
  "reviewer_conflict_review",
  "policy_flag_review",
  "challenge_window_required",
  "human_review_required",
  "no_unrelated_moral_disagreement",
  "provenance_activity_required",
  "private_details_redacted",
] as const satisfies readonly MoralTradeChallengeAppealFactorCode[];

const CONTRACT_TESTS = [
  "challenge_appeal_contract_validator",
  "challenge_appeal_evaluate_route_contract",
  "challenge_appeal_scope_smoke",
  "technical_spec_challenge_appeal_smoke",
] as const;

const SAMPLE_INPUT: MoralTradeChallengeAppealInput = {
  requestId: "appeal-sample-001",
  subject: "evidence_row",
  standing: "affected_party",
  trigger: "wrong_scope_evidence",
  claimId: "claim-sample-001",
  evidenceRowId: "evidence-row-002",
  priorDecisionId: "review-decision-001",
  challengeWindowOpen: true,
  summary:
    "The public receipt was used to support a counterfactual baseline claim, but it only proves a payment happened.",
  affectedPartyStandingSummary:
    "The challenged baseline affects the public summary for a community named in the externality review.",
  remedyRequested:
    "Keep the completion badge paused until reviewers separate factual payment proof from baseline confidence.",
};

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeChallengeAppealContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function codeForTrigger(trigger: MoralTradeAppealTrigger): MoralTradeChallengeAppealFactorCode {
  switch (trigger) {
    case "duplicate_proof":
      return "duplicate_proof_review";
    case "coercive_baseline":
      return "coercive_baseline_review";
    case "wrong_scope_evidence":
      return "wrong_scope_evidence_review";
    case "material_factual_error":
      return "material_factual_error_review";
    case "privacy_disclosure_error":
      return "privacy_disclosure_review";
    case "externality_remedy_gap":
      return "externality_remedy_review";
    case "reviewer_conflict":
      return "reviewer_conflict_review";
    case "policy_misapplied":
      return "policy_flag_review";
  }
}

function defaultOutcomeForInput(
  input: MoralTradeChallengeAppealInput,
  blockers: readonly string[],
): MoralTradeChallengeAppealOutcome {
  if (input.containsPrivateDetails) {
    return "route_human_review";
  }

  if (blockers.length) {
    return blockers.some((blocker) => /standing/i.test(blocker))
      ? "route_human_review"
      : "request_evidence";
  }

  if (input.trigger === "externality_remedy_gap") {
    return "record_remedy";
  }

  if (
    input.trigger === "duplicate_proof" ||
    input.trigger === "coercive_baseline" ||
    input.trigger === "wrong_scope_evidence" ||
    input.trigger === "material_factual_error"
  ) {
    return "open_challenge_window";
  }

  if (input.trigger === "privacy_disclosure_error") {
    return "block_reliance";
  }

  return "route_human_review";
}

function requiredArtifactsForInput(input: MoralTradeChallengeAppealInput) {
  const artifacts = ["prior review decision and reason codes"];

  if (input.subject === "evidence_row" || input.trigger === "wrong_scope_evidence") {
    artifacts.push("scoped evidence row and claim linkage");
  }

  if (input.trigger === "duplicate_proof") {
    artifacts.push("artifact digest or duplicate-proof locator");
  }

  if (input.trigger === "coercive_baseline") {
    artifacts.push("dated no-trade baseline and prior-intent evidence");
  }

  if (input.trigger === "material_factual_error") {
    artifacts.push("corrected factual source or attestation");
  }

  if (input.trigger === "externality_remedy_gap") {
    artifacts.push("affected-party standing summary and remedy path");
  }

  if (input.trigger === "reviewer_conflict") {
    artifacts.push("reviewer conflict disclosure");
  }

  return unique(artifacts);
}

function getInputBlockers(input: MoralTradeChallengeAppealInput) {
  const blockers: string[] = [];

  if (!input.requestId.trim()) {
    blockers.push("request_id_required");
  }

  if (!input.summary.trim()) {
    blockers.push("appeal_summary_required");
  }

  if (
    (input.subject === "claim" ||
      input.subject === "baseline_concern" ||
      input.subject === "completion_state") &&
    !input.claimId?.trim()
  ) {
    blockers.push("claim_id_required_for_subject");
  }

  if (input.subject === "evidence_row" && !input.evidenceRowId?.trim()) {
    blockers.push("evidence_row_id_required");
  }

  if (
    (input.subject === "disclosure_decision" ||
      input.subject === "policy_flag" ||
      input.trigger === "policy_misapplied") &&
    !input.priorDecisionId?.trim()
  ) {
    blockers.push("prior_decision_id_required_for_policy_or_disclosure_appeal");
  }

  if (
    input.standing === "affected_party" &&
    !input.affectedPartyStandingSummary?.trim()
  ) {
    blockers.push("affected_party_standing_summary_required");
  }

  if (input.trigger === "externality_remedy_gap" && !input.remedyRequested?.trim()) {
    blockers.push("remedy_requested_required");
  }

  if (input.trigger === "reviewer_conflict" && !input.reviewerConflictDeclared) {
    blockers.push("reviewer_conflict_disclosure_required");
  }

  if (input.containsPrivateDetails) {
    blockers.push("private_details_must_be_redacted_before_review");
  }

  return blockers;
}

export function evaluateMoralTradeChallengeAppeal(
  input: MoralTradeChallengeAppealInput,
): MoralTradeChallengeAppealDecision {
  const inputBlockers = getInputBlockers(input);
  const factorCodes: MoralTradeChallengeAppealFactorCode[] = [
    "specific_reviewed_claim",
    "human_review_required",
    "no_unrelated_moral_disagreement",
    "provenance_activity_required",
    codeForTrigger(input.trigger),
  ];
  const standingAccepted =
    input.standing !== "affected_party" ||
    Boolean(input.affectedPartyStandingSummary?.trim());

  if (standingAccepted) {
    factorCodes.push("standing_established");
  }

  if (input.standing === "affected_party") {
    factorCodes.push("affected_party_standing");
  }

  if (input.evidenceRowId || input.subject === "evidence_row") {
    factorCodes.push("evidence_scope_named");
  }

  if (
    input.challengeWindowOpen ||
    input.trigger === "duplicate_proof" ||
    input.trigger === "coercive_baseline" ||
    input.trigger === "wrong_scope_evidence" ||
    input.trigger === "material_factual_error"
  ) {
    factorCodes.push("challenge_window_required");
  }

  if (input.containsPrivateDetails) {
    factorCodes.push("private_details_redacted");
  }

  const outcome = defaultOutcomeForInput(input, inputBlockers);
  let status: MoralTradeChallengeAppealStatus = "ready_for_human_review";

  if (input.containsPrivateDetails) {
    status = "needs_redaction";
  } else if (inputBlockers.some((blocker) => /standing/i.test(blocker))) {
    status = "needs_standing";
  } else if (inputBlockers.length) {
    status = "needs_scope";
  } else if (!input.challengeWindowOpen && outcome === "request_evidence") {
    status = "disputed_unresolved";
  }

  return {
    status,
    outcome,
    factorCodes: unique(factorCodes),
    humanReviewRequired: true,
    stateMutation: false,
    standingAccepted,
    reviewScope: unique([input.subject]),
    requiredArtifacts: requiredArtifactsForInput(input),
    privacyActions: input.containsPrivateDetails
      ? ["redact exact wishes, contact details, raw notes, and sensitive constraints before reviewer routing"]
      : ["keep appeal packet scoped to redacted evidence and reason codes"],
    provenanceActivity:
      outcome === "open_challenge_window" ? "challenge_window_opened" : "review_completed",
    traceabilityBusinessStep:
      outcome === "open_challenge_window" ? "challenge_opened" : "review_decision_recorded",
    appealScopeStatement:
      "Appeal only the specific reviewed claim, evidence row, baseline concern, disclosure decision, externality trigger, completion state, or policy flag; unrelated moral disagreements stay out of scope by default.",
    blockers: inputBlockers,
  };
}

export function validateMoralTradeChallengeAppealDecision(
  decision: MoralTradeChallengeAppealDecision,
): MoralTradeChallengeAppealDecisionValidation {
  const factorCodes = decision.factorCodes.map(String);
  const checks = [
    check(
      "human-review-and-nonmutation",
      "Challenge and appeal decisions require human review and never mutate live state",
      decision.humanReviewRequired === true && decision.stateMutation === false,
      `humanReviewRequired ${decision.humanReviewRequired}; stateMutation ${decision.stateMutation}`,
    ),
    check(
      "approved-factor-codes",
      "Decision uses only approved challenge and appeal factor codes",
      factorCodes.every((code) => APPROVED_FACTOR_CODES.includes(code as MoralTradeChallengeAppealFactorCode)),
      factorCodes.join(", "),
    ),
    check(
      "required-factor-codes",
      "Decision preserves scope, human-review, provenance, and no-unrelated-disagreement factors",
      hasAll(factorCodes, [
        "specific_reviewed_claim",
        "human_review_required",
        "no_unrelated_moral_disagreement",
        "provenance_activity_required",
      ]),
      factorCodes.join(", "),
    ),
    check(
      "appeal-scope-statement",
      "Decision states the narrow appeal scope",
      /specific reviewed claim/i.test(decision.appealScopeStatement) &&
        /unrelated moral disagreements/i.test(decision.appealScopeStatement),
      decision.appealScopeStatement,
    ),
    check(
      "provenance-routing",
      "Decision names a provenance activity and traceability business step",
      ["challenge_window_opened", "review_completed"].includes(decision.provenanceActivity) &&
        ["challenge_opened", "review_decision_recorded"].includes(
          decision.traceabilityBusinessStep,
        ),
      `${decision.provenanceActivity}; ${decision.traceabilityBusinessStep}`,
    ),
    check(
      "ready-status-has-no-blockers",
      "Ready decisions have no blockers",
      decision.status !== "ready_for_human_review" || decision.blockers.length === 0,
      `${decision.status}; blockers ${decision.blockers.length}`,
    ),
    check(
      "private-details-route-redaction",
      "Private-detail blockers produce redaction actions",
      !decision.blockers.includes("private_details_must_be_redacted_before_review") ||
        (decision.status === "needs_redaction" &&
          decision.factorCodes.includes("private_details_redacted") &&
          decision.privacyActions.length > 0),
      decision.privacyActions.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-challenge-appeal-decision",
    validatorVersion: MORAL_TRADE_CHALLENGE_APPEAL_VALIDATOR_VERSION,
    checks,
    blockers,
  };
}

export function getMoralTradeChallengeAppealContract(): MoralTradeChallengeAppealContract {
  const sampleDecision = evaluateMoralTradeChallengeAppeal(SAMPLE_INPUT);

  return {
    version: MORAL_TRADE_CHALLENGE_APPEAL_CONTRACT_VERSION,
    purpose:
      "Public contract for challenge windows and appeal handling: scope each appeal to a reviewed claim, evidence row, baseline concern, disclosure decision, externality trigger, completion state, or policy flag; verify standing and remedy paths; require human review before any state change.",
    decisioningMode: "deterministic_challenge_appeal_scope_only",
    stateMutation: false,
    subjects: [...CHALLENGE_SUBJECTS],
    standingCategories: [...STANDING_CATEGORIES],
    appealTriggers: [...APPEAL_TRIGGERS],
    allowedOutcomes: [...ALLOWED_OUTCOMES],
    approvedFactorCodes: [...APPROVED_FACTOR_CODES],
    invariants: [
      "Appeals target only the specific reviewed claim, evidence row, baseline concern, disclosure decision, externality trigger, completion state, or policy flag.",
      "Appeals do not reopen unrelated moral disagreements by default and do not create platform-wide moral rankings.",
      "Participant, counterparty, affected-party, reviewer, admin-safety, and external-verifier standing are explicit; affected-party standing needs a privacy-safe summary.",
      "Externality remedy appeals must name the remedy gap before reliance, completion badges, or public reputation claims proceed.",
      "Private details, exact wishes, contact data, raw notes, and sensitive constraints are redacted before reviewer routing.",
      "Every challenge or appeal packet names a provenance activity, traceability step, reason codes, and human reviewer scope.",
      "Safety blocking, matching disclosure, reviewed completion, and dispute resolution remain human-controlled.",
    ],
    sampleInput: SAMPLE_INPUT,
    sampleDecision,
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeChallengeAppealContract(
  contract: MoralTradeChallengeAppealContract = getMoralTradeChallengeAppealContract(),
): MoralTradeChallengeAppealValidation {
  const sampleDecisionValidation = validateMoralTradeChallengeAppealDecision(
    contract.sampleDecision,
  );
  const checks = [
    check(
      "subject-coverage",
      "Contract publishes all challenge and appeal subject types",
      hasAll(contract.subjects, CHALLENGE_SUBJECTS),
      contract.subjects.join(", "),
    ),
    check(
      "standing-coverage",
      "Contract publishes direct, reviewer, verifier, admin, and affected-party standing",
      hasAll(contract.standingCategories, STANDING_CATEGORIES) &&
        contract.invariants.some((invariant) => /affected-party standing/i.test(invariant)),
      contract.standingCategories.join(", "),
    ),
    check(
      "trigger-and-outcome-coverage",
      "Contract covers appeal triggers and allowed outcomes",
      hasAll(contract.appealTriggers, APPEAL_TRIGGERS) &&
        hasAll(contract.allowedOutcomes, ALLOWED_OUTCOMES),
      `${contract.appealTriggers.join(", ")} -> ${contract.allowedOutcomes.join(", ")}`,
    ),
    check(
      "sample-decision-validation",
      "Sample challenge appeal decision validates",
      sampleDecisionValidation.status === "pass" &&
        contract.sampleDecision.humanReviewRequired &&
        contract.sampleDecision.stateMutation === false &&
        contract.sampleDecision.factorCodes.includes("wrong_scope_evidence_review"),
      `${contract.sampleDecision.status}; blockers ${sampleDecisionValidation.blockers.length}`,
    ),
    check(
      "narrow-appeal-scope",
      "Contract forbids reopening unrelated moral disagreements by default",
      contract.invariants.some((invariant) => /unrelated moral disagreements/i.test(invariant)) &&
        contract.approvedFactorCodes.includes("no_unrelated_moral_disagreement"),
      contract.invariants.join(" | "),
    ),
    check(
      "remedy-and-human-control",
      "Contract preserves remedy handling and human control for dispute resolution",
      contract.invariants.some((invariant) => /remedy gap/i.test(invariant)) &&
        contract.invariants.some((invariant) => /dispute resolution remain human-controlled/i.test(invariant)) &&
        contract.allowedOutcomes.includes("record_remedy"),
      contract.invariants.join(" | "),
    ),
    check(
      "privacy-and-provenance",
      "Contract requires redaction, provenance activity, and traceability",
      contract.invariants.some((invariant) => /Private details/i.test(invariant)) &&
        contract.invariants.some((invariant) => /provenance activity/i.test(invariant)) &&
        contract.approvedFactorCodes.includes("private_details_redacted") &&
        contract.approvedFactorCodes.includes("provenance_activity_required"),
      contract.approvedFactorCodes.join(", "),
    ),
    check(
      "nonmutating-decision-mode",
      "Contract evaluator is non-mutating and scope-only",
      contract.stateMutation === false &&
        contract.decisioningMode === "deterministic_challenge_appeal_scope_only",
      `${contract.decisioningMode}; stateMutation ${contract.stateMutation}`,
    ),
    check(
      "contract-tests",
      "Challenge appeal contract test hooks are named",
      CONTRACT_TESTS.every((hook) => contract.contractTests.includes(hook)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-challenge-appeal-contract",
    validatorVersion: MORAL_TRADE_CHALLENGE_APPEAL_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
