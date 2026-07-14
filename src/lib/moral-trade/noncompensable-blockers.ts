export const MORAL_TRADE_NONCOMPENSABLE_BLOCKER_CONTRACT_VERSION =
  "moral-trade-noncompensable-blockers-v0.1-2026-06";
export const MORAL_TRADE_NONCOMPENSABLE_BLOCKER_VALIDATOR_VERSION =
  "moral-trade-noncompensable-blocker-validator-v0.1";

export type MoralTradeNoncompensableBlockerTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "reliance"
  | "public_completion_count"
  | "release_gate_promotion";

export type MoralTradeNoncompensableBlockerSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "compensated_action_terms"
  | "pledge_performance_bond_record"
  | "side_agreement_disclosure"
  | "payment_event"
  | "evidence_record"
  | "dispute_case";

export type MoralTradeProtectedInterestType =
  | "participant_waivable_interest"
  | "nonparticipant_interest"
  | "legal_or_regulatory"
  | "public_safety"
  | "truthful_reporting"
  | "civil_rights"
  | "confidentiality_or_privacy"
  | "institutional_process"
  | "digital_system_integrity"
  | "anti_threat"
  | "other";

export type MoralTradeAttemptedCompensationOrWaiverState =
  | "none"
  | "possible"
  | "under_review"
  | "blocking"
  | "superseded";

export type MoralTradePersonalWaiverAllowedState =
  | "not_applicable"
  | "allowed_with_renewed_confirmation"
  | "disallowed"
  | "disputed"
  | "manual_review";

export type MoralTradeNoncompensableReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeNoncompensablePolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeNoncompensableBlockerAssessment {
  recordId: string;
  subjectType: MoralTradeNoncompensableBlockerSubjectType;
  subjectId: string;
  participantIdHash: string;
  noncompensableBlockerPolicyRef: string;
  policyStatus: MoralTradeNoncompensablePolicyStatus;
  protectedInterestType: MoralTradeProtectedInterestType;
  blockingControlCodes: string[];
  attemptedCompensationOrWaiverState: MoralTradeAttemptedCompensationOrWaiverState;
  personalWaiverAllowedState: MoralTradePersonalWaiverAllowedState;
  renewedConfirmationRecordRefs: string[];
  reviewState: MoralTradeNoncompensableReviewState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeNoncompensableBlockerEvaluationInput {
  transition: MoralTradeNoncompensableBlockerTransition;
  assessmentRequired: boolean;
  requiredAffectedParticipantCount: number;
  checkedAt?: string;
  records: MoralTradeNoncompensableBlockerAssessment[];
}

export interface MoralTradeNoncompensableBlockerEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeNoncompensableBlockerTransition;
  checkedAt: string;
  assessmentRequired: boolean;
  reviewedRecordCount: number;
  nonBlockingAssessmentCount: number;
  affectedParticipantAssessmentCount: number;
  requiredAffectedParticipantCount: number;
  compensationAttemptBlockerCount: number;
  personallyWaivablePassCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeNoncompensableBlockerTransitionDefinition {
  key: MoralTradeNoncompensableBlockerTransition;
  label: string;
  requiresAssessment: boolean;
  requiresNonBlockingReview: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeNoncompensableBlockerCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeNoncompensableBlockerValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-noncompensable-blocker-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeNoncompensableBlockerCheck[];
  blockers: string[];
}

export interface MoralTradeNoncompensableBlockerContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  personalWaiverRule: string;
  compensationAttemptRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeNoncompensableBlockerSubjectType[];
  protectedInterestTypes: MoralTradeProtectedInterestType[];
  attemptedCompensationOrWaiverStates: MoralTradeAttemptedCompensationOrWaiverState[];
  personalWaiverAllowedStates: MoralTradePersonalWaiverAllowedState[];
  reviewStates: MoralTradeNoncompensableReviewState[];
  policyStatuses: MoralTradeNoncompensablePolicyStatus[];
  transitionDefinitions: MoralTradeNoncompensableBlockerTransitionDefinition[];
  sampleEvaluations: MoralTradeNoncompensableBlockerEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_noncompensable_blocker_assessments",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["noncompensable_blocker"] as const;

const SUBJECT_TYPES: MoralTradeNoncompensableBlockerSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "pledge_performance_bond_record",
  "side_agreement_disclosure",
  "payment_event",
  "evidence_record",
  "dispute_case",
];

