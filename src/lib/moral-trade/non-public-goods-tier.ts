export const MORAL_TRADE_NON_PUBLIC_GOODS_TIER_CONTRACT_VERSION =
  "moral-trade-non-public-goods-tier-v0.1-2026-06";
export const MORAL_TRADE_NON_PUBLIC_GOODS_TIER_VALIDATOR_VERSION =
  "moral-trade-non-public-goods-tier-validator-v0.1";

export type MoralTradeNonPublicGoodsTier =
  | "tier_1_money_only_donation_offset"
  | "tier_2_donation_offset_with_abstention_or_additionality_proof"
  | "tier_3_closed_counterparty_pledge_swap"
  | "tier_4_open_market_pledge_swap_or_compensated_action";

export type MoralTradeNonPublicGoodsTransition =
  | "draft_preview"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeNonPublicGoodsSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "matched_trade_lock_proposal"
  | "template_instance_record"
  | "worked_example";

export type MoralTradeNonPublicGoodsPolicyStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeNonPublicGoodsPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeCounterfactualTrustClass =
  | "money_only_verified_destination"
  | "abstention_or_additionality_claim"
  | "closed_counterparty_known_baseline"
  | "open_market_behavior_change"
  | "compensated_personal_action"
  | "self_offset_or_personal_bookkeeping";

export type MoralTradeCounterpartyMode =
  | "none_required"
  | "closed_counterparty"
  | "invite_only"
  | "user_supplied"
  | "open_market"
  | "autonomous_outreach";

export type MoralTradeEvidenceBurdenStatus =
  | "least_intrusive_sufficient"
  | "not_required_for_stage"
  | "missing"
  | "too_intrusive"
  | "under_review"
  | "failed"
  | "stale";

export interface MoralTradeNonPublicGoodsTierPolicyRecord {
  policyId: string;
  policyVersion: string;
  tier: MoralTradeNonPublicGoodsTier;
  approvedTransition: MoralTradeNonPublicGoodsTransition;
  status: MoralTradeNonPublicGoodsPolicyStatus;
  policySnapshotStatus: MoralTradeNonPublicGoodsPolicySnapshotStatus;
  releaseStage:
    | "donation_offset_pilot"
    | "pledge_swap_preview_only"
    | "pledge_swap_manual_pilot"
    | "sandbox_calculation";
  payableAllowed: boolean;
  relianceBearingAllowed: boolean;
  publicMetricAllowed: boolean;
  openMarketMatchingAllowed: boolean;
  requiresCounterfactualTrustAssessment: boolean;
  allowedCounterpartyModes: MoralTradeCounterpartyMode[];
  policyHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeCounterfactualTrustAssessmentRecord {
  assessmentId: string;
  subjectType: MoralTradeNonPublicGoodsSubjectType;
  subjectRef: string;
  tier: MoralTradeNonPublicGoodsTier;
  counterfactualTrustClass: MoralTradeCounterfactualTrustClass;
  assessmentStatus: MoralTradeNonPublicGoodsPolicyStatus;
  evidenceBurdenStatus: MoralTradeEvidenceBurdenStatus;
  counterpartyMode: MoralTradeCounterpartyMode;
  baselineConfidenceLevel: "low" | "medium" | "high" | "not_required_for_stage";
  baselineIntegrityStatus: MoralTradeNonPublicGoodsPolicyStatus;
  participantUncertaintyDisclosed: boolean;
  participantConfirmationRef: string | null;
  reviewerDecisionRef: string | null;
  assessmentHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeNonPublicGoodsTierEvaluationInput {
  transition: MoralTradeNonPublicGoodsTransition;
  checkedAt?: string;
  policies: MoralTradeNonPublicGoodsTierPolicyRecord[];
  assessments: MoralTradeCounterfactualTrustAssessmentRecord[];
}

export interface MoralTradeNonPublicGoodsTierEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeNonPublicGoodsTransition;
  checkedAt: string;
  requiredPolicyCount: number;
  passingPolicyCount: number;
  requiredAssessmentCount: number;
  passingAssessmentCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeNonPublicGoodsTierCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeNonPublicGoodsTierValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-non-public-goods-tier-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeNonPublicGoodsTierCheck[];
  blockers: string[];
}

export interface MoralTradeNonPublicGoodsTierContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  tiers: MoralTradeNonPublicGoodsTier[];
  transitions: MoralTradeNonPublicGoodsTransition[];
  subjectTypes: MoralTradeNonPublicGoodsSubjectType[];
  counterfactualTrustClasses: MoralTradeCounterfactualTrustClass[];
  counterpartyModes: MoralTradeCounterpartyMode[];
  failClosedStatuses: Array<
    MoralTradeNonPublicGoodsPolicyStatus | MoralTradeNonPublicGoodsPolicySnapshotStatus | MoralTradeEvidenceBurdenStatus
  >;
  sampleEvaluations: MoralTradeNonPublicGoodsTierEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 45;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_non_public_goods_tier_policies",
  "moral_trade_counterfactual_trust_assessments",
  "moral_trade_non_public_goods_tier_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "non_public_goods_tier",
  "counterfactual_trust",
] as const;

