export const MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_CONTRACT_VERSION =
  "moral-trade-behavioral-micro-pledges-v0.1-2026-06";
export const MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_VALIDATOR_VERSION =
  "moral-trade-behavioral-micro-pledge-validator-v0.1";

export type MoralTradeBehavioralMicroPledgeTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "performance_start"
  | "unit_evidence_acceptance"
  | "completion_count"
  | "payment_capture"
  | "sequence_extension"
  | "public_receipt_publication"
  | "release_gate_promotion";

export type MoralTradeBehavioralMicroPledgeUnitGranularity =
  | "one_meal"
  | "few_meals"
  | "one_day"
  | "few_days"
  | "thirty_days"
  | "month_long"
  | "open_ended"
  | "custom_long_duration";

export type MoralTradeBehavioralMicroPledgeBehaviorKind =
  | "food_abstention"
  | "other_low_stakes_behavior";

export type MoralTradeBehavioralMicroPledgeUnitState =
  | "draft"
  | "previewed"
  | "locked"
  | "active"
  | "completed"
  | "manual_review"
  | "blocked"
  | "superseded";

export type MoralTradeBehavioralMicroPledgeReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocking"
  | "manual_review_required";

export type MoralTradeBehavioralMicroPledgeEvidenceStep =
  | "self_attestation"
  | "lightweight_corroboration"
  | "artifact_review"
  | "manual_review";

export type MoralTradeBehavioralMicroPledgeBurdenLevel = "low" | "medium" | "high";

export type MoralTradeBehavioralMicroPledgeSettlementMode =
  | "per_unit"
  | "all_or_nothing";

export interface MoralTradeBehavioralMicroPledgeEvidenceLadderStep {
  step: MoralTradeBehavioralMicroPledgeEvidenceStep;
  label: string;
  requiredBeforeCompletion: boolean;
  privacyBurden: MoralTradeBehavioralMicroPledgeBurdenLevel;
  evidenceBurden: MoralTradeBehavioralMicroPledgeBurdenLevel;
}

export interface MoralTradeBehavioralMicroPledgeHealthSafetyBoundary {
  reviewState: MoralTradeBehavioralMicroPledgeReviewState;
  fastingBlocked: boolean;
  weightLossBlocked: boolean;
  calorieRestrictionBlocked: boolean;
  medicalDietBlocked: boolean;
  bodyImageBlocked: boolean;
  eatingDisorderAdjacentBlocked: boolean;
  minorDependencyCoercionBlocked: boolean;
  highBurdenVariantBlocked: boolean;
  autonomyPolicyRef: string;
  healthSafetyPolicyRef: string;
}

export interface MoralTradeBehavioralMicroPledgeSettlementDisclosure {
  settlementMode: MoralTradeBehavioralMicroPledgeSettlementMode;
  failedUnitEffect: string;
  evidenceCheckpointRefs: string[];
  renewedConfirmationRequired: boolean;
  releaseCancellationRule: string;
  disclosedBeforeFinalConfirmation: boolean;
}

export interface MoralTradeBehavioralMicroPledgeSequenceCaps {
  sequenceId: string;
  sequenceCapCents: number;
  rollingWindowDays: number;
  cumulativeUnitCap: number;
  evidenceBurdenCap: MoralTradeBehavioralMicroPledgeBurdenLevel;
  privacyBurdenCap: MoralTradeBehavioralMicroPledgeBurdenLevel;
  noAutoRenewal: boolean;
  extensionRequiresRenewedConfirmation: boolean;
  capExceedanceRoutesToManualReview: boolean;
}

