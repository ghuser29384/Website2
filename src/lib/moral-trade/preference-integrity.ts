export const MORAL_TRADE_PREFERENCE_INTEGRITY_CONTRACT_VERSION =
  "moral-trade-preference-integrity-v0.1-2026-06";
export const MORAL_TRADE_PREFERENCE_INTEGRITY_VALIDATOR_VERSION =
  "moral-trade-preference-integrity-validator-v0.1";

export type MoralTradePreferenceIntegrityTransition =
  | "draft_preview"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradePreferenceIntegritySubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "compensated_action_terms"
  | "intrapersonal_self_offset_record"
  | "evidence_record";

export type MoralTradeDominanceApplicabilityState =
  | "applicable"
  | "not_applicable_incomparable"
  | "not_applicable_lexical_block"
  | "insufficient_information"
  | "manual_review"
  | "superseded";

export type MoralTradeParetoDominanceReviewState =
  | "not_required"
  | "under_review"
  | "no_known_dominating_option"
  | "dominated_option_blocking"
  | "alternative_unavailable"
  | "incomparable_or_noncardinal_manual_review"
  | "manual_review"
  | "superseded";

export type MoralTradePreferenceComparabilityState =
  | "comparable_without_cardinal_score"
  | "incomparable_noncardinal"
  | "lexical_or_side_constraint_bound"
  | "requires_cardinal_score_blocked"
  | "unknown"
  | "under_review"
  | "manual_review"
  | "superseded";

export type MoralTradeReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeTradeBurdenConfirmationState =
  | "not_required"
  | "requested"
  | "confirmed"
  | "declined"
  | "stale"
  | "manual_review"
  | "superseded";

export type MoralTradeBurdenLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "invasive_blocked"
  | "manual_review";

export type MoralTradeAttentionBurdenLevel =
  | "low"
  | "medium"
  | "high"
  | "manual_review";

export type MoralTradeAssertedTradeBasis =
  | "moral_view_difference"
  | "moral_priority_difference"
  | "indexical_obligation_difference"
  | "empirical_belief_difference"
  | "moral_prudential_asymmetry"
  | "ordinary_trade_or_donation"
  | "self_offset_only"
  | "unclear"
  | "manual_review";

export type MoralTradeMoralDifferenceClassificationSupportState =
  | "not_required"
  | "supports_moral_trade_classification"
  | "ordinary_trade_blocking"
  | "self_offset_blocking"
  | "under_review"
  | "manual_review"
  | "superseded";

export type MoralTradeDisclosureLevel =
  | "reviewer_only"
  | "counterparty_coarse"
  | "public_aggregate_only"
  | "manual_review";

export type MoralTradeBadFaithSignalState =
  | "none"
  | "possible"
  | "under_review"
  | "blocking"
  | "manual_review";

export type MoralTradeBargainingProtocolType =
  | "posted_template"
  | "sealed_cap_batch_clearing"
  | "one_shot_counteroffer"
  | "neutral_mediator"
  | "manual_review";

export type MoralTradePrivateCapDisclosureBehavior =
  | "never_to_counterparty"
  | "reviewer_only"
  | "aggregate_band_only"
  | "manual_review";

export type MoralTradePrivateCapDisclosureState =
  | "none"
  | "reviewer_only"
  | "aggregate_band"
  | "blocked"
  | "manual_review";

export type MoralTradeHoldupReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeCounterofferState =
  | "draft"
  | "presented"
  | "accepted"
  | "rejected"
  | "expired"
  | "withdrawn"
  | "superseded";

export type MoralTradeEmpiricalAssumptionType =
  | "relative_charity_effectiveness"
  | "action_efficacy"
  | "baseline_likelihood"
  | "substitution_likelihood"
  | "performance_likelihood"
  | "causal_route"
  | "empirical_belief_difference"
  | "other";

export type MoralTradeConfidenceLevel = "low" | "medium" | "high";

export type MoralTradeChallengeState =
  | "not_applicable"
  | "open"
  | "closed"
  | "superseded";

export type MoralTradeSideConstraintContext =
  | "none_disclosed"
  | "impermissible_action"
  | "nondelegable_duty"
  | "agent_relative_limit"
  | "intention_sensitive_act"
  | "personal_integrity_limit"
  | "sacred_value_or_taboo"
  | "other"
  | "unknown";

export type MoralTradeSelfOffsetType =
  | "personal_offset"
  | "personal_bookkeeping"
  | "internal_moral_trade_like_planning"
  | "ordinary_donation"
  | "manual_review";

export type MoralTradeSelfOffsetClassificationState =
  | "self_offset_only"
  | "ordinary_donation_or_matching"
  | "eligible_interpersonal_moral_trade"
  | "manual_review"
  | "superseded";

export interface MoralTradeOptionSetComparisonRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdsHash: string;
  noTradeOptionHash: string;
  proposedTradeOptionHash: string;
  alternativeOptionHashes: string[];
  optionGenerationPolicyRef: string;
  participantOptionJudgments: unknown;
  preferenceComparabilityPolicyRef: string;
  participantOptionComparability: unknown;
  dominanceApplicabilityState: MoralTradeDominanceApplicabilityState;
  cardinalScoreRequired: boolean;
  cardinalScoreProhibited: boolean;
  incomparabilityReviewState: MoralTradeReviewState;
  paretoDominanceReviewState: MoralTradeParetoDominanceReviewState;
  unavailableAlternativeReasonCodes: string[];
  privacyRedactionPolicyRef: string;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePreferenceComparabilityRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdsHash: string;
  preferenceComparabilityPolicyRef: string;
  participantOptionComparabilityState: MoralTradePreferenceComparabilityState;
  cardinalScoreProhibited: boolean;
  publicCardinalScoreExposed: boolean;
  publicRankingExposed: boolean;
  publicExchangeRateExposed: boolean;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeTradeBurdenAccountingRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdHash: string;
  tradeBurdenPolicyRef: string;
  monetaryBurdenCents: number;
  platformFeeBurdenCents: number;
  estimatedTimeBurdenMinutesBucket: string;
  evidenceBurdenLevel: MoralTradeBurdenLevel;
  privacyDisclosureBurdenLevel: MoralTradeBurdenLevel;
  attentionOrCoordinationBurdenLevel: MoralTradeAttentionBurdenLevel;
  challengeOrDisputeBurdenLevel: MoralTradeBurdenLevel;
  residualObligationSummaryHash: string;
  burdenDisclosureRecordRef: string;
  burdenNetSurplusConfirmationState: MoralTradeTradeBurdenConfirmationState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeMoralDifferenceAttestationRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdHash: string;
  moralDifferencePolicyRef: string;
  assertedTradeBasis: MoralTradeAssertedTradeBasis;
  coarseMoralReasonCodes: string[];
  disclosureLevel: MoralTradeDisclosureLevel;
  fullTheoryRequired: boolean;
  ideologyInferenceProhibited: boolean;
  classificationSupportState: MoralTradeMoralDifferenceClassificationSupportState;
  inconsistencyOrBadFaithSignalState: MoralTradeBadFaithSignalState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeBargainingProtocolRecord {
  recordId: string;
  policyVersion: string;
  appliesTo: "donation_offset" | "pledge_swap" | "compensated_moral_action" | "manual_review";
  protocolType: MoralTradeBargainingProtocolType;
  privateCapDisclosureBehavior: MoralTradePrivateCapDisclosureBehavior;
  dynamicPricingAllowed: boolean;
  counterofferLimit: number;
  antiHoldupCooldownHours: number;
  artificialUrgencyProhibited: boolean;
  rejectionNonretaliationRequired: boolean;
  renewedConfirmationRequiredForCounteroffer: boolean;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeBargainingRoundRecord {
  recordId: string;
  bargainingProtocolRef: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  roundIndex: number;
  proposedByHash: string;
  termsSnapshotHash: string;
  changedTerms: unknown;
  privateCapDisclosureState: MoralTradePrivateCapDisclosureState;
  holdupOrPressureReviewState: MoralTradeHoldupReviewState;
  participantConfirmationRecordRefs: string[];
  counterofferState: MoralTradeCounterofferState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeEmpiricalAssumptionSnapshotRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdHash: string;
  assumptionType: MoralTradeEmpiricalAssumptionType;
  assumptionSummaryHash: string;
  confidenceLevel: MoralTradeConfidenceLevel;
  evidenceRefs: string[];
  materialToSurplusConfirmation: boolean;
  staleIfChallenged: boolean;
  challengeState: MoralTradeChallengeState;
  assumptionReviewState: MoralTradeReviewState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeMoralSideConstraintProfileRecord {
  recordId: string;
  participantIdHash: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  sideConstraintPolicyRef: string;
  sideConstraintContext: MoralTradeSideConstraintContext;
  blockedActionOrTermHash: string | null;
  waiverAllowed: boolean;
  waiverConfirmationRequired: boolean;
  coolingOffRequired: boolean;
  sideConstraintReviewState: MoralTradeReviewState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeIntrapersonalSelfOffsetRecord {
  recordId: string;
  subjectType: MoralTradePreferenceIntegritySubjectType;
  subjectId: string;
  participantIdHash: string;
  selfOffsetType: MoralTradeSelfOffsetType;
  externalCounterpartyPresent: boolean;
  representedMoralPerspectiveHash: string;
  classificationState: MoralTradeSelfOffsetClassificationState;
  excludedFromMoralTradeMetrics: boolean;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePreferenceIntegrityEvaluationInput {
  transition: MoralTradePreferenceIntegrityTransition;
  checkedAt?: string;
  integrityRequired: boolean;
  optionSetComparisons: MoralTradeOptionSetComparisonRecord[];
  preferenceComparabilityRecords: MoralTradePreferenceComparabilityRecord[];
  tradeBurdenAccountingRecords: MoralTradeTradeBurdenAccountingRecord[];
  moralDifferenceAttestations: MoralTradeMoralDifferenceAttestationRecord[];
  bargainingProtocols: MoralTradeBargainingProtocolRecord[];
  bargainingRoundRecords: MoralTradeBargainingRoundRecord[];
  empiricalAssumptionSnapshots: MoralTradeEmpiricalAssumptionSnapshotRecord[];
  moralSideConstraintProfiles: MoralTradeMoralSideConstraintProfileRecord[];
  intrapersonalSelfOffsetRecords: MoralTradeIntrapersonalSelfOffsetRecord[];
}

export interface MoralTradePreferenceIntegrityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePreferenceIntegrityTransition;
  checkedAt: string;
  integrityRequired: boolean;
  reviewedRecordCount: number;
  nonBlockingRecordCount: number;
  publicMetricSelfOffsetBlockCount: number;
  publicPreferenceExposureBlockCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePreferenceIntegrityTransitionDefinition {
  key: MoralTradePreferenceIntegrityTransition;
  label: string;
  requiresIntegrityRecords: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradePreferenceIntegrityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePreferenceIntegrityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-preference-integrity-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePreferenceIntegrityCheck[];
  blockers: string[];
}

export interface MoralTradePreferenceIntegrityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  publicNonCardinalityRule: string;
  selfOffsetMetricRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradePreferenceIntegritySubjectType[];
  releaseGateTestHooks: string[];
  transitionDefinitions: MoralTradePreferenceIntegrityTransitionDefinition[];
  sampleEvaluations: MoralTradePreferenceIntegrityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_option_set_comparison_records",
  "moral_trade_preference_comparability_records",
  "moral_trade_trade_burden_accounting_records",
  "moral_trade_moral_difference_attestation_records",
  "moral_trade_bargaining_protocols",
  "moral_trade_bargaining_round_records",
  "moral_trade_empirical_assumption_snapshots",
  "moral_trade_moral_side_constraint_profiles",
  "moral_trade_intrapersonal_self_offset_records",
  "moral_trade_preference_integrity_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "option_set_comparison",
  "preference_comparability",
  "trade_burden_accounting",
  "moral_difference_attestation",
  "bargaining_protocol",
  "empirical_assumption",
  "moral_side_constraint",
  "intrapersonal_self_offset",
] as const;

const SUBJECT_TYPES: MoralTradePreferenceIntegritySubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "intrapersonal_self_offset_record",
  "evidence_record",
];

const RELEASE_GATE_TEST_HOOKS = [
  "option_set_pareto_comparison_test",
  "preference_incomparability_noncardinal_test",
  "trade_burden_accounting_test",
  "moral_difference_attestation_test",
  "bargaining_protocol_anti_holdup_test",
  "empirical_assumption_snapshot_test",
  "moral_side_constraint_agent_relative_test",
  "intrapersonal_self_offset_classification_test",
] as const;

const TRANSITION_DEFINITIONS: MoralTradePreferenceIntegrityTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresIntegrityRecords: false,
    userFacingBlockerCategory:
      "Preference-integrity records are not required for non-reliance draft preview",
  },
  {
    key: "match_candidate_preview",
    label: "Match-candidate preview",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Match preview requires option-set, non-cardinal preference, burden, moral-difference, bargaining, assumption, side-constraint, and self-offset checks",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Lock requires preference-integrity evidence before counterparties rely on proposed terms",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Payment authorization requires non-cardinal and anti-holdup preference-integrity evidence",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Payment capture requires current preference-integrity evidence",
  },
  {
    key: "reliance_bearing_transition",
    label: "Reliance-bearing transition",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require current preference-integrity evidence",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Public metrics require self-offset exclusion and no public cardinal moral ranking",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresIntegrityRecords: true,
    userFacingBlockerCategory:
      "Release promotion requires every preference-integrity release-gate hook to be non-blocking",
  },
];

