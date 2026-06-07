export const MORAL_TRADE_PARTICIPANT_ELIGIBILITY_CONTRACT_VERSION =
  "moral-trade-participant-eligibility-v0.1-2026-06";
export const MORAL_TRADE_PARTICIPANT_ELIGIBILITY_VALIDATOR_VERSION =
  "moral-trade-participant-eligibility-validator-v0.1";

export type MoralTradeParticipantEligibilityTransition =
  | "non_money_preview"
  | "counted_support"
  | "matching_clearing"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "payout_release"
  | "reliance_bearing_agreement"
  | "public_support_metric_release"
  | "release_gate_promotion";

export type MoralTradeParticipantEligibilityDimension =
  | "identity_verification"
  | "human_uniqueness_sybil"
  | "legal_capacity"
  | "sanctions_screening"
  | "payment_rail_eligibility"
  | "jurisdictional_eligibility"
  | "source_authentication"
  | "raw_identity_artifact_handling";

export type MoralTradeParticipantEligibilityStatus =
  | "eligible"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "identity_unverified"
  | "sybil_risk"
  | "legal_capacity_blocked"
  | "sanctions_potential_match"
  | "sanctions_blocked"
  | "payment_rail_blocked"
  | "jurisdiction_blocked"
  | "source_unauthenticated"
  | "artifact_handling_unverified"
  | "superseded";

export type MoralTradeParticipantEligibilityPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeParticipantEligibilityRecord {
  participantId: string;
  eligibilityRecordId: string;
  identityVerificationStatus: MoralTradeParticipantEligibilityStatus;
  humanUniquenessSybilStatus: MoralTradeParticipantEligibilityStatus;
  legalCapacityStatus: MoralTradeParticipantEligibilityStatus;
  sanctionsScreeningStatus: MoralTradeParticipantEligibilityStatus;
  paymentRailEligibilityStatus: MoralTradeParticipantEligibilityStatus;
  jurisdictionalEligibilityStatus: MoralTradeParticipantEligibilityStatus;
  sourceAuthenticationStatus: MoralTradeParticipantEligibilityStatus;
  rawIdentityArtifactHandlingStatus: MoralTradeParticipantEligibilityStatus;
  policySnapshotStatus: MoralTradeParticipantEligibilityPolicySnapshotStatus;
  evidenceHash: string;
  identityArtifactRefHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  identityArtifactsPubliclyExposed: boolean;
  moralWorthScorePublished: boolean;
}

