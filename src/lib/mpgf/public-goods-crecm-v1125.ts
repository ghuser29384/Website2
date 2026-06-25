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
  "private_benefit",
  "political_campaign",
  "lifestyle",
  "threat_like",
  "unknown",
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
  "approved",
  "provisional",
  "review",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_BASELINE_CONFIDENCE_STATES = [
  "approved",
  "provisional",
  "review",
  "low",
  "blocked",
  "unknown",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_ACTION_EVIDENCE_STATES = [
  "approved",
  "provisional",
  "review",
  "blocked",
  "unknown",
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
  "stage_3_binding_allocation",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES = [
  "ilp",
  "deterministic_greedy",
] as const;

export const MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES = [
  "optimal",
  "deterministic_greedy_selected",
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

export type MpgfCrecPaymentSnapshotKind =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS>;

export type MpgfCrecSponsorPoolType =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES>;

export type MpgfCrecSponsorBackingState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES>;

export type MpgfCrecThresholdFamilyFailureReason =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_THRESHOLD_FAMILY_FAILURE_REASONS>;

export type MpgfCrecProjectEligibilityField =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS>;

export type MpgfCrecProjectScopeState =
  ArrayValue<typeof MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_SCOPE_STATES>;

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
  bindingOutputAllowed: boolean;
  shadowOnly: boolean;
}

export interface MpgfCrecProjectHardGateInput {
  deploymentMode: MpgfCrecRoundClearingInputBundle["deploymentMode"];
  projectScopeState: MpgfCrecProjectScopeState;
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
  solverMode: MpgfCrecSolverMode;
  solverVersion: string;
  optimalityStatus: MpgfCrecOptimalityStatus | "timeout" | "infeasible" | "unknown" | "failed";
  optimizationInputHash: string;
  objectiveVectorHash: string;
  stableTieBreakTupleHash: string;
  selectedCoalitionHash: string;
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

export interface MpgfCrecBundleProjectParticipantRow {
  id: string;
  roundId: string;
  commonGroundBudgetId: string;
  projectId: string;
  participantId: string;
}

export interface MpgfCrecBundleIdentityEligibilityRow {
  roundId: string;
  participantId: string;
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
  projectScopeState: "valid_moral_public_good" | "private_benefit" | "political_campaign" | "lifestyle" | "threat_like" | "unknown";
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
  claimantConflictState: "no_conflict" | "conflict_review" | "conflict_blocked" | "unknown";
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
  claimantConflictSnapshotHash: string;
  claimantConflictState: "no_conflict" | "conflict_review" | "conflict_blocked" | "unknown";
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
  claimantConflictSnapshotHash: string;
  claimantConflictState: "no_conflict" | "conflict_review" | "conflict_blocked" | "unknown";
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

function timestampEquals(left: unknown, right: unknown) {
  return isMpgfCrecCanonicalUtcTimestamp(left) && left === right;
}

function isNonNegativeSafeIntegerCents(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isPositiveSafeIntegerCents(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
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

function stableBucketMap(value: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, stableStringArray(values)]),
  );
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

  return {
    eligible: blockers.length === 0,
    blockers,
    cappedGrossExposureCents:
      blockers.length === 0
        ? Math.min(
            input.requestedGrossExposureCents,
            input.pilotMaxRoundGrossExposureCents as number,
            input.pilotMaxParticipantGrossExposureCents as number,
            input.remainingRoundDeploymentExposureCents as number,
            input.remainingParticipantDeploymentExposureCents as number,
          )
        : 0,
    bindingOutputAllowed: blockers.length === 0,
    shadowOnly: false,
  };
}

function projectHardGateHashPayload(input: MpgfCrecProjectHardGateInput) {
  return {
    deploymentMode: input.deploymentMode,
    projectScopeState: input.projectScopeState,
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
  const shadowBaselineStatesAllowed =
    input.baselineIntegrityState === "approved" ||
    input.baselineIntegrityState === "provisional";
  const shadowBaselineConfidenceAllowed =
    input.baselineConfidenceState === "approved" ||
    input.baselineConfidenceState === "provisional";
  const shadowActionEvidenceAllowed =
    input.actionEvidenceState === "approved" ||
    input.actionEvidenceState === "provisional";
  const hasProvisionalLearningSignal =
    input.baselineIntegrityState === "provisional" ||
    input.baselineConfidenceState === "provisional" ||
    input.actionEvidenceState === "provisional";

  addBlocker(blockers, "project_hard_gate_deployment_mode_invalid", deploymentModeValid);
  addBlocker(
    blockers,
    "project_hard_gate_scope_not_valid_moral_public_good",
    input.projectScopeState === "valid_moral_public_good",
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
      "project_hard_gate_baseline_integrity_not_approved",
      input.baselineIntegrityState === "approved",
    );
    addBlocker(
      blockers,
      "project_hard_gate_baseline_confidence_not_approved",
      input.baselineConfidenceState === "approved",
    );
    addBlocker(
      blockers,
      "project_hard_gate_action_evidence_not_approved",
      input.actionEvidenceState === "approved",
    );
  }

  if (shadowDeploymentMode) {
    addBlocker(
      blockers,
      "project_hard_gate_shadow_baseline_integrity_not_approved_or_provisional",
      shadowBaselineStatesAllowed,
    );
    addBlocker(
      blockers,
      "project_hard_gate_shadow_baseline_confidence_not_approved_or_provisional",
      shadowBaselineConfidenceAllowed,
    );
    addBlocker(
      blockers,
      "project_hard_gate_shadow_action_evidence_not_approved_or_provisional",
      shadowActionEvidenceAllowed,
    );
  }

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    bindingOutputAllowed: eligible && bindingDeploymentMode,
    shadowOnlyProvisionalLearningAllowed: eligible && shadowDeploymentMode && hasProvisionalLearningSignal,
    hardGateHash: eligible ? buildMpgfCrecProjectHardGateHash(input) : null,
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

export function sumSelectedMpgfCrecSponsorPaidFeeSupportDemand(
  feeQuotes: unknown,
  selectedFeeQuoteIds: unknown,
  expected: MpgfCrecFeeQuoteExpectedContext & {
    backedFeeSupportPoolCents: number;
  },
): MpgfCrecSponsorPaidFeeSupportDemandResult {
  const blockers: string[] = [];

  if (!Array.isArray(feeQuotes)) {
    return {
      eligible: false,
      selectedFeeQuoteCount: 0,
      demandCents: 0,
      demandCentsExact: "0",
      blockers: ["fee_quote_rows_not_array"],
    };
  }

  if (!isTrimStableStringArray(selectedFeeQuoteIds)) {
    return {
      eligible: false,
      selectedFeeQuoteCount: 0,
      demandCents: 0,
      demandCentsExact: "0",
      blockers: ["selected_fee_quote_ids_invalid"],
    };
  }

  let demandCents = BigInt(0);
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
    solverMode: trace.solverMode,
    solverVersion: trace.solverVersion,
    optimalityStatus: trace.optimalityStatus,
    optimizationInputHash: trace.optimizationInputHash,
    objectiveVectorHash: trace.objectiveVectorHash,
    stableTieBreakTupleHash: trace.stableTieBreakTupleHash,
    selectedCoalitionHash: trace.selectedCoalitionHash,
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
  addBlocker(blockers, "optimization_trace_solver_mode_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_SOLVER_MODES.includes(trace.solverMode));
  addBlocker(blockers, "optimization_trace_solver_version_invalid", isMpgfCrecNonEmptyTrimStableString(trace.solverVersion));
  addBlocker(blockers, "optimization_trace_optimality_status_invalid", MPGF_PUBLIC_GOODS_CRECM_V1125_OPTIMALITY_STATUSES.includes(trace.optimalityStatus as MpgfCrecOptimalityStatus));
  addBlocker(blockers, "optimization_trace_solver_status_incoherent", solverStatusCoherent);
  addBlocker(blockers, "optimization_trace_input_hash_invalid", isMpgfCrecCanonicalHash(trace.optimizationInputHash));
  addBlocker(blockers, "optimization_trace_objective_vector_hash_invalid", isMpgfCrecCanonicalHash(trace.objectiveVectorHash));
  addBlocker(blockers, "optimization_trace_tie_break_hash_invalid", isMpgfCrecCanonicalHash(trace.stableTieBreakTupleHash));
  addBlocker(blockers, "optimization_trace_selected_coalition_hash_invalid", isMpgfCrecCanonicalHash(trace.selectedCoalitionHash));
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
    const totalActiveUnits = activeRows.reduce((sum, row) => sum + row.bonusScoreUnits, BigInt(0));

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
    normalizedRows.reduce((sum, row) => sum + row.allocatedCents, BigInt(0)),
  );
  const totalBonusScoreUnitsExact = normalizedRows
    .reduce((sum, row) => sum + row.bonusScoreUnits, BigInt(0))
    .toString();

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
    ? Math.min(rawBonusCents, input.participantRoundFailureBonusCapCents, backedAvailableFailureBonusPoolCents)
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

  validateMpgfCrecFailureBonusClaimListContext(context, blockers);
  addBlocker(blockers, "failure_bonus_claim_ids_duplicate", !hasDuplicate(claimIds));

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
    },
    feeQuotes: {
      feePolicyHashBoundQuoteHashRequired: true,
      selectedPositiveAllocationRowsNeedBindingFeeQuote: true,
      waivedFeeMustHaveZeroFeeCents: true,
      donorDeductedNetEqualsGrossMinusFee: true,
      sponsorPaidNetEqualsGrossAndRequiresFeeSupportPool: true,
      selectedSponsorPaidFeeIdsMustResolveExactlyOnce: true,
    },
    projectRoundEligibilitySnapshots: {
      snapshotKind: "round_open" as const,
      sourceCutoffEqualsRoundOpen: true,
      exactBooleanEligibilityFieldsRequired: MPGF_PUBLIC_GOODS_CRECM_V1125_PROJECT_ELIGIBILITY_FIELDS,
      allEligibilityFieldsMustBeTrueForFailureBonus: true,
      bindingHashIncludesEligibilityFields: true,
    },
    projectHardGates: {
      bindingModesRequireApprovedBaselineIntegrity: true,
      bindingModesRequireApprovedBaselineConfidence: true,
      bindingModesRequireApprovedActionEvidence: true,
      shadowModeAllowsProvisionalBaselineAndActionEvidenceOnlyAsNonBindingLearning: true,
      openChallengesBlockedUnlessRecordedNonBlocking: true,
      projectScopeStateRequired: "valid_moral_public_good" as const,
      destinationRouteStateRequired: "valid" as const,
      externalityStateRequired: "clear" as const,
      reviewStateRequired: "approved" as const,
      challengeStatesAllowed: ["clear", "non_blocking"] as const,
      conflictReviewStateRequired: "clear" as const,
      sponsorCompatibilityStateRequired: "compatible" as const,
      legalCustodyStateRequired: "clear" as const,
      hardGateHashBindsBaselineActionAndReviewStates: true,
      failureBonusEligibilityRequiresProjectHardGateHash: true,
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
      bindingStage: "stage_3_binding_allocation" as const,
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