const NON_BLOCKING_REVIEW_STATES = new Set<MoralTradeReviewState>([
  "not_required",
  "non_blocking",
]);

const NON_BLOCKING_SELF_OFFSET_STATES = new Set<MoralTradeSelfOffsetClassificationState>([
  "eligible_interpersonal_moral_trade",
]);

const PROTECTED_SIDE_CONSTRAINT_CONTEXTS = new Set<MoralTradeSideConstraintContext>([
  "agent_relative_limit",
  "intention_sensitive_act",
  "personal_integrity_limit",
  "sacred_value_or_taboo",
]);

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePreferenceIntegrityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 3;
}

function isHash(value: unknown) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function hasRefs(values: unknown) {
  return Array.isArray(values) && values.some((value) => hasMeaningfulText(value));
}

function hasReviewerDecision(value: unknown) {
  return hasMeaningfulText(value);
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function addRecordIdBlockers({
  blockers,
  prefix,
  recordId,
  subjectId,
}: {
  blockers: string[];
  prefix: string;
  recordId: unknown;
  subjectId: unknown;
}) {
  if (!hasMeaningfulText(recordId)) {
    blockers.push(`${prefix}_record_id_missing`);
  }

  if (!hasMeaningfulText(subjectId)) {
    blockers.push(`${prefix}_subject_id_missing:${String(recordId || "unknown")}`);
  }
}

function reviewedNonBlocking(blockers: string[], recordId: string, reviewerDecisionRef: unknown) {
  if (!hasReviewerDecision(reviewerDecisionRef)) {
    blockers.push(`preference_integrity_reviewer_decision_missing:${recordId || "unknown"}`);
  }
}

function evaluateOptionSet(record: MoralTradeOptionSetComparisonRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "option_set_comparison",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdsHash)) {
    blockers.push(`option_set_participant_ids_hash_invalid:${recordId}`);
  }

  if (!isHash(record.noTradeOptionHash)) {
    blockers.push(`option_set_no_trade_hash_invalid:${recordId}`);
  }

  if (!isHash(record.proposedTradeOptionHash)) {
    blockers.push(`option_set_proposed_trade_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.optionGenerationPolicyRef)) {
    blockers.push(`option_set_generation_policy_missing:${recordId}`);
  }

  if (!hasMeaningfulText(record.preferenceComparabilityPolicyRef)) {
    blockers.push(`option_set_preference_policy_missing:${recordId}`);
  }

  if (record.cardinalScoreRequired) {
    blockers.push(`option_set_cardinal_score_required:${recordId}`);
  }

  if (!record.cardinalScoreProhibited) {
    blockers.push(`option_set_cardinal_score_not_prohibited:${recordId}`);
  }

  if (
    ["insufficient_information", "manual_review", "superseded"].includes(
      record.dominanceApplicabilityState,
    )
  ) {
    blockers.push(
      `option_set_dominance_applicability_blocking:${recordId}:${record.dominanceApplicabilityState}`,
    );
  }

  if (
    ["under_review", "blocked", "manual_review", "superseded"].includes(
      record.incomparabilityReviewState,
    )
  ) {
    blockers.push(
      `option_set_incomparability_review_blocking:${recordId}:${record.incomparabilityReviewState}`,
    );
  }

  if (
    [
      "under_review",
      "dominated_option_blocking",
      "incomparable_or_noncardinal_manual_review",
      "manual_review",
      "superseded",
    ].includes(record.paretoDominanceReviewState)
  ) {
    blockers.push(
      `option_set_pareto_review_blocking:${recordId}:${record.paretoDominanceReviewState}`,
    );
  }

  if (
    record.dominanceApplicabilityState === "applicable" &&
    record.paretoDominanceReviewState !== "no_known_dominating_option"
  ) {
    blockers.push(`option_set_pareto_no_known_dominating_option_missing:${recordId}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluatePreferenceComparability(record: MoralTradePreferenceComparabilityRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "preference_comparability",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdsHash)) {
    blockers.push(`preference_comparability_participant_ids_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.preferenceComparabilityPolicyRef)) {
    blockers.push(`preference_comparability_policy_missing:${recordId}`);
  }

  if (!record.cardinalScoreProhibited) {
    blockers.push(`preference_comparability_cardinal_score_not_prohibited:${recordId}`);
  }

  if (record.publicCardinalScoreExposed) {
    blockers.push(`preference_comparability_public_cardinal_score_exposed:${recordId}`);
  }

  if (record.publicRankingExposed) {
    blockers.push(`preference_comparability_public_ranking_exposed:${recordId}`);
  }

  if (record.publicExchangeRateExposed) {
    blockers.push(`preference_comparability_public_exchange_rate_exposed:${recordId}`);
  }

  if (
    [
      "requires_cardinal_score_blocked",
      "unknown",
      "under_review",
      "manual_review",
      "superseded",
    ].includes(record.participantOptionComparabilityState)
  ) {
    blockers.push(
      `preference_comparability_state_blocking:${recordId}:${record.participantOptionComparabilityState}`,
    );
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateTradeBurden(record: MoralTradeTradeBurdenAccountingRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "trade_burden_accounting",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdHash)) {
    blockers.push(`trade_burden_participant_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.tradeBurdenPolicyRef)) {
    blockers.push(`trade_burden_policy_missing:${recordId}`);
  }

  if (!isNonNegativeNumber(record.monetaryBurdenCents)) {
    blockers.push(`trade_burden_monetary_burden_invalid:${recordId}`);
  }

  if (!isNonNegativeNumber(record.platformFeeBurdenCents)) {
    blockers.push(`trade_burden_platform_fee_invalid:${recordId}`);
  }

  if (record.evidenceBurdenLevel === "invasive_blocked") {
    blockers.push(`trade_burden_invasive_evidence_blocked:${recordId}`);
  }

  if (
    [record.evidenceBurdenLevel, record.privacyDisclosureBurdenLevel].includes(
      "manual_review",
    ) ||
    record.attentionOrCoordinationBurdenLevel === "manual_review" ||
    record.challengeOrDisputeBurdenLevel === "manual_review"
  ) {
    blockers.push(`trade_burden_manual_review_unresolved:${recordId}`);
  }

  if (!isHash(record.residualObligationSummaryHash)) {
    blockers.push(`trade_burden_residual_obligation_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.burdenDisclosureRecordRef)) {
    blockers.push(`trade_burden_disclosure_missing:${recordId}`);
  }

  if (!["confirmed", "not_required"].includes(record.burdenNetSurplusConfirmationState)) {
    blockers.push(
      `trade_burden_net_surplus_confirmation_blocking:${recordId}:${record.burdenNetSurplusConfirmationState}`,
    );
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateMoralDifference(record: MoralTradeMoralDifferenceAttestationRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "moral_difference_attestation",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdHash)) {
    blockers.push(`moral_difference_participant_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.moralDifferencePolicyRef)) {
    blockers.push(`moral_difference_policy_missing:${recordId}`);
  }

  if (
    ["ordinary_trade_or_donation", "self_offset_only", "unclear", "manual_review"].includes(
      record.assertedTradeBasis,
    )
  ) {
    blockers.push(`moral_difference_basis_blocking:${recordId}:${record.assertedTradeBasis}`);
  }

  if (!hasRefs(record.coarseMoralReasonCodes)) {
    blockers.push(`moral_difference_coarse_reason_missing:${recordId}`);
  }

  if (record.disclosureLevel === "manual_review") {
    blockers.push(`moral_difference_disclosure_manual_review:${recordId}`);
  }

  if (record.fullTheoryRequired) {
    blockers.push(`moral_difference_full_theory_required:${recordId}`);
  }

  if (!record.ideologyInferenceProhibited) {
    blockers.push(`moral_difference_ideology_inference_not_prohibited:${recordId}`);
  }

  if (
    [
      "ordinary_trade_blocking",
      "self_offset_blocking",
      "under_review",
      "manual_review",
      "superseded",
    ].includes(record.classificationSupportState)
  ) {
    blockers.push(
      `moral_difference_classification_blocking:${recordId}:${record.classificationSupportState}`,
    );
  }

  if (["under_review", "blocking", "manual_review"].includes(record.inconsistencyOrBadFaithSignalState)) {
    blockers.push(
      `moral_difference_bad_faith_signal_blocking:${recordId}:${record.inconsistencyOrBadFaithSignalState}`,
    );
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateBargainingProtocol(record: MoralTradeBargainingProtocolRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("bargaining_protocol_record_id_missing");
  }

  if (!hasMeaningfulText(record.policyVersion)) {
    blockers.push(`bargaining_protocol_policy_version_missing:${recordId}`);
  }

  if (record.appliesTo === "manual_review" || record.protocolType === "manual_review") {
    blockers.push(`bargaining_protocol_manual_review:${recordId}`);
  }

  if (record.privateCapDisclosureBehavior === "manual_review") {
    blockers.push(`bargaining_protocol_private_cap_disclosure_manual_review:${recordId}`);
  }

  if (record.dynamicPricingAllowed) {
    blockers.push(`bargaining_protocol_dynamic_pricing_allowed:${recordId}`);
  }

  if (!Number.isInteger(record.counterofferLimit) || record.counterofferLimit < 0) {
    blockers.push(`bargaining_protocol_counteroffer_limit_invalid:${recordId}`);
  }

  if (!isNonNegativeNumber(record.antiHoldupCooldownHours) || record.antiHoldupCooldownHours < 1) {
    blockers.push(`bargaining_protocol_anti_holdup_cooldown_missing:${recordId}`);
  }

  if (!record.artificialUrgencyProhibited) {
    blockers.push(`bargaining_protocol_artificial_urgency_not_prohibited:${recordId}`);
  }

  if (!record.rejectionNonretaliationRequired) {
    blockers.push(`bargaining_protocol_rejection_nonretaliation_missing:${recordId}`);
  }

  if (!record.renewedConfirmationRequiredForCounteroffer) {
    blockers.push(`bargaining_protocol_renewed_confirmation_missing:${recordId}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateBargainingRound(record: MoralTradeBargainingRoundRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "bargaining_round",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!hasMeaningfulText(record.bargainingProtocolRef)) {
    blockers.push(`bargaining_round_protocol_ref_missing:${recordId}`);
  }

  if (!Number.isInteger(record.roundIndex) || record.roundIndex < 0) {
    blockers.push(`bargaining_round_index_invalid:${recordId}`);
  }

  if (!isHash(record.proposedByHash)) {
    blockers.push(`bargaining_round_proposed_by_hash_invalid:${recordId}`);
  }

  if (!isHash(record.termsSnapshotHash)) {
    blockers.push(`bargaining_round_terms_snapshot_hash_invalid:${recordId}`);
  }

  if (["blocked", "manual_review"].includes(record.privateCapDisclosureState)) {
    blockers.push(`bargaining_round_private_cap_disclosure_blocking:${recordId}`);
  }

  if (
    ["under_review", "blocked", "manual_review", "superseded"].includes(
      record.holdupOrPressureReviewState,
    )
  ) {
    blockers.push(
      `bargaining_round_holdup_or_pressure_blocking:${recordId}:${record.holdupOrPressureReviewState}`,
    );
  }

  if (
    ["presented", "accepted"].includes(record.counterofferState) &&
    !hasRefs(record.participantConfirmationRecordRefs)
  ) {
    blockers.push(`bargaining_round_counteroffer_confirmation_missing:${recordId}`);
  }

  if (["expired", "withdrawn", "superseded"].includes(record.counterofferState)) {
    blockers.push(`bargaining_round_counteroffer_state_blocking:${recordId}:${record.counterofferState}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateEmpiricalAssumption(record: MoralTradeEmpiricalAssumptionSnapshotRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "empirical_assumption_snapshot",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdHash)) {
    blockers.push(`empirical_assumption_participant_hash_invalid:${recordId}`);
  }

  if (!isHash(record.assumptionSummaryHash)) {
    blockers.push(`empirical_assumption_summary_hash_invalid:${recordId}`);
  }

  if (!hasRefs(record.evidenceRefs)) {
    blockers.push(`empirical_assumption_evidence_refs_missing:${recordId}`);
  }

  if (!record.materialToSurplusConfirmation) {
    blockers.push(`empirical_assumption_materiality_confirmation_missing:${recordId}`);
  }

  if (record.staleIfChallenged && record.challengeState === "open") {
    blockers.push(`empirical_assumption_open_challenge_stale:${recordId}`);
  }

  if (record.challengeState === "superseded") {
    blockers.push(`empirical_assumption_challenge_superseded:${recordId}`);
  }

  if (!NON_BLOCKING_REVIEW_STATES.has(record.assumptionReviewState)) {
    blockers.push(`empirical_assumption_review_blocking:${recordId}:${record.assumptionReviewState}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateSideConstraint(record: MoralTradeMoralSideConstraintProfileRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "moral_side_constraint",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdHash)) {
    blockers.push(`moral_side_constraint_participant_hash_invalid:${recordId}`);
  }

  if (!hasMeaningfulText(record.sideConstraintPolicyRef)) {
    blockers.push(`moral_side_constraint_policy_missing:${recordId}`);
  }

  if (!NON_BLOCKING_REVIEW_STATES.has(record.sideConstraintReviewState)) {
    blockers.push(
      `moral_side_constraint_review_blocking:${recordId}:${record.sideConstraintReviewState}`,
    );
  }

  if (["impermissible_action", "nondelegable_duty"].includes(record.sideConstraintContext)) {
    blockers.push(`moral_side_constraint_nonwaivable_blocking:${recordId}:${record.sideConstraintContext}`);
  }

  if (PROTECTED_SIDE_CONSTRAINT_CONTEXTS.has(record.sideConstraintContext)) {
    if (record.waiverAllowed) {
      blockers.push(`moral_side_constraint_agent_relative_waiver_blocking:${recordId}`);
    }

    if (!record.coolingOffRequired) {
      blockers.push(`moral_side_constraint_cooling_off_missing:${recordId}`);
    }
  }

  if (record.waiverAllowed && !record.waiverConfirmationRequired) {
    blockers.push(`moral_side_constraint_waiver_confirmation_missing:${recordId}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function evaluateSelfOffset(record: MoralTradeIntrapersonalSelfOffsetRecord) {
  const blockers: string[] = [];
  const recordId = record.recordId || "unknown";

  addRecordIdBlockers({
    blockers,
    prefix: "intrapersonal_self_offset",
    recordId: record.recordId,
    subjectId: record.subjectId,
  });

  if (!isHash(record.participantIdHash)) {
    blockers.push(`self_offset_participant_hash_invalid:${recordId}`);
  }

  if (!isHash(record.representedMoralPerspectiveHash)) {
    blockers.push(`self_offset_represented_perspective_hash_invalid:${recordId}`);
  }

  if (!NON_BLOCKING_SELF_OFFSET_STATES.has(record.classificationState)) {
    blockers.push(`self_offset_classification_blocking:${recordId}:${record.classificationState}`);
  }

  if (
    ["self_offset_only", "ordinary_donation_or_matching"].includes(record.classificationState) &&
    !record.excludedFromMoralTradeMetrics
  ) {
    blockers.push(`self_offset_metrics_exclusion_missing:${recordId}`);
  }

  if (
    record.classificationState === "eligible_interpersonal_moral_trade" &&
    !record.externalCounterpartyPresent
  ) {
    blockers.push(`self_offset_external_counterparty_missing:${recordId}`);
  }

  reviewedNonBlocking(blockers, recordId, record.reviewerDecisionRef);

  return blockers;
}

function userFacingCategory(blocker: string) {
  if (blocker.includes("option_set") || blocker.includes("pareto")) {
    return "Option-set comparison is incomplete or dominated";
  }

  if (blocker.includes("preference_comparability") || blocker.includes("cardinal")) {
    return "Preference comparison must stay non-cardinal and private";
  }

  if (blocker.includes("trade_burden")) {
    return "Trade burdens need disclosure and surplus confirmation";
  }

  if (blocker.includes("moral_difference")) {
    return "Moral-difference attestation is not non-blocking";
  }

  if (blocker.includes("bargaining")) {
    return "Bargaining protocol has unresolved pressure or anti-holdup gaps";
  }

  if (blocker.includes("empirical_assumption")) {
    return "Empirical assumptions need current reviewed evidence";
  }

  if (blocker.includes("side_constraint")) {
    return "Moral side constraints block or need protected review";
  }

  if (blocker.includes("self_offset")) {
    return "Self-offset classification cannot count as public moral trade";
  }

  return "Preference-integrity evidence is incomplete";
}

export function evaluateMoralTradePreferenceIntegrity(
  input: MoralTradePreferenceIntegrityEvaluationInput,
): MoralTradePreferenceIntegrityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const integrityRequired =
    input.integrityRequired || transitionDefinition?.requiresIntegrityRecords === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let nonBlockingRecordCount = 0;
  let publicMetricSelfOffsetBlockCount = 0;
  let publicPreferenceExposureBlockCount = 0;

  const requiredRecordGroups = [
    ["option_set_comparison_records_missing", input.optionSetComparisons],
    ["preference_comparability_records_missing", input.preferenceComparabilityRecords],
    ["trade_burden_accounting_records_missing", input.tradeBurdenAccountingRecords],
    ["moral_difference_attestation_records_missing", input.moralDifferenceAttestations],
    ["bargaining_protocol_records_missing", input.bargainingProtocols],
    ["empirical_assumption_snapshot_records_missing", input.empiricalAssumptionSnapshots],
    ["moral_side_constraint_profile_records_missing", input.moralSideConstraintProfiles],
    ["intrapersonal_self_offset_records_missing", input.intrapersonalSelfOffsetRecords],
  ] as const;

  if (integrityRequired) {
    for (const [missingCode, records] of requiredRecordGroups) {
      if (!Array.isArray(records) || records.length === 0) {
        blockers.push(missingCode);
      }
    }
  }

  const recordBlockerSets = [
    ...(input.optionSetComparisons ?? []).map(evaluateOptionSet),
    ...(input.preferenceComparabilityRecords ?? []).map(evaluatePreferenceComparability),
    ...(input.tradeBurdenAccountingRecords ?? []).map(evaluateTradeBurden),
    ...(input.moralDifferenceAttestations ?? []).map(evaluateMoralDifference),
    ...(input.bargainingProtocols ?? []).map(evaluateBargainingProtocol),
    ...(input.bargainingRoundRecords ?? []).map(evaluateBargainingRound),
    ...(input.empiricalAssumptionSnapshots ?? []).map(evaluateEmpiricalAssumption),
    ...(input.moralSideConstraintProfiles ?? []).map(evaluateSideConstraint),
    ...(input.intrapersonalSelfOffsetRecords ?? []).map(evaluateSelfOffset),
  ];

  for (const recordBlockers of recordBlockerSets) {
    blockers.push(...recordBlockers);
    reviewedRecordCount += 1;

    if (recordBlockers.length === 0) {
      nonBlockingRecordCount += 1;
    }
  }

  publicMetricSelfOffsetBlockCount = blockers.filter((blocker) =>
    blocker.startsWith("self_offset_"),
  ).length;
  publicPreferenceExposureBlockCount = blockers.filter(
    (blocker) => blocker.includes("public_") || blocker.includes("cardinal_score"),
  ).length;

  if (
    input.transition === "public_metric_publication" &&
    (input.intrapersonalSelfOffsetRecords ?? []).some(
      (record) =>
        record.classificationState !== "eligible_interpersonal_moral_trade" ||
        !record.excludedFromMoralTradeMetrics,
    )
  ) {
    blockers.push("public_metric_publication_self_offset_not_excluded");
    publicMetricSelfOffsetBlockCount += 1;
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    integrityRequired,
    reviewedRecordCount,
    nonBlockingRecordCount,
    publicMetricSelfOffsetBlockCount,
    publicPreferenceExposureBlockCount,
    blockers,
    userFacingBlockerCategories: Array.from(new Set(blockers.map(userFacingCategory))),
  };
}

function hashFor(seed: string) {
  const firstHex = /^[a-f0-9]$/.test(seed[0] ?? "") ? seed[0] : "a";

  return `sha256:${firstHex.repeat(64)}`;
}

function optionSetRecord(
  overrides: Partial<MoralTradeOptionSetComparisonRecord> = {},
): MoralTradeOptionSetComparisonRecord {
  return {
    alternativeOptionHashes: [hashFor("c")],
    cardinalScoreProhibited: true,
    cardinalScoreRequired: false,
    createdAt: "2026-06-13T00:00:00.000Z",
    dominanceApplicabilityState: "applicable",
    incomparabilityReviewState: "not_required",
    noTradeOptionHash: hashFor("a"),
    optionGenerationPolicyRef: "policy:option-set-comparison:v1",
    paretoDominanceReviewState: "no_known_dominating_option",
    participantIdsHash: hashFor("p"),
    participantOptionComparability: { state: "comparable_without_cardinal_score" },
    participantOptionJudgments: { participantJudgments: "redacted" },
    preferenceComparabilityPolicyRef: "policy:preference-comparability:v1",
    privacyRedactionPolicyRef: "policy:privacy-redaction:v1",
    proposedTradeOptionHash: hashFor("b"),
    recordId: "option-set-comparison:demo",
    reviewerDecisionRef: "review:option-set",
    subjectId: "matched-lock:demo",
    subjectType: "matched_trade_lock_proposal",
    unavailableAlternativeReasonCodes: [],
    updatedAt: "2026-06-13T00:00:00.000Z",
    ...overrides,
  };
}

function preferenceComparabilityRecord(
  overrides: Partial<MoralTradePreferenceComparabilityRecord> = {},
): MoralTradePreferenceComparabilityRecord {
  return {
    cardinalScoreProhibited: true,
    createdAt: "2026-06-13T00:00:00.000Z",
    participantIdsHash: hashFor("p"),
    participantOptionComparabilityState: "comparable_without_cardinal_score",
    preferenceComparabilityPolicyRef: "policy:preference-comparability:v1",
    publicCardinalScoreExposed: false,
    publicExchangeRateExposed: false,
    publicRankingExposed: false,
    recordId: "preference-comparability:demo",
    reviewerDecisionRef: "review:preference-comparability",
    subjectId: "matched-lock:demo",
    subjectType: "matched_trade_lock_proposal",
    updatedAt: "2026-06-13T00:00:00.000Z",
    ...overrides,
  };
}

function passingInput(
  overrides: Partial<MoralTradePreferenceIntegrityEvaluationInput> = {},
): MoralTradePreferenceIntegrityEvaluationInput {
  return {
    bargainingProtocols: [
      {
        antiHoldupCooldownHours: 24,
        appliesTo: "donation_offset",
        artificialUrgencyProhibited: true,
        counterofferLimit: 1,
        createdAt: "2026-06-13T00:00:00.000Z",
        dynamicPricingAllowed: false,
        policyVersion: "bargaining-protocol:v1",
        privateCapDisclosureBehavior: "reviewer_only",
        protocolType: "posted_template",
        recordId: "bargaining-protocol:demo",
        rejectionNonretaliationRequired: true,
        renewedConfirmationRequiredForCounteroffer: true,
        reviewerDecisionRef: "review:bargaining-protocol",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    bargainingRoundRecords: [],
    checkedAt: "2026-06-13T00:00:00.000Z",
    empiricalAssumptionSnapshots: [
      {
        assumptionReviewState: "non_blocking",
        assumptionSummaryHash: hashFor("e"),
        assumptionType: "empirical_belief_difference",
        challengeState: "closed",
        confidenceLevel: "medium",
        createdAt: "2026-06-13T00:00:00.000Z",
        evidenceRefs: ["evidence:empirical-assumption"],
        materialToSurplusConfirmation: true,
        participantIdHash: hashFor("p"),
        recordId: "empirical-assumption:demo",
        reviewerDecisionRef: "review:empirical-assumption",
        staleIfChallenged: true,
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    integrityRequired: true,
    intrapersonalSelfOffsetRecords: [
      {
        classificationState: "eligible_interpersonal_moral_trade",
        createdAt: "2026-06-13T00:00:00.000Z",
        excludedFromMoralTradeMetrics: true,
        externalCounterpartyPresent: true,
        participantIdHash: hashFor("p"),
        recordId: "self-offset:demo",
        representedMoralPerspectiveHash: hashFor("m"),
        reviewerDecisionRef: "review:self-offset",
        selfOffsetType: "personal_offset",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    moralDifferenceAttestations: [
      {
        assertedTradeBasis: "moral_view_difference",
        classificationSupportState: "supports_moral_trade_classification",
        coarseMoralReasonCodes: ["cause-priority"],
        createdAt: "2026-06-13T00:00:00.000Z",
        disclosureLevel: "counterparty_coarse",
        fullTheoryRequired: false,
        ideologyInferenceProhibited: true,
        inconsistencyOrBadFaithSignalState: "none",
        moralDifferencePolicyRef: "policy:moral-difference:v1",
        participantIdHash: hashFor("p"),
        recordId: "moral-difference:demo",
        reviewerDecisionRef: "review:moral-difference",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    moralSideConstraintProfiles: [
      {
        blockedActionOrTermHash: null,
        coolingOffRequired: true,
        createdAt: "2026-06-13T00:00:00.000Z",
        participantIdHash: hashFor("p"),
        recordId: "side-constraint:demo",
        reviewerDecisionRef: "review:side-constraint",
        sideConstraintContext: "none_disclosed",
        sideConstraintPolicyRef: "policy:side-constraint:v1",
        sideConstraintReviewState: "non_blocking",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: "2026-06-13T00:00:00.000Z",
        waiverAllowed: false,
        waiverConfirmationRequired: false,
      },
    ],
    optionSetComparisons: [optionSetRecord()],
    preferenceComparabilityRecords: [preferenceComparabilityRecord()],
    tradeBurdenAccountingRecords: [
      {
        attentionOrCoordinationBurdenLevel: "medium",
        burdenDisclosureRecordRef: "burden-disclosure:demo",
        burdenNetSurplusConfirmationState: "confirmed",
        challengeOrDisputeBurdenLevel: "low",
        createdAt: "2026-06-13T00:00:00.000Z",
        estimatedTimeBurdenMinutesBucket: "15-30",
        evidenceBurdenLevel: "medium",
        monetaryBurdenCents: 5000,
        participantIdHash: hashFor("p"),
        platformFeeBurdenCents: 0,
        privacyDisclosureBurdenLevel: "low",
        recordId: "trade-burden:demo",
        residualObligationSummaryHash: hashFor("r"),
        reviewerDecisionRef: "review:trade-burden",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        tradeBurdenPolicyRef: "policy:trade-burden:v1",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ],
    transition: "matched_trade_lock",
    ...overrides,
  };
}

export function getMoralTradePreferenceIntegrityContract(): MoralTradePreferenceIntegrityContract {
  return {
    version: MORAL_TRADE_PREFERENCE_INTEGRITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed preference-integrity contract for non-public-goods donation offsets, pledge swaps, compensated action terms, lock proposals, cleared agreements, and public moral-trade metrics.",
    failClosedRule:
      "MoralTrade cannot generate reliance-bearing matches, lock trades, authorize or capture payment, publish public metrics, or promote release gates when option-set comparison, non-cardinal preference comparability, trade-burden accounting, moral-difference attestation, anti-holdup bargaining protocol, empirical assumption snapshot, moral side-constraint review, or intrapersonal self-offset classification is missing, stale, manual-review, public-cardinal, dominated, self-offset-only, ordinary-donation-only, pressure-flagged, or reviewer-unapproved.",
    publicNonCardinalityRule:
      "The platform may compare participant option sets for dominance and feasibility, but it must not expose public cardinal moral rankings, public exchange rates, exact willingness-to-trade scores, or platform-authored moral value orderings.",
    selfOffsetMetricRule:
      "Intrapersonal self-offsets, ordinary donations, and personal bookkeeping can be stored as private planning records, but they must be excluded from public moral-trade volume, completion, success, and release-gate metrics unless classified as eligible interpersonal moral trade with an external counterparty.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({ ...definition })),
    sampleEvaluations: [
      evaluateMoralTradePreferenceIntegrity(passingInput()),
      evaluateMoralTradePreferenceIntegrity(
        passingInput({
          intrapersonalSelfOffsetRecords: [
            {
              ...passingInput().intrapersonalSelfOffsetRecords[0],
              classificationState: "self_offset_only",
              excludedFromMoralTradeMetrics: false,
            },
          ],
          transition: "public_metric_publication",
        }),
      ),
    ],
    contractTests: [
      "preference_integrity_contract_validator",
      "preference_integrity_record_test",
      "option_set_pareto_comparison_test",
      "preference_incomparability_noncardinal_test",
      "trade_burden_accounting_test",
      "moral_difference_attestation_test",
      "bargaining_protocol_anti_holdup_test",
      "empirical_assumption_snapshot_test",
      "moral_side_constraint_agent_relative_test",
      "intrapersonal_self_offset_classification_test",
      "preference_integrity_route_contract",
      "preference_integrity_schema_contract",
    ],
  };
}

export function validateMoralTradePreferenceIntegrityContract(
  contract: MoralTradePreferenceIntegrityContract = getMoralTradePreferenceIntegrityContract(),
): MoralTradePreferenceIntegrityValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Contract names every preference-integrity record table",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Contract names policy snapshot subjects for option, preference, burden, moral difference, bargaining, assumptions, side constraints, and self-offsets",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Contract exposes every moraltrade68 preference-integrity release-gate hook",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract requires records for match, lock, payment, reliance, public metric, and release transitions",
      [
        "match_candidate_preview",
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "reliance_bearing_transition",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition && definition.requiresIntegrityRecords,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "public-non-cardinality-rule",
      "Public rule prohibits public cardinal rankings and exchange rates",
      /cardinal/i.test(contract.publicNonCardinalityRule) &&
        /exchange rates/i.test(contract.publicNonCardinalityRule) &&
        /platform-authored moral value orderings/i.test(contract.publicNonCardinalityRule),
      contract.publicNonCardinalityRule,
    ),
    check(
      "self-offset-metric-rule",
      "Self-offset rule excludes personal bookkeeping from public moral-trade metrics",
      /excluded from public moral-trade/i.test(contract.selfOffsetMetricRule) &&
        /external counterparty/i.test(contract.selfOffsetMetricRule),
      contract.selfOffsetMetricRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked preference-integrity paths",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations.map((evaluation) => evaluation.status).join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises preference_integrity_record_test",
      contract.contractTests.includes("preference_integrity_record_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-preference-integrity-contract",
    validatorVersion: MORAL_TRADE_PREFERENCE_INTEGRITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradePreferenceIntegrity = {
  evaluateMoralTradePreferenceIntegrity,
  getMoralTradePreferenceIntegrityContract,
  validateMoralTradePreferenceIntegrityContract,
};

export default moralTradePreferenceIntegrity;