const TIERS: MoralTradeNonPublicGoodsTier[] = [
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
];

const TRANSITIONS: MoralTradeNonPublicGoodsTransition[] = [
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
];

const SUBJECT_TYPES: MoralTradeNonPublicGoodsSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "template_instance_record",
  "worked_example",
];

const COUNTERFACTUAL_TRUST_CLASSES: MoralTradeCounterfactualTrustClass[] = [
  "money_only_verified_destination",
  "abstention_or_additionality_claim",
  "closed_counterparty_known_baseline",
  "open_market_behavior_change",
  "compensated_personal_action",
  "self_offset_or_personal_bookkeeping",
];

const COUNTERPARTY_MODES: MoralTradeCounterpartyMode[] = [
  "none_required",
  "closed_counterparty",
  "invite_only",
  "user_supplied",
  "open_market",
  "autonomous_outreach",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
  "mutable",
  "too_intrusive",
] as const;

const CONTRACT_TESTS = [
  "non_public_goods_tier_contract_validator",
  "non_public_goods_tier_higher_risk_tiers_fail_closed",
  "counterfactual_trust_assessment_required",
  "open_market_matching_disabled_by_default",
  "self_offset_excluded_from_public_moral_trade_metrics",
  "non_public_goods_tier_route_migration_and_profile_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeNonPublicGoodsTierCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function isFresh(checkedAt: Date, reviewedAt: string, expiresAt: string | null) {
  const reviewed = new Date(reviewedAt);

  if (Number.isNaN(reviewed.valueOf())) {
    return false;
  }

  const ageMs = checkedAt.valueOf() - reviewed.valueOf();

  if (ageMs < 0 || ageMs > MAX_REVIEW_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return false;
  }

  if (!expiresAt) {
    return true;
  }

  const expires = new Date(expiresAt);
  return !Number.isNaN(expires.valueOf()) && expires.valueOf() >= checkedAt.valueOf();
}

function requiresPayablePolicy(transition: MoralTradeNonPublicGoodsTransition) {
  return transition === "payment_authorization" || transition === "payment_capture";
}

function requiresReliancePolicy(transition: MoralTradeNonPublicGoodsTransition) {
  return transition === "matched_trade_lock" || transition === "reliance_bearing_transition";
}

function requiresPublicMetricPolicy(transition: MoralTradeNonPublicGoodsTransition) {
  return transition === "public_metric_publication" || transition === "release_gate_promotion";
}

function policyMatchesTransition(
  policy: MoralTradeNonPublicGoodsTierPolicyRecord,
  transition: MoralTradeNonPublicGoodsTransition,
) {
  return policy.approvedTransition === transition;
}

