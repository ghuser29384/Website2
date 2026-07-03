import { createHash } from "node:crypto";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_CLEARING_POLICY =
  "crecm_v1_125_fail_closed_round_close_clearing_contract";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_POLICY =
  "crecm_v1_125_failure_bonus_threshold_family_claims";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS = [
  "early_failure_bonus_cutoff",
  "round_close",
  "authorization_reconciliation",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES = [
  "base_match",
  "bonus_match",
  "failure_bonus",
  "success_reward",
  "fee_support",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES = [
  "contractually_committed",
  "funded",
  "escrowed",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS = [
  "threshold_amount_shortfall",
  "verified_supporter_shortfall",
  "active_cluster_shortfall",
  "counterparty_volume_shortfall",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_CLAIMANT_CONFLICT_STATES = [
  "no_conflict",
  "project_proposer",
  "recipient_affiliate",
  "fiscal_host_affiliate",
  "sponsor_affiliate",
  "reviewer_affiliate",
  "same_control_affiliate",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS = [
  "scopeValidMoralPublicGood",
  "destinationRouteValid",
  "externalityClear",
  "baselineIntegrityApproved",
  "baselineConfidenceApproved",
  "actionEvidenceApproved",
  "reviewApproved",
  "challengeClearOrNonBlocking",
  "conflictReviewClear",
  "sponsorCompatible",
  "legalCustodyClear",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_SCOPE_STATES = [
  "valid_moral_public_good",
  "review",
  "private_benefit",
  "political_campaign",
  "lifestyle_trade",
  "behavior_change_promise",
  "threat_like_trade",
  "blocked",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_EXCLUDED_TRADE_TYPES = [
  "private_benefit",
  "political_campaign",
  "lifestyle_trade",
  "behavior_change_promise",
  "threat_like_trade",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_GOOD_TYPES = [
  "consensus",
  "hybrid",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_DESTINATION_TYPES = [
  "registered_nonprofit",
  "fiscal_host",
  "signed_auditable_route",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_DESTINATION_ROUTE_STATES = [
  "valid",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_EXTERNALITY_STATES = [
  "clear",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_REVIEW_STATES = [
  "approved",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_CHALLENGE_STATES = [
  "clear",
  "non_blocking",
  "open",
  "blocking",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_CLEAR_REVIEW_STATES = [
  "clear",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_COMPATIBILITY_STATES = [
  "compatible",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_INTEGRITY_STATES = [
  "clear",
  "review",
  "blocked",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_CONFIDENCE_STATES = [
  "high",
  "medium",
  "low",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_ACTION_EVIDENCE_STATES = [
  "adequate",
  "provisional_nonblocking",
  "review",
  "blocked",
  "missing",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_RECONCILIATION_STATES = [
  "kept_authorized",
  "removed_wrong_amount",
  "removed_partial_authorization",
  "removed_expired_before_capture",
  "removed_short_expiry",
  "removed_provider_failure",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_FEE_PAYERS = [
  "donor_deducted",
  "sponsor_paid",
  "waived",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMIZATION_STAGES = [
  "stage_3_coalition_clearing",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES = [
  "ilp",
  "deterministic_greedy",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES = [
  "optimal",
  "deterministic_greedy_selected",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_BUDGET_PERIODS = [
  "one_time",
  "per_round",
  "monthly",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_FALLBACK_RULES = [
  "refund",
  "reroute",
  "carry_forward",
  "release_hold",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES = [
  "clear",
  "review",
  "blocked",
  "unknown",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_STATES = [
  "draft",
  "active",
  "paused",
  "expired",
  "canceled",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_AUTHORIZATION_STATES = [
  "none",
  "payment_method_saved",
  "authorized",
  "captured",
  "released",
  "failed",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_CLEARING_AUTHORIZATION_STATES = [
  "none",
  "payment_method_saved",
  "authorized",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_PRECISION = 12 as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_ROUNDING_MODE = "half_even" as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS = {
  alphaFixed: "0.200000000000",
  betaFixed: "0.200000000000",
  gammaFixed: "0.500000000000",
  weakWeightFixed: "0.600000000000",
  strongWeightFixed: "1.000000000000",
  dissentWeightFixed: "0.000000000000",
  abstainWeightFixed: "0.000000000000",
} as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_STANCE_WEIGHT_FIXED_BY_STANCE = {
  strong: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS.strongWeightFixed,
  weak: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS.weakWeightFixed,
  dissent: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS.dissentWeightFixed,
  abstain: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS.abstainWeightFixed,
} as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_DEFAULT_SUPPORTER_COUNT_MIN_NET_PUBLIC_GOOD_CENTS = 100 as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_CONTRIBUTOR_BENEFIT_KINDS = [
  "success_reward",
  "coordination_credit",
  "impact_certificate",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_COUNTERPARTY_VOLUME_SOURCES = [
  "net_recipient_public_good_credit",
  "sponsor_funds",
  "platform_funds",
  "self_funded",
  "fee",
  "success_reward",
  "coordination_credit",
  "impact_certificate",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_COORDINATION_CREDIT_KINDS = [
  "future_coordination_access",
  "public_recognition",
  "audit_receipt",
  "advisory_access",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_ROUND_STATUSES = [
  "draft",
  "open",
  "locked",
  "frozen",
  "reviewing",
  "cleared",
  "payable",
  "released",
  "closed",
  "canceled",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_RESULT_REPLAY_STATUSES = [
  "cleared",
  "payable",
  "released",
  "closed",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PREVIEW_ONLY_STATUSES = [
  "open",
  "locked",
  "reviewing",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_ROUND_STATUSES_WITH_FAILURE_BONUS_SIDE_EFFECTS = [
  "payable",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_MODES = [
  "shadow",
  "capped_pilot",
  "full",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_STATES = [
  "not_required",
  "passed",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_KINDS = [
  "shadow_to_pilot",
  "pilot_to_full",
  "shadow_or_pilot_to_full",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_TARGET_MODES = [
  "capped_pilot",
  "full",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_PRIOR_MODES = [
  "shadow",
  "capped_pilot",
] as const;

const MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_PRIOR_OUTCOME_STATES = [
  "passed",
  "failed",
  "canceled",
  "incident_review",
  "missing",
  "malformed",
] as const;

type ArrayValue<T extends readonly unknown[]> = T[number];

export type MpgfCrecSupportStance = "strong" | "weak" | "dissent" | "abstain";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_LABELS = [
  "Fund this",
  "Fund if different-view support joins",
  "Needs review",
  "Skip",
] as const;

export type MpgfCrecPlainStanceLabel =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_LABELS>;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_TO_CANONICAL_STANCE = {
  "Fund this": "strong",
  "Fund if different-view support joins": "weak",
  "Needs review": "dissent",
  Skip: "abstain",
} as const satisfies Record<MpgfCrecPlainStanceLabel, MpgfCrecSupportStance>;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_CANONICAL_STANCE_TO_PLAIN_LABEL = {
  strong: "Fund this",
  weak: "Fund if different-view support joins",
  dissent: "Needs review",
  abstain: "Skip",
} as const satisfies Record<MpgfCrecSupportStance, MpgfCrecPlainStanceLabel>;

export type MpgfCrecBudgetPeriod =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_BUDGET_PERIODS>;

export type MpgfCrecFallbackRule =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_FALLBACK_RULES>;

export type MpgfCrecIdentityRiskState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES>;

export type MpgfCrecConditionalIntentState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_STATES>;

export type MpgfCrecConditionalIntentAuthorizationState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_AUTHORIZATION_STATES>;

export type MpgfCrecCounterpartyVolumeSource =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_COUNTERPARTY_VOLUME_SOURCES>;

export type MpgfCrecPaymentSnapshotKind =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS>;

export type MpgfCrecSponsorPoolType =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES>;

export type MpgfCrecSponsorBackingState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES>;

export type MpgfCrecThresholdFamilyFailureReason =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS>;

export type MpgfCrecFailureBonusClaimantConflictState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_CLAIMANT_CONFLICT_STATES>;

export type MpgfCrecProjectEligibilityField =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS>;

export type MpgfCrecProjectScopeState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_SCOPE_STATES>;

export type MpgfCrecExcludedTradeType =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_EXCLUDED_TRADE_TYPES>;

export type MpgfCrecProjectGoodType =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_GOOD_TYPES>;

export type MpgfCrecProjectDestinationType =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_DESTINATION_TYPES>;

export type MpgfCrecDestinationRouteState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_DESTINATION_ROUTE_STATES>;

export type MpgfCrecExternalityState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_EXTERNALITY_STATES>;

export type MpgfCrecReviewState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_REVIEW_STATES>;

export type MpgfCrecChallengeState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_CHALLENGE_STATES>;

export type MpgfCrecClearReviewState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_CLEAR_REVIEW_STATES>;

export type MpgfCrecSponsorCompatibilityState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_COMPATIBILITY_STATES>;

export type MpgfCrecBaselineIntegrityState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_INTEGRITY_STATES>;

export type MpgfCrecBaselineConfidenceState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_CONFIDENCE_STATES>;

export type MpgfCrecActionEvidenceState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_ACTION_EVIDENCE_STATES>;

export type MpgfCrecAuthorizationReconciliationState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_RECONCILIATION_STATES>;

export type MpgfCrecFeePayer =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_FEE_PAYERS>;

export type MpgfCrecOptimizationStage =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMIZATION_STAGES>;

export type MpgfCrecSolverMode =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES>;

export type MpgfCrecOptimalityStatus =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES>;

export type MpgfCrecContributorBenefitKind =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_CONTRIBUTOR_BENEFIT_KINDS>;

export type MpgfCrecCoordinationCreditKind =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_COORDINATION_CREDIT_KINDS>;

export type MpgfCrecRoundStatus =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_ROUND_STATUSES>;

export type MpgfCrecDeploymentAuditKind =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_KINDS>;

export type MpgfCrecDeploymentAuditTargetMode =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_TARGET_MODES>;

export type MpgfCrecDeploymentAuditPriorMode =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_PRIOR_MODES>;

export type MpgfCrecDeploymentPriorOutcomeState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_PRIOR_OUTCOME_STATES>;

export type MpgfCrecRoundStatusOperation =
  | "final_binding_result"
  | "deterministic_replay"
  | "failure_bonus_qualification_review"
  | "audit_output"
  | "new_authorization_attempt"
  | "stage7_fallback_execution"
  | "authorization_cancel_release"
  | "reroute"
  | "carry_forward"
  | "capture"
  | "release"
  | "payment"
  | "failure_bonus_claim_creation"
  | "failure_bonus_claim_advancement"
  | "failure_bonus_claim_field_mutation"
  | "failure_bonus_crediting"
  | "failure_bonus_payment"
  | "setup_display"
  | "internal_review_calculation"
  | "non_binding_preview";

export type MpgfCrecFailureBonusClaimState =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "paid"
  | "credited";

type MpgfCrecValidationResult = {
  eligible: boolean;
  blockers: string[];
};

export interface MpgfCrecRoundStatusGateInput {
  roundStatus: unknown;
  operation: MpgfCrecRoundStatusOperation;
  backedFailureBonusPoolCents?: number | null;
  publicSafetyFreezeActive?: boolean;
  cancellationActive?: boolean;
}

export interface MpgfCrecRoundStatusGateResult {
  allowed: boolean;
  blockers: string[];
  operation: MpgfCrecRoundStatusOperation;
  roundStatus: MpgfCrecRoundStatus | null;
  stateMutationAllowed: boolean;
  finalBindingOutputAllowed: boolean;
  replayOnly: boolean;
  nonBindingPreviewOnly: boolean;
}

export interface MpgfCrecStage7FailureHandlingNonSideEffectOutput {
  roundStatus: MpgfCrecRoundStatus | null;
  outputMode: "replay_report_audit_only" | "non_binding_review_only";
  replayOnly: boolean;
  nonBindingReviewOnly: boolean;
  sideEffectsAllowed: false;
  forbiddenMutationKinds: readonly [
    "fallback",
    "authorization",
    "failure_bonus",
    "payout",
    "credit",
    "proration",
    "settlement",
    "claim",
  ];
  blockers: string[];
}

export interface MpgfCrecRoundMetadataGateInput {
  roundId: unknown;
  rulebookHash: unknown;
  sponsorPoolSourceHash: unknown;
  paymentReconciliationPathHash: unknown;
  calculationVersion: unknown;
  failureBonusPolicyVersion: unknown;
  parametersFrozenAt: unknown;
  opensAt: unknown;
  earlyFailureBonusCutoff: unknown;
  reviewFreezeAt: unknown;
  closesAt: unknown;
  challengeDeadline: unknown;
}

export interface MpgfCrecRoundMetadataGateResult {
  eligible: boolean;
  blockers: string[];
  roundId: string | null;
  parametersFrozenAt: string | null;
  opensAt: string | null;
  earlyFailureBonusCutoff: string | null;
  reviewFreezeAt: string | null;
  closesAt: string | null;
  challengeDeadline: string | null;
  rulebookHash: string | null;
  sponsorPoolSourceHash: string | null;
  paymentReconciliationPathHash: string | null;
  calculationVersion: string | null;
  failureBonusPolicyVersion: string | null;
  lockAllowed: boolean;
  clearingAllowed: boolean;
  matchingAllowed: boolean;
  authorizationAllowed: boolean;
  failureBonusQualificationAllowed: boolean;
}

export interface MpgfCrecPaymentCommitmentSnapshot {
  snapshotKind: MpgfCrecPaymentSnapshotKind;
  roundId: string;
  participantId: string;
  commonGroundBudgetId: string;
  paymentMethodRef: string;
  paymentMethodSavedAt: string;
  paymentMethodCommitmentState: "provider_confirmed" | "requires_action" | "detached" | "unconfirmed";
  paymentMethodConfirmedAt: string;
  asOf: string;
  providerEvidenceHash: string;
  rulebookHash: string;
  createdAt: string;
  snapshotHash: string;
}

export interface MpgfCrecPaymentCommitmentSnapshotExpectedContext {
  snapshotKind: MpgfCrecPaymentSnapshotKind;
  roundId: string;
  participantId: string;
  commonGroundBudgetId: string;
  rulebookHash: string;
  asOf: string;
}

export interface MpgfCrecRoundMoralBucketSnapshot {
  id: string;
  roundId: string;
  rulebookHash: string;
  distinctnessPolicyVersion: string;
  bucketIds: string[];
  reciprocalDistinctFromBucketIdsByBucketId: Record<string, string[]>;
  asymmetricPairCount: number;
  blockedAsymmetricPairs: [string, string][];
  createdAt: string;
  snapshotHash: string;
}

export interface MpgfCrecRoundMoralBucketSnapshotExpectedContext {
  id?: string;
  roundId: string;
  rulebookHash: string;
  parametersFrozenAt?: string;
}

export interface MpgfCrecRoundClearingInputBundle {
  id: string;
  roundId: string;
  rulebookHash: string;
  feePolicyVersion: string;
  feePolicyHash: string;
  deploymentMode: "shadow" | "capped_pilot" | "full";
  pilotMaxRoundGrossExposureCents: number | null;
  pilotMaxParticipantGrossExposureCents: number | null;
  deploymentAuditState: "not_required" | "passed";
  deploymentAuditId: string | null;
  deploymentAuditHash: string | null;
  paymentReconciliationPathHash: string;
  optimizationPolicyHash: string;
  calculationVersion: string;
  bundleSchemaVersion: string;
  snapshotKind: "round_close";
  sourceCutoffAt: string;
  commonGroundBudgetInputHash: string;
  supportStanceInputHash: string;
  conditionalTradeIntentInputHash: string;
  identityEligibilityInputHash: string;
  paymentCommitmentSnapshotHash: string;
  feeInputHash: string;
  deploymentExposureInputHash: string;
  projectInputHash: string;
  projectEligibilitySnapshotHash: string;
  sponsorCommitmentInputHash: string;
  successRewardInputHash: string;
  coordinationCreditInputHash: string;
  impactCertificateInputHash: string;
  moralBucketSnapshotId: string;
  moralBucketSnapshotHash: string;
  canonicalInputJsonRef: string;
  canonicalInputJsonHash: string;
  createdAt: string;
  bundleHash: string;
}

export interface MpgfCrecRoundClearingInputBundleExpectedContext {
  id?: string;
  roundId: string;
  rulebookHash: string;
  feePolicyVersion: string;
  feePolicyHash: string;
  deploymentMode: MpgfCrecRoundClearingInputBundle["deploymentMode"];
  pilotMaxRoundGrossExposureCents: number | null;
  pilotMaxParticipantGrossExposureCents: number | null;
  deploymentAuditState: MpgfCrecRoundClearingInputBundle["deploymentAuditState"];
  deploymentAuditId: string | null;
  deploymentAuditHash: string | null;
  paymentReconciliationPathHash: string;
  optimizationPolicyHash: string;
  calculationVersion: string;
  sourceCutoffAt: string;
  clearingInputBundleHash?: string;
  sponsorPoolSourceHash?: string;
  moralBucketSnapshotId?: string;
  moralBucketSnapshotHash?: string;
}

export interface MpgfCrecDeploymentAudit {
  id: string;
  roundId: string;
  auditKind: MpgfCrecDeploymentAuditKind;
  targetDeploymentMode: MpgfCrecDeploymentAuditTargetMode;
  calculationVersion: string;
  rulebookHash: string;
  feePolicyHash: string;
  sponsorPoolSourceHash: string;
  paymentReconciliationPathHash: string;
  optimizationPolicyHash: string;
  solverVersion: string;
  priorRoundIds: string[];
  priorAuditBundleHashes: string[];
  priorRoundDeploymentModes: MpgfCrecDeploymentAuditPriorMode[];
  priorPaymentReconciliationPathHashes: string[];
  priorRoundOutcomeStates: MpgfCrecDeploymentPriorOutcomeState[];
  auditState: "passed";
  auditorId: string;
  createdAt: string;
  auditHash: string;
}

export interface MpgfCrecDeploymentAuditExpectedContext {
  id?: string;
  roundId: string;
  targetDeploymentMode: MpgfCrecDeploymentAuditTargetMode;
  calculationVersion: string;
  rulebookHash: string;
  feePolicyHash: string;
  sponsorPoolSourceHash: string;
  paymentReconciliationPathHash: string;
  optimizationPolicyHash: string;
  parametersFrozenAt: string;
}

export interface MpgfCrecDeploymentExposureCapInput {
  deploymentMode: MpgfCrecRoundClearingInputBundle["deploymentMode"];
  requestedGrossExposureCents: number;
  pilotMaxRoundGrossExposureCents: number | null;
  pilotMaxParticipantGrossExposureCents: number | null;
  remainingRoundDeploymentExposureCents: number | null;
  remainingParticipantDeploymentExposureCents: number | null;
}

export interface MpgfCrecDeploymentExposureCapResult {
  eligible: boolean;
  blockers: string[];
  cappedGrossExposureCents: number;
  bindingGrossExposureCents: number;
  shadowPreviewGrossExposureCents: number;
  bindingOutputAllowed: boolean;
  shadowOnly: boolean;
}

export interface MpgfCrecProjectHardGateInput {
  deploymentMode: MpgfCrecRoundClearingInputBundle["deploymentMode"];
  projectScopeState: MpgfCrecProjectScopeState;
  excludedTradeType: MpgfCrecExcludedTradeType | null;
  destinationRouteState: MpgfCrecDestinationRouteState;
  externalityState: MpgfCrecExternalityState;
  reviewState: MpgfCrecReviewState;
  challengeState: MpgfCrecChallengeState;
  conflictReviewState: MpgfCrecClearReviewState;
  sponsorCompatibilityState: MpgfCrecSponsorCompatibilityState;
  legalCustodyState: MpgfCrecClearReviewState;
  baselineIntegrityState: MpgfCrecBaselineIntegrityState;
  baselineConfidenceState: MpgfCrecBaselineConfidenceState;
  actionEvidenceState: MpgfCrecActionEvidenceState;
}

export interface MpgfCrecProjectHardGateResult extends MpgfCrecValidationResult {
  bindingOutputAllowed: boolean;
  shadowOnlyProvisionalLearningAllowed: boolean;
  hardGateHash: string | null;
}

export interface MpgfCrecProjectIdentityRouteGateInput {
  roundId: string;
  projectId: string;
  rulebookHash: string;
  parametersFrozenAt: string;
  selectedPublicGoodProjectRowCount: unknown;
  publicGoodProject: unknown;
  roundMoralBucketSnapshot: MpgfCrecRoundMoralBucketSnapshot | null | undefined;
}

export interface MpgfCrecProjectIdentityRouteGateResult extends MpgfCrecValidationResult {
  projectRowEligible: boolean;
  projectIdentityAndRouteValid: boolean;
  moralBucketSnapshotEligible: boolean;
  bucketPresentInFrozenSnapshot: boolean;
  projectId: string | null;
  projectBucketId: string | null;
  projectGoodType: MpgfCrecProjectGoodType | null;
  projectDestinationType: MpgfCrecProjectDestinationType | null;
  destinationRef: string | null;
  bindingOutputAllowed: boolean;
  matchingAllowed: boolean;
  authorizationAllowed: boolean;
  payoutAllowed: boolean;
  failureBonusQualificationAllowed: boolean;
}

export interface MpgfCrecProjectRoundEligibilitySnapshot {
  snapshotKind: "round_open";
  sourceCutoffAt: string;
  roundId: string;
  projectId: string;
  rulebookHash: string;
  eligibility: Record<MpgfCrecProjectEligibilityField, boolean>;
  createdAt: string;
  snapshotHash: string;
}

export interface MpgfCrecProjectRoundEligibilitySnapshotExpectedContext {
  roundId: string;
  projectId: string;
  rulebookHash: string;
  sourceCutoffAt: string;
}

export interface MpgfCrecAuthorizationReconciliationEvent {
  id: string;
  roundId: string;
  clearingIteration: number;
  participantId: string;
  projectId: string;
  conditionalTradeIntentId: string;
  custodyAuthorizationId: string | null;
  requiredAmountCents: number;
  authorizedAmountCents: number;
  removedAmountCents: number;
  authExpiresAt: string;
  expectedCaptureBy: string;
  reconciliationState: MpgfCrecAuthorizationReconciliationState;
  reasonCode: string;
  createdAt: string;
  eventHash: string;
}

export interface MpgfCrecAuthorizationReconciliationEventExpectedContext {
  roundId: string;
  participantId?: string;
  projectId?: string;
  conditionalTradeIntentId?: string;
}

export interface MpgfCrecFeeQuote {
  id: string;
  roundId: string;
  commonGroundBudgetId: string;
  projectId: string;
  conditionalTradeIntentId: string;
  feePolicyVersion: string;
  feePolicyHash: string;
  feePayer: MpgfCrecFeePayer;
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  sponsorFeeBackingHash: string | null;
  createdAt: string;
  quoteHash: string;
}

export interface MpgfCrecFeeQuoteExpectedContext {
  roundId: string;
  commonGroundBudgetId?: string;
  projectId?: string;
  conditionalTradeIntentId?: string;
  feePolicyVersion: string;
  feePolicyHash: string;
  sponsorPoolSourceHash?: string;
  positiveAllocationRequired?: boolean;
}

export interface MpgfCrecSponsorPaidFeeSupportDemandResult {
  eligible: boolean;
  selectedFeeQuoteCount: number;
  demandCents: number;
  demandCentsExact: string;
  blockers: string[];
}

export interface MpgfCrecOptimizationRunTrace {
  id: string;
  roundId: string;
  clearingInputBundleId: string;
  clearingInputBundleHash: string;
  calculationVersion: string;
  optimizationStage: MpgfCrecOptimizationStage;
  traceSchemaVersion: string;
  optimizationPolicyHash: string;
  selectedForBinding: boolean;
  solverMode: MpgfCrecSolverMode;
  solverVersion: string;
  optimalityStatus: MpgfCrecOptimalityStatus | "timeout" | "infeasible" | "unknown" | "failed";
  optimizationInputHash: string;
  objectiveVectorHash: string;
  stableTieBreakTupleHash: string;
  selectedCoalitionHash: string;
  successRewardInputHash: string;
  coordinationCreditInputHash: string;
  impactCertificateInputHash: string;
  selectedAllocationRowsHash: string;
  constraintSatisfactionHash: string;
  createdAt: string;
  optimizationTraceHash: string;
}

export interface MpgfCrecOptimizationRunTraceExpectedContext {
  roundId: string;
  clearingInputBundleId: string;
  clearingInputBundleHash: string;
  calculationVersion: string;
  optimizationPolicyHash: string;
  successRewardInputHash: string;
  coordinationCreditInputHash: string;
  impactCertificateInputHash: string;
}

export interface MpgfCrecOptimizationRunTraceSelectionResult extends MpgfCrecValidationResult {
  selectedTraceCount: number;
  selectedTraceId: string | null;
  selectedTraceHash: string | null;
}

export interface MpgfCrecRoundAuditBundle {
  id: string;
  roundId: string;
  rulebookHash: string;
  calculationVersion: string;
  clearingInputBundleId: string;
  clearingInputBundleHash: string;
  canonicalInputJsonHash: string;
  feeInputHash: string;
  feePolicyHash: string;
  deploymentExposureInputHash: string;
  paymentReconciliationPathHash: string;
  deploymentAuditHash: string | null;
  optimizationPolicyHash: string;
  optimizationTraceId: string;
  optimizationTraceHash: string;
  projectInputHash: string;
  sponsorCommitmentInputHash: string;
  moralBucketSnapshotHash: string;
  bonusScoreHash: string;
  createdAt: string;
  auditBundleHash: string;
}

export interface MpgfCrecRoundAuditBundleExpectedContext {
  roundId: string;
  rulebookHash: string;
  calculationVersion: string;
  clearingInputBundleId: string;
  clearingInputBundleHash: string;
  canonicalInputJsonHash: string;
  feeInputHash: string;
  feePolicyHash: string;
  deploymentExposureInputHash: string;
  paymentReconciliationPathHash: string;
  deploymentAuditHash: string | null;
  optimizationPolicyHash: string;
  optimizationTraceId: string;
  optimizationTraceHash: string;
  projectInputHash: string;
  sponsorCommitmentInputHash: string;
  moralBucketSnapshotHash: string;
  bonusScoreHash: string;
}

export interface MpgfCrecBonusScoreUnitRow {
  projectId: string;
  bonusScoreUnits: string;
  bonusCapCents: number;
  stableOrderKey: string;
}

export interface MpgfCrecBonusScoreHashInput {
  calculationVersion: string;
  fixedPointPrecision: typeof MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_PRECISION;
  roundingMode: typeof MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_ROUNDING_MODE;
  rows: Array<{
    projectId: string;
    bonusScoreUnits: string;
  }>;
}

export interface MpgfCrecBonusScoreUnitAllocationInput {
  roundId: string;
  clearingInputBundleHash: string;
  bonusScoreHash: string;
  calculationVersion: string;
  backedBonusMatchPoolCents: number;
  rows: MpgfCrecBonusScoreUnitRow[];
}

export interface MpgfCrecBonusScoreUnitAllocationResult extends MpgfCrecValidationResult {
  allocatedBonusCentsByProjectId: Record<string, number>;
  sanitizedBonusScoreUnitsByProjectId: Record<string, string>;
  sanitizedBonusCapCentsByProjectId: Record<string, number>;
  sanitizedRowCodes: string[];
  totalAllocatedCents: number;
  unallocatedBonusPoolCents: number;
  totalBonusScoreUnitsExact: string;
}

export interface MpgfCrecBundlePublicGoodProjectRow {
  roundId: string;
  id: string;
  bucketId: string;
}

export interface MpgfCrecBundleCommonGroundBudgetRow {
  roundId: string;
  id: string;
  participantId: string;
}

export interface MpgfCrecCommonGroundBudgetAllocationInput {
  roundId: string;
  participantId: string;
  rulebookHash: string;
  selectedCommonGroundBudgetByIdRowCount: unknown;
  selectedCommonGroundBudgetByParticipantRowCount: unknown;
  commonGroundBudget: unknown;
}

export interface MpgfCrecCommonGroundBudgetAllocationResult {
  commonGroundBudgetRowEligible: boolean;
  commonGroundBudgetId: string | null;
  commonGroundBudgetParticipantId: string | null;
  safeCommonGroundBudgetTotalCents: number;
  safeCommonGroundBudgetPerProjectCapCents: number;
  commonGroundBudgetCapsValid: boolean;
  budgetPeriod: MpgfCrecBudgetPeriod | null;
  budgetPeriodEligible: boolean;
  recurringBudgetConsentEligible: boolean;
  budgetFallbackRule: MpgfCrecFallbackRule | null;
  budgetFallbackRuleEligible: boolean;
  rulebookConsentEligible: boolean;
  stateAllowsAllocation: boolean;
  budgetEligible: boolean;
  allocatableCents: number;
  paymentSnapshotLookupAllowed: boolean;
  paymentSnapshotLookupKey: {
    roundId: string;
    commonGroundBudgetId: string;
    snapshotKind: "round_close";
  } | null;
  exposesPaymentAuthority: false;
  rowFailureCodes: string[];
}

export interface MpgfCrecBundleProjectParticipantRow {
  id: string;
  roundId: string;
  commonGroundBudgetId: string;
  projectId: string;
  participantId: string;
}

export interface MpgfCrecSupportStanceAllocationInput {
  roundId: string;
  commonGroundBudgetId: string;
  participantId: string;
  projectId: string;
  commonGroundBudgetTotalCents: unknown;
  supportStance: unknown;
}

export interface MpgfCrecSupportStanceAllocationResult {
  supportStanceInputEligible: boolean;
  effectiveStance: MpgfCrecSupportStance;
  supportStanceId: string | null;
  supportStanceMaxAllocCents: number;
  supportStanceMaxAllocBps: number | null;
  supportStanceCapsValid: boolean;
  stanceCapCents: number;
  allocatableCents: number;
  acceptableCounterBucketIds: string[];
  exposesCounterpartyBuckets: boolean;
  exposesPaymentAuthority: false;
  rankOrder: number | null;
  unrestrictedRoutingOptIn: boolean;
  defaultedToAbstain: boolean;
  rowFailureCodes: string[];
}

export interface MpgfCrecPlainStanceLabelResolutionResult {
  labelEligible: boolean;
  plainLabel: MpgfCrecPlainStanceLabel | null;
  canonicalStance: MpgfCrecSupportStance | null;
  allocatableAfterExplicitSave: boolean;
  counterpartyConditionRequired: boolean;
  reviewPressureOnly: boolean;
  zeroAllocationRequired: boolean;
  defaultSkip: boolean;
  finalReviewCanonicalDisclosureRequired: true;
  explicitSaveRequiredBeforeAllocation: true;
  canonicalEffectDescription: string | null;
  rowFailureCodes: string[];
}

export interface MpgfCrecConditionalIntentAllocationInput {
  roundId: string;
  commonGroundBudgetId: string;
  participantId: string;
  projectId: string;
  rulebookHash: string;
  budgetFallbackRule: unknown;
  selectedConditionalTradeIntentRowCount: unknown;
  conditionalTradeIntent: unknown;
}

export interface MpgfCrecConditionalIntentAllocationResult {
  conditionalIntentRowEligible: boolean;
  conditionalTradeIntentId: string | null;
  conditionalIntentState: MpgfCrecConditionalIntentState | "malformed" | null;
  authorizationState: MpgfCrecConditionalIntentAuthorizationState | "malformed" | null;
  authorizationStateEligible: boolean;
  fallbackRule: MpgfCrecFallbackRule | null;
  fallbackRuleEligible: boolean;
  budgetAndIntentFallbackRuleConsistent: boolean;
  rulebookConsentEligible: boolean;
  conditionalIntentAmountCents: number;
  conditionalIntentMaxExposureCents: number;
  conditionalIntentMinCounterpartyVolumeCents: number;
  acceptableCounterBucketIds: string[];
  conditionalIntentEligible: boolean;
  intentCapCents: number;
  crossViewIntentEligible: boolean;
  exposesFallbackAuthority: boolean;
  exposesAuthorizationAuthority: boolean;
  exposesCounterpartyBuckets: boolean;
  failureBonusEligibilityInputsAllowed: boolean;
  rowFailureCodes: string[];
}

export interface MpgfCrecCounterpartyVolumeCandidateRow {
  roundId: string;
  projectId: string;
  participantId: string;
  counterpartyParticipantId: string;
  counterpartyBucketId: string;
  counterpartyVolumeSource: MpgfCrecCounterpartyVolumeSource;
  netRecipientDisbursedCents: number;
  matchEligibleCents: number;
  counterpartyHumanVerified: boolean;
  counterpartySybilRiskState: MpgfCrecIdentityRiskState;
  counterpartyCollusionRiskState: MpgfCrecIdentityRiskState;
  participantLinkedAccountClusterId: string;
  counterpartyLinkedAccountClusterId: string;
  participantSamePaymentMethodClusterId: string;
  counterpartySamePaymentMethodClusterId: string;
  participantSameControlEntityId: string;
  counterpartySameControlEntityId: string;
}

export interface MpgfCrecCounterpartyVolumeSatisfactionInput {
  roundId: string;
  projectId: string;
  participantId: string;
  projectBucketId: string;
  conditionalIntentMinCounterpartyVolumeCents: unknown;
  acceptableCounterBucketIds: unknown;
  frozenReciprocalCounterBucketIds: unknown;
  rows: unknown;
}

export interface MpgfCrecCounterpartyVolumeSatisfactionResult extends MpgfCrecValidationResult {
  conditionalIntentMinCounterpartyVolumeCents: number;
  validatedCounterBucketIds: string[];
  countedCounterpartyVolumeCents: number;
  counterpartyVolumeSatisfied: boolean;
  countedCounterpartyParticipantIds: string[];
  excludedRowCodes: string[];
}

export interface MpgfCrecAllocatorStateInput {
  roundId: string;
  participantId: string;
  projectId: string;
  participantRemainingBudgetCentsByRoundAndParticipantId: unknown;
  projectRemainingRequestedCapCentsByRoundAndProjectId: unknown;
}

export interface MpgfCrecAllocatorStateResult {
  participantRemainingRoundBudgetCents: number;
  projectRemainingRequestedCapCents: number;
  participantRemainingLookupKey: {
    roundId: string;
    participantId: string;
  } | null;
  projectRemainingLookupKey: {
    roundId: string;
    projectId: string;
  } | null;
  allocatorStateEligible: boolean;
  actualAllocationCapCents: number;
  wrongRoundRowsIgnored: true;
  rowFailureCodes: string[];
}

export interface MpgfCrecBundleIdentityEligibilityRow {
  roundId: string;
  participantId: string;
}

export interface MpgfCrecIdentityEligibilityAllocationInput {
  roundId: string;
  participantId: string;
  selectedIdentityEligibilityRowCount: unknown;
  identityEligibility: unknown;
  identityWeightMinForCountingBps: unknown;
  identityWeightMinForBonusBps: unknown;
}

export interface MpgfCrecIdentityEligibilityAllocationResult {
  identityEligibilityRowEligible: boolean;
  identityWeightBps: number;
  identityWeightMinForCountingBps: number;
  identityWeightMinForBonusBps: number;
  humanVerified: boolean;
  sybilRiskState: MpgfCrecIdentityRiskState | "malformed";
  collusionRiskState: MpgfCrecIdentityRiskState | "malformed";
  identityCountingClear: boolean;
  countedContributionAllowed: boolean;
  verifiedSupporterCountAllowed: boolean;
  activeClusterCountAllowed: boolean;
  counterpartyVolumeAllowed: boolean;
  sponsorMatchEligible: boolean;
  failureBonusEligible: boolean;
  rowFailureCodes: string[];
}

export interface MpgfCrecEconomicInputSanitizationInput {
  roundId: string;
  projectId: string;
  selectedPublicGoodProjectRowCount: unknown;
  roundBaseMatchBudgetCents: unknown;
  roundBonusMatchBudgetCents: unknown;
  roundFailureBonusBudgetCents: unknown;
  publicGoodProject: unknown;
}

export interface MpgfCrecEconomicInputSanitizationResult {
  safeRoundBaseMatchBudgetCents: number;
  safeRoundBonusMatchBudgetCents: number;
  safeRoundFailureBonusBudgetCents: number;
  totalSponsorPayoutAvailabilityCents: number;
  baseMatchAvailabilityCents: number;
  bonusMatchAvailabilityCents: number;
  failureBonusAvailabilityCents: number;
  roundSponsorBudgetInputsValid: boolean;
  projectEconomicTermsRowEligible: boolean;
  projectEconomicTermsValid: boolean;
  projectClearingAllowed: boolean;
  projectId: string | null;
  projectBucketId: string | null;
  safeRequestedMaxCents: number;
  safeMinimumViableCents: number;
  safeThresholdAmountCents: number;
  safeThresholdSupporterMin: number;
  safeThresholdClusterMin: number;
  defaultBaseMatchRatioBps: number;
  defaultBonusCapMultipleBps: number;
  safeBaseMatchRatioBps: number;
  safeBonusCapMultipleBps: number;
  baseMatchRatioDefaulted: boolean;
  bonusCapMultipleDefaulted: boolean;
  rowFailureCodes: string[];
}

export interface MpgfCrecRoundCloseBundleRowUniquenessInput {
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  paymentSnapshotKind: "round_close" | "early_failure_bonus_cutoff";
  publicGoodProjects: unknown;
  commonGroundBudgets: unknown;
  supportStances: unknown;
  conditionalTradeIntents: unknown;
  identityEligibilityRows: unknown;
  paymentCommitmentSnapshots: unknown;
  projectRoundEligibilitySnapshots: unknown;
}

export interface MpgfCrecRoundCloseBundleRowUniquenessResult extends MpgfCrecValidationResult {
  selectedProjectRowCount: number;
  selectedCommonGroundBudgetByIdCount: number;
  selectedCommonGroundBudgetByParticipantCount: number;
  selectedSupportStanceRowCount: number;
  selectedConditionalTradeIntentRowCount: number;
  selectedIdentityEligibilityRowCount: number;
  selectedPaymentCommitmentSnapshotRowCount: number;
  selectedProjectRoundEligibilitySnapshotRowCount: number;
  rowUniquenessHash: string | null;
}

export interface MpgfCrecNetPublicGoodSupporterCreditRow {
  roundId: string;
  projectId: string;
  participantId: string;
  activeClusterId: string;
  netRecipientDisbursedCents: number;
  humanVerified: boolean;
  sybilRiskState: "clear" | "review" | "blocked" | "unknown";
  collusionRiskState: "clear" | "review" | "blocked" | "unknown";
  linkedAccountExcluded: boolean;
  samePaymentMethodExcluded: boolean;
  sameControlExcluded: boolean;
}

export interface MpgfCrecNetPublicGoodSupporterBreadthInput {
  roundId: string;
  projectId: string;
  supporterCountMinNetPublicGoodCents: unknown;
  rows: unknown;
}

export interface MpgfCrecNetPublicGoodSupporterBreadthResult extends MpgfCrecValidationResult {
  supporterCountMinNetPublicGoodCents: number;
  verifiedSupporterCount: number;
  activeClusterCount: number;
  countedParticipantIds: string[];
  countedActiveClusterIds: string[];
  excludedRowCodes: string[];
}

export interface MpgfCrecContributorBenefitEligibilityInput {
  benefitKind: MpgfCrecContributorBenefitKind;
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  rulebookHash: string;
  clearingInputBundleEligible: boolean;
  clearingInputBundleHash: string;
  paymentSnapshotEligible: boolean;
  paymentCommitmentSnapshotHash: string;
  feeQuoteHash: string;
  contributionRowHash: string;
  roundStatus: "draft" | "open" | "locked" | "frozen" | "reviewing" | "cleared" | "payable" | "released" | "closed" | "canceled";
  capturedContributionState: "captured" | "authorized" | "failed" | "released" | "preview";
  authorizationReconciled: boolean;
  participantSignedBeforeClose: boolean;
  lockedPreCloseIntent: boolean;
  consentValid: boolean;
  humanVerified: boolean;
  sybilRiskState: "clear" | "review" | "blocked";
  collusionRiskState: "clear" | "review" | "blocked";
  linkedAccountExcluded: boolean;
  samePaymentMethodExcluded: boolean;
  sameControlExcluded: boolean;
  claimantConflictState: "no_conflict" | "conflict_review" | "conflict_blocked" | "unknown";
  projectScopeState: MpgfCrecProjectScopeState;
  excludedTradeType: MpgfCrecExcludedTradeType | null;
  externalityState: "clear" | "review" | "blocked" | "unknown";
  reviewState: "approved" | "review" | "blocked" | "unknown";
  challengeState: "clear" | "non_blocking" | "open" | "blocking" | "unknown";
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  capturedAt: string;
}

export interface MpgfCrecContributorBenefitEligibilityResult extends MpgfCrecValidationResult {
  benefitContextHash: string | null;
}

export interface MpgfCrecSuccessRewardClaimInput {
  eligibility: MpgfCrecContributorBenefitEligibilityInput;
  successRewardPolicyVersion: string;
  rewardCents: number;
  roundSuccessRewardBudgetCents: number;
  backedSuccessRewardPoolCents: number;
  dominanceClaimShown: boolean;
  maximumPromisedRewardLiabilityCents: number;
}

export interface MpgfCrecSuccessRewardClaimResult extends MpgfCrecValidationResult {
  rewardCents: number;
  claimHash: string | null;
}

export interface MpgfCrecCoordinationCreditLedgerEntry {
  id: string;
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  creditKind: MpgfCrecCoordinationCreditKind;
  nonTransferable: boolean;
  affectsCountedDollars: boolean;
  affectsMatchEligibility: boolean;
  affectsCounterpartyVolume: boolean;
  affectsSupporterCounts: boolean;
  affectsClusterCounts: boolean;
  affectsIdentityWeight: boolean;
  affectsVotingPower: boolean;
  affectsAllocationPower: boolean;
  benefitContextHash: string;
  createdAt: string;
  ledgerEntryHash: string;
}

export interface MpgfCrecImpactCertificateClaim {
  id: string;
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  rulebookHash: string;
  clearingInputBundleHash: string;
  paymentCommitmentSnapshotHash: string;
  feeQuoteHash: string;
  contributionRowHash: string;
  netRecipientDisbursedCents: number;
  capturedAt: string;
  retroactiveAccessAllowed: boolean;
  doubleCountPreventionHash: string;
  createdAt: string;
  certificateHash: string;
}

export interface MpgfCrecSponsorCommitment {
  id: string;
  roundId: string;
  poolType: MpgfCrecSponsorPoolType;
  commitmentState: MpgfCrecSponsorBackingState | "pledged" | "canceled" | "expired";
  committedCents: number;
  fundedCents: number;
  sourceHash: string;
  publishedAt: string;
  backingConfirmedAt: string;
}

export interface MpgfCrecSponsorBackingContext {
  roundId: string;
  poolType: MpgfCrecSponsorPoolType;
  sponsorPoolSourceHash: string;
  parametersFrozenAt: string;
  opensAt: string;
  previewAsOf?: string;
  clearingBundleEligible?: boolean;
}

export interface MpgfCrecSponsorBackingResult {
  backedCents: number;
  backedCentsExact: string;
  includedCommitmentCount: number;
  excludedCommitmentCount: number;
  blockers: string[];
}

export interface MpgfCrecFailureBonusClaimantConflictSnapshot {
  id: string;
  snapshotKind: "failure_bonus_claimant_conflict";
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  rulebookHash: string;
  failureBonusPolicyVersion: string;
  sourceCutoffAt: string;
  conflictState: MpgfCrecFailureBonusClaimantConflictState;
  createdAt: string;
  snapshotHash: string;
}

export interface MpgfCrecFailureBonusClaimantConflictSnapshotExpectedContext {
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  rulebookHash: string;
  failureBonusPolicyVersion: string;
  sourceCutoffAt: string;
}

export interface MpgfCrecFailureBonusEligibilityInput {
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  failureBonusPolicyVersion: string;
  roundStatus: "draft" | "open" | "locked" | "frozen" | "reviewing" | "cleared" | "payable" | "released" | "closed" | "canceled";
  projectFailed: boolean;
  failureReason: string;
  clearingBundleEligible: boolean;
  clearingInputBundleHash: string;
  projectHardGateEligible: boolean;
  projectHardGateHash: string;
  rowUniquenessEligible: boolean;
  rowUniquenessHash: string;
  paymentSnapshotEligible: boolean;
  paymentCommitmentSnapshotHash: string;
  failedQualifiedMatchEligibleCents: number;
  participantRoundFailureBonusCapCents: number;
  roundFailureBonusBudgetCents: number;
  backedFailureBonusPoolCents: number;
  totalSponsorBudgetCents: number;
  claimantConflictSnapshotEligible: boolean;
  claimantConflictSnapshotId: string;
  claimantConflictSnapshotHash: string;
  claimantConflictSourceCutoff: string;
  claimantConflictState: MpgfCrecFailureBonusClaimantConflictState;
}

export interface MpgfCrecFailureBonusEligibilityResult {
  qualified: boolean;
  blockers: string[];
  claimKey: string | null;
  rawBonusCents: number;
  participantCappedProvisionalBonusCents: number;
  backedAvailableFailureBonusPoolCents: number;
  eligibilityInputsHash: string | null;
}

export interface MpgfCrecFailureBonusClaimRecord {
  id: string;
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  failureBonusPolicyVersion: string;
  claimState: MpgfCrecFailureBonusClaimState;
  denialReason: string | null;
  payoutRef: string | null;
  resolvedAt: string | null;
  createdAt: string;
  failureReason: string;
  clearingInputBundleHash: string;
  paymentCommitmentSnapshotHash: string;
  projectRoundEligibilitySnapshotHash: string;
  claimantConflictSnapshotId: string;
  claimantConflictSnapshotHash: string;
  claimantConflictState: MpgfCrecFailureBonusClaimantConflictState;
  claimantConflictSourceCutoff: string;
  earlyFailureBonusCutoff: string;
  paymentMethodSavedAt: string;
  paymentMethodConfirmedAt: string;
  failedQualifiedMatchEligibleCents: number;
  rawBonusCents: number;
  participantRoundCapCents: number;
  participantCappedProvisionalBonusCents: number;
  bonusCents: number;
  finalFailureBonusCents: number;
  prorationFactorBps: number;
  eligibilityInputsHash: string;
}

export interface MpgfCrecFailureBonusClaimListContext {
  roundId: string;
  failureBonusPolicyVersion: string;
  roundStatus: unknown;
  backedFailureBonusPoolCents: number;
  earlyFailureBonusCutoff: string;
  claimantConflictSourceCutoff: string;
  externalFailedQualifiedMatchEligibleCentsByClaimId?: Record<string, number>;
  externalParticipantCappedProvisionalBonusCentsByClaimId?: Record<string, number>;
}

export interface MpgfCrecFailureBonusClaimListResult {
  eligible: boolean;
  blockers: string[];
  claims: MpgfCrecFailureBonusClaimRecord[];
  claimIds: string[];
}

export interface MpgfCrecFailureBonusProratedClaim extends MpgfCrecFailureBonusClaimRecord {
  participantProrationStableOrderKey: string;
  roundProrationStableOrderKey: string;
}

export interface MpgfCrecFailureBonusProrationResult {
  eligible: boolean;
  blockers: string[];
  claims: MpgfCrecFailureBonusProratedClaim[];
  claimIds: string[];
  participantRawBonusTotalCentsByParticipantId: Record<string, string>;
  participantProrationFactorBpsByParticipantId: Record<string, number>;
  aggregateParticipantCappedProvisionalCents: string;
  targetPayoutCents: number;
  roundProrationFactorBps: number;
}

export type MpgfCrecFailureBonusClaimCreationMode =
  | "qualified_payout_path"
  | "intake_only_review";

export interface MpgfCrecFailureBonusClaimCreationInput {
  existingClaims: readonly MpgfCrecFailureBonusClaimRecord[];
  creationMode: MpgfCrecFailureBonusClaimCreationMode;
  roundStatus: unknown;
  backedFailureBonusPoolCents: number;
  failureBonusEligibilityQualified: boolean;
  projectFailed: boolean;
  id: string;
  roundId: string;
  projectId: string;
  participantId: string;
  commonGroundBudgetId: string;
  conditionalTradeIntentId: string;
  failureBonusPolicyVersion: string;
  failureReason: string;
  clearingInputBundleHash: string;
  paymentCommitmentSnapshotHash: string;
  projectRoundEligibilitySnapshotHash: string;
  claimantConflictSnapshotId: string;
  claimantConflictSnapshotHash: string;
  claimantConflictState: MpgfCrecFailureBonusClaimantConflictState;
  claimantConflictSourceCutoff: string;
  earlyFailureBonusCutoff: string;
  paymentMethodSavedAt: string;
  paymentMethodConfirmedAt: string;
  failedQualifiedMatchEligibleCents: number;
  createdAt: string;
}

export interface MpgfCrecFailureBonusClaimCreationResult {
  eligible: boolean;
  action: "create" | "noop_replay" | "manual_review";
  blockers: string[];
  idempotencyKey: string | null;
  claim: MpgfCrecFailureBonusClaimRecord | null;
}

export interface MpgfCrecFailureBonusClaimSettlementInput {
  claim: MpgfCrecFailureBonusClaimRecord;
  context: MpgfCrecFailureBonusClaimListContext;
  settlementState: "paid" | "credited";
  payoutRef: string;
  resolvedAt: string;
}

export interface MpgfCrecFailureBonusClaimSettlementResult {
  eligible: boolean;
  blockers: string[];
  claim: MpgfCrecFailureBonusClaimRecord | null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(entries.map(([key, entryValue]) => [key, canonicalize(entryValue)]));
  }

  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function hashMpgfCrecV1125Value(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function isMpgfCrecCanonicalHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

export function isMpgfCrecNonEmptyTrimStableString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

export function isMpgfCrecCanonicalUtcTimestamp(value: unknown): value is string {
  return (
    isMpgfCrecNonEmptyTrimStableString(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function timestampLte(left: unknown, right: unknown) {
  return (
    isMpgfCrecCanonicalUtcTimestamp(left) &&
    isMpgfCrecCanonicalUtcTimestamp(right) &&
    Date.parse(left) <= Date.parse(right)
  );
}

function timestampLt(left: unknown, right: unknown) {
  return (
    isMpgfCrecCanonicalUtcTimestamp(left) &&
    isMpgfCrecCanonicalUtcTimestamp(right) &&
    Date.parse(left) < Date.parse(right)
  );
}

function timestampEquals(left: unknown, right: unknown) {
  return isMpgfCrecCanonicalUtcTimestamp(left) && left === right;
}

function isNonNegativeSafeIntegerCents(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isPositiveSafeIntegerCents(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function isValidBps(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value <= 10_000;
}

function isValidProjectMatchBps(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value <= 100_000;
}

function floorMulDivNonNegativeSafeInteger(value: number, numerator: number, denominator: number) {
  return Number((BigInt(value) * BigInt(numerator)) / BigInt(denominator));
}

function hasDuplicate(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function isTrimStableStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isMpgfCrecNonEmptyTrimStableString) &&
    !hasDuplicate(value)
  );
}

function stableStringArray(value: readonly string[]) {
  return [...value].sort((left, right) => left.localeCompare(right));
}

export function minMpgfCrecNonNegativeSafeInteger(...values: unknown[]) {
  if (values.length === 0 || !values.every(isNonNegativeSafeIntegerCents)) {
    return 0;
  }

  return Math.min(...values);
}

export function intersectMpgfCrecTrimStableStringArrays(...arrays: unknown[]) {
  if (arrays.length === 0 || !arrays.every(isTrimStableStringArray)) {
    return [];
  }

  const [firstArray, ...remainingArrays] = arrays as string[][];
  const intersection = firstArray.filter((value) =>
    remainingArrays.every((array) => array.includes(value)),
  );

  return stableStringArray(intersection);
}

export function sumMpgfCrecNonNegativeBigInt(values: unknown) {
  if (
    !Array.isArray(values) ||
    !values.every(
      (value) =>
        (typeof value === "bigint" && value >= BigInt(0)) ||
        isNonNegativeSafeIntegerCents(value),
    )
  ) {
    return BigInt(0);
  }

  return values.reduce(
    (sum, value) => sum + (typeof value === "bigint" ? value : BigInt(value)),
    BigInt(0),
  );
}

function stableBucketMap(value: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, stableStringArray(values)]),
  );
}

function asObjectRow(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function validationResult(blockers: string[]): MpgfCrecValidationResult {
  return {
    eligible: blockers.length === 0,
    blockers,
  };
}

function addBlocker(blockers: string[], code: string, condition: boolean) {
  if (!condition) {
    blockers.push(code);
  }
}

const MPGF_PUBLIC_GOODS_CRECM_V1125_PAYABLE_SIDE_EFFECT_OPERATIONS = new Set<MpgfCrecRoundStatusOperation>([
  "stage7_fallback_execution",
  "authorization_cancel_release",
  "reroute",
  "carry_forward",
  "capture",
  "release",
  "payment",
  "failure_bonus_claim_creation",
  "failure_bonus_claim_advancement",
  "failure_bonus_claim_field_mutation",
  "failure_bonus_crediting",
  "failure_bonus_payment",
]);

const MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_MUTATION_OPERATIONS = new Set<MpgfCrecRoundStatusOperation>([
  "failure_bonus_claim_creation",
  "failure_bonus_claim_advancement",
  "failure_bonus_claim_field_mutation",
  "failure_bonus_crediting",
  "failure_bonus_payment",
]);

function isMpgfCrecRoundStatus(value: unknown): value is MpgfCrecRoundStatus {
  return (MPGF_PUBLIC_GOODS_CRECM_V1125_ROUND_STATUSES as readonly unknown[]).includes(value);
}

export function validateMpgfCrecRoundMetadataGate(
  input: MpgfCrecRoundMetadataGateInput,
): MpgfCrecRoundMetadataGateResult {
  const blockers: string[] = [];

  addBlocker(blockers, "round_metadata_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "round_metadata_rulebook_hash_invalid", isMpgfCrecCanonicalHash(input.rulebookHash));
  addBlocker(
    blockers,
    "round_metadata_sponsor_pool_source_hash_invalid",
    isMpgfCrecCanonicalHash(input.sponsorPoolSourceHash),
  );
  addBlocker(
    blockers,
    "round_metadata_payment_reconciliation_path_hash_invalid",
    isMpgfCrecCanonicalHash(input.paymentReconciliationPathHash),
  );
  addBlocker(
    blockers,
    "round_metadata_calculation_version_invalid",
    isMpgfCrecNonEmptyTrimStableString(input.calculationVersion),
  );
  addBlocker(
    blockers,
    "round_metadata_failure_bonus_policy_version_invalid",
    isMpgfCrecNonEmptyTrimStableString(input.failureBonusPolicyVersion),
  );
  addBlocker(
    blockers,
    "round_metadata_parameters_frozen_at_invalid",
    isMpgfCrecCanonicalUtcTimestamp(input.parametersFrozenAt),
  );
  addBlocker(blockers, "round_metadata_opens_at_invalid", isMpgfCrecCanonicalUtcTimestamp(input.opensAt));
  addBlocker(
    blockers,
    "round_metadata_early_failure_bonus_cutoff_invalid",
    isMpgfCrecCanonicalUtcTimestamp(input.earlyFailureBonusCutoff),
  );
  addBlocker(
    blockers,
    "round_metadata_review_freeze_at_invalid",
    isMpgfCrecCanonicalUtcTimestamp(input.reviewFreezeAt),
  );
  addBlocker(blockers, "round_metadata_closes_at_invalid", isMpgfCrecCanonicalUtcTimestamp(input.closesAt));
  addBlocker(
    blockers,
    "round_metadata_challenge_deadline_invalid",
    isMpgfCrecCanonicalUtcTimestamp(input.challengeDeadline),
  );
  addBlocker(
    blockers,
    "round_metadata_parameters_frozen_after_open",
    timestampLte(input.parametersFrozenAt, input.opensAt),
  );
  addBlocker(
    blockers,
    "round_metadata_open_after_early_failure_bonus_cutoff",
    timestampLte(input.opensAt, input.earlyFailureBonusCutoff),
  );
  addBlocker(
    blockers,
    "round_metadata_early_failure_bonus_cutoff_after_review_freeze",
    timestampLte(input.earlyFailureBonusCutoff, input.reviewFreezeAt),
  );
  addBlocker(
    blockers,
    "round_metadata_open_not_before_review_freeze",
    timestampLt(input.opensAt, input.reviewFreezeAt),
  );
  addBlocker(
    blockers,
    "round_metadata_review_freeze_not_before_close",
    timestampLt(input.reviewFreezeAt, input.closesAt),
  );
  addBlocker(
    blockers,
    "round_metadata_close_not_before_challenge_deadline",
    timestampLt(input.closesAt, input.challengeDeadline),
  );

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    roundId: isMpgfCrecNonEmptyTrimStableString(input.roundId) ? input.roundId : null,
    parametersFrozenAt: isMpgfCrecCanonicalUtcTimestamp(input.parametersFrozenAt)
      ? input.parametersFrozenAt
      : null,
    opensAt: isMpgfCrecCanonicalUtcTimestamp(input.opensAt) ? input.opensAt : null,
    earlyFailureBonusCutoff: isMpgfCrecCanonicalUtcTimestamp(input.earlyFailureBonusCutoff)
      ? input.earlyFailureBonusCutoff
      : null,
    reviewFreezeAt: isMpgfCrecCanonicalUtcTimestamp(input.reviewFreezeAt)
      ? input.reviewFreezeAt
      : null,
    closesAt: isMpgfCrecCanonicalUtcTimestamp(input.closesAt) ? input.closesAt : null,
    challengeDeadline: isMpgfCrecCanonicalUtcTimestamp(input.challengeDeadline)
      ? input.challengeDeadline
      : null,
    rulebookHash: isMpgfCrecCanonicalHash(input.rulebookHash) ? input.rulebookHash : null,
    sponsorPoolSourceHash: isMpgfCrecCanonicalHash(input.sponsorPoolSourceHash)
      ? input.sponsorPoolSourceHash
      : null,
    paymentReconciliationPathHash: isMpgfCrecCanonicalHash(input.paymentReconciliationPathHash)
      ? input.paymentReconciliationPathHash
      : null,
    calculationVersion: isMpgfCrecNonEmptyTrimStableString(input.calculationVersion)
      ? input.calculationVersion
      : null,
    failureBonusPolicyVersion: isMpgfCrecNonEmptyTrimStableString(input.failureBonusPolicyVersion)
      ? input.failureBonusPolicyVersion
      : null,
    lockAllowed: eligible,
    clearingAllowed: eligible,
    matchingAllowed: eligible,
    authorizationAllowed: eligible,
    failureBonusQualificationAllowed: eligible,
  };
}

export function evaluateMpgfCrecRoundStatusGate(
  input: MpgfCrecRoundStatusGateInput,
): MpgfCrecRoundStatusGateResult {
  const blockers: string[] = [];
  const roundStatus = isMpgfCrecRoundStatus(input.roundStatus) ? input.roundStatus : null;
  const resultReplayOperation =
    input.operation === "final_binding_result" ||
    input.operation === "deterministic_replay" ||
    input.operation === "failure_bonus_qualification_review" ||
    input.operation === "audit_output";
  const payableSideEffectOperation = MPGF_PUBLIC_GOODS_CRECM_V1125_PAYABLE_SIDE_EFFECT_OPERATIONS.has(input.operation);
  const failureBonusMutationOperation =
    MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_MUTATION_OPERATIONS.has(input.operation);
  const previewOnlyOperation =
    input.operation === "setup_display" ||
    input.operation === "internal_review_calculation" ||
    input.operation === "non_binding_preview";

  addBlocker(blockers, "round_status_malformed", roundStatus != null);
  addBlocker(blockers, "round_safety_freeze_active", input.publicSafetyFreezeActive !== true);
  addBlocker(blockers, "round_cancellation_active", input.cancellationActive !== true);

  if (roundStatus != null) {
    if (resultReplayOperation) {
      addBlocker(
        blockers,
        "round_status_not_result_replay_allowed",
        (MPGF_PUBLIC_GOODS_CRECM_V1125_RESULT_REPLAY_STATUSES as readonly MpgfCrecRoundStatus[]).includes(roundStatus),
      );
    }

    if (input.operation === "new_authorization_attempt") {
      addBlocker(blockers, "round_status_not_cleared_for_authorization", roundStatus === "cleared");
    }

    if (payableSideEffectOperation) {
      addBlocker(blockers, "round_status_not_payable_for_side_effect", roundStatus === "payable");
    }

    if (failureBonusMutationOperation) {
      addBlocker(
        blockers,
        "failure_bonus_backed_pool_not_positive_for_mutation",
        isPositiveSafeIntegerCents(input.backedFailureBonusPoolCents),
      );
    }

    if (previewOnlyOperation) {
      addBlocker(
        blockers,
        "round_status_not_preview_allowed",
        (MPGF_PUBLIC_GOODS_CRECM_V1125_PREVIEW_ONLY_STATUSES as readonly MpgfCrecRoundStatus[]).includes(roundStatus),
      );
    }
  }

  const allowed = blockers.length === 0;

  return {
    allowed,
    blockers,
    operation: input.operation,
    roundStatus,
    stateMutationAllowed: allowed && (input.operation === "new_authorization_attempt" || payableSideEffectOperation),
    finalBindingOutputAllowed: allowed && input.operation === "final_binding_result" && roundStatus !== "released" && roundStatus !== "closed",
    replayOnly: allowed && resultReplayOperation && (roundStatus === "released" || roundStatus === "closed"),
    nonBindingPreviewOnly: allowed && previewOnlyOperation,
  };
}

export function buildMpgfCrecStage7FailureHandlingNonSideEffectOutput(
  input: Pick<MpgfCrecRoundStatusGateInput, "roundStatus" | "publicSafetyFreezeActive" | "cancellationActive">,
): MpgfCrecStage7FailureHandlingNonSideEffectOutput | null {
  const roundStatus = isMpgfCrecRoundStatus(input.roundStatus) ? input.roundStatus : null;
  if (roundStatus === "payable") {
    return null;
  }

  const replayGate = evaluateMpgfCrecRoundStatusGate({
    ...input,
    operation: "audit_output",
  });
  const reviewGate = evaluateMpgfCrecRoundStatusGate({
    ...input,
    operation: "internal_review_calculation",
  });
  const replayOnly = replayGate.allowed && replayGate.replayOnly;
  const nonBindingReviewOnly = !replayOnly;

  return {
    roundStatus,
    outputMode: replayOnly ? "replay_report_audit_only" : "non_binding_review_only",
    replayOnly,
    nonBindingReviewOnly,
    sideEffectsAllowed: false,
    forbiddenMutationKinds: [
      "fallback",
      "authorization",
      "failure_bonus",
      "payout",
      "credit",
      "proration",
      "settlement",
      "claim",
    ] as const,
    blockers: replayOnly ? replayGate.blockers : [...new Set([...replayGate.blockers, ...reviewGate.blockers])],
  };
}

function paymentSnapshotHashPayload(snapshot: Omit<MpgfCrecPaymentCommitmentSnapshot, "snapshotHash">) {
  return {
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    paymentMethodRef: snapshot.paymentMethodRef,
    paymentMethodSavedAt: snapshot.paymentMethodSavedAt,
    paymentMethodCommitmentState: snapshot.paymentMethodCommitmentState,
    paymentMethodConfirmedAt: snapshot.paymentMethodConfirmedAt,
    asOf: snapshot.asOf,
    providerEvidenceHash: snapshot.providerEvidenceHash,
    rulebookHash: snapshot.rulebookHash,
    createdAt: snapshot.createdAt,
  };
}

export function buildMpgfCrecPaymentCommitmentSnapshotHash(
  snapshot: Omit<MpgfCrecPaymentCommitmentSnapshot, "snapshotHash">,
) {
  return hashMpgfCrecV1125Value(paymentSnapshotHashPayload(snapshot));
}

export function validateMpgfCrecPaymentCommitmentSnapshot(
  snapshot: MpgfCrecPaymentCommitmentSnapshot | null | undefined,
  expected: MpgfCrecPaymentCommitmentSnapshotExpectedContext,
) {
  const blockers: string[] = [];

  if (snapshot == null) {
    return validationResult(["payment_snapshot_missing"]);
  }

  addBlocker(
    blockers,
    "payment_snapshot_kind_invalid",
    MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS.includes(snapshot.snapshotKind),
  );
  addBlocker(blockers, "payment_snapshot_wrong_kind", snapshot.snapshotKind === expected.snapshotKind);
  addBlocker(blockers, "payment_snapshot_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.roundId));
  addBlocker(blockers, "payment_snapshot_wrong_round", snapshot.roundId === expected.roundId);
  addBlocker(blockers, "payment_snapshot_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.participantId));
  addBlocker(blockers, "payment_snapshot_wrong_participant", snapshot.participantId === expected.participantId);
  addBlocker(
    blockers,
    "payment_snapshot_budget_id_invalid",
    isMpgfCrecNonEmptyTrimStableString(snapshot.commonGroundBudgetId),
  );
  addBlocker(blockers, "payment_snapshot_wrong_budget", snapshot.commonGroundBudgetId === expected.commonGroundBudgetId);
  addBlocker(blockers, "payment_snapshot_payment_method_ref_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.paymentMethodRef));
  addBlocker(blockers, "payment_snapshot_rulebook_hash_invalid", isMpgfCrecCanonicalHash(snapshot.rulebookHash));
  addBlocker(blockers, "payment_snapshot_wrong_rulebook_hash", snapshot.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "payment_snapshot_cutoff_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.asOf));
  addBlocker(blockers, "payment_snapshot_cutoff_mismatch", timestampEquals(snapshot.asOf, expected.asOf));
  addBlocker(
    blockers,
    "payment_snapshot_commitment_state_not_provider_confirmed",
    snapshot.paymentMethodCommitmentState === "provider_confirmed",
  );
  addBlocker(blockers, "payment_snapshot_saved_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.paymentMethodSavedAt));
  addBlocker(blockers, "payment_snapshot_confirmed_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.paymentMethodConfirmedAt));
  addBlocker(blockers, "payment_snapshot_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.createdAt));
  addBlocker(blockers, "payment_snapshot_timeline_invalid", timestampLte(snapshot.paymentMethodSavedAt, snapshot.paymentMethodConfirmedAt));
  addBlocker(blockers, "payment_snapshot_confirmed_after_cutoff", timestampLte(snapshot.paymentMethodConfirmedAt, snapshot.asOf));
  addBlocker(blockers, "payment_snapshot_provider_evidence_hash_invalid", isMpgfCrecCanonicalHash(snapshot.providerEvidenceHash));
  addBlocker(blockers, "payment_snapshot_hash_invalid", isMpgfCrecCanonicalHash(snapshot.snapshotHash));
  addBlocker(
    blockers,
    "payment_snapshot_hash_mismatch",
    snapshot.snapshotHash === buildMpgfCrecPaymentCommitmentSnapshotHash(snapshot),
  );

  return validationResult(blockers);
}

function moralBucketSnapshotHashPayload(snapshot: Omit<MpgfCrecRoundMoralBucketSnapshot, "id" | "snapshotHash">) {
  return {
    roundId: snapshot.roundId,
    rulebookHash: snapshot.rulebookHash,
    distinctnessPolicyVersion: snapshot.distinctnessPolicyVersion,
    bucketIds: stableStringArray(snapshot.bucketIds),
    reciprocalDistinctFromBucketIdsByBucketId: stableBucketMap(snapshot.reciprocalDistinctFromBucketIdsByBucketId),
    asymmetricPairCount: snapshot.asymmetricPairCount,
    blockedAsymmetricPairs: snapshot.blockedAsymmetricPairs,
    createdAt: snapshot.createdAt,
  };
}

export function buildMpgfCrecRoundMoralBucketSnapshotHash(
  snapshot: Omit<MpgfCrecRoundMoralBucketSnapshot, "snapshotHash">,
) {
  return hashMpgfCrecV1125Value(moralBucketSnapshotHashPayload(snapshot));
}

export function validateMpgfCrecRoundMoralBucketSnapshot(
  snapshot: MpgfCrecRoundMoralBucketSnapshot | null | undefined,
  expected: MpgfCrecRoundMoralBucketSnapshotExpectedContext,
) {
  const blockers: string[] = [];

  if (snapshot == null) {
    return validationResult(["moral_bucket_snapshot_missing"]);
  }

  const bucketIdsValid = isTrimStableStringArray(snapshot.bucketIds);
  const bucketIdSet = new Set(bucketIdsValid ? snapshot.bucketIds : []);
  const mapEntries = Object.entries(snapshot.reciprocalDistinctFromBucketIdsByBucketId ?? {});
  const mapKeys = mapEntries.map(([key]) => key);
  const mapKeysValid =
    isTrimStableStringArray(mapKeys) &&
    bucketIdsValid &&
    mapKeys.length === snapshot.bucketIds.length &&
    mapKeys.every((key) => bucketIdSet.has(key));
  const mapValuesValid =
    bucketIdsValid &&
    mapEntries.every(([, values]) =>
      isTrimStableStringArray(values) &&
      values.every((value) => bucketIdSet.has(value)),
    );
  const noSelfEdges = mapEntries.every(([key, values]) => !values.includes(key));
  const symmetricEdges = mapEntries.every(([key, values]) =>
    values.every((value) =>
      snapshot.reciprocalDistinctFromBucketIdsByBucketId[value]?.includes(key) === true,
    ),
  );
  const blockedPairsValid =
    Array.isArray(snapshot.blockedAsymmetricPairs) &&
    snapshot.blockedAsymmetricPairs.length === 0;

  addBlocker(blockers, "moral_bucket_snapshot_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.id));
  if (expected.id != null) {
    addBlocker(blockers, "moral_bucket_snapshot_wrong_id", snapshot.id === expected.id);
  }
  addBlocker(blockers, "moral_bucket_snapshot_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.roundId));
  addBlocker(blockers, "moral_bucket_snapshot_wrong_round", snapshot.roundId === expected.roundId);
  addBlocker(blockers, "moral_bucket_snapshot_rulebook_hash_invalid", isMpgfCrecCanonicalHash(snapshot.rulebookHash));
  addBlocker(blockers, "moral_bucket_snapshot_wrong_rulebook_hash", snapshot.rulebookHash === expected.rulebookHash);
  addBlocker(
    blockers,
    "moral_bucket_snapshot_distinctness_policy_invalid",
    isMpgfCrecNonEmptyTrimStableString(snapshot.distinctnessPolicyVersion),
  );
  addBlocker(blockers, "moral_bucket_snapshot_bucket_ids_invalid", bucketIdsValid);
  addBlocker(blockers, "moral_bucket_snapshot_map_keys_invalid", mapKeysValid);
  addBlocker(blockers, "moral_bucket_snapshot_map_values_invalid", mapValuesValid);
  addBlocker(blockers, "moral_bucket_snapshot_self_edge", noSelfEdges);
  addBlocker(blockers, "moral_bucket_snapshot_asymmetric_edge", symmetricEdges);
  addBlocker(blockers, "moral_bucket_snapshot_asymmetric_pair_count_not_zero", snapshot.asymmetricPairCount === 0);
  addBlocker(blockers, "moral_bucket_snapshot_blocked_pairs_not_empty", blockedPairsValid);
  addBlocker(blockers, "moral_bucket_snapshot_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.createdAt));
  if (expected.parametersFrozenAt != null) {
    addBlocker(blockers, "moral_bucket_snapshot_created_after_parameter_freeze", timestampLte(snapshot.createdAt, expected.parametersFrozenAt));
  }
  addBlocker(blockers, "moral_bucket_snapshot_hash_invalid", isMpgfCrecCanonicalHash(snapshot.snapshotHash));
  addBlocker(
    blockers,
    "moral_bucket_snapshot_hash_mismatch",
    snapshot.snapshotHash === buildMpgfCrecRoundMoralBucketSnapshotHash(snapshot),
  );

  return validationResult(blockers);
}

function clearingInputBundleHashPayload(
  bundle: Omit<MpgfCrecRoundClearingInputBundle, "bundleHash">,
) {
  return {
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId,
    deploymentAuditHash: bundle.deploymentAuditHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    bundleSchemaVersion: bundle.bundleSchemaVersion,
    snapshotKind: bundle.snapshotKind,
    sourceCutoffAt: bundle.sourceCutoffAt,
    commonGroundBudgetInputHash: bundle.commonGroundBudgetInputHash,
    supportStanceInputHash: bundle.supportStanceInputHash,
    conditionalTradeIntentInputHash: bundle.conditionalTradeIntentInputHash,
    identityEligibilityInputHash: bundle.identityEligibilityInputHash,
    paymentCommitmentSnapshotHash: bundle.paymentCommitmentSnapshotHash,
    feeInputHash: bundle.feeInputHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    projectInputHash: bundle.projectInputHash,
    projectEligibilitySnapshotHash: bundle.projectEligibilitySnapshotHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    successRewardInputHash: bundle.successRewardInputHash,
    coordinationCreditInputHash: bundle.coordinationCreditInputHash,
    impactCertificateInputHash: bundle.impactCertificateInputHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    canonicalInputJsonRef: bundle.canonicalInputJsonRef,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    createdAt: bundle.createdAt,
  };
}

export function buildMpgfCrecRoundClearingInputBundleHash(
  bundle: Omit<MpgfCrecRoundClearingInputBundle, "bundleHash">,
) {
  return hashMpgfCrecV1125Value(clearingInputBundleHashPayload(bundle));
}

function bundleComponentHashes(bundle: MpgfCrecRoundClearingInputBundle) {
  return [
    bundle.rulebookHash,
    bundle.feePolicyHash,
    bundle.paymentReconciliationPathHash,
    bundle.optimizationPolicyHash,
    bundle.commonGroundBudgetInputHash,
    bundle.supportStanceInputHash,
    bundle.conditionalTradeIntentInputHash,
    bundle.identityEligibilityInputHash,
    bundle.paymentCommitmentSnapshotHash,
    bundle.feeInputHash,
    bundle.deploymentExposureInputHash,
    bundle.projectInputHash,
    bundle.projectEligibilitySnapshotHash,
    bundle.sponsorCommitmentInputHash,
    bundle.successRewardInputHash,
    bundle.coordinationCreditInputHash,
    bundle.impactCertificateInputHash,
    bundle.moralBucketSnapshotHash,
    bundle.canonicalInputJsonHash,
    bundle.bundleHash,
  ];
}

export function validateMpgfCrecRoundClearingInputBundle(
  bundle: MpgfCrecRoundClearingInputBundle | null | undefined,
  expected: MpgfCrecRoundClearingInputBundleExpectedContext,
) {
  const blockers: string[] = [];

  if (bundle == null) {
    return validationResult(["clearing_input_bundle_missing"]);
  }

  const cappedPilotCapsValid =
    bundle.deploymentMode === "capped_pilot"
      ? isPositiveSafeIntegerCents(bundle.pilotMaxRoundGrossExposureCents) &&
        isPositiveSafeIntegerCents(bundle.pilotMaxParticipantGrossExposureCents)
      : bundle.pilotMaxRoundGrossExposureCents == null &&
        bundle.pilotMaxParticipantGrossExposureCents == null;
  const auditStateValid = MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_STATES.includes(bundle.deploymentAuditState);
  const auditFieldsValid =
    bundle.deploymentAuditState === "not_required"
      ? bundle.deploymentAuditId == null && bundle.deploymentAuditHash == null
      : isMpgfCrecNonEmptyTrimStableString(bundle.deploymentAuditId) &&
        isMpgfCrecCanonicalHash(bundle.deploymentAuditHash);

  addBlocker(blockers, "clearing_input_bundle_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.id));
  if (expected.id != null) {
    addBlocker(blockers, "clearing_input_bundle_wrong_id", bundle.id === expected.id);
  }
  addBlocker(blockers, "clearing_input_bundle_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.roundId));
  addBlocker(blockers, "clearing_input_bundle_wrong_round", bundle.roundId === expected.roundId);
  addBlocker(blockers, "clearing_input_bundle_wrong_rulebook_hash", bundle.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "clearing_input_bundle_fee_policy_version_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.feePolicyVersion));
  addBlocker(blockers, "clearing_input_bundle_wrong_fee_policy_version", bundle.feePolicyVersion === expected.feePolicyVersion);
  addBlocker(blockers, "clearing_input_bundle_wrong_fee_policy_hash", bundle.feePolicyHash === expected.feePolicyHash);
  addBlocker(blockers, "clearing_input_bundle_deployment_mode_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_MODES.includes(bundle.deploymentMode));
  addBlocker(blockers, "clearing_input_bundle_wrong_deployment_mode", bundle.deploymentMode === expected.deploymentMode);
  addBlocker(blockers, "clearing_input_bundle_pilot_caps_invalid", cappedPilotCapsValid);
  addBlocker(blockers, "clearing_input_bundle_wrong_pilot_round_cap", bundle.pilotMaxRoundGrossExposureCents === expected.pilotMaxRoundGrossExposureCents);
  addBlocker(blockers, "clearing_input_bundle_wrong_pilot_participant_cap", bundle.pilotMaxParticipantGrossExposureCents === expected.pilotMaxParticipantGrossExposureCents);
  addBlocker(blockers, "clearing_input_bundle_deployment_audit_state_invalid", auditStateValid);
  addBlocker(blockers, "clearing_input_bundle_deployment_audit_fields_invalid", auditFieldsValid);
  addBlocker(blockers, "clearing_input_bundle_wrong_deployment_audit_state", bundle.deploymentAuditState === expected.deploymentAuditState);
  addBlocker(blockers, "clearing_input_bundle_wrong_deployment_audit_id", bundle.deploymentAuditId === expected.deploymentAuditId);
  addBlocker(blockers, "clearing_input_bundle_wrong_deployment_audit_hash", bundle.deploymentAuditHash === expected.deploymentAuditHash);
  addBlocker(blockers, "clearing_input_bundle_wrong_payment_reconciliation_path_hash", bundle.paymentReconciliationPathHash === expected.paymentReconciliationPathHash);
  addBlocker(blockers, "clearing_input_bundle_wrong_optimization_policy_hash", bundle.optimizationPolicyHash === expected.optimizationPolicyHash);
  addBlocker(blockers, "clearing_input_bundle_calculation_version_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.calculationVersion));
  addBlocker(blockers, "clearing_input_bundle_wrong_calculation_version", bundle.calculationVersion === expected.calculationVersion);
  addBlocker(blockers, "clearing_input_bundle_schema_version_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.bundleSchemaVersion));
  addBlocker(blockers, "clearing_input_bundle_wrong_snapshot_kind", bundle.snapshotKind === "round_close");
  addBlocker(blockers, "clearing_input_bundle_source_cutoff_invalid", isMpgfCrecCanonicalUtcTimestamp(bundle.sourceCutoffAt));
  addBlocker(blockers, "clearing_input_bundle_wrong_source_cutoff", timestampEquals(bundle.sourceCutoffAt, expected.sourceCutoffAt));
  addBlocker(blockers, "clearing_input_bundle_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(bundle.createdAt));
  addBlocker(blockers, "clearing_input_bundle_hashes_invalid", bundleComponentHashes(bundle).every(isMpgfCrecCanonicalHash));
  addBlocker(blockers, "clearing_input_bundle_moral_bucket_snapshot_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.moralBucketSnapshotId));
  if (expected.moralBucketSnapshotId != null) {
    addBlocker(blockers, "clearing_input_bundle_wrong_moral_bucket_snapshot_id", bundle.moralBucketSnapshotId === expected.moralBucketSnapshotId);
  }
  if (expected.moralBucketSnapshotHash != null) {
    addBlocker(blockers, "clearing_input_bundle_wrong_moral_bucket_snapshot_hash", bundle.moralBucketSnapshotHash === expected.moralBucketSnapshotHash);
  }
  addBlocker(blockers, "clearing_input_bundle_canonical_input_ref_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.canonicalInputJsonRef));
  if (expected.sponsorPoolSourceHash != null) {
    addBlocker(blockers, "clearing_input_bundle_wrong_sponsor_input_hash", bundle.sponsorCommitmentInputHash === expected.sponsorPoolSourceHash);
  }
  if (expected.clearingInputBundleHash != null) {
    addBlocker(blockers, "clearing_input_bundle_wrong_locked_hash", bundle.bundleHash === expected.clearingInputBundleHash);
  }
  addBlocker(
    blockers,
    "clearing_input_bundle_hash_mismatch",
    bundle.bundleHash === buildMpgfCrecRoundClearingInputBundleHash(bundle),
  );

  return validationResult(blockers);
}

function deploymentAuditHashPayload(audit: Omit<MpgfCrecDeploymentAudit, "auditHash">) {
  return {
    id: audit.id,
    roundId: audit.roundId,
    auditKind: audit.auditKind,
    targetDeploymentMode: audit.targetDeploymentMode,
    calculationVersion: audit.calculationVersion,
    rulebookHash: audit.rulebookHash,
    feePolicyHash: audit.feePolicyHash,
    sponsorPoolSourceHash: audit.sponsorPoolSourceHash,
    paymentReconciliationPathHash: audit.paymentReconciliationPathHash,
    optimizationPolicyHash: audit.optimizationPolicyHash,
    solverVersion: audit.solverVersion,
    priorRoundIds: audit.priorRoundIds,
    priorAuditBundleHashes: audit.priorAuditBundleHashes,
    priorRoundDeploymentModes: audit.priorRoundDeploymentModes,
    priorPaymentReconciliationPathHashes: audit.priorPaymentReconciliationPathHashes,
    priorRoundOutcomeStates: audit.priorRoundOutcomeStates,
    auditState: audit.auditState,
    auditorId: audit.auditorId,
    createdAt: audit.createdAt,
  };
}

export function buildMpgfCrecDeploymentAuditHash(
  audit: Omit<MpgfCrecDeploymentAudit, "auditHash">,
) {
  return hashMpgfCrecV1125Value(deploymentAuditHashPayload(audit));
}

function deploymentAuditPriorEvidenceLengthsValid(audit: MpgfCrecDeploymentAudit) {
  const expectedLength = audit.priorRoundIds.length;

  return (
    expectedLength > 0 &&
    audit.priorAuditBundleHashes.length === expectedLength &&
    audit.priorRoundDeploymentModes.length === expectedLength &&
    audit.priorPaymentReconciliationPathHashes.length === expectedLength &&
    audit.priorRoundOutcomeStates.length === expectedLength
  );
}

export function validateMpgfCrecDeploymentAudit(
  audit: MpgfCrecDeploymentAudit | null | undefined,
  expected: MpgfCrecDeploymentAuditExpectedContext,
) {
  const blockers: string[] = [];

  if (audit == null) {
    return validationResult(["deployment_audit_missing"]);
  }

  const evidenceLengthsValid = deploymentAuditPriorEvidenceLengthsValid(audit);
  const priorModesValid =
    evidenceLengthsValid &&
    audit.priorRoundDeploymentModes.every((mode) =>
      MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_PRIOR_MODES.includes(mode),
    );
  const priorOutcomesPassed =
    evidenceLengthsValid &&
    audit.priorRoundOutcomeStates.every((state) => state === "passed");
  const targetModeValid =
    MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_TARGET_MODES.includes(audit.targetDeploymentMode);
  const auditKindValid =
    MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_KINDS.includes(audit.auditKind);
  const kindTargetsMode =
    (audit.auditKind === "shadow_to_pilot" && audit.targetDeploymentMode === "capped_pilot") ||
    ((audit.auditKind === "pilot_to_full" || audit.auditKind === "shadow_or_pilot_to_full") &&
      audit.targetDeploymentMode === "full");
  const kindEvidenceModesCoherent =
    evidenceLengthsValid &&
    ((audit.auditKind === "shadow_to_pilot" &&
      audit.priorRoundDeploymentModes.every((mode) => mode === "shadow")) ||
      (audit.auditKind === "pilot_to_full" &&
        audit.priorRoundDeploymentModes.every((mode) => mode === "capped_pilot")) ||
      (audit.auditKind === "shadow_or_pilot_to_full" &&
        audit.priorRoundDeploymentModes.every((mode) => mode === "shadow" || mode === "capped_pilot")));
  const hasSamePathCappedPilotPrior =
    evidenceLengthsValid &&
    audit.priorRoundDeploymentModes.some(
      (mode, index) =>
        mode === "capped_pilot" &&
        audit.priorPaymentReconciliationPathHashes[index] === expected.paymentReconciliationPathHash,
    );
  const fullEvidenceIncludesSamePathPilot =
    audit.targetDeploymentMode !== "full" || hasSamePathCappedPilotPrior;

  addBlocker(blockers, "deployment_audit_id_invalid", isMpgfCrecNonEmptyTrimStableString(audit.id));
  if (expected.id != null) {
    addBlocker(blockers, "deployment_audit_wrong_id", audit.id === expected.id);
  }
  addBlocker(blockers, "deployment_audit_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(audit.roundId));
  addBlocker(blockers, "deployment_audit_wrong_round", audit.roundId === expected.roundId);
  addBlocker(blockers, "deployment_audit_kind_invalid", auditKindValid);
  addBlocker(blockers, "deployment_audit_target_mode_invalid", targetModeValid);
  addBlocker(blockers, "deployment_audit_wrong_target_mode", audit.targetDeploymentMode === expected.targetDeploymentMode);
  addBlocker(blockers, "deployment_audit_kind_target_mismatch", kindTargetsMode);
  addBlocker(blockers, "deployment_audit_calculation_version_invalid", isMpgfCrecNonEmptyTrimStableString(audit.calculationVersion));
  addBlocker(blockers, "deployment_audit_wrong_calculation_version", audit.calculationVersion === expected.calculationVersion);
  addBlocker(blockers, "deployment_audit_rulebook_hash_invalid", isMpgfCrecCanonicalHash(audit.rulebookHash));
  addBlocker(blockers, "deployment_audit_wrong_rulebook_hash", audit.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "deployment_audit_fee_policy_hash_invalid", isMpgfCrecCanonicalHash(audit.feePolicyHash));
  addBlocker(blockers, "deployment_audit_wrong_fee_policy_hash", audit.feePolicyHash === expected.feePolicyHash);
  addBlocker(blockers, "deployment_audit_sponsor_source_hash_invalid", isMpgfCrecCanonicalHash(audit.sponsorPoolSourceHash));
  addBlocker(blockers, "deployment_audit_wrong_sponsor_source_hash", audit.sponsorPoolSourceHash === expected.sponsorPoolSourceHash);
  addBlocker(blockers, "deployment_audit_payment_path_hash_invalid", isMpgfCrecCanonicalHash(audit.paymentReconciliationPathHash));
  addBlocker(blockers, "deployment_audit_wrong_payment_path_hash", audit.paymentReconciliationPathHash === expected.paymentReconciliationPathHash);
  addBlocker(blockers, "deployment_audit_optimization_policy_hash_invalid", isMpgfCrecCanonicalHash(audit.optimizationPolicyHash));
  addBlocker(blockers, "deployment_audit_wrong_optimization_policy_hash", audit.optimizationPolicyHash === expected.optimizationPolicyHash);
  addBlocker(blockers, "deployment_audit_solver_version_invalid", isMpgfCrecNonEmptyTrimStableString(audit.solverVersion));
  addBlocker(blockers, "deployment_audit_prior_evidence_lengths_invalid", evidenceLengthsValid);
  addBlocker(blockers, "deployment_audit_prior_round_ids_invalid", isTrimStableStringArray(audit.priorRoundIds));
  addBlocker(blockers, "deployment_audit_prior_round_self_reference", !audit.priorRoundIds.includes(expected.roundId));
  addBlocker(blockers, "deployment_audit_prior_bundle_hashes_invalid", audit.priorAuditBundleHashes.every(isMpgfCrecCanonicalHash));
  addBlocker(blockers, "deployment_audit_prior_modes_invalid", priorModesValid);
  addBlocker(blockers, "deployment_audit_prior_payment_paths_invalid", audit.priorPaymentReconciliationPathHashes.every(isMpgfCrecCanonicalHash));
  addBlocker(blockers, "deployment_audit_prior_outcomes_not_all_passed", priorOutcomesPassed);
  addBlocker(blockers, "deployment_audit_kind_prior_modes_mismatch", kindEvidenceModesCoherent);
  addBlocker(blockers, "deployment_audit_full_missing_same_path_capped_pilot_prior", fullEvidenceIncludesSamePathPilot);
  addBlocker(blockers, "deployment_audit_state_not_passed", audit.auditState === "passed");
  addBlocker(blockers, "deployment_audit_auditor_id_invalid", isMpgfCrecNonEmptyTrimStableString(audit.auditorId));
  addBlocker(blockers, "deployment_audit_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(audit.createdAt));
  addBlocker(blockers, "deployment_audit_created_after_parameter_freeze", timestampLte(audit.createdAt, expected.parametersFrozenAt));
  addBlocker(blockers, "deployment_audit_hash_invalid", isMpgfCrecCanonicalHash(audit.auditHash));
  addBlocker(blockers, "deployment_audit_hash_mismatch", audit.auditHash === buildMpgfCrecDeploymentAuditHash(audit));

  return validationResult(blockers);
}

export function capMpgfCrecDeploymentGrossExposure(
  input: MpgfCrecDeploymentExposureCapInput,
): MpgfCrecDeploymentExposureCapResult {
  const blockers: string[] = [];
  const deploymentModeValid =
    (MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_MODES as readonly string[]).includes(input.deploymentMode);
  const requestedValid = isNonNegativeSafeIntegerCents(input.requestedGrossExposureCents);
  const pilotCapsNull =
    input.pilotMaxRoundGrossExposureCents == null &&
    input.pilotMaxParticipantGrossExposureCents == null;
  const pilotCapsPositive =
    isPositiveSafeIntegerCents(input.pilotMaxRoundGrossExposureCents) &&
    isPositiveSafeIntegerCents(input.pilotMaxParticipantGrossExposureCents);

  addBlocker(blockers, "deployment_exposure_mode_invalid", deploymentModeValid);
  addBlocker(blockers, "deployment_exposure_requested_gross_invalid", requestedValid);

  if (input.deploymentMode === "shadow") {
    addBlocker(blockers, "deployment_exposure_shadow_pilot_caps_not_null", pilotCapsNull);

    return {
      eligible: blockers.length === 0,
      blockers,
      cappedGrossExposureCents: 0,
      bindingGrossExposureCents: 0,
      shadowPreviewGrossExposureCents: blockers.length === 0 ? input.requestedGrossExposureCents : 0,
      bindingOutputAllowed: false,
      shadowOnly: true,
    };
  }

  if (input.deploymentMode === "full") {
    addBlocker(blockers, "deployment_exposure_full_pilot_caps_not_null", pilotCapsNull);

    return {
      eligible: blockers.length === 0,
      blockers,
      cappedGrossExposureCents: blockers.length === 0 ? input.requestedGrossExposureCents : 0,
      bindingGrossExposureCents: blockers.length === 0 ? input.requestedGrossExposureCents : 0,
      shadowPreviewGrossExposureCents: 0,
      bindingOutputAllowed: blockers.length === 0,
      shadowOnly: false,
    };
  }

  addBlocker(blockers, "deployment_exposure_capped_pilot_caps_invalid", pilotCapsPositive);
  addBlocker(
    blockers,
    "deployment_exposure_remaining_round_invalid",
    isNonNegativeSafeIntegerCents(input.remainingRoundDeploymentExposureCents),
  );
  addBlocker(
    blockers,
    "deployment_exposure_remaining_participant_invalid",
    isNonNegativeSafeIntegerCents(input.remainingParticipantDeploymentExposureCents),
  );

  const cappedGrossExposureCents =
    blockers.length === 0
      ? minMpgfCrecNonNegativeSafeInteger(
          input.requestedGrossExposureCents,
          input.pilotMaxRoundGrossExposureCents as number,
          input.pilotMaxParticipantGrossExposureCents as number,
          input.remainingRoundDeploymentExposureCents as number,
          input.remainingParticipantDeploymentExposureCents as number,
        )
      : 0;

  return {
    eligible: blockers.length === 0,
    blockers,
    cappedGrossExposureCents,
    bindingGrossExposureCents: cappedGrossExposureCents,
    shadowPreviewGrossExposureCents: 0,
    bindingOutputAllowed: blockers.length === 0,
    shadowOnly: false,
  };
}

function projectHardGateHashPayload(input: MpgfCrecProjectHardGateInput) {
  return {
    deploymentMode: input.deploymentMode,
    projectScopeState: input.projectScopeState,
    excludedTradeType: input.excludedTradeType,
    destinationRouteState: input.destinationRouteState,
    externalityState: input.externalityState,
    reviewState: input.reviewState,
    challengeState: input.challengeState,
    conflictReviewState: input.conflictReviewState,
    sponsorCompatibilityState: input.sponsorCompatibilityState,
    legalCustodyState: input.legalCustodyState,
    baselineIntegrityState: input.baselineIntegrityState,
    baselineConfidenceState: input.baselineConfidenceState,
    actionEvidenceState: input.actionEvidenceState,
  };
}

export function buildMpgfCrecProjectHardGateHash(input: MpgfCrecProjectHardGateInput) {
  return hashMpgfCrecV1125Value(projectHardGateHashPayload(input));
}

export function evaluateMpgfCrecProjectHardGate(
  input: MpgfCrecProjectHardGateInput,
): MpgfCrecProjectHardGateResult {
  const blockers: string[] = [];
  const bindingDeploymentMode = input.deploymentMode === "capped_pilot" || input.deploymentMode === "full";
  const shadowDeploymentMode = input.deploymentMode === "shadow";
  const deploymentModeValid = bindingDeploymentMode || shadowDeploymentMode;
  const baselineIntegrityClear = input.baselineIntegrityState === "clear";
  const bindingBaselineConfidenceAllowed =
    input.baselineConfidenceState === "high" ||
    input.baselineConfidenceState === "medium";
  const bindingActionEvidenceAllowed = input.actionEvidenceState === "adequate";
  const shadowBaselineConfidenceAllowed =
    MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_CONFIDENCE_STATES.includes(input.baselineConfidenceState);
  const shadowActionEvidenceAllowed =
    input.actionEvidenceState === "adequate" ||
    input.actionEvidenceState === "provisional_nonblocking" ||
    input.actionEvidenceState === "review";
  const hasShadowOnlyLearningSignal =
    input.baselineConfidenceState === "low" ||
    input.baselineConfidenceState === "unknown" ||
    input.actionEvidenceState === "provisional_nonblocking" ||
    input.actionEvidenceState === "review";

  addBlocker(blockers, "project_hard_gate_deployment_mode_invalid", deploymentModeValid);
  addBlocker(
    blockers,
    "project_hard_gate_scope_not_valid_moral_public_good",
    input.projectScopeState === "valid_moral_public_good",
  );
  addBlocker(
    blockers,
    "project_hard_gate_excluded_trade_type_present",
    input.excludedTradeType === null,
  );
  addBlocker(
    blockers,
    "project_hard_gate_destination_route_not_valid",
    input.destinationRouteState === "valid",
  );
  addBlocker(blockers, "project_hard_gate_externality_not_clear", input.externalityState === "clear");
  addBlocker(blockers, "project_hard_gate_review_not_approved", input.reviewState === "approved");
  addBlocker(
    blockers,
    "project_hard_gate_challenge_not_clear_or_non_blocking",
    input.challengeState === "clear" || input.challengeState === "non_blocking",
  );
  addBlocker(
    blockers,
    "project_hard_gate_conflict_review_not_clear",
    input.conflictReviewState === "clear",
  );
  addBlocker(
    blockers,
    "project_hard_gate_sponsor_not_compatible",
    input.sponsorCompatibilityState === "compatible",
  );
  addBlocker(blockers, "project_hard_gate_legal_custody_not_clear", input.legalCustodyState === "clear");

  if (bindingDeploymentMode) {
    addBlocker(
      blockers,
      "project_hard_gate_baseline_integrity_not_clear",
      baselineIntegrityClear,
    );
    addBlocker(
      blockers,
      "project_hard_gate_baseline_confidence_not_high_or_medium",
      bindingBaselineConfidenceAllowed,
    );
    addBlocker(
      blockers,
      "project_hard_gate_action_evidence_not_adequate",
      bindingActionEvidenceAllowed,
    );
  }

  if (shadowDeploymentMode) {
    addBlocker(
      blockers,
      "project_hard_gate_shadow_baseline_integrity_not_clear",
      baselineIntegrityClear,
    );
    addBlocker(
      blockers,
      "project_hard_gate_shadow_baseline_confidence_invalid",
      shadowBaselineConfidenceAllowed,
    );
    addBlocker(
      blockers,
      "project_hard_gate_shadow_action_evidence_not_preview_allowed",
      shadowActionEvidenceAllowed,
    );
  }

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    bindingOutputAllowed: eligible && bindingDeploymentMode,
    shadowOnlyProvisionalLearningAllowed: eligible && shadowDeploymentMode && hasShadowOnlyLearningSignal,
    hardGateHash: eligible ? buildMpgfCrecProjectHardGateHash(input) : null,
  };
}

export function validateMpgfCrecProjectIdentityRouteGate(
  input: MpgfCrecProjectIdentityRouteGateInput,
): MpgfCrecProjectIdentityRouteGateResult {
  const blockers: string[] = [];
  const row = asObjectRow(input.publicGoodProject);
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.projectId) &&
    isMpgfCrecCanonicalHash(input.rulebookHash) &&
    isMpgfCrecCanonicalUtcTimestamp(input.parametersFrozenAt);
  const rowUnique = input.selectedPublicGoodProjectRowCount === 1;

  if (!contextValid) {
    blockers.push("project_identity_route_context_invalid");
  }

  if (!rowUnique) {
    blockers.push("project_identity_route_project_row_count_not_unique");
  }

  if (input.publicGoodProject == null) {
    blockers.push("project_identity_route_project_row_missing");
  } else if (row == null) {
    blockers.push("project_identity_route_project_row_not_object");
  }

  const projectIdValid = row != null && isMpgfCrecNonEmptyTrimStableString(row.id);
  const projectBucketIdValid = row != null && isMpgfCrecNonEmptyTrimStableString(row.bucketId);

  if (row != null && !projectIdValid) {
    blockers.push("project_identity_route_project_id_invalid");
  }

  if (row != null && !projectBucketIdValid) {
    blockers.push("project_identity_route_bucket_id_invalid");
  }

  const rowBound =
    contextValid &&
    rowUnique &&
    row != null &&
    projectIdValid &&
    projectBucketIdValid &&
    row.roundId === input.roundId &&
    row.id === input.projectId;

  if (row != null && !rowBound) {
    blockers.push("project_identity_route_project_row_not_bound");
  }

  const snapshotResult = validateMpgfCrecRoundMoralBucketSnapshot(input.roundMoralBucketSnapshot, {
    roundId: input.roundId,
    rulebookHash: input.rulebookHash,
    parametersFrozenAt: input.parametersFrozenAt,
  });
  const moralBucketSnapshotEligible = snapshotResult.eligible;

  if (!moralBucketSnapshotEligible) {
    blockers.push("project_identity_route_moral_bucket_snapshot_ineligible");
    blockers.push(...snapshotResult.blockers.map((blocker) => `project_identity_route_${blocker}`));
  }

  const rawGoodType = rowBound ? row.goodType : null;
  const goodTypeValid =
    rowBound &&
    (MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_GOOD_TYPES as readonly unknown[]).includes(rawGoodType);

  if (rowBound && !goodTypeValid) {
    blockers.push("project_identity_route_good_type_invalid");
  }

  const rawDestinationType = rowBound ? row.destinationType : null;
  const destinationTypeValid =
    rowBound &&
    (MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_DESTINATION_TYPES as readonly unknown[]).includes(rawDestinationType);

  if (rowBound && !destinationTypeValid) {
    blockers.push("project_identity_route_destination_type_invalid");
  }

  const destinationRefValid =
    rowBound && isMpgfCrecNonEmptyTrimStableString(row.destinationRef);

  if (rowBound && !destinationRefValid) {
    blockers.push("project_identity_route_destination_ref_invalid");
  }

  const projectBucketId = rowBound && typeof row.bucketId === "string" ? row.bucketId : null;
  const bucketPresentInFrozenSnapshot =
    projectBucketId != null &&
    moralBucketSnapshotEligible &&
    input.roundMoralBucketSnapshot != null &&
    input.roundMoralBucketSnapshot.bucketIds.includes(projectBucketId);

  if (rowBound && moralBucketSnapshotEligible && !bucketPresentInFrozenSnapshot) {
    blockers.push("project_identity_route_bucket_absent_from_frozen_snapshot");
  }

  const projectIdentityAndRouteValid =
    rowBound &&
    goodTypeValid &&
    destinationTypeValid &&
    destinationRefValid &&
    moralBucketSnapshotEligible &&
    bucketPresentInFrozenSnapshot;

  return {
    eligible: projectIdentityAndRouteValid,
    blockers,
    projectRowEligible: rowBound,
    projectIdentityAndRouteValid,
    moralBucketSnapshotEligible,
    bucketPresentInFrozenSnapshot,
    projectId: rowBound && typeof row.id === "string" ? row.id : null,
    projectBucketId,
    projectGoodType: goodTypeValid ? rawGoodType as MpgfCrecProjectGoodType : null,
    projectDestinationType: destinationTypeValid
      ? rawDestinationType as MpgfCrecProjectDestinationType
      : null,
    destinationRef: destinationRefValid && typeof row.destinationRef === "string"
      ? row.destinationRef
      : null,
    bindingOutputAllowed: projectIdentityAndRouteValid,
    matchingAllowed: projectIdentityAndRouteValid,
    authorizationAllowed: projectIdentityAndRouteValid,
    payoutAllowed: projectIdentityAndRouteValid,
    failureBonusQualificationAllowed: projectIdentityAndRouteValid,
  };
}

function projectEligibilityHashPayload(
  snapshot: Omit<MpgfCrecProjectRoundEligibilitySnapshot, "snapshotHash">,
) {
  return {
    snapshotKind: snapshot.snapshotKind,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    rulebookHash: snapshot.rulebookHash,
    eligibility: snapshot.eligibility,
    createdAt: snapshot.createdAt,
  };
}

export function buildMpgfCrecProjectRoundEligibilitySnapshotHash(
  snapshot: Omit<MpgfCrecProjectRoundEligibilitySnapshot, "snapshotHash">,
) {
  return hashMpgfCrecV1125Value(projectEligibilityHashPayload(snapshot));
}

function projectEligibilityShapeValid(eligibility: unknown) {
  if (eligibility == null || typeof eligibility !== "object" || Array.isArray(eligibility)) {
    return false;
  }

  const keys = Object.keys(eligibility);
  const requiredKeys = [...MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS];

  return (
    keys.length === requiredKeys.length &&
    requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(eligibility, key)) &&
    keys.every((key) => requiredKeys.includes(key as MpgfCrecProjectEligibilityField)) &&
    Object.values(eligibility).every((value) => typeof value === "boolean")
  );
}

export function validateMpgfCrecProjectRoundEligibilitySnapshot(
  snapshot: MpgfCrecProjectRoundEligibilitySnapshot | null | undefined,
  expected: MpgfCrecProjectRoundEligibilitySnapshotExpectedContext,
) {
  const blockers: string[] = [];

  if (snapshot == null) {
    return validationResult(["project_eligibility_snapshot_missing"]);
  }

  const eligibilityShapeValid = projectEligibilityShapeValid(snapshot.eligibility);
  const allEligibilityBooleansTrue =
    eligibilityShapeValid &&
    MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS.every(
      (field) => snapshot.eligibility[field] === true,
    );

  addBlocker(blockers, "project_eligibility_snapshot_wrong_kind", snapshot.snapshotKind === "round_open");
  addBlocker(blockers, "project_eligibility_snapshot_cutoff_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.sourceCutoffAt));
  addBlocker(blockers, "project_eligibility_snapshot_wrong_cutoff", timestampEquals(snapshot.sourceCutoffAt, expected.sourceCutoffAt));
  addBlocker(blockers, "project_eligibility_snapshot_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.roundId));
  addBlocker(blockers, "project_eligibility_snapshot_wrong_round", snapshot.roundId === expected.roundId);
  addBlocker(blockers, "project_eligibility_snapshot_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.projectId));
  addBlocker(blockers, "project_eligibility_snapshot_wrong_project", snapshot.projectId === expected.projectId);
  addBlocker(blockers, "project_eligibility_snapshot_rulebook_hash_invalid", isMpgfCrecCanonicalHash(snapshot.rulebookHash));
  addBlocker(blockers, "project_eligibility_snapshot_wrong_rulebook_hash", snapshot.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "project_eligibility_snapshot_fields_invalid", eligibilityShapeValid);
  addBlocker(blockers, "project_eligibility_snapshot_not_fully_eligible", allEligibilityBooleansTrue);
  addBlocker(blockers, "project_eligibility_snapshot_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.createdAt));
  addBlocker(blockers, "project_eligibility_snapshot_hash_invalid", isMpgfCrecCanonicalHash(snapshot.snapshotHash));
  addBlocker(
    blockers,
    "project_eligibility_snapshot_hash_mismatch",
    snapshot.snapshotHash === buildMpgfCrecProjectRoundEligibilitySnapshotHash(snapshot),
  );

  return validationResult(blockers);
}

function authorizationReconciliationEventHashPayload(
  event: Omit<MpgfCrecAuthorizationReconciliationEvent, "eventHash">,
) {
  return {
    id: event.id,
    roundId: event.roundId,
    clearingIteration: event.clearingIteration,
    participantId: event.participantId,
    projectId: event.projectId,
    conditionalTradeIntentId: event.conditionalTradeIntentId,
    custodyAuthorizationId: event.custodyAuthorizationId,
    requiredAmountCents: event.requiredAmountCents,
    authorizedAmountCents: event.authorizedAmountCents,
    removedAmountCents: event.removedAmountCents,
    authExpiresAt: event.authExpiresAt,
    expectedCaptureBy: event.expectedCaptureBy,
    reconciliationState: event.reconciliationState,
    reasonCode: event.reasonCode,
    createdAt: event.createdAt,
  };
}

export function buildMpgfCrecAuthorizationReconciliationEventHash(
  event: Omit<MpgfCrecAuthorizationReconciliationEvent, "eventHash">,
) {
  return hashMpgfCrecV1125Value(authorizationReconciliationEventHashPayload(event));
}

export function validateMpgfCrecAuthorizationReconciliationEvent(
  event: MpgfCrecAuthorizationReconciliationEvent | null | undefined,
  expected: MpgfCrecAuthorizationReconciliationEventExpectedContext,
) {
  const blockers: string[] = [];

  if (event == null) {
    return validationResult(["authorization_reconciliation_event_missing"]);
  }

  const keptAuthorized = event.reconciliationState === "kept_authorized";
  const keptStateAmountValid =
    !keptAuthorized ||
    (
      event.authorizedAmountCents >= event.requiredAmountCents &&
      event.removedAmountCents === 0
    );
  const removedStateAmountValid =
    keptAuthorized ||
    (
      event.requiredAmountCents > 0 &&
      event.removedAmountCents >= 0
    );

  addBlocker(blockers, "authorization_reconciliation_event_id_invalid", isMpgfCrecNonEmptyTrimStableString(event.id));
  addBlocker(blockers, "authorization_reconciliation_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(event.roundId));
  addBlocker(blockers, "authorization_reconciliation_wrong_round", event.roundId === expected.roundId);
  addBlocker(blockers, "authorization_reconciliation_iteration_invalid", Number.isSafeInteger(event.clearingIteration) && event.clearingIteration >= 0);
  addBlocker(blockers, "authorization_reconciliation_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(event.participantId));
  if (expected.participantId != null) {
    addBlocker(blockers, "authorization_reconciliation_wrong_participant", event.participantId === expected.participantId);
  }
  addBlocker(blockers, "authorization_reconciliation_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(event.projectId));
  if (expected.projectId != null) {
    addBlocker(blockers, "authorization_reconciliation_wrong_project", event.projectId === expected.projectId);
  }
  addBlocker(blockers, "authorization_reconciliation_intent_id_invalid", isMpgfCrecNonEmptyTrimStableString(event.conditionalTradeIntentId));
  if (expected.conditionalTradeIntentId != null) {
    addBlocker(blockers, "authorization_reconciliation_wrong_intent", event.conditionalTradeIntentId === expected.conditionalTradeIntentId);
  }
  addBlocker(
    blockers,
    "authorization_reconciliation_custody_authorization_id_invalid",
    event.custodyAuthorizationId == null || isMpgfCrecNonEmptyTrimStableString(event.custodyAuthorizationId),
  );
  addBlocker(blockers, "authorization_reconciliation_required_amount_invalid", isNonNegativeSafeIntegerCents(event.requiredAmountCents));
  addBlocker(blockers, "authorization_reconciliation_authorized_amount_invalid", isNonNegativeSafeIntegerCents(event.authorizedAmountCents));
  addBlocker(blockers, "authorization_reconciliation_removed_amount_invalid", isNonNegativeSafeIntegerCents(event.removedAmountCents));
  addBlocker(blockers, "authorization_reconciliation_state_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_RECONCILIATION_STATES.includes(event.reconciliationState));
  addBlocker(blockers, "authorization_reconciliation_state_amounts_invalid", keptStateAmountValid && removedStateAmountValid);
  addBlocker(blockers, "authorization_reconciliation_reason_code_invalid", isMpgfCrecNonEmptyTrimStableString(event.reasonCode));
  addBlocker(blockers, "authorization_reconciliation_auth_expires_at_invalid", isMpgfCrecCanonicalUtcTimestamp(event.authExpiresAt));
  addBlocker(blockers, "authorization_reconciliation_expected_capture_by_invalid", isMpgfCrecCanonicalUtcTimestamp(event.expectedCaptureBy));
  addBlocker(blockers, "authorization_reconciliation_short_expiry", timestampLte(event.expectedCaptureBy, event.authExpiresAt));
  addBlocker(blockers, "authorization_reconciliation_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(event.createdAt));
  addBlocker(blockers, "authorization_reconciliation_event_hash_invalid", isMpgfCrecCanonicalHash(event.eventHash));
  addBlocker(
    blockers,
    "authorization_reconciliation_event_hash_mismatch",
    event.eventHash === buildMpgfCrecAuthorizationReconciliationEventHash(event),
  );

  return validationResult(blockers);
}

function feeQuoteHashPayload(quote: Omit<MpgfCrecFeeQuote, "quoteHash">) {
  return {
    id: quote.id,
    roundId: quote.roundId,
    commonGroundBudgetId: quote.commonGroundBudgetId,
    projectId: quote.projectId,
    conditionalTradeIntentId: quote.conditionalTradeIntentId,
    feePolicyVersion: quote.feePolicyVersion,
    feePolicyHash: quote.feePolicyHash,
    feePayer: quote.feePayer,
    grossCapturedCents: quote.grossCapturedCents,
    feeCents: quote.feeCents,
    netRecipientDisbursedCents: quote.netRecipientDisbursedCents,
    sponsorFeeBackingHash: quote.sponsorFeeBackingHash,
    createdAt: quote.createdAt,
  };
}

export function buildMpgfCrecFeeQuoteHash(quote: Omit<MpgfCrecFeeQuote, "quoteHash">) {
  return hashMpgfCrecV1125Value(feeQuoteHashPayload(quote));
}

export function validateMpgfCrecFeeQuote(
  quote: MpgfCrecFeeQuote | null | undefined,
  expected: MpgfCrecFeeQuoteExpectedContext,
) {
  const blockers: string[] = [];

  if (quote == null) {
    return validationResult(["fee_quote_missing"]);
  }

  const centsFieldsValid =
    isNonNegativeSafeIntegerCents(quote.grossCapturedCents) &&
    isNonNegativeSafeIntegerCents(quote.feeCents) &&
    isNonNegativeSafeIntegerCents(quote.netRecipientDisbursedCents);
  const donorDeductedNetValid =
    quote.feePayer !== "donor_deducted" ||
    (
      centsFieldsValid &&
      quote.grossCapturedCents >= quote.feeCents &&
      quote.netRecipientDisbursedCents === quote.grossCapturedCents - quote.feeCents
    );
  const sponsorPaidNetValid =
    quote.feePayer !== "sponsor_paid" ||
    (
      centsFieldsValid &&
      quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
      quote.sponsorFeeBackingHash === expected.sponsorPoolSourceHash
    );
  const waivedFeeValid =
    quote.feePayer !== "waived" ||
    (
      centsFieldsValid &&
      quote.feeCents === 0 &&
      quote.netRecipientDisbursedCents === quote.grossCapturedCents
    );

  addBlocker(blockers, "fee_quote_id_invalid", isMpgfCrecNonEmptyTrimStableString(quote.id));
  addBlocker(blockers, "fee_quote_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(quote.roundId));
  addBlocker(blockers, "fee_quote_wrong_round", quote.roundId === expected.roundId);
  addBlocker(blockers, "fee_quote_budget_id_invalid", isMpgfCrecNonEmptyTrimStableString(quote.commonGroundBudgetId));
  if (expected.commonGroundBudgetId != null) {
    addBlocker(blockers, "fee_quote_wrong_budget", quote.commonGroundBudgetId === expected.commonGroundBudgetId);
  }
  addBlocker(blockers, "fee_quote_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(quote.projectId));
  if (expected.projectId != null) {
    addBlocker(blockers, "fee_quote_wrong_project", quote.projectId === expected.projectId);
  }
  addBlocker(blockers, "fee_quote_intent_id_invalid", isMpgfCrecNonEmptyTrimStableString(quote.conditionalTradeIntentId));
  if (expected.conditionalTradeIntentId != null) {
    addBlocker(blockers, "fee_quote_wrong_intent", quote.conditionalTradeIntentId === expected.conditionalTradeIntentId);
  }
  addBlocker(blockers, "fee_quote_fee_policy_version_invalid", isMpgfCrecNonEmptyTrimStableString(quote.feePolicyVersion));
  addBlocker(blockers, "fee_quote_wrong_fee_policy_version", quote.feePolicyVersion === expected.feePolicyVersion);
  addBlocker(blockers, "fee_quote_fee_policy_hash_invalid", isMpgfCrecCanonicalHash(quote.feePolicyHash));
  addBlocker(blockers, "fee_quote_wrong_fee_policy_hash", quote.feePolicyHash === expected.feePolicyHash);
  addBlocker(blockers, "fee_quote_fee_payer_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_FEE_PAYERS.includes(quote.feePayer));
  addBlocker(blockers, "fee_quote_cents_invalid", centsFieldsValid);
  if (expected.positiveAllocationRequired === true) {
    addBlocker(blockers, "fee_quote_positive_allocation_required", isPositiveSafeIntegerCents(quote.grossCapturedCents));
  }
  addBlocker(blockers, "fee_quote_donor_deducted_net_invalid", donorDeductedNetValid);
  addBlocker(blockers, "fee_quote_sponsor_paid_net_invalid", sponsorPaidNetValid);
  addBlocker(blockers, "fee_quote_waived_fee_invalid", waivedFeeValid);
  addBlocker(
    blockers,
    "fee_quote_sponsor_backing_hash_invalid",
    quote.sponsorFeeBackingHash == null || isMpgfCrecCanonicalHash(quote.sponsorFeeBackingHash),
  );
  addBlocker(blockers, "fee_quote_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(quote.createdAt));
  addBlocker(blockers, "fee_quote_hash_invalid", isMpgfCrecCanonicalHash(quote.quoteHash));
  addBlocker(blockers, "fee_quote_hash_mismatch", quote.quoteHash === buildMpgfCrecFeeQuoteHash(quote));

  return validationResult(blockers);
}

function buildMpgfCrecFeeQuoteAllocationKey(quote: MpgfCrecFeeQuote) {
  if (
    !isMpgfCrecNonEmptyTrimStableString(quote.roundId) ||
    !isMpgfCrecNonEmptyTrimStableString(quote.commonGroundBudgetId) ||
    !isMpgfCrecNonEmptyTrimStableString(quote.projectId) ||
    !isMpgfCrecNonEmptyTrimStableString(quote.conditionalTradeIntentId)
  ) {
    return null;
  }

  return [
    quote.roundId,
    quote.commonGroundBudgetId,
    quote.projectId,
    quote.conditionalTradeIntentId,
  ].join(":");
}

export function sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
  feeQuotes: unknown,
  selectedFeeQuoteIds: unknown,
  expected: MpgfCrecFeeQuoteExpectedContext & {
    backedFeeSupportPoolCents: number;
    roundCloseBundleEligible: boolean;
  },
): MpgfCrecSponsorPaidFeeSupportDemandResult {
  const blockers: string[] = [];

  addBlocker(
    blockers,
    "fee_support_round_close_bundle_not_eligible",
    expected.roundCloseBundleEligible === true,
  );

  if (!Array.isArray(feeQuotes)) {
    return {
      eligible: false,
      selectedFeeQuoteCount: 0,
      demandCents: 0,
      demandCentsExact: "0",
      blockers: [...blockers, "fee_quote_rows_not_array"],
    };
  }

  if (!isTrimStableStringArray(selectedFeeQuoteIds)) {
    return {
      eligible: false,
      selectedFeeQuoteCount: 0,
      demandCents: 0,
      demandCentsExact: "0",
      blockers: [...blockers, "selected_fee_quote_ids_invalid"],
    };
  }

  let demandCents = BigInt(0);
  const selectedQuotesForAggregate: MpgfCrecFeeQuote[] = [];
  const quotesById = new Map<string, MpgfCrecFeeQuote[]>();
  for (const rawQuote of feeQuotes) {
    if (rawQuote != null && typeof rawQuote === "object") {
      const quote = rawQuote as MpgfCrecFeeQuote;
      const existing = quotesById.get(quote.id) ?? [];
      existing.push(quote);
      quotesById.set(quote.id, existing);
    }
  }

  selectedFeeQuoteIds.forEach((feeQuoteId) => {
    const matches = quotesById.get(feeQuoteId) ?? [];
    if (matches.length !== 1) {
      blockers.push(`selected_fee_quote_${feeQuoteId}_not_unique`);
      return;
    }

    const quote = matches[0];
    selectedQuotesForAggregate.push(quote);
    const validation = validateMpgfCrecFeeQuote(quote, {
      ...expected,
      commonGroundBudgetId: quote.commonGroundBudgetId,
      projectId: quote.projectId,
      conditionalTradeIntentId: quote.conditionalTradeIntentId,
      positiveAllocationRequired: true,
    });

    if (!validation.eligible) {
      blockers.push(...validation.blockers.map((blocker) => `${feeQuoteId}:${blocker}`));
      return;
    }

    if (quote.feePayer === "sponsor_paid" && quote.feeCents > 0) {
      demandCents += BigInt(quote.feeCents);
    }
  });

  const selectedAllocationKeys = selectedQuotesForAggregate.map(buildMpgfCrecFeeQuoteAllocationKey);
  selectedAllocationKeys.forEach((allocationKey, index) => {
    addBlocker(
      blockers,
      `selected_fee_quote_${selectedQuotesForAggregate[index]?.id ?? index}_allocation_key_invalid`,
      allocationKey != null,
    );
  });
  addBlocker(
    blockers,
    "selected_fee_quote_allocation_keys_duplicate",
    !hasDuplicate(selectedAllocationKeys.filter((allocationKey): allocationKey is string => allocationKey != null)),
  );

  if (demandCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    blockers.push("selected_fee_quote_demand_sum_unsafe");
    demandCents = BigInt(0);
  }

  addBlocker(blockers, "fee_support_backed_pool_invalid", isNonNegativeSafeIntegerCents(expected.backedFeeSupportPoolCents));
  if (isNonNegativeSafeIntegerCents(expected.backedFeeSupportPoolCents)) {
    addBlocker(
      blockers,
      "fee_support_pool_underbacked",
      demandCents <= BigInt(expected.backedFeeSupportPoolCents),
    );
  }

  const eligible = blockers.length === 0;

  return {
    eligible,
    selectedFeeQuoteCount: selectedFeeQuoteIds.length,
    demandCents: eligible ? Number(demandCents) : 0,
    demandCentsExact: demandCents.toString(),
    blockers,
  };
}

function optimizationRunTraceHashPayload(trace: Omit<MpgfCrecOptimizationRunTrace, "optimizationTraceHash">) {
  return {
    id: trace.id,
    roundId: trace.roundId,
    clearingInputBundleId: trace.clearingInputBundleId,
    clearingInputBundleHash: trace.clearingInputBundleHash,
    calculationVersion: trace.calculationVersion,
    optimizationStage: trace.optimizationStage,
    traceSchemaVersion: trace.traceSchemaVersion,
    optimizationPolicyHash: trace.optimizationPolicyHash,
    selectedForBinding: trace.selectedForBinding,
    solverMode: trace.solverMode,
    solverVersion: trace.solverVersion,
    optimalityStatus: trace.optimalityStatus,
    optimizationInputHash: trace.optimizationInputHash,
    objectiveVectorHash: trace.objectiveVectorHash,
    stableTieBreakTupleHash: trace.stableTieBreakTupleHash,
    selectedCoalitionHash: trace.selectedCoalitionHash,
    successRewardInputHash: trace.successRewardInputHash,
    coordinationCreditInputHash: trace.coordinationCreditInputHash,
    impactCertificateInputHash: trace.impactCertificateInputHash,
    selectedAllocationRowsHash: trace.selectedAllocationRowsHash,
    constraintSatisfactionHash: trace.constraintSatisfactionHash,
    createdAt: trace.createdAt,
  };
}

export function buildMpgfCrecOptimizationRunTraceHash(
  trace: Omit<MpgfCrecOptimizationRunTrace, "optimizationTraceHash">,
) {
  return hashMpgfCrecV1125Value(optimizationRunTraceHashPayload(trace));
}

export function validateMpgfCrecOptimizationRunTrace(
  trace: MpgfCrecOptimizationRunTrace | null | undefined,
  expected: MpgfCrecOptimizationRunTraceExpectedContext,
) {
  const blockers: string[] = [];

  if (trace == null) {
    return validationResult(["optimization_trace_missing"]);
  }

  const solverStatusCoherent =
    (
      trace.solverMode === "ilp" &&
      trace.optimalityStatus === "optimal"
    ) ||
    (
      trace.solverMode === "deterministic_greedy" &&
      trace.optimalityStatus === "deterministic_greedy_selected"
    );

  addBlocker(blockers, "optimization_trace_id_invalid", isMpgfCrecNonEmptyTrimStableString(trace.id));
  addBlocker(blockers, "optimization_trace_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(trace.roundId));
  addBlocker(blockers, "optimization_trace_wrong_round", trace.roundId === expected.roundId);
  addBlocker(blockers, "optimization_trace_bundle_id_invalid", isMpgfCrecNonEmptyTrimStableString(trace.clearingInputBundleId));
  addBlocker(blockers, "optimization_trace_wrong_bundle_id", trace.clearingInputBundleId === expected.clearingInputBundleId);
  addBlocker(blockers, "optimization_trace_bundle_hash_invalid", isMpgfCrecCanonicalHash(trace.clearingInputBundleHash));
  addBlocker(blockers, "optimization_trace_wrong_bundle_hash", trace.clearingInputBundleHash === expected.clearingInputBundleHash);
  addBlocker(blockers, "optimization_trace_calculation_version_invalid", isMpgfCrecNonEmptyTrimStableString(trace.calculationVersion));
  addBlocker(blockers, "optimization_trace_wrong_calculation_version", trace.calculationVersion === expected.calculationVersion);
  addBlocker(blockers, "optimization_trace_stage_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMIZATION_STAGES.includes(trace.optimizationStage));
  addBlocker(blockers, "optimization_trace_schema_version_invalid", isMpgfCrecNonEmptyTrimStableString(trace.traceSchemaVersion));
  addBlocker(blockers, "optimization_trace_policy_hash_invalid", isMpgfCrecCanonicalHash(trace.optimizationPolicyHash));
  addBlocker(blockers, "optimization_trace_wrong_policy_hash", trace.optimizationPolicyHash === expected.optimizationPolicyHash);
  addBlocker(blockers, "optimization_trace_not_selected_for_binding", trace.selectedForBinding === true);
  addBlocker(blockers, "optimization_trace_solver_mode_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES.includes(trace.solverMode));
  addBlocker(blockers, "optimization_trace_solver_version_invalid", isMpgfCrecNonEmptyTrimStableString(trace.solverVersion));
  addBlocker(blockers, "optimization_trace_optimality_status_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES.includes(trace.optimalityStatus as MpgfCrecOptimalityStatus));
  addBlocker(blockers, "optimization_trace_solver_status_incoherent", solverStatusCoherent);
  addBlocker(blockers, "optimization_trace_input_hash_invalid", isMpgfCrecCanonicalHash(trace.optimizationInputHash));
  addBlocker(blockers, "optimization_trace_objective_vector_hash_invalid", isMpgfCrecCanonicalHash(trace.objectiveVectorHash));
  addBlocker(blockers, "optimization_trace_tie_break_hash_invalid", isMpgfCrecCanonicalHash(trace.stableTieBreakTupleHash));
  addBlocker(blockers, "optimization_trace_selected_coalition_hash_invalid", isMpgfCrecCanonicalHash(trace.selectedCoalitionHash));
  addBlocker(blockers, "optimization_trace_success_reward_input_hash_invalid", isMpgfCrecCanonicalHash(trace.successRewardInputHash));
  addBlocker(blockers, "optimization_trace_wrong_success_reward_input_hash", trace.successRewardInputHash === expected.successRewardInputHash);
  addBlocker(blockers, "optimization_trace_coordination_credit_input_hash_invalid", isMpgfCrecCanonicalHash(trace.coordinationCreditInputHash));
  addBlocker(blockers, "optimization_trace_wrong_coordination_credit_input_hash", trace.coordinationCreditInputHash === expected.coordinationCreditInputHash);
  addBlocker(blockers, "optimization_trace_impact_certificate_input_hash_invalid", isMpgfCrecCanonicalHash(trace.impactCertificateInputHash));
  addBlocker(blockers, "optimization_trace_wrong_impact_certificate_input_hash", trace.impactCertificateInputHash === expected.impactCertificateInputHash);
  addBlocker(blockers, "optimization_trace_selected_allocation_rows_hash_invalid", isMpgfCrecCanonicalHash(trace.selectedAllocationRowsHash));
  addBlocker(blockers, "optimization_trace_constraint_satisfaction_hash_invalid", isMpgfCrecCanonicalHash(trace.constraintSatisfactionHash));
  addBlocker(blockers, "optimization_trace_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(trace.createdAt));
  addBlocker(blockers, "optimization_trace_hash_invalid", isMpgfCrecCanonicalHash(trace.optimizationTraceHash));
  addBlocker(
    blockers,
    "optimization_trace_hash_mismatch",
    trace.optimizationTraceHash === buildMpgfCrecOptimizationRunTraceHash(trace),
  );

  return validationResult(blockers);
}

export function validateMpgfCrecOptimizationRunTraceSelection(
  rows: unknown,
  expected: MpgfCrecOptimizationRunTraceExpectedContext,
): MpgfCrecOptimizationRunTraceSelectionResult {
  const blockers: string[] = [];

  addBlocker(blockers, "optimization_trace_rows_not_array", Array.isArray(rows));

  const rowArray = Array.isArray(rows) ? rows : [];
  const selectedRows = rowArray.filter(
    (row) => asObjectRow(row)?.selectedForBinding === true,
  );
  const selectedTrace = selectedRows.length === 1
    ? selectedRows[0] as MpgfCrecOptimizationRunTrace
    : null;

  addBlocker(blockers, "optimization_trace_selected_row_count_not_one", selectedRows.length === 1);

  if (selectedTrace != null) {
    const traceResult = validateMpgfCrecOptimizationRunTrace(selectedTrace, expected);
    blockers.push(...traceResult.blockers);
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    selectedTraceCount: selectedRows.length,
    selectedTraceId: selectedTrace?.id ?? null,
    selectedTraceHash: selectedTrace?.optimizationTraceHash ?? null,
  };
}

function roundAuditBundleHashPayload(bundle: Omit<MpgfCrecRoundAuditBundle, "auditBundleHash">) {
  return {
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    calculationVersion: bundle.calculationVersion,
    clearingInputBundleId: bundle.clearingInputBundleId,
    clearingInputBundleHash: bundle.clearingInputBundleHash,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    feeInputHash: bundle.feeInputHash,
    feePolicyHash: bundle.feePolicyHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    deploymentAuditHash: bundle.deploymentAuditHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    optimizationTraceId: bundle.optimizationTraceId,
    optimizationTraceHash: bundle.optimizationTraceHash,
    projectInputHash: bundle.projectInputHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    bonusScoreHash: bundle.bonusScoreHash,
    createdAt: bundle.createdAt,
  };
}

export function buildMpgfCrecRoundAuditBundleHash(
  bundle: Omit<MpgfCrecRoundAuditBundle, "auditBundleHash">,
) {
  return hashMpgfCrecV1125Value(roundAuditBundleHashPayload(bundle));
}

export function validateMpgfCrecRoundAuditBundle(
  bundle: MpgfCrecRoundAuditBundle | null | undefined,
  expected: MpgfCrecRoundAuditBundleExpectedContext,
) {
  const blockers: string[] = [];

  if (bundle == null) {
    return validationResult(["round_audit_bundle_missing"]);
  }

  addBlocker(blockers, "round_audit_bundle_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.id));
  addBlocker(blockers, "round_audit_bundle_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.roundId));
  addBlocker(blockers, "round_audit_bundle_wrong_round", bundle.roundId === expected.roundId);
  addBlocker(blockers, "round_audit_bundle_rulebook_hash_invalid", isMpgfCrecCanonicalHash(bundle.rulebookHash));
  addBlocker(blockers, "round_audit_bundle_wrong_rulebook_hash", bundle.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "round_audit_bundle_calculation_version_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.calculationVersion));
  addBlocker(blockers, "round_audit_bundle_wrong_calculation_version", bundle.calculationVersion === expected.calculationVersion);
  addBlocker(blockers, "round_audit_bundle_clearing_bundle_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.clearingInputBundleId));
  addBlocker(blockers, "round_audit_bundle_wrong_clearing_bundle_id", bundle.clearingInputBundleId === expected.clearingInputBundleId);
  addBlocker(blockers, "round_audit_bundle_clearing_bundle_hash_invalid", isMpgfCrecCanonicalHash(bundle.clearingInputBundleHash));
  addBlocker(blockers, "round_audit_bundle_wrong_clearing_bundle_hash", bundle.clearingInputBundleHash === expected.clearingInputBundleHash);
  addBlocker(blockers, "round_audit_bundle_canonical_input_hash_invalid", isMpgfCrecCanonicalHash(bundle.canonicalInputJsonHash));
  addBlocker(blockers, "round_audit_bundle_wrong_canonical_input_hash", bundle.canonicalInputJsonHash === expected.canonicalInputJsonHash);
  addBlocker(blockers, "round_audit_bundle_fee_input_hash_invalid", isMpgfCrecCanonicalHash(bundle.feeInputHash));
  addBlocker(blockers, "round_audit_bundle_wrong_fee_input_hash", bundle.feeInputHash === expected.feeInputHash);
  addBlocker(blockers, "round_audit_bundle_fee_policy_hash_invalid", isMpgfCrecCanonicalHash(bundle.feePolicyHash));
  addBlocker(blockers, "round_audit_bundle_wrong_fee_policy_hash", bundle.feePolicyHash === expected.feePolicyHash);
  addBlocker(blockers, "round_audit_bundle_deployment_exposure_hash_invalid", isMpgfCrecCanonicalHash(bundle.deploymentExposureInputHash));
  addBlocker(blockers, "round_audit_bundle_wrong_deployment_exposure_hash", bundle.deploymentExposureInputHash === expected.deploymentExposureInputHash);
  addBlocker(blockers, "round_audit_bundle_payment_path_hash_invalid", isMpgfCrecCanonicalHash(bundle.paymentReconciliationPathHash));
  addBlocker(blockers, "round_audit_bundle_wrong_payment_path_hash", bundle.paymentReconciliationPathHash === expected.paymentReconciliationPathHash);
  addBlocker(
    blockers,
    "round_audit_bundle_deployment_audit_hash_invalid",
    bundle.deploymentAuditHash == null || isMpgfCrecCanonicalHash(bundle.deploymentAuditHash),
  );
  addBlocker(
    blockers,
    "round_audit_bundle_wrong_deployment_audit_hash",
    bundle.deploymentAuditHash === expected.deploymentAuditHash,
  );
  addBlocker(blockers, "round_audit_bundle_optimization_policy_hash_invalid", isMpgfCrecCanonicalHash(bundle.optimizationPolicyHash));
  addBlocker(blockers, "round_audit_bundle_wrong_optimization_policy_hash", bundle.optimizationPolicyHash === expected.optimizationPolicyHash);
  addBlocker(blockers, "round_audit_bundle_optimization_trace_id_invalid", isMpgfCrecNonEmptyTrimStableString(bundle.optimizationTraceId));
  addBlocker(blockers, "round_audit_bundle_wrong_optimization_trace_id", bundle.optimizationTraceId === expected.optimizationTraceId);
  addBlocker(blockers, "round_audit_bundle_optimization_trace_hash_invalid", isMpgfCrecCanonicalHash(bundle.optimizationTraceHash));
  addBlocker(blockers, "round_audit_bundle_wrong_optimization_trace_hash", bundle.optimizationTraceHash === expected.optimizationTraceHash);
  addBlocker(blockers, "round_audit_bundle_project_input_hash_invalid", isMpgfCrecCanonicalHash(bundle.projectInputHash));
  addBlocker(blockers, "round_audit_bundle_wrong_project_input_hash", bundle.projectInputHash === expected.projectInputHash);
  addBlocker(blockers, "round_audit_bundle_sponsor_input_hash_invalid", isMpgfCrecCanonicalHash(bundle.sponsorCommitmentInputHash));
  addBlocker(blockers, "round_audit_bundle_wrong_sponsor_input_hash", bundle.sponsorCommitmentInputHash === expected.sponsorCommitmentInputHash);
  addBlocker(blockers, "round_audit_bundle_moral_bucket_hash_invalid", isMpgfCrecCanonicalHash(bundle.moralBucketSnapshotHash));
  addBlocker(blockers, "round_audit_bundle_wrong_moral_bucket_hash", bundle.moralBucketSnapshotHash === expected.moralBucketSnapshotHash);
  addBlocker(blockers, "round_audit_bundle_bonus_score_hash_invalid", isMpgfCrecCanonicalHash(bundle.bonusScoreHash));
  addBlocker(blockers, "round_audit_bundle_wrong_bonus_score_hash", bundle.bonusScoreHash === expected.bonusScoreHash);
  addBlocker(blockers, "round_audit_bundle_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(bundle.createdAt));
  addBlocker(blockers, "round_audit_bundle_hash_invalid", isMpgfCrecCanonicalHash(bundle.auditBundleHash));
  addBlocker(
    blockers,
    "round_audit_bundle_hash_mismatch",
    bundle.auditBundleHash === buildMpgfCrecRoundAuditBundleHash(bundle),
  );

  return validationResult(blockers);
}

function isCanonicalNonNegativeIntegerString(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9]\d*)$/.test(value);
}

function sanitizeBonusScoreUnits(value: unknown) {
  if (!isCanonicalNonNegativeIntegerString(value)) {
    return {
      units: BigInt(0),
      unitsString: "0",
      sanitized: true,
    };
  }

  return {
    units: BigInt(value),
    unitsString: value,
    sanitized: false,
  };
}

function sanitizeNonNegativeSafeCents(value: unknown) {
  if (!isNonNegativeSafeIntegerCents(value)) {
    return {
      cents: 0,
      sanitized: true,
    };
  }

  return {
    cents: value,
    sanitized: false,
  };
}

export function buildMpgfCrecBonusScoreHash(input: MpgfCrecBonusScoreHashInput) {
  return hashMpgfCrecV1125Value({
    calculationVersion: input.calculationVersion,
    fixedPointPrecision: input.fixedPointPrecision,
    roundingMode: input.roundingMode,
    fixedPointConstants: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS,
    stanceWeightFixedByStance: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_STANCE_WEIGHT_FIXED_BY_STANCE,
    rows: input.rows.map((row) => ({
      projectId: row.projectId,
      bonusScoreUnits: row.bonusScoreUnits,
    })),
  });
}

export function allocateMpgfCrecBonusMatchByScoreUnits(
  input: MpgfCrecBonusScoreUnitAllocationInput,
): MpgfCrecBonusScoreUnitAllocationResult {
  const blockers: string[] = [];
  const sanitizedRowCodes: string[] = [];

  addBlocker(blockers, "bonus_score_allocation_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "bonus_score_allocation_bundle_hash_invalid", isMpgfCrecCanonicalHash(input.clearingInputBundleHash));
  addBlocker(blockers, "bonus_score_allocation_bonus_score_hash_invalid", isMpgfCrecCanonicalHash(input.bonusScoreHash));
  addBlocker(blockers, "bonus_score_allocation_calculation_version_invalid", isMpgfCrecNonEmptyTrimStableString(input.calculationVersion));
  addBlocker(blockers, "bonus_score_allocation_pool_invalid", isNonNegativeSafeIntegerCents(input.backedBonusMatchPoolCents));
  addBlocker(blockers, "bonus_score_allocation_rows_not_array", Array.isArray(input.rows));

  const rows = Array.isArray(input.rows) ? input.rows : [];
  const projectIds = rows.map((row) => row.projectId);
  addBlocker(
    blockers,
    "bonus_score_allocation_project_ids_invalid",
    projectIds.every(isMpgfCrecNonEmptyTrimStableString),
  );
  addBlocker(blockers, "bonus_score_allocation_project_ids_not_unique", !hasDuplicate(projectIds));
  addBlocker(
    blockers,
    "bonus_score_allocation_stable_order_keys_invalid",
    rows.every((row) => isMpgfCrecCanonicalHash(row.stableOrderKey)),
  );

  const zeroResult = (): MpgfCrecBonusScoreUnitAllocationResult => ({
    eligible: false,
    blockers,
    allocatedBonusCentsByProjectId: Object.fromEntries(projectIds.map((projectId) => [projectId, 0])),
    sanitizedBonusScoreUnitsByProjectId: Object.fromEntries(projectIds.map((projectId) => [projectId, "0"])),
    sanitizedBonusCapCentsByProjectId: Object.fromEntries(projectIds.map((projectId) => [projectId, 0])),
    sanitizedRowCodes,
    totalAllocatedCents: 0,
    unallocatedBonusPoolCents: isNonNegativeSafeIntegerCents(input.backedBonusMatchPoolCents)
      ? input.backedBonusMatchPoolCents
      : 0,
    totalBonusScoreUnitsExact: "0",
  });

  if (blockers.length > 0) {
    return zeroResult();
  }

  const normalizedRows = rows.map((row, index) => {
    const scoreUnits = sanitizeBonusScoreUnits(row.bonusScoreUnits);
    const cap = sanitizeNonNegativeSafeCents(row.bonusCapCents);

    if (scoreUnits.sanitized) {
      sanitizedRowCodes.push(`bonus_score_units_${index}_sanitized_to_zero`);
    }

    if (cap.sanitized) {
      sanitizedRowCodes.push(`bonus_cap_cents_${index}_sanitized_to_zero`);
    }

    return {
      projectId: row.projectId,
      stableOrderKey: row.stableOrderKey,
      bonusScoreUnits: scoreUnits.units,
      bonusScoreUnitsString: scoreUnits.unitsString,
      bonusCapCents: cap.cents,
      allocatedCents: BigInt(0),
    };
  });

  let remainingPoolCents = BigInt(input.backedBonusMatchPoolCents);

  while (remainingPoolCents > BigInt(0)) {
    const activeRows = normalizedRows.filter(
      (row) => row.bonusScoreUnits > BigInt(0) && row.allocatedCents < BigInt(row.bonusCapCents),
    );
    const totalActiveUnits = sumMpgfCrecNonNegativeBigInt(
      activeRows.map((row) => row.bonusScoreUnits),
    );

    if (activeRows.length === 0 || totalActiveUnits === BigInt(0)) {
      break;
    }

    let allocatedThisPass = BigInt(0);
    const remainders: Array<{
      projectId: string;
      remainder: bigint;
      stableOrderKey: string;
    }> = [];

    activeRows.forEach((row) => {
      const remainingCap = BigInt(row.bonusCapCents) - row.allocatedCents;
      const weightedPool = remainingPoolCents * row.bonusScoreUnits;
      const floorShare = weightedPool / totalActiveUnits;
      const cappedShare = floorShare > remainingCap ? remainingCap : floorShare;

      row.allocatedCents += cappedShare;
      allocatedThisPass += cappedShare;

      if (row.allocatedCents < BigInt(row.bonusCapCents)) {
        remainders.push({
          projectId: row.projectId,
          remainder: weightedPool % totalActiveUnits,
          stableOrderKey: row.stableOrderKey,
        });
      }
    });

    remainingPoolCents -= allocatedThisPass;

    if (remainingPoolCents === BigInt(0)) {
      break;
    }

    const remainderOrder = remainders.sort((left, right) => {
      if (left.remainder !== right.remainder) {
        return left.remainder > right.remainder ? -1 : 1;
      }

      const keyComparison = left.stableOrderKey.localeCompare(right.stableOrderKey);
      if (keyComparison !== 0) {
        return keyComparison;
      }

      return left.projectId.localeCompare(right.projectId);
    });

    let remainderAllocated = BigInt(0);
    remainderOrder.forEach((entry) => {
      if (remainingPoolCents === BigInt(0)) {
        return;
      }

      const row = normalizedRows.find((candidate) => candidate.projectId === entry.projectId);
      if (row == null || row.allocatedCents >= BigInt(row.bonusCapCents)) {
        return;
      }

      row.allocatedCents += BigInt(1);
      remainingPoolCents -= BigInt(1);
      remainderAllocated += BigInt(1);
    });

    if (allocatedThisPass === BigInt(0) && remainderAllocated === BigInt(0)) {
      break;
    }
  }

  const allocatedBonusCentsByProjectId = Object.fromEntries(
    normalizedRows.map((row) => [row.projectId, Number(row.allocatedCents)]),
  );
  const sanitizedBonusScoreUnitsByProjectId = Object.fromEntries(
    normalizedRows.map((row) => [row.projectId, row.bonusScoreUnitsString]),
  );
  const sanitizedBonusCapCentsByProjectId = Object.fromEntries(
    normalizedRows.map((row) => [row.projectId, row.bonusCapCents]),
  );
  const totalAllocatedCents = Number(
    sumMpgfCrecNonNegativeBigInt(normalizedRows.map((row) => row.allocatedCents)),
  );
  const totalBonusScoreUnitsExact = sumMpgfCrecNonNegativeBigInt(
    normalizedRows.map((row) => row.bonusScoreUnits),
  ).toString();

  return {
    eligible: true,
    blockers,
    allocatedBonusCentsByProjectId,
    sanitizedBonusScoreUnitsByProjectId,
    sanitizedBonusCapCentsByProjectId,
    sanitizedRowCodes,
    totalAllocatedCents,
    unallocatedBonusPoolCents: Number(remainingPoolCents),
    totalBonusScoreUnitsExact,
  };
}

function asObjectArray(value: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.some((row) => row == null || typeof row !== "object" || Array.isArray(row))) {
    return null;
  }

  return value as Array<Record<string, unknown>>;
}

function rowField(row: Record<string, unknown>, field: string) {
  return row[field];
}

function validRowString(row: Record<string, unknown>, field: string) {
  return isMpgfCrecNonEmptyTrimStableString(rowField(row, field));
}

function rowKey(row: Record<string, unknown>, fields: readonly string[]) {
  if (!fields.every((field) => validRowString(row, field))) {
    return null;
  }

  return fields.map((field) => String(rowField(row, field))).join(":");
}

function addDuplicateKeyBlocker(
  blockers: string[],
  rows: readonly Record<string, unknown>[],
  fields: readonly string[],
  blockerCode: string,
) {
  const keys = rows.map((row) => rowKey(row, fields)).filter((key): key is string => key != null);
  addBlocker(blockers, blockerCode, !hasDuplicate(keys));
}

function countRowsWithKey(rows: readonly Record<string, unknown>[], fields: readonly string[], expectedKey: string) {
  return rows.filter((row) => rowKey(row, fields) === expectedKey).length;
}

function rowUniquenessHashPayload(input: MpgfCrecRoundCloseBundleRowUniquenessInput) {
  const normalizeRows = (value: unknown, fields: readonly string[]) => {
    const rows = asObjectArray(value) ?? [];

    return rows
      .map((row) => rowKey(row, fields) ?? "malformed")
      .sort((left, right) => left.localeCompare(right));
  };

  return {
    roundId: input.roundId,
    projectId: input.projectId,
    participantId: input.participantId,
    commonGroundBudgetId: input.commonGroundBudgetId,
    paymentSnapshotKind: input.paymentSnapshotKind,
    publicGoodProjectKeys: normalizeRows(input.publicGoodProjects, ["roundId", "id"]),
    commonGroundBudgetByIdKeys: normalizeRows(input.commonGroundBudgets, ["roundId", "id"]),
    commonGroundBudgetByParticipantKeys: normalizeRows(input.commonGroundBudgets, ["roundId", "participantId"]),
    supportStanceKeys: normalizeRows(input.supportStances, ["roundId", "commonGroundBudgetId", "projectId"]),
    conditionalTradeIntentKeys: normalizeRows(input.conditionalTradeIntents, ["roundId", "commonGroundBudgetId", "projectId"]),
    identityEligibilityKeys: normalizeRows(input.identityEligibilityRows, ["roundId", "participantId"]),
    paymentSnapshotKeys: normalizeRows(input.paymentCommitmentSnapshots, ["roundId", "commonGroundBudgetId", "snapshotKind"]),
    projectEligibilitySnapshotKeys: normalizeRows(input.projectRoundEligibilitySnapshots, ["roundId", "projectId"]),
  };
}

export function buildMpgfCrecRoundCloseBundleRowUniquenessHash(
  input: MpgfCrecRoundCloseBundleRowUniquenessInput,
) {
  return hashMpgfCrecV1125Value(rowUniquenessHashPayload(input));
}

export function resolveMpgfCrecCommonGroundBudgetAllocationInputs(
  input: MpgfCrecCommonGroundBudgetAllocationInput,
): MpgfCrecCommonGroundBudgetAllocationResult {
  const rowFailureCodes: string[] = [];
  const row = asObjectRow(input.commonGroundBudget);
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.participantId) &&
    isMpgfCrecCanonicalHash(input.rulebookHash);
  const rowUnique =
    input.selectedCommonGroundBudgetByIdRowCount === 1 &&
    input.selectedCommonGroundBudgetByParticipantRowCount === 1;

  if (!contextValid) {
    rowFailureCodes.push("common_ground_budget_context_invalid");
  }

  if (!rowUnique) {
    rowFailureCodes.push("common_ground_budget_row_count_not_unique");
  }

  if (input.commonGroundBudget == null) {
    rowFailureCodes.push("common_ground_budget_row_missing");
  } else if (row == null) {
    rowFailureCodes.push("common_ground_budget_row_not_object");
  }

  const rowBound =
    contextValid &&
    rowUnique &&
    row != null &&
    isMpgfCrecNonEmptyTrimStableString(row.id) &&
    isMpgfCrecNonEmptyTrimStableString(row.participantId) &&
    row.roundId === input.roundId &&
    row.participantId === input.participantId;

  if (row != null && !rowBound) {
    rowFailureCodes.push("common_ground_budget_row_not_bound");
  }

  const rawTotalBudgetCents = rowBound ? row.totalBudgetCents : null;
  const totalBudgetCentsValid = isPositiveSafeIntegerCents(rawTotalBudgetCents);
  const safeCommonGroundBudgetTotalCents = totalBudgetCentsValid ? rawTotalBudgetCents : 0;

  if (rowBound && !totalBudgetCentsValid) {
    rowFailureCodes.push("common_ground_budget_total_cents_invalid_zeroed");
  }

  const rawPerProjectCapCents = rowBound ? row.perProjectCapCents : null;
  const perProjectCapCentsValid = isNonNegativeSafeIntegerCents(rawPerProjectCapCents);
  const safeCommonGroundBudgetPerProjectCapCents = perProjectCapCentsValid
    ? rawPerProjectCapCents
    : 0;

  if (rowBound && !perProjectCapCentsValid) {
    rowFailureCodes.push("common_ground_budget_per_project_cap_cents_invalid_zeroed");
  }

  const commonGroundBudgetCapsValid = rowBound && totalBudgetCentsValid && perProjectCapCentsValid;
  const rawBudgetPeriod = rowBound ? row.budgetPeriod : null;
  const budgetPeriodEligible =
    rowBound && MPGF_PUBLIC_GOODS_CRECM_V1125_BUDGET_PERIODS.includes(rawBudgetPeriod as MpgfCrecBudgetPeriod);
  const budgetPeriod = budgetPeriodEligible ? rawBudgetPeriod as MpgfCrecBudgetPeriod : null;

  if (rowBound && !budgetPeriodEligible) {
    rowFailureCodes.push("common_ground_budget_period_invalid");
  }

  const recurringBudgetConsentEligible =
    rowBound &&
    budgetPeriodEligible &&
    (budgetPeriod === "one_time" ||
      ((budgetPeriod === "per_round" || budgetPeriod === "monthly") &&
        isMpgfCrecNonEmptyTrimStableString(row.recurringConsentVersion) &&
        isMpgfCrecCanonicalUtcTimestamp(row.nextCaptureAt) &&
        isMpgfCrecNonEmptyTrimStableString(row.nextCaptureRule)));

  if (rowBound && budgetPeriodEligible && !recurringBudgetConsentEligible) {
    rowFailureCodes.push("common_ground_budget_recurring_consent_invalid");
  }

  const rawFallbackRule = rowBound ? row.fallbackRule : null;
  const budgetFallbackRuleEligible =
    rowBound && MPGF_PUBLIC_GOODS_CRECM_V1125_FALLBACK_RULES.includes(rawFallbackRule as MpgfCrecFallbackRule);
  const budgetFallbackRule = budgetFallbackRuleEligible ? rawFallbackRule as MpgfCrecFallbackRule : null;

  if (rowBound && !budgetFallbackRuleEligible) {
    rowFailureCodes.push("common_ground_budget_fallback_rule_invalid");
  }

  const rulebookConsentEligible = rowBound && row.rulebookHashAtConsent === input.rulebookHash;

  if (rowBound && !rulebookConsentEligible) {
    rowFailureCodes.push("common_ground_budget_rulebook_consent_invalid");
  }

  const stateAllowsAllocation = rowBound && row.state === "active" && row.canceledAt == null;

  if (rowBound && !stateAllowsAllocation) {
    rowFailureCodes.push("common_ground_budget_state_inactive_or_canceled");
  }

  const budgetEligible =
    rowBound &&
    commonGroundBudgetCapsValid &&
    safeCommonGroundBudgetTotalCents > 0 &&
    budgetPeriodEligible &&
    recurringBudgetConsentEligible &&
    budgetFallbackRuleEligible &&
    rulebookConsentEligible &&
    stateAllowsAllocation;
  const allocatableCents = budgetEligible
    ? minMpgfCrecNonNegativeSafeInteger(
        safeCommonGroundBudgetTotalCents,
        safeCommonGroundBudgetPerProjectCapCents,
      )
    : 0;
  const commonGroundBudgetId = rowBound && typeof row.id === "string" ? row.id : null;
  const commonGroundBudgetParticipantId = rowBound && typeof row.participantId === "string"
    ? row.participantId
    : null;
  const paymentSnapshotLookupAllowed = budgetEligible && commonGroundBudgetId != null;

  return {
    commonGroundBudgetRowEligible: rowBound,
    commonGroundBudgetId,
    commonGroundBudgetParticipantId,
    safeCommonGroundBudgetTotalCents,
    safeCommonGroundBudgetPerProjectCapCents,
    commonGroundBudgetCapsValid,
    budgetPeriod,
    budgetPeriodEligible,
    recurringBudgetConsentEligible,
    budgetFallbackRule,
    budgetFallbackRuleEligible,
    rulebookConsentEligible,
    stateAllowsAllocation,
    budgetEligible,
    allocatableCents,
    paymentSnapshotLookupAllowed,
    paymentSnapshotLookupKey: paymentSnapshotLookupAllowed
      ? {
          roundId: input.roundId,
          commonGroundBudgetId,
          snapshotKind: "round_close",
        }
      : null,
    exposesPaymentAuthority: false,
    rowFailureCodes,
  };
}

export function resolveMpgfCrecSupportStanceAllocationInputs(
  input: MpgfCrecSupportStanceAllocationInput,
): MpgfCrecSupportStanceAllocationResult {
  const rowFailureCodes: string[] = [];
  const row = asObjectRow(input.supportStance);
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.commonGroundBudgetId) &&
    isMpgfCrecNonEmptyTrimStableString(input.participantId) &&
    isMpgfCrecNonEmptyTrimStableString(input.projectId);

  if (!contextValid) {
    rowFailureCodes.push("support_stance_context_invalid");
  }

  if (input.supportStance == null) {
    rowFailureCodes.push("support_stance_row_missing");
  } else if (row == null) {
    rowFailureCodes.push("support_stance_row_not_object");
  }

  const rowBound =
    contextValid &&
    row != null &&
    isMpgfCrecNonEmptyTrimStableString(row.id) &&
    row.roundId === input.roundId &&
    row.commonGroundBudgetId === input.commonGroundBudgetId &&
    row.participantId === input.participantId &&
    row.projectId === input.projectId;

  if (row != null && !rowBound) {
    rowFailureCodes.push("support_stance_row_not_bound");
  }

  const rawStance = rowBound ? row.stance : null;
  const stanceValid =
    rawStance === "strong" ||
    rawStance === "weak" ||
    rawStance === "dissent" ||
    rawStance === "abstain";
  const effectiveStance: MpgfCrecSupportStance = stanceValid ? rawStance : "abstain";

  if (rowBound && !stanceValid) {
    rowFailureCodes.push("support_stance_invalid_stance_defaulted_to_abstain");
  }

  const maxAllocCentsValid = rowBound && isNonNegativeSafeIntegerCents(row.maxAllocCents);
  const supportStanceMaxAllocCents: number = maxAllocCentsValid
    ? Number(row.maxAllocCents)
    : 0;

  if (rowBound && !maxAllocCentsValid) {
    rowFailureCodes.push("support_stance_max_alloc_cents_invalid_zeroed");
  }

  const maxAllocBpsRaw = rowBound ? row.maxAllocBps ?? null : null;
  const maxAllocBpsValid = rowBound && (maxAllocBpsRaw == null || isValidBps(maxAllocBpsRaw));
  const supportStanceMaxAllocBps: number | null =
    maxAllocBpsValid && maxAllocBpsRaw != null ? Number(maxAllocBpsRaw) : null;

  if (rowBound && !maxAllocBpsValid) {
    rowFailureCodes.push("support_stance_max_alloc_bps_invalid_zeroed");
  }

  const safeCommonGroundBudgetTotalCents = isNonNegativeSafeIntegerCents(input.commonGroundBudgetTotalCents)
    ? input.commonGroundBudgetTotalCents
    : 0;

  if (!isNonNegativeSafeIntegerCents(input.commonGroundBudgetTotalCents)) {
    rowFailureCodes.push("support_stance_budget_total_cents_invalid_zeroed");
  }

  const supportStanceCapsValid = rowBound && maxAllocCentsValid && maxAllocBpsValid;
  const supportStanceBpsCapCents =
    supportStanceMaxAllocBps == null
      ? supportStanceMaxAllocCents
      : floorMulDivNonNegativeSafeInteger(safeCommonGroundBudgetTotalCents, supportStanceMaxAllocBps, 10_000);
  const stanceCapCents = supportStanceCapsValid
    ? minMpgfCrecNonNegativeSafeInteger(supportStanceMaxAllocCents, supportStanceBpsCapCents)
    : 0;
  const allocatableCents =
    supportStanceCapsValid && (effectiveStance === "strong" || effectiveStance === "weak")
      ? stanceCapCents
      : 0;

  const rawAcceptableCounterBucketIds = rowBound ? row.acceptableCounterBucketIds : null;
  const counterBucketsValid = isTrimStableStringArray(rawAcceptableCounterBucketIds);
  const acceptableCounterBucketIds =
    counterBucketsValid && (effectiveStance === "strong" || effectiveStance === "weak")
      ? intersectMpgfCrecTrimStableStringArrays(rawAcceptableCounterBucketIds)
      : [];

  if (rowBound && !counterBucketsValid) {
    rowFailureCodes.push("support_stance_counterparty_buckets_malformed_empty");
  }

  const rawRankOrder = rowBound ? row.rankOrder : null;
  const rankOrder: number | null =
    rawRankOrder == null ? null : isNonNegativeSafeIntegerCents(rawRankOrder) ? rawRankOrder : null;

  if (rowBound && rawRankOrder != null && !isNonNegativeSafeIntegerCents(rawRankOrder)) {
    rowFailureCodes.push("support_stance_rank_order_invalid_null");
  }

  return {
    supportStanceInputEligible: rowBound,
    effectiveStance,
    supportStanceId: rowBound && typeof row.id === "string" ? row.id : null,
    supportStanceMaxAllocCents,
    supportStanceMaxAllocBps,
    supportStanceCapsValid,
    stanceCapCents,
    allocatableCents,
    acceptableCounterBucketIds,
    exposesCounterpartyBuckets: acceptableCounterBucketIds.length > 0,
    exposesPaymentAuthority: false,
    rankOrder,
    unrestrictedRoutingOptIn: rowBound && row.unrestrictedRoutingOptIn === true,
    defaultedToAbstain: !rowBound || !stanceValid,
    rowFailureCodes,
  };
}

export function resolveMpgfCrecPlainStanceLabel(
  plainLabel: unknown,
): MpgfCrecPlainStanceLabelResolutionResult {
  const rowFailureCodes: string[] = [];

  if (typeof plainLabel !== "string") {
    rowFailureCodes.push("plain_stance_label_not_string");

    return {
      labelEligible: false,
      plainLabel: null,
      canonicalStance: null,
      allocatableAfterExplicitSave: false,
      counterpartyConditionRequired: false,
      reviewPressureOnly: false,
      zeroAllocationRequired: true,
      defaultSkip: false,
      finalReviewCanonicalDisclosureRequired: true,
      explicitSaveRequiredBeforeAllocation: true,
      canonicalEffectDescription: null,
      rowFailureCodes,
    };
  }

  if (plainLabel.trim() !== plainLabel) {
    rowFailureCodes.push("plain_stance_label_not_trim_stable");
  }

  const canonicalStance =
    MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_TO_CANONICAL_STANCE[
      plainLabel as MpgfCrecPlainStanceLabel
    ] ?? null;

  if (canonicalStance == null) {
    rowFailureCodes.push("plain_stance_label_not_recognized");

    return {
      labelEligible: false,
      plainLabel: null,
      canonicalStance: null,
      allocatableAfterExplicitSave: false,
      counterpartyConditionRequired: false,
      reviewPressureOnly: false,
      zeroAllocationRequired: true,
      defaultSkip: false,
      finalReviewCanonicalDisclosureRequired: true,
      explicitSaveRequiredBeforeAllocation: true,
      canonicalEffectDescription: null,
      rowFailureCodes,
    };
  }

  const allocatableAfterExplicitSave = canonicalStance === "strong" || canonicalStance === "weak";
  const counterpartyConditionRequired = canonicalStance === "weak";
  const reviewPressureOnly = canonicalStance === "dissent";
  const defaultSkip = canonicalStance === "abstain";

  return {
    labelEligible: rowFailureCodes.length === 0,
    plainLabel: plainLabel as MpgfCrecPlainStanceLabel,
    canonicalStance,
    allocatableAfterExplicitSave,
    counterpartyConditionRequired,
    reviewPressureOnly,
    zeroAllocationRequired: !allocatableAfterExplicitSave,
    defaultSkip,
    finalReviewCanonicalDisclosureRequired: true,
    explicitSaveRequiredBeforeAllocation: true,
    canonicalEffectDescription:
      canonicalStance === "strong"
        ? "ProjectSupportStance.stance = strong; allocatable only after explicit cap, condition acceptance, and final save."
        : canonicalStance === "weak"
          ? "ProjectSupportStance.stance = weak; allocatable only after explicit cap, cross-view counterparty condition acceptance, and final save."
          : canonicalStance === "dissent"
            ? "ProjectSupportStance.stance = dissent; allocates zero and can only increase review pressure under identity-clear non-duplicate rules."
            : "ProjectSupportStance.stance = abstain; default skip state with zero allocation.",
    rowFailureCodes,
  };
}

export function resolveMpgfCrecConditionalIntentAllocationInputs(
  input: MpgfCrecConditionalIntentAllocationInput,
): MpgfCrecConditionalIntentAllocationResult {
  const rowFailureCodes: string[] = [];
  const row = asObjectRow(input.conditionalTradeIntent);
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.commonGroundBudgetId) &&
    isMpgfCrecNonEmptyTrimStableString(input.participantId) &&
    isMpgfCrecNonEmptyTrimStableString(input.projectId) &&
    isMpgfCrecCanonicalHash(input.rulebookHash);
  const rowUnique = input.selectedConditionalTradeIntentRowCount === 1;

  if (!contextValid) {
    rowFailureCodes.push("conditional_intent_context_invalid");
  }

  if (!rowUnique) {
    rowFailureCodes.push("conditional_intent_row_count_not_unique");
  }

  if (input.conditionalTradeIntent == null) {
    rowFailureCodes.push("conditional_intent_row_missing");
  } else if (row == null) {
    rowFailureCodes.push("conditional_intent_row_not_object");
  }

  const rowBound =
    contextValid &&
    rowUnique &&
    row != null &&
    isMpgfCrecNonEmptyTrimStableString(row.id) &&
    row.roundId === input.roundId &&
    row.commonGroundBudgetId === input.commonGroundBudgetId &&
    row.participantId === input.participantId &&
    row.projectId === input.projectId;

  if (row != null && !rowBound) {
    rowFailureCodes.push("conditional_intent_row_not_bound");
  }

  const rawIntentState = rowBound ? row.state : null;
  const conditionalIntentState = MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_STATES.includes(
    rawIntentState as MpgfCrecConditionalIntentState,
  )
    ? rawIntentState as MpgfCrecConditionalIntentState
    : rowBound
      ? "malformed"
      : null;

  if (rowBound && conditionalIntentState === "malformed") {
    rowFailureCodes.push("conditional_intent_state_malformed");
  }

  if (rowBound && conditionalIntentState !== "active") {
    rowFailureCodes.push("conditional_intent_state_not_active");
  }

  const rawAuthorizationState = rowBound ? row.authorizationState : null;
  const authorizationState = MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_AUTHORIZATION_STATES.includes(
    rawAuthorizationState as MpgfCrecConditionalIntentAuthorizationState,
  )
    ? rawAuthorizationState as MpgfCrecConditionalIntentAuthorizationState
    : rowBound
      ? "malformed"
      : null;
  const authorizationStateEligible =
    authorizationState != null &&
    authorizationState !== "malformed" &&
    (MPGF_PUBLIC_GOODS_CRECM_V1125_CONDITIONAL_INTENT_CLEARING_AUTHORIZATION_STATES as readonly string[]).includes(
      authorizationState,
    );

  if (rowBound && authorizationState === "malformed") {
    rowFailureCodes.push("conditional_intent_authorization_state_malformed");
  }

  if (rowBound && authorizationState !== "malformed" && !authorizationStateEligible) {
    rowFailureCodes.push("conditional_intent_authorization_state_not_precapture");
  }

  const rawFallbackRule = rowBound ? row.fallbackRule : null;
  const fallbackRuleEligible =
    rowBound && MPGF_PUBLIC_GOODS_CRECM_V1125_FALLBACK_RULES.includes(rawFallbackRule as MpgfCrecFallbackRule);
  const fallbackRule = fallbackRuleEligible ? rawFallbackRule as MpgfCrecFallbackRule : null;

  if (rowBound && !fallbackRuleEligible) {
    rowFailureCodes.push("conditional_intent_fallback_rule_invalid");
  }

  const budgetAndIntentFallbackRuleConsistent =
    fallbackRuleEligible && input.budgetFallbackRule === fallbackRule;

  if (rowBound && fallbackRuleEligible && !budgetAndIntentFallbackRuleConsistent) {
    rowFailureCodes.push("conditional_intent_budget_fallback_rule_mismatch");
  }

  const rulebookConsentEligible = rowBound && row.rulebookHashAtConsent === input.rulebookHash;

  if (rowBound && !rulebookConsentEligible) {
    rowFailureCodes.push("conditional_intent_rulebook_consent_invalid");
  }

  const amountValid = rowBound && isPositiveSafeIntegerCents(row.amountCents);
  const conditionalIntentAmountCents = amountValid ? Number(row.amountCents) : 0;

  if (rowBound && !amountValid) {
    rowFailureCodes.push("conditional_intent_amount_cents_invalid_zeroed");
  }

  const maxExposureValid = rowBound && isPositiveSafeIntegerCents(row.maxExposureCents);
  const conditionalIntentMaxExposureCents = maxExposureValid ? Number(row.maxExposureCents) : 0;

  if (rowBound && !maxExposureValid) {
    rowFailureCodes.push("conditional_intent_max_exposure_cents_invalid_zeroed");
  }

  const minCounterpartyVolumeValid = rowBound && isPositiveSafeIntegerCents(row.minCounterpartyVolumeCents);
  const conditionalIntentMinCounterpartyVolumeCents = minCounterpartyVolumeValid
    ? Number(row.minCounterpartyVolumeCents)
    : 0;

  if (rowBound && !minCounterpartyVolumeValid) {
    rowFailureCodes.push("conditional_intent_min_counterparty_volume_invalid_zeroed");
  }

  const rawAcceptableCounterBucketIds = rowBound ? row.acceptableCounterBucketIds : null;
  const counterBucketsValid = isTrimStableStringArray(rawAcceptableCounterBucketIds);
  const acceptableCounterBucketIds = counterBucketsValid
    ? intersectMpgfCrecTrimStableStringArrays(rawAcceptableCounterBucketIds)
    : [];

  if (rowBound && !counterBucketsValid) {
    rowFailureCodes.push("conditional_intent_counterparty_buckets_malformed_empty");
  }

  const conditionalIntentEligible =
    rowBound &&
    conditionalIntentState === "active" &&
    authorizationStateEligible &&
    fallbackRuleEligible &&
    budgetAndIntentFallbackRuleConsistent &&
    rulebookConsentEligible &&
    conditionalIntentAmountCents > 0 &&
    conditionalIntentMaxExposureCents > 0 &&
    conditionalIntentMinCounterpartyVolumeCents > 0 &&
    acceptableCounterBucketIds.length > 0;
  const intentCapCents = conditionalIntentEligible
    ? minMpgfCrecNonNegativeSafeInteger(
        conditionalIntentAmountCents,
        conditionalIntentMaxExposureCents,
      )
    : 0;

  return {
    conditionalIntentRowEligible: rowBound,
    conditionalTradeIntentId: rowBound && typeof row.id === "string" ? row.id : null,
    conditionalIntentState,
    authorizationState,
    authorizationStateEligible,
    fallbackRule,
    fallbackRuleEligible,
    budgetAndIntentFallbackRuleConsistent,
    rulebookConsentEligible,
    conditionalIntentAmountCents,
    conditionalIntentMaxExposureCents,
    conditionalIntentMinCounterpartyVolumeCents,
    acceptableCounterBucketIds,
    conditionalIntentEligible,
    intentCapCents,
    crossViewIntentEligible: conditionalIntentEligible,
    exposesFallbackAuthority: conditionalIntentEligible,
    exposesAuthorizationAuthority: conditionalIntentEligible,
    exposesCounterpartyBuckets: conditionalIntentEligible && acceptableCounterBucketIds.length > 0,
    failureBonusEligibilityInputsAllowed: conditionalIntentEligible,
    rowFailureCodes,
  };
}

function isMpgfCrecCounterpartyVolumeSource(value: unknown): value is MpgfCrecCounterpartyVolumeSource {
  return MPGF_PUBLIC_GOODS_CRECM_V1125_COUNTERPARTY_VOLUME_SOURCES.includes(
    value as MpgfCrecCounterpartyVolumeSource,
  );
}

function isMpgfCrecCounterpartyVolumeCandidateRow(
  row: unknown,
): row is MpgfCrecCounterpartyVolumeCandidateRow {
  if (row == null || typeof row !== "object" || Array.isArray(row)) {
    return false;
  }

  const candidate = row as MpgfCrecCounterpartyVolumeCandidateRow;

  return (
    isMpgfCrecNonEmptyTrimStableString(candidate.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.projectId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.participantId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.counterpartyParticipantId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.counterpartyBucketId) &&
    isMpgfCrecCounterpartyVolumeSource(candidate.counterpartyVolumeSource) &&
    isPositiveSafeIntegerCents(candidate.netRecipientDisbursedCents) &&
    isPositiveSafeIntegerCents(candidate.matchEligibleCents) &&
    typeof candidate.counterpartyHumanVerified === "boolean" &&
    MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES.includes(candidate.counterpartySybilRiskState) &&
    MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES.includes(candidate.counterpartyCollusionRiskState) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.participantLinkedAccountClusterId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.counterpartyLinkedAccountClusterId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.participantSamePaymentMethodClusterId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.counterpartySamePaymentMethodClusterId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.participantSameControlEntityId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.counterpartySameControlEntityId)
  );
}

export function evaluateMpgfCrecCounterpartyVolumeSatisfaction(
  input: MpgfCrecCounterpartyVolumeSatisfactionInput,
): MpgfCrecCounterpartyVolumeSatisfactionResult {
  const blockers: string[] = [];
  const excludedRowCodes: string[] = [];

  addBlocker(blockers, "counterparty_volume_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "counterparty_volume_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.projectId));
  addBlocker(blockers, "counterparty_volume_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.participantId));
  addBlocker(blockers, "counterparty_volume_project_bucket_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.projectBucketId));

  const thresholdValid = isPositiveSafeIntegerCents(input.conditionalIntentMinCounterpartyVolumeCents);
  addBlocker(blockers, "counterparty_volume_threshold_invalid", thresholdValid);

  const acceptableCounterBucketIdsValid = isTrimStableStringArray(input.acceptableCounterBucketIds);
  const frozenReciprocalCounterBucketIdsValid = isTrimStableStringArray(input.frozenReciprocalCounterBucketIds);
  addBlocker(blockers, "counterparty_volume_acceptable_buckets_invalid", acceptableCounterBucketIdsValid);
  addBlocker(blockers, "counterparty_volume_frozen_reciprocal_buckets_invalid", frozenReciprocalCounterBucketIdsValid);
  addBlocker(blockers, "counterparty_volume_rows_not_array", Array.isArray(input.rows));

  const validatedCounterBucketIds =
    acceptableCounterBucketIdsValid && frozenReciprocalCounterBucketIdsValid
      ? intersectMpgfCrecTrimStableStringArrays(
          input.acceptableCounterBucketIds,
          input.frozenReciprocalCounterBucketIds,
        ).filter((bucketId) => bucketId !== input.projectBucketId)
      : [];

  const countedCounterpartyParticipantIds = new Set<string>();
  const countedCents: number[] = [];

  if (blockers.length === 0 && Array.isArray(input.rows)) {
    input.rows.forEach((row, index) => {
      if (!isMpgfCrecCounterpartyVolumeCandidateRow(row)) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_malformed`);
        return;
      }

      if (
        row.roundId !== input.roundId ||
        row.projectId !== input.projectId ||
        row.participantId !== input.participantId
      ) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_wrong_context`);
        return;
      }

      if (row.counterpartyParticipantId === input.participantId) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_self_match`);
        return;
      }

      if (row.counterpartyVolumeSource !== "net_recipient_public_good_credit") {
        excludedRowCodes.push(`counterparty_volume_row_${index}_non_public_good_credit_source`);
        return;
      }

      if (row.counterpartyBucketId === input.projectBucketId) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_same_bucket`);
        return;
      }

      if (!validatedCounterBucketIds.includes(row.counterpartyBucketId)) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_bucket_not_frozen_reciprocal`);
        return;
      }

      if (row.counterpartyHumanVerified !== true) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_counterparty_identity_not_verified`);
        return;
      }

      if (row.counterpartySybilRiskState !== "clear") {
        excludedRowCodes.push(`counterparty_volume_row_${index}_counterparty_sybil_not_clear`);
        return;
      }

      if (row.counterpartyCollusionRiskState !== "clear") {
        excludedRowCodes.push(`counterparty_volume_row_${index}_counterparty_collusion_not_clear`);
        return;
      }

      if (row.participantLinkedAccountClusterId === row.counterpartyLinkedAccountClusterId) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_linked_account_cluster`);
        return;
      }

      if (row.participantSamePaymentMethodClusterId === row.counterpartySamePaymentMethodClusterId) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_same_payment_method_cluster`);
        return;
      }

      if (row.participantSameControlEntityId === row.counterpartySameControlEntityId) {
        excludedRowCodes.push(`counterparty_volume_row_${index}_same_control_entity`);
        return;
      }

      countedCounterpartyParticipantIds.add(row.counterpartyParticipantId);
      countedCents.push(
        minMpgfCrecNonNegativeSafeInteger(
          row.netRecipientDisbursedCents,
          row.matchEligibleCents,
        ),
      );
    });
  }

  const countedCounterpartyVolumeExact = sumMpgfCrecNonNegativeBigInt(countedCents);
  const countedCounterpartyVolumeCents =
    countedCounterpartyVolumeExact <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(countedCounterpartyVolumeExact)
      : 0;

  if (countedCounterpartyVolumeExact > BigInt(Number.MAX_SAFE_INTEGER)) {
    excludedRowCodes.push("counterparty_volume_aggregate_unsafe_zeroed");
  }

  const conditionalIntentMinCounterpartyVolumeCents = thresholdValid
    ? Number(input.conditionalIntentMinCounterpartyVolumeCents)
    : 0;

  return {
    eligible: blockers.length === 0,
    blockers,
    conditionalIntentMinCounterpartyVolumeCents,
    validatedCounterBucketIds,
    countedCounterpartyVolumeCents,
    counterpartyVolumeSatisfied:
      blockers.length === 0 &&
      countedCounterpartyVolumeCents >= conditionalIntentMinCounterpartyVolumeCents,
    countedCounterpartyParticipantIds: [...countedCounterpartyParticipantIds]
      .sort((left, right) => left.localeCompare(right)),
    excludedRowCodes,
  };
}

function readMpgfCrecRoundKeyedCents(
  value: unknown,
  roundId: string,
  entityId: string,
  failurePrefix: string,
  rowFailureCodes: string[],
) {
  const map = asObjectRow(value);
  if (map == null) {
    rowFailureCodes.push(`${failurePrefix}_map_malformed`);
    return 0;
  }

  const roundMap = asObjectRow(map[roundId]);
  if (roundMap == null) {
    rowFailureCodes.push(`${failurePrefix}_round_missing`);
    return 0;
  }

  const rawCents = roundMap[entityId];
  if (!isNonNegativeSafeIntegerCents(rawCents)) {
    rowFailureCodes.push(`${failurePrefix}_cents_invalid_zeroed`);
    return 0;
  }

  return rawCents;
}

export function resolveMpgfCrecAllocatorStateInputs(
  input: MpgfCrecAllocatorStateInput,
): MpgfCrecAllocatorStateResult {
  const rowFailureCodes: string[] = [];
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.participantId) &&
    isMpgfCrecNonEmptyTrimStableString(input.projectId);

  if (!contextValid) {
    rowFailureCodes.push("allocator_state_context_invalid");
  }

  const participantRemainingRoundBudgetCents = contextValid
    ? readMpgfCrecRoundKeyedCents(
        input.participantRemainingBudgetCentsByRoundAndParticipantId,
        input.roundId,
        input.participantId,
        "allocator_state_participant_remaining_budget",
        rowFailureCodes,
      )
    : 0;
  const projectRemainingRequestedCapCents = contextValid
    ? readMpgfCrecRoundKeyedCents(
        input.projectRemainingRequestedCapCentsByRoundAndProjectId,
        input.roundId,
        input.projectId,
        "allocator_state_project_remaining_cap",
        rowFailureCodes,
      )
    : 0;
  const allocatorStateEligible =
    contextValid &&
    participantRemainingRoundBudgetCents > 0 &&
    projectRemainingRequestedCapCents > 0 &&
    rowFailureCodes.length === 0;

  return {
    participantRemainingRoundBudgetCents,
    projectRemainingRequestedCapCents,
    participantRemainingLookupKey: contextValid
      ? {
          roundId: input.roundId,
          participantId: input.participantId,
        }
      : null,
    projectRemainingLookupKey: contextValid
      ? {
          roundId: input.roundId,
          projectId: input.projectId,
        }
      : null,
    allocatorStateEligible,
    actualAllocationCapCents: allocatorStateEligible
      ? minMpgfCrecNonNegativeSafeInteger(
          participantRemainingRoundBudgetCents,
          projectRemainingRequestedCapCents,
        )
      : 0,
    wrongRoundRowsIgnored: true,
    rowFailureCodes,
  };
}

export function resolveMpgfCrecIdentityEligibilityAllocationInputs(
  input: MpgfCrecIdentityEligibilityAllocationInput,
): MpgfCrecIdentityEligibilityAllocationResult {
  const rowFailureCodes: string[] = [];
  const row = asObjectRow(input.identityEligibility);
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.participantId);
  const rowUnique = input.selectedIdentityEligibilityRowCount === 1;

  if (!contextValid) {
    rowFailureCodes.push("identity_eligibility_context_invalid");
  }

  if (!rowUnique) {
    rowFailureCodes.push("identity_eligibility_row_count_not_unique");
  }

  if (input.identityEligibility == null) {
    rowFailureCodes.push("identity_eligibility_row_missing");
  } else if (row == null) {
    rowFailureCodes.push("identity_eligibility_row_not_object");
  }

  const rowBound =
    contextValid &&
    rowUnique &&
    row != null &&
    row.roundId === input.roundId &&
    row.participantId === input.participantId;

  if (row != null && !rowBound) {
    rowFailureCodes.push("identity_eligibility_row_not_bound");
  }

  const countingThresholdValid = isValidBps(input.identityWeightMinForCountingBps);
  const bonusThresholdValid = isValidBps(input.identityWeightMinForBonusBps);
  const identityWeightMinForCountingBps: number = countingThresholdValid
    ? Number(input.identityWeightMinForCountingBps)
    : 10_000;
  const identityWeightMinForBonusBps: number = bonusThresholdValid
    ? Number(input.identityWeightMinForBonusBps)
    : 10_000;

  if (!countingThresholdValid) {
    rowFailureCodes.push("identity_eligibility_counting_threshold_invalid_fail_closed");
  }

  if (!bonusThresholdValid) {
    rowFailureCodes.push("identity_eligibility_bonus_threshold_invalid_fail_closed");
  }

  const rawIdentityWeightBps = rowBound ? row.countedWeightBps : null;
  const identityWeightValid = rowBound && isValidBps(rawIdentityWeightBps);
  const identityWeightBps: number = identityWeightValid ? Number(rawIdentityWeightBps) : 0;

  if (rowBound && !identityWeightValid) {
    rowFailureCodes.push("identity_eligibility_weight_invalid_zeroed");
  }

  const rawSybilRiskState = rowBound ? row.sybilRiskState : null;
  const sybilRiskState = MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES.includes(
    rawSybilRiskState as MpgfCrecIdentityRiskState,
  )
    ? rawSybilRiskState as MpgfCrecIdentityRiskState
    : "malformed";

  if (rowBound && sybilRiskState === "malformed") {
    rowFailureCodes.push("identity_eligibility_sybil_state_malformed");
  }

  const rawCollusionRiskState = rowBound ? row.collusionRiskState : null;
  const collusionRiskState = MPGF_PUBLIC_GOODS_CRECM_V1125_IDENTITY_RISK_STATES.includes(
    rawCollusionRiskState as MpgfCrecIdentityRiskState,
  )
    ? rawCollusionRiskState as MpgfCrecIdentityRiskState
    : "malformed";

  if (rowBound && collusionRiskState === "malformed") {
    rowFailureCodes.push("identity_eligibility_collusion_state_malformed");
  }

  const humanVerified = rowBound && row.humanVerified === true;
  const identityCountingClear =
    rowBound &&
    humanVerified &&
    sybilRiskState === "clear" &&
    collusionRiskState === "clear";
  const countedContributionAllowed =
    identityCountingClear && identityWeightBps >= identityWeightMinForCountingBps;
  const bonusEligible =
    identityCountingClear && identityWeightBps >= identityWeightMinForBonusBps;

  return {
    identityEligibilityRowEligible: rowBound,
    identityWeightBps,
    identityWeightMinForCountingBps,
    identityWeightMinForBonusBps,
    humanVerified,
    sybilRiskState,
    collusionRiskState,
    identityCountingClear,
    countedContributionAllowed,
    verifiedSupporterCountAllowed: countedContributionAllowed,
    activeClusterCountAllowed: countedContributionAllowed,
    counterpartyVolumeAllowed: countedContributionAllowed,
    sponsorMatchEligible: bonusEligible,
    failureBonusEligible: bonusEligible,
    rowFailureCodes,
  };
}

function sanitizeRoundSponsorBudgetCents(
  value: unknown,
  failureCode: string,
  rowFailureCodes: string[],
) {
  if (!isNonNegativeSafeIntegerCents(value)) {
    rowFailureCodes.push(failureCode);
    return 0;
  }

  return value;
}

export function resolveMpgfCrecEconomicInputSanitization(
  input: MpgfCrecEconomicInputSanitizationInput,
): MpgfCrecEconomicInputSanitizationResult {
  const rowFailureCodes: string[] = [];
  const contextValid =
    isMpgfCrecNonEmptyTrimStableString(input.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(input.projectId);
  const rowUnique = input.selectedPublicGoodProjectRowCount === 1;
  const row = asObjectRow(input.publicGoodProject);

  if (!contextValid) {
    rowFailureCodes.push("economic_input_context_invalid");
  }

  if (!rowUnique) {
    rowFailureCodes.push("project_economic_terms_row_count_not_unique");
  }

  if (input.publicGoodProject == null) {
    rowFailureCodes.push("project_economic_terms_row_missing");
  } else if (row == null) {
    rowFailureCodes.push("project_economic_terms_row_not_object");
  }

  const safeRoundBaseMatchBudgetCents = sanitizeRoundSponsorBudgetCents(
    input.roundBaseMatchBudgetCents,
    "round_base_match_budget_cents_invalid_zeroed",
    rowFailureCodes,
  );
  const safeRoundBonusMatchBudgetCents = sanitizeRoundSponsorBudgetCents(
    input.roundBonusMatchBudgetCents,
    "round_bonus_match_budget_cents_invalid_zeroed",
    rowFailureCodes,
  );
  const safeRoundFailureBonusBudgetCents = sanitizeRoundSponsorBudgetCents(
    input.roundFailureBonusBudgetCents,
    "round_failure_bonus_budget_cents_invalid_zeroed",
    rowFailureCodes,
  );
  const totalSponsorPayoutAvailabilityExact = sumMpgfCrecNonNegativeBigInt([
    safeRoundBaseMatchBudgetCents,
    safeRoundBonusMatchBudgetCents,
    safeRoundFailureBonusBudgetCents,
  ]);
  const totalSponsorPayoutAvailabilityCents =
    totalSponsorPayoutAvailabilityExact <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(totalSponsorPayoutAvailabilityExact)
      : 0;

  if (totalSponsorPayoutAvailabilityExact > BigInt(Number.MAX_SAFE_INTEGER)) {
    rowFailureCodes.push("round_sponsor_budget_total_availability_unsafe_zeroed");
  }

  const rowBound =
    contextValid &&
    rowUnique &&
    row != null &&
    isMpgfCrecNonEmptyTrimStableString(row.id) &&
    isMpgfCrecNonEmptyTrimStableString(row.bucketId) &&
    row.roundId === input.roundId &&
    row.id === input.projectId;

  if (row != null && !rowBound) {
    rowFailureCodes.push("project_economic_terms_row_not_bound");
  }

  const requestedMaxCentsValid = rowBound && isNonNegativeSafeIntegerCents(row.requestedMaxCents);
  const minimumViableCentsValid = rowBound && isNonNegativeSafeIntegerCents(row.minimumViableCents);
  const thresholdAmountCentsValid = rowBound && isNonNegativeSafeIntegerCents(row.thresholdAmountCents);
  const thresholdSupporterMinValid = rowBound && isNonNegativeSafeIntegerCents(row.thresholdSupporterMin);
  const thresholdClusterMinValid = rowBound && isNonNegativeSafeIntegerCents(row.thresholdClusterMin);

  if (rowBound && !requestedMaxCentsValid) {
    rowFailureCodes.push("project_requested_max_cents_invalid_blocks_clearing");
  }

  if (rowBound && !minimumViableCentsValid) {
    rowFailureCodes.push("project_minimum_viable_cents_invalid_blocks_clearing");
  }

  if (rowBound && !thresholdAmountCentsValid) {
    rowFailureCodes.push("project_threshold_amount_cents_invalid_blocks_clearing");
  }

  if (rowBound && !thresholdSupporterMinValid) {
    rowFailureCodes.push("project_threshold_supporter_min_invalid_blocks_clearing");
  }

  if (rowBound && !thresholdClusterMinValid) {
    rowFailureCodes.push("project_threshold_cluster_min_invalid_blocks_clearing");
  }

  const defaultBaseMatchRatioBps = 10_000;
  const defaultBonusCapMultipleBps = 10_000;
  const rawBaseMatchRatioBps = rowBound ? row.baseMatchRatioBps ?? null : null;
  const baseMatchRatioDefaulted = rawBaseMatchRatioBps == null;
  const baseMatchRatioBpsValid = baseMatchRatioDefaulted || isValidProjectMatchBps(rawBaseMatchRatioBps);
  const safeBaseMatchRatioBps = baseMatchRatioBpsValid
    ? baseMatchRatioDefaulted
      ? defaultBaseMatchRatioBps
      : Number(rawBaseMatchRatioBps)
    : 0;

  if (rowBound && !baseMatchRatioBpsValid) {
    rowFailureCodes.push("project_base_match_ratio_bps_invalid_zeroed");
  }

  const rawBonusCapMultipleBps = rowBound ? row.bonusCapMultipleBps ?? null : null;
  const bonusCapMultipleDefaulted = rawBonusCapMultipleBps == null;
  const bonusCapMultipleBpsValid =
    bonusCapMultipleDefaulted || isValidProjectMatchBps(rawBonusCapMultipleBps);
  const safeBonusCapMultipleBps = bonusCapMultipleBpsValid
    ? bonusCapMultipleDefaulted
      ? defaultBonusCapMultipleBps
      : Number(rawBonusCapMultipleBps)
    : 0;

  if (rowBound && !bonusCapMultipleBpsValid) {
    rowFailureCodes.push("project_bonus_cap_multiple_bps_invalid_zeroed");
  }

  const projectEconomicTermsValid =
    rowBound &&
    requestedMaxCentsValid &&
    minimumViableCentsValid &&
    thresholdAmountCentsValid &&
    thresholdSupporterMinValid &&
    thresholdClusterMinValid;

  return {
    safeRoundBaseMatchBudgetCents,
    safeRoundBonusMatchBudgetCents,
    safeRoundFailureBonusBudgetCents,
    totalSponsorPayoutAvailabilityCents,
    baseMatchAvailabilityCents: safeRoundBaseMatchBudgetCents,
    bonusMatchAvailabilityCents: safeRoundBonusMatchBudgetCents,
    failureBonusAvailabilityCents: safeRoundFailureBonusBudgetCents,
    roundSponsorBudgetInputsValid:
      isNonNegativeSafeIntegerCents(input.roundBaseMatchBudgetCents) &&
      isNonNegativeSafeIntegerCents(input.roundBonusMatchBudgetCents) &&
      isNonNegativeSafeIntegerCents(input.roundFailureBonusBudgetCents) &&
      totalSponsorPayoutAvailabilityExact <= BigInt(Number.MAX_SAFE_INTEGER),
    projectEconomicTermsRowEligible: rowBound,
    projectEconomicTermsValid,
    projectClearingAllowed: projectEconomicTermsValid,
    projectId: rowBound && typeof row.id === "string" ? row.id : null,
    projectBucketId: rowBound && typeof row.bucketId === "string" ? row.bucketId : null,
    safeRequestedMaxCents: requestedMaxCentsValid ? Number(row.requestedMaxCents) : 0,
    safeMinimumViableCents: minimumViableCentsValid ? Number(row.minimumViableCents) : 0,
    safeThresholdAmountCents: thresholdAmountCentsValid ? Number(row.thresholdAmountCents) : 0,
    safeThresholdSupporterMin: thresholdSupporterMinValid
      ? Number(row.thresholdSupporterMin)
      : Number.MAX_SAFE_INTEGER,
    safeThresholdClusterMin: thresholdClusterMinValid
      ? Number(row.thresholdClusterMin)
      : Number.MAX_SAFE_INTEGER,
    defaultBaseMatchRatioBps,
    defaultBonusCapMultipleBps,
    safeBaseMatchRatioBps,
    safeBonusCapMultipleBps,
    baseMatchRatioDefaulted,
    bonusCapMultipleDefaulted,
    rowFailureCodes,
  };
}

export function validateMpgfCrecRoundCloseBundleRowUniqueness(
  input: MpgfCrecRoundCloseBundleRowUniquenessInput,
): MpgfCrecRoundCloseBundleRowUniquenessResult {
  const blockers: string[] = [];

  addBlocker(blockers, "row_uniqueness_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "row_uniqueness_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.projectId));
  addBlocker(blockers, "row_uniqueness_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.participantId));
  addBlocker(blockers, "row_uniqueness_budget_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.commonGroundBudgetId));
  addBlocker(
    blockers,
    "row_uniqueness_payment_snapshot_kind_invalid",
    input.paymentSnapshotKind === "round_close" || input.paymentSnapshotKind === "early_failure_bonus_cutoff",
  );

  const publicGoodProjects = asObjectArray(input.publicGoodProjects);
  const commonGroundBudgets = asObjectArray(input.commonGroundBudgets);
  const supportStances = asObjectArray(input.supportStances);
  const conditionalTradeIntents = asObjectArray(input.conditionalTradeIntents);
  const identityRows = asObjectArray(input.identityEligibilityRows);
  const paymentSnapshots = asObjectArray(input.paymentCommitmentSnapshots);
  const projectEligibilitySnapshots = asObjectArray(input.projectRoundEligibilitySnapshots);

  addBlocker(blockers, "row_uniqueness_projects_not_array", publicGoodProjects != null);
  addBlocker(blockers, "row_uniqueness_budgets_not_array", commonGroundBudgets != null);
  addBlocker(blockers, "row_uniqueness_support_stances_not_array", supportStances != null);
  addBlocker(blockers, "row_uniqueness_conditional_intents_not_array", conditionalTradeIntents != null);
  addBlocker(blockers, "row_uniqueness_identity_rows_not_array", identityRows != null);
  addBlocker(blockers, "row_uniqueness_payment_snapshots_not_array", paymentSnapshots != null);
  addBlocker(blockers, "row_uniqueness_project_eligibility_snapshots_not_array", projectEligibilitySnapshots != null);

  const projects = publicGoodProjects ?? [];
  const budgets = commonGroundBudgets ?? [];
  const stances = supportStances ?? [];
  const intents = conditionalTradeIntents ?? [];
  const identities = identityRows ?? [];
  const payments = paymentSnapshots ?? [];
  const projectSnapshots = projectEligibilitySnapshots ?? [];

  addBlocker(
    blockers,
    "row_uniqueness_project_rows_malformed",
    projects.every((row) => validRowString(row, "roundId") && validRowString(row, "id") && validRowString(row, "bucketId")),
  );
  addBlocker(
    blockers,
    "row_uniqueness_budget_rows_malformed",
    budgets.every((row) => validRowString(row, "roundId") && validRowString(row, "id") && validRowString(row, "participantId")),
  );
  addBlocker(
    blockers,
    "row_uniqueness_support_stance_rows_malformed",
    stances.every(
      (row) =>
        validRowString(row, "id") &&
        validRowString(row, "roundId") &&
        validRowString(row, "commonGroundBudgetId") &&
        validRowString(row, "projectId") &&
        validRowString(row, "participantId"),
    ),
  );
  addBlocker(
    blockers,
    "row_uniqueness_conditional_intent_rows_malformed",
    intents.every(
      (row) =>
        validRowString(row, "id") &&
        validRowString(row, "roundId") &&
        validRowString(row, "commonGroundBudgetId") &&
        validRowString(row, "projectId") &&
        validRowString(row, "participantId"),
    ),
  );
  addBlocker(
    blockers,
    "row_uniqueness_identity_rows_malformed",
    identities.every((row) => validRowString(row, "roundId") && validRowString(row, "participantId")),
  );
  addBlocker(
    blockers,
    "row_uniqueness_payment_snapshot_rows_malformed",
    payments.every(
      (row) =>
        validRowString(row, "roundId") &&
        validRowString(row, "commonGroundBudgetId") &&
        validRowString(row, "snapshotKind"),
    ),
  );
  addBlocker(
    blockers,
    "row_uniqueness_project_eligibility_snapshot_rows_malformed",
    projectSnapshots.every((row) => validRowString(row, "roundId") && validRowString(row, "projectId")),
  );

  addDuplicateKeyBlocker(blockers, projects, ["roundId", "id"], "row_uniqueness_project_duplicate_key");
  addDuplicateKeyBlocker(blockers, budgets, ["roundId", "id"], "row_uniqueness_budget_id_duplicate_key");
  addDuplicateKeyBlocker(blockers, budgets, ["roundId", "participantId"], "row_uniqueness_budget_participant_duplicate_key");
  addDuplicateKeyBlocker(blockers, stances, ["roundId", "commonGroundBudgetId", "projectId"], "row_uniqueness_support_stance_duplicate_key");
  addDuplicateKeyBlocker(blockers, intents, ["roundId", "commonGroundBudgetId", "projectId"], "row_uniqueness_conditional_intent_duplicate_key");
  addDuplicateKeyBlocker(blockers, identities, ["roundId", "participantId"], "row_uniqueness_identity_duplicate_key");
  addDuplicateKeyBlocker(blockers, payments, ["roundId", "commonGroundBudgetId", "snapshotKind"], "row_uniqueness_payment_snapshot_duplicate_key");
  addDuplicateKeyBlocker(blockers, projectSnapshots, ["roundId", "projectId"], "row_uniqueness_project_eligibility_duplicate_key");

  const selectedProjectKey = `${input.roundId}:${input.projectId}`;
  const selectedBudgetByIdKey = `${input.roundId}:${input.commonGroundBudgetId}`;
  const selectedBudgetByParticipantKey = `${input.roundId}:${input.participantId}`;
  const selectedProjectBudgetKey = `${input.roundId}:${input.commonGroundBudgetId}:${input.projectId}`;
  const selectedIdentityKey = `${input.roundId}:${input.participantId}`;
  const selectedPaymentKey = `${input.roundId}:${input.commonGroundBudgetId}:${input.paymentSnapshotKind}`;

  const selectedProjectRowCount = countRowsWithKey(projects, ["roundId", "id"], selectedProjectKey);
  const selectedCommonGroundBudgetByIdCount = countRowsWithKey(budgets, ["roundId", "id"], selectedBudgetByIdKey);
  const selectedCommonGroundBudgetByParticipantCount = countRowsWithKey(budgets, ["roundId", "participantId"], selectedBudgetByParticipantKey);
  const selectedSupportStanceRowCount = countRowsWithKey(stances, ["roundId", "commonGroundBudgetId", "projectId"], selectedProjectBudgetKey);
  const selectedConditionalTradeIntentRowCount = countRowsWithKey(intents, ["roundId", "commonGroundBudgetId", "projectId"], selectedProjectBudgetKey);
  const selectedIdentityEligibilityRowCount = countRowsWithKey(identities, ["roundId", "participantId"], selectedIdentityKey);
  const selectedPaymentCommitmentSnapshotRowCount = countRowsWithKey(payments, ["roundId", "commonGroundBudgetId", "snapshotKind"], selectedPaymentKey);
  const selectedProjectRoundEligibilitySnapshotRowCount = countRowsWithKey(projectSnapshots, ["roundId", "projectId"], selectedProjectKey);

  addBlocker(blockers, "row_uniqueness_selected_project_not_exactly_one", selectedProjectRowCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_budget_by_id_not_exactly_one", selectedCommonGroundBudgetByIdCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_budget_by_participant_not_exactly_one", selectedCommonGroundBudgetByParticipantCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_support_stance_not_exactly_one", selectedSupportStanceRowCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_conditional_intent_not_exactly_one", selectedConditionalTradeIntentRowCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_identity_not_exactly_one", selectedIdentityEligibilityRowCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_payment_snapshot_not_exactly_one", selectedPaymentCommitmentSnapshotRowCount === 1);
  addBlocker(blockers, "row_uniqueness_selected_project_eligibility_not_exactly_one", selectedProjectRoundEligibilitySnapshotRowCount === 1);

  addBlocker(
    blockers,
    "row_uniqueness_selected_support_stance_wrong_participant",
    stances
      .filter((row) => rowKey(row, ["roundId", "commonGroundBudgetId", "projectId"]) === selectedProjectBudgetKey)
      .every((row) => rowField(row, "participantId") === input.participantId),
  );
  addBlocker(
    blockers,
    "row_uniqueness_selected_conditional_intent_wrong_participant",
    intents
      .filter((row) => rowKey(row, ["roundId", "commonGroundBudgetId", "projectId"]) === selectedProjectBudgetKey)
      .every((row) => rowField(row, "participantId") === input.participantId),
  );

  return {
    eligible: blockers.length === 0,
    blockers,
    selectedProjectRowCount,
    selectedCommonGroundBudgetByIdCount,
    selectedCommonGroundBudgetByParticipantCount,
    selectedSupportStanceRowCount,
    selectedConditionalTradeIntentRowCount,
    selectedIdentityEligibilityRowCount,
    selectedPaymentCommitmentSnapshotRowCount,
    selectedProjectRoundEligibilitySnapshotRowCount,
    rowUniquenessHash:
      blockers.length === 0 ? buildMpgfCrecRoundCloseBundleRowUniquenessHash(input) : null,
  };
}

export function normalizeMpgfCrecSupporterCountMinNetPublicGoodCents(value: unknown) {
  return isNonNegativeSafeIntegerCents(value) &&
    value >= MPGF_PUBLIC_GOODS_CRECM_V1125_DEFAULT_SUPPORTER_COUNT_MIN_NET_PUBLIC_GOOD_CENTS
    ? value
    : MPGF_PUBLIC_GOODS_CRECM_V1125_DEFAULT_SUPPORTER_COUNT_MIN_NET_PUBLIC_GOOD_CENTS;
}

function isMpgfCrecNetPublicGoodSupporterCreditRow(
  row: unknown,
): row is MpgfCrecNetPublicGoodSupporterCreditRow {
  if (row == null || typeof row !== "object" || Array.isArray(row)) {
    return false;
  }

  const candidate = row as MpgfCrecNetPublicGoodSupporterCreditRow;

  return (
    isMpgfCrecNonEmptyTrimStableString(candidate.roundId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.projectId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.participantId) &&
    isMpgfCrecNonEmptyTrimStableString(candidate.activeClusterId) &&
    isNonNegativeSafeIntegerCents(candidate.netRecipientDisbursedCents) &&
    typeof candidate.humanVerified === "boolean" &&
    ["clear", "review", "blocked", "unknown"].includes(candidate.sybilRiskState) &&
    ["clear", "review", "blocked", "unknown"].includes(candidate.collusionRiskState) &&
    typeof candidate.linkedAccountExcluded === "boolean" &&
    typeof candidate.samePaymentMethodExcluded === "boolean" &&
    typeof candidate.sameControlExcluded === "boolean"
  );
}

export function evaluateMpgfCrecNetPublicGoodSupporterBreadth(
  input: MpgfCrecNetPublicGoodSupporterBreadthInput,
): MpgfCrecNetPublicGoodSupporterBreadthResult {
  const blockers: string[] = [];
  const excludedRowCodes: string[] = [];
  const floor = normalizeMpgfCrecSupporterCountMinNetPublicGoodCents(
    input.supporterCountMinNetPublicGoodCents,
  );

  addBlocker(blockers, "supporter_breadth_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "supporter_breadth_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.projectId));
  addBlocker(blockers, "supporter_breadth_rows_not_array", Array.isArray(input.rows));

  const countedParticipantIds = new Set<string>();
  const countedActiveClusterIds = new Set<string>();

  if (blockers.length === 0 && Array.isArray(input.rows)) {
    input.rows.forEach((row, index) => {
      if (!isMpgfCrecNetPublicGoodSupporterCreditRow(row)) {
        excludedRowCodes.push(`supporter_row_${index}_malformed`);
        return;
      }

      if (row.roundId !== input.roundId || row.projectId !== input.projectId) {
        excludedRowCodes.push(`supporter_row_${index}_wrong_round_or_project`);
        return;
      }

      if (row.netRecipientDisbursedCents < floor) {
        excludedRowCodes.push(`supporter_row_${index}_below_net_public_good_floor`);
        return;
      }

      if (row.humanVerified !== true) {
        excludedRowCodes.push(`supporter_row_${index}_identity_not_verified`);
        return;
      }

      if (row.sybilRiskState !== "clear") {
        excludedRowCodes.push(`supporter_row_${index}_sybil_not_clear`);
        return;
      }

      if (row.collusionRiskState !== "clear") {
        excludedRowCodes.push(`supporter_row_${index}_collusion_not_clear`);
        return;
      }

      if (
        row.linkedAccountExcluded !== true ||
        row.samePaymentMethodExcluded !== true ||
        row.sameControlExcluded !== true
      ) {
        excludedRowCodes.push(`supporter_row_${index}_counterparty_identity_exclusion_not_clear`);
        return;
      }

      countedParticipantIds.add(row.participantId);
      countedActiveClusterIds.add(row.activeClusterId);
    });
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    supporterCountMinNetPublicGoodCents: floor,
    verifiedSupporterCount: countedParticipantIds.size,
    activeClusterCount: countedActiveClusterIds.size,
    countedParticipantIds: [...countedParticipantIds].sort((left, right) => left.localeCompare(right)),
    countedActiveClusterIds: [...countedActiveClusterIds].sort((left, right) => left.localeCompare(right)),
    excludedRowCodes,
  };
}

function contributorBenefitContextHashPayload(input: MpgfCrecContributorBenefitEligibilityInput) {
  return {
    benefitKind: input.benefitKind,
    roundId: input.roundId,
    projectId: input.projectId,
    participantId: input.participantId,
    commonGroundBudgetId: input.commonGroundBudgetId,
    conditionalTradeIntentId: input.conditionalTradeIntentId,
    rulebookHash: input.rulebookHash,
    clearingInputBundleHash: input.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: input.paymentCommitmentSnapshotHash,
    feeQuoteHash: input.feeQuoteHash,
    contributionRowHash: input.contributionRowHash,
    projectScopeState: input.projectScopeState,
    excludedTradeType: input.excludedTradeType,
    grossCapturedCents: input.grossCapturedCents,
    feeCents: input.feeCents,
    netRecipientDisbursedCents: input.netRecipientDisbursedCents,
    capturedAt: input.capturedAt,
  };
}

export function buildMpgfCrecContributorBenefitContextHash(
  input: MpgfCrecContributorBenefitEligibilityInput,
) {
  return hashMpgfCrecV1125Value(contributorBenefitContextHashPayload(input));
}

export function evaluateMpgfCrecContributorBenefitEligibility(
  input: MpgfCrecContributorBenefitEligibilityInput,
): MpgfCrecContributorBenefitEligibilityResult {
  const blockers: string[] = [];

  addBlocker(blockers, "contributor_benefit_kind_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_CONTRIBUTOR_BENEFIT_KINDS.includes(input.benefitKind));
  addBlocker(blockers, "contributor_benefit_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.roundId));
  addBlocker(blockers, "contributor_benefit_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.projectId));
  addBlocker(blockers, "contributor_benefit_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.participantId));
  addBlocker(blockers, "contributor_benefit_budget_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.commonGroundBudgetId));
  addBlocker(blockers, "contributor_benefit_intent_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.conditionalTradeIntentId));
  addBlocker(blockers, "contributor_benefit_rulebook_hash_invalid", isMpgfCrecCanonicalHash(input.rulebookHash));
  addBlocker(blockers, "contributor_benefit_clearing_bundle_ineligible", input.clearingInputBundleEligible === true);
  addBlocker(blockers, "contributor_benefit_clearing_bundle_hash_invalid", isMpgfCrecCanonicalHash(input.clearingInputBundleHash));
  addBlocker(blockers, "contributor_benefit_payment_snapshot_ineligible", input.paymentSnapshotEligible === true);
  addBlocker(blockers, "contributor_benefit_payment_snapshot_hash_invalid", isMpgfCrecCanonicalHash(input.paymentCommitmentSnapshotHash));
  addBlocker(blockers, "contributor_benefit_fee_quote_hash_invalid", isMpgfCrecCanonicalHash(input.feeQuoteHash));
  addBlocker(blockers, "contributor_benefit_contribution_row_hash_invalid", isMpgfCrecCanonicalHash(input.contributionRowHash));
  addBlocker(blockers, "contributor_benefit_round_status_not_payable", input.roundStatus === "payable");
  addBlocker(blockers, "contributor_benefit_not_captured", input.capturedContributionState === "captured");
  addBlocker(blockers, "contributor_benefit_authorization_not_reconciled", input.authorizationReconciled === true);
  addBlocker(blockers, "contributor_benefit_late_or_unsigned_participant", input.participantSignedBeforeClose === true);
  addBlocker(blockers, "contributor_benefit_missing_locked_preclose_intent", input.lockedPreCloseIntent === true);
  addBlocker(blockers, "contributor_benefit_consent_invalid", input.consentValid === true);
  addBlocker(blockers, "contributor_benefit_identity_not_verified", input.humanVerified === true);
  addBlocker(blockers, "contributor_benefit_sybil_not_clear", input.sybilRiskState === "clear");
  addBlocker(blockers, "contributor_benefit_collusion_not_clear", input.collusionRiskState === "clear");
  addBlocker(blockers, "contributor_benefit_linked_account_not_excluded", input.linkedAccountExcluded === true);
  addBlocker(blockers, "contributor_benefit_same_payment_method_not_excluded", input.samePaymentMethodExcluded === true);
  addBlocker(blockers, "contributor_benefit_same_control_not_excluded", input.sameControlExcluded === true);
  addBlocker(blockers, "contributor_benefit_claimant_conflict_not_clear", input.claimantConflictState === "no_conflict");
  addBlocker(blockers, "contributor_benefit_project_scope_invalid", input.projectScopeState === "valid_moral_public_good");
  addBlocker(blockers, "contributor_benefit_excluded_trade_type_present", input.excludedTradeType === null);
  addBlocker(blockers, "contributor_benefit_externality_not_clear", input.externalityState === "clear");
  addBlocker(blockers, "contributor_benefit_review_not_approved", input.reviewState === "approved");
  addBlocker(blockers, "contributor_benefit_challenge_not_clear", input.challengeState === "clear" || input.challengeState === "non_blocking");
  addBlocker(blockers, "contributor_benefit_gross_cents_invalid", isPositiveSafeIntegerCents(input.grossCapturedCents));
  addBlocker(blockers, "contributor_benefit_fee_cents_invalid", isNonNegativeSafeIntegerCents(input.feeCents));
  addBlocker(blockers, "contributor_benefit_net_recipient_cents_invalid", isPositiveSafeIntegerCents(input.netRecipientDisbursedCents));
  addBlocker(blockers, "contributor_benefit_fee_exceeds_gross", isNonNegativeSafeIntegerCents(input.feeCents) && isPositiveSafeIntegerCents(input.grossCapturedCents) && input.feeCents <= input.grossCapturedCents);
  addBlocker(blockers, "contributor_benefit_captured_at_invalid", isMpgfCrecCanonicalUtcTimestamp(input.capturedAt));

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    benefitContextHash: eligible ? buildMpgfCrecContributorBenefitContextHash(input) : null,
  };
}

function successRewardClaimHashPayload(input: MpgfCrecSuccessRewardClaimInput) {
  return {
    eligibilityHash: buildMpgfCrecContributorBenefitContextHash(input.eligibility),
    successRewardPolicyVersion: input.successRewardPolicyVersion,
    rewardCents: input.rewardCents,
    roundSuccessRewardBudgetCents: input.roundSuccessRewardBudgetCents,
    backedSuccessRewardPoolCents: input.backedSuccessRewardPoolCents,
    dominanceClaimShown: input.dominanceClaimShown,
    maximumPromisedRewardLiabilityCents: input.maximumPromisedRewardLiabilityCents,
  };
}

export function buildMpgfCrecSuccessRewardClaimHash(input: MpgfCrecSuccessRewardClaimInput) {
  return hashMpgfCrecV1125Value(successRewardClaimHashPayload(input));
}

export function evaluateMpgfCrecSuccessRewardClaim(
  input: MpgfCrecSuccessRewardClaimInput,
): MpgfCrecSuccessRewardClaimResult {
  const blockers = evaluateMpgfCrecContributorBenefitEligibility({
    ...input.eligibility,
    benefitKind: "success_reward",
  }).blockers;

  addBlocker(blockers, "success_reward_policy_version_invalid", isMpgfCrecNonEmptyTrimStableString(input.successRewardPolicyVersion));
  addBlocker(blockers, "success_reward_reward_cents_invalid", isPositiveSafeIntegerCents(input.rewardCents));
  addBlocker(blockers, "success_reward_round_budget_invalid", isPositiveSafeIntegerCents(input.roundSuccessRewardBudgetCents));
  addBlocker(blockers, "success_reward_backed_pool_invalid", isPositiveSafeIntegerCents(input.backedSuccessRewardPoolCents));
  addBlocker(blockers, "success_reward_pool_not_fully_backed", isPositiveSafeIntegerCents(input.roundSuccessRewardBudgetCents) && isPositiveSafeIntegerCents(input.backedSuccessRewardPoolCents) && input.backedSuccessRewardPoolCents >= input.roundSuccessRewardBudgetCents);
  addBlocker(blockers, "success_reward_exceeds_round_budget", isPositiveSafeIntegerCents(input.rewardCents) && isPositiveSafeIntegerCents(input.roundSuccessRewardBudgetCents) && input.rewardCents <= input.roundSuccessRewardBudgetCents);
  if (input.dominanceClaimShown) {
    addBlocker(
      blockers,
      "success_reward_dominance_liability_not_fully_backed",
      isPositiveSafeIntegerCents(input.maximumPromisedRewardLiabilityCents) &&
        isPositiveSafeIntegerCents(input.backedSuccessRewardPoolCents) &&
        input.backedSuccessRewardPoolCents >= input.maximumPromisedRewardLiabilityCents,
    );
  }

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    rewardCents: eligible ? input.rewardCents : 0,
    claimHash: eligible ? buildMpgfCrecSuccessRewardClaimHash(input) : null,
  };
}

function coordinationCreditHashPayload(entry: Omit<MpgfCrecCoordinationCreditLedgerEntry, "ledgerEntryHash">) {
  return {
    id: entry.id,
    roundId: entry.roundId,
    projectId: entry.projectId,
    participantId: entry.participantId,
    commonGroundBudgetId: entry.commonGroundBudgetId,
    conditionalTradeIntentId: entry.conditionalTradeIntentId,
    creditKind: entry.creditKind,
    nonTransferable: entry.nonTransferable,
    affectsCountedDollars: entry.affectsCountedDollars,
    affectsMatchEligibility: entry.affectsMatchEligibility,
    affectsCounterpartyVolume: entry.affectsCounterpartyVolume,
    affectsSupporterCounts: entry.affectsSupporterCounts,
    affectsClusterCounts: entry.affectsClusterCounts,
    affectsIdentityWeight: entry.affectsIdentityWeight,
    affectsVotingPower: entry.affectsVotingPower,
    affectsAllocationPower: entry.affectsAllocationPower,
    benefitContextHash: entry.benefitContextHash,
    createdAt: entry.createdAt,
  };
}

export function buildMpgfCrecCoordinationCreditLedgerEntryHash(
  entry: Omit<MpgfCrecCoordinationCreditLedgerEntry, "ledgerEntryHash">,
) {
  return hashMpgfCrecV1125Value(coordinationCreditHashPayload(entry));
}

export function validateMpgfCrecCoordinationCreditLedgerEntry(
  entry: MpgfCrecCoordinationCreditLedgerEntry | null | undefined,
  expected: {
    roundId: string;
    projectId: string;
    participantId: string;
    commonGroundBudgetId: string;
    conditionalTradeIntentId: string;
    benefitContextHash: string;
  },
) {
  const blockers: string[] = [];

  if (entry == null) {
    return validationResult(["coordination_credit_missing"]);
  }

  addBlocker(blockers, "coordination_credit_id_invalid", isMpgfCrecNonEmptyTrimStableString(entry.id));
  addBlocker(blockers, "coordination_credit_wrong_round", entry.roundId === expected.roundId);
  addBlocker(blockers, "coordination_credit_wrong_project", entry.projectId === expected.projectId);
  addBlocker(blockers, "coordination_credit_wrong_participant", entry.participantId === expected.participantId);
  addBlocker(blockers, "coordination_credit_wrong_budget", entry.commonGroundBudgetId === expected.commonGroundBudgetId);
  addBlocker(blockers, "coordination_credit_wrong_intent", entry.conditionalTradeIntentId === expected.conditionalTradeIntentId);
  addBlocker(blockers, "coordination_credit_kind_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_COORDINATION_CREDIT_KINDS.includes(entry.creditKind));
  addBlocker(blockers, "coordination_credit_transferable", entry.nonTransferable === true);
  addBlocker(blockers, "coordination_credit_affects_counted_dollars", entry.affectsCountedDollars === false);
  addBlocker(blockers, "coordination_credit_affects_match_eligibility", entry.affectsMatchEligibility === false);
  addBlocker(blockers, "coordination_credit_affects_counterparty_volume", entry.affectsCounterpartyVolume === false);
  addBlocker(blockers, "coordination_credit_affects_supporter_counts", entry.affectsSupporterCounts === false);
  addBlocker(blockers, "coordination_credit_affects_cluster_counts", entry.affectsClusterCounts === false);
  addBlocker(blockers, "coordination_credit_affects_identity_weight", entry.affectsIdentityWeight === false);
  addBlocker(blockers, "coordination_credit_affects_voting_power", entry.affectsVotingPower === false);
  addBlocker(blockers, "coordination_credit_affects_allocation_power", entry.affectsAllocationPower === false);
  addBlocker(blockers, "coordination_credit_benefit_context_hash_invalid", isMpgfCrecCanonicalHash(entry.benefitContextHash));
  addBlocker(blockers, "coordination_credit_wrong_benefit_context_hash", entry.benefitContextHash === expected.benefitContextHash);
  addBlocker(blockers, "coordination_credit_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(entry.createdAt));
  addBlocker(blockers, "coordination_credit_hash_invalid", isMpgfCrecCanonicalHash(entry.ledgerEntryHash));
  addBlocker(
    blockers,
    "coordination_credit_hash_mismatch",
    entry.ledgerEntryHash === buildMpgfCrecCoordinationCreditLedgerEntryHash(entry),
  );

  return validationResult(blockers);
}

function impactCertificateHashPayload(claim: Omit<MpgfCrecImpactCertificateClaim, "certificateHash">) {
  return {
    id: claim.id,
    roundId: claim.roundId,
    projectId: claim.projectId,
    participantId: claim.participantId,
    commonGroundBudgetId: claim.commonGroundBudgetId,
    conditionalTradeIntentId: claim.conditionalTradeIntentId,
    rulebookHash: claim.rulebookHash,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    feeQuoteHash: claim.feeQuoteHash,
    contributionRowHash: claim.contributionRowHash,
    netRecipientDisbursedCents: claim.netRecipientDisbursedCents,
    capturedAt: claim.capturedAt,
    retroactiveAccessAllowed: claim.retroactiveAccessAllowed,
    doubleCountPreventionHash: claim.doubleCountPreventionHash,
    createdAt: claim.createdAt,
  };
}

export function buildMpgfCrecImpactCertificateClaimHash(
  claim: Omit<MpgfCrecImpactCertificateClaim, "certificateHash">,
) {
  return hashMpgfCrecV1125Value(impactCertificateHashPayload(claim));
}

export function validateMpgfCrecImpactCertificateClaim(
  claim: MpgfCrecImpactCertificateClaim | null | undefined,
  expected: {
    roundId: string;
    projectId: string;
    participantId: string;
    commonGroundBudgetId: string;
    conditionalTradeIntentId: string;
    rulebookHash: string;
    clearingInputBundleHash: string;
    paymentCommitmentSnapshotHash: string;
    feeQuoteHash: string;
    contributionRowHash: string;
  },
) {
  const blockers: string[] = [];

  if (claim == null) {
    return validationResult(["impact_certificate_missing"]);
  }

  addBlocker(blockers, "impact_certificate_id_invalid", isMpgfCrecNonEmptyTrimStableString(claim.id));
  addBlocker(blockers, "impact_certificate_wrong_round", claim.roundId === expected.roundId);
  addBlocker(blockers, "impact_certificate_wrong_project", claim.projectId === expected.projectId);
  addBlocker(blockers, "impact_certificate_wrong_participant", claim.participantId === expected.participantId);
  addBlocker(blockers, "impact_certificate_wrong_budget", claim.commonGroundBudgetId === expected.commonGroundBudgetId);
  addBlocker(blockers, "impact_certificate_wrong_intent", claim.conditionalTradeIntentId === expected.conditionalTradeIntentId);
  addBlocker(blockers, "impact_certificate_wrong_rulebook_hash", claim.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "impact_certificate_wrong_clearing_bundle_hash", claim.clearingInputBundleHash === expected.clearingInputBundleHash);
  addBlocker(blockers, "impact_certificate_wrong_payment_snapshot_hash", claim.paymentCommitmentSnapshotHash === expected.paymentCommitmentSnapshotHash);
  addBlocker(blockers, "impact_certificate_wrong_fee_quote_hash", claim.feeQuoteHash === expected.feeQuoteHash);
  addBlocker(blockers, "impact_certificate_wrong_contribution_row_hash", claim.contributionRowHash === expected.contributionRowHash);
  addBlocker(blockers, "impact_certificate_net_recipient_cents_invalid", isPositiveSafeIntegerCents(claim.netRecipientDisbursedCents));
  addBlocker(blockers, "impact_certificate_captured_at_invalid", isMpgfCrecCanonicalUtcTimestamp(claim.capturedAt));
  addBlocker(blockers, "impact_certificate_retroactive_access_enabled", claim.retroactiveAccessAllowed === false);
  addBlocker(blockers, "impact_certificate_double_count_hash_invalid", isMpgfCrecCanonicalHash(claim.doubleCountPreventionHash));
  addBlocker(blockers, "impact_certificate_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(claim.createdAt));
  addBlocker(blockers, "impact_certificate_hash_invalid", isMpgfCrecCanonicalHash(claim.certificateHash));
  addBlocker(
    blockers,
    "impact_certificate_hash_mismatch",
    claim.certificateHash === buildMpgfCrecImpactCertificateClaimHash(claim),
  );

  return validationResult(blockers);
}

function sponsorCommitmentAmountCents(commitment: MpgfCrecSponsorCommitment) {
  if (commitment.commitmentState === "contractually_committed") {
    return commitment.committedCents;
  }

  return commitment.fundedCents;
}

export function sumMpgfCrecSponsorBackedCentsForFinalClearing(
  commitments: unknown,
  context: MpgfCrecSponsorBackingContext,
): MpgfCrecSponsorBackingResult {
  const blockers: string[] = [];

  if (context.clearingBundleEligible === false) {
    blockers.push("sponsor_backing_clearing_bundle_ineligible");
  }

  if (!Array.isArray(commitments)) {
    return {
      backedCents: 0,
      backedCentsExact: "0",
      includedCommitmentCount: 0,
      excludedCommitmentCount: 0,
      blockers: ["sponsor_commitments_not_array"],
    };
  }

  let backedCents = BigInt(0);
  let includedCommitmentCount = 0;
  let excludedCommitmentCount = 0;

  commitments.forEach((rawCommitment, index) => {
    if (rawCommitment == null || typeof rawCommitment !== "object") {
      blockers.push(`sponsor_commitment_${index}_malformed`);
      return;
    }

    const commitment = rawCommitment as MpgfCrecSponsorCommitment;
    if (commitment.roundId !== context.roundId || commitment.poolType !== context.poolType) {
      excludedCommitmentCount += 1;
      return;
    }

    const rowValid =
      isMpgfCrecNonEmptyTrimStableString(commitment.id) &&
      isMpgfCrecNonEmptyTrimStableString(commitment.roundId) &&
      MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES.includes(commitment.poolType) &&
      MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES.includes(
        commitment.commitmentState as MpgfCrecSponsorBackingState,
      ) &&
      isNonNegativeSafeIntegerCents(commitment.committedCents) &&
      isNonNegativeSafeIntegerCents(commitment.fundedCents) &&
      isMpgfCrecCanonicalHash(commitment.sourceHash) &&
      commitment.sourceHash === context.sponsorPoolSourceHash &&
      isMpgfCrecCanonicalUtcTimestamp(commitment.publishedAt) &&
      isMpgfCrecCanonicalUtcTimestamp(commitment.backingConfirmedAt) &&
      timestampLte(commitment.publishedAt, context.parametersFrozenAt) &&
      timestampLte(commitment.backingConfirmedAt, context.parametersFrozenAt) &&
      timestampLte(commitment.publishedAt, context.opensAt) &&
      timestampLte(commitment.backingConfirmedAt, context.opensAt) &&
      (context.previewAsOf == null ||
        (
          isMpgfCrecCanonicalUtcTimestamp(context.previewAsOf) &&
          timestampLte(commitment.publishedAt, context.previewAsOf) &&
          timestampLte(commitment.backingConfirmedAt, context.previewAsOf)
        ));

    if (!rowValid) {
      blockers.push(`sponsor_commitment_${index}_invalid`);
      return;
    }

    backedCents += BigInt(sponsorCommitmentAmountCents(commitment));
    includedCommitmentCount += 1;
  });

  if (backedCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    blockers.push("sponsor_backing_sum_unsafe");
    backedCents = BigInt(0);
  }

  if (blockers.length > 0) {
    return {
      backedCents: 0,
      backedCentsExact: backedCents.toString(),
      includedCommitmentCount,
      excludedCommitmentCount,
      blockers,
    };
  }

  return {
    backedCents: Number(backedCents),
    backedCentsExact: backedCents.toString(),
    includedCommitmentCount,
    excludedCommitmentCount,
    blockers,
  };
}

export function buildMpgfCrecFailureBonusClaimKey(input: {
  roundId: string;
  projectId: string;
  participantId: string;
  conditionalTradeIntentId: string;
}) {
  if (
    !isMpgfCrecNonEmptyTrimStableString(input.roundId) ||
    !isMpgfCrecNonEmptyTrimStableString(input.projectId) ||
    !isMpgfCrecNonEmptyTrimStableString(input.participantId) ||
    !isMpgfCrecNonEmptyTrimStableString(input.conditionalTradeIntentId)
  ) {
    return null;
  }

  return `${input.roundId}:${input.projectId}:${input.participantId}:${input.conditionalTradeIntentId}`;
}

function failureBonusClaimantConflictSnapshotHashPayload(
  snapshot: Omit<MpgfCrecFailureBonusClaimantConflictSnapshot, "snapshotHash">,
) {
  return {
    id: snapshot.id,
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    conditionalTradeIntentId: snapshot.conditionalTradeIntentId,
    rulebookHash: snapshot.rulebookHash,
    failureBonusPolicyVersion: snapshot.failureBonusPolicyVersion,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    conflictState: snapshot.conflictState,
    createdAt: snapshot.createdAt,
  };
}

export function buildMpgfCrecFailureBonusClaimantConflictSnapshotHash(
  snapshot: Omit<MpgfCrecFailureBonusClaimantConflictSnapshot, "snapshotHash">,
) {
  return hashMpgfCrecV1125Value(failureBonusClaimantConflictSnapshotHashPayload(snapshot));
}

export function validateMpgfCrecFailureBonusClaimantConflictSnapshot(
  snapshot: MpgfCrecFailureBonusClaimantConflictSnapshot | null | undefined,
  expected: MpgfCrecFailureBonusClaimantConflictSnapshotExpectedContext,
) {
  const blockers: string[] = [];

  if (snapshot == null) {
    return validationResult(["failure_bonus_claimant_conflict_snapshot_missing"]);
  }

  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.id));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_kind_invalid", snapshot.snapshotKind === "failure_bonus_claimant_conflict");
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.roundId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_round", snapshot.roundId === expected.roundId);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_project_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.projectId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_project", snapshot.projectId === expected.projectId);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_participant_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.participantId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_participant", snapshot.participantId === expected.participantId);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_budget_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.commonGroundBudgetId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_budget", snapshot.commonGroundBudgetId === expected.commonGroundBudgetId);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_intent_id_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.conditionalTradeIntentId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_intent", snapshot.conditionalTradeIntentId === expected.conditionalTradeIntentId);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_rulebook_hash_invalid", isMpgfCrecCanonicalHash(snapshot.rulebookHash));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_rulebook_hash", snapshot.rulebookHash === expected.rulebookHash);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_policy_version_invalid", isMpgfCrecNonEmptyTrimStableString(snapshot.failureBonusPolicyVersion));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_wrong_policy_version", snapshot.failureBonusPolicyVersion === expected.failureBonusPolicyVersion);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_source_cutoff_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.sourceCutoffAt));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_source_cutoff_mismatch", snapshot.sourceCutoffAt === expected.sourceCutoffAt);
  addBlocker(
    blockers,
    "failure_bonus_claimant_conflict_snapshot_state_invalid",
    MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_CLAIMANT_CONFLICT_STATES.includes(snapshot.conflictState),
  );
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_not_clear", snapshot.conflictState === "no_conflict");
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_created_at_invalid", isMpgfCrecCanonicalUtcTimestamp(snapshot.createdAt));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_hash_invalid", isMpgfCrecCanonicalHash(snapshot.snapshotHash));
  addBlocker(
    blockers,
    "failure_bonus_claimant_conflict_snapshot_hash_mismatch",
    snapshot.snapshotHash === buildMpgfCrecFailureBonusClaimantConflictSnapshotHash(snapshot),
  );

  return validationResult(blockers);
}

function failureBonusEligibilityHashPayload(input: MpgfCrecFailureBonusEligibilityInput) {
  return {
    roundId: input.roundId,
    projectId: input.projectId,
    participantId: input.participantId,
    commonGroundBudgetId: input.commonGroundBudgetId,
    conditionalTradeIntentId: input.conditionalTradeIntentId,
    failureBonusPolicyVersion: input.failureBonusPolicyVersion,
    failureReason: input.failureReason,
    clearingInputBundleHash: input.clearingInputBundleHash,
    projectHardGateHash: input.projectHardGateHash,
    rowUniquenessHash: input.rowUniquenessHash,
    paymentCommitmentSnapshotHash: input.paymentCommitmentSnapshotHash,
    failedQualifiedMatchEligibleCents: input.failedQualifiedMatchEligibleCents,
    participantRoundFailureBonusCapCents: input.participantRoundFailureBonusCapCents,
    roundFailureBonusBudgetCents: input.roundFailureBonusBudgetCents,
    backedFailureBonusPoolCents: input.backedFailureBonusPoolCents,
    claimantConflictSnapshotId: input.claimantConflictSnapshotId,
    claimantConflictSnapshotHash: input.claimantConflictSnapshotHash,
    claimantConflictSourceCutoff: input.claimantConflictSourceCutoff,
    claimantConflictState: input.claimantConflictState,
  };
}

export function buildMpgfCrecFailureBonusEligibilityInputsHash(
  input: MpgfCrecFailureBonusEligibilityInput,
) {
  return hashMpgfCrecV1125Value(failureBonusEligibilityHashPayload(input));
}

export function evaluateMpgfCrecFailureBonusEligibility(
  input: MpgfCrecFailureBonusEligibilityInput,
): MpgfCrecFailureBonusEligibilityResult {
  const blockers: string[] = [];
  const claimKey = buildMpgfCrecFailureBonusClaimKey(input);

  addBlocker(blockers, "failure_bonus_claim_key_invalid", claimKey != null);
  addBlocker(
    blockers,
    "failure_bonus_round_status_not_payable",
    MPGF_PUBLIC_GOODS_CRECM_V1125_ROUND_STATUSES_WITH_FAILURE_BONUS_SIDE_EFFECTS.includes(input.roundStatus as "payable"),
  );
  addBlocker(blockers, "failure_bonus_project_not_failed", input.projectFailed === true);
  addBlocker(
    blockers,
    "failure_bonus_reason_not_threshold_family",
    MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS.includes(
      input.failureReason as MpgfCrecThresholdFamilyFailureReason,
    ),
  );
  addBlocker(blockers, "failure_bonus_policy_version_invalid", isMpgfCrecNonEmptyTrimStableString(input.failureBonusPolicyVersion));
  addBlocker(blockers, "failure_bonus_clearing_bundle_ineligible", input.clearingBundleEligible === true);
  addBlocker(blockers, "failure_bonus_clearing_bundle_hash_invalid", isMpgfCrecCanonicalHash(input.clearingInputBundleHash));
  addBlocker(blockers, "failure_bonus_project_hard_gate_ineligible", input.projectHardGateEligible === true);
  addBlocker(blockers, "failure_bonus_project_hard_gate_hash_invalid", isMpgfCrecCanonicalHash(input.projectHardGateHash));
  addBlocker(blockers, "failure_bonus_row_uniqueness_ineligible", input.rowUniquenessEligible === true);
  addBlocker(blockers, "failure_bonus_row_uniqueness_hash_invalid", isMpgfCrecCanonicalHash(input.rowUniquenessHash));
  addBlocker(blockers, "failure_bonus_payment_snapshot_ineligible", input.paymentSnapshotEligible === true);
  addBlocker(blockers, "failure_bonus_payment_snapshot_hash_invalid", isMpgfCrecCanonicalHash(input.paymentCommitmentSnapshotHash));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_ineligible", input.claimantConflictSnapshotEligible === true);
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_id_invalid", isMpgfCrecNonEmptyTrimStableString(input.claimantConflictSnapshotId));
  addBlocker(blockers, "failure_bonus_claimant_conflict_snapshot_hash_invalid", isMpgfCrecCanonicalHash(input.claimantConflictSnapshotHash));
  addBlocker(
    blockers,
    "failure_bonus_claimant_conflict_source_cutoff_invalid",
    isMpgfCrecCanonicalUtcTimestamp(input.claimantConflictSourceCutoff),
  );
  addBlocker(blockers, "failure_bonus_claimant_conflict_not_clear", input.claimantConflictState === "no_conflict");
  addBlocker(blockers, "failure_bonus_failed_qualified_cents_invalid", isPositiveSafeIntegerCents(input.failedQualifiedMatchEligibleCents));
  addBlocker(blockers, "failure_bonus_participant_cap_invalid", isPositiveSafeIntegerCents(input.participantRoundFailureBonusCapCents));
  addBlocker(blockers, "failure_bonus_round_budget_invalid", isPositiveSafeIntegerCents(input.roundFailureBonusBudgetCents));
  addBlocker(blockers, "failure_bonus_backed_pool_invalid", isPositiveSafeIntegerCents(input.backedFailureBonusPoolCents));
  addBlocker(blockers, "failure_bonus_total_sponsor_budget_invalid", isPositiveSafeIntegerCents(input.totalSponsorBudgetCents));

  const sponsorBudgetCapPasses =
    isPositiveSafeIntegerCents(input.roundFailureBonusBudgetCents) &&
    isPositiveSafeIntegerCents(input.totalSponsorBudgetCents) &&
    BigInt(input.roundFailureBonusBudgetCents) * BigInt(20) <= BigInt(input.totalSponsorBudgetCents);
  const failureBonusFullyBacked =
    isPositiveSafeIntegerCents(input.roundFailureBonusBudgetCents) &&
    isPositiveSafeIntegerCents(input.backedFailureBonusPoolCents) &&
    input.backedFailureBonusPoolCents >= input.roundFailureBonusBudgetCents;

  addBlocker(blockers, "failure_bonus_sponsor_budget_cap_failed", sponsorBudgetCapPasses);
  addBlocker(blockers, "failure_bonus_pool_not_fully_backed", failureBonusFullyBacked);

  const qualified = blockers.length === 0;
  const rawBonusCents = qualified ? Math.floor(input.failedQualifiedMatchEligibleCents / 10) : 0;
  const backedAvailableFailureBonusPoolCents = qualified ? input.roundFailureBonusBudgetCents : 0;
  const participantCappedProvisionalBonusCents = qualified
    ? minMpgfCrecNonNegativeSafeInteger(
        rawBonusCents,
        input.participantRoundFailureBonusCapCents,
        backedAvailableFailureBonusPoolCents,
      )
    : 0;

  return {
    qualified,
    blockers,
    claimKey,
    rawBonusCents,
    participantCappedProvisionalBonusCents,
    backedAvailableFailureBonusPoolCents,
    eligibilityInputsHash: qualified ? buildMpgfCrecFailureBonusEligibilityInputsHash(input) : null,
  };
}

function failureBonusClaimAuditHashPayload(claim: MpgfCrecFailureBonusClaimRecord) {
  return {
    roundId: claim.roundId,
    projectId: claim.projectId,
    participantId: claim.participantId,
    commonGroundBudgetId: claim.commonGroundBudgetId,
    conditionalTradeIntentId: claim.conditionalTradeIntentId,
    failureBonusPolicyVersion: claim.failureBonusPolicyVersion,
    failureReason: claim.failureReason,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    projectRoundEligibilitySnapshotHash: claim.projectRoundEligibilitySnapshotHash,
    claimantConflictSnapshotId: claim.claimantConflictSnapshotId,
    claimantConflictSnapshotHash: claim.claimantConflictSnapshotHash,
    claimantConflictState: claim.claimantConflictState,
    claimantConflictSourceCutoff: claim.claimantConflictSourceCutoff,
    earlyFailureBonusCutoff: claim.earlyFailureBonusCutoff,
    paymentMethodSavedAt: claim.paymentMethodSavedAt,
    paymentMethodConfirmedAt: claim.paymentMethodConfirmedAt,
    failedQualifiedMatchEligibleCents: claim.failedQualifiedMatchEligibleCents,
  };
}

export function buildMpgfCrecFailureBonusClaimAuditContextHash(
  claim: MpgfCrecFailureBonusClaimRecord,
) {
  return hashMpgfCrecV1125Value(failureBonusClaimAuditHashPayload(claim));
}

function validateMpgfCrecFailureBonusClaimListContext(
  context: MpgfCrecFailureBonusClaimListContext,
  blockers: string[],
) {
  addBlocker(blockers, "failure_bonus_claim_context_round_id_invalid", isMpgfCrecNonEmptyTrimStableString(context.roundId));
  addBlocker(
    blockers,
    "failure_bonus_claim_context_policy_version_invalid",
    isMpgfCrecNonEmptyTrimStableString(context.failureBonusPolicyVersion),
  );
  addBlocker(
    blockers,
    "failure_bonus_claim_context_cutoff_invalid",
    isMpgfCrecCanonicalUtcTimestamp(context.earlyFailureBonusCutoff),
  );
  addBlocker(
    blockers,
    "failure_bonus_claim_context_conflict_source_cutoff_invalid",
    isMpgfCrecCanonicalUtcTimestamp(context.claimantConflictSourceCutoff),
  );
  addBlocker(
    blockers,
    "failure_bonus_claim_context_backed_pool_invalid",
    isPositiveSafeIntegerCents(context.backedFailureBonusPoolCents),
  );
}

function validateMpgfCrecFailureBonusClaimRecord(
  claim: MpgfCrecFailureBonusClaimRecord,
  context: MpgfCrecFailureBonusClaimListContext,
  blockers: string[],
  index: number,
  mode: "preliminary_mutation" | "final_payout",
) {
  const prefix = `failure_bonus_claim_${index}`;

  if (claim == null || typeof claim !== "object") {
    blockers.push(`${prefix}_missing`);
    return;
  }

  addBlocker(blockers, `${prefix}_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.id));
  addBlocker(blockers, `${prefix}_round_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.roundId));
  addBlocker(blockers, `${prefix}_wrong_round`, claim.roundId === context.roundId);
  addBlocker(blockers, `${prefix}_project_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.projectId));
  addBlocker(blockers, `${prefix}_participant_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.participantId));
  addBlocker(blockers, `${prefix}_budget_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.commonGroundBudgetId));
  addBlocker(blockers, `${prefix}_intent_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.conditionalTradeIntentId));
  addBlocker(
    blockers,
    `${prefix}_policy_version_invalid`,
    isMpgfCrecNonEmptyTrimStableString(claim.failureBonusPolicyVersion),
  );
  addBlocker(blockers, `${prefix}_wrong_policy_version`, claim.failureBonusPolicyVersion === context.failureBonusPolicyVersion);
  addBlocker(blockers, `${prefix}_denial_reason_present`, claim.denialReason === null);
  addBlocker(blockers, `${prefix}_payout_ref_present`, claim.payoutRef === null);
  addBlocker(blockers, `${prefix}_resolved_at_present`, claim.resolvedAt === null);
  addBlocker(blockers, `${prefix}_created_at_invalid`, isMpgfCrecCanonicalUtcTimestamp(claim.createdAt));
  addBlocker(
    blockers,
    `${prefix}_failure_reason_not_threshold_family`,
    MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS.includes(
      claim.failureReason as MpgfCrecThresholdFamilyFailureReason,
    ),
  );
  addBlocker(blockers, `${prefix}_clearing_bundle_hash_invalid`, isMpgfCrecCanonicalHash(claim.clearingInputBundleHash));
  addBlocker(blockers, `${prefix}_payment_snapshot_hash_invalid`, isMpgfCrecCanonicalHash(claim.paymentCommitmentSnapshotHash));
  addBlocker(
    blockers,
    `${prefix}_project_eligibility_snapshot_hash_invalid`,
    isMpgfCrecCanonicalHash(claim.projectRoundEligibilitySnapshotHash),
  );
  addBlocker(blockers, `${prefix}_claimant_conflict_snapshot_id_invalid`, isMpgfCrecNonEmptyTrimStableString(claim.claimantConflictSnapshotId));
  addBlocker(blockers, `${prefix}_claimant_conflict_snapshot_hash_invalid`, isMpgfCrecCanonicalHash(claim.claimantConflictSnapshotHash));
  addBlocker(blockers, `${prefix}_claimant_conflict_not_clear`, claim.claimantConflictState === "no_conflict");
  addBlocker(
    blockers,
    `${prefix}_claimant_conflict_source_cutoff_invalid`,
    isMpgfCrecCanonicalUtcTimestamp(claim.claimantConflictSourceCutoff),
  );
  addBlocker(
    blockers,
    `${prefix}_claimant_conflict_source_cutoff_mismatch`,
    claim.claimantConflictSourceCutoff === context.claimantConflictSourceCutoff,
  );
  addBlocker(blockers, `${prefix}_cutoff_invalid`, isMpgfCrecCanonicalUtcTimestamp(claim.earlyFailureBonusCutoff));
  addBlocker(blockers, `${prefix}_wrong_cutoff`, claim.earlyFailureBonusCutoff === context.earlyFailureBonusCutoff);
  addBlocker(blockers, `${prefix}_payment_method_saved_at_invalid`, isMpgfCrecCanonicalUtcTimestamp(claim.paymentMethodSavedAt));
  addBlocker(
    blockers,
    `${prefix}_payment_method_confirmed_at_invalid`,
    isMpgfCrecCanonicalUtcTimestamp(claim.paymentMethodConfirmedAt),
  );
  addBlocker(
    blockers,
    `${prefix}_payment_method_saved_after_confirmation`,
    timestampLte(claim.paymentMethodSavedAt, claim.paymentMethodConfirmedAt),
  );
  addBlocker(
    blockers,
    `${prefix}_payment_method_confirmed_after_cutoff`,
    timestampLte(claim.paymentMethodConfirmedAt, claim.earlyFailureBonusCutoff),
  );
  addBlocker(
    blockers,
    `${prefix}_failed_qualified_cents_invalid`,
    isPositiveSafeIntegerCents(claim.failedQualifiedMatchEligibleCents),
  );
  addBlocker(blockers, `${prefix}_raw_bonus_cents_invalid`, isNonNegativeSafeIntegerCents(claim.rawBonusCents));
  addBlocker(blockers, `${prefix}_participant_cap_cents_invalid`, isNonNegativeSafeIntegerCents(claim.participantRoundCapCents));
  addBlocker(
    blockers,
    `${prefix}_participant_capped_bonus_cents_invalid`,
    isNonNegativeSafeIntegerCents(claim.participantCappedProvisionalBonusCents),
  );
  addBlocker(blockers, `${prefix}_bonus_cents_invalid`, isNonNegativeSafeIntegerCents(claim.bonusCents));
  addBlocker(blockers, `${prefix}_final_bonus_cents_invalid`, isNonNegativeSafeIntegerCents(claim.finalFailureBonusCents));
  addBlocker(
    blockers,
    `${prefix}_proration_factor_bps_invalid`,
    Number.isSafeInteger(claim.prorationFactorBps) && claim.prorationFactorBps >= 0 && claim.prorationFactorBps <= 10_000,
  );
  addBlocker(blockers, `${prefix}_eligibility_inputs_hash_invalid`, isMpgfCrecCanonicalHash(claim.eligibilityInputsHash));
  addBlocker(
    blockers,
    `${prefix}_eligibility_inputs_hash_mismatch`,
    claim.eligibilityInputsHash === buildMpgfCrecFailureBonusClaimAuditContextHash(claim),
  );

  const externalFailedQualified =
    context.externalFailedQualifiedMatchEligibleCentsByClaimId &&
    Object.prototype.hasOwnProperty.call(context.externalFailedQualifiedMatchEligibleCentsByClaimId, claim.id)
      ? context.externalFailedQualifiedMatchEligibleCentsByClaimId[claim.id]
      : undefined;
  if (externalFailedQualified !== undefined) {
    addBlocker(
      blockers,
      `${prefix}_external_failed_qualified_cents_mismatch`,
      externalFailedQualified === claim.failedQualifiedMatchEligibleCents,
    );
  }

  const externalParticipantCapped =
    context.externalParticipantCappedProvisionalBonusCentsByClaimId &&
    Object.prototype.hasOwnProperty.call(context.externalParticipantCappedProvisionalBonusCentsByClaimId, claim.id)
      ? context.externalParticipantCappedProvisionalBonusCentsByClaimId[claim.id]
      : undefined;
  if (externalParticipantCapped !== undefined) {
    addBlocker(
      blockers,
      `${prefix}_external_participant_capped_bonus_cents_mismatch`,
      externalParticipantCapped === claim.participantCappedProvisionalBonusCents,
    );
  }

  if (mode === "final_payout") {
    addBlocker(blockers, `${prefix}_not_unsettled_approved`, claim.claimState === "approved");
  } else {
    addBlocker(
      blockers,
      `${prefix}_not_unsettled_non_terminal`,
      claim.claimState === "pending" || claim.claimState === "approved",
    );
  }
}

function selectMpgfCrecFailureBonusClaimsForMutation(
  claims: readonly MpgfCrecFailureBonusClaimRecord[],
  context: MpgfCrecFailureBonusClaimListContext,
  mode: "preliminary_mutation" | "final_payout",
): MpgfCrecFailureBonusClaimListResult {
  const gate = evaluateMpgfCrecRoundStatusGate({
    roundStatus: context.roundStatus,
    operation: mode === "final_payout" ? "failure_bonus_payment" : "failure_bonus_claim_field_mutation",
    backedFailureBonusPoolCents: context.backedFailureBonusPoolCents,
  });
  const blockers = [...gate.blockers];
  const claimIds = claims.map((claim) => claim.id);
  const claimIdentityKeys = claims.map((claim) => buildMpgfCrecFailureBonusClaimKey(claim));
  const validClaimIdentityKeys = claimIdentityKeys.filter((key): key is string => key != null);

  validateMpgfCrecFailureBonusClaimListContext(context, blockers);
  addBlocker(blockers, "failure_bonus_claim_ids_duplicate", !hasDuplicate(claimIds));
  claimIdentityKeys.forEach((key, index) => {
    addBlocker(blockers, `failure_bonus_claim_${index}_identity_key_invalid`, key != null);
  });
  addBlocker(
    blockers,
    "failure_bonus_claim_identity_keys_duplicate",
    !hasDuplicate(validClaimIdentityKeys),
  );

  claims.forEach((claim, index) => {
    validateMpgfCrecFailureBonusClaimRecord(claim, context, blockers, index, mode);
  });

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    claims: eligible ? [...claims] : [],
    claimIds: eligible ? claimIds : [],
  };
}

export function selectMpgfCrecPreliminaryFailureBonusMutationClaims(
  claims: readonly MpgfCrecFailureBonusClaimRecord[],
  context: MpgfCrecFailureBonusClaimListContext,
) {
  return selectMpgfCrecFailureBonusClaimsForMutation(claims, context, "preliminary_mutation");
}

export function selectMpgfCrecFinalFailureBonusPayoutClaims(
  claims: readonly MpgfCrecFailureBonusClaimRecord[],
  context: MpgfCrecFailureBonusClaimListContext,
) {
  return selectMpgfCrecFailureBonusClaimsForMutation(claims, context, "final_payout");
}

type MpgfCrecProrationAmountRow = {
  id: string;
  amountCents: number;
  stableOrderKey: string;
};

type MpgfCrecProrationAmountResult = {
  eligible: boolean;
  blockers: string[];
  allocationsById: Record<string, number>;
  totalInputCents: bigint;
  targetPayoutCents: number;
  prorationFactorBps: number;
};

function prorateMpgfCrecNonNegativeCentsByStableOrder(
  rows: readonly MpgfCrecProrationAmountRow[],
  targetPayoutCents: unknown,
  blockerPrefix: string,
): MpgfCrecProrationAmountResult {
  const blockers: string[] = [];
  const ids = rows.map((row) => row.id);

  addBlocker(blockers, `${blockerPrefix}_target_invalid`, isNonNegativeSafeIntegerCents(targetPayoutCents));
  addBlocker(blockers, `${blockerPrefix}_ids_duplicate`, !hasDuplicate(ids));

  rows.forEach((row, index) => {
    addBlocker(blockers, `${blockerPrefix}_${index}_id_invalid`, isMpgfCrecNonEmptyTrimStableString(row.id));
    addBlocker(blockers, `${blockerPrefix}_${index}_amount_invalid`, isNonNegativeSafeIntegerCents(row.amountCents));
    addBlocker(blockers, `${blockerPrefix}_${index}_stable_order_key_invalid`, isMpgfCrecCanonicalHash(row.stableOrderKey));
  });

  const eligible = blockers.length === 0;
  const safeTargetPayoutCents = eligible ? Number(targetPayoutCents) : 0;
  const totalInputCents = eligible ? sumMpgfCrecNonNegativeBigInt(rows.map((row) => row.amountCents)) : BigInt(0);
  const totalInputPositive = totalInputCents > BigInt(0);

  if (!eligible || !totalInputPositive || safeTargetPayoutCents === 0) {
    return {
      eligible,
      blockers,
      allocationsById: Object.fromEntries(ids.map((id) => [id, 0])),
      totalInputCents,
      targetPayoutCents: safeTargetPayoutCents,
      prorationFactorBps: totalInputPositive ? 0 : 10_000,
    };
  }

  if (BigInt(safeTargetPayoutCents) >= totalInputCents) {
    return {
      eligible: true,
      blockers: [],
      allocationsById: Object.fromEntries(rows.map((row) => [row.id, row.amountCents])),
      totalInputCents,
      targetPayoutCents: Number(totalInputCents),
      prorationFactorBps: 10_000,
    };
  }

  const targetExact = BigInt(safeTargetPayoutCents);
  const allocatedBaseRows = rows.map((row) => {
    const rawNumerator = BigInt(row.amountCents) * targetExact;
    const baseCents = rawNumerator / totalInputCents;
    const remainder = rawNumerator % totalInputCents;

    return {
      ...row,
      baseCents,
      remainder,
    };
  });
  const baseTotalCents = sumMpgfCrecNonNegativeBigInt(allocatedBaseRows.map((row) => row.baseCents));
  const leftoverCents = Number(targetExact - baseTotalCents);
  const allocationEntries = allocatedBaseRows.map((row) => [row.id, Number(row.baseCents)] as const);
  const allocationsById: Record<string, number> = Object.fromEntries(allocationEntries);

  [...allocatedBaseRows]
    .sort((left, right) => {
      if (left.remainder > right.remainder) {
        return -1;
      }
      if (left.remainder < right.remainder) {
        return 1;
      }
      return left.stableOrderKey.localeCompare(right.stableOrderKey);
    })
    .slice(0, leftoverCents)
    .forEach((row) => {
      allocationsById[row.id] += 1;
    });

  return {
    eligible: true,
    blockers: [],
    allocationsById,
    totalInputCents,
    targetPayoutCents: safeTargetPayoutCents,
    prorationFactorBps: Number((targetExact * BigInt(10_000)) / totalInputCents),
  };
}

function buildMpgfCrecFailureBonusProrationStableOrderKey(
  scope: "participant_round_cap" | "round_level_final_payout",
  claim: MpgfCrecFailureBonusClaimRecord,
) {
  return hashMpgfCrecV1125Value({
    scope,
    roundId: claim.roundId,
    participantId: claim.participantId,
    claimId: claim.id,
    failureBonusPolicyVersion: claim.failureBonusPolicyVersion,
  });
}

export function prorateMpgfCrecFailureBonusClaims(
  claims: readonly MpgfCrecFailureBonusClaimRecord[],
  context: MpgfCrecFailureBonusClaimListContext,
): MpgfCrecFailureBonusProrationResult {
  const selection = selectMpgfCrecFinalFailureBonusPayoutClaims(claims, context);
  const blockers = [...selection.blockers];

  if (!selection.eligible) {
    return {
      eligible: false,
      blockers,
      claims: [],
      claimIds: [],
      participantRawBonusTotalCentsByParticipantId: {},
      participantProrationFactorBpsByParticipantId: {},
      aggregateParticipantCappedProvisionalCents: "0",
      targetPayoutCents: 0,
      roundProrationFactorBps: 0,
    };
  }

  const participantIds = stableStringArray([...new Set(selection.claims.map((claim) => claim.participantId))]);
  const participantRawBonusTotalCentsByParticipantId: Record<string, string> = {};
  const participantProrationFactorBpsByParticipantId: Record<string, number> = {};
  const provisionalClaims: MpgfCrecFailureBonusProratedClaim[] = [];

  for (const participantId of participantIds) {
    const participantClaims = selection.claims.filter((claim) => claim.participantId === participantId);
    const participantCapValues = stableStringArray([
      ...new Set(participantClaims.map((claim) => String(claim.participantRoundCapCents))),
    ]);

    addBlocker(
      blockers,
      `failure_bonus_participant_${participantId}_cap_not_single_value`,
      participantCapValues.length === 1,
    );

    const participantCapCents =
      participantClaims.length > 0 ? participantClaims[0].participantRoundCapCents : 0;

    const participantRows = participantClaims.map((claim) => ({
      id: claim.id,
      amountCents: claim.rawBonusCents,
      stableOrderKey: buildMpgfCrecFailureBonusProrationStableOrderKey("participant_round_cap", claim),
    }));
    const participantProration = prorateMpgfCrecNonNegativeCentsByStableOrder(
      participantRows,
      participantCapCents,
      `failure_bonus_participant_${participantId}_proration`,
    );

    blockers.push(...participantProration.blockers);
    participantRawBonusTotalCentsByParticipantId[participantId] =
      participantProration.totalInputCents.toString();
    participantProrationFactorBpsByParticipantId[participantId] =
      participantProration.prorationFactorBps;

    for (const claim of participantClaims) {
      const participantCappedProvisionalBonusCents =
        participantProration.allocationsById[claim.id] ?? 0;
      provisionalClaims.push({
        ...claim,
        participantCappedProvisionalBonusCents,
        bonusCents: participantCappedProvisionalBonusCents,
        finalFailureBonusCents: 0,
        prorationFactorBps: participantProration.prorationFactorBps,
        participantProrationStableOrderKey: buildMpgfCrecFailureBonusProrationStableOrderKey(
          "participant_round_cap",
          claim,
        ),
        roundProrationStableOrderKey: buildMpgfCrecFailureBonusProrationStableOrderKey(
          "round_level_final_payout",
          claim,
        ),
      });
    }
  }

  if (blockers.length > 0) {
    return {
      eligible: false,
      blockers,
      claims: [],
      claimIds: [],
      participantRawBonusTotalCentsByParticipantId,
      participantProrationFactorBpsByParticipantId,
      aggregateParticipantCappedProvisionalCents: "0",
      targetPayoutCents: 0,
      roundProrationFactorBps: 0,
    };
  }

  const aggregateParticipantCappedProvisionalCents = sumMpgfCrecNonNegativeBigInt(
    provisionalClaims.map((claim) => claim.participantCappedProvisionalBonusCents),
  );
  const targetPayoutCents =
    aggregateParticipantCappedProvisionalCents <= BigInt(context.backedFailureBonusPoolCents)
      ? Number(aggregateParticipantCappedProvisionalCents)
      : context.backedFailureBonusPoolCents;
  const roundProration = prorateMpgfCrecNonNegativeCentsByStableOrder(
    provisionalClaims.map((claim) => ({
      id: claim.id,
      amountCents: claim.participantCappedProvisionalBonusCents,
      stableOrderKey: claim.roundProrationStableOrderKey,
    })),
    targetPayoutCents,
    "failure_bonus_round_proration",
  );

  if (!roundProration.eligible) {
    return {
      eligible: false,
      blockers: roundProration.blockers,
      claims: [],
      claimIds: [],
      participantRawBonusTotalCentsByParticipantId,
      participantProrationFactorBpsByParticipantId,
      aggregateParticipantCappedProvisionalCents: aggregateParticipantCappedProvisionalCents.toString(),
      targetPayoutCents: 0,
      roundProrationFactorBps: 0,
    };
  }

  const proratedClaims = provisionalClaims.map((claim) => ({
    ...claim,
    finalFailureBonusCents: roundProration.allocationsById[claim.id] ?? 0,
    prorationFactorBps: roundProration.prorationFactorBps,
  }));

  return {
    eligible: true,
    blockers: [],
    claims: proratedClaims,
    claimIds: proratedClaims.map((claim) => claim.id),
    participantRawBonusTotalCentsByParticipantId,
    participantProrationFactorBpsByParticipantId,
    aggregateParticipantCappedProvisionalCents: aggregateParticipantCappedProvisionalCents.toString(),
    targetPayoutCents: roundProration.targetPayoutCents,
    roundProrationFactorBps: roundProration.prorationFactorBps,
  };
}

function buildMpgfCrecFailureBonusClaimFromCreationInput(
  input: MpgfCrecFailureBonusClaimCreationInput,
): MpgfCrecFailureBonusClaimRecord {
  const claim: MpgfCrecFailureBonusClaimRecord = {
    id: input.id,
    roundId: input.roundId,
    projectId: input.projectId,
    participantId: input.participantId,
    commonGroundBudgetId: input.commonGroundBudgetId,
    conditionalTradeIntentId: input.conditionalTradeIntentId,
    failureBonusPolicyVersion: input.failureBonusPolicyVersion,
    claimState: input.creationMode === "qualified_payout_path" ? "approved" : "pending",
    denialReason: null,
    payoutRef: null,
    resolvedAt: null,
    createdAt: input.createdAt,
    failureReason: input.failureReason,
    clearingInputBundleHash: input.clearingInputBundleHash,
    paymentCommitmentSnapshotHash: input.paymentCommitmentSnapshotHash,
    projectRoundEligibilitySnapshotHash: input.projectRoundEligibilitySnapshotHash,
    claimantConflictSnapshotId: input.claimantConflictSnapshotId,
    claimantConflictSnapshotHash: input.claimantConflictSnapshotHash,
    claimantConflictState: input.claimantConflictState,
    claimantConflictSourceCutoff: input.claimantConflictSourceCutoff,
    earlyFailureBonusCutoff: input.earlyFailureBonusCutoff,
    paymentMethodSavedAt: input.paymentMethodSavedAt,
    paymentMethodConfirmedAt: input.paymentMethodConfirmedAt,
    failedQualifiedMatchEligibleCents: input.failedQualifiedMatchEligibleCents,
    rawBonusCents: 0,
    participantRoundCapCents: 0,
    participantCappedProvisionalBonusCents: 0,
    bonusCents: 0,
    finalFailureBonusCents: 0,
    prorationFactorBps: 10_000,
    eligibilityInputsHash: "",
  };

  return {
    ...claim,
    eligibilityInputsHash: buildMpgfCrecFailureBonusClaimAuditContextHash(claim),
  };
}

function failureBonusClaimCreationContextMatches(
  existing: MpgfCrecFailureBonusClaimRecord,
  candidate: MpgfCrecFailureBonusClaimRecord,
) {
  return (
    existing.failureBonusPolicyVersion === candidate.failureBonusPolicyVersion &&
    existing.failureReason === candidate.failureReason &&
    existing.clearingInputBundleHash === candidate.clearingInputBundleHash &&
    existing.paymentCommitmentSnapshotHash === candidate.paymentCommitmentSnapshotHash &&
    existing.projectRoundEligibilitySnapshotHash === candidate.projectRoundEligibilitySnapshotHash &&
    existing.claimantConflictSnapshotId === candidate.claimantConflictSnapshotId &&
    existing.claimantConflictSnapshotHash === candidate.claimantConflictSnapshotHash &&
    existing.claimantConflictState === candidate.claimantConflictState &&
    existing.claimantConflictSourceCutoff === candidate.claimantConflictSourceCutoff &&
    existing.earlyFailureBonusCutoff === candidate.earlyFailureBonusCutoff &&
    existing.paymentMethodSavedAt === candidate.paymentMethodSavedAt &&
    existing.paymentMethodConfirmedAt === candidate.paymentMethodConfirmedAt &&
    existing.failedQualifiedMatchEligibleCents === candidate.failedQualifiedMatchEligibleCents &&
    existing.eligibilityInputsHash === candidate.eligibilityInputsHash
  );
}

export function createMpgfCrecFailureBonusClaim(
  input: MpgfCrecFailureBonusClaimCreationInput,
): MpgfCrecFailureBonusClaimCreationResult {
  const gate = evaluateMpgfCrecRoundStatusGate({
    roundStatus: input.roundStatus,
    operation: "failure_bonus_claim_creation",
    backedFailureBonusPoolCents: input.backedFailureBonusPoolCents,
  });
  const blockers = [...gate.blockers];
  const idempotencyKey = buildMpgfCrecFailureBonusClaimKey(input);
  const candidate = buildMpgfCrecFailureBonusClaimFromCreationInput(input);
  const context: MpgfCrecFailureBonusClaimListContext = {
    roundId: input.roundId,
    failureBonusPolicyVersion: input.failureBonusPolicyVersion,
    roundStatus: input.roundStatus,
    backedFailureBonusPoolCents: input.backedFailureBonusPoolCents,
    earlyFailureBonusCutoff: input.earlyFailureBonusCutoff,
    claimantConflictSourceCutoff: input.claimantConflictSourceCutoff,
  };
  const matchingClaims = input.existingClaims.filter(
    (claim) =>
      claim.roundId === input.roundId &&
      claim.projectId === input.projectId &&
      claim.participantId === input.participantId &&
      claim.conditionalTradeIntentId === input.conditionalTradeIntentId,
  );

  addBlocker(blockers, "failure_bonus_claim_idempotency_key_invalid", idempotencyKey != null);
  addBlocker(blockers, "failure_bonus_claim_project_not_failed", input.projectFailed === true);
  if (input.creationMode === "qualified_payout_path") {
    addBlocker(
      blockers,
      "failure_bonus_claim_creation_not_fully_qualified",
      input.failureBonusEligibilityQualified === true,
    );
  }
  addBlocker(blockers, "failure_bonus_claim_duplicate_same_key", matchingClaims.length <= 1);
  validateMpgfCrecFailureBonusClaimListContext(context, blockers);
  validateMpgfCrecFailureBonusClaimRecord(candidate, context, blockers, 0, "preliminary_mutation");

  if (blockers.length > 0) {
    return {
      eligible: false,
      action: "manual_review",
      blockers,
      idempotencyKey,
      claim: null,
    };
  }

  if (matchingClaims.length === 1) {
    const [existing] = matchingClaims;

    if (failureBonusClaimCreationContextMatches(existing, candidate)) {
      return {
        eligible: true,
        action: "noop_replay",
        blockers: [],
        idempotencyKey,
        claim: existing,
      };
    }

    return {
      eligible: false,
      action: "manual_review",
      blockers: ["failure_bonus_claim_idempotency_context_mismatch"],
      idempotencyKey,
      claim: null,
    };
  }

  return {
    eligible: true,
    action: "create",
    blockers: [],
    idempotencyKey,
    claim: candidate,
  };
}

export function settleMpgfCrecFailureBonusClaim(
  input: MpgfCrecFailureBonusClaimSettlementInput,
): MpgfCrecFailureBonusClaimSettlementResult {
  const selection = selectMpgfCrecFinalFailureBonusPayoutClaims([input.claim], input.context);
  const blockers = [...selection.blockers];

  addBlocker(blockers, "failure_bonus_claim_settlement_payout_ref_invalid", isMpgfCrecNonEmptyTrimStableString(input.payoutRef));
  addBlocker(blockers, "failure_bonus_claim_settlement_resolved_at_invalid", isMpgfCrecCanonicalUtcTimestamp(input.resolvedAt));

  if (blockers.length > 0) {
    return {
      eligible: false,
      blockers,
      claim: null,
    };
  }

  return {
    eligible: true,
    blockers: [],
    claim: {
      ...input.claim,
      claimState: input.settlementState,
      payoutRef: input.payoutRef,
      resolvedAt: input.resolvedAt,
    },
  };
}

export function buildMpgfCrecV1125ClearingContractSummary() {
  const summary = {
    policy: MPGF_PUBLIC_GOODS_CRECM_V1125_CLEARING_POLICY,
    sourceSpec: "moralpublicgoods131.md" as const,
    roundMetadataGate: {
      canonicalUtcTimestampsRequired: true,
      parameterFreezeNoLaterThanOpen: true,
      orderedLifecycleRequired:
        "parametersFrozenAt<=opensAt<=earlyFailureBonusCutoff<=reviewFreezeAt<closesAt<challengeDeadline" as const,
      rulebookHashMustBeCanonical: true,
      sponsorPoolSourceHashMustBeCanonical: true,
      paymentReconciliationPathHashMustBeCanonical: true,
      calculationVersionMustBeTrimStable: true,
      failureBonusPolicyVersionMustBeTrimStable: true,
      locksClearingMatchingAuthorizationAndFailureBonusWhenInvalid: true,
    },
    paymentCommitmentSnapshots: {
      providerConfirmedStateRequired: true,
      nonEmptyPaymentMethodReferenceRequired: true,
      exactCutoffBindingRequired: true,
      bindingHashFields: [
        "snapshotKind",
        "roundId",
        "participantId",
        "commonGroundBudgetId",
        "paymentMethodRef",
        "paymentMethodSavedAt",
        "paymentMethodCommitmentState",
        "paymentMethodConfirmedAt",
        "asOf",
        "providerEvidenceHash",
        "rulebookHash",
        "createdAt",
      ],
      supportedSnapshotKinds: MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS,
    },
    roundClearingInputBundle: {
      snapshotKind: "round_close" as const,
      bundleHashBindsSelectedBundleId: true,
      canonicalComponentHashesRequired: [
        "commonGroundBudgetInputHash",
        "supportStanceInputHash",
        "conditionalTradeIntentInputHash",
        "identityEligibilityInputHash",
        "paymentCommitmentSnapshotHash",
        "feeInputHash",
        "deploymentExposureInputHash",
        "projectInputHash",
        "projectEligibilitySnapshotHash",
        "sponsorCommitmentInputHash",
        "successRewardInputHash",
        "coordinationCreditInputHash",
        "impactCertificateInputHash",
        "canonicalInputJsonHash",
        "moralBucketSnapshotHash",
      ],
      finalClearingUsesSourceCutoffExactlyAtRoundClose: true,
      finalClearingMatchesCalculationVersion: true,
    },
    deploymentAudits: {
      supportedAuditKinds: MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_KINDS,
      targetModes: MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_TARGET_MODES,
      priorModes: MPGF_PUBLIC_GOODS_CRECM_V1125_DEPLOYMENT_AUDIT_PRIOR_MODES,
      priorOutcomeMustBePassed: true,
      priorEvidenceArraysMustBeEqualLength: true,
      priorRoundIdsDuplicateFreeAndNoCurrentRound: true,
      selectedAuditCreatedNoLaterThanParameterFreeze: true,
      fullDeploymentRequiresSamePathCappedPilotPrior: true,
      auditHashBindsCurrentPaymentReconciliationPath: true,
      auditHashBindsOptimizationPolicyHash: true,
      cappedPilotExposureUsesFrozenCapsAndRemainingMaps: true,
      remainingExposureMapsCannotRaiseFrozenPilotCaps: true,
      shadowBindingExposureCentsAlwaysZero: true,
      shadowPreviewExposureCentsCanSimulateRequestedGross: true,
    },
    feeQuotes: {
      feePolicyHashBoundQuoteHashRequired: true,
      selectedPositiveAllocationRowsNeedBindingFeeQuote: true,
      waivedFeeMustHaveZeroFeeCents: true,
      donorDeductedNetEqualsGrossMinusFee: true,
      sponsorPaidNetEqualsGrossAndRequiresFeeSupportPool: true,
      selectedSponsorPaidFeeIdsMustResolveExactlyOnce: true,
      sponsorPaidFeeSupportRequiresEligibleRoundCloseBundle: true,
    },
    projectRoundEligibilitySnapshots: {
      snapshotKind: "round_open" as const,
      sourceCutoffEqualsRoundOpen: true,
      exactBooleanEligibilityFieldsRequired: MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS,
      allEligibilityFieldsMustBeTrueForFailureBonus: true,
      bindingHashIncludesEligibilityFields: true,
    },
    projectHardGates: {
      bindingModesRequireClearBaselineIntegrity: true,
      bindingModesRequireHighOrMediumBaselineConfidence: true,
      bindingModesRequireAdequateActionEvidence: true,
      shadowModeAllowsReviewOrProvisionalActionEvidenceOnlyAsNonBindingLearning: true,
      openChallengesBlockedUnlessRecordedNonBlocking: true,
      projectScopeStateRequired: "valid_moral_public_good" as const,
      excludedTradeTypeRequired: null,
      destinationRouteStateRequired: "valid" as const,
      externalityStateRequired: "clear" as const,
      reviewStateRequired: "approved" as const,
      challengeStatesAllowed: ["clear", "non_blocking"] as const,
      conflictReviewStateRequired: "clear" as const,
      sponsorCompatibilityStateRequired: "compatible" as const,
      legalCustodyStateRequired: "clear" as const,
      hardGateHashBindsExcludedTradeType: true,
      hardGateHashBindsBaselineActionAndReviewStates: true,
      failureBonusEligibilityRequiresProjectHardGateHash: true,
    },
    projectIdentityRouteGate: {
      validGoodTypes: MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_GOOD_TYPES,
      validDestinationTypes: MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_DESTINATION_TYPES,
      bundleDerivedProjectRowMustBeRoundBound: true,
      destinationRefMustBeNonEmptyTrimStable: true,
      bucketIdMustBeNonEmptyTrimStable: true,
      bucketMustAppearInFrozenMoralBucketSnapshot: true,
      usesFullMoralBucketSnapshotPredicate: true,
      looseBucketMembershipCannotClear: true,
      invalidFieldsBlockClearingMatchingAuthorizationPayoutAndFailureBonus: true,
    },
    moralBucketSnapshot: {
      frozenReciprocalGraphRequired: true,
      liveBucketDistinctnessReadsAllowed: false,
      asymmetricPairCountMustBeZero: true,
      selfDistinctnessAllowed: false,
      unknownBucketReferencesAllowed: false,
    },
    sponsorBacking: {
      finalBackingUsesFrozenSponsorInputBundle: true,
      filteredByRoundAndPoolType: true,
      sourceHashAndTimingEvidenceRequired: true,
      exactBigIntPoolSumsRequired: true,
      positiveBackingStates: MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES,
      supportedPoolTypes: MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES,
    },
    authorizationReconciliation: {
      eventHashBindsRemovedRowIdentityAndAmounts: true,
      shortExpiringAuthorizationRowsRemovedBeforeCapture: true,
      exactAmountCoverageRequiredForKeptRows: true,
      supportedReconciliationStates: MPGF_PUBLIC_GOODS_CRECM_V1125_RECONCILIATION_STATES,
    },
    optimizationRunTrace: {
      traceHashBindsBundlePolicyAllocationAndConstraints: true,
      bindingStage: "stage_3_coalition_clearing" as const,
      singleSelectedTracePerBundleVersionStageRequired: true,
      rewardCreditCertificateInputHashesRequired: true,
      selectedAllocationRowsHashRequired: true,
      constraintSatisfactionHashRequired: true,
      allowedSolverModes: MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES,
      allowedOptimalityStatuses: MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES,
    },
    roundAuditBundles: {
      publicAuditBundleRequiresFinalRoundCloseBundle: true,
      mutableLiveInputsCannotChangeFinalAllocation: true,
      auditBundleHashBindsComponentHashesAndTrace: true,
      requiredDirectComponentHashes: [
        "canonicalInputJsonHash",
        "feeInputHash",
        "feePolicyHash",
        "deploymentExposureInputHash",
        "paymentReconciliationPathHash",
        "deploymentAuditHash",
        "optimizationPolicyHash",
        "optimizationTraceHash",
        "projectInputHash",
        "sponsorCommitmentInputHash",
        "moralBucketSnapshotHash",
        "bonusScoreHash",
      ],
      optimizationTraceIdRequired: true,
      optimizationTraceHashRequired: true,
      deploymentAuditHashMustBeExplicitNullWhenNotRequired: true,
    },
    bonusScoreUnits: {
      fixedPointPrecision: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_PRECISION,
      roundingMode: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_ROUNDING_MODE,
      fixedPointConstants: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_FIXED_POINT_CONSTANTS,
      stanceWeightFixedByStance: MPGF_PUBLIC_GOODS_CRECM_V1125_BONUS_STANCE_WEIGHT_FIXED_BY_STANCE,
      canonicalNonNegativeIntegerStringsRequired: true,
      malformedScoreUnitsSanitizedToZero: true,
      malformedBonusCapsSanitizedToZero: true,
      allocationUsesExactBigIntProration: true,
      floatingQfAdjustedMayNotDeterminePayoutCents: true,
      deterministicRemainderOrderRequiresStableHashKeys: true,
      bonusScoreHashBindsFixedPointConstantsAndUnits: true,
    },
    roundCloseBundleRowUniqueness: {
      formulaLevelGuardsRequired: true,
      publicGoodProjectKey: "(roundId,id)" as const,
      commonGroundBudgetKeys: ["(roundId,id)", "(roundId,participantId)"] as const,
      supportStanceKey: "(roundId,commonGroundBudgetId,projectId)" as const,
      conditionalTradeIntentKey: "(roundId,commonGroundBudgetId,projectId)" as const,
      identityEligibilityKey: "(roundId,participantId)" as const,
      paymentSnapshotKey: "(roundId,commonGroundBudgetId,snapshotKind)" as const,
      projectEligibilitySnapshotKey: "(roundId,projectId)" as const,
      duplicateRowsFailClosed: true,
      wrongRoundRowsDoNotSatisfySelectedLookups: true,
      failureBonusEligibilityRequiresRowUniquenessHash: true,
    },
    commonGroundBudgetInputGating: {
      missingRowsFailClosedWithoutDereference: true,
      rowCountsRequiredByIdAndParticipant: true,
      invalidCapsAllocateZero: true,
      invalidBudgetPeriodAllocatesZero: true,
      recurringBudgetsRequireCurrentConsentAndCaptureMetadata: true,
      invalidFallbackRuleAllocatesZero: true,
      paymentSnapshotLookupRequiresEligibleBudget: true,
      exposesPaymentAuthority: false,
    },
    supportStanceInputGating: {
      missingOrInvalidDefaultsToAbstain: true,
      wrongRowsExposeZeroCapsAndNoCounterpartyBuckets: true,
      malformedCounterpartyBucketsTreatedAsEmpty: true,
      invalidCapsAllocateZero: true,
      minCounterpartyVolumeMirrorAuthoritative: false,
      exposesPaymentAuthority: false,
    },
    plainLanguageGuidedMode: {
      presentationLayerOnly: true,
      allowedPlainLabels: MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_LABELS,
      canonicalStanceByPlainLabel: MPGF_PUBLIC_GOODS_CRECM_V1125_PLAIN_STANCE_TO_CANONICAL_STANCE,
      plainLabelByCanonicalStance: MPGF_PUBLIC_GOODS_CRECM_V1125_CANONICAL_STANCE_TO_PLAIN_LABEL,
      plainLabelsCannotIntroduceNewStates: true,
      exactLabelsRequiredNoTrimOrAlias: true,
      fundThisCanonicalStance: "strong" as const,
      fundIfDifferentViewSupportJoinsCanonicalStance: "weak" as const,
      needsReviewCanonicalStance: "dissent" as const,
      skipCanonicalStance: "abstain" as const,
      allocatableCanonicalStances: ["strong", "weak"] as const,
      reviewPressureOnlyCanonicalStance: "dissent" as const,
      zeroAllocationCanonicalStances: ["dissent", "abstain"] as const,
      explicitSaveRequiredBeforeAllocation: true,
      finalReviewMustExposeCanonicalMeaning: true,
      advancedAndPlainModesShareCanonicalProjectSupportStanceRecords: true,
      uiBrowsingCalculatorOrSuggestionCannotInferAllocatableStance: true,
    },
    conditionalIntentInputGating: {
      missingInactiveOrWrongRowsAllocateZero: true,
      rowCountsRequiredByRoundBudgetProject: true,
      amountAndMaxExposureMustBePositive: true,
      minCounterpartyVolumeMustBePositive: true,
      malformedCounterpartyBucketsTreatedAsEmpty: true,
      capturedReleasedFailedOrMalformedAuthorizationStatesAllocateZero: true,
      fallbackRuleMustBeValidAndMatchBudget: true,
      projectSupportStanceMinCounterpartyVolumeAuthoritative: false,
      exposesFallbackAuthorityOnlyWhenEligible: true,
      exposesAuthorizationAuthorityOnlyWhenEligible: true,
    },
    counterpartyVolumeSatisfaction: {
      thresholdSource: "ConditionalTradeIntent.minCounterpartyVolumeCents" as const,
      validatesFrozenReciprocalDistinctBucketIntersection: true,
      sameBucketRowsNeverCount: true,
      countsOnlyNetRecipientDisbursedMatchEligiblePublicGoodCredit: true,
      excludesSponsorPlatformFeeRewardCreditCertificateRows: true,
      excludesSelfLinkedAccountSamePaymentClusterAndSameControlRows: true,
      requiresCounterpartyHumanVerifiedSybilClearCollusionClear: true,
      malformedRowsDoNotCount: true,
    },
    allocatorStateInputGating: {
      participantRemainingBudgetKey: "(roundId,participantId)" as const,
      projectRemainingCapKey: "(roundId,projectId)" as const,
      wrongRoundRowsResolveToZero: true,
      missingRowsResolveToZero: true,
      malformedValuesAllocateZero: true,
      actualAllocationUsesRoundKeyedState: true,
    },
    identityEligibilityInputGating: {
      missingRowsResolveToZeroWeight: true,
      malformedWeightResolvesToZero: true,
      rowCountsRequiredByParticipant: true,
      requiresHumanVerifiedSybilClearCollusionClear: true,
      nonClearRowsCannotCountMatchCounterpartyOrQualifyFailureBonus: true,
      malformedThresholdsFailClosed: true,
    },
    economicInputGating: {
      roundSponsorBudgetsInvalidFieldsResolveToZero: true,
      roundSponsorBudgetsNeverProduceNegativeAvailability: true,
      totalSponsorPayoutAvailabilityUsesExactBigInt: true,
      projectEconomicTermsRequireRoundBoundUniqueProjectRow: true,
      projectEconomicTermsMalformedBlockClearing: true,
      invalidProjectThresholdCountsCannotLowerRequirements: true,
      projectMatchBpsRange: "[0,100000]" as const,
      malformedProjectMatchBpsResolveToZeroForAffectedMatch: true,
      defaultProjectMatchBps: 10_000,
    },
    failClosedHelpers: {
      minReturnsZeroOnMalformedInputs: true,
      payoutRelevantMinUsesHelper: true,
      intersectionReturnsEmptyOnMalformedInputs: true,
      intersectionRejectsDuplicateOrWhitespacePaddedInputs: true,
      sumBigIntReturnsZeroOnMalformedInputs: true,
      aggregateSumsUseExactBigIntHelper: true,
      rawMathMinAllowedOnlyInsideHelper: true,
    },
    netPublicGoodSupporterBreadth: {
      defaultSupporterCountMinNetPublicGoodCents:
        MPGF_PUBLIC_GOODS_CRECM_V1125_DEFAULT_SUPPORTER_COUNT_MIN_NET_PUBLIC_GOOD_CENTS,
      malformedOrBelowDefaultFloorResolvesToDefault: true,
      frozenFloorMayOnlyRaiseMinimum: true,
      usesNetRecipientDisbursedPublicGoodCreditOnly: true,
      feeInclusiveGrossDollarsNeverCountForBreadth: true,
      rowsBelowFloorCannotCountAsVerifiedSupporters: true,
      rowsBelowFloorCannotCountAsActiveClusters: true,
      requiresHumanVerifiedSybilClearCollusionClearRows: true,
      requiresLinkedPaymentAndSameControlExclusions: true,
    },
    contributorBenefits: {
      supportedKinds: MPGF_PUBLIC_GOODS_CRECM_V1125_CONTRIBUTOR_BENEFIT_KINDS,
      requireCapturedSuccessfulContributionRow: true,
      requireNoLateAccess: true,
      requireVerifiedClearIdentityAndConflictState: true,
      neverCountAsPublicGoodDollarsOrAllocationPower: true,
      successRewardsUseOnlyBackedSuccessRewardPool: true,
      coordinationCreditsNonTransferable: true,
      impactCertificatesBindContributionBundlePaymentAndFeeContext: true,
    },
    failureBonus: {
      policy: MPGF_PUBLIC_GOODS_CRECM_V1125_FAILURE_BONUS_POLICY,
      payableRoundRequiredForSideEffects: true,
      thresholdFamilyFailureReasonsOnly: MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS,
      lockedEligibleBundleAndEarlyPaymentSnapshotRequired: true,
      claimantConflictMustBeNoConflict: true,
      claimantConflictSnapshotBindsExactPayoutContext: true,
      claimantConflictSnapshotIdStoredOnClaims: true,
      sponsorBudgetFivePercentCapUsesIntegerArithmetic: true,
      idempotentClaimKey: "(roundId,projectId,participantId,conditionalTradeIntentId)" as const,
      claimCreationInitializesUnsettledDefaults: true,
      claimCreationMismatchesFailClosedToManualReview: true,
      finalPayoutListsRequireApprovedUnsettledClaims: true,
      preliminaryMutationListsRejectTerminalOrSettledClaims: true,
      successfulSettlementAdvancesClaimStateToPaidOrCredited: true,
      rawBonusCentsFormula: "floor(failedQualifiedMatchEligibleCents / 10)" as const,
    },
  };

  return {
    ...summary,
    calcHash: hashMpgfCrecV1125Value(summary),
  };
}
