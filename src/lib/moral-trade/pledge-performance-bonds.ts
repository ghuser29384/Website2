export const MORAL_TRADE_PLEDGE_PERFORMANCE_BOND_CONTRACT_VERSION =
  "moral-trade-pledge-performance-bonds-v0.1-2026-06";
export const MORAL_TRADE_PLEDGE_PERFORMANCE_BOND_VALIDATOR_VERSION =
  "moral-trade-pledge-performance-bond-validator-v0.1";

export type MoralTradePledgePerformanceBondTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "performance_release"
  | "forfeiture_decision"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradePledgePerformanceBondPolicyAppliesTo =
  | "pledge_swap"
  | "compensated_moral_action"
  | "manual_review";

export type MoralTradePledgePerformanceBondPostingMode =
  | "authorization_only"
  | "captured_provider_hold"
  | "external_proof_only"
  | "manual_review";

export type MoralTradePledgePerformanceBondForfeitureDestinationPolicy =
  | "return_to_poster"
  | "neutral_public_good"
  | "pre_agreed_non_counterparty_destination"
  | "counterparty_only_if_approved"
  | "manual_review";

export type MoralTradePledgePerformanceBondHighStakesBehavior =
  | "block"
  | "preview_only"
  | "manual_review";

export type MoralTradePledgePerformanceBondState =
  | "draft"
  | "previewed"
  | "authorized"
  | "posted"
  | "return_pending"
  | "returned"
  | "forfeiture_review"
  | "forfeited"
  | "refunded"
  | "cancelled"
  | "disputed"
  | "superseded";

export type MoralTradeCounterpartyBenefitFromForfeitureState =
  | "none"
  | "possible"
  | "direct"
  | "indirect"
  | "manual_review";

export type MoralTradeBondProtectiveReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeBondChallengeWindowState =
  | "not_open"
  | "open"
  | "closed"
  | "expired"
  | "manual_review"
  | "superseded";

export interface MoralTradePledgePerformanceBondPolicy {
  policyId: string;
  policyVersion: string;
  appliesTo: MoralTradePledgePerformanceBondPolicyAppliesTo;
  allowedReleaseStages: MoralTradePledgePerformanceBondTransition[];
  maxBondCents: number;
  minBondCents: number;
  settlementCurrency: string;
  postingMode: MoralTradePledgePerformanceBondPostingMode;
  returnConditionPolicyRef: string;
  forfeitureConditionPolicyRef: string;
  forfeitureDestinationPolicy: MoralTradePledgePerformanceBondForfeitureDestinationPolicy;
  counterpartyBenefitFromForfeitureAllowed: boolean;
  neutralReviewRequiredForForfeiture: boolean;
  evidenceStandardRef: string;
  challengeWindowPolicyRef: string;
  refundPolicyRef: string;
  noEscrowClaimDisclaimerRequired: boolean;
  highStakesOrIrreversibleActionBehavior: MoralTradePledgePerformanceBondHighStakesBehavior;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePledgePerformanceBondRecord {
  recordId: string;
  pledgeSwapOfferId: string | null;
  matchedTradeLockProposalRef: string | null;
  clearedTradeAgreementRef: string | null;
  participantIdHash: string;
  pledgePerformanceBondPolicyRef: string;
  bondAmountCents: number;
  settlementCurrency: string;
  paymentAuthorizationEventRef: string | null;
  postingMode: MoralTradePledgePerformanceBondPostingMode;
  bondState: MoralTradePledgePerformanceBondState;
  returnConditionSummaryHash: string;
  forfeitureConditionSummaryHash: string;
  forfeitureDestinationRef: string;
  counterpartyBenefitFromForfeitureState: MoralTradeCounterpartyBenefitFromForfeitureState;
  neutralReviewRequired: boolean;
  evidenceDueAt: string;
  evidenceRecordRefs: string[];
  challengeWindowPolicyRef: string;
  challengeWindowState: MoralTradeBondChallengeWindowState;
  refundPolicyRef: string;
  agreementTransferabilityAssessmentRef: string | null;
  transferabilityReviewState: MoralTradeBondProtectiveReviewState;
  regulatedGoodsHazardousActivityAssessmentRef: string | null;
  regulatedGoodsReviewState: MoralTradeBondProtectiveReviewState;
  hazardousActivityReviewState: MoralTradeBondProtectiveReviewState;
  cyberAbuseDigitalSystemsIntegrityAssessmentRef: string | null;
  cyberAbuseReviewState: MoralTradeBondProtectiveReviewState;
  digitalSystemsIntegrityReviewState: MoralTradeBondProtectiveReviewState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePledgePerformanceBondEvaluationInput {
  transition: MoralTradePledgePerformanceBondTransition;
  checkedAt?: string;
  performanceBondRequired: boolean;
  policies: MoralTradePledgePerformanceBondPolicy[];
  records: MoralTradePledgePerformanceBondRecord[];
}

export interface MoralTradePledgePerformanceBondEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePledgePerformanceBondTransition;
  checkedAt: string;
  performanceBondRequired: boolean;
  policyCount: number;
  recordCount: number;
  nonBlockingRecordCount: number;
  neutralReviewRequiredCount: number;
  counterpartyBenefitRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePledgePerformanceBondCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePledgePerformanceBondValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-pledge-performance-bond-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePledgePerformanceBondCheck[];
  blockers: string[];
}

export interface MoralTradePledgePerformanceBondContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  neutralForfeitureRule: string;
  noEscrowNoReputationRule: string;
  firstClassRecordTables: string[];
  existingInfrastructureTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradePledgePerformanceBondTransition;
    requiresBondRecords: boolean;
    requiresFrozenTerms: boolean;
    requiresNeutralForfeitureReview: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradePledgePerformanceBondEvaluation[];
  contractTests: string[];
}

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_pledge_performance_bond_policies",
  "moral_trade_pledge_performance_bond_records",
  "moral_trade_pledge_performance_bond_enforcement_records",
] as const;

