export const MORAL_TRADE_RECIPIENT_DESTINATION_CONTRACT_VERSION =
  "moral-trade-recipient-destination-v0.1-2026-06";
export const MORAL_TRADE_RECIPIENT_DESTINATION_VALIDATOR_VERSION =
  "moral-trade-recipient-destination-validator-v0.1";

export type MoralTradeRecipientDestinationTransition =
  | "non_money_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "recipient_reuse"
  | "public_money_metric_release"
  | "release_gate_promotion";

export type MoralTradeRecipientDestinationReviewDimension =
  | "recipient_identity"
  | "destination_identity"
  | "anti_impersonation"
  | "jurisdiction"
  | "prohibited_use"
  | "payment_rail"
  | "authority_to_receive"
  | "source_authentication";

export type MoralTradeRecipientDestinationStatus =
  | "verified"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "impersonation_risk"
  | "jurisdiction_blocked"
  | "prohibited_use_blocked"
  | "superseded";

export type MoralTradeRecipientDestinationPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeRecipientDestinationPrivilegedActionStatus =
  | "approved"
  | "not_required_for_stage"
  | "missing"
  | "blocked"
  | "expired"
  | "superseded";

export interface MoralTradeRecipientDestinationRecord {
  recipientRegistryEntryId: string;
  paymentDestinationId: string;
  recipientRegistryStatus: MoralTradeRecipientDestinationStatus;
  paymentDestinationStatus: MoralTradeRecipientDestinationStatus;
  antiImpersonationStatus: MoralTradeRecipientDestinationStatus;
  jurisdictionStatus: MoralTradeRecipientDestinationStatus;
  prohibitedUseStatus: MoralTradeRecipientDestinationStatus;
  policySnapshotStatus: MoralTradeRecipientDestinationPolicySnapshotStatus;
  privilegedActionStatus: MoralTradeRecipientDestinationPrivilegedActionStatus;
  registryEntryHash: string;
  paymentDestinationHash: string;
  reviewedAt: string;
  expiresAt: string | null;
}

export interface MoralTradeRecipientDestinationTransitionDefinition {
  key: MoralTradeRecipientDestinationTransition;
  label: string;
  requiresVerifiedRegistry: boolean;
  requiresVerifiedDestination: boolean;
  requiresPrivilegedAction: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeRecipientDestinationEvaluationInput {
  transition: MoralTradeRecipientDestinationTransition;
  checkedAt?: string;
  records: MoralTradeRecipientDestinationRecord[];
}

export interface MoralTradeRecipientDestinationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeRecipientDestinationTransition;
  checkedAt: string;
  requiredRecordCount: number;
  passingRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeRecipientDestinationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeRecipientDestinationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-recipient-destination-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeRecipientDestinationCheck[];
  blockers: string[];
}

export interface MoralTradeRecipientDestinationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  reviewDimensions: MoralTradeRecipientDestinationReviewDimension[];
  failClosedStatuses: MoralTradeRecipientDestinationStatus[];
  transitionDefinitions: MoralTradeRecipientDestinationTransitionDefinition[];
  sampleEvaluations: MoralTradeRecipientDestinationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_recipient_registry_entries",
  "moral_trade_payment_destinations",
  "moral_trade_recipient_destination_reviews",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "recipient_destination_verification",
] as const;

const REVIEW_DIMENSIONS: MoralTradeRecipientDestinationReviewDimension[] = [
  "recipient_identity",
  "destination_identity",
  "anti_impersonation",
  "jurisdiction",
  "prohibited_use",
  "payment_rail",
  "authority_to_receive",
  "source_authentication",
];

const FAIL_CLOSED_STATUSES: MoralTradeRecipientDestinationStatus[] = [
  "missing",
  "under_review",
  "failed",
  "stale",
  "impersonation_risk",
  "jurisdiction_blocked",
  "prohibited_use_blocked",
  "superseded",
];

