export const MORAL_TRADE_COMMITMENT_SETTLEMENT_CONTRACT_VERSION =
  "moral-trade-commitment-settlement-v0.1-2026-06";
export const MORAL_TRADE_COMMITMENT_SETTLEMENT_VALIDATOR_VERSION =
  "moral-trade-commitment-settlement-validator-v0.1";

export type MoralTradeCommitmentSettlementTransition =
  | "draft_preview"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "performance_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeCommitmentSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "evidence_record";

export type MoralTradeCommitmentType =
  | "planned_donation"
  | "opposed_donation_abstention"
  | "pledged_action"
  | "abstention"
  | "payment_authorization"
  | "evidence_artifact"
  | "other";

export type MoralTradeCommitmentReusePolicy =
  | "exclusive"
  | "pooled_if_preconfirmed"
  | "reusable_evidence_only"
  | "manual_review";

export type MoralTradeCommitmentInventoryState =
  | "draft"
  | "available"
  | "reserved"
  | "locked"
  | "fulfilled"
  | "released"
  | "expired"
  | "disputed"
  | "superseded";

export type MoralTradeCommitmentReservationScope =
  | "lock_proposal"
  | "payment_authorization"
  | "evidence_claim"
  | "performance_obligation";

export type MoralTradeCommitmentReservationState =
  | "pending"
  | "reserved"
  | "locked"
  | "fulfilled"
  | "released"
  | "expired"
  | "cancelled"
  | "superseded";

export type MoralTradeDoubleCountCheckState =
  | "not_required"
  | "passed"
  | "blocked"
  | "manual_review";

export type MoralTradeAtomicSettlementState =
  | "draft"
  | "waiting_for_confirmations"
  | "waiting_for_authorizations"
  | "locked"
  | "failed"
  | "released"
  | "cancelled"
  | "superseded";

export type MoralTradeFailedMemberBehavior =
  | "expire_group"
  | "recompute_group"
  | "manual_review";

