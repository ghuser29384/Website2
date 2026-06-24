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
  externalFailedQualifiedMatchEligibleCentsByClaimId?: Record<string, number>;
  externalParticipantCappedProvisionalBonusCentsByClaimId?: Record<string, number>;
}

export interface MpgfCrecFailureBonusClaimListResult {
  eligible: boolean;
  blockers: string[];
  claims: MpgfCrecFailureBonusClaimRecord[];
  claimIds: string[];
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

function isNonNegativeSafeIntegerCents(value: unknown) {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isPositiveSafeIntegerCents(value: unknown) {
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
      rawBonusCentsFormula: "floor(failedQualifiedMatchEligibleCents / 10)" as const,
    },
  };

  return {
    ...summary,
    calcHash: hashMpgfCrecV1125Value(summary),
  };
}