export interface MoralTradeBehavioralMicroPledgeUnitRecord {
  recordId: string;
  behaviorKind: MoralTradeBehavioralMicroPledgeBehaviorKind;
  pledgeSwapOfferId: string | null;
  matchedTradeLockProposalRef: string | null;
  unitGranularity: MoralTradeBehavioralMicroPledgeUnitGranularity;
  defaultTemplate: boolean;
  coveredWindowStartAt: string;
  coveredWindowEndAt: string;
  lockedAt: string | null;
  serverTimeAuthorityRef: string;
  noTradeBaselineRef: string | null;
  additionalityReviewState: MoralTradeBehavioralMicroPledgeReviewState;
  coveredFoodDefinition: string | null;
  adequateSubstitutePlanRef: string | null;
  evidenceLadder: MoralTradeBehavioralMicroPledgeEvidenceLadderStep[];
  evidenceEscalationTriggers: string[];
  leastIntrusiveEvidencePlanRef: string | null;
  perUnitCapCents: number;
  performanceBondCapCents: number | null;
  personalCashManualReviewRequired: boolean;
  sequenceCaps: MoralTradeBehavioralMicroPledgeSequenceCaps;
  settlementDisclosure: MoralTradeBehavioralMicroPledgeSettlementDisclosure;
  healthSafetyBoundary: MoralTradeBehavioralMicroPledgeHealthSafetyBoundary | null;
  previewDisclosures: string[];
  retroactiveClaimRouting: "manual_review_or_personal_bookkeeping" | "completed_moral_trade";
  manualReviewExceptionRef: string | null;
  unitState: MoralTradeBehavioralMicroPledgeUnitState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeBehavioralMicroPledgeEvaluationInput {
  transition: MoralTradeBehavioralMicroPledgeTransition;
  checkedAt?: string;
  microPledgeRequired: boolean;
  units: MoralTradeBehavioralMicroPledgeUnitRecord[];
}

export interface MoralTradeBehavioralMicroPledgeEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeBehavioralMicroPledgeTransition;
  checkedAt: string;
  unitCount: number;
  nonBlockingUnitCount: number;
  prePerformanceLockedUnitCount: number;
  defaultSafeUnitCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeBehavioralMicroPledgeContract {
  version: typeof MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  defaultGranularityRule: string;
  prePerformanceLockRule: string;
  unitBaselineRule: string;
  evidenceLadderRule: string;
  sequenceCapRule: string;
  healthSafetyRule: string;
  settlementDisclosureRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  defaultUnitGranularities: MoralTradeBehavioralMicroPledgeUnitGranularity[];
  manualReviewOnlyGranularities: MoralTradeBehavioralMicroPledgeUnitGranularity[];
  defaultCaps: {
    maxPerUnitCapCents: number;
    maxSequenceCapCents: number;
    maxRollingWindowDays: number;
    maxCumulativeUnitCap: number;
  };
  transitions: {
    key: MoralTradeBehavioralMicroPledgeTransition;
    requiresUnitRecord: boolean;
    requiresPrePerformanceLock: boolean;
    requiresUnitBaseline: boolean;
    requiresNonBlockingHealthSafety: boolean;
    requiresCompletionReadyUnit: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradeBehavioralMicroPledgeEvaluation[];
  contractTests: string[];
}

export interface MoralTradeBehavioralMicroPledgeValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-behavioral-micro-pledge-contract";
  validatorVersion: typeof MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const MAX_PER_UNIT_CAP_CENTS = 2500;
const MAX_SEQUENCE_CAP_CENTS = 10000;
const MAX_ROLLING_WINDOW_DAYS = 7;
const MAX_CUMULATIVE_UNIT_CAP = 7;

const DEFAULT_UNIT_GRANULARITIES: MoralTradeBehavioralMicroPledgeUnitGranularity[] = [
  "one_meal",
  "few_meals",
  "one_day",
  "few_days",
];

const MANUAL_REVIEW_ONLY_GRANULARITIES: MoralTradeBehavioralMicroPledgeUnitGranularity[] = [
  "thirty_days",
  "month_long",
  "open_ended",
  "custom_long_duration",
];

const REQUIRED_PREVIEW_DISCLOSURES = [
  "unit_granularity",
  "duration",
  "covered_food_or_action",
  "adequate_substitute",
  "no_trade_baseline",
  "additionality_review",
  "evidence_ladder",
  "per_unit_cap",
  "sequence_cap",
  "settlement_mode",
  "failed_unit_effect",
  "renewed_confirmation",
  "no_auto_rollover",
  "health_safety_boundary",
  "privacy_burden",
] as const;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_behavioral_micro_pledge_units",
  "moral_trade_behavioral_micro_pledge_sequences",
  "moral_trade_behavioral_micro_pledge_evidence_ladders",
  "moral_trade_food_abstention_health_safety_reviews",
  "moral_trade_behavioral_micro_pledge_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "behavioral_micro_pledge_duration",
  "micro_pledge_preperformance_lock",
  "food_abstention_health_safety",
  "micro_pledge_evidence_ladder",
  "micro_pledge_settlement",
  "privacy_preserving_verification",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "behavioral_micro_pledge_duration_test",
  "behavioral_micro_pledge_evidence_ladder_test",
  "behavioral_micro_pledge_unit_baseline_test",
  "micro_pledge_sequence_cumulative_cap_test",
  "food_abstention_health_safety_boundary_test",
  "behavioral_micro_pledge_low_stakes_cap_test",
  "micro_pledge_unit_settlement_test",
  "micro_pledge_preperformance_lock_test",
] as const;

const CONTRACT_TESTS = [
  "behavioral_micro_pledge_contract_validator",
  "behavioral_micro_pledge_default_duration_test",
  "behavioral_micro_pledge_preperformance_lock_test",
  "behavioral_micro_pledge_health_safety_test",
  "behavioral_micro_pledge_caps_and_settlement_test",
  "behavioral_micro_pledge_contract_route",
] as const;

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresUnitRecord: false,
    requiresPrePerformanceLock: false,
    requiresUnitBaseline: false,
    requiresNonBlockingHealthSafety: false,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory: "Draft previews may explain micro-pledges before reliance",
  },
  {
    key: "matched_trade_lock",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Lock requires a future micro-pledge unit, baseline, caps, substitute, and health-safety boundary",
  },
  {
    key: "performance_start",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Performance cannot start unless the covered window was locked before it began",
  },
  {
    key: "unit_evidence_acceptance",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Evidence acceptance requires a least-intrusive ladder and pre-performance unit lock",
  },
  {
    key: "completion_count",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: true,
    userFacingBlockerCategory:
      "Completion count requires a completed unit with baseline, substitute, caps, and future lock",
  },
  {
    key: "payment_capture",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Payment capture requires the micro-pledge caps and settlement terms to be disclosed",
  },
  {
    key: "sequence_extension",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Sequence extension requires renewed confirmation and manual review above frozen caps",
  },
  {
    key: "public_receipt_publication",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: true,
    userFacingBlockerCategory:
      "Public receipt publication cannot expose retroactive or unsafe personal-behavior claims",
  },
  {
    key: "release_gate_promotion",
    requiresUnitRecord: true,
    requiresPrePerformanceLock: true,
    requiresUnitBaseline: true,
    requiresNonBlockingHealthSafety: true,
    requiresCompletionReadyUnit: false,
    userFacingBlockerCategory:
      "Release promotion requires all behavioral micro-pledge gate hooks to pass",
  },
] as const;