export interface MoralTradeCommitmentInventoryRecord {
  recordId: string;
  participantIdHash: string;
  commitmentType: MoralTradeCommitmentType;
  subjectType: MoralTradeCommitmentSubjectType;
  subjectId: string;
  noTradeBaselineSnapshotHash: string;
  negativeCommitmentScopeRef: string | null;
  actionUnit: string;
  amountCents: number;
  currency: string;
  performanceWindowStart: string;
  performanceWindowEnd: string;
  totalCapacityUnits: number;
  reservedCapacityUnits: number;
  fulfilledCapacityUnits: number;
  commitmentInventoryPolicyRef: string;
  reusePolicy: MoralTradeCommitmentReusePolicy;
  inventoryState: MoralTradeCommitmentInventoryState;
  privacyGrantRefs: string[];
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeCommitmentReservationRecord {
  recordId: string;
  commitmentInventoryRecordRef: string;
  matchedTradeLockProposalRef: string | null;
  clearedTradeAgreementRef: string | null;
  reservedUnits: number;
  reservedAmountCents: number;
  reservationScope: MoralTradeCommitmentReservationScope;
  reservationState: MoralTradeCommitmentReservationState;
  doubleCountCheckState: MoralTradeDoubleCountCheckState;
  releaseReason: string | null;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeAtomicSettlementGroup {
  recordId: string;
  tradeType: "donation_offset" | "pledge_swap";
  matchedTradeLockProposalRefs: string[];
  requiredParticipantCount: number;
  requiredFinalConfirmationRefs: string[];
  requiredPaymentAuthorizationRefs: string[];
  commitmentReservationRefs: string[];
  atomicSettlementPolicyRef: string;
  allOrNoneState: MoralTradeAtomicSettlementState;
  failedMemberBehavior: MoralTradeFailedMemberBehavior;
  noPartialCapture: boolean;
  noPartialDisclosure: boolean;
  noIrreversiblePerformanceBeforeLock: boolean;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeCommitmentSettlementEvaluationInput {
  transition: MoralTradeCommitmentSettlementTransition;
  checkedAt?: string;
  commitmentSettlementRequired: boolean;
  commitmentInventories: MoralTradeCommitmentInventoryRecord[];
  commitmentReservations: MoralTradeCommitmentReservationRecord[];
  atomicSettlementGroups: MoralTradeAtomicSettlementGroup[];
}

export interface MoralTradeCommitmentSettlementEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeCommitmentSettlementTransition;
  checkedAt: string;
  commitmentSettlementRequired: boolean;
  reviewedRecordCount: number;
  nonBlockingRecordCount: number;
  reservedCommitmentCount: number;
  atomicSettlementGroupCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeCommitmentSettlementTransitionDefinition {
  key: MoralTradeCommitmentSettlementTransition;
  label: string;
  requiresCommitmentSettlementRecords: boolean;
  requiresLockedReservations: boolean;
  requiresAtomicAllOrNone: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeCommitmentSettlementCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeCommitmentSettlementValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-commitment-settlement-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeCommitmentSettlementCheck[];
  blockers: string[];
}

export interface MoralTradeCommitmentSettlementContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  doubleCountRule: string;
  atomicSettlementRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitionDefinitions: MoralTradeCommitmentSettlementTransitionDefinition[];
  sampleEvaluations: MoralTradeCommitmentSettlementEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_commitment_inventory_records",
  "moral_trade_commitment_reservation_records",
  "moral_trade_atomic_settlement_groups",
  "moral_trade_commitment_settlement_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "commitment_inventory",
  "atomic_settlement",
  "breach_remedy",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "commitment_inventory_double_count_test",
  "atomic_settlement_group_test",
] as const;

const LOCKED_INVENTORY_STATES = new Set<MoralTradeCommitmentInventoryState>([
  "reserved",
  "locked",
  "fulfilled",
]);

const LOCKED_RESERVATION_STATES = new Set<MoralTradeCommitmentReservationState>([
  "reserved",
  "locked",
  "fulfilled",
]);

const ATOMIC_PASSING_STATES = new Set<MoralTradeAtomicSettlementState>([
  "locked",
  "released",
]);

const TRANSITIONS: MoralTradeCommitmentSettlementTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresCommitmentSettlementRecords: false,
    requiresLockedReservations: false,
    requiresAtomicAllOrNone: false,
    userFacingBlockerCategory:
      "Draft preview may proceed without reserved commitment inventory",
  },
  {
    key: "match_candidate_preview",
    label: "Match-candidate preview",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: false,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Match preview requires commitment inventory and atomic settlement terms before exposing a clearable candidate",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Lock requires reserved commitments and all-or-none settlement controls",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Payment authorization requires double-count-safe reservations and no partial capture",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Payment capture requires locked atomic settlement and no partial capture",
  },
  {
    key: "performance_release",
    label: "Performance release",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Performance release requires no irreversible action before lock and double-count-safe reservations",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Public metrics require fulfilled or released all-or-none settlement evidence",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresCommitmentSettlementRecords: true,
    requiresLockedReservations: true,
    requiresAtomicAllOrNone: true,
    userFacingBlockerCategory:
      "Release promotion requires commitment-inventory double-count and atomic-settlement hooks to pass",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeCommitmentSettlementCheck {
  return { id, label, status: passed ? "pass" : "fail", evidence };
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 3;
}

function isHash(value: unknown) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function isIso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasRefs(values: unknown) {
  return Array.isArray(values) && values.some((value) => hasText(value));
}

function reviewerBlocker(recordId: string, reviewerDecisionRef: unknown) {
  return hasText(reviewerDecisionRef)
    ? []
    : [`commitment_settlement_reviewer_decision_missing:${recordId || "unknown"}`];
}

function evaluateInventory({
  record,
  requiresLockedReservations,
}: {
  record: MoralTradeCommitmentInventoryRecord;
  requiresLockedReservations: boolean;
}) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  if (!hasText(record.recordId)) blockers.push("commitment_inventory_record_id_missing");
  if (!isHash(record.participantIdHash)) blockers.push(`commitment_inventory_participant_hash_invalid:${recordId}`);
  if (!hasText(record.subjectId)) blockers.push(`commitment_inventory_subject_missing:${recordId}`);
  if (!isHash(record.noTradeBaselineSnapshotHash)) blockers.push(`commitment_inventory_baseline_hash_invalid:${recordId}`);
  if (!hasText(record.actionUnit)) blockers.push(`commitment_inventory_action_unit_missing:${recordId}`);
  if (!isNonNegative(record.amountCents)) blockers.push(`commitment_inventory_amount_invalid:${recordId}`);
  if (!hasText(record.currency)) blockers.push(`commitment_inventory_currency_missing:${recordId}`);
  if (!isIso(record.performanceWindowStart) || !isIso(record.performanceWindowEnd)) {
    blockers.push(`commitment_inventory_performance_window_invalid:${recordId}`);
  } else if (Date.parse(record.performanceWindowStart) >= Date.parse(record.performanceWindowEnd)) {
    blockers.push(`commitment_inventory_performance_window_order_invalid:${recordId}`);
  }
  if (!isNonNegative(record.totalCapacityUnits)) blockers.push(`commitment_inventory_total_capacity_invalid:${recordId}`);
  if (!isNonNegative(record.reservedCapacityUnits)) blockers.push(`commitment_inventory_reserved_capacity_invalid:${recordId}`);
  if (!isNonNegative(record.fulfilledCapacityUnits)) blockers.push(`commitment_inventory_fulfilled_capacity_invalid:${recordId}`);
  if (record.reservedCapacityUnits > record.totalCapacityUnits) blockers.push(`commitment_inventory_reserved_exceeds_total:${recordId}`);
  if (record.fulfilledCapacityUnits > record.totalCapacityUnits) blockers.push(`commitment_inventory_fulfilled_exceeds_total:${recordId}`);
  if (record.reservedCapacityUnits + record.fulfilledCapacityUnits > record.totalCapacityUnits) {
    blockers.push(`commitment_inventory_double_count_capacity_exceeded:${recordId}`);
  }
  if (!hasText(record.commitmentInventoryPolicyRef)) blockers.push(`commitment_inventory_policy_missing:${recordId}`);
  if (record.reusePolicy === "manual_review") blockers.push(`commitment_inventory_reuse_policy_manual_review:${recordId}`);
  if (
    record.reusePolicy === "reusable_evidence_only" &&
    record.commitmentType !== "evidence_artifact"
  ) {
    blockers.push(`commitment_inventory_reusable_evidence_only_wrong_type:${recordId}`);
  }
  if (["expired", "disputed", "superseded"].includes(record.inventoryState)) {
    blockers.push(`commitment_inventory_state_blocking:${recordId}:${record.inventoryState}`);
  }
  if (requiresLockedReservations && !LOCKED_INVENTORY_STATES.has(record.inventoryState)) {
    blockers.push(`commitment_inventory_not_reserved_or_locked:${recordId}:${record.inventoryState}`);
  }
  if (!hasRefs(record.privacyGrantRefs)) blockers.push(`commitment_inventory_privacy_grants_missing:${recordId}`);
  blockers.push(...reviewerBlocker(recordId, record.reviewerDecisionRef));

  return blockers;
}

function evaluateReservation({
  record,
  requiresLockedReservations,
}: {
  record: MoralTradeCommitmentReservationRecord;
  requiresLockedReservations: boolean;
}) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  if (!hasText(record.recordId)) blockers.push("commitment_reservation_record_id_missing");
  if (!hasText(record.commitmentInventoryRecordRef)) blockers.push(`commitment_reservation_inventory_ref_missing:${recordId}`);
  if (!hasText(record.matchedTradeLockProposalRef) && !hasText(record.clearedTradeAgreementRef)) {
    blockers.push(`commitment_reservation_trade_ref_missing:${recordId}`);
  }
  if (!isNonNegative(record.reservedUnits) || record.reservedUnits <= 0) blockers.push(`commitment_reservation_units_invalid:${recordId}`);
  if (!isNonNegative(record.reservedAmountCents)) blockers.push(`commitment_reservation_amount_invalid:${recordId}`);
  if (!["passed", "not_required"].includes(record.doubleCountCheckState)) {
    blockers.push(`commitment_reservation_double_count_blocking:${recordId}:${record.doubleCountCheckState}`);
  }
  if (["expired", "cancelled", "superseded"].includes(record.reservationState)) {
    blockers.push(`commitment_reservation_state_blocking:${recordId}:${record.reservationState}`);
  }
  if (requiresLockedReservations && !LOCKED_RESERVATION_STATES.has(record.reservationState)) {
    blockers.push(`commitment_reservation_not_reserved_or_locked:${recordId}:${record.reservationState}`);
  }
  blockers.push(...reviewerBlocker(recordId, record.reviewerDecisionRef));

