export const MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_CONTRACT_VERSION =
  "moral-trade-batch-clearing-objective-v0.1-2026-06";
export const MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_VALIDATOR_VERSION =
  "moral-trade-batch-clearing-objective-validator-v0.1";

export type MoralTradeBatchClearingObjectiveTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "clearing_run"
  | "payment_capture"
  | "reliance"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeBatchClearingObjectiveSubjectType =
  | "donation_offset_batch"
  | "donation_offset_offer_pool"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "public_metric_batch"
  | "release_gate";

export type MoralTradeBatchClearingObjectiveType =
  | "maximize_safe_matched_volume"
  | "maximize_safe_participant_count"
  | "minimize_unmatched_residual"
  | "manual_review";

export type MoralTradeBatchClearingTieBreakFairnessRuleType =
  | "seeded_deterministic_hash"
  | "pro_rata_by_frozen_capacity"
  | "round_robin_by_hash"
  | "reviewer_approved_manual"
  | "manual_review";

export type MoralTradeBatchClearingAllocationDriver =
  | "objective_score"
  | "frozen_capacity"
  | "participant_confirmed_bounds"
  | "seeded_hash"
  | "moral_score"
  | "operator_preference"
  | "public_pressure"
  | "timestamp_race"
  | "private_cap_leakage"
  | "database_order"
  | "protected_trait"
  | "hidden_reviewer_preference";

export type MoralTradeBatchClearingObjectiveResultState =
  | "draft"
  | "reproducible"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "superseded";

export type MoralTradeBatchClearingObjectivePolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeBatchClearingObjectiveRecord {
  recordId: string;
  subjectType: MoralTradeBatchClearingObjectiveSubjectType;
  subjectId: string;
  batchClearingObjectivePolicyRef: string;
  policyStatus: MoralTradeBatchClearingObjectivePolicyStatus;
  objectiveType: MoralTradeBatchClearingObjectiveType;
  objectiveFrozenAt: string | null;
  deterministicAlgorithmVersion: string;
  tieBreakFairnessRuleType: MoralTradeBatchClearingTieBreakFairnessRuleType;
  tieBreakFairnessPolicyRef: string;
  scarceCapacity: boolean;
  inputBundleHash: string | null;
  excludedRecordsHash: string | null;
  objectiveResultHash: string | null;
  reproducibilityCheckRef: string | null;
  allocationDriversUsed: MoralTradeBatchClearingAllocationDriver[];
  resultState: MoralTradeBatchClearingObjectiveResultState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeBatchClearingObjectiveEvaluationInput {
  transition: MoralTradeBatchClearingObjectiveTransition;
  batchObjectiveRequired: boolean;
  checkedAt?: string;
  records: MoralTradeBatchClearingObjectiveRecord[];
}

export interface MoralTradeBatchClearingObjectiveEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeBatchClearingObjectiveTransition;
  checkedAt: string;
  batchObjectiveRequired: boolean;
  reviewedRecordCount: number;
  reproducibleResultCount: number;
  prohibitedAllocationDriverCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeBatchClearingObjectiveTransitionDefinition {
  key: MoralTradeBatchClearingObjectiveTransition;
  label: string;
  requiresObjectiveResult: boolean;
  requiresDeterministicTieBreak: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeBatchClearingObjectiveCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeBatchClearingObjectiveValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-batch-clearing-objective-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeBatchClearingObjectiveCheck[];
  blockers: string[];
}

export interface MoralTradeBatchClearingObjectiveContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  deterministicTieBreakRule: string;
  prohibitedAllocationRule: string;
  reproducibilityRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeBatchClearingObjectiveSubjectType[];
  objectiveTypes: MoralTradeBatchClearingObjectiveType[];
  tieBreakFairnessRuleTypes: MoralTradeBatchClearingTieBreakFairnessRuleType[];
  allocationDrivers: MoralTradeBatchClearingAllocationDriver[];
  prohibitedAllocationDrivers: MoralTradeBatchClearingAllocationDriver[];
  resultStates: MoralTradeBatchClearingObjectiveResultState[];
  policyStatuses: MoralTradeBatchClearingObjectivePolicyStatus[];
  transitionDefinitions: MoralTradeBatchClearingObjectiveTransitionDefinition[];
  sampleEvaluations: MoralTradeBatchClearingObjectiveEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 90;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_batch_clearing_objective_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["batch_clearing_objective"] as const;

const SUBJECT_TYPES: MoralTradeBatchClearingObjectiveSubjectType[] = [
  "donation_offset_batch",
  "donation_offset_offer_pool",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "public_metric_batch",
  "release_gate",
];

const OBJECTIVE_TYPES: MoralTradeBatchClearingObjectiveType[] = [
  "maximize_safe_matched_volume",
  "maximize_safe_participant_count",
  "minimize_unmatched_residual",
  "manual_review",
];

const TIE_BREAK_FAIRNESS_RULE_TYPES: MoralTradeBatchClearingTieBreakFairnessRuleType[] = [
  "seeded_deterministic_hash",
  "pro_rata_by_frozen_capacity",
  "round_robin_by_hash",
  "reviewer_approved_manual",
  "manual_review",
];

const DETERMINISTIC_TIE_BREAK_RULES =
  new Set<MoralTradeBatchClearingTieBreakFairnessRuleType>([
    "seeded_deterministic_hash",
    "pro_rata_by_frozen_capacity",
    "round_robin_by_hash",
  ]);

const ALLOCATION_DRIVERS: MoralTradeBatchClearingAllocationDriver[] = [
  "objective_score",
  "frozen_capacity",
  "participant_confirmed_bounds",
  "seeded_hash",
  "moral_score",
  "operator_preference",
  "public_pressure",
  "timestamp_race",
  "private_cap_leakage",
  "database_order",
  "protected_trait",
  "hidden_reviewer_preference",
];

const PROHIBITED_ALLOCATION_DRIVERS =
  new Set<MoralTradeBatchClearingAllocationDriver>([
    "moral_score",
    "operator_preference",
    "public_pressure",
    "timestamp_race",
    "private_cap_leakage",
    "database_order",
    "protected_trait",
    "hidden_reviewer_preference",
  ]);

const RESULT_STATES: MoralTradeBatchClearingObjectiveResultState[] = [
  "draft",
  "reproducible",
  "under_review",
  "non_blocking",
  "blocked",
  "superseded",
];

const PASSING_RESULT_STATES =
  new Set<MoralTradeBatchClearingObjectiveResultState>([
    "reproducible",
    "non_blocking",
  ]);

const POLICY_STATUSES: MoralTradeBatchClearingObjectivePolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const TRANSITION_DEFINITIONS: MoralTradeBatchClearingObjectiveTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresObjectiveResult: false,
    requiresDeterministicTieBreak: false,
    userFacingBlockerCategory:
      "Batch-clearing objective evidence is preview-only until the objective and fairness policy are frozen",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Candidate generation waits for a frozen batch objective, deterministic tie-break rule, and reproducible objective result",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Final lock cannot allocate scarce matches by moral score, operator preference, public pressure, timestamp race, private-cap leakage, or database order",
  },
  {
    key: "clearing_run",
    label: "Clearing run",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Batch clearing requires a reproducible objective result over frozen inputs and excluded records",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Payment capture waits for deterministic allocation evidence instead of timestamp, database-order, or operator-selected scarce matches",
  },
  {
    key: "reliance",
    label: "Reliance",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require non-blocking batch-objective evidence with privacy-safe allocation drivers",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Public metrics can count only reproducible objective results, not manually preferred or pressure-driven scarce allocations",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresObjectiveResult: true,
    requiresDeterministicTieBreak: true,
    userFacingBlockerCategory:
      "Release promotion requires frozen objective policy, deterministic fairness rule, and prohibited-driver counters",
  },
];