const EXISTING_INFRASTRUCTURE_TABLES = [
  "performance_bonds",
  "bond_evidence",
  "bond_challenges",
  "bond_adjudications",
  "bond_ledger_entries",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "pledge_performance_bond",
  "performance_bond_neutral_review",
  "evidence_standard",
  "challenge_window",
  "refund_cancellation",
  "agreement_transferability_assessment",
  "regulated_goods_hazardous_activity_assessment",
  "cyber_abuse_digital_integrity_assessment",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "pledge_performance_bond_neutral_forfeiture_test",
] as const;

const CONTRACT_TESTS = [
  "pledge_performance_bond_contract_validator",
  "pledge_performance_bond_record_test",
  "pledge_performance_bond_neutral_forfeiture_test",
  "pledge_performance_bond_route_contract",
  "pledge_performance_bond_schema_contract",
] as const;

const LOCKED_TRANSITIONS = new Set<MoralTradePledgePerformanceBondTransition>([
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "performance_release",
  "forfeiture_decision",
  "public_metric_publication",
  "release_gate_promotion",
]);

const AUTHORIZATION_TRANSITIONS = new Set<MoralTradePledgePerformanceBondTransition>([
  "payment_authorization",
  "payment_capture",
]);

const POLICY_BOUND_TRANSITIONS = new Set<MoralTradePledgePerformanceBondTransition>([
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "performance_release",
  "forfeiture_decision",
  "public_metric_publication",
  "release_gate_promotion",
]);

const BLOCKING_BOND_STATES = new Set<MoralTradePledgePerformanceBondState>([
  "cancelled",
  "disputed",
  "superseded",
]);

const LOCK_READY_BOND_STATES = new Set<MoralTradePledgePerformanceBondState>([
  "previewed",
  "authorized",
  "posted",
  "return_pending",
  "returned",
  "forfeiture_review",
  "forfeited",
  "refunded",
]);

const AUTHORIZED_BOND_STATES = new Set<MoralTradePledgePerformanceBondState>([
  "authorized",
  "posted",
  "return_pending",
  "returned",
  "forfeiture_review",
  "forfeited",
  "refunded",
]);