  return blockers;
}

function evaluateAtomicGroup({
  group,
  requiresAtomicAllOrNone,
  transition,
}: {
  group: MoralTradeAtomicSettlementGroup;
  requiresAtomicAllOrNone: boolean;
  transition: MoralTradeCommitmentSettlementTransition;
}) {
  const blockers: string[] = [];
  const recordId = group.recordId || "unknown";

  if (!hasText(group.recordId)) blockers.push("atomic_settlement_group_id_missing");
  if (group.requiredParticipantCount < 2 || !Number.isInteger(group.requiredParticipantCount)) {
    blockers.push(`atomic_settlement_required_participants_invalid:${recordId}`);
  }
  if (!hasRefs(group.matchedTradeLockProposalRefs)) blockers.push(`atomic_settlement_lock_refs_missing:${recordId}`);
  if (group.requiredFinalConfirmationRefs.length < group.requiredParticipantCount) {
    blockers.push(`atomic_settlement_final_confirmations_incomplete:${recordId}`);
  }
  if (!hasRefs(group.commitmentReservationRefs)) blockers.push(`atomic_settlement_commitment_reservations_missing:${recordId}`);
  if (!hasText(group.atomicSettlementPolicyRef)) blockers.push(`atomic_settlement_policy_missing:${recordId}`);
  if (requiresAtomicAllOrNone && !ATOMIC_PASSING_STATES.has(group.allOrNoneState)) {
    blockers.push(`atomic_settlement_state_not_locked:${recordId}:${group.allOrNoneState}`);
  }
  if (
    ["payment_authorization", "payment_capture"].includes(transition) &&
    !hasRefs(group.requiredPaymentAuthorizationRefs)
  ) {
    blockers.push(`atomic_settlement_payment_authorizations_missing:${recordId}`);
  }
  if (group.failedMemberBehavior === "manual_review") {
    blockers.push(`atomic_settlement_failed_member_manual_review:${recordId}`);
  }
  if (!group.noPartialCapture) blockers.push(`atomic_settlement_partial_capture_allowed:${recordId}`);
  if (!group.noPartialDisclosure) blockers.push(`atomic_settlement_partial_disclosure_allowed:${recordId}`);
  if (!group.noIrreversiblePerformanceBeforeLock) {
    blockers.push(`atomic_settlement_irreversible_performance_before_lock_allowed:${recordId}`);
  }
  blockers.push(...reviewerBlocker(recordId, group.reviewerDecisionRef));

  return blockers;
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("double_count") || blocker.includes("capacity")) {
    return "Commitment inventory cannot be double-counted";
  }
  if (blocker.includes("atomic_settlement") || blocker.includes("partial")) {
    return "Atomic settlement must be all-or-none";
  }
  if (blocker.includes("reservation")) {
    return "Commitment reservations are incomplete or stale";
  }
  return "Commitment settlement evidence is incomplete";
}

