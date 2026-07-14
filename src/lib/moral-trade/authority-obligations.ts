export const MORAL_TRADE_AUTHORITY_OBLIGATION_CONTRACT_VERSION =
  "moral-trade-authority-obligation-v0.1-2026-06";
export const MORAL_TRADE_AUTHORITY_OBLIGATION_VALIDATOR_VERSION =
  "moral-trade-authority-obligation-validator-v0.1";

export type MoralTradeAuthorityObligationTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "performance_start"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeAuthorityObligationAssessmentType =
  | "third_party_obligation"
  | "representative_authority";

export type MoralTradeAuthorityObligationSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "side_agreement";

export type MoralTradeAuthorityObligationReviewState =
  | "not_required_for_stage"
  | "passed"
  | "under_review"
  | "blocked"
  | "disputed"
  | "stale";

export type MoralTradeAuthorityObligationConfirmationState =
  | "not_required_for_stage"
  | "confirmed"
  | "missing"
  | "under_review"
  | "declined"
  | "stale";

export type MoralTradeAuthorityObligationRecordState =
  | "draft"
  | "reviewed"
  | "approved"
  | "blocked"
  | "superseded";

export interface MoralTradeAuthorityObligationRecord {
  recordId: string;
  assessmentType: MoralTradeAuthorityObligationAssessmentType;
  subjectType: MoralTradeAuthorityObligationSubjectType;
  subjectRef: string;
  policySnapshotRef: string;
  authorityScopeHash: string | null;
  obligationsHash: string | null;
  affectedPartyClassRefs: string[];
  representativePrincipalRef: string | null;
  authorityEvidenceHash: string | null;
  disclosedToCounterparty: boolean;
  conflictReviewState: MoralTradeAuthorityObligationReviewState;
  reviewState: MoralTradeAuthorityObligationReviewState;
  standingReviewState: MoralTradeAuthorityObligationReviewState;
  participantConfirmationState: MoralTradeAuthorityObligationConfirmationState;
  recordState: MoralTradeAuthorityObligationRecordState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeAuthorityObligationEvaluationInput {
  transition: MoralTradeAuthorityObligationTransition;
  checkedAt?: string;
  authorityObligationRequired: boolean;
  records: MoralTradeAuthorityObligationRecord[];
}

export interface MoralTradeAuthorityObligationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeAuthorityObligationTransition;
  checkedAt: string;
  authorityObligationRequired: boolean;
  recordCount: number;
  nonBlockingRecordCount: number;
  thirdPartyObligationRecordCount: number;
  representativeAuthorityRecordCount: number;
  verifiedAuthorityRecordCount: number;
  disclosedObligationRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeAuthorityObligationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAuthorityObligationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-authority-obligation-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeAuthorityObligationCheck[];
  blockers: string[];
}

export interface MoralTradeAuthorityObligationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  thirdPartyObligationRule: string;
  representativeAuthorityRule: string;
  disclosureRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradeAuthorityObligationTransition;
    requiresAssessmentRecords: boolean;
    requiresNonBlockingReview: boolean;
    requiresVerifiedAuthority: boolean;
    userFacingBlockerCategory: string;
  }[];
  assessmentTypes: MoralTradeAuthorityObligationAssessmentType[];
  sampleEvaluations: MoralTradeAuthorityObligationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_authority_obligation_assessments",
  "moral_trade_authority_obligation_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "third_party_obligation_assessment",
  "representative_authority_assessment",
  "participant_confirmation",
  "standing_authority",
  "conflict_review",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "third_party_obligation_assessment_test",
  "representative_authority_verification_test",
] as const;

const CONTRACT_TESTS = [
  "authority_obligation_contract_validator",
  "third_party_obligation_assessment_test",
  "representative_authority_verification_test",
  "authority_obligation_route_contract",
  "authority_obligation_schema_contract",
] as const;

const ASSESSMENT_TYPES = new Set<MoralTradeAuthorityObligationAssessmentType>([
  "third_party_obligation",
  "representative_authority",
]);

