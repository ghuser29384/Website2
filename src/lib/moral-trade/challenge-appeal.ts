export const MORAL_TRADE_CHALLENGE_APPEAL_CONTRACT_VERSION =
  "moral-trade-challenge-appeal-v0.3";
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

export type MoralTradeAppealReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeAppealCaseStatus =
  | "draft"
  | "filed"
  | "noticed"
  | "under_neutral_review"
  | "correction_requested"
  | "upheld"
  | "corrected"
  | "dismissed"
  | "closed_unresolved"
  | "superseded"
  | "stale";

export type MoralTradeAppealNoticeState =
  | "missing"
  | "queued"
  | "delivered"
  | "failed"
  | "not_required_for_stage";

export type MoralTradeAppealFailClosedStatus =
  | "appeal_policy_missing"
  | "appeal_policy_not_current"
  | "appeal_case_missing"
  | "appeal_case_stale"
  | "appeal_case_superseded"
  | "standing_missing"
  | "notice_missing"
  | "deadline_missing"
  | "deadline_expired"
  | "neutral_review_missing"
  | "scope_missing"
  | "private_details_unredacted"
  | "safety_blocker_waiver_attempted"
  | "settled_obligation_reopen_attempted"
  | "non_retaliation_missing"
  | "evidence_scope_missing"
  | "invalid_case_hash"
  | "invalid_policy_hash";

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

