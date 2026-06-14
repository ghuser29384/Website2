export const MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_CONTRACT_VERSION =
  "moral-trade-pledge-swap-performance-schedules-v0.1-2026-06";
export const MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_VALIDATOR_VERSION =
  "moral-trade-pledge-swap-performance-schedule-validator-v0.1";

export type MoralTradePledgeSwapPerformanceScheduleTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "performance_start"
  | "checkpoint_evidence"
  | "performance_release"
  | "breach_remedy"
  | "reciprocal_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradePledgeSwapPerformanceScheduleState =
  | "draft"
  | "previewed"
  | "locked"
  | "active"
  | "suspended"
  | "completed"
  | "released"
  | "disputed"
  | "superseded";

export interface MoralTradePledgeSwapPerformanceScheduleRecord {
  recordId: string;
  pledgeSwapOfferId: string | null;
  matchedTradeLockProposalRef: string | null;
  clearedTradeAgreementRef: string | null;
  performanceSchedulePolicyRef: string;
  performanceStartAt: string;
  performanceEndAt: string;
  checkpointSchedule: unknown;
  synchronizedStartRequired: boolean;
  counterpartNonperformanceSuspensionRule: string;
  reciprocalReleaseTrigger: string;
  graceOrCurePeriodDays: number;
  evidenceDueSchedule: unknown;
  publicBreachDisclosureAllowed: boolean;
  breachRemedyPolicyRef: string;
  scheduleState: MoralTradePledgeSwapPerformanceScheduleState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePledgeSwapPerformanceScheduleEvaluationInput {
  transition: MoralTradePledgeSwapPerformanceScheduleTransition;
  checkedAt?: string;
  performanceScheduleRequired: boolean;
  schedules: MoralTradePledgeSwapPerformanceScheduleRecord[];
}

export interface MoralTradePledgeSwapPerformanceScheduleEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePledgeSwapPerformanceScheduleTransition;
  checkedAt: string;
  performanceScheduleRequired: boolean;
  scheduleCount: number;
  nonBlockingScheduleCount: number;
  synchronizedScheduleCount: number;
  reciprocalReleaseScheduleCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePledgeSwapPerformanceScheduleCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePledgeSwapPerformanceScheduleValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-pledge-swap-performance-schedule-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePledgeSwapPerformanceScheduleCheck[];
  blockers: string[];
}

export interface MoralTradePledgeSwapPerformanceScheduleContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  synchronizationRule: string;
  nonPunitiveBreachRule: string;
  reciprocalReleaseRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradePledgeSwapPerformanceScheduleTransition;
    requiresScheduleRecords: boolean;
    requiresLockedSchedule: boolean;
    requiresSynchronizedStart: boolean;
    requiresReciprocalRelease: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradePledgeSwapPerformanceScheduleEvaluation[];
  contractTests: string[];
}

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_pledge_swap_performance_schedules",
  "moral_trade_pledge_swap_performance_schedule_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "pledge_swap_performance",
  "breach_remedy",
  "evidence_standard",
  "time_authority",
  "notification",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "pledge_swap_synchronized_performance_test",
] as const;

const CONTRACT_TESTS = [
  "pledge_swap_performance_schedule_contract_validator",
  "pledge_swap_synchronized_performance_test",
  "pledge_swap_nonpunitive_breach_test",
  "pledge_swap_reciprocal_release_test",
  "pledge_swap_performance_schedule_route_contract",
  "pledge_swap_performance_schedule_schema_contract",
] as const;

const LOCK_READY_STATES = new Set<MoralTradePledgeSwapPerformanceScheduleState>([
  "previewed",
  "locked",
  "active",
  "suspended",
  "completed",
  "released",
]);

const PERFORMANCE_READY_STATES = new Set<MoralTradePledgeSwapPerformanceScheduleState>([
  "locked",
  "active",
  "suspended",
  "completed",
  "released",
]);

const COMPLETION_READY_STATES = new Set<MoralTradePledgeSwapPerformanceScheduleState>([
  "completed",
  "released",
]);