const SUBJECT_TYPES = new Set<MoralTradeAuthorityObligationSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "side_agreement",
]);

const PASSING_REVIEW_STATES = new Set<MoralTradeAuthorityObligationReviewState>([
  "not_required_for_stage",
  "passed",
]);

const PASSING_CONFIRMATION_STATES =
  new Set<MoralTradeAuthorityObligationConfirmationState>([
    "not_required_for_stage",
    "confirmed",
  ]);

const NON_BLOCKING_RECORD_STATES =
  new Set<MoralTradeAuthorityObligationRecordState>(["reviewed", "approved"]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresAssessmentRecords: false,
    requiresNonBlockingReview: false,
    requiresVerifiedAuthority: false,
    userFacingBlockerCategory:
      "Draft preview may show authority and obligation status without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Lock requires third-party-obligation and representative-authority review",
  },
  {
    key: "payment_capture",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Payment capture cannot rely on undisclosed third-party duties or unverified authority",
  },
  {
    key: "performance_start",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Performance cannot start before authority and third-party-obligation controls pass",
  },
  {
    key: "reliance_bearing_transition",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Reliance requires verified authority and non-blocking third-party-obligation review",
  },
  {
    key: "public_metric_publication",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Public metrics cannot count trades with disputed authority or third-party duties",
  },
  {
    key: "release_gate_promotion",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresVerifiedAuthority: true,
    userFacingBlockerCategory:
      "Release promotion requires authority and third-party-obligation gates to pass",
  },
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (!hasText(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) return false;
  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function transitionContract(transition: MoralTradeAuthorityObligationTransition) {
  return TRANSITIONS.find((entry) => entry.key === transition) || TRANSITIONS[0];
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function hasNonEmptyTextArray(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every(hasText);
}

function isThirdPartyObligation(record: MoralTradeAuthorityObligationRecord) {
  return record.assessmentType === "third_party_obligation";
}

function isRepresentativeAuthority(record: MoralTradeAuthorityObligationRecord) {
  return record.assessmentType === "representative_authority";
}

function hasVerifiedAuthority(record: MoralTradeAuthorityObligationRecord) {
  if (!isRepresentativeAuthority(record)) return true;

  return (
    isHash(record.authorityScopeHash) &&
    isHash(record.authorityEvidenceHash) &&
    hasText(record.representativePrincipalRef) &&
    PASSING_REVIEW_STATES.has(record.reviewState) &&
    PASSING_REVIEW_STATES.has(record.conflictReviewState) &&
    PASSING_REVIEW_STATES.has(record.standingReviewState) &&
    PASSING_CONFIRMATION_STATES.has(record.participantConfirmationState)
  );
}

function hasDisclosedThirdPartyObligation(
  record: MoralTradeAuthorityObligationRecord,
) {
  if (!isThirdPartyObligation(record)) return true;

  return (
    isHash(record.obligationsHash) &&
    hasNonEmptyTextArray(record.affectedPartyClassRefs) &&
    record.disclosedToCounterparty
  );
}

function isNonBlocking(record: MoralTradeAuthorityObligationRecord) {
  return (
    ASSESSMENT_TYPES.has(record.assessmentType) &&
    SUBJECT_TYPES.has(record.subjectType) &&
    hasText(record.subjectRef) &&
    hasText(record.policySnapshotRef) &&
    hasDisclosedThirdPartyObligation(record) &&
    hasVerifiedAuthority(record) &&
    PASSING_REVIEW_STATES.has(record.reviewState) &&
    PASSING_REVIEW_STATES.has(record.conflictReviewState) &&
    PASSING_REVIEW_STATES.has(record.standingReviewState) &&
    PASSING_CONFIRMATION_STATES.has(record.participantConfirmationState) &&
    NON_BLOCKING_RECORD_STATES.has(record.recordState) &&
    !record.supersededBy
  );
}

function pushRecordBlockers(
  blockers: string[],
  record: MoralTradeAuthorityObligationRecord,
  checkedAt: string,
  requiresVerifiedAuthority: boolean,
) {
  const id = hasText(record.recordId)
    ? record.recordId
    : "authority-obligation:missing-id";

  if (!hasText(record.recordId)) {
    blockers.push("authority_obligation_record_id_missing");
  }

  if (!ASSESSMENT_TYPES.has(record.assessmentType)) {
    blockers.push(`authority_obligation_assessment_type_invalid:${id}`);
  }

  if (!SUBJECT_TYPES.has(record.subjectType)) {
    blockers.push(`authority_obligation_subject_type_invalid:${id}`);
  }

  if (!hasText(record.subjectRef)) {
    blockers.push(`authority_obligation_subject_ref_missing:${id}`);
  }

  if (!hasText(record.policySnapshotRef)) {
    blockers.push(`authority_obligation_policy_missing:${id}`);
  }

  if (isThirdPartyObligation(record)) {
    if (!isHash(record.obligationsHash)) {
      blockers.push(`third_party_obligation_hash_missing:${id}`);
    }

    if (!hasNonEmptyTextArray(record.affectedPartyClassRefs)) {
      blockers.push(`third_party_obligation_affected_party_scope_missing:${id}`);
    }

    if (!record.disclosedToCounterparty) {
      blockers.push(`third_party_obligation_not_disclosed:${id}`);
    }
  }

  if (isRepresentativeAuthority(record) || requiresVerifiedAuthority) {
    if (isRepresentativeAuthority(record) && !isHash(record.authorityScopeHash)) {
      blockers.push(`representative_authority_scope_hash_missing:${id}`);
    }

    if (isRepresentativeAuthority(record) && !hasText(record.representativePrincipalRef)) {
      blockers.push(`representative_authority_principal_missing:${id}`);
    }

    if (isRepresentativeAuthority(record) && !isHash(record.authorityEvidenceHash)) {
      blockers.push(`representative_authority_evidence_hash_missing:${id}`);
    }
  }

  if (!PASSING_REVIEW_STATES.has(record.reviewState)) {
    blockers.push(`authority_obligation_review_not_non_blocking:${id}:${record.reviewState}`);
  }

  if (!PASSING_REVIEW_STATES.has(record.conflictReviewState)) {
    blockers.push(
      `authority_obligation_conflict_review_not_non_blocking:${id}:${record.conflictReviewState}`,
    );
  }

  if (!PASSING_REVIEW_STATES.has(record.standingReviewState)) {
    blockers.push(
      `authority_obligation_standing_review_not_non_blocking:${id}:${record.standingReviewState}`,
    );
  }

  if (!PASSING_CONFIRMATION_STATES.has(record.participantConfirmationState)) {
    blockers.push(
      `authority_obligation_participant_confirmation_not_ready:${id}:${record.participantConfirmationState}`,
    );
  }

  if (!NON_BLOCKING_RECORD_STATES.has(record.recordState)) {
    blockers.push(`authority_obligation_record_state_not_non_blocking:${id}:${record.recordState}`);
  }

  if (!hasText(record.reviewerDecisionRef)) {
    blockers.push(`authority_obligation_reviewer_decision_missing:${id}`);
  }

  if (!isIsoDate(record.createdAt) || !isIsoDate(record.updatedAt)) {
    blockers.push(`authority_obligation_timestamps_invalid:${id}`);
  }

  if (isExpired(record.expiresAt, checkedAt)) {
    blockers.push(`authority_obligation_record_expired:${id}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(`authority_obligation_record_stale:${id}`);
  }

  if (record.supersededBy) {
    blockers.push(`authority_obligation_record_superseded:${id}`);
  }
}

export function evaluateMoralTradeAuthorityObligations(
  input: MoralTradeAuthorityObligationEvaluationInput,
): MoralTradeAuthorityObligationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = transitionContract(input.transition);
  const blockers: string[] = [];

  if (input.authorityObligationRequired && input.records.length === 0) {
    blockers.push("authority_obligation_record_required");
  }

  if (transition.requiresAssessmentRecords && input.records.length === 0) {
    blockers.push(`authority_obligation_record_missing_for_transition:${transition.key}`);
  }

  for (const record of input.records) {
    pushRecordBlockers(
      blockers,
      record,
      checkedAt,
      transition.requiresVerifiedAuthority,
    );
  }

  const nonBlockingRecordCount = input.records.filter(isNonBlocking).length;
  const thirdPartyObligationRecordCount = input.records.filter(
    isThirdPartyObligation,
  ).length;
  const representativeAuthorityRecordCount = input.records.filter(
    isRepresentativeAuthority,
  ).length;
  const verifiedAuthorityRecordCount = input.records.filter(
    (record) => isRepresentativeAuthority(record) && hasVerifiedAuthority(record),
  ).length;
  const disclosedObligationRecordCount = input.records.filter(
    (record) =>
      isThirdPartyObligation(record) && hasDisclosedThirdPartyObligation(record),
  ).length;

  if (
    transition.requiresNonBlockingReview &&
    input.records.length > 0 &&
    nonBlockingRecordCount === 0
  ) {
    blockers.push(`authority_obligation_no_non_blocking_record:${transition.key}`);
  }

  if (
    transition.requiresVerifiedAuthority &&
    representativeAuthorityRecordCount > 0 &&
    verifiedAuthorityRecordCount === 0
  ) {
    blockers.push(`representative_authority_no_verified_record:${transition.key}`);
  }

  if (
    transition.requiresVerifiedAuthority &&
    thirdPartyObligationRecordCount > 0 &&
    disclosedObligationRecordCount === 0
  ) {
    blockers.push(`third_party_obligation_no_disclosed_record:${transition.key}`);
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    authorityObligationRequired: input.authorityObligationRequired,
    recordCount: input.records.length,
    nonBlockingRecordCount,
    thirdPartyObligationRecordCount,
    representativeAuthorityRecordCount,
    verifiedAuthorityRecordCount,
    disclosedObligationRecordCount,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [transition.userFacingBlockerCategory],
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeAuthorityObligationRecord> = {},
): MoralTradeAuthorityObligationRecord {
  return {
    affectedPartyClassRefs: ["affected-party:family", "affected-party:employer"],
    assessmentType: "third_party_obligation",
    authorityEvidenceHash: null,
    authorityScopeHash: null,
    conflictReviewState: "passed",
    createdAt: "2026-06-13T12:00:00.000Z",
    disclosedToCounterparty: true,
    expiresAt: "2026-12-13T12:00:00.000Z",
    obligationsHash: makeHash("third-party-obligation"),
    participantConfirmationState: "confirmed",
    policySnapshotRef: "policy:authority-obligation:v1",
    recordId: "authority-obligation:demo",
    recordState: "approved",
    representativePrincipalRef: null,
    reviewState: "passed",
    reviewerDecisionRef: "review:authority-obligation",
    standingReviewState: "passed",
    subjectRef: "pledge-swap:demo",
    subjectType: "pledge_swap",
    supersededBy: null,
    updatedAt: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAuthorityObligationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeAuthorityObligationContract():
  MoralTradeAuthorityObligationContract {
  const previewSample = evaluateMoralTradeAuthorityObligations({
    transition: "draft_preview",
    checkedAt: "2026-06-13T12:00:00.000Z",
    authorityObligationRequired: false,
    records: [],
  });
  const lockSample = evaluateMoralTradeAuthorityObligations({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-13T12:00:00.000Z",
    authorityObligationRequired: true,
    records: [
      sampleRecord(),
      sampleRecord({
        affectedPartyClassRefs: [],
        assessmentType: "representative_authority",
        authorityEvidenceHash: makeHash("authority-evidence"),
        authorityScopeHash: makeHash("authority-scope"),
        obligationsHash: null,
        recordId: "authority-obligation:representative-demo",
        representativePrincipalRef: "principal:demo",
      }),
    ],
  });
  const blockedSample = evaluateMoralTradeAuthorityObligations({
    transition: "reliance_bearing_transition",
    checkedAt: "2026-06-13T12:00:00.000Z",
    authorityObligationRequired: true,
    records: [
      sampleRecord({
        affectedPartyClassRefs: [],
        conflictReviewState: "disputed",
        disclosedToCounterparty: false,
        obligationsHash: null,
        participantConfirmationState: "under_review",
        recordState: "reviewed",
        reviewState: "under_review",
        standingReviewState: "blocked",
      }),
      sampleRecord({
        affectedPartyClassRefs: [],
        assessmentType: "representative_authority",
        authorityEvidenceHash: null,
        authorityScopeHash: null,
        obligationsHash: null,
        recordId: "authority-obligation:representative-blocked",
        representativePrincipalRef: null,
      }),
    ],
  });

  return {
    version: MORAL_TRADE_AUTHORITY_OBLIGATION_CONTRACT_VERSION,
    purpose:
      "Fail-closed third-party-obligation and representative-authority governance for non-public-goods Moral Trade transitions.",
    failClosedRule:
      "Lock, payment capture, performance start, reliance, public metrics, and release promotion cannot proceed on missing, stale, disputed, undisclosed, or unverified authority/obligation assessments.",
    thirdPartyObligationRule:
      "Participants cannot trade away, transfer, suppress, or satisfy duties owed to nonparticipants unless the duty class is hash-recorded, reviewed, disclosed at the safe abstraction level, and non-blocking under frozen policy.",
    representativeAuthorityRule:
      "A participant or recipient representative cannot bind another person, organization, project, or fiscal host unless authority scope, principal, evidence hash, standing review, and conflict review are non-blocking.",
    disclosureRule:
      "Counterparties may receive safe obligation and authority status, but not private authority documents, protected-party facts, reviewer notes, or raw evidence artifacts.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitions: [...TRANSITIONS],
    assessmentTypes: [...ASSESSMENT_TYPES],
    sampleEvaluations: [previewSample, lockSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeAuthorityObligationContract(
  contract = getMoralTradeAuthorityObligationContract(),
): MoralTradeAuthorityObligationValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Authority and obligation assessment plus enforcement records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Third-party obligation, representative authority, participant confirmation, standing, and conflict policies are immutable inputs.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Release promotion exposes third-party-obligation and representative-authority test hooks.",
      RELEASE_GATE_TEST_HOOKS.every((hook) =>
        contract.releaseGateTestHooks.includes(hook),
      ),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, performance start, reliance, public metrics, and release promotion require non-blocking authority/obligation review.",
      [
        "matched_trade_lock",
        "payment_capture",
        "performance_start",
        "reliance_bearing_transition",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitions.some(
          (entry) =>
            entry.key === transition &&
            entry.requiresAssessmentRecords &&
            entry.requiresNonBlockingReview &&
            entry.requiresVerifiedAuthority,
        ),
      ),
      contract.transitions.map((entry) => entry.key).join(", "),
    ),
    check(
      "third-party-obligation-rule",
      "The contract blocks trading away or suppressing duties owed to nonparticipants.",
      /duties owed to nonparticipants/i.test(contract.thirdPartyObligationRule) &&
        /disclosed/i.test(contract.thirdPartyObligationRule),
      contract.thirdPartyObligationRule,
    ),
    check(
      "representative-authority-rule",
      "The contract blocks unverified representative authority.",
      /cannot bind another person/i.test(contract.representativeAuthorityRule) &&
        /authority scope/i.test(contract.representativeAuthorityRule),
      contract.representativeAuthorityRule,
    ),
    check(
      "disclosure-rule",
      "The contract exposes safe status without private authority documents or raw evidence.",
      /not private authority documents/i.test(contract.disclosureRule) &&
        /raw evidence artifacts/i.test(contract.disclosureRule),
      contract.disclosureRule,
    ),
    check(
      "assessment-types",
      "Contract covers both third-party obligation and representative authority assessments.",
      [...ASSESSMENT_TYPES].every((type) => contract.assessmentTypes.includes(type)),
      contract.assessmentTypes.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include pass and blocked states.",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations
        .map((sample) => `${sample.transition}:${sample.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises authority/obligation tests.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-authority-obligation-contract",
    validatorVersion: MORAL_TRADE_AUTHORITY_OBLIGATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