export interface MoralTradeAppealPolicyRecord {
  policyId: string;
  subject: MoralTradeChallengeSubject;
  status: MoralTradeAppealReviewStatus;
  noticeRequired: boolean;
  deadlineRequired: boolean;
  neutralReviewRequired: boolean;
  nonRetaliationRequired: boolean;
  safetyBlockerWaiverProhibited: boolean;
  settledObligationReopenProhibited: boolean;
  maxAppealAgeDays: number;
  policyHash: string;
  reviewedAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeAppealCaseRecord {
  appealCaseId: string;
  policyRef: string;
  subject: MoralTradeChallengeSubject;
  standing: MoralTradeChallengeStanding;
  trigger: MoralTradeAppealTrigger;
  outcome: MoralTradeChallengeAppealOutcome;
  status: MoralTradeAppealCaseStatus;
  noticeState: MoralTradeAppealNoticeState;
  deadlineAt: string | null;
  filedAt: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  neutralReviewStatus: MoralTradeAppealReviewStatus;
  standingStatus: MoralTradeAppealReviewStatus;
  scopeHash: string | null;
  evidenceScopeRefs: string[];
  privateDetailsRedacted: boolean;
  safetyBlockerWaiverAttempted: boolean;
  settledObligationReopenAttempted: boolean;
  nonRetaliationNoticeSent: boolean;
  caseHash: string;
  supersededBy: string | null;
}

export interface MoralTradeAppealCaseEvaluationInput {
  subject: MoralTradeChallengeSubject;
  trigger: MoralTradeAppealTrigger;
  requiresAppealCase: boolean;
  requiresNeutralReview: boolean;
  checkedAt?: string;
  policies: MoralTradeAppealPolicyRecord[];
  appealCases: MoralTradeAppealCaseRecord[];
}

export interface MoralTradeAppealCaseEvaluation {
  status: "pass" | "blocked";
  subject: MoralTradeChallengeSubject;
  trigger: MoralTradeAppealTrigger;
  checkedAt: string;
  policyCount: number;
  appealCaseCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
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
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  enforcementRule: string;
  enforcementRecordTables: string[];
  enforcementRoute: {
    method: "POST";
    path: "/api/moral-trade/challenge-appeal/enforce";
    auth: "authenticated";
    stateMutation: "append_only_enforcement_record";
  };
  appealCaseStatuses: MoralTradeAppealCaseStatus[];
  noticeStates: MoralTradeAppealNoticeState[];
  failClosedStatuses: MoralTradeAppealFailClosedStatus[];
  approvedFactorCodes: MoralTradeChallengeAppealFactorCode[];
  invariants: string[];
  sampleInput: MoralTradeChallengeAppealInput;
  sampleDecision: MoralTradeChallengeAppealDecision;
  sampleAppealCaseEvaluations: MoralTradeAppealCaseEvaluation[];
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

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_appeal_policies",
  "moral_trade_appeal_cases",
] as const;

const ENFORCEMENT_RECORD_TABLES = [
  "moral_trade_challenge_appeal_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["appeal_case"] as const;

const APPEAL_CASE_STATUSES = [
  "draft",
  "filed",
  "noticed",
  "under_neutral_review",
  "correction_requested",
  "upheld",
  "corrected",
  "dismissed",
  "closed_unresolved",
  "superseded",
  "stale",
] as const satisfies readonly MoralTradeAppealCaseStatus[];

const NOTICE_STATES = [
  "missing",
  "queued",
  "delivered",
  "failed",
  "not_required_for_stage",
] as const satisfies readonly MoralTradeAppealNoticeState[];

const FAIL_CLOSED_STATUSES = [
  "appeal_policy_missing",
  "appeal_policy_not_current",
  "appeal_case_missing",
  "appeal_case_stale",
  "appeal_case_superseded",
  "standing_missing",
  "notice_missing",
  "deadline_missing",
  "deadline_expired",
  "neutral_review_missing",
  "scope_missing",
  "private_details_unredacted",
  "safety_blocker_waiver_attempted",
  "settled_obligation_reopen_attempted",
  "non_retaliation_missing",
  "evidence_scope_missing",
  "invalid_case_hash",
  "invalid_policy_hash",
] as const satisfies readonly MoralTradeAppealFailClosedStatus[];

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

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

const REQUESTED_OUTCOME_TRIGGER_COMPATIBILITY: Record<
  MoralTradeAppealTrigger,
  readonly MoralTradeChallengeAppealOutcome[]
> = {
  duplicate_proof: [
    "request_evidence",
    "route_human_review",
    "open_challenge_window",
    "block_reliance",
    "close_unresolved",
  ],
  coercive_baseline: [
    "request_evidence",
    "route_human_review",
    "open_challenge_window",
    "block_reliance",
    "close_unresolved",
  ],
  wrong_scope_evidence: [
    "request_evidence",
    "route_human_review",
    "open_challenge_window",
    "block_reliance",
    "correct_record",
    "close_unresolved",
  ],
  material_factual_error: [
    "request_evidence",
    "route_human_review",
    "open_challenge_window",
    "block_reliance",
    "correct_record",
    "close_unresolved",
  ],
  privacy_disclosure_error: [
    "route_human_review",
    "block_reliance",
    "correct_record",
    "close_unresolved",
  ],
  externality_remedy_gap: [
    "request_evidence",
    "route_human_review",
    "open_challenge_window",
    "block_reliance",
    "record_remedy",
    "close_unresolved",
  ],
  reviewer_conflict: [
    "request_evidence",
    "route_human_review",
    "uphold_decision",
    "correct_record",
    "close_unresolved",
  ],
  policy_misapplied: [
    "request_evidence",
    "route_human_review",
    "uphold_decision",
    "block_reliance",
    "correct_record",
    "close_unresolved",
  ],
};

const CONTRACT_TESTS = [
  "challenge_appeal_contract_validator",
  "challenge_appeal_evaluate_route_contract",
  "challenge_appeal_enforce_route_contract",
  "challenge_appeal_enforcement_record_schema_contract",
  "appeal_case_record_contract",
  "appeal_case_fail_closed_evaluator",
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

function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (end - start) / 86_400_000);
}

function statusPassed(status: MoralTradeAppealReviewStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function noticePassed(state: MoralTradeAppealNoticeState) {
  return state === "delivered" || state === "not_required_for_stage";
}

function hasValidHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function isExpired(iso: string | null, checkedAt: string) {
  return Boolean(iso && Date.parse(iso) <= Date.parse(checkedAt));
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

function requestedOutcomeIsCompatible(input: MoralTradeChallengeAppealInput) {
  return Boolean(
    input.requestedOutcome &&
      REQUESTED_OUTCOME_TRIGGER_COMPATIBILITY[input.trigger].includes(input.requestedOutcome),
  );
}

function outcomeForInput(
  input: MoralTradeChallengeAppealInput,
  blockers: readonly string[],
): MoralTradeChallengeAppealOutcome {
  if (!blockers.length && requestedOutcomeIsCompatible(input)) {
    return input.requestedOutcome!;
  }

  return defaultOutcomeForInput(input, blockers);
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

  if (input.requestedOutcome && !requestedOutcomeIsCompatible(input)) {
    blockers.push(`requested_outcome_not_compatible:${input.requestedOutcome}:${input.trigger}`);
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

  if (input.standing === "affected_party" && standingAccepted) {
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

  const outcome = outcomeForInput(input, inputBlockers);
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

function isPolicyCurrent(policy: MoralTradeAppealPolicyRecord, checkedAt: string) {
  return (
    statusPassed(policy.status) &&
    Boolean(policy.reviewedAt) &&
    !policy.supersededBy &&
    daysBetween(policy.reviewedAt ?? "", checkedAt) <= policy.maxAppealAgeDays &&
    hasValidHash(policy.policyHash)
  );
}

function isCaseCurrent(
  appealCase: MoralTradeAppealCaseRecord,
  policy: MoralTradeAppealPolicyRecord,
  checkedAt: string,
) {
  if (
    appealCase.status === "stale" ||
    appealCase.status === "superseded" ||
    appealCase.supersededBy ||
    isExpired(appealCase.expiresAt, checkedAt) ||
    !appealCase.filedAt
  ) {
    return false;
  }

  return daysBetween(appealCase.filedAt, checkedAt) <= policy.maxAppealAgeDays;
}

function appealPolicyBlockers(
  policy: MoralTradeAppealPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isPolicyCurrent(policy, checkedAt)) {
    blockers.push(`appeal_policy_not_current:${policy.policyId}`);
  }

  if (!hasValidHash(policy.policyHash)) {
    blockers.push(`invalid_policy_hash:${policy.policyId}`);
  }

  return blockers;
}

function appealCaseBlockers(
  appealCase: MoralTradeAppealCaseRecord,
  policy: MoralTradeAppealPolicyRecord,
  input: MoralTradeAppealCaseEvaluationInput,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isCaseCurrent(appealCase, policy, checkedAt)) {
    blockers.push(`appeal_case_stale:${appealCase.appealCaseId}`);
  }

  if (appealCase.status === "superseded" || appealCase.supersededBy) {
    blockers.push(`appeal_case_superseded:${appealCase.appealCaseId}`);
  }

  if (!statusPassed(appealCase.standingStatus)) {
    blockers.push(`standing_missing:${appealCase.appealCaseId}`);
  }

  if (policy.noticeRequired && !noticePassed(appealCase.noticeState)) {
    blockers.push(`notice_missing:${appealCase.appealCaseId}`);
  }

  if (policy.deadlineRequired && !appealCase.deadlineAt) {
    blockers.push(`deadline_missing:${appealCase.appealCaseId}`);
  }

  if (policy.deadlineRequired && isExpired(appealCase.deadlineAt, checkedAt)) {
    blockers.push(`deadline_expired:${appealCase.appealCaseId}`);
  }

  if (
    (policy.neutralReviewRequired || input.requiresNeutralReview) &&
    !statusPassed(appealCase.neutralReviewStatus)
  ) {
    blockers.push(`neutral_review_missing:${appealCase.appealCaseId}`);
  }

  if (!hasValidHash(appealCase.scopeHash)) {
    blockers.push(`scope_missing:${appealCase.appealCaseId}`);
  }

  if (appealCase.evidenceScopeRefs.length === 0) {
    blockers.push(`evidence_scope_missing:${appealCase.appealCaseId}`);
  }

  if (!appealCase.privateDetailsRedacted) {
    blockers.push(`private_details_unredacted:${appealCase.appealCaseId}`);
  }

  if (policy.safetyBlockerWaiverProhibited && appealCase.safetyBlockerWaiverAttempted) {
    blockers.push(`safety_blocker_waiver_attempted:${appealCase.appealCaseId}`);
  }

  if (
    policy.settledObligationReopenProhibited &&
    appealCase.settledObligationReopenAttempted
  ) {
    blockers.push(`settled_obligation_reopen_attempted:${appealCase.appealCaseId}`);
  }

  if (policy.nonRetaliationRequired && !appealCase.nonRetaliationNoticeSent) {
    blockers.push(`non_retaliation_missing:${appealCase.appealCaseId}`);
  }

  if (!hasValidHash(appealCase.caseHash)) {
    blockers.push(`invalid_case_hash:${appealCase.appealCaseId}`);
  }

  return blockers;
}

function appealUserFacingCategories(blockers: readonly string[]) {
  const categories = new Set<string>();

  for (const blocker of blockers) {
    if (blocker.includes("policy")) {
      categories.add("Appeal policy is not frozen and current");
    } else if (blocker.includes("notice") || blocker.includes("deadline")) {
      categories.add("Appeal notice or deadline evidence is incomplete");
    } else if (blocker.includes("neutral") || blocker.includes("standing")) {
      categories.add("Appeal standing or neutral review is incomplete");
    } else if (blocker.includes("safety") || blocker.includes("settled")) {
      categories.add("Appeal cannot waive safety blockers or silently reopen settled obligations");
    } else {
      categories.add("Appeal case record is not ready");
    }
  }

  return Array.from(categories);
}

export function evaluateMoralTradeAppealCase(
  input: MoralTradeAppealCaseEvaluationInput,
): MoralTradeAppealCaseEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const matchingPolicies = input.policies.filter(
    (policy) => policy.subject === input.subject,
  );
  const activePolicy =
    matchingPolicies.find((policy) => isPolicyCurrent(policy, checkedAt)) ??
    matchingPolicies[0];
  const matchingCases = activePolicy
    ? input.appealCases.filter(
        (appealCase) =>
          appealCase.policyRef === activePolicy.policyId &&
          appealCase.subject === input.subject &&
          appealCase.trigger === input.trigger,
      )
    : [];
  const activeCase = activePolicy
    ? matchingCases.find((appealCase) =>
        isCaseCurrent(appealCase, activePolicy, checkedAt),
      ) ?? matchingCases[0]
    : undefined;
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`appeal_policy_missing:${input.subject}`);
  } else {
    blockers.push(...appealPolicyBlockers(activePolicy, checkedAt));
  }

  if (input.requiresAppealCase) {
    if (!activeCase) {
      blockers.push(`appeal_case_missing:${input.subject}:${input.trigger}`);
    } else if (activePolicy) {
      blockers.push(...appealCaseBlockers(activeCase, activePolicy, input, checkedAt));
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    subject: input.subject,
    trigger: input.trigger,
    checkedAt,
    policyCount: matchingPolicies.length,
    appealCaseCount: matchingCases.length,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: appealUserFacingCategories(uniqueBlockers),
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
      "standing-factor-consistency",
      "Affected-party standing factors require an accepted privacy-safe standing summary",
      !decision.blockers.includes("affected_party_standing_summary_required") ||
        (!decision.standingAccepted &&
          !decision.factorCodes.includes("standing_established") &&
          !decision.factorCodes.includes("affected_party_standing")),
      `${decision.standingAccepted}; ${factorCodes.join(", ")}`,
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

function sampleAppealPolicy(
  subject: MoralTradeChallengeSubject,
  overrides: Partial<MoralTradeAppealPolicyRecord> = {},
): MoralTradeAppealPolicyRecord {
  return {
    policyId: `appeal-policy-${subject}`,
    subject,
    status: "passed",
    noticeRequired: true,
    deadlineRequired: true,
    neutralReviewRequired: true,
    nonRetaliationRequired: true,
    safetyBlockerWaiverProhibited: true,
    settledObligationReopenProhibited: true,
    maxAppealAgeDays: 30,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleAppealCase(
  policyRef: string,
  overrides: Partial<MoralTradeAppealCaseRecord> = {},
): MoralTradeAppealCaseRecord {
  return {
    appealCaseId: "appeal-case-sample",
    policyRef,
    subject: "evidence_row",
    standing: "affected_party",
    trigger: "wrong_scope_evidence",
    outcome: "open_challenge_window",
    status: "under_neutral_review",
    noticeState: "delivered",
    deadlineAt: "2026-06-20T00:00:00.000Z",
    filedAt: "2026-06-02T00:00:00.000Z",
    reviewedAt: null,
    expiresAt: "2026-06-25T00:00:00.000Z",
    neutralReviewStatus: "passed",
    standingStatus: "passed",
    scopeHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    evidenceScopeRefs: ["evidence-row-002", "review-decision-001"],
    privateDetailsRedacted: true,
    safetyBlockerWaiverAttempted: false,
    settledObligationReopenAttempted: false,
    nonRetaliationNoticeSent: true,
    caseHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    supersededBy: null,
    ...overrides,
  };
}

function buildSampleAppealCaseEvaluations() {
  const policy = sampleAppealPolicy("evidence_row");
  const currentCase = sampleAppealCase(policy.policyId);
  const blockedCase = sampleAppealCase(policy.policyId, {
    appealCaseId: "appeal-case-blocked",
    noticeState: "missing",
    deadlineAt: null,
    neutralReviewStatus: "missing",
    standingStatus: "missing",
    scopeHash: null,
    evidenceScopeRefs: [],
    privateDetailsRedacted: false,
    safetyBlockerWaiverAttempted: true,
    settledObligationReopenAttempted: true,
    nonRetaliationNoticeSent: false,
    caseHash: "invalid-hash",
  });

  return [
    evaluateMoralTradeAppealCase({
      subject: "evidence_row",
      trigger: "wrong_scope_evidence",
      requiresAppealCase: true,
      requiresNeutralReview: true,
      checkedAt: "2026-06-03T00:00:00.000Z",
      policies: [policy],
      appealCases: [currentCase],
    }),
    evaluateMoralTradeAppealCase({
      subject: "evidence_row",
      trigger: "wrong_scope_evidence",
      requiresAppealCase: true,
      requiresNeutralReview: true,
      checkedAt: "2026-06-03T00:00:00.000Z",
      policies: [policy],
      appealCases: [blockedCase],
    }),
  ];
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
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    enforcementRule:
      "Adverse-decision correction reliance requires an authenticated append-only challenge-appeal enforcement record that evaluates frozen appeal policies and appeal cases; enforcement records cannot open appeals, correct records, allow reliance, waive safety blockers, reopen settled obligations, or publish public metrics.",
    enforcementRecordTables: [...ENFORCEMENT_RECORD_TABLES],
    enforcementRoute: {
      method: "POST",
      path: "/api/moral-trade/challenge-appeal/enforce",
      auth: "authenticated",
      stateMutation: "append_only_enforcement_record",
    },
    appealCaseStatuses: [...APPEAL_CASE_STATUSES],
    noticeStates: [...NOTICE_STATES],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    approvedFactorCodes: [...APPROVED_FACTOR_CODES],
    invariants: [
      "Appeals target only the specific reviewed claim, evidence row, baseline concern, disclosure decision, externality trigger, completion state, or policy flag.",
      "Appeals do not reopen unrelated moral disagreements by default and do not create platform-wide moral rankings.",
      "Participant, counterparty, affected-party, reviewer, admin-safety, and external-verifier standing are explicit; affected-party standing needs a privacy-safe summary.",
      "Adverse decisions with correction rights require first-class appeal cases with notice, deadline, scope hash, evidence scope, non-retaliation, and neutral-review fields.",
      "Appeal cases do not silently reopen settled obligations, waive safety blockers, mutate parent records, or expose private details before redaction.",
      "Externality remedy appeals must name the remedy gap before reliance, completion badges, or public reputation claims proceed.",
      "Requested outcomes are advisory and must be compatible with the appeal trigger before reviewers can route them.",
      "Private details, exact wishes, contact data, raw notes, and sensitive constraints are redacted before reviewer routing.",
      "Every challenge or appeal packet names a provenance activity, traceability step, reason codes, and human reviewer scope.",
      "Safety blocking, matching disclosure, reviewed completion, and dispute resolution remain human-controlled.",
    ],
    sampleInput: SAMPLE_INPUT,
    sampleDecision,
    sampleAppealCaseEvaluations: buildSampleAppealCaseEvaluations(),
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
      "first-class-record-coverage",
      "Appeals have first-class policy and case records",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES) &&
        hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      `${contract.firstClassRecordTables.join(", ")}; ${contract.policySnapshotSubjects.join(", ")}`,
    ),
    check(
      "enforcement-record-coverage",
      "Appeal-case enforcement has an authenticated append-only record route",
      hasAll(contract.enforcementRecordTables, ENFORCEMENT_RECORD_TABLES) &&
        contract.enforcementRoute.method === "POST" &&
        contract.enforcementRoute.path === "/api/moral-trade/challenge-appeal/enforce" &&
        contract.enforcementRoute.auth === "authenticated" &&
        /cannot open appeals, correct records, allow reliance, waive safety blockers/i.test(
          contract.enforcementRule,
        ),
      `${contract.enforcementRoute.method} ${contract.enforcementRoute.path}; ${contract.enforcementRecordTables.join(", ")}`,
    ),
    check(
      "appeal-case-state-coverage",
      "Appeal cases publish lifecycle and notice states",
      hasAll(contract.appealCaseStatuses, APPEAL_CASE_STATUSES) &&
        hasAll(contract.noticeStates, NOTICE_STATES),
      `${contract.appealCaseStatuses.join(", ")}; ${contract.noticeStates.join(", ")}`,
    ),
    check(
      "appeal-case-fail-closed-coverage",
      "Appeal cases fail closed for missing notice, deadline, scope, neutral review, redaction, and safety controls",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
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
      "sample-appeal-case-evaluations",
      "Sample appeal-case evaluations prove pass and blocked cases",
      contract.sampleAppealCaseEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleAppealCaseEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => /notice_missing|neutral_review_missing/.test(blocker)),
        ),
      contract.sampleAppealCaseEvaluations.map((evaluation) => evaluation.status).join(", "),
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
      "no-silent-reopen-or-safety-waiver",
      "Appeal cases cannot silently reopen settled obligations or waive safety blockers",
      contract.invariants.some((invariant) => /silently reopen settled obligations/i.test(invariant)) &&
        contract.invariants.some((invariant) => /waive safety blockers/i.test(invariant)) &&
        contract.failClosedStatuses.includes("settled_obligation_reopen_attempted") &&
        contract.failClosedStatuses.includes("safety_blocker_waiver_attempted"),
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