const BLOCKING_STATES = new Set<MoralTradePledgeSwapPerformanceScheduleState>([
  "disputed",
  "superseded",
]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresScheduleRecords: false,
    requiresLockedSchedule: false,
    requiresSynchronizedStart: false,
    requiresReciprocalRelease: false,
    userFacingBlockerCategory: "Draft preview may show performance terms without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Lock requires synchronized start, checkpoint, cure, evidence, and reciprocal-release terms",
  },
  {
    key: "performance_start",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Performance cannot begin until both sides' schedule duties are locked",
  },
  {
    key: "checkpoint_evidence",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Checkpoint evidence requires frozen evidence due dates and suspension terms",
  },
  {
    key: "performance_release",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Performance release requires completed schedule and reciprocal release handling",
  },
  {
    key: "breach_remedy",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Breach remedy requires pre-agreed, proportionate, non-punitive cure and suspension terms",
  },
  {
    key: "reciprocal_release",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Future obligations cannot be released without a reciprocal release trigger",
  },
  {
    key: "public_metric_publication",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Public metrics cannot expose punitive breach labels or unsynchronized duties",
  },
  {
    key: "release_gate_promotion",
    requiresScheduleRecords: true,
    requiresLockedSchedule: true,
    requiresSynchronizedStart: true,
    requiresReciprocalRelease: true,
    userFacingBlockerCategory: "Release promotion requires the synchronized performance release-gate hook to pass",
  },
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  if (!hasText(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasStructuredSchedule(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function transitionContract(transition: MoralTradePledgeSwapPerformanceScheduleTransition) {
  return (
    TRANSITIONS.find((entry) => entry.key === transition) ||
    TRANSITIONS[0]
  );
}

function evaluateSchedule(
  schedule: MoralTradePledgeSwapPerformanceScheduleRecord,
  transition: MoralTradePledgeSwapPerformanceScheduleTransition,
) {
  const blockers: string[] = [];
  const scheduleId = hasText(schedule.recordId) ? schedule.recordId : "unknown-schedule";

  if (!hasText(schedule.recordId)) blockers.push("pledge_swap_performance_schedule_id_missing");
  if (!hasText(schedule.pledgeSwapOfferId) && !hasText(schedule.matchedTradeLockProposalRef) && !hasText(schedule.clearedTradeAgreementRef)) {
    blockers.push(`pledge_swap_performance_schedule_subject_ref_missing:${scheduleId}`);
  }
  if (!hasText(schedule.performanceSchedulePolicyRef)) {
    blockers.push(`pledge_swap_performance_schedule_policy_missing:${scheduleId}`);
  }
  if (!isIsoDate(schedule.performanceStartAt) || !isIsoDate(schedule.performanceEndAt)) {
    blockers.push(`pledge_swap_performance_schedule_window_invalid:${scheduleId}`);
  } else if (Date.parse(schedule.performanceStartAt) >= Date.parse(schedule.performanceEndAt)) {
    blockers.push(`pledge_swap_performance_schedule_window_order_invalid:${scheduleId}`);
  }
  if (!hasStructuredSchedule(schedule.checkpointSchedule)) {
    blockers.push(`pledge_swap_performance_schedule_checkpoints_missing:${scheduleId}`);
  }
  if (!schedule.synchronizedStartRequired) {
    blockers.push(`pledge_swap_performance_schedule_synchronized_start_missing:${scheduleId}`);
  }
  if (!hasText(schedule.counterpartNonperformanceSuspensionRule)) {
    blockers.push(`pledge_swap_performance_schedule_suspension_rule_missing:${scheduleId}`);
  }
  if (!hasText(schedule.reciprocalReleaseTrigger)) {
    blockers.push(`pledge_swap_performance_schedule_reciprocal_release_missing:${scheduleId}`);
  }
  if (!isNonNegativeInteger(schedule.graceOrCurePeriodDays)) {
    blockers.push(`pledge_swap_performance_schedule_cure_period_invalid:${scheduleId}`);
  }
  if (!hasStructuredSchedule(schedule.evidenceDueSchedule)) {
    blockers.push(`pledge_swap_performance_schedule_evidence_due_schedule_missing:${scheduleId}`);
  }
  if (schedule.publicBreachDisclosureAllowed) {
    blockers.push(`pledge_swap_performance_schedule_public_breach_disclosure_blocking:${scheduleId}`);
  }
  if (!hasText(schedule.breachRemedyPolicyRef)) {
    blockers.push(`pledge_swap_performance_schedule_breach_remedy_policy_missing:${scheduleId}`);
  }
  if (BLOCKING_STATES.has(schedule.scheduleState)) {
    blockers.push(`pledge_swap_performance_schedule_state_blocking:${scheduleId}:${schedule.scheduleState}`);
  }
  if (transition !== "draft_preview" && !LOCK_READY_STATES.has(schedule.scheduleState)) {
    blockers.push(`pledge_swap_performance_schedule_not_locked:${scheduleId}:${schedule.scheduleState}`);
  }
  if (
    ["performance_start", "checkpoint_evidence", "breach_remedy"].includes(transition) &&
    !PERFORMANCE_READY_STATES.has(schedule.scheduleState)
  ) {
    blockers.push(`pledge_swap_performance_schedule_not_performance_ready:${scheduleId}:${schedule.scheduleState}`);
  }
  if (
    ["performance_release", "reciprocal_release", "public_metric_publication"].includes(transition) &&
    !COMPLETION_READY_STATES.has(schedule.scheduleState)
  ) {
    blockers.push(`pledge_swap_performance_schedule_not_completion_ready:${scheduleId}:${schedule.scheduleState}`);
  }
  if (!hasText(schedule.reviewerDecisionRef)) {
    blockers.push(`pledge_swap_performance_schedule_reviewer_decision_missing:${scheduleId}`);
  }
  if (!isIsoDate(schedule.createdAt) || !isIsoDate(schedule.updatedAt)) {
    blockers.push(`pledge_swap_performance_schedule_timestamp_invalid:${scheduleId}`);
  }

  return blockers;
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("synchronized") || blocker.includes("not_locked")) {
    return "Pledge-swap duties are not synchronized and locked";
  }
  if (blocker.includes("checkpoint") || blocker.includes("evidence_due")) {
    return "Checkpoint or evidence schedule is missing";
  }
  if (blocker.includes("reciprocal_release")) {
    return "Reciprocal release trigger is missing";
  }
  if (blocker.includes("public_breach") || blocker.includes("breach_remedy")) {
    return "Breach consequences must be pre-agreed and non-punitive";
  }
  if (blocker.includes("window") || blocker.includes("cure")) {
    return "Performance window or cure period is invalid";
  }
  if (blocker.includes("reviewer")) {
    return "Reviewer approval is missing";
  }

  return "Pledge-swap performance schedule is incomplete";
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function sampleInput(
  overrides: Partial<MoralTradePledgeSwapPerformanceScheduleEvaluationInput> = {},
): MoralTradePledgeSwapPerformanceScheduleEvaluationInput {
  const schedule: MoralTradePledgeSwapPerformanceScheduleRecord = {
    breachRemedyPolicyRef: "policy:breach-remedy:v1",
    checkpointSchedule: [
      { checkpoint: "week-1", dueAt: "2026-06-20T00:00:00.000Z" },
      { checkpoint: "week-2", dueAt: "2026-06-27T00:00:00.000Z" },
    ],
    counterpartNonperformanceSuspensionRule:
      "Future duties suspend after a missed checkpoint until cure or reciprocal release.",
    createdAt: "2026-06-13T00:00:00.000Z",
    clearedTradeAgreementRef: null,
    evidenceDueSchedule: [
      { checkpoint: "week-1", evidenceDueAt: "2026-06-21T00:00:00.000Z" },
      { checkpoint: "week-2", evidenceDueAt: "2026-06-28T00:00:00.000Z" },
    ],
    graceOrCurePeriodDays: 3,
    matchedTradeLockProposalRef: "matched-lock:demo",
    performanceEndAt: "2026-07-13T00:00:00.000Z",
    performanceSchedulePolicyRef: "policy:pledge-swap-performance:v1",
    performanceStartAt: "2026-06-13T00:00:00.000Z",
    pledgeSwapOfferId: "pledge-swap:demo",
    publicBreachDisclosureAllowed: false,
    reciprocalReleaseTrigger:
      "Completion, mutual release, uncured counterparty nonperformance, or neutral review decision.",
    recordId: "pledge-swap-performance-schedule:demo",
    reviewerDecisionRef: "review:performance-schedule",
    scheduleState: "locked",
    synchronizedStartRequired: true,
    updatedAt: "2026-06-13T00:00:00.000Z",
  };

  return {
    checkedAt: "2026-06-13T00:00:00.000Z",
    performanceScheduleRequired: true,
    schedules: [schedule],
    transition: "matched_trade_lock",
    ...overrides,
  };
}

export function evaluateMoralTradePledgeSwapPerformanceSchedules(
  input: MoralTradePledgeSwapPerformanceScheduleEvaluationInput,
): MoralTradePledgeSwapPerformanceScheduleEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const transition = input.transition || "draft_preview";
  const transitionRules = transitionContract(transition);
  const blockers: string[] = [];

  if (input.performanceScheduleRequired && input.schedules.length === 0) {
    blockers.push("pledge_swap_performance_schedule_records_missing");
  }
  if (
    transitionRules.requiresScheduleRecords &&
    input.performanceScheduleRequired &&
    input.schedules.length === 0
  ) {
    blockers.push(`pledge_swap_performance_schedule_required_for_transition:${transition}`);
  }

  let nonBlockingScheduleCount = 0;
  for (const schedule of input.schedules) {
    const scheduleBlockers = evaluateSchedule(schedule, transition);
    blockers.push(...scheduleBlockers);
    if (scheduleBlockers.length === 0) {
      nonBlockingScheduleCount += 1;
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    blockers: uniqueBlockers,
    checkedAt,
    nonBlockingScheduleCount,
    performanceScheduleRequired: input.performanceScheduleRequired,
    reciprocalReleaseScheduleCount: input.schedules.filter((schedule) =>
      hasText(schedule.reciprocalReleaseTrigger),
    ).length,
    scheduleCount: input.schedules.length,
    status: uniqueBlockers.length === 0 ? "pass" : "blocked",
    synchronizedScheduleCount: input.schedules.filter(
      (schedule) => schedule.synchronizedStartRequired,
    ).length,
    transition,
    userFacingBlockerCategories: unique(uniqueBlockers.map(categoryForBlocker)),
  };
}

export function getMoralTradePledgeSwapPerformanceScheduleContract(): MoralTradePledgeSwapPerformanceScheduleContract {
  const passingSample = evaluateMoralTradePledgeSwapPerformanceSchedules(sampleInput());
  const blockedSample = evaluateMoralTradePledgeSwapPerformanceSchedules(
    sampleInput({
      schedules: [
        {
          ...sampleInput().schedules[0],
          publicBreachDisclosureAllowed: true,
          reciprocalReleaseTrigger: "",
          scheduleState: "active",
          synchronizedStartRequired: false,
        },
      ],
      transition: "public_metric_publication",
    }),
  );

  return {
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "MoralTrade cannot lock, start, checkpoint, release, apply breach remedies, publish public metrics, or promote release gates for a continuing pledge swap unless a first-class performance schedule freezes start/end, checkpoints, evidence due dates, cure rules, suspension behavior, reciprocal release, and reviewer approval.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    nonPunitiveBreachRule:
      "Breach consequences must be pre-agreed, proportionate, and non-punitive; public shaming, moral reputation penalties, and public breach labels stay blocked unless separately approved for a later release stage.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    purpose:
      "Fail-closed pledge-swap performance-schedule contract for synchronized continuing duties, checkpoint evidence, cure/suspension terms, and reciprocal release.",
    reciprocalReleaseRule:
      "A continuing pledge swap must state when future obligations are suspended, cured, completed, or reciprocally released before either side can rely on later performance.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    sampleEvaluations: [passingSample, blockedSample],
    synchronizationRule:
      "Both sides' duties must use a frozen schedule with synchronized start requirements and checkpoint/evidence timing; one side cannot be induced into irreversible ongoing performance while reciprocal duties are not locked.",
    transitions: [...TRANSITIONS],
    version: MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradePledgeSwapPerformanceScheduleCheck {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradePledgeSwapPerformanceScheduleContract(
  contract = getMoralTradePledgeSwapPerformanceScheduleContract(),
): MoralTradePledgeSwapPerformanceScheduleValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Contract names pledge-swap performance schedule and enforcement tables",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Contract names schedule, breach, evidence, time, and notification policy subjects",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hook",
      "Contract exposes moraltrade68 synchronized pledge-swap performance hook",
      RELEASE_GATE_TEST_HOOKS.every((hook) =>
        contract.releaseGateTestHooks.includes(hook),
      ),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract covers lock, start, checkpoint, release, breach, reciprocal release, metrics, and promotion",
      [
        "matched_trade_lock",
        "performance_start",
        "checkpoint_evidence",
        "performance_release",
        "breach_remedy",
        "reciprocal_release",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((key) => contract.transitions.some((transition) => transition.key === key)),
      contract.transitions.map((transition) => transition.key).join(", "),
    ),
    check(
      "synchronization-rule",
      "Contract states reciprocal duties must be synchronized before reliance",
      /synchronized/i.test(contract.synchronizationRule) &&
        /reciprocal duties/i.test(contract.synchronizationRule),
      contract.synchronizationRule,
    ),
    check(
      "nonpunitive-breach-rule",
      "Contract blocks public shaming, reputation penalties, and unapproved public breach labels",
      /public shaming/i.test(contract.nonPunitiveBreachRule) &&
        /moral reputation/i.test(contract.nonPunitiveBreachRule) &&
        /public breach labels/i.test(contract.nonPunitiveBreachRule),
      contract.nonPunitiveBreachRule,
    ),
    check(
      "reciprocal-release-rule",
      "Contract requires future-obligation suspension, cure, completion, or reciprocal release terms",
      /suspended/i.test(contract.reciprocalReleaseRule) &&
        /cured/i.test(contract.reciprocalReleaseRule) &&
        /reciprocally released/i.test(contract.reciprocalReleaseRule),
      contract.reciprocalReleaseRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked performance-schedule paths",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations.map((sample) => sample.status).join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-pledge-swap-performance-schedule-contract",
    validatorVersion: MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_VALIDATOR_VERSION,
  };
}