const LOCK_READY_STATES = new Set<MoralTradeBehavioralMicroPledgeUnitState>([
  "locked",
  "active",
  "completed",
]);

const COMPLETION_READY_STATES = new Set<MoralTradeBehavioralMicroPledgeUnitState>([
  "completed",
]);

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function daysBetween(startAt: string, endAt: string) {
  return (Date.parse(endAt) - Date.parse(startAt)) / (24 * 60 * 60 * 1000);
}

function transitionContract(transition: MoralTradeBehavioralMicroPledgeTransition) {
  return TRANSITIONS.find((entry) => entry.key === transition) || TRANSITIONS[0];
}

function hasAll(actual: readonly string[], required: readonly string[]) {
  return required.every((entry) => actual.includes(entry));
}

function isDefaultGranularity(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  return DEFAULT_UNIT_GRANULARITIES.includes(unit.unitGranularity);
}

function isManualOnlyGranularity(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  return MANUAL_REVIEW_ONLY_GRANULARITIES.includes(unit.unitGranularity);
}

function isNonBlockingReview(state: MoralTradeBehavioralMicroPledgeReviewState) {
  return state === "not_required" || state === "non_blocking";
}

function validateHealthSafetyBoundary(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  const blockers: string[] = [];
  const unitId = hasText(unit.recordId) ? unit.recordId : "unknown-unit";

  if (unit.behaviorKind !== "food_abstention") {
    return blockers;
  }

  if (!unit.healthSafetyBoundary) {
    return [`micro_pledge_health_safety_boundary_missing:${unitId}`];
  }

  const boundary = unit.healthSafetyBoundary;
  if (boundary.reviewState !== "non_blocking") {
    blockers.push(`micro_pledge_health_safety_review_blocking:${unitId}:${boundary.reviewState}`);
  }
  if (!boundary.fastingBlocked) blockers.push(`micro_pledge_fasting_variant_not_blocked:${unitId}`);
  if (!boundary.weightLossBlocked) blockers.push(`micro_pledge_weight_loss_variant_not_blocked:${unitId}`);
  if (!boundary.calorieRestrictionBlocked) {
    blockers.push(`micro_pledge_calorie_restriction_variant_not_blocked:${unitId}`);
  }
  if (!boundary.medicalDietBlocked) blockers.push(`micro_pledge_medical_diet_variant_not_blocked:${unitId}`);
  if (!boundary.bodyImageBlocked) blockers.push(`micro_pledge_body_image_variant_not_blocked:${unitId}`);
  if (!boundary.eatingDisorderAdjacentBlocked) {
    blockers.push(`micro_pledge_eating_disorder_adjacent_variant_not_blocked:${unitId}`);
  }
  if (!boundary.minorDependencyCoercionBlocked) {
    blockers.push(`micro_pledge_minor_dependency_coercion_variant_not_blocked:${unitId}`);
  }
  if (!boundary.highBurdenVariantBlocked) {
    blockers.push(`micro_pledge_high_burden_variant_not_blocked:${unitId}`);
  }
  if (!hasText(boundary.autonomyPolicyRef) || !hasText(boundary.healthSafetyPolicyRef)) {
    blockers.push(`micro_pledge_health_safety_policy_missing:${unitId}`);
  }

  return blockers;
}