export function evaluateMoralTradeCommitmentSettlement(
  input: MoralTradeCommitmentSettlementEvaluationInput,
): MoralTradeCommitmentSettlementEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = TRANSITIONS.find((entry) => entry.key === input.transition);
  const commitmentSettlementRequired =
    input.commitmentSettlementRequired ||
    definition?.requiresCommitmentSettlementRecords === true;
  const requiresLockedReservations = definition?.requiresLockedReservations === true;
  const requiresAtomicAllOrNone = definition?.requiresAtomicAllOrNone === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let nonBlockingRecordCount = 0;

  if (commitmentSettlementRequired) {
    if (input.commitmentInventories.length === 0) blockers.push("commitment_inventory_records_missing");
    if (input.commitmentReservations.length === 0) blockers.push("commitment_reservation_records_missing");
    if (input.atomicSettlementGroups.length === 0) blockers.push("atomic_settlement_group_records_missing");
  }

  const recordBlockers = [
    ...input.commitmentInventories.map((record) =>
      evaluateInventory({ record, requiresLockedReservations }),
    ),
    ...input.commitmentReservations.map((record) =>
      evaluateReservation({ record, requiresLockedReservations }),
    ),
    ...input.atomicSettlementGroups.map((group) =>
      evaluateAtomicGroup({
        group,
        requiresAtomicAllOrNone,
        transition: input.transition,
      }),
    ),
  ];

  for (const entry of recordBlockers) {
    reviewedRecordCount += 1;
    blockers.push(...entry);
    if (entry.length === 0) nonBlockingRecordCount += 1;
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    commitmentSettlementRequired,
    reviewedRecordCount,
    nonBlockingRecordCount,
    reservedCommitmentCount: input.commitmentReservations.filter((record) =>
      LOCKED_RESERVATION_STATES.has(record.reservationState),
    ).length,
    atomicSettlementGroupCount: input.atomicSettlementGroups.length,
    blockers,
    userFacingBlockerCategories: Array.from(new Set(blockers.map(categoryForBlocker))),
  };
}