function policyBlockers(
  policy: MoralTradeNonPublicGoodsTierPolicyRecord,
  transition: MoralTradeNonPublicGoodsTransition,
  checkedAt: Date,
) {
  const blockers: string[] = [];

  if (policy.status !== "passed" && policy.status !== "not_required_for_stage") {
    blockers.push(`tier_policy_not_non_blocking:${policy.policyId}:${policy.status}`);
  }

  if (policy.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(`tier_policy_snapshot_not_immutable:${policy.policyId}:${policy.policySnapshotStatus}`);
  }

  if (!HASH_PATTERN.test(policy.policyHash)) {
    blockers.push(`tier_policy_hash_invalid:${policy.policyId}`);
  }

  if (!policyMatchesTransition(policy, transition)) {
    blockers.push(`tier_policy_transition_mismatch:${policy.policyId}:${policy.approvedTransition}`);
  }

  if (!isFresh(checkedAt, policy.reviewedAt, policy.expiresAt)) {
    blockers.push(`tier_policy_stale:${policy.policyId}`);
  }

  if (requiresPayablePolicy(transition) && !policy.payableAllowed) {
    blockers.push(`tier_payable_not_allowed:${policy.policyId}:${policy.tier}`);
  }

  if (requiresReliancePolicy(transition) && !policy.relianceBearingAllowed) {
    blockers.push(`tier_reliance_not_allowed:${policy.policyId}:${policy.tier}`);
  }

  if (requiresPublicMetricPolicy(transition) && !policy.publicMetricAllowed) {
    blockers.push(`tier_public_metric_not_allowed:${policy.policyId}:${policy.tier}`);
  }

  if (
    policy.tier === "tier_3_closed_counterparty_pledge_swap" &&
    policy.openMarketMatchingAllowed
  ) {
    blockers.push(`closed_counterparty_tier_open_market_enabled:${policy.policyId}`);
  }

  if (policy.tier === "tier_4_open_market_pledge_swap_or_compensated_action") {
    blockers.push(`tier_4_disabled_without_specific_governance:${policy.policyId}`);
  }

  return blockers;
}

function assessmentBlockers(
  assessment: MoralTradeCounterfactualTrustAssessmentRecord,
  policies: MoralTradeNonPublicGoodsTierPolicyRecord[],
  transition: MoralTradeNonPublicGoodsTransition,
  checkedAt: Date,
) {
  const blockers: string[] = [];
  const matchingPolicy = policies.find((policy) => policy.tier === assessment.tier);

  if (!matchingPolicy) {
    blockers.push(`assessment_tier_policy_missing:${assessment.assessmentId}:${assessment.tier}`);
  }

  if (assessment.assessmentStatus !== "passed" && assessment.assessmentStatus !== "not_required_for_stage") {
    blockers.push(`counterfactual_trust_not_non_blocking:${assessment.assessmentId}:${assessment.assessmentStatus}`);
  }

  if (assessment.baselineIntegrityStatus !== "passed" && assessment.baselineIntegrityStatus !== "not_required_for_stage") {
    blockers.push(`counterfactual_baseline_integrity_not_non_blocking:${assessment.assessmentId}:${assessment.baselineIntegrityStatus}`);
  }

  if (
    assessment.evidenceBurdenStatus !== "least_intrusive_sufficient" &&
    assessment.evidenceBurdenStatus !== "not_required_for_stage"
  ) {
    blockers.push(`counterfactual_evidence_burden_not_sufficient:${assessment.assessmentId}:${assessment.evidenceBurdenStatus}`);
  }

  if (!assessment.participantUncertaintyDisclosed) {
    blockers.push(`counterfactual_uncertainty_not_disclosed:${assessment.assessmentId}`);
  }

  if (!HASH_PATTERN.test(assessment.assessmentHash)) {
    blockers.push(`counterfactual_trust_hash_invalid:${assessment.assessmentId}`);
  }

  if (!isFresh(checkedAt, assessment.reviewedAt, assessment.expiresAt)) {
    blockers.push(`counterfactual_trust_assessment_stale:${assessment.assessmentId}`);
  }

  if (assessment.counterpartyMode === "autonomous_outreach") {
    blockers.push(`autonomous_outreach_prohibited:${assessment.assessmentId}`);
  }

  if (
    assessment.counterpartyMode === "open_market" &&
    !matchingPolicy?.openMarketMatchingAllowed
  ) {
    blockers.push(`open_market_matching_not_allowed:${assessment.assessmentId}`);
  }

  if (
    matchingPolicy &&
    !matchingPolicy.allowedCounterpartyModes.includes(assessment.counterpartyMode)
  ) {
    blockers.push(`counterparty_mode_not_allowed:${assessment.assessmentId}:${assessment.counterpartyMode}`);
  }

  if (
    transition === "public_metric_publication" &&
    assessment.counterfactualTrustClass === "self_offset_or_personal_bookkeeping"
  ) {
    blockers.push(`self_offset_excluded_from_moral_trade_metrics:${assessment.assessmentId}`);
  }

  return blockers;
}