function validateEvidenceLadder(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  const blockers: string[] = [];
  const unitId = hasText(unit.recordId) ? unit.recordId : "unknown-unit";

  if (unit.evidenceLadder.length === 0) {
    return [`micro_pledge_evidence_ladder_missing:${unitId}`];
  }

  const [firstStep] = unit.evidenceLadder;
  if (!firstStep || firstStep.step !== "self_attestation") {
    blockers.push(`micro_pledge_self_attestation_not_first:${unitId}`);
  }
  if (firstStep && (firstStep.privacyBurden !== "low" || firstStep.evidenceBurden !== "low")) {
    blockers.push(`micro_pledge_first_evidence_step_not_low_burden:${unitId}`);
  }
  if (unit.evidenceEscalationTriggers.length === 0) {
    blockers.push(`micro_pledge_evidence_escalation_triggers_missing:${unitId}`);
  }
  if (!hasText(unit.leastIntrusiveEvidencePlanRef)) {
    blockers.push(`micro_pledge_least_intrusive_evidence_plan_missing:${unitId}`);
  }
  if (
    unit.evidenceLadder.some(
      (step) =>
        step.requiredBeforeCompletion &&
        (step.privacyBurden === "high" || step.evidenceBurden === "high"),
    )
  ) {
    blockers.push(`micro_pledge_high_burden_required_evidence:${unitId}`);
  }

  return blockers;
}

function validateSequenceCaps(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  const blockers: string[] = [];
  const unitId = hasText(unit.recordId) ? unit.recordId : "unknown-unit";
  const caps = unit.sequenceCaps;

  if (!hasText(caps.sequenceId)) blockers.push(`micro_pledge_sequence_id_missing:${unitId}`);
  if (!isNonNegativeInteger(unit.perUnitCapCents) || unit.perUnitCapCents > MAX_PER_UNIT_CAP_CENTS) {
    blockers.push(`micro_pledge_per_unit_cap_exceeded:${unitId}`);
  }
  if (
    !isNonNegativeInteger(caps.sequenceCapCents) ||
    caps.sequenceCapCents > MAX_SEQUENCE_CAP_CENTS
  ) {
    blockers.push(`micro_pledge_sequence_cap_exceeded:${unitId}`);
  }
  if (
    !isNonNegativeInteger(caps.rollingWindowDays) ||
    caps.rollingWindowDays > MAX_ROLLING_WINDOW_DAYS
  ) {
    blockers.push(`micro_pledge_rolling_window_cap_exceeded:${unitId}`);
  }
  if (
    !isNonNegativeInteger(caps.cumulativeUnitCap) ||
    caps.cumulativeUnitCap > MAX_CUMULATIVE_UNIT_CAP
  ) {
    blockers.push(`micro_pledge_cumulative_unit_cap_exceeded:${unitId}`);
  }
  if (caps.evidenceBurdenCap === "high" || caps.privacyBurdenCap === "high") {
    blockers.push(`micro_pledge_burden_cap_too_high:${unitId}`);
  }
  if (!caps.noAutoRenewal) blockers.push(`micro_pledge_auto_renewal_allowed:${unitId}`);
  if (!caps.extensionRequiresRenewedConfirmation) {
    blockers.push(`micro_pledge_extension_renewed_confirmation_missing:${unitId}`);
  }
  if (!caps.capExceedanceRoutesToManualReview) {
    blockers.push(`micro_pledge_cap_exceedance_manual_review_missing:${unitId}`);
  }
  if (unit.performanceBondCapCents !== null && unit.performanceBondCapCents > MAX_SEQUENCE_CAP_CENTS) {
    blockers.push(`micro_pledge_performance_bond_cap_exceeded:${unitId}`);
  }
  if (!unit.personalCashManualReviewRequired) {
    blockers.push(`micro_pledge_personal_cash_manual_review_missing:${unitId}`);
  }

  return blockers;
}

function validateSettlementDisclosure(unit: MoralTradeBehavioralMicroPledgeUnitRecord) {
  const blockers: string[] = [];
  const unitId = hasText(unit.recordId) ? unit.recordId : "unknown-unit";
  const settlement = unit.settlementDisclosure;

  if (!hasText(settlement.failedUnitEffect)) {
    blockers.push(`micro_pledge_failed_unit_effect_missing:${unitId}`);
  }
  if (settlement.evidenceCheckpointRefs.length === 0) {
    blockers.push(`micro_pledge_evidence_checkpoints_missing:${unitId}`);
  }
  if (!settlement.renewedConfirmationRequired) {
    blockers.push(`micro_pledge_settlement_renewed_confirmation_missing:${unitId}`);
  }
  if (!hasText(settlement.releaseCancellationRule)) {
    blockers.push(`micro_pledge_release_cancellation_rule_missing:${unitId}`);
  }
  if (!settlement.disclosedBeforeFinalConfirmation) {
    blockers.push(`micro_pledge_settlement_not_disclosed_before_confirmation:${unitId}`);
  }

  return blockers;
}