const PROTECTED_INTEREST_TYPES: MoralTradeProtectedInterestType[] = [
  "participant_waivable_interest",
  "nonparticipant_interest",
  "legal_or_regulatory",
  "public_safety",
  "truthful_reporting",
  "civil_rights",
  "confidentiality_or_privacy",
  "institutional_process",
  "digital_system_integrity",
  "anti_threat",
  "other",
];

const NONCOMPENSABLE_PROTECTED_INTERESTS = new Set<MoralTradeProtectedInterestType>(
  PROTECTED_INTEREST_TYPES.filter(
    (interest) => interest !== "participant_waivable_interest",
  ),
);

const ATTEMPTED_COMPENSATION_OR_WAIVER_STATES: MoralTradeAttemptedCompensationOrWaiverState[] = [
  "none",
  "possible",
  "under_review",
  "blocking",
  "superseded",
];

const PERSONAL_WAIVER_ALLOWED_STATES: MoralTradePersonalWaiverAllowedState[] = [
  "not_applicable",
  "allowed_with_renewed_confirmation",
  "disallowed",
  "disputed",
  "manual_review",
];

const REVIEW_STATES: MoralTradeNoncompensableReviewState[] = [
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const POLICY_STATUSES: MoralTradeNoncompensablePolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PASSING_REVIEW_STATES = new Set<MoralTradeNoncompensableReviewState>([
  "not_required",
  "non_blocking",
]);

const COMPENSATION_ATTEMPT_STATES = new Set<MoralTradeAttemptedCompensationOrWaiverState>([
  "possible",
  "under_review",
  "blocking",
]);

const TRANSITION_DEFINITIONS: MoralTradeNoncompensableBlockerTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresAssessment: false,
    requiresNonBlockingReview: false,
    userFacingBlockerCategory:
      "Noncompensable blocker review is preview-only until protected interests and attempted compensation are classified",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Matching waits for noncompensable safety, legal, privacy, rights, anti-threat, and process-integrity blockers to resolve",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Lock cannot compensate for safety, legal, privacy, rights, reporting, civil-rights, confidentiality, regulated-goods, cyber-abuse, financial-crime, or process-integrity blockers",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Payment capture cannot use higher donations, side payments, performance bonds, or reciprocal favors to clear blockers",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Payout release requires non-blocking noncompensable blocker assessment and immutable policy",
  },
  {
    key: "reliance",
    label: "Reliance",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require noncompensable blockers to be non-blocking or explicitly not required",
  },
  {
    key: "public_completion_count",
    label: "Public completion count",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Public completion cannot count trades that compensated for noncompensable blockers",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Release promotion requires noncompensable-blocker evidence and compensation-attempt counters",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeNoncompensableBlockerCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 8);
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function hasRefs(values: string[]) {
  return values.some((value) => hasMeaningfulText(value));
}