function sampleHash(seed: string) {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

const sampleCheckedAt = "2026-06-13T12:00:00.000Z";

function samplePolicy(
  tier: MoralTradeNonPublicGoodsTier,
  transition: MoralTradeNonPublicGoodsTransition,
  overrides: Partial<MoralTradeNonPublicGoodsTierPolicyRecord> = {},
): MoralTradeNonPublicGoodsTierPolicyRecord {
  return {
    allowedCounterpartyModes: tier === "tier_1_money_only_donation_offset"
      ? ["none_required", "closed_counterparty", "invite_only", "user_supplied"]
      : ["closed_counterparty", "invite_only", "user_supplied"],
    approvedTransition: transition,
    expiresAt: null,
    openMarketMatchingAllowed: false,
    payableAllowed: tier === "tier_1_money_only_donation_offset",
    policyHash: sampleHash("a"),
    policyId: `policy:${tier}:${transition}`,
    policySnapshotStatus: "resolved_immutable",
    policyVersion: "non-public-goods-tier-policy-v0.1",
    publicMetricAllowed: tier === "tier_1_money_only_donation_offset",
    releaseStage: tier === "tier_1_money_only_donation_offset"
      ? "donation_offset_pilot"
      : "pledge_swap_preview_only",
    relianceBearingAllowed: tier === "tier_1_money_only_donation_offset",
    requiresCounterfactualTrustAssessment: true,
    reviewedAt: sampleCheckedAt,
    status: "passed",
    supersededBy: null,
    tier,
    ...overrides,
  };
}

function sampleAssessment(
  tier: MoralTradeNonPublicGoodsTier,
  overrides: Partial<MoralTradeCounterfactualTrustAssessmentRecord> = {},
): MoralTradeCounterfactualTrustAssessmentRecord {
  return {
    assessmentHash: sampleHash("b"),
    assessmentId: `assessment:${tier}`,
    assessmentStatus: "passed",
    baselineConfidenceLevel: "medium",
    baselineIntegrityStatus: "passed",
    counterfactualTrustClass: "money_only_verified_destination",
    counterpartyMode: "none_required",
    evidenceBurdenStatus: "least_intrusive_sufficient",
    expiresAt: null,
    participantConfirmationRef: "participant-confirmation:sample",
    participantUncertaintyDisclosed: true,
    reviewedAt: sampleCheckedAt,
    reviewerDecisionRef: "review-decision:sample",
    subjectRef: "subject:sample",
    subjectType: "donation_offset",
    supersededBy: null,
    tier,
    ...overrides,
  };
}

export function evaluateMoralTradeNonPublicGoodsTier(
  input: MoralTradeNonPublicGoodsTierEvaluationInput,
): MoralTradeNonPublicGoodsTierEvaluation {
  const checkedAt = new Date(input.checkedAt ?? new Date().toISOString());
  const checkedAtIso = Number.isNaN(checkedAt.valueOf())
    ? new Date().toISOString()
    : checkedAt.toISOString();
  const checkedAtDate = new Date(checkedAtIso);
  const blockers: string[] = [];
  const matchingPolicies = input.policies.filter((policy) =>
    policyMatchesTransition(policy, input.transition),
  );
  const requiredPolicies = matchingPolicies.length ? matchingPolicies : input.policies;

  if (matchingPolicies.length === 0) {
    blockers.push(`missing_tier_policy_for_transition:${input.transition}`);
  }

  for (const policy of requiredPolicies) {
    blockers.push(...policyBlockers(policy, input.transition, checkedAtDate));

    if (
      policy.requiresCounterfactualTrustAssessment &&
      !input.assessments.some((assessment) => assessment.tier === policy.tier)
    ) {
      blockers.push(`counterfactual_trust_assessment_missing:${policy.tier}`);
    }
  }

  for (const assessment of input.assessments) {
    blockers.push(...assessmentBlockers(assessment, input.policies, input.transition, checkedAtDate));
  }

  const uniqueBlockers = unique(blockers);

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt: checkedAtIso,
    requiredPolicyCount: requiredPolicies.length,
    passingPolicyCount: requiredPolicies.filter(
      (policy) => policyBlockers(policy, input.transition, checkedAtDate).length === 0,
    ).length,
    requiredAssessmentCount: input.assessments.length,
    passingAssessmentCount: input.assessments.filter(
      (assessment) => assessmentBlockers(assessment, input.policies, input.transition, checkedAtDate).length === 0,
    ).length,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: uniqueBlockers.length
      ? ["This trade needs tier and counterfactual-trust review before it can move forward"]
      : [],
  };
}