const CONTRACT_TESTS = [
  "batch_clearing_objective_contract_validator",
  "batch_clearing_objective_result_test",
  "batch_clearing_prohibited_allocation_driver_test",
  "batch_clearing_objective_route_contract",
  "batch_clearing_objective_schema_contract",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeBatchClearingObjectiveCheck {
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

function isHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function isValidIso(value: string | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

function isStaleTimestamp(value: string, checkedAt: string) {
  if (!isValidIso(value) || !isValidIso(checkedAt)) {
    return true;
  }

  const maxAgeMs = MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;

  return Date.parse(checkedAt) - Date.parse(value) > maxAgeMs;
}

function evaluateRecord({
  checkedAt,
  record,
  requiresDeterministicTieBreak,
  requiresObjectiveResult,
}: {
  checkedAt: string;
  record: MoralTradeBatchClearingObjectiveRecord;
  requiresDeterministicTieBreak: boolean;
  requiresObjectiveResult: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("batch_clearing_objective_record_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`batch_clearing_objective_subject_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.batchClearingObjectivePolicyRef)) {
    blockers.push(`batch_clearing_objective_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(
      `batch_clearing_objective_policy_not_immutable:${record.recordId}:${record.policyStatus}`,
    );
  }

  if (record.objectiveType === "manual_review" && requiresObjectiveResult) {
    blockers.push(`batch_clearing_objective_manual_objective:${record.recordId}`);
  }

  if (!isValidIso(record.objectiveFrozenAt)) {
    blockers.push(`batch_clearing_objective_frozen_at_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.deterministicAlgorithmVersion)) {
    blockers.push(`batch_clearing_objective_algorithm_version_missing:${record.recordId}`);
  }

  if (
    requiresDeterministicTieBreak &&
    !DETERMINISTIC_TIE_BREAK_RULES.has(record.tieBreakFairnessRuleType)
  ) {
    blockers.push(
      `batch_clearing_objective_tie_break_not_deterministic:${record.recordId}:${record.tieBreakFairnessRuleType}`,
    );
  }

  if (!hasMeaningfulText(record.tieBreakFairnessPolicyRef)) {
    blockers.push(`batch_clearing_objective_tie_break_policy_missing:${record.recordId}`);
  }

  if (!isHash(record.inputBundleHash)) {
    blockers.push(`batch_clearing_objective_input_bundle_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.excludedRecordsHash)) {
    blockers.push(`batch_clearing_objective_excluded_records_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.objectiveResultHash)) {
    blockers.push(`batch_clearing_objective_result_hash_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.reproducibilityCheckRef)) {
    blockers.push(`batch_clearing_objective_reproducibility_check_missing:${record.recordId}`);
  }

  if (
    requiresObjectiveResult &&
    !PASSING_RESULT_STATES.has(record.resultState)
  ) {
    blockers.push(`batch_clearing_objective_result_not_reproducible:${record.recordId}:${record.resultState}`);
  }

  if (record.resultState === "blocked") {
    blockers.push(`batch_clearing_objective_result_blocked:${record.recordId}`);
  }

  if (record.resultState === "under_review") {
    blockers.push(`batch_clearing_objective_result_under_review:${record.recordId}`);
  }

  if (record.resultState === "superseded") {
    blockers.push(`batch_clearing_objective_result_superseded:${record.recordId}`);
  }

  if (record.allocationDriversUsed.length === 0) {
    blockers.push(`batch_clearing_objective_allocation_drivers_missing:${record.recordId}`);
  }

  for (const driver of record.allocationDriversUsed) {
    if (PROHIBITED_ALLOCATION_DRIVERS.has(driver)) {
      blockers.push(`batch_clearing_objective_prohibited_allocation_driver:${record.recordId}:${driver}`);
    }
  }

  if (
    record.scarceCapacity &&
    !record.allocationDriversUsed.includes("seeded_hash") &&
    !record.allocationDriversUsed.includes("frozen_capacity") &&
    !record.allocationDriversUsed.includes("participant_confirmed_bounds")
  ) {
    blockers.push(`batch_clearing_objective_scarce_capacity_fairness_driver_missing:${record.recordId}`);
  }

  if (
    PASSING_RESULT_STATES.has(record.resultState) &&
    !hasMeaningfulText(record.reviewerDecisionRef)
  ) {
    blockers.push(`batch_clearing_objective_reviewer_decision_missing:${record.recordId}`);
  }

  if (!isValidIso(record.createdAt)) {
    blockers.push(`batch_clearing_objective_created_at_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.updatedAt)) {
    blockers.push(`batch_clearing_objective_updated_at_invalid:${record.recordId}`);
  } else if (isStaleTimestamp(record.updatedAt, checkedAt)) {
    blockers.push(`batch_clearing_objective_result_stale:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeBatchClearingObjective(
  input: MoralTradeBatchClearingObjectiveEvaluationInput,
): MoralTradeBatchClearingObjectiveEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const batchObjectiveRequired =
    input.batchObjectiveRequired ||
    transitionDefinition?.requiresObjectiveResult === true;
  const requiresObjectiveResult =
    transitionDefinition?.requiresObjectiveResult === true;
  const requiresDeterministicTieBreak =
    transitionDefinition?.requiresDeterministicTieBreak === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let reproducibleResultCount = 0;
  let prohibitedAllocationDriverCount = 0;

  if (batchObjectiveRequired && input.records.length === 0) {
    blockers.push("batch_clearing_objective_result_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresObjectiveResult,
      requiresDeterministicTieBreak,
    });

    blockers.push(...recordBlockers);

    if (
      record.policyStatus === "resolved_immutable" &&
      hasMeaningfulText(record.reviewerDecisionRef)
    ) {
      reviewedRecordCount += 1;
    }

    if (
      PASSING_RESULT_STATES.has(record.resultState) &&
      recordBlockers.length === 0
    ) {
      reproducibleResultCount += 1;
    }

    prohibitedAllocationDriverCount += record.allocationDriversUsed.filter((driver) =>
      PROHIBITED_ALLOCATION_DRIVERS.has(driver),
    ).length;
  }

  if (
    batchObjectiveRequired &&
    input.records.length > 0 &&
    reproducibleResultCount === 0
  ) {
    blockers.push("batch_clearing_objective_reproducible_result_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    batchObjectiveRequired,
    reviewedRecordCount,
    reproducibleResultCount,
    prohibitedAllocationDriverCount,
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("prohibited_allocation_driver")
            ? "Scarce matches cannot be allocated by moral score, operator preference, public pressure, timestamp races, private-cap leakage, database order, protected traits, or hidden reviewer preference"
            : blocker.includes("tie_break") || blocker.includes("scarce_capacity")
              ? "Batch clearing needs a deterministic tie-break and fairness rule over frozen capacity and participant bounds"
              : blocker.includes("hash") || blocker.includes("reproducibility")
                ? "Batch objective result is not reproducible over frozen input and excluded-record hashes"
                : blocker.includes("policy")
                  ? "Batch-clearing objective policy is not frozen"
                  : blocker.includes("stale")
                    ? "Batch-clearing objective result is stale"
                    : "Batch-clearing objective record is incomplete or still under review",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeBatchClearingObjectiveRecord> = {},
): MoralTradeBatchClearingObjectiveRecord {
  return {
    recordId: "batch-clearing-objective:demo",
    subjectType: "donation_offset_batch",
    subjectId: "donation-offset-batch:demo",
    batchClearingObjectivePolicyRef: "policy-snapshot:batch-clearing-objective-v1",
    policyStatus: "resolved_immutable",
    objectiveType: "maximize_safe_matched_volume",
    objectiveFrozenAt: "2026-06-01T00:00:00.000Z",
    deterministicAlgorithmVersion:
      "moral-trade-batch-clearing-objective-v0.1-2026-06:deterministic-v1",
    tieBreakFairnessRuleType: "seeded_deterministic_hash",
    tieBreakFairnessPolicyRef: "policy-snapshot:batch-clearing-fairness-v1",
    scarceCapacity: true,
    inputBundleHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    excludedRecordsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    objectiveResultHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reproducibilityCheckRef: "reproducibility-check:batch-objective-v1",
    allocationDriversUsed: [
      "objective_score",
      "frozen_capacity",
      "participant_confirmed_bounds",
      "seeded_hash",
    ],
    resultState: "reproducible",
    reviewerDecisionRef: "review-decision:batch-clearing-objective",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradeBatchClearingObjectiveContract(): MoralTradeBatchClearingObjectiveContract {
  return {
    version: MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_CONTRACT_VERSION,
    purpose:
      "Fail-closed batch-clearing objective governance for donation-offset batch allocation before scarce matches can affect matching, lock, clearing, payment capture, reliance, public metrics, or release promotion.",
    privacyRule:
      "Public batch-clearing objective contract responses expose only static rules, table names, enums, validation blockers, and sample pass/block states. They never expose raw input bundles, private caps, exact participant constraints, ranked participant rows, reviewer notes, or allocation membership.",
    failClosedRule:
      "Donation-offset batch clearing requires a frozen objective, immutable policy, deterministic tie-break/fairness rule, input-bundle hash, excluded-record hash, reproducible objective result hash, reproducibility check, and non-blocking review. Missing, mutable, stale, manual-review, blocked, superseded, or unreproducible objective results block scarce allocation, lock, capture, reliance, public metrics, and release promotion.",
    deterministicTieBreakRule:
      "Scarce matches must use a deterministic fairness rule such as seeded hash, pro-rata frozen capacity, or round-robin-by-hash over frozen input and excluded-record bundles.",
    prohibitedAllocationRule:
      "Matched volume alone cannot justify allocation. Scarce matches cannot be allocated by moral score, operator preference, public pressure, timestamp races, private-cap leakage, database order, protected traits, or hidden reviewer preference.",
    reproducibilityRule:
      "Every objective result must be replayable from the frozen objective policy, deterministic algorithm version, input-bundle hash, excluded-record hash, tie-break fairness policy, and result hash.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    objectiveTypes: [...OBJECTIVE_TYPES],
    tieBreakFairnessRuleTypes: [...TIE_BREAK_FAIRNESS_RULE_TYPES],
    allocationDrivers: [...ALLOCATION_DRIVERS],
    prohibitedAllocationDrivers: Array.from(PROHIBITED_ALLOCATION_DRIVERS),
    resultStates: [...RESULT_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradeBatchClearingObjective({
        transition: "clearing_run",
        batchObjectiveRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradeBatchClearingObjective({
        transition: "matched_trade_lock",
        batchObjectiveRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "batch-clearing-objective:blocked-driver-demo",
            tieBreakFairnessRuleType: "manual_review",
            allocationDriversUsed: [
              "objective_score",
              "operator_preference",
              "database_order",
            ],
            resultState: "under_review",
            reviewerDecisionRef: null,
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralTradeBatchClearingObjectiveContract(
  contract: MoralTradeBatchClearingObjectiveContract =
    getMoralTradeBatchClearingObjectiveContract(),
): MoralTradeBatchClearingObjectiveValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names first-class batch-clearing objective records",
      contract.firstClassRecordTables.includes(
        "moral_trade_batch_clearing_objective_records",
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names batch_clearing_objective policy snapshots",
      contract.policySnapshotSubjects.includes("batch_clearing_objective"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "objective-type-coverage",
      "Contract covers safe matched volume, participant count, residual minimization, and manual-review objectives",
      hasAll(contract.objectiveTypes, OBJECTIVE_TYPES),
      contract.objectiveTypes.join(", "),
    ),
    check(
      "deterministic-tie-break-coverage",
      "Contract covers seeded hash, pro-rata frozen capacity, and round-robin hash tie-break rules",
      ["seeded_deterministic_hash", "pro_rata_by_frozen_capacity", "round_robin_by_hash"].every(
        (rule) =>
          contract.tieBreakFairnessRuleTypes.includes(
            rule as MoralTradeBatchClearingTieBreakFairnessRuleType,
          ),
      ) &&
        /deterministic/i.test(contract.deterministicTieBreakRule) &&
        /frozen/i.test(contract.deterministicTieBreakRule),
      contract.tieBreakFairnessRuleTypes.join(", "),
    ),
    check(
      "prohibited-allocation-rule",
      "Contract prohibits moral score, operator preference, public pressure, timestamp races, private-cap leakage, and database order",
      /moral score/i.test(contract.prohibitedAllocationRule) &&
        /operator preference/i.test(contract.prohibitedAllocationRule) &&
        /public pressure/i.test(contract.prohibitedAllocationRule) &&
        /timestamp/i.test(contract.prohibitedAllocationRule) &&
        /private-cap/i.test(contract.prohibitedAllocationRule) &&
        /database order/i.test(contract.prohibitedAllocationRule),
      contract.prohibitedAllocationRule,
    ),
    check(
      "prohibited-driver-enum",
      "Contract enumerates prohibited allocation drivers",
      [
        "moral_score",
        "operator_preference",
        "public_pressure",
        "timestamp_race",
        "private_cap_leakage",
        "database_order",
      ].every((driver) =>
        contract.prohibitedAllocationDrivers.includes(
          driver as MoralTradeBatchClearingAllocationDriver,
        ),
      ),
      contract.prohibitedAllocationDrivers.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract requires objective results for candidate generation, lock, clearing, capture, reliance, public metrics, and release promotion",
      [
        "match_candidate_generation",
        "matched_trade_lock",
        "clearing_run",
        "payment_capture",
        "reliance",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresObjectiveResult &&
            definition.requiresDeterministicTieBreak,
        ),
      ),
      contract.transitionDefinitions
        .filter((definition) => definition.requiresObjectiveResult)
        .map((definition) => definition.key)
        .join(", "),
    ),
    check(
      "sample-evaluation-coverage",
      "Contract includes passing and blocked sample evaluations",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-test-coverage",
      "Contract lists validator, objective-result, prohibited-driver, route, and schema tests",
      hasAll(contract.contractTests, CONTRACT_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}:${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-batch-clearing-objective-contract",
    validatorVersion: MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeBatchClearingObjective = {
  evaluateMoralTradeBatchClearingObjective,
  getMoralTradeBatchClearingObjectiveContract,
  validateMoralTradeBatchClearingObjectiveContract,
};

export default moralTradeBatchClearingObjective;