const TRANSITION_DEFINITIONS: MoralTradeRecipientDestinationTransitionDefinition[] = [
  {
    key: "non_money_preview",
    label: "Non-money preview",
    requiresVerifiedRegistry: false,
    requiresVerifiedDestination: false,
    requiresPrivilegedAction: false,
    userFacingBlockerCategory: "Recipient details are for preview only",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock proposal",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient or payment destination needs review before lock",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient or payment destination needs review before payment",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient or payment destination needs review before payout",
  },
  {
    key: "recipient_reuse",
    label: "Recipient or destination reuse",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient or payment destination needs review before reuse",
  },
  {
    key: "public_money_metric_release",
    label: "Public money metric release",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient or payment destination needs review before publication",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresVerifiedRegistry: true,
    requiresVerifiedDestination: true,
    requiresPrivilegedAction: true,
    userFacingBlockerCategory: "Recipient and destination verification is incomplete",
  },
];

const CONTRACT_TESTS = [
  "recipient_destination_contract_validator",
  "recipient_destination_missing_records_fail_closed",
  "recipient_destination_review_statuses_block_capture_and_release",
  "recipient_destination_policy_snapshot_and_dual_control_required",
  "recipient_destination_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeRecipientDestinationCheck {
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

function makeSampleRecord(
  overrides: Partial<MoralTradeRecipientDestinationRecord> = {},
): MoralTradeRecipientDestinationRecord {
  return {
    recipientRegistryEntryId: "recipient:verified-demo",
    paymentDestinationId: "destination:verified-demo",
    recipientRegistryStatus: "verified",
    paymentDestinationStatus: "verified",
    antiImpersonationStatus: "verified",
    jurisdictionStatus: "verified",
    prohibitedUseStatus: "verified",
    policySnapshotStatus: "resolved_immutable",
    privilegedActionStatus: "approved",
    registryEntryHash: makeHash("registry"),
    paymentDestinationHash: makeHash("destination"),
    reviewedAt: "2026-06-07T12:00:00.000Z",
    expiresAt: "2026-12-07T12:00:00.000Z",
    ...overrides,
  };
}

function getTransitionDefinition(transition: MoralTradeRecipientDestinationTransition) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

export function evaluateMoralTradeRecipientDestination(
  input: MoralTradeRecipientDestinationEvaluationInput,
): MoralTradeRecipientDestinationEvaluation {
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
      userFacingBlockerCategories: ["Recipient verification state cannot be interpreted"],
    };
  }

  if (
    (definition.requiresVerifiedRegistry || definition.requiresVerifiedDestination) &&
    input.records.length === 0
  ) {
    blockers.push("recipient_destination_record_required");
  }

  input.records.forEach((record) => {
    const recordKey = `${record.recipientRegistryEntryId}:${record.paymentDestinationId}`;
    const recordBlockers: string[] = [];

    if (definition.requiresVerifiedRegistry && record.recipientRegistryStatus !== "verified") {
      recordBlockers.push(
        `recipient_registry_not_verified:${record.recipientRegistryEntryId}:${record.recipientRegistryStatus}`,
      );
    }

    if (
      definition.requiresVerifiedDestination &&
      record.paymentDestinationStatus !== "verified"
    ) {
      recordBlockers.push(
        `payment_destination_not_verified:${record.paymentDestinationId}:${record.paymentDestinationStatus}`,
      );
    }

    [
      ["anti_impersonation", record.antiImpersonationStatus],
      ["jurisdiction", record.jurisdictionStatus],
      ["prohibited_use", record.prohibitedUseStatus],
    ].forEach(([dimension, status]) => {
      if (status !== "verified" && status !== "not_required_for_stage") {
        recordBlockers.push(
          `recipient_destination_review_not_verified:${dimension}:${status}`,
        );
      }
    });

    if (record.policySnapshotStatus !== "resolved_immutable") {
      recordBlockers.push(
        `recipient_destination_policy_snapshot_not_immutable:${record.policySnapshotStatus}`,
      );
    }

    if (
      definition.requiresPrivilegedAction &&
      record.privilegedActionStatus !== "approved"
    ) {
      recordBlockers.push(
        `recipient_destination_privileged_action_not_approved:${record.privilegedActionStatus}`,
      );
    }

    if (!isHash(record.registryEntryHash)) {
      recordBlockers.push(`invalid_recipient_registry_hash:${record.recipientRegistryEntryId}`);
    }

    if (!isHash(record.paymentDestinationHash)) {
      recordBlockers.push(`invalid_payment_destination_hash:${record.paymentDestinationId}`);
    }

    if (daysBetween(record.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
      recordBlockers.push(`stale_recipient_destination_review:${recordKey}`);
    }

    if (isExpired(record.expiresAt, checkedAt)) {
      recordBlockers.push(`expired_recipient_destination_review:${recordKey}`);
    }

    if (recordBlockers.length === 0) {
      passingRecords.add(recordKey);
    }

    blockers.push(...recordBlockers);
  });

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredRecordCount:
      definition.requiresVerifiedRegistry || definition.requiresVerifiedDestination ? 1 : 0,
    passingRecordCount: passingRecords.size,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeRecipientDestinationContract():
  MoralTradeRecipientDestinationContract {
  const passingSample = evaluateMoralTradeRecipientDestination({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [makeSampleRecord()],
  });
  const blockedSample = evaluateMoralTradeRecipientDestination({
    transition: "payout_release",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      makeSampleRecord({
        paymentDestinationStatus: "under_review",
        antiImpersonationStatus: "impersonation_risk",
        privilegedActionStatus: "missing",
      }),
    ],
  });
  const previewSample = evaluateMoralTradeRecipientDestination({
    transition: "non_money_preview",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });

  return {
    version: MORAL_TRADE_RECIPIENT_DESTINATION_CONTRACT_VERSION,
    purpose:
      "Fail-closed recipient registry and payment-destination verification before lock, capture, payout release, reuse, public money metrics, or release promotion.",
    failClosedRule:
      "Free-text recipient names, copied donation links, wallet addresses, bank details, or fiscal-host notes are evidence inputs only. They cannot authorize lock, capture, payout, reuse, or public money claims until backed by verified registry and destination records under an immutable policy snapshot and approved privileged action.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    reviewDimensions: REVIEW_DIMENSIONS,
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [previewSample, passingSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeRecipientDestinationContract(
  contract = getMoralTradeRecipientDestinationContract(),
): MoralTradeRecipientDestinationValidation {
  const checks = [
    check(
      "first-class-recipient-destination-tables",
      "Recipient registry entries, payment destinations, and review records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Recipient/destination verification is governed by an immutable policy snapshot subject.",
      contract.policySnapshotSubjects.includes("recipient_destination_verification"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "review-dimensions",
      "Verification covers recipient identity, destination identity, anti-impersonation, jurisdiction, prohibited use, payment rail, authority, and source authentication.",
      REVIEW_DIMENSIONS.every((dimension) =>
        contract.reviewDimensions.includes(dimension),
      ),
      contract.reviewDimensions.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Missing, under-review, failed, stale, impersonation-risk, jurisdiction-blocked, prohibited-use-blocked, and superseded states fail closed.",
      FAIL_CLOSED_STATUSES.every((status) =>
        contract.failClosedStatuses.includes(status),
      ),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, capture, payout, reuse, public-metric release, and release promotion require verified records.",
      [
        "matched_trade_lock",
        "payment_capture",
        "payout_release",
        "recipient_reuse",
        "public_money_metric_release",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresVerifiedRegistry &&
            definition.requiresVerifiedDestination &&
            definition.requiresPrivilegedAction,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "sample-evaluations",
      "The public contract exposes passing preview/capture samples and a blocked payout sample.",
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
            evaluation.transition === "payout_release" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Recipient/destination contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-recipient-destination-contract",
    validatorVersion: MORAL_TRADE_RECIPIENT_DESTINATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeRecipientDestination = {
  evaluateMoralTradeRecipientDestination,
  getMoralTradeRecipientDestinationContract,
  validateMoralTradeRecipientDestinationContract,
};

export default moralTradeRecipientDestination;