function hashFor(seed: string) {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function sampleInput(
  overrides: Partial<MoralTradeCommitmentSettlementEvaluationInput> = {},
): MoralTradeCommitmentSettlementEvaluationInput {
  return {
    atomicSettlementGroups: [
      {
        allOrNoneState: "locked",
        atomicSettlementPolicyRef: "policy:atomic-settlement:v1",
        commitmentReservationRefs: ["commitment-reservation:demo"],
        createdAt: "2026-06-13T00:00:00.000Z",
        failedMemberBehavior: "expire_group",
        matchedTradeLockProposalRefs: ["matched-lock:demo"],
        noIrreversiblePerformanceBeforeLock: true,
        noPartialCapture: true,
        noPartialDisclosure: true,
        recordId: "atomic-settlement:demo",
        requiredFinalConfirmationRefs: ["confirmation:a", "confirmation:b"],
        requiredParticipantCount: 2,
        requiredPaymentAuthorizationRefs: ["payment-authorization:demo"],
        reviewerDecisionRef: "review:atomic-settlement",
        tradeType: "pledge_swap",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    checkedAt: "2026-06-13T00:00:00.000Z",
    commitmentInventories: [
      {
        actionUnit: "pledge-action",
        amountCents: 10000,
        commitmentInventoryPolicyRef: "policy:commitment-inventory:v1",
        commitmentType: "pledged_action",
        createdAt: "2026-06-13T00:00:00.000Z",
        currency: "USD",
        fulfilledCapacityUnits: 0,
        inventoryState: "locked",
        negativeCommitmentScopeRef: null,
        noTradeBaselineSnapshotHash: hashFor("a"),
        participantIdHash: hashFor("b"),
        performanceWindowEnd: "2026-07-13T00:00:00.000Z",
        performanceWindowStart: "2026-06-13T00:00:00.000Z",
        privacyGrantRefs: ["privacy-grant:demo"],
        recordId: "commitment-inventory:demo",
        reservedCapacityUnits: 1,
        reusePolicy: "exclusive",
        reviewerDecisionRef: "review:commitment-inventory",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        totalCapacityUnits: 1,
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    commitmentReservations: [
      {
        clearedTradeAgreementRef: null,
        commitmentInventoryRecordRef: "commitment-inventory:demo",
        createdAt: "2026-06-13T00:00:00.000Z",
        doubleCountCheckState: "passed",
        matchedTradeLockProposalRef: "matched-lock:demo",
        recordId: "commitment-reservation:demo",
        releaseReason: null,
        reservationScope: "performance_obligation",
        reservationState: "locked",
        reservedAmountCents: 10000,
        reservedUnits: 1,
        reviewerDecisionRef: "review:commitment-reservation",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    commitmentSettlementRequired: true,
    transition: "matched_trade_lock",
    ...overrides,
  };
}

export function getMoralTradeCommitmentSettlementContract(): MoralTradeCommitmentSettlementContract {
  return {
    version: MORAL_TRADE_COMMITMENT_SETTLEMENT_CONTRACT_VERSION,
    purpose:
      "Fail-closed commitment-inventory and atomic-settlement contract for non-public-goods donation offsets and pledge swaps before lock, payment, performance release, public metrics, or release-gate promotion.",
    failClosedRule:
      "MoralTrade cannot lock, authorize payment, capture payment, release performance, publish public metrics, or promote release gates when commitment inventory, commitment reservation, or atomic settlement group records are missing, over-reserved, double-counted, stale, disputed, superseded, partial-capture-permitting, partial-disclosure-permitting, irreversible-before-lock, or reviewer-unapproved.",
    doubleCountRule:
      "A commitment inventory unit can be reserved for a lock, payment authorization, evidence claim, or performance obligation only when reserved plus fulfilled capacity does not exceed total capacity and the reservation double-count check is passed or not required.",
    atomicSettlementRule:
      "Atomic settlement groups must enforce all-or-none confirmations, authorizations, commitment reservations, no partial capture, no partial disclosure, and no irreversible performance before lock.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitionDefinitions: TRANSITIONS.map((entry) => ({ ...entry })),
    sampleEvaluations: [
      evaluateMoralTradeCommitmentSettlement(sampleInput()),
      evaluateMoralTradeCommitmentSettlement(
        sampleInput({
          atomicSettlementGroups: [
            {
              ...sampleInput().atomicSettlementGroups[0],
              allOrNoneState: "waiting_for_authorizations",
              noPartialCapture: false,
            },
          ],
          transition: "payment_capture",
        }),
      ),
    ],
    contractTests: [
      "commitment_settlement_contract_validator",
      "commitment_settlement_record_test",
      "commitment_inventory_double_count_test",
      "atomic_settlement_group_test",
      "commitment_settlement_route_contract",
      "commitment_settlement_schema_contract",
    ],
  };
}

export function validateMoralTradeCommitmentSettlementContract(
  contract: MoralTradeCommitmentSettlementContract = getMoralTradeCommitmentSettlementContract(),
): MoralTradeCommitmentSettlementValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Contract names commitment inventory, reservation, atomic settlement, and enforcement tables",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Contract names commitment and atomic settlement policy subjects",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Contract exposes moraltrade68 commitment inventory and atomic settlement release-gate hooks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract requires records for lock, payment, performance, public metric, and release transitions",
      [
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "performance_release",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (entry) =>
            entry.key === transition &&
            entry.requiresCommitmentSettlementRecords &&
            entry.requiresAtomicAllOrNone,
        ),
      ),
      contract.transitionDefinitions.map((entry) => entry.key).join(", "),
    ),
    check(
      "double-count-rule",
      "Double-count rule caps reserved plus fulfilled capacity",
      /reserved plus fulfilled capacity does not exceed total capacity/i.test(contract.doubleCountRule),
      contract.doubleCountRule,
    ),
    check(
      "atomic-settlement-rule",
      "Atomic rule prohibits partial capture, partial disclosure, and irreversible performance before lock",
      /no partial capture/i.test(contract.atomicSettlementRule) &&
        /no partial disclosure/i.test(contract.atomicSettlementRule) &&
        /no irreversible performance before lock/i.test(contract.atomicSettlementRule),
      contract.atomicSettlementRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked commitment-settlement paths",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations.map((sample) => sample.status).join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-commitment-settlement-contract",
    validatorVersion: MORAL_TRADE_COMMITMENT_SETTLEMENT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeCommitmentSettlement = {
  evaluateMoralTradeCommitmentSettlement,
  getMoralTradeCommitmentSettlementContract,
  validateMoralTradeCommitmentSettlementContract,
};

export default moralTradeCommitmentSettlement;