const NON_BLOCKING_REVIEW_STATES = new Set<MoralTradeBondProtectiveReviewState>([
  "not_required",
  "non_blocking",
]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresBondRecords: false,
    requiresFrozenTerms: false,
    requiresNeutralForfeitureReview: false,
    userFacingBlockerCategory: "Draft preview may show optional bond terms without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Lock requires frozen bond amount, return, forfeiture, destination, and review terms",
  },
  {
    key: "payment_authorization",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Authorization requires frozen posting mode and no escrow or reputation claims",
  },
  {
    key: "payment_capture",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Capture requires authorized or posted bond state and neutral forfeiture review",
  },
  {
    key: "performance_release",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Performance release requires evidence, challenge window, refund, and safety checks",
  },
  {
    key: "forfeiture_decision",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Forfeiture cannot be decided by a benefiting counterparty",
  },
  {
    key: "public_metric_publication",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Public metrics cannot treat bond status as moral reputation or additionality proof",
  },
  {
    key: "release_gate_promotion",
    requiresBondRecords: true,
    requiresFrozenTerms: true,
    requiresNeutralForfeitureReview: true,
    userFacingBlockerCategory: "Release promotion requires the neutral-forfeiture release-gate hook to pass",
  },
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRefs(values: unknown): values is string[] {
  return Array.isArray(values) && values.length > 0 && values.every(hasText);
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (!hasText(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function transitionPolicy() {
  return TRANSITIONS;
}

function transitionContract(transition: MoralTradePledgePerformanceBondTransition) {
  return (
    transitionPolicy().find((entry) => entry.key === transition) ||
    transitionPolicy()[0]
  );
}

function policyByRef(
  policies: MoralTradePledgePerformanceBondPolicy[],
  ref: string,
) {
  return policies.find((policy) => policy.policyId === ref);
}

function evaluatePolicy(
  policy: MoralTradePledgePerformanceBondPolicy,
  transition: MoralTradePledgePerformanceBondTransition,
) {
  const blockers: string[] = [];
  const policyId = hasText(policy.policyId) ? policy.policyId : "unknown-policy";

  if (!hasText(policy.policyId)) blockers.push("pledge_performance_bond_policy_id_missing");
  if (!hasText(policy.policyVersion)) blockers.push(`pledge_performance_bond_policy_version_missing:${policyId}`);
  if (policy.appliesTo === "manual_review") blockers.push(`pledge_performance_bond_policy_applies_to_manual_review:${policyId}`);
  if (!Array.isArray(policy.allowedReleaseStages) || policy.allowedReleaseStages.length === 0) {
    blockers.push(`pledge_performance_bond_policy_release_stages_missing:${policyId}`);
  }
  if (
    POLICY_BOUND_TRANSITIONS.has(transition) &&
    !policy.allowedReleaseStages.includes(transition)
  ) {
    blockers.push(`pledge_performance_bond_policy_stage_not_allowed:${policyId}:${transition}`);
  }
  if (!isPositiveInteger(policy.maxBondCents)) blockers.push(`pledge_performance_bond_policy_max_invalid:${policyId}`);
  if (!isNonNegativeInteger(policy.minBondCents)) blockers.push(`pledge_performance_bond_policy_min_invalid:${policyId}`);
  if (
    isNonNegativeInteger(policy.minBondCents) &&
    isPositiveInteger(policy.maxBondCents) &&
    policy.minBondCents > policy.maxBondCents
  ) {
    blockers.push(`pledge_performance_bond_policy_amount_range_invalid:${policyId}`);
  }
  if (!hasText(policy.settlementCurrency)) blockers.push(`pledge_performance_bond_policy_currency_missing:${policyId}`);
  if (policy.postingMode === "manual_review") blockers.push(`pledge_performance_bond_policy_posting_manual_review:${policyId}`);
  if (!hasText(policy.returnConditionPolicyRef)) blockers.push(`pledge_performance_bond_return_policy_missing:${policyId}`);
  if (!hasText(policy.forfeitureConditionPolicyRef)) blockers.push(`pledge_performance_bond_forfeiture_policy_missing:${policyId}`);
  if (policy.forfeitureDestinationPolicy === "manual_review") {
    blockers.push(`pledge_performance_bond_destination_policy_manual_review:${policyId}`);
  }
  if (
    policy.counterpartyBenefitFromForfeitureAllowed &&
    !policy.neutralReviewRequiredForForfeiture
  ) {
    blockers.push(`pledge_performance_bond_counterparty_benefit_without_neutral_review:${policyId}`);
  }
  if (!hasText(policy.evidenceStandardRef)) blockers.push(`pledge_performance_bond_evidence_standard_missing:${policyId}`);
  if (!hasText(policy.challengeWindowPolicyRef)) blockers.push(`pledge_performance_bond_challenge_window_policy_missing:${policyId}`);
  if (!hasText(policy.refundPolicyRef)) blockers.push(`pledge_performance_bond_refund_policy_missing:${policyId}`);
  if (!policy.noEscrowClaimDisclaimerRequired) blockers.push(`pledge_performance_bond_no_escrow_disclaimer_missing:${policyId}`);
  if (policy.highStakesOrIrreversibleActionBehavior === "manual_review") {
    blockers.push(`pledge_performance_bond_high_stakes_behavior_manual_review:${policyId}`);
  }
  if (!hasText(policy.reviewerDecisionRef)) blockers.push(`pledge_performance_bond_policy_reviewer_decision_missing:${policyId}`);
  if (!isIsoDate(policy.createdAt) || !isIsoDate(policy.updatedAt)) {
    blockers.push(`pledge_performance_bond_policy_timestamp_invalid:${policyId}`);
  }

  return blockers;
}

function evaluateReviewState(
  state: MoralTradeBondProtectiveReviewState,
  blockerPrefix: string,
  recordId: string,
) {
  return NON_BLOCKING_REVIEW_STATES.has(state)
    ? []
    : [`${blockerPrefix}:${recordId}:${state}`];
}

function evaluateRecord(
  record: MoralTradePledgePerformanceBondRecord,
  policies: MoralTradePledgePerformanceBondPolicy[],
  transition: MoralTradePledgePerformanceBondTransition,
) {
  const blockers: string[] = [];
  const recordId = hasText(record.recordId) ? record.recordId : "unknown-record";
  const policy = policyByRef(policies, record.pledgePerformanceBondPolicyRef);

  if (!hasText(record.recordId)) blockers.push("pledge_performance_bond_record_id_missing");
  if (!hasText(record.pledgeSwapOfferId) && !hasText(record.matchedTradeLockProposalRef) && !hasText(record.clearedTradeAgreementRef)) {
    blockers.push(`pledge_performance_bond_subject_ref_missing:${recordId}`);
  }
  if (!isHash(record.participantIdHash)) blockers.push(`pledge_performance_bond_participant_hash_invalid:${recordId}`);
  if (!hasText(record.pledgePerformanceBondPolicyRef)) {
    blockers.push(`pledge_performance_bond_policy_ref_missing:${recordId}`);
  } else if (!policy) {
    blockers.push(`pledge_performance_bond_policy_ref_unresolved:${recordId}:${record.pledgePerformanceBondPolicyRef}`);
  }
  if (!isPositiveInteger(record.bondAmountCents)) blockers.push(`pledge_performance_bond_amount_invalid:${recordId}`);
  if (!hasText(record.settlementCurrency)) blockers.push(`pledge_performance_bond_currency_missing:${recordId}`);
  if (record.postingMode === "manual_review") blockers.push(`pledge_performance_bond_posting_manual_review:${recordId}`);
  if (BLOCKING_BOND_STATES.has(record.bondState)) blockers.push(`pledge_performance_bond_state_blocking:${recordId}:${record.bondState}`);
  if (LOCKED_TRANSITIONS.has(transition) && !LOCK_READY_BOND_STATES.has(record.bondState)) {
    blockers.push(`pledge_performance_bond_not_frozen_for_lock:${recordId}:${record.bondState}`);
  }
  if (AUTHORIZATION_TRANSITIONS.has(transition) && !AUTHORIZED_BOND_STATES.has(record.bondState)) {
    blockers.push(`pledge_performance_bond_not_authorized:${recordId}:${record.bondState}`);
  }
  if (
    AUTHORIZATION_TRANSITIONS.has(transition) &&
    ["authorization_only", "captured_provider_hold"].includes(record.postingMode) &&
    !hasText(record.paymentAuthorizationEventRef)
  ) {
    blockers.push(`pledge_performance_bond_payment_authorization_missing:${recordId}`);
  }
  if (!isHash(record.returnConditionSummaryHash)) blockers.push(`pledge_performance_bond_return_condition_hash_invalid:${recordId}`);
  if (!isHash(record.forfeitureConditionSummaryHash)) blockers.push(`pledge_performance_bond_forfeiture_condition_hash_invalid:${recordId}`);
  if (!hasText(record.forfeitureDestinationRef)) blockers.push(`pledge_performance_bond_forfeiture_destination_missing:${recordId}`);
  if (record.counterpartyBenefitFromForfeitureState === "manual_review") {
    blockers.push(`pledge_performance_bond_counterparty_benefit_manual_review:${recordId}`);
  }
  if (
    ["possible", "direct", "indirect"].includes(record.counterpartyBenefitFromForfeitureState) &&
    !record.neutralReviewRequired
  ) {
    blockers.push(`pledge_performance_bond_counterparty_benefit_without_neutral_review:${recordId}`);
  }
  if (transition === "forfeiture_decision" && !record.neutralReviewRequired) {
    blockers.push(`pledge_performance_bond_forfeiture_without_neutral_review:${recordId}`);
  }
  if (transition === "forfeiture_decision" && !hasText(record.reviewerDecisionRef)) {
    blockers.push(`pledge_performance_bond_forfeiture_reviewer_decision_missing:${recordId}`);
  }
  if (!isIsoDate(record.evidenceDueAt)) blockers.push(`pledge_performance_bond_evidence_due_invalid:${recordId}`);
  if (!hasRefs(record.evidenceRecordRefs) && ["performance_release", "forfeiture_decision", "public_metric_publication"].includes(transition)) {
    blockers.push(`pledge_performance_bond_evidence_refs_missing:${recordId}`);
  }
  if (!hasText(record.challengeWindowPolicyRef)) blockers.push(`pledge_performance_bond_challenge_window_policy_missing:${recordId}`);
  if (["manual_review", "superseded"].includes(record.challengeWindowState)) {
    blockers.push(`pledge_performance_bond_challenge_window_state_blocking:${recordId}:${record.challengeWindowState}`);
  }
  if (!hasText(record.refundPolicyRef)) blockers.push(`pledge_performance_bond_refund_policy_missing:${recordId}`);
  blockers.push(
    ...evaluateReviewState(
      record.transferabilityReviewState,
      "pledge_performance_bond_transferability_review_blocking",
      recordId,
    ),
  );
  blockers.push(
    ...evaluateReviewState(
      record.regulatedGoodsReviewState,
      "pledge_performance_bond_regulated_goods_review_blocking",
      recordId,
    ),
  );
  blockers.push(
    ...evaluateReviewState(
      record.hazardousActivityReviewState,
      "pledge_performance_bond_hazardous_activity_review_blocking",
      recordId,
    ),
  );
  blockers.push(
    ...evaluateReviewState(
      record.cyberAbuseReviewState,
      "pledge_performance_bond_cyber_abuse_review_blocking",
      recordId,
    ),
  );
  blockers.push(
    ...evaluateReviewState(
      record.digitalSystemsIntegrityReviewState,
      "pledge_performance_bond_digital_systems_review_blocking",
      recordId,
    ),
  );
  if (!hasText(record.reviewerDecisionRef)) blockers.push(`pledge_performance_bond_reviewer_decision_missing:${recordId}`);
  if (!isIsoDate(record.createdAt) || !isIsoDate(record.updatedAt)) {
    blockers.push(`pledge_performance_bond_timestamp_invalid:${recordId}`);
  }

  if (policy) {
    if (isPositiveInteger(record.bondAmountCents)) {
      if (record.bondAmountCents < policy.minBondCents) {
        blockers.push(`pledge_performance_bond_amount_below_policy_min:${recordId}:${policy.policyId}`);
      }
      if (record.bondAmountCents > policy.maxBondCents) {
        blockers.push(`pledge_performance_bond_amount_above_policy_max:${recordId}:${policy.policyId}`);
      }
    }
    if (record.settlementCurrency !== policy.settlementCurrency) {
      blockers.push(`pledge_performance_bond_currency_mismatch:${recordId}:${policy.policyId}`);
    }
    if (record.postingMode !== policy.postingMode) {
      blockers.push(`pledge_performance_bond_posting_mode_mismatch:${recordId}:${policy.policyId}`);
    }
    if (record.challengeWindowPolicyRef !== policy.challengeWindowPolicyRef) {
      blockers.push(`pledge_performance_bond_challenge_window_mismatch:${recordId}:${policy.policyId}`);
    }
    if (record.refundPolicyRef !== policy.refundPolicyRef) {
      blockers.push(`pledge_performance_bond_refund_policy_mismatch:${recordId}:${policy.policyId}`);
    }
    if (
      policy.counterpartyBenefitFromForfeitureAllowed &&
      !record.neutralReviewRequired
    ) {
      blockers.push(`pledge_performance_bond_record_missing_policy_neutral_review:${recordId}:${policy.policyId}`);
    }
    if (
      record.counterpartyBenefitFromForfeitureState !== "none" &&
      !policy.counterpartyBenefitFromForfeitureAllowed
    ) {
      blockers.push(`pledge_performance_bond_counterparty_benefit_not_allowed:${recordId}:${policy.policyId}`);
    }
  }

  return blockers;
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("counterparty_benefit") || blocker.includes("neutral_review")) {
    return "Counterparty-benefiting forfeiture needs neutral review";
  }
  if (blocker.includes("amount") || blocker.includes("currency") || blocker.includes("posting")) {
    return "Bond amount, currency, or posting mode is not frozen";
  }
  if (blocker.includes("evidence") || blocker.includes("challenge_window") || blocker.includes("refund")) {
    return "Evidence, challenge, or refund terms are incomplete";
  }
  if (blocker.includes("transferability") || blocker.includes("regulated") || blocker.includes("hazardous") || blocker.includes("cyber")) {
    return "Safety and non-transferability reviews are not non-blocking";
  }
  if (blocker.includes("no_escrow")) {
    return "No-escrow disclaimer is missing";
  }

  return "Pledge performance bond terms are incomplete";
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function sampleHash(seed: string) {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function sampleInput(
  overrides: Partial<MoralTradePledgePerformanceBondEvaluationInput> = {},
): MoralTradePledgePerformanceBondEvaluationInput {
  const policy: MoralTradePledgePerformanceBondPolicy = {
    allowedReleaseStages: [
      "matched_trade_lock",
      "payment_authorization",
      "payment_capture",
      "performance_release",
      "forfeiture_decision",
      "public_metric_publication",
      "release_gate_promotion",
    ],
    appliesTo: "pledge_swap",
    challengeWindowPolicyRef: "policy:challenge-window:v1",
    counterpartyBenefitFromForfeitureAllowed: true,
    createdAt: "2026-06-13T00:00:00.000Z",
    evidenceStandardRef: "policy:evidence-standard:v1",
    forfeitureConditionPolicyRef: "policy:forfeiture-condition:v1",
    forfeitureDestinationPolicy: "counterparty_only_if_approved",
    highStakesOrIrreversibleActionBehavior: "preview_only",
    maxBondCents: 50000,
    minBondCents: 500,
    neutralReviewRequiredForForfeiture: true,
    noEscrowClaimDisclaimerRequired: true,
    policyId: "pledge-performance-bond-policy:demo",
    policyVersion: "pledge-performance-bond-policy-v1",
    postingMode: "authorization_only",
    refundPolicyRef: "policy:refund:v1",
    returnConditionPolicyRef: "policy:return-condition:v1",
    reviewerDecisionRef: "review:bond-policy",
    settlementCurrency: "USD",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
  const record: MoralTradePledgePerformanceBondRecord = {
    agreementTransferabilityAssessmentRef: "assessment:transferability",
    bondAmountCents: 10000,
    bondState: "authorized",
    challengeWindowPolicyRef: "policy:challenge-window:v1",
    challengeWindowState: "open",
    clearedTradeAgreementRef: null,
    counterpartyBenefitFromForfeitureState: "possible",
    createdAt: "2026-06-13T00:00:00.000Z",
    cyberAbuseDigitalSystemsIntegrityAssessmentRef: "assessment:cyber",
    cyberAbuseReviewState: "not_required",
    digitalSystemsIntegrityReviewState: "not_required",
    evidenceDueAt: "2026-07-13T00:00:00.000Z",
    evidenceRecordRefs: ["evidence:performance"],
    forfeitureConditionSummaryHash: sampleHash("b"),
    forfeitureDestinationRef: "destination:neutral-reviewed",
    hazardousActivityReviewState: "not_required",
    matchedTradeLockProposalRef: "matched-lock:demo",
    neutralReviewRequired: true,
    participantIdHash: sampleHash("a"),
    paymentAuthorizationEventRef: "payment-authorization:bond",
    pledgePerformanceBondPolicyRef: "pledge-performance-bond-policy:demo",
    pledgeSwapOfferId: "pledge-swap:demo",
    postingMode: "authorization_only",
    recordId: "pledge-performance-bond:demo",
    refundPolicyRef: "policy:refund:v1",
    regulatedGoodsHazardousActivityAssessmentRef: "assessment:hazardous",
    regulatedGoodsReviewState: "not_required",
    returnConditionSummaryHash: sampleHash("c"),
    reviewerDecisionRef: "review:bond-record",
    settlementCurrency: "USD",
    transferabilityReviewState: "non_blocking",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };

  return {
    checkedAt: "2026-06-13T00:00:00.000Z",
    performanceBondRequired: true,
    policies: [policy],
    records: [record],
    transition: "forfeiture_decision",
    ...overrides,
  };
}

export function evaluateMoralTradePledgePerformanceBonds(
  input: MoralTradePledgePerformanceBondEvaluationInput,
): MoralTradePledgePerformanceBondEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const transition = input.transition || "draft_preview";
  const transitionRules = transitionContract(transition);
  const blockers: string[] = [];

  if (input.performanceBondRequired && input.policies.length === 0) {
    blockers.push("pledge_performance_bond_policies_missing");
  }
  if (input.performanceBondRequired && input.records.length === 0) {
    blockers.push("pledge_performance_bond_records_missing");
  }
  if (transitionRules.requiresBondRecords && input.performanceBondRequired && input.records.length === 0) {
    blockers.push(`pledge_performance_bond_required_for_transition:${transition}`);
  }

  for (const policy of input.policies) {
    blockers.push(...evaluatePolicy(policy, transition));
  }

  let nonBlockingRecordCount = 0;
  for (const record of input.records) {
    const recordBlockers = evaluateRecord(record, input.policies, transition);
    blockers.push(...recordBlockers);
    if (recordBlockers.length === 0) {
      nonBlockingRecordCount += 1;
    }
  }

  const neutralReviewRequiredCount = input.records.filter(
    (record) => record.neutralReviewRequired,
  ).length;
  const counterpartyBenefitRecordCount = input.records.filter(
    (record) => record.counterpartyBenefitFromForfeitureState !== "none",
  ).length;

  const uniqueBlockers = unique(blockers);

  return {
    blockers: uniqueBlockers,
    checkedAt,
    counterpartyBenefitRecordCount,
    neutralReviewRequiredCount,
    nonBlockingRecordCount,
    performanceBondRequired: input.performanceBondRequired,
    policyCount: input.policies.length,
    recordCount: input.records.length,
    status: uniqueBlockers.length === 0 ? "pass" : "blocked",
    transition,
    userFacingBlockerCategories: unique(uniqueBlockers.map(categoryForBlocker)),
  };
}

export function getMoralTradePledgePerformanceBondContract(): MoralTradePledgePerformanceBondContract {
  const passingSample = evaluateMoralTradePledgePerformanceBonds(sampleInput());
  const blockedSample = evaluateMoralTradePledgePerformanceBonds(
    sampleInput({
      records: [
        {
          ...sampleInput().records[0],
          counterpartyBenefitFromForfeitureState: "direct",
          neutralReviewRequired: false,
          reviewerDecisionRef: null,
        },
      ],
      transition: "payment_capture",
    }),
  );

  return {
    contractTests: [...CONTRACT_TESTS],
    existingInfrastructureTables: [...EXISTING_INFRASTRUCTURE_TABLES],
    failClosedRule:
      "MoralTrade cannot lock, authorize, capture, release performance, decide forfeiture, publish public metrics, or promote release gates for a pledge-swap performance bond unless the bond policy and record freeze amount, posting mode, return terms, forfeiture terms, destination, challenge window, refund handling, protective reviews, and reviewer decision.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    neutralForfeitureRule:
      "A counterparty who financially or reputationally benefits from forfeiture may accept evidence or challenge it, but cannot be the final judge; counterparty-benefiting forfeiture requires neutral review and a first-class reviewer decision.",
    noEscrowNoReputationRule:
      "A pledge performance bond is a bounded factual-trust support. It is not an escrow claim, moral-reputation score, punishment, transferable credit, or proof of counterfactual additionality.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    purpose:
      "Fail-closed pledge-performance-bond contract for optional factual-trust support in pledge swaps and compensated moral-action agreements.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    sampleEvaluations: [passingSample, blockedSample],
    transitions: [...TRANSITIONS],
    version: MORAL_TRADE_PLEDGE_PERFORMANCE_BOND_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradePledgePerformanceBondCheck {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradePledgePerformanceBondContract(
  contract = getMoralTradePledgePerformanceBondContract(),
): MoralTradePledgePerformanceBondValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Contract names pledge-performance-bond policy, record, and enforcement tables",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "existing-performance-bond-infrastructure",
      "Contract acknowledges existing performance-bond infrastructure tables",
      EXISTING_INFRASTRUCTURE_TABLES.every((table) =>
        contract.existingInfrastructureTables.includes(table),
      ),
      contract.existingInfrastructureTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Contract names pledge-performance-bond and neutral-review policy subjects",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hook",
      "Contract exposes moraltrade68 pledge-performance-bond neutral forfeiture hook",
      RELEASE_GATE_TEST_HOOKS.every((hook) =>
        contract.releaseGateTestHooks.includes(hook),
      ),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract covers lock, payment, performance release, forfeiture, metric, and release transitions",
      [
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "performance_release",
        "forfeiture_decision",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((key) => contract.transitions.some((transition) => transition.key === key)),
      contract.transitions.map((transition) => transition.key).join(", "),
    ),
    check(
      "neutral-forfeiture-rule",
      "Contract states benefiting counterparties cannot be final judges of forfeiture",
      /counterparty/i.test(contract.neutralForfeitureRule) &&
        /neutral review/i.test(contract.neutralForfeitureRule) &&
        /final judge/i.test(contract.neutralForfeitureRule),
      contract.neutralForfeitureRule,
    ),
    check(
      "no-escrow-no-reputation-rule",
      "Contract disclaims escrow, punishment, reputation, transferability, and additionality proof",
      /not an escrow/i.test(contract.noEscrowNoReputationRule) &&
        /moral-reputation/i.test(contract.noEscrowNoReputationRule) &&
        /counterfactual additionality/i.test(contract.noEscrowNoReputationRule),
      contract.noEscrowNoReputationRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and neutral-review-blocked paths",
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
    validatorName: "moral-trade-pledge-performance-bond-contract",
    validatorVersion: MORAL_TRADE_PLEDGE_PERFORMANCE_BOND_VALIDATOR_VERSION,
  };
}