export interface MoralTradeParticipantEligibilityTransitionDefinition {
  key: MoralTradeParticipantEligibilityTransition;
  label: string;
  requiredDimensions: MoralTradeParticipantEligibilityDimension[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeParticipantEligibilityEvaluationInput {
  transition: MoralTradeParticipantEligibilityTransition;
  checkedAt?: string;
  records: MoralTradeParticipantEligibilityRecord[];
}

export interface MoralTradeParticipantEligibilityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeParticipantEligibilityTransition;
  checkedAt: string;
  requiredRecordCount: number;
  passingRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeParticipantEligibilityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeParticipantEligibilityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-participant-eligibility-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeParticipantEligibilityCheck[];
  blockers: string[];
}

export interface MoralTradeParticipantEligibilityContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  reviewDimensions: MoralTradeParticipantEligibilityDimension[];
  failClosedStatuses: MoralTradeParticipantEligibilityStatus[];
  transitionDefinitions: MoralTradeParticipantEligibilityTransitionDefinition[];
  sampleEvaluations: MoralTradeParticipantEligibilityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_participant_eligibility_records",
  "moral_trade_participant_eligibility_reviews",
  "moral_trade_identity_artifact_references",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["participant_eligibility"] as const;

const REVIEW_DIMENSIONS: MoralTradeParticipantEligibilityDimension[] = [
  "identity_verification",
  "human_uniqueness_sybil",
  "legal_capacity",
  "sanctions_screening",
  "payment_rail_eligibility",
  "jurisdictional_eligibility",
  "source_authentication",
  "raw_identity_artifact_handling",
];

const FAIL_CLOSED_STATUSES: MoralTradeParticipantEligibilityStatus[] = [
  "missing",
  "under_review",
  "failed",
  "stale",
  "identity_unverified",
  "sybil_risk",
  "legal_capacity_blocked",
  "sanctions_potential_match",
  "sanctions_blocked",
  "payment_rail_blocked",
  "jurisdiction_blocked",
  "source_unauthenticated",
  "artifact_handling_unverified",
  "superseded",
];

const ALL_ELIGIBILITY_DIMENSIONS = REVIEW_DIMENSIONS;
const SUPPORT_COUNT_DIMENSIONS: MoralTradeParticipantEligibilityDimension[] = [
  "identity_verification",
  "human_uniqueness_sybil",
  "source_authentication",
  "raw_identity_artifact_handling",
];

const TRANSITION_DEFINITIONS: MoralTradeParticipantEligibilityTransitionDefinition[] = [
  {
    key: "non_money_preview",
    label: "Non-money preview",
    requiredDimensions: [],
    userFacingBlockerCategory: "Eligibility is not required for this preview",
  },
  {
    key: "counted_support",
    label: "Counted supporter or active-cluster signal",
    requiredDimensions: SUPPORT_COUNT_DIMENSIONS,
    userFacingBlockerCategory: "Support can be previewed but is not countable yet",
  },
  {
    key: "matching_clearing",
    label: "Matching or clearing",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before clearing",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before lock",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before payment authorization",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before capture",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before payout release",
  },
  {
    key: "reliance_bearing_agreement",
    label: "Reliance-bearing agreement",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility needs review before reliance",
  },
  {
    key: "public_support_metric_release",
    label: "Public support metric release",
    requiredDimensions: SUPPORT_COUNT_DIMENSIONS,
    userFacingBlockerCategory: "Support counts need eligibility review before publication",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiredDimensions: ALL_ELIGIBILITY_DIMENSIONS,
    userFacingBlockerCategory: "Participant eligibility controls are incomplete",
  },
];

const CONTRACT_TESTS = [
  "participant_eligibility_contract_validator",
  "participant_eligibility_missing_or_stale_records_fail_closed",
  "participant_eligibility_sybil_sanctions_jurisdiction_blocks",
  "participant_eligibility_private_artifacts_never_public_reputation",
  "participant_eligibility_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeParticipantEligibilityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
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
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function dimensionStatus(
  record: MoralTradeParticipantEligibilityRecord,
  dimension: MoralTradeParticipantEligibilityDimension,
) {
  switch (dimension) {
    case "identity_verification":
      return record.identityVerificationStatus;
    case "human_uniqueness_sybil":
      return record.humanUniquenessSybilStatus;
    case "legal_capacity":
      return record.legalCapacityStatus;
    case "sanctions_screening":
      return record.sanctionsScreeningStatus;
    case "payment_rail_eligibility":
      return record.paymentRailEligibilityStatus;
    case "jurisdictional_eligibility":
      return record.jurisdictionalEligibilityStatus;
    case "source_authentication":
      return record.sourceAuthenticationStatus;
    case "raw_identity_artifact_handling":
      return record.rawIdentityArtifactHandlingStatus;
  }
}

function makeSampleRecord(
  overrides: Partial<MoralTradeParticipantEligibilityRecord> = {},
): MoralTradeParticipantEligibilityRecord {
  return {
    participantId: "profile:demo-participant",
    eligibilityRecordId: "eligibility:demo-participant",
    identityVerificationStatus: "eligible",
    humanUniquenessSybilStatus: "eligible",
    legalCapacityStatus: "eligible",
    sanctionsScreeningStatus: "eligible",
    paymentRailEligibilityStatus: "eligible",
    jurisdictionalEligibilityStatus: "eligible",
    sourceAuthenticationStatus: "eligible",
    rawIdentityArtifactHandlingStatus: "eligible",
    policySnapshotStatus: "resolved_immutable",
    evidenceHash: makeHash("evidence"),
    identityArtifactRefHash: makeHash("identity-artifact"),
    reviewedAt: "2026-06-07T12:00:00.000Z",
    expiresAt: "2026-12-07T12:00:00.000Z",
    identityArtifactsPubliclyExposed: false,
    moralWorthScorePublished: false,
    ...overrides,
  };
}

function getTransitionDefinition(transition: MoralTradeParticipantEligibilityTransition) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

export function evaluateMoralTradeParticipantEligibility(
  input: MoralTradeParticipantEligibilityEvaluationInput,
): MoralTradeParticipantEligibilityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = getTransitionDefinition(input.transition);
  const blockers: string[] = [];
  const passingRecords = new Set<string>();

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredRecordCount: 0,
      passingRecordCount: 0,
      blockers: [`unknown_transition:${input.transition}`],
      userFacingBlockerCategories: ["Participant eligibility state cannot be interpreted"],
    };
  }

  if (definition.requiredDimensions.length > 0 && input.records.length === 0) {
    blockers.push("participant_eligibility_record_required");
  }

  input.records.forEach((record) => {
    const recordBlockers: string[] = [];

    definition.requiredDimensions.forEach((dimension) => {
      const status = dimensionStatus(record, dimension);

      if (status !== "eligible" && status !== "not_required_for_stage") {
        recordBlockers.push(
          `participant_eligibility_dimension_not_eligible:${dimension}:${status}`,
        );
      }
    });

    if (record.policySnapshotStatus !== "resolved_immutable") {
      recordBlockers.push(
        `participant_eligibility_policy_snapshot_not_immutable:${record.policySnapshotStatus}`,
      );
    }

    if (!isHash(record.evidenceHash)) {
      recordBlockers.push(`invalid_participant_eligibility_hash:${record.eligibilityRecordId}`);
    }

    if (!isHash(record.identityArtifactRefHash)) {
      recordBlockers.push(`invalid_identity_artifact_ref_hash:${record.participantId}`);
    }

    if (daysBetween(record.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
      recordBlockers.push(`stale_participant_eligibility_review:${record.participantId}`);
    }

    if (isExpired(record.expiresAt, checkedAt)) {
      recordBlockers.push(`expired_participant_eligibility_review:${record.participantId}`);
    }

    if (record.identityArtifactsPubliclyExposed) {
      recordBlockers.push(`identity_artifacts_publicly_exposed:${record.participantId}`);
    }

    if (record.moralWorthScorePublished) {
      recordBlockers.push(`eligibility_used_as_moral_worth_score:${record.participantId}`);
    }

    if (recordBlockers.length === 0) {
      passingRecords.add(record.eligibilityRecordId);
    }

    blockers.push(...recordBlockers);
  });

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredRecordCount: definition.requiredDimensions.length > 0 ? 1 : 0,
    passingRecordCount: passingRecords.size,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeParticipantEligibilityContract():
  MoralTradeParticipantEligibilityContract {
  const previewSample = evaluateMoralTradeParticipantEligibility({
    transition: "non_money_preview",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });
  const captureSample = evaluateMoralTradeParticipantEligibility({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [makeSampleRecord()],
  });
  const clearingBlockedSample = evaluateMoralTradeParticipantEligibility({
    transition: "matching_clearing",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      makeSampleRecord({
        humanUniquenessSybilStatus: "sybil_risk",
        sanctionsScreeningStatus: "sanctions_potential_match",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_PARTICIPANT_ELIGIBILITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed participant eligibility records before real-money, reliance-bearing, clearing, counted-support, public support metric, or release-promotion transitions.",
    privacyRule:
      "Raw identity artifacts and linkage signals stay private, purpose-limited, and hash-referenced only; eligibility and Sybil outcomes cannot become public moral reputation or a moral-worth score.",
    failClosedRule:
      "Missing, stale, under-review, failed, blocked, unauthenticated, public-artifact, or moral-worth-score eligibility records block real-money, reliance-bearing, clearing, and countable support transitions until superseded by a non-blocking reviewed record.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    reviewDimensions: REVIEW_DIMENSIONS,
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [previewSample, captureSample, clearingBlockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeParticipantEligibilityContract(
  contract = getMoralTradeParticipantEligibilityContract(),
): MoralTradeParticipantEligibilityValidation {
  const checks = [
    check(
      "first-class-participant-eligibility-tables",
      "Participant eligibility records, reviews, and private artifact references are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Participant eligibility is governed by an immutable policy snapshot subject.",
      contract.policySnapshotSubjects.includes("participant_eligibility"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "review-dimensions",
      "Eligibility covers identity, Sybil, legal capacity, sanctions, payment rail, jurisdiction, source authentication, and artifact handling.",
      REVIEW_DIMENSIONS.every((dimension) =>
        contract.reviewDimensions.includes(dimension),
      ),
      contract.reviewDimensions.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Missing, under-review, failed, stale, Sybil, sanctions, payment-rail, jurisdiction, source-authentication, artifact-handling, and superseded states fail closed.",
      FAIL_CLOSED_STATUSES.every((status) =>
        contract.failClosedStatuses.includes(status),
      ),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Real-money, reliance-bearing, clearing, counted-support, public metric, and release-promotion transitions require eligibility dimensions.",
      [
        "counted_support",
        "matching_clearing",
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "payout_release",
        "reliance_bearing_agreement",
        "public_support_metric_release",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiredDimensions.length > 0,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "privacy-non-reputation-rule",
      "The contract states that identity artifacts stay private and eligibility cannot become a moral-worth score.",
      /private/i.test(contract.privacyRule) &&
        /moral-worth score/i.test(contract.privacyRule),
      contract.privacyRule,
    ),
    check(
      "sample-evaluations",
      "The public contract exposes a passing non-money preview, passing payment-capture sample, and blocked clearing sample.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "non_money_preview" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "payment_capture" &&
            evaluation.status === "pass",
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "matching_clearing" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Participant eligibility contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-participant-eligibility-contract",
    validatorVersion: MORAL_TRADE_PARTICIPANT_ELIGIBILITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeParticipantEligibility = {
  evaluateMoralTradeParticipantEligibility,
  getMoralTradeParticipantEligibilityContract,
  validateMoralTradeParticipantEligibilityContract,
};

export default moralTradeParticipantEligibility;