export function getMoralTradeNonPublicGoodsTierContract(): MoralTradeNonPublicGoodsTierContract {
  const passingTier1 = evaluateMoralTradeNonPublicGoodsTier({
    transition: "matched_trade_lock",
    checkedAt: sampleCheckedAt,
    policies: [samplePolicy("tier_1_money_only_donation_offset", "matched_trade_lock")],
    assessments: [sampleAssessment("tier_1_money_only_donation_offset")],
  });
  const blockedTier4 = evaluateMoralTradeNonPublicGoodsTier({
    transition: "payment_capture",
    checkedAt: sampleCheckedAt,
    policies: [
      samplePolicy("tier_4_open_market_pledge_swap_or_compensated_action", "payment_capture", {
        openMarketMatchingAllowed: true,
        payableAllowed: true,
        releaseStage: "pledge_swap_manual_pilot",
      }),
    ],
    assessments: [
      sampleAssessment("tier_4_open_market_pledge_swap_or_compensated_action", {
        counterfactualTrustClass: "open_market_behavior_change",
        counterpartyMode: "open_market",
        subjectType: "pledge_swap",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_NON_PUBLIC_GOODS_TIER_CONTRACT_VERSION,
    purpose:
      "Fail-closed non-public-goods tier and counterfactual-trust contract for donation offsets, pledge swaps, compensated moral-action drafts, and matched-trade lock proposals before preview, lock, payment, reliance, public metric, or release-gate transitions.",
    failClosedRule:
      "Missing, stale, mutable, unsupported, intrusive, open-market, autonomous-outreach, tier-4, self-offset-metric, or counterfactual-trust-unreviewed states block non-public-goods transitions until superseded by immutable policy and participant-facing uncertainty disclosure.",
    privacyBoundary:
      "The public contract exposes only tier names, transition rules, status categories, and synthetic sample outcomes. It never exposes private baselines, counterparties, willingness to pay, exact caps, behavioral evidence, reviewer notes, or participant-specific assessments.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    tiers: [...TIERS],
    transitions: [...TRANSITIONS],
    subjectTypes: [...SUBJECT_TYPES],
    counterfactualTrustClasses: [...COUNTERFACTUAL_TRUST_CLASSES],
    counterpartyModes: [...COUNTERPARTY_MODES],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    sampleEvaluations: [passingTier1, blockedTier4],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeNonPublicGoodsTierContract(
  contract: MoralTradeNonPublicGoodsTierContract = getMoralTradeNonPublicGoodsTierContract(),
): MoralTradeNonPublicGoodsTierValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Tier and counterfactual-trust controls publish first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Tier policies and counterfactual-trust assessments resolve through immutable policy snapshots",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "tier-model",
      "All non-public-goods launch tiers are explicit",
      TIERS.every((tier) => contract.tiers.includes(tier)),
      contract.tiers.join(", "),
    ),
    check(
      "counterfactual-trust-classes",
      "Counterfactual-trust classes include money-only, abstention, closed-counterparty, open-market, compensated-action, and self-offset cases",
      COUNTERFACTUAL_TRUST_CLASSES.every((trustClass) =>
        contract.counterfactualTrustClasses.includes(trustClass),
      ),
      contract.counterfactualTrustClasses.join(", "),
    ),
    check(
      "fail-closed-samples",
      "Sample evaluations show tier-1 donation-offset pass and tier-4 open-market block",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) =>
          sample.blockers.includes("tier_4_disabled_without_specific_governance:policy:tier_4_open_market_pledge_swap_or_compensated_action:payment_capture"),
        ),
      JSON.stringify(contract.sampleEvaluations.map((sample) => ({
        transition: sample.transition,
        status: sample.status,
        blockers: sample.blockers,
      }))),
    ),
    check(
      "contract-tests",
      "Contract test hooks cover tier scope, counterfactual trust, open-market defaults, and self-offset metric exclusion",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-non-public-goods-tier-contract",
    validatorVersion: MORAL_TRADE_NON_PUBLIC_GOODS_TIER_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeNonPublicGoodsTier = {
  evaluateMoralTradeNonPublicGoodsTier,
  getMoralTradeNonPublicGoodsTierContract,
  validateMoralTradeNonPublicGoodsTierContract,
};

export default moralTradeNonPublicGoodsTier;