function isValidIso(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isStaleTimestamp(value: string, checkedAt: string) {
  if (!isValidIso(value) || !isValidIso(checkedAt)) {
    return true;
  }

  const maxAgeMs = MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;

  return Date.parse(checkedAt) - Date.parse(value) > maxAgeMs;
}

function isCompensationAttempt(record: MoralTradeNoncompensableBlockerAssessment) {
  return COMPENSATION_ATTEMPT_STATES.has(
    record.attemptedCompensationOrWaiverState,
  );
}

function isPersonallyWaivablePass(record: MoralTradeNoncompensableBlockerAssessment) {
  return (
    record.protectedInterestType === "participant_waivable_interest" &&
    record.attemptedCompensationOrWaiverState !== "blocking" &&
    record.personalWaiverAllowedState === "allowed_with_renewed_confirmation" &&
    hasRefs(record.renewedConfirmationRecordRefs) &&
    record.reviewState === "non_blocking" &&
    hasMeaningfulText(record.reviewerDecisionRef)
  );
}

function evaluateRecord({
  checkedAt,
  record,
  requiresNonBlockingReview,
}: {
  checkedAt: string;
  record: MoralTradeNoncompensableBlockerAssessment;
  requiresNonBlockingReview: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("noncompensable_blocker_assessment_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`noncompensable_blocker_subject_missing:${record.recordId}`);
  }

  if (!isHash(record.participantIdHash)) {
    blockers.push(`noncompensable_blocker_participant_hash_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.noncompensableBlockerPolicyRef)) {
    blockers.push(`noncompensable_blocker_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(
      `noncompensable_blocker_policy_not_immutable:${record.recordId}:${record.policyStatus}`,
    );
  }

  if (
    requiresNonBlockingReview &&
    !PASSING_REVIEW_STATES.has(record.reviewState)
  ) {
    blockers.push(`noncompensable_blocker_review_not_non_blocking:${record.recordId}:${record.reviewState}`);
  }

  if (record.reviewState === "blocked") {
    blockers.push(`noncompensable_blocker_review_blocked:${record.recordId}`);
  }

  if (record.reviewState === "manual_review") {
    blockers.push(`noncompensable_blocker_manual_review_required:${record.recordId}`);
  }

  if (record.reviewState === "superseded") {
    blockers.push(`noncompensable_blocker_assessment_superseded:${record.recordId}`);
  }

  if (
    record.reviewState !== "not_required" &&
    !hasRefs(record.blockingControlCodes)
  ) {
    blockers.push(`noncompensable_blocker_control_codes_missing:${record.recordId}`);
  }

  if (
    PASSING_REVIEW_STATES.has(record.reviewState) &&
    record.reviewState !== "not_required" &&
    !hasMeaningfulText(record.reviewerDecisionRef)
  ) {
    blockers.push(`noncompensable_blocker_reviewer_decision_missing:${record.recordId}`);
  }

  if (
    NONCOMPENSABLE_PROTECTED_INTERESTS.has(record.protectedInterestType) &&
    isCompensationAttempt(record)
  ) {
    blockers.push(`noncompensable_blocker_compensation_attempt_for_nonwaivable_interest:${record.recordId}`);
  }

  if (
    NONCOMPENSABLE_PROTECTED_INTERESTS.has(record.protectedInterestType) &&
    record.personalWaiverAllowedState === "allowed_with_renewed_confirmation"
  ) {
    blockers.push(`noncompensable_blocker_nonwaivable_interest_marked_waivable:${record.recordId}`);
  }

  if (record.attemptedCompensationOrWaiverState === "blocking") {
    blockers.push(`noncompensable_blocker_compensation_attempt_blocking:${record.recordId}`);
  }

  if (
    isCompensationAttempt(record) &&
    record.protectedInterestType === "participant_waivable_interest" &&
    record.personalWaiverAllowedState !== "allowed_with_renewed_confirmation"
  ) {
    blockers.push(`noncompensable_blocker_personal_waiver_not_allowed:${record.recordId}:${record.personalWaiverAllowedState}`);
  }

  if (
    record.protectedInterestType === "participant_waivable_interest" &&
    record.personalWaiverAllowedState === "allowed_with_renewed_confirmation" &&
    !hasRefs(record.renewedConfirmationRecordRefs)
  ) {
    blockers.push(`noncompensable_blocker_renewed_confirmation_missing:${record.recordId}`);
  }

  if (
    record.personalWaiverAllowedState === "disputed" ||
    record.personalWaiverAllowedState === "manual_review"
  ) {
    blockers.push(`noncompensable_blocker_personal_waiver_unresolved:${record.recordId}:${record.personalWaiverAllowedState}`);
  }

  if (!isValidIso(record.createdAt)) {
    blockers.push(`noncompensable_blocker_created_at_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.updatedAt)) {
    blockers.push(`noncompensable_blocker_updated_at_invalid:${record.recordId}`);
  } else if (isStaleTimestamp(record.updatedAt, checkedAt)) {
    blockers.push(`noncompensable_blocker_assessment_stale:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeNoncompensableBlocker(
  input: MoralTradeNoncompensableBlockerEvaluationInput,
): MoralTradeNoncompensableBlockerEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const assessmentRequired =
    input.assessmentRequired || transitionDefinition?.requiresAssessment === true;
  const requiresNonBlockingReview =
    transitionDefinition?.requiresNonBlockingReview === true;
  const requiredAffectedParticipantCount = Math.max(
    0,
    Math.floor(input.requiredAffectedParticipantCount),
  );
  const blockers: string[] = [];
  const coveredParticipants = new Set<string>();
  let reviewedRecordCount = 0;
  let nonBlockingAssessmentCount = 0;
  let compensationAttemptBlockerCount = 0;
  let personallyWaivablePassCount = 0;

  if (assessmentRequired && input.records.length === 0) {
    blockers.push("noncompensable_blocker_assessment_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresNonBlockingReview,
    });

    blockers.push(...recordBlockers);

    if (record.policyStatus === "resolved_immutable" && hasMeaningfulText(record.reviewerDecisionRef)) {
      reviewedRecordCount += 1;
    }

    if (isHash(record.participantIdHash) && recordBlockers.length === 0) {
      coveredParticipants.add(record.participantIdHash);
    }

    if (PASSING_REVIEW_STATES.has(record.reviewState) && recordBlockers.length === 0) {
      nonBlockingAssessmentCount += 1;
    }

    if (
      record.attemptedCompensationOrWaiverState === "blocking" ||
      recordBlockers.some((blocker) => /compensation_attempt|personal_waiver/.test(blocker))
    ) {
      compensationAttemptBlockerCount += 1;
    }

    if (isPersonallyWaivablePass(record) && recordBlockers.length === 0) {
      personallyWaivablePassCount += 1;
    }
  }

  if (
    assessmentRequired &&
    input.records.length > 0 &&
    nonBlockingAssessmentCount === 0
  ) {
    blockers.push("noncompensable_blocker_non_blocking_assessment_missing");
  }

  if (
    assessmentRequired &&
    coveredParticipants.size < requiredAffectedParticipantCount
  ) {
    blockers.push("noncompensable_blocker_affected_participant_assessment_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    assessmentRequired,
    reviewedRecordCount,
    nonBlockingAssessmentCount,
    affectedParticipantAssessmentCount: coveredParticipants.size,
    requiredAffectedParticipantCount,
    compensationAttemptBlockerCount,
    personallyWaivablePassCount,
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("compensation_attempt")
            ? "Side payments, higher donations, performance bonds, reciprocal favors, or private waivers cannot clear noncompensable blockers"
            : blocker.includes("personal_waiver") || blocker.includes("renewed_confirmation")
              ? "Personally waivable interests need frozen-policy permission, renewed confirmation, and non-blocking review"
              : blocker.includes("policy")
                ? "Noncompensable-blocker policy is not frozen"
                : blocker.includes("stale")
                  ? "Noncompensable-blocker assessment is stale"
                  : "Noncompensable-blocker assessment is incomplete or still under review",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeNoncompensableBlockerAssessment> = {},
): MoralTradeNoncompensableBlockerAssessment {
  return {
    recordId: "noncompensable-blocker:demo",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:demo",
    participantIdHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    noncompensableBlockerPolicyRef: "policy-snapshot:noncompensable-blocker-v1",
    policyStatus: "resolved_immutable",
    protectedInterestType: "public_safety",
    blockingControlCodes: ["public_safety", "anti_threat"],
    attemptedCompensationOrWaiverState: "none",
    personalWaiverAllowedState: "not_applicable",
    renewedConfirmationRecordRefs: [],
    reviewState: "non_blocking",
    reviewerDecisionRef: "review-decision:noncompensable-blocker",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradeNoncompensableBlockerContract(): MoralTradeNoncompensableBlockerContract {
  return {
    version: MORAL_TRADE_NONCOMPENSABLE_BLOCKER_CONTRACT_VERSION,
    purpose:
      "Fail-closed noncompensable blocker contract for donation-offset, pledge-swap, compensated-action, performance-bond, side-agreement, payment, evidence, and dispute records.",
    failClosedRule:
      "Safety, legal, privacy, third-party-rights, anti-threat, reporting-integrity, civil-rights, confidentiality, regulated-goods, cyber-abuse, financial-crime, and process-integrity blockers are constraints rather than prices. Matching, lock, capture, payout, reliance, public completion, and release promotion fail closed when these blockers are missing, mutable, stale, under review, blocked, manually reviewed, superseded, or compensated for.",
    personalWaiverRule:
      "A participant may waive only their own personally waivable protected interest when the frozen policy explicitly allows renewed confirmation, the renewed confirmation records are present, and all required review states are non-blocking. Nonparticipant, legal/regulatory, public-safety, truthful-reporting, civil-rights, confidentiality/privacy, institutional-process, digital-system-integrity, anti-threat, and other nonwaivable interests cannot be cleared by private waiver.",
    compensationAttemptRule:
      "A higher donation, side payment, performance bond, reciprocal favor, private agreement, or private waiver cannot convert a blocking state into a permissible trade by itself; any attempted compensation for a blocking control is itself a reviewable blocker signal.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    protectedInterestTypes: [...PROTECTED_INTEREST_TYPES],
    attemptedCompensationOrWaiverStates: [
      ...ATTEMPTED_COMPENSATION_OR_WAIVER_STATES,
    ],
    personalWaiverAllowedStates: [...PERSONAL_WAIVER_ALLOWED_STATES],
    reviewStates: [...REVIEW_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradeNoncompensableBlocker({
        transition: "matched_trade_lock",
        assessmentRequired: true,
        requiredAffectedParticipantCount: 1,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradeNoncompensableBlocker({
        transition: "payment_capture",
        assessmentRequired: true,
        requiredAffectedParticipantCount: 1,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "noncompensable-blocker:compensation-demo",
            protectedInterestType: "civil_rights",
            attemptedCompensationOrWaiverState: "blocking",
            personalWaiverAllowedState: "disallowed",
            reviewState: "blocked",
          }),
        ],
      }),
    ],
    contractTests: [
      "noncompensable_safety_blocker_test",
      "noncompensable_blocker_contract_validator",
      "noncompensable_compensation_attempt_blocks",
      "noncompensable_personal_waiver_renewal_test",
      "noncompensable_blocker_route_contract",
      "noncompensable_blocker_schema_contract",
    ],
  };
}

export function validateMoralTradeNoncompensableBlockerContract(
  contract: MoralTradeNoncompensableBlockerContract =
    getMoralTradeNoncompensableBlockerContract(),
): MoralTradeNoncompensableBlockerValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names noncompensable blocker assessments",
      contract.firstClassRecordTables.includes(
        "moral_trade_noncompensable_blocker_assessments",
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names noncompensable_blocker policy snapshots",
      contract.policySnapshotSubjects.includes("noncompensable_blocker"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "protected-interest-coverage",
      "Contract covers participant-waivable and nonwaivable protected-interest categories",
      [
        "participant_waivable_interest",
        "nonparticipant_interest",
        "legal_or_regulatory",
        "public_safety",
        "truthful_reporting",
        "civil_rights",
        "confidentiality_or_privacy",
        "institutional_process",
        "digital_system_integrity",
        "anti_threat",
      ].every((interest) =>
        contract.protectedInterestTypes.includes(
          interest as MoralTradeProtectedInterestType,
        ),
      ),
      contract.protectedInterestTypes.join(", "),
    ),
    check(
      "compensation-state-coverage",
      "Contract covers possible, under-review, blocking, superseded, and none compensation states",
      ["none", "possible", "under_review", "blocking", "superseded"].every((state) =>
        contract.attemptedCompensationOrWaiverStates.includes(
          state as MoralTradeAttemptedCompensationOrWaiverState,
        ),
      ),
      contract.attemptedCompensationOrWaiverStates.join(", "),
    ),
    check(
      "personal-waiver-rule",
      "Contract requires frozen-policy permission, renewed confirmation, and non-blocking review for personally waivable interests",
      /personally waivable/i.test(contract.personalWaiverRule) &&
        /renewed confirmation/i.test(contract.personalWaiverRule) &&
        /non-blocking/i.test(contract.personalWaiverRule) &&
        /nonparticipant/i.test(contract.personalWaiverRule),
      contract.personalWaiverRule,
    ),
    check(
      "compensation-attempt-rule",
      "Contract states side payments, higher donations, performance bonds, reciprocal favors, private agreements, and private waivers do not clear blockers",
      /higher donation/i.test(contract.compensationAttemptRule) &&
        /side payment/i.test(contract.compensationAttemptRule) &&
        /performance bond/i.test(contract.compensationAttemptRule) &&
        /reciprocal favor/i.test(contract.compensationAttemptRule) &&
        /private waiver/i.test(contract.compensationAttemptRule),
      contract.compensationAttemptRule,
    ),
    check(
      "transition-coverage",
      "Contract requires assessments for match, lock, capture, payout, reliance, public completion, and release promotion",
      [
        "match_candidate_generation",
        "matched_trade_lock",
        "payment_capture",
        "payout_release",
        "reliance",
        "public_completion_count",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition && definition.requiresAssessment,
        ),
      ),
      contract.transitionDefinitions
        .filter((definition) => definition.requiresAssessment)
        .map((definition) => definition.key)
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "Contract includes pass and compensation-attempt blocked samples",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.status === "blocked" &&
            evaluation.compensationAttemptBlockerCount > 0,
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract lists noncompensable safety blocker test hook",
      contract.contractTests.includes("noncompensable_safety_blocker_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-noncompensable-blocker-contract",
    validatorVersion: MORAL_TRADE_NONCOMPENSABLE_BLOCKER_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