function evaluateUnit(
  unit: MoralTradeBehavioralMicroPledgeUnitRecord,
  transition: MoralTradeBehavioralMicroPledgeTransition,
) {
  const transitionRules = transitionContract(transition);
  const blockers: string[] = [];
  const unitId = hasText(unit.recordId) ? unit.recordId : "unknown-unit";

  if (!hasText(unit.recordId)) blockers.push("micro_pledge_unit_id_missing");
  if (!hasText(unit.pledgeSwapOfferId) && !hasText(unit.matchedTradeLockProposalRef)) {
    blockers.push(`micro_pledge_subject_ref_missing:${unitId}`);
  }
  if (!isIsoDate(unit.coveredWindowStartAt) || !isIsoDate(unit.coveredWindowEndAt)) {
    blockers.push(`micro_pledge_window_invalid:${unitId}`);
  } else if (Date.parse(unit.coveredWindowStartAt) >= Date.parse(unit.coveredWindowEndAt)) {
    blockers.push(`micro_pledge_window_order_invalid:${unitId}`);
  } else if (isDefaultGranularity(unit) && daysBetween(unit.coveredWindowStartAt, unit.coveredWindowEndAt) > MAX_ROLLING_WINDOW_DAYS) {
    blockers.push(`micro_pledge_default_window_too_long:${unitId}`);
  }

  if (unit.defaultTemplate && !isDefaultGranularity(unit)) {
    blockers.push(`micro_pledge_long_duration_default_template:${unitId}:${unit.unitGranularity}`);
  }
  if (isManualOnlyGranularity(unit) && !hasText(unit.manualReviewExceptionRef)) {
    blockers.push(`micro_pledge_long_duration_manual_review_missing:${unitId}:${unit.unitGranularity}`);
  }
  if (transitionRules.requiresPrePerformanceLock) {
    if (!isIsoDate(unit.lockedAt) || !isIsoDate(unit.coveredWindowStartAt)) {
      blockers.push(`micro_pledge_preperformance_lock_missing:${unitId}`);
    } else if (Date.parse(unit.lockedAt) >= Date.parse(unit.coveredWindowStartAt)) {
      blockers.push(`micro_pledge_preperformance_lock_late:${unitId}`);
    }
  }
  if (unit.retroactiveClaimRouting !== "manual_review_or_personal_bookkeeping") {
    blockers.push(`micro_pledge_retroactive_claim_can_complete_trade:${unitId}`);
  }
  if (transition !== "draft_preview" && !LOCK_READY_STATES.has(unit.unitState)) {
    blockers.push(`micro_pledge_unit_not_lock_ready:${unitId}:${unit.unitState}`);
  }
  if (transitionRules.requiresCompletionReadyUnit && !COMPLETION_READY_STATES.has(unit.unitState)) {
    blockers.push(`micro_pledge_unit_not_completion_ready:${unitId}:${unit.unitState}`);
  }
  if (transitionRules.requiresUnitBaseline) {
    if (!hasText(unit.noTradeBaselineRef)) blockers.push(`micro_pledge_unit_baseline_missing:${unitId}`);
    if (unit.additionalityReviewState !== "non_blocking") {
      blockers.push(`micro_pledge_unit_additionality_not_non_blocking:${unitId}:${unit.additionalityReviewState}`);
    }
    if (unit.behaviorKind === "food_abstention" && !hasText(unit.coveredFoodDefinition)) {
      blockers.push(`micro_pledge_covered_food_definition_missing:${unitId}`);
    }
    if (!hasText(unit.adequateSubstitutePlanRef)) {
      blockers.push(`micro_pledge_adequate_substitute_plan_missing:${unitId}`);
    }
  }

  blockers.push(...validateEvidenceLadder(unit));
  blockers.push(...validateSequenceCaps(unit));
  blockers.push(...validateSettlementDisclosure(unit));
  blockers.push(...validateHealthSafetyBoundary(unit));

  if (!hasAll(unit.previewDisclosures, REQUIRED_PREVIEW_DISCLOSURES)) {
    blockers.push(`micro_pledge_preview_disclosures_missing:${unitId}`);
  }
  if (!hasText(unit.reviewerDecisionRef)) {
    blockers.push(`micro_pledge_reviewer_decision_missing:${unitId}`);
  }
  if (!isIsoDate(unit.createdAt) || !isIsoDate(unit.updatedAt)) {
    blockers.push(`micro_pledge_timestamp_invalid:${unitId}`);
  }

  return blockers;
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("long_duration") || blocker.includes("window_too_long")) {
    return "Behavioral pledge duration is not a safe default";
  }
  if (blocker.includes("preperformance") || blocker.includes("retroactive")) {
    return "Covered action was not locked before the performance window";
  }
  if (blocker.includes("baseline") || blocker.includes("additionality") || blocker.includes("substitute")) {
    return "Unit-specific baseline or substitute review is incomplete";
  }
  if (blocker.includes("health") || blocker.includes("fasting") || blocker.includes("diet") || blocker.includes("coercion")) {
    return "Food-abstention health and autonomy boundary is blocking";
  }
  if (blocker.includes("evidence")) {
    return "Evidence ladder or checkpoints are incomplete";
  }
  if (blocker.includes("cap") || blocker.includes("auto_renewal") || blocker.includes("personal_cash")) {
    return "Low-stakes cap, renewal, or manual-review rule is missing";
  }
  if (blocker.includes("settlement") || blocker.includes("failed_unit") || blocker.includes("release_cancellation")) {
    return "Settlement and failed-unit effects are not disclosed";
  }
  if (blocker.includes("disclosures")) {
    return "Preview omits material micro-pledge facts";
  }

  return "Behavioral micro-pledge record is incomplete";
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function sampleUnit(
  overrides: Partial<MoralTradeBehavioralMicroPledgeUnitRecord> = {},
): MoralTradeBehavioralMicroPledgeUnitRecord {
  return {
    additionalityReviewState: "non_blocking",
    adequateSubstitutePlanRef: "substitute:balanced-meal:v1",
    behaviorKind: "food_abstention",
    coveredFoodDefinition: "One named animal-product meal category selected before lock.",
    coveredWindowEndAt: "2026-07-02T13:00:00.000Z",
    coveredWindowStartAt: "2026-07-02T12:00:00.000Z",
    createdAt: "2026-06-25T12:00:00.000Z",
    defaultTemplate: true,
    evidenceEscalationTriggers: ["counterparty_challenge", "sequence_cap_exception"],
    evidenceLadder: [
      {
        evidenceBurden: "low",
        label: "Self-attestation after the meal window",
        privacyBurden: "low",
        requiredBeforeCompletion: true,
        step: "self_attestation",
      },
      {
        evidenceBurden: "medium",
        label: "Lightweight corroboration only after a challenge or exception",
        privacyBurden: "medium",
        requiredBeforeCompletion: false,
        step: "lightweight_corroboration",
      },
    ],
    healthSafetyBoundary: {
      autonomyPolicyRef: "policy:food-abstention-autonomy:v1",
      bodyImageBlocked: true,
      calorieRestrictionBlocked: true,
      eatingDisorderAdjacentBlocked: true,
      fastingBlocked: true,
      healthSafetyPolicyRef: "policy:food-abstention-health-safety:v1",
      highBurdenVariantBlocked: true,
      medicalDietBlocked: true,
      minorDependencyCoercionBlocked: true,
      reviewState: "non_blocking",
      weightLossBlocked: true,
    },
    leastIntrusiveEvidencePlanRef: "evidence-plan:self-attestation-first:v1",
    lockedAt: "2026-07-02T11:30:00.000Z",
    manualReviewExceptionRef: null,
    matchedTradeLockProposalRef: "matched-lock:micro-pledge-demo",
    noTradeBaselineRef: "baseline:micro-pledge-unit-demo",
    perUnitCapCents: 500,
    performanceBondCapCents: null,
    personalCashManualReviewRequired: true,
    pledgeSwapOfferId: "pledge-swap:micro-pledge-demo",
    previewDisclosures: [...REQUIRED_PREVIEW_DISCLOSURES],
    recordId: "micro-pledge-unit:demo",
    retroactiveClaimRouting: "manual_review_or_personal_bookkeeping",
    reviewerDecisionRef: "review:micro-pledge-unit-demo",
    sequenceCaps: {
      capExceedanceRoutesToManualReview: true,
      cumulativeUnitCap: 4,
      evidenceBurdenCap: "medium",
      extensionRequiresRenewedConfirmation: true,
      noAutoRenewal: true,
      privacyBurdenCap: "medium",
      rollingWindowDays: 4,
      sequenceCapCents: 2000,
      sequenceId: "micro-pledge-sequence:demo",
    },
    serverTimeAuthorityRef: "time-authority:server:v1",
    settlementDisclosure: {
      disclosedBeforeFinalConfirmation: true,
      evidenceCheckpointRefs: ["checkpoint:self-attestation-after-window"],
      failedUnitEffect:
        "A failed unit cancels that unit payment and does not silently extend the sequence.",
      releaseCancellationRule:
        "Future units can be cancelled before their lock window without public blame or auto-renewal.",
      renewedConfirmationRequired: true,
      settlementMode: "per_unit",
    },
    unitGranularity: "one_meal",
    unitState: "locked",
    updatedAt: "2026-06-25T12:00:00.000Z",
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<MoralTradeBehavioralMicroPledgeEvaluationInput> = {},
): MoralTradeBehavioralMicroPledgeEvaluationInput {
  return {
    checkedAt: "2026-06-25T12:00:00.000Z",
    microPledgeRequired: true,
    transition: "matched_trade_lock",
    units: [sampleUnit()],
    ...overrides,
  };
}

export function evaluateMoralTradeBehavioralMicroPledges(
  input: MoralTradeBehavioralMicroPledgeEvaluationInput,
): MoralTradeBehavioralMicroPledgeEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const transition = input.transition || "draft_preview";
  const transitionRules = transitionContract(transition);
  const blockers: string[] = [];

  if (input.microPledgeRequired && input.units.length === 0) {
    blockers.push("micro_pledge_unit_records_missing");
  }
  if (transitionRules.requiresUnitRecord && input.microPledgeRequired && input.units.length === 0) {
    blockers.push(`micro_pledge_unit_required_for_transition:${transition}`);
  }

  let nonBlockingUnitCount = 0;
  for (const unit of input.units) {
    const unitBlockers = evaluateUnit(unit, transition);
    blockers.push(...unitBlockers);
    if (unitBlockers.length === 0) {
      nonBlockingUnitCount += 1;
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    blockers: uniqueBlockers,
    checkedAt,
    defaultSafeUnitCount: input.units.filter(
      (unit) => unit.defaultTemplate && isDefaultGranularity(unit),
    ).length,
    nonBlockingUnitCount,
    prePerformanceLockedUnitCount: input.units.filter(
      (unit) =>
        isIsoDate(unit.lockedAt) &&
        isIsoDate(unit.coveredWindowStartAt) &&
        Date.parse(unit.lockedAt) < Date.parse(unit.coveredWindowStartAt),
    ).length,
    status: uniqueBlockers.length === 0 ? "pass" : "blocked",
    transition,
    unitCount: input.units.length,
    userFacingBlockerCategories: unique(uniqueBlockers.map(categoryForBlocker)),
  };
}

export function getMoralTradeBehavioralMicroPledgeContract(): MoralTradeBehavioralMicroPledgeContract {
  const passingSample = evaluateMoralTradeBehavioralMicroPledges(sampleInput());
  const blockedSample = evaluateMoralTradeBehavioralMicroPledges(
    sampleInput({
      transition: "completion_count",
      units: [
        sampleUnit({
          additionalityReviewState: "under_review",
          adequateSubstitutePlanRef: null,
          defaultTemplate: true,
          healthSafetyBoundary: {
            ...sampleUnit().healthSafetyBoundary!,
            fastingBlocked: false,
            reviewState: "blocking",
          },
          lockedAt: "2026-07-02T12:30:00.000Z",
          noTradeBaselineRef: null,
          perUnitCapCents: 5000,
          previewDisclosures: ["unit_granularity"],
          retroactiveClaimRouting: "completed_moral_trade",
          sequenceCaps: {
            ...sampleUnit().sequenceCaps,
            noAutoRenewal: false,
            rollingWindowDays: 30,
            sequenceCapCents: 50000,
          },
          settlementDisclosure: {
            ...sampleUnit().settlementDisclosure,
            disclosedBeforeFinalConfirmation: false,
            evidenceCheckpointRefs: [],
            renewedConfirmationRequired: false,
          },
          unitGranularity: "thirty_days",
          unitState: "active",
        }),
      ],
    }),
  );

  return {
    contractTests: [...CONTRACT_TESTS],
    defaultCaps: {
      maxCumulativeUnitCap: MAX_CUMULATIVE_UNIT_CAP,
      maxPerUnitCapCents: MAX_PER_UNIT_CAP_CENTS,
      maxRollingWindowDays: MAX_ROLLING_WINDOW_DAYS,
      maxSequenceCapCents: MAX_SEQUENCE_CAP_CENTS,
    },
    defaultGranularityRule:
      "Default behavioral pledge templates are limited to one meal, a few meals, one day, or a few days; 30-day, month-long, open-ended, and custom long-duration variants require explicit manual-review exception records and cannot be default payable templates.",
    defaultUnitGranularities: [...DEFAULT_UNIT_GRANULARITIES],
    evidenceLadderRule:
      "Low-stakes behavioral micro-pledges use self-attestation first, name escalation triggers, disclose privacy and evidence burden, and block high-burden evidence as a required default.",
    failClosedRule:
      "MoralTrade cannot lock, start, accept evidence for, count completion of, capture payment for, extend, publish receipts for, or promote release gates for behavioral micro-pledges unless unit-level records prove bounded duration, future lock, unit baseline, additionality, substitute, caps, health safety, settlement, and material preview disclosures.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    healthSafetyRule:
      "Food-abstention templates block fasting, weight-loss, calorie-restriction, medical-diet, body-image, eating-disorder-adjacent, minor/dependency/coercion, and high-burden variants unless exact autonomy and health-safety reviews are non-blocking.",
    manualReviewOnlyGranularities: [...MANUAL_REVIEW_ONLY_GRANULARITIES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    prePerformanceLockRule:
      "Each covered meal, day, or few-day window must be locked under server time before the window begins; retroactive claims route to personal bookkeeping or manual review, not completed moral-trade status.",
    purpose:
      "Fail-closed behavioral micro-pledge contract for moraltrade82 food-abstention and similar low-stakes pledge swaps.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    sampleEvaluations: [passingSample, blockedSample],
    sequenceCapRule:
      "Micro-pledge sequences freeze per-unit, sequence, rolling-window, evidence-burden, and privacy-burden caps; cap exceedance requires renewed confirmation and manual review rather than auto-renewal.",
    settlementDisclosureRule:
      "Before final confirmation, each sequence discloses per-unit or all-or-nothing settlement, failed-unit effect, evidence checkpoints, renewed confirmation, and release/cancellation behavior.",
    transitions: [...TRANSITIONS],
    unitBaselineRule:
      "Each micro-pledge unit needs its own no-trade baseline, non-blocking additionality review, covered-food or covered-action definition, and adequate-substitute plan before it can count as completed moral trade.",
    version: MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
) {
  return { id, label, status: pass ? "pass" : "fail" as "pass" | "fail", evidence };
}

export function validateMoralTradeBehavioralMicroPledgeContract(
  contract = getMoralTradeBehavioralMicroPledgeContract(),
): MoralTradeBehavioralMicroPledgeValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names unit, sequence, evidence-ladder, health-safety, and enforcement records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Contract covers all moraltrade82 behavioral micro-pledge release-gate hooks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "default-granularity-rule",
      "Contract limits default templates to one meal, few meals, one day, or few days",
      DEFAULT_UNIT_GRANULARITIES.every((unit) =>
        contract.defaultUnitGranularities.includes(unit),
      ) &&
        MANUAL_REVIEW_ONLY_GRANULARITIES.every((unit) =>
          contract.manualReviewOnlyGranularities.includes(unit),
        ) &&
        /30-day|month-long|open-ended/i.test(contract.defaultGranularityRule),
      contract.defaultGranularityRule,
    ),
    check(
      "pre-performance-lock-rule",
      "Contract routes retroactive claims away from completed moral-trade status",
      /before the window begins/i.test(contract.prePerformanceLockRule) &&
        /retroactive claims/i.test(contract.prePerformanceLockRule) &&
        /not completed moral-trade status/i.test(contract.prePerformanceLockRule),
      contract.prePerformanceLockRule,
    ),
    check(
      "unit-baseline-rule",
      "Contract requires unit-specific baseline, additionality, covered action, and substitute plan",
      /no-trade baseline/i.test(contract.unitBaselineRule) &&
        /additionality/i.test(contract.unitBaselineRule) &&
        /adequate-substitute/i.test(contract.unitBaselineRule),
      contract.unitBaselineRule,
    ),
    check(
      "health-safety-rule",
      "Contract blocks fasting, diet, body-image, eating-disorder, minor/coercion, and high-burden variants",
      /fasting/i.test(contract.healthSafetyRule) &&
        /weight-loss/i.test(contract.healthSafetyRule) &&
        /eating-disorder/i.test(contract.healthSafetyRule) &&
        /minor\/dependency\/coercion/i.test(contract.healthSafetyRule),
      contract.healthSafetyRule,
    ),
    check(
      "cap-and-settlement-rules",
      "Contract freezes low-stakes caps and settlement disclosures before final confirmation",
      contract.defaultCaps.maxPerUnitCapCents === MAX_PER_UNIT_CAP_CENTS &&
        contract.defaultCaps.maxSequenceCapCents === MAX_SEQUENCE_CAP_CENTS &&
        /cap exceedance requires renewed confirmation/i.test(contract.sequenceCapRule) &&
        /failed-unit effect/i.test(contract.settlementDisclosureRule),
      `${JSON.stringify(contract.defaultCaps)} ${contract.sequenceCapRule} ${contract.settlementDisclosureRule}`,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked micro-pledge paths",
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
    validatorName: "moral-trade-behavioral-micro-pledge-contract",
    validatorVersion: MORAL_TRADE_BEHAVIORAL_MICRO_PLEDGE_VALIDATOR_VERSION,
  };
}
