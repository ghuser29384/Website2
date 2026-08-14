import { createHash } from "node:crypto";

import {
  FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
  getHighestClearedThresholdIndex,
  getSuccessPremiumDueForClearedThreshold,
  type FailureBonusSuccessPremiumPayer,
  type FailureBonusSuccessPremiumScheduleQuote,
} from "./failure-bonus-success-premium";

export const REFUND_BONUS_FEATURE_KEY = "cgpp_refund_bonus_non_mvp_v0_1" as const;
export const REFUND_BONUS_LIVE_MONEY_FLAG = "refund_bonus_live_money_enabled" as const;
export const REFUND_BONUS_DEPLOYMENT_MODE = "refund_bonus_non_mvp_labs" as const;
export const REFUND_BONUS_FEATURE_CLASSIFICATION = "non_mvp" as const;
export const REFUND_BONUS_CALCULATION_VERSION = "cgpp_refund_bonus_non_mvp_v0_1" as const;
export const REFUND_BONUS_NON_MVP_WARNING =
  "Non-MVP labs mechanism. Production public exposure and real-money movement are disabled unless this mechanism is explicitly promoted.";

const DEFAULT_QUALIFYING_FAILURE_MODES = [
  "net_recipient_threshold_shortfall",
  "verified_supporter_threshold_shortfall",
  "different_view_threshold_shortfall",
] as const;

export type RefundBonusQualifyingFailureMode = typeof DEFAULT_QUALIFYING_FAILURE_MODES[number];
export type RefundBonusFailureReason =
  | RefundBonusQualifyingFailureMode
  | "review_block"
  | "challenge_block"
  | "anti_threat_block"
  | "externality_block"
  | "conflict_block"
  | "legal_compliance_block"
  | "payment_provider_outage"
  | "sponsor_match_unbacked"
  | "bonus_reserve_unbacked"
  | "copy_preflight_failure"
  | "round_canceled_by_admin"
  | "safety_pause"
  | "material_sybil_attack"
  | "material_collusion_attack"
  | "authorization_failure_recompute_below_threshold";

export type RefundBonusRoundStatus =
  | "draft"
  | "preflight"
  | "labs_open"
  | "open"
  | "closed_to_new_pledges"
  | "reviewing"
  | "cleared"
  | "qualifying_failed"
  | "nonqualifying_failed"
  | "authorizing"
  | "payable"
  | "captured"
  | "bonus_payable"
  | "bonus_paying"
  | "bonus_paid"
  | "released"
  | "blocked"
  | "canceled";

export type RefundBonusCapabilityAction =
  | "view_labs_pool"
  | "view_public_mvp_card"
  | "create_hard_pledge"
  | "save_payment_method"
  | "authorize_success_charge"
  | "capture_success_charge"
  | "plan_bonus_payout"
  | "execute_bonus_payout"
  | "publish_audit_report";

export type RefundBonusActorRole = "public" | "labs_participant" | "admin" | "service";
export type RefundBonusEnvironment = "production" | "preview" | "development" | "test";
export type RefundBonusViewpointCluster =
  | "humanitarian"
  | "animal_inclusive"
  | "long_run_future"
  | "institutional_resilience"
  | "public_knowledge"
  | "other"
  | "prefer_not_to_say";
export type RefundBonusCapabilityReason =
  | "feature_non_mvp"
  | "feature_disabled"
  | "public_surface_disabled"
  | "production_real_money_disabled"
  | "missing_promotion_record"
  | "insufficient_role"
  | "open_gate_not_passed"
  | "bonus_reserve_unbacked"
  | "legal_compliance_not_approved"
  | "payment_provider_not_ready"
  | "bonus_payout_provider_not_ready"
  | "identity_sybil_controls_not_ready"
  | "copy_preflight_failed"
  | "copy_preflight_stale"
  | "bonus_exposure_cap_not_configured"
  | "emergency_pause_not_configured"
  | "audit_reporting_templates_not_reviewed"
  | "stale_active_labels_present"
  | "emergency_pause_active";

export interface RefundBonusCapabilityInput {
  action: RefundBonusCapabilityAction;
  actorRole: RefundBonusActorRole;
  environment: RefundBonusEnvironment;
  featureEnabled?: boolean;
  liveMoneyEnabled?: boolean;
  promotionRecordApproved?: boolean;
  openGatePassed?: boolean;
  bonusReserveBacked?: boolean;
  legalComplianceApproved?: boolean;
  paymentProviderReady?: boolean;
  bonusPayoutProviderReady?: boolean;
  identitySybilControlsReady?: boolean;
  copyPreflightPassed?: boolean;
  copyPreflightFresh?: boolean;
  bonusExposureCapConfigured?: boolean;
  emergencyPauseConfigured?: boolean;
  auditReportingTemplatesReviewed?: boolean;
  staleActiveLabelsAbsent?: boolean;
  emergencyPaused?: boolean;
}

export interface RefundBonusCapabilityResult {
  allowed: boolean;
  reasons: RefundBonusCapabilityReason[];
  featureKey: typeof REFUND_BONUS_FEATURE_KEY;
  liveMoneyFlag: typeof REFUND_BONUS_LIVE_MONEY_FLAG;
  featureClassification: typeof REFUND_BONUS_FEATURE_CLASSIFICATION;
  deploymentMode: typeof REFUND_BONUS_DEPLOYMENT_MODE;
  productionPublicEnabled: false;
  productionRealMoneyEnabled: false;
}

export interface RefundBonusOpenGateInput {
  id: string;
  roundId: string;
  poolId: string;
  checkedAt: string;
  lastDeployHash: string;
  routeCopyPreflightPassed: boolean;
  projectReviewReady: boolean;
  bonusReserveReady: boolean;
  bonusPolicyFrozen: boolean;
  sponsorStateReady: boolean;
  capsReady: boolean;
  paymentProviderReady: boolean;
  bonusPayoutProviderReady: boolean;
  identitySybilControlsReady: boolean;
  legalComplianceReady: boolean;
  rulebookFrozen: boolean;
  feePolicyFrozen: boolean;
  sealedProgressConfigured: boolean;
  emergencyPauseConfigured: boolean;
  promotionRecordReady: boolean;
  staleActiveLabelsAbsent: boolean;
}

export interface RefundBonusOpenGate {
  id: string;
  roundId: string;
  poolId: string;
  checkedAt: string;
  lastDeployHash: string;
  routeCopyPreflightReportId: string;
  projectReviewReady: boolean;
  bonusReserveReady: boolean;
  bonusPolicyFrozen: boolean;
  sponsorStateReady: boolean;
  capsReady: boolean;
  paymentProviderReady: boolean;
  bonusPayoutProviderReady: boolean;
  identitySybilControlsReady: boolean;
  legalComplianceReady: boolean;
  rulebookFrozen: boolean;
  feePolicyFrozen: boolean;
  sealedProgressConfigured: boolean;
  emergencyPauseConfigured: boolean;
  promotionRecordReady: boolean;
  state: "not_run" | "passed" | "failed";
  failedReasonCodes: string[];
  gateHash: string;
}

export interface RefundBonusRound {
  id: string;
  deploymentMode: typeof REFUND_BONUS_DEPLOYMENT_MODE;
  featureClassification: typeof REFUND_BONUS_FEATURE_CLASSIFICATION;
  status: RefundBonusRoundStatus;
  activePoolId: string;
  participantMinGrossCents: number;
  participantMaxGrossCents: number;
  fixedPledgeGrossCents?: number;
  roundGrossCaptureCapCents: number;
  roundBonusExposureCapCents: number;
  opensAt: string;
  closesAt: string;
  challengeDeadlineAt: string;
  parametersFrozenAt: string;
  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  calculationVersion: typeof REFUND_BONUS_CALCULATION_VERSION;
  sealedProgressMode: "qualitative_only_before_close";
  refundBonusOpenGateId?: string;
  copyPreflightState: "not_run" | "passed" | "failed";
  copyPreflightHash?: string;
  productionPublicEnabled: boolean;
  productionRealMoneyEnabled: boolean;
  promotionRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundBonusPledgePool {
  id: string;
  roundId: string;
  title?: string;
  summary?: string;
  projectIds: [string, string] | [string, string, string];
  allocationWeightsBpsByProjectId: Record<string, number>;
  thresholdNetRecipientCents: number;
  minVerifiedSupporters: number;
  minDistinctViewpointClusters: number;
  minNetRecipientCentsPerSupporter: number;
  sponsorMatchEnabled: boolean;
  sponsorMatchBacked: boolean;
  sponsorMatchPoolId?: string;
  sponsorMatchRatioBps?: number;
  sponsorMatchCapCents?: number;
  refundBonusEnabled: boolean;
  refundBonusReserveId?: string;
  successPremiumEnabled?: boolean;
  successPremiumPayer?: FailureBonusSuccessPremiumPayer;
  successPremiumPolicyVersion?: typeof FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION;
  successPremiumIncludedInNetRecipientThreshold?: false;
  bonusCalculationMode: "fixed_cents" | "percentage_of_pledge_capped" | "none";
  fixedBonusCents?: number;
  bonusRatioBps?: number;
  perUserBonusCapCents: number;
  roundBonusExposureCapCents: number;
  qualifyingFailureModes: RefundBonusQualifyingFailureMode[];
  status:
    | "draft"
    | "labs_open"
    | "open"
    | "closed"
    | "cleared"
    | "qualifying_failed"
    | "nonqualifying_failed"
    | "payable"
    | "captured"
    | "bonus_payable"
    | "bonus_paying"
    | "bonus_paid"
    | "released"
    | "blocked"
    | "canceled";
  reviewGates: {
    projectScope: "clear" | "review" | "blocked";
    recipientRoute: "verified" | "review" | "blocked";
    baseline: "clear" | "review" | "blocked";
    actionEvidence: "adequate" | "review" | "blocked";
    antiThreat: "clear" | "review" | "blocked";
    externality: "clear" | "review" | "blocked";
    conflict: "clear" | "non_blocking" | "review" | "blocked";
    challenge: "clear" | "non_blocking" | "open" | "blocking";
  };
  rulebookHash?: string;
  feePolicyHash?: string;
  bonusPolicyHash?: string;
  createdAt?: string;
}

export interface RefundBonusProjectReviewSnapshot {
  id: string;
  roundId: string;
  poolId: string;
  projectId: string;
  title: string;
  summary: string;
  recipientRouteRef: string;
  recipientRouteState: "verified" | "blocked" | "review";
  projectScopeState: "valid_moral_public_good" | "blocked" | "review";
  baselineState: "clear" | "blocked" | "review";
  actionEvidenceState: "adequate" | "blocked" | "review";
  antiThreatState: "clear" | "blocked" | "review";
  externalityState: "clear" | "blocked" | "review";
  conflictState: "clear" | "non_blocking" | "blocked" | "review";
  challengeState: "clear" | "non_blocking" | "open" | "blocking";
  qualifyingFailureBonusAllowed: boolean;
  blockedFailureBonusAllowed: false;
  prohibitsPoliticalCampaigns: true;
  prohibitsCampaignDonations: true;
  prohibitsLobbyingTrades: true;
  prohibitsLifestyleTrades: true;
  prohibitsBehaviorChangePromises: true;
  prohibitsPrivateBenefitProjects: true;
  prohibitsPayToStopHarmProposals: true;
  prohibitsThreatLikeProjects: true;
  prohibitsCoerciveProposals: true;
  prohibitsExtortionaryProposals: true;
  reviewSnapshotHash: string;
  createdAt: string;
}

export interface RefundBonusReserve {
  id: string;
  roundId: string;
  poolId: string;
  reserveType: "failure_participation_bonus";
  sponsorNamePublic?: string;
  backedCents: number;
  maxExposureCents: number;
  committedCents: number;
  committedExposureCents: number;
  paidCents: number;
  heldCents: number;
  releasedUnusedCents: number;
  successPremiumCreditedCents?: number;
  backingState: "funded" | "escrowed" | "contractually_committed" | "unbacked" | "dev_simulated";
  legalComplianceState: "approved" | "review" | "blocked";
  payoutProviderReady: boolean;
  jurisdictionSet: string[];
  sourceHash: string;
  bonusPolicyHash: string;
  publishedAt: string;
  backingConfirmedAt: string;
  status: "draft" | "backed" | "active" | "paying" | "paid" | "released_unused" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export interface RefundBonusPledge {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;
  maxGrossCents: number;
  feeCents: number;
  estimatedFeeCents: number;
  estimatedNetRecipientCents: number;
  viewpointCluster: RefundBonusViewpointCluster;
  visibility: "aggregate_only";
  sameControlClusterId?: string;
  paymentClusterId?: string;
  bonusPayoutMethodRef?: string;
  pledgeState:
    | "draft"
    | "hard_saved"
    | "excluded_identity"
    | "excluded_payment"
    | "excluded_bonus_abuse"
    | "authorized"
    | "captured"
    | "released"
    | "bonus_eligible"
    | "bonus_ineligible"
    | "bonus_payable"
    | "bonus_paid"
    | "failed"
    | "canceled";
  paymentCommitmentSnapshotId?: string;
  identityEligibilitySnapshotId?: string;
  bonusEligibilitySnapshotId?: string;
  expectedBonusCents: number;
  finalReviewConfirmedAt?: string;
  feeAcknowledged: boolean;
  sealedProgressAcknowledged: boolean;
  bonusTermsAcknowledged: boolean;
  providerPaymentMethodConfirmed: boolean;
  humanVerified: boolean;
  identityVerified: boolean;
  sybilState: "clear" | "review" | "blocked";
  collusionState: "clear" | "review" | "blocked";
  priorBonusAbuseState: "clear" | "review" | "blocked";
  jurisdictionEligibilityState: "clear" | "review" | "blocked";
  bonusEligibilityWeightBps: number;
  countingWeightBps: number;
  rulebookHashAtConsent: string;
  feePolicyHashAtConsent: string;
  bonusPolicyHashAtConsent: string;
  bonusExposureReservedCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface RefundBonusBonusEligibilitySnapshot {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  eligibleAtPledgeSave: boolean;
  eligibilityReasonCodes: string[];
  humanVerified: boolean;
  identityVerified: boolean;
  sybilState: "clear" | "review" | "blocked";
  collusionState: "clear" | "review" | "blocked";
  sameControlClusterId?: string;
  paymentClusterId?: string;
  priorBonusAbuseState: "clear" | "review" | "blocked";
  jurisdictionEligibilityState: "clear" | "review" | "blocked";
  bonusCalculationMode: RefundBonusPledgePool["bonusCalculationMode"];
  computedBonusCents: number;
  perUserBonusCapCents: number;
  reserveId: string;
  reserveBackingStateAtSave: "funded" | "escrowed" | "contractually_committed" | "dev_simulated";
  snapshotHash: string;
  asOf: string;
}

export interface RefundBonusIdentityEligibilitySnapshot {
  id: string;
  roundId: string;
  participantId: string;
  humanVerified: boolean;
  identityVerified: boolean;
  sybilState: "clear" | "review" | "blocked";
  collusionState: "clear" | "review" | "blocked";
  sameControlClusterId?: string;
  paymentClusterId?: string;
  countingWeightBps: 0 | 10_000;
  bonusEligibilityWeightBps: 0 | 10_000;
  snapshotHash: string;
  asOf: string;
}

export interface RefundBonusPaymentCommitmentSnapshot {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  paymentMethodRef: string;
  commitmentState: "provider_confirmed" | "requires_action" | "invalid" | "detached";
  savedAt: string;
  confirmedAt: string;
  asOf: string;
  supportsFutureAuthorization: boolean;
  supportsBonusPayoutMethod?: boolean;
  bonusPayoutMethodRef?: string;
  providerEvidenceHash: string;
  snapshotHash: string;
}

export interface RefundBonusFeeQuote {
  id: string;
  roundId: string;
  pledgeId: string;
  grossCents: number;
  feeCents: number;
  netRecipientCents: number;
  feePayer: "donor" | "waived";
  feePolicyHash: string;
  quoteHash: string;
}

export function isRefundBonusFeeQuoteValid(quote: RefundBonusFeeQuote) {
  return (
    isTrimStableNonEmpty(quote.id) &&
    isTrimStableNonEmpty(quote.roundId) &&
    isTrimStableNonEmpty(quote.pledgeId) &&
    isPositiveSafeInteger(quote.grossCents) &&
    isNonNegativeSafeInteger(quote.feeCents) &&
    isPositiveSafeInteger(quote.netRecipientCents) &&
    quote.grossCents === quote.feeCents + quote.netRecipientCents &&
    (quote.feePayer === "donor" || quote.feePayer === "waived") &&
    (quote.feePayer !== "waived" || quote.feeCents === 0) &&
    isCanonicalHash(quote.feePolicyHash) &&
    isCanonicalHash(quote.quoteHash)
  );
}

export interface RefundBonusAuthorizationAttempt {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  requiredGrossCents: number;
  providerAuthorizationRef?: string;
  providerCaptureRef?: string;
  authorizationState:
    | "not_attempted"
    | "authorized_exact"
    | "failed"
    | "wrong_amount"
    | "expired_before_capture"
    | "short_expiry"
    | "released"
    | "captured";
  authorizedAt?: string;
  expiresAt?: string;
  capturedAt?: string;
  releasedAt?: string;
  eventHash: string;
}

export function isRefundBonusAuthorizationAttemptCaptureReady(
  attempt: RefundBonusAuthorizationAttempt | undefined,
  pledge: Pick<RefundBonusPledge, "id" | "roundId" | "poolId" | "participantId" | "maxGrossCents">,
  expectedCaptureAt?: string,
) {
  return Boolean(
    attempt &&
      attempt.roundId === pledge.roundId &&
      attempt.poolId === pledge.poolId &&
      attempt.pledgeId === pledge.id &&
      attempt.participantId === pledge.participantId &&
      attempt.authorizationState === "authorized_exact" &&
      attempt.requiredGrossCents === pledge.maxGrossCents &&
      Boolean(attempt.providerAuthorizationRef) &&
      doesRefundBonusAuthorizationExpireAfter(attempt, expectedCaptureAt) &&
      isCanonicalHash(attempt.eventHash),
  );
}

function doesRefundBonusAuthorizationExpireAfter(
  attempt: Pick<RefundBonusAuthorizationAttempt, "expiresAt"> | undefined,
  expectedCaptureAt?: string,
) {
  if (!expectedCaptureAt) return true;
  if (!attempt?.expiresAt) return false;
  const expiresAtMs = Date.parse(attempt.expiresAt);
  const expectedCaptureAtMs = Date.parse(expectedCaptureAt);
  return Number.isFinite(expiresAtMs) && Number.isFinite(expectedCaptureAtMs) && expiresAtMs > expectedCaptureAtMs;
}

function isRefundBonusSuccessReceiptCaptureEvidenceReady(
  attempt: RefundBonusAuthorizationAttempt | undefined,
  pledge: Pick<RefundBonusPledge, "id" | "roundId" | "poolId" | "participantId" | "maxGrossCents">,
  expectedCaptureAt: string,
): attempt is RefundBonusAuthorizationAttempt & {
  providerAuthorizationRef: string;
  providerCaptureRef: string;
} {
  return Boolean(
    attempt &&
      attempt.roundId === pledge.roundId &&
      attempt.poolId === pledge.poolId &&
      attempt.pledgeId === pledge.id &&
      attempt.participantId === pledge.participantId &&
      attempt.authorizationState === "captured" &&
      attempt.requiredGrossCents === pledge.maxGrossCents &&
      isTrimStableNonEmpty(attempt.providerAuthorizationRef) &&
      isTrimStableNonEmpty(attempt.providerCaptureRef) &&
      doesRefundBonusAuthorizationExpireAfter(attempt, expectedCaptureAt) &&
      isCanonicalHash(attempt.eventHash),
  );
}

export interface RefundBonusEligiblePledge {
  pledge: RefundBonusPledge;
  netRecipientCents: number;
  countedCents: number;
  matchEligibleCents: number;
  bonusEligibleCents: number;
}

export interface RefundBonusOutcome {
  status: "cleared" | "qualifying_failed" | "nonqualifying_failed";
  reasonCodes: RefundBonusFailureReason[];
  eligiblePledges: RefundBonusEligiblePledge[];
  excludedPledgeIds: string[];
  netRecipientCents: number;
  grossExposureCents: number;
  verifiedSupporterCount: number;
  distinctViewpointClusterCount: number;
  bonusExposureReservedCents: number;
  sponsorMatchCents: number;
  recomputedAfterAuthorization: boolean;
}

export interface RefundBonusReserveLedgerEntry {
  id: string;
  roundId: string;
  poolId: string;
  reserveId: string;
  thresholdId?: string;
  eventType:
    | "success_premium_credit"
    | "failure_bonus_debit"
    | "reserve_expense_debit"
    | "bonus_exposure_release";
  cashDeltaCents: number;
  exposureDeltaCents: number;
  currency: "usd";
  policyVersion: typeof FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION;
  sourceRef: string;
  idempotencyKey: string;
  eventHash: string;
  createdAt: string;
}

export interface RefundBonusPayoutOperation {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  reserveId: string;
  bonusGrossCents: number;
  payoutFeeCents: number;
  bonusNetCents: number;
  currency: "usd";
  payoutDestinationRef?: string;
  providerPayoutRef?: string;
  payoutState:
    | "not_attempted"
    | "pending"
    | "succeeded"
    | "failed_retryable"
    | "failed_final"
    | "held_compliance"
    | "unclaimed"
    | "forfeited_under_rules"
    | "reversed";
  idempotencyKey: string;
  eventHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundBonusPoolSettlementRow {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;
  bonusExposureReservedCents: number;
  bonusEligibleCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnearnedReleasedCents: number;
  settlementState:
    | "pending"
    | "captured"
    | "released"
    | "bonus_payable"
    | "bonus_paid"
    | "bonus_held"
    | "blocked"
    | "failed";
  createdAt: string;
}

export interface RefundBonusAuditReport {
  id: string;
  roundId: string;
  poolId: string;
  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  calculationVersion: typeof REFUND_BONUS_CALCULATION_VERSION;
  finalStatus:
    | "cleared_and_captured"
    | "qualifying_failed_bonus_payable"
    | "qualifying_failed_bonus_paid"
    | "nonqualifying_failed_no_bonus"
    | "failed_authorization_no_bonus"
    | "blocked_review_no_bonus"
    | "canceled_no_bonus";
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;
  successPremiumCents: number;
  successPremiumPayer?: FailureBonusSuccessPremiumPayer;
  grossSuccessRequirementCents: number;
  successPremiumPolicyVersion?: typeof FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION;
  bonusReserveBackedCents: number;
  bonusExposureReservedCents: number;
  bonusLiabilityCents: number;
  bonusHeldCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnclaimedCents: number;
  bonusUnearnedReleasedCents: number;
  verifiedSupporterCount: number;
  distinctViewpointClusterCount: number;
  authorizationFailureCount: number;
  excludedIdentityCount: number;
  excludedPaymentClusterCount: number;
  excludedBonusAbuseCount: number;
  reviewBlockCount: number;
  reasonCodes: RefundBonusFailureReason[];
  publicReportJson: RefundBonusPublicReportJson;
  publishedAt: string;
}

export interface RefundBonusPublicReportJson {
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;
  successPremiumCents: number;
  successPremiumPayer?: FailureBonusSuccessPremiumPayer;
  grossSuccessRequirementCents: number;
  successPremiumPolicyVersion?: typeof FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION;
  bonusReserveBackedCents: number;
  bonusExposureReservedCents: number;
  bonusLiabilityCents: number;
  bonusHeldCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnclaimedCents: number;
  bonusUnearnedReleasedCents: number;
  finalStatus: RefundBonusAuditReport["finalStatus"];
  reasonCodes: RefundBonusFailureReason[];
}

export interface RefundBonusSettlementPlan {
  settlementRows: RefundBonusPoolSettlementRow[];
  payoutOperations: RefundBonusPayoutOperation[];
  reserveLedgerEntries: RefundBonusReserveLedgerEntry[];
  auditReport: RefundBonusAuditReport;
  blockedReasonCodes: string[];
}

export interface RefundBonusReceipt {
  receiptKind: "success_charge" | "qualifying_failure_bonus" | "no_bonus_no_charge";
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  calculationVersion: typeof REFUND_BONUS_CALCULATION_VERSION;
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  projectFundingCents: number;
  projectAllocationCentsByProjectId: Record<string, number>;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;
  failureReasonCategory?: RefundBonusFailureReason;
  bonusEligibilityStatus: "not_applicable_cleared" | "eligible" | "not_eligible";
  bonusGrossCents: number;
  bonusPayoutFeeCents: number;
  bonusNetCents: number;
  bonusPayoutState?: RefundBonusPayoutOperation["payoutState"];
  bonusPayoutReference?: string;
  bonusReserveId?: string;
  authorizationReference?: string;
  captureReference?: string;
  rulebookHash: string;
  feePolicyHash?: string;
  bonusPolicyHash: string;
  copy: string;
}

export interface RefundBonusCopyPreflight {
  passed: boolean;
  blockedTerms: string[];
  missingRequiredClaims: string[];
}

export interface RefundBonusCopyPreflightReport {
  id: string;
  roundId: string;
  checkedAt: string;
  lastDeployHash: string;
  checkedRoutes: string[];
  prohibitedActiveLabelsFound: string[];
  exactProgressLeakFound: boolean;
  paymentOverclaimFound: boolean;
  bonusOverclaimFound: boolean;
  financialPromotionRiskFound: boolean;
  ordinaryZeroStatePrimaryFound: boolean;
  staleCtaFound: boolean;
  nonMvpSurfaceLeakFound: boolean;
  pass: boolean;
  reportHash: string;
}

export type RefundBonusCopyPreflightFreshnessReason =
  | "copy_preflight_failed"
  | "invalid_copy_preflight_checked_at"
  | "invalid_latest_deploy_completed_at"
  | "invalid_latest_deploy_hash"
  | "deploy_hash_mismatch"
  | "copy_preflight_before_latest_deploy"
  | "required_route_missing";

export interface RefundBonusCopyPreflightFreshnessInput {
  report: RefundBonusCopyPreflightReport;
  latestDeployHash: string;
  latestDeployCompletedAt: string;
  requiredRoutes: string[];
}

export interface RefundBonusCopyPreflightFreshnessResult {
  fresh: boolean;
  reasonCodes: RefundBonusCopyPreflightFreshnessReason[];
  missingRoutes: string[];
  reportPasses: boolean;
  deployHashMatches: boolean;
  generatedAfterLatestDeploy: boolean;
  requiredRoutesCovered: boolean;
}

export const REFUND_BONUS_PRODUCT_METRIC_KEYS = [
  "moral_public_goods_search_visits",
  "labs_card_click_through_rate",
  "pool_page_completion_rate",
  "amount_screen_completion_rate",
  "final_review_completion_rate",
  "provider_confirmed_payment_method_rate",
  "hard_pledges_saved",
  "hard_pledged_gross_cents",
  "hard_pledged_net_recipient_cents",
  "cleared_net_recipient_cents",
  "captured_gross_cents",
  "verified_supporter_count",
  "distinct_eligible_viewpoint_cluster_count",
  "qualifying_failures",
  "nonqualifying_failures",
  "bonus_eligible_pledges",
  "bonus_ineligible_pledges",
  "bonus_reserve_utilization_cents",
  "bonus_paid_cents",
  "bonus_unclaimed_cents",
] as const;

export const REFUND_BONUS_SAFETY_METRIC_KEYS = [
  "sybil_flags",
  "collusion_flags",
  "same_control_exclusions",
  "same_payment_cluster_exclusions",
  "bonus_abuse_flags",
  "prior_bonus_abuse_exclusions",
  "review_blocks",
  "challenge_blocks",
  "conflict_review_flags",
  "anti_threat_flags",
  "externality_review_blocks",
  "authorization_failures",
  "bonus_payout_failures",
  "payment_copy_incidents",
  "bonus_copy_incidents",
  "stale_copy_incidents",
  "privacy_incidents",
  "exact_progress_leak_incidents",
  "refund_bonus_open_gate_failures",
] as const;

export const REFUND_BONUS_ACCOUNTING_METRIC_KEYS = [
  "grossCapturedCents",
  "feeCents",
  "netRecipientDisbursedCents",
  "actualGrossExposureCents",
  "countedCents",
  "matchEligibleCents",
  "sponsorBaseMatchCents",
  "bonusReserveBackedCents",
  "bonusExposureReservedCents",
  "bonusLiabilityCents",
  "bonusHeldCents",
  "bonusPaidCents",
  "bonusPayoutFeeCents",
  "bonusUnclaimedCents",
  "bonusUnearnedReleasedCents",
] as const;

export type RefundBonusProductMetricKey = typeof REFUND_BONUS_PRODUCT_METRIC_KEYS[number];
export type RefundBonusSafetyMetricKey = typeof REFUND_BONUS_SAFETY_METRIC_KEYS[number];
export type RefundBonusAccountingMetricKey = typeof REFUND_BONUS_ACCOUNTING_METRIC_KEYS[number];

export type RefundBonusComprehensionQuestionId =
  | "charge_timing"
  | "bonus_eligibility"
  | "bonus_characterization";

export interface RefundBonusComprehensionQuestion {
  id: RefundBonusComprehensionQuestionId;
  prompt: string;
  choices: Array<{
    id: "A" | "B" | "C";
    label: string;
  }>;
  correctChoiceId: "A" | "B" | "C";
  deliveryRequirement: "before_hard_pledge_or_immediately_after_save";
}

export const REFUND_BONUS_COMPREHENSION_QUESTIONS: RefundBonusComprehensionQuestion[] = [
  {
    id: "charge_timing",
    prompt: "When can you be charged?",
    choices: [
      { id: "A", label: "Immediately when I save my payment method." },
      { id: "B", label: "Only after the round closes and all listed success gates pass." },
      { id: "C", label: "Whenever the platform chooses." },
    ],
    correctChoiceId: "B",
    deliveryRequirement: "before_hard_pledge_or_immediately_after_save",
  },
  {
    id: "bonus_eligibility",
    prompt: "When can you receive the failure-participation bonus?",
    choices: [
      { id: "A", label: "Any time the pool fails for any reason." },
      {
        id: "B",
        label: "Only if I saved an eligible pledge and the pool fails for a bonus-eligible support-threshold reason.",
      },
      { id: "C", label: "Whenever I decide not to donate." },
    ],
    correctChoiceId: "B",
    deliveryRequirement: "before_hard_pledge_or_immediately_after_save",
  },
  {
    id: "bonus_characterization",
    prompt: "What is the failure-participation bonus?",
    choices: [
      { id: "A", label: "A donation receipt." },
      { id: "B", label: "Investment interest." },
      { id: "C", label: "A separate backed participation incentive, not project impact." },
    ],
    correctChoiceId: "C",
    deliveryRequirement: "before_hard_pledge_or_immediately_after_save",
  },
];

export const REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS = {
  stage0ChargeTimingCorrectMinBps: 8_500,
  stage0BonusEligibilityCorrectMinBps: 8_000,
  stage0BonusCharacterizationCorrectMinBps: 7_000,
  realMoneyChargeTimingIncorrectPauseBps: 500,
  realMoneyBonusEligibilityIncorrectPauseBps: 1_000,
} as const;

export interface RefundBonusComprehensionMetricInput {
  chargeTimingAnswered: number;
  chargeTimingIncorrect: number;
  bonusEligibilityAnswered: number;
  bonusEligibilityIncorrect: number;
  bonusCharacterizationAnswered: number;
  bonusCharacterizationIncorrect: number;
  realMoneyPilot?: boolean;
}

export interface RefundBonusComprehensionMetricResult {
  deliveryRequirement: RefundBonusComprehensionQuestion["deliveryRequirement"];
  chargeTimingIncorrectBps: number | null;
  bonusEligibilityIncorrectBps: number | null;
  bonusCharacterizationIncorrectBps: number | null;
  stage0Success: boolean;
  pauseRecommended: boolean;
  pauseReasonCodes: Array<
    | "charge_timing_incorrect_rate_above_5_percent"
    | "bonus_eligibility_incorrect_rate_above_10_percent"
    | "charge_timing_sample_missing"
    | "bonus_eligibility_sample_missing"
    | "bonus_characterization_sample_missing"
    | "invalid_comprehension_counts"
  >;
}

export type RefundBonusKillCriterion =
  | "public_route_claims_mvp_or_live"
  | "bonus_copy_financial_promotion"
  | "failure_bonus_displayed_without_backed_reserve_evidence"
  | "saved_payment_method_copy_overclaims_payment_state"
  | "pre_close_exact_gap_leak"
  | "review_blocked_pool_side_effect_state"
  | "disallowed_project_discovered"
  | "unresolved_blocking_conflict_discovered"
  | "payment_provider_hold_before_close"
  | "failed_authorization_rows_not_removed"
  | "capture_after_recompute_below_threshold"
  | "bonus_payout_to_ineligible_user"
  | "bonus_payout_for_nonqualifying_failure"
  | "bonus_exposure_exceeds_backed_reserve"
  | "charge_timing_incorrect_rate_above_5_percent"
  | "bonus_eligibility_incorrect_rate_above_10_percent"
  | "privacy_incident_exposes_donor_level_sensitive_data"
  | "control_cluster_issue_materially_affects_counting"
  | "potential_capture_exceeds_round_cap"
  | "potential_bonus_exposure_exceeds_round_cap"
  | "stale_active_current_product_label"
  | "copy_preflight_failed_after_hard_pledge_open"
  | "hard_pledge_possible_while_open_gate_not_passed"
  | "authorization_possible_in_disallowed_status"
  | "capture_possible_in_disallowed_status"
  | "bonus_payout_possible_in_disallowed_status";

export type RefundBonusPausePhase =
  | "after_hard_pledges_before_authorization_or_bonus_payout"
  | "after_authorization_before_capture"
  | "after_qualifying_failure_before_bonus_payout";

export type RefundBonusPauseRecoveryAction =
  | "keep_pledges_uncharged"
  | "publish_status_note"
  | "require_manual_review_before_resuming"
  | "release_or_cancel_authorizations_where_possible"
  | "do_not_capture_until_resolved"
  | "hold_bonus_liabilities"
  | "do_not_pay_bonus_until_resolved";

export interface RefundBonusKillCriteriaInput {
  publicRouteClaimsMvpOrLive?: boolean;
  bonusCopyFinancialPromotionFound?: boolean;
  failureBonusDisplayedWithoutBackedReserveEvidence?: boolean;
  savedPaymentMethodCopyOverclaimsPaymentState?: boolean;
  preCloseExactGapLeak?: boolean;
  reviewBlockedPoolSideEffectStatus?: RefundBonusRoundStatus;
  disallowedProjectDiscovered?: boolean;
  unresolvedBlockingConflictDiscovered?: boolean;
  paymentProviderHoldBeforeClose?: boolean;
  failedAuthorizationRowsRemovedBeforeRecompute?: boolean;
  capturedAfterRecomputeBelowThreshold?: boolean;
  bonusPayoutToIneligibleUser?: boolean;
  bonusPayoutForNonqualifyingFailure?: boolean;
  potentialBonusExposureCents?: number;
  backedReserveCents?: number;
  comprehensionMetrics?: RefundBonusComprehensionMetricResult;
  privacyIncidentExposesDonorLevelSensitiveData?: boolean;
  controlClusterIssueMateriallyAffectsCounting?: boolean;
  potentialCaptureCents?: number;
  roundGrossCaptureCapCents?: number;
  roundBonusExposureCapCents?: number;
  staleActiveCurrentProductLabel?: boolean;
  copyPreflightFailedAfterHardPledgeOpen?: boolean;
  hardPledgeCreationPossibleWhileOpenGateNotPassed?: boolean;
  authorizationPossibleInStatus?: RefundBonusRoundStatus;
  capturePossibleInStatus?: RefundBonusRoundStatus;
  bonusPayoutPossibleInStatus?: RefundBonusRoundStatus;
  pausePhase?: RefundBonusPausePhase;
}

export interface RefundBonusKillCriteriaResult {
  pauseRecommended: boolean;
  reasonCodes: RefundBonusKillCriterion[];
  requiredRecoveryActions: RefundBonusPauseRecoveryAction[];
}

export type RefundBonusExperimentStage =
  | "stage_0_fake_door"
  | "stage_1_internal_simulation"
  | "stage_2_closed_alpha"
  | "stage_3_limited_public_pilot";

export type RefundBonusExperimentBonusPayoutMode = "off" | "simulated" | "real";
export type RefundBonusExperimentCommitmentMode = "none" | "simulated" | "real";
export type RefundBonusExperimentParticipantCohort =
  | "none"
  | "fake_door"
  | "internal"
  | "test"
  | "invite_only"
  | "capped_public"
  | "public";

export const REFUND_BONUS_EXPERIMENT_STAGE_POLICIES = {
  stage_0_fake_door: {
    realMoney: "off",
    bonusPayouts: "off",
    userCommitments: "none",
    goal: "comprehension_and_willingness_to_pledge_measurement",
    chargeTimingCorrectMinBps: REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0ChargeTimingCorrectMinBps,
    bonusEligibilityCorrectMinBps: REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0BonusEligibilityCorrectMinBps,
    bonusCharacterizationCorrectMinBps:
      REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0BonusCharacterizationCorrectMinBps,
  },
  stage_1_internal_simulation: {
    realMoney: "off",
    simulatedPledge: "on",
    simulatedBonus: "on",
    participants: ["internal", "test"],
    requiredSampleCases: [
      "$0.50 pledge -> $1 simulated bonus",
      "$25 pledge -> 10% bonus capped at $2.50",
    ],
  },
  stage_2_closed_alpha: {
    realMoney: "optional_only_if_promoted_for_alpha",
    users: "invite_only_identity_verified",
    pledgeCapCents: { min: 500, max: 2_500 },
    bonusRatioBps: { min: 500, max: 1_000 },
    bonusCapCents: { min: 50, max: 250 },
    roundGrossCapCents: { min: 50_000, max: 250_000 },
    bonusExposureCapCents: { min: 5_000, max: 25_000 },
    highRatioRealMoneyRequiresGovernanceApproval: true,
  },
  stage_3_limited_public_pilot: {
    realMoney: "enabled_only_after_promotion_record",
    users: ["tightly_capped_public_entry", "invite_only"],
    pledgeCapCents: { min: 500, max: 5_000 },
    bonusRatioBps: { min: 500, max: 2_500 },
    bonusCapCents: { min: 50, max: 250 },
    roundGrossCapCents: { min: 100_000, max: 500_000 },
    bonusExposureCap: "explicitly_backed",
  },
} as const;

export type RefundBonusExperimentStageBlocker =
  | "stage0_real_money_must_be_off"
  | "stage0_bonus_payouts_must_be_off"
  | "stage0_commitments_must_be_none"
  | "stage0_public_mvp_route_confusion"
  | "stage1_real_money_must_be_off"
  | "stage1_requires_simulated_commitments"
  | "stage1_requires_simulated_bonus"
  | "stage1_requires_internal_or_test_users"
  | "stage1_required_sample_cases_missing"
  | "real_money_requires_promotion"
  | "real_bonus_payout_requires_real_money"
  | "stage2_requires_invite_only_users"
  | "stage2_requires_identity_verification"
  | "stage2_blocks_public_listing"
  | "stage2_pledge_cap_out_of_range"
  | "stage2_bonus_ratio_out_of_range"
  | "stage2_bonus_cap_out_of_range"
  | "stage2_round_gross_cap_out_of_range"
  | "stage2_bonus_exposure_cap_out_of_range"
  | "stage2_high_ratio_real_money_requires_governance"
  | "stage3_requires_promotion_record"
  | "stage3_requires_capped_public_or_invite_only_users"
  | "stage3_pledge_cap_out_of_range"
  | "stage3_bonus_ratio_out_of_range"
  | "stage3_bonus_cap_out_of_range"
  | "stage3_round_gross_cap_out_of_range"
  | "stage3_bonus_exposure_must_be_explicitly_backed";

export interface RefundBonusExperimentStageReadinessInput {
  stage: RefundBonusExperimentStage;
  realMoneyEnabled: boolean;
  promotionRecordApproved?: boolean;
  bonusPayoutMode: RefundBonusExperimentBonusPayoutMode;
  userCommitmentMode: RefundBonusExperimentCommitmentMode;
  participantCohort: RefundBonusExperimentParticipantCohort;
  identityVerifiedRequired?: boolean;
  publicListingEnabled?: boolean;
  participantMinGrossCents?: number;
  participantMaxGrossCents?: number;
  bonusRatioBps?: number;
  perUserBonusCapCents?: number;
  roundGrossCapCents?: number;
  roundBonusExposureCapCents?: number;
  bonusExposureExplicitlyBacked?: boolean;
  sampleCaseFiftyCentOneDollarCovered?: boolean;
  sampleCaseTwentyFiveDollarTenPercentCovered?: boolean;
  highRatioRealMoneyTestEnabled?: boolean;
  governanceHighRatioApproved?: boolean;
  publicMvpRouteConfusion?: boolean;
}

export interface RefundBonusExperimentStageReadinessResult {
  allowed: boolean;
  stage: RefundBonusExperimentStage;
  policy: typeof REFUND_BONUS_EXPERIMENT_STAGE_POLICIES[RefundBonusExperimentStage];
  blockerCodes: RefundBonusExperimentStageBlocker[];
}

export type RefundBonusExperimentPivotAction =
  | "test_tiered_thresholds_or_standing_public_goods_microfunds"
  | "lower_bonus_ratio_or_stop"
  | "stop_or_restrict_to_verified_members"
  | "return_to_direct_capped_cgpp"
  | "keep_simulation_only";

export interface RefundBonusExperimentPivotInput {
  freeRidingRemainsHigh?: boolean;
  usersAttractedPrimarilyByBonusProfit?: boolean;
  sybilControlsCostlyRelativeToBonusValue?: boolean;
  bonusComprehensionLow?: boolean;
  legalComplianceUncertain?: boolean;
}

export interface RefundBonusExperimentPivotResult {
  pivotRecommended: boolean;
  actions: RefundBonusExperimentPivotAction[];
}

export interface RefundBonusFeaturePromotionRecord {
  id: string;
  featureKey: typeof REFUND_BONUS_FEATURE_KEY;
  fromClassification: typeof REFUND_BONUS_FEATURE_CLASSIFICATION;
  toClassification: "limited_public" | "mvp_candidate" | "production";
  requestedBy: string;
  approvedByProduct?: string;
  approvedByPayments?: string;
  approvedByLegal?: string;
  approvedByTrustSafety?: string;
  approvedByGovernance?: string;
  approvalState: "draft" | "approved" | "rejected" | "revoked";
  approvedAt?: string;
  notes: string;
  promotionHash: string;
  createdAt: string;
  updatedAt: string;
}

export type RefundBonusHardPledgeBlocker =
  | "feature_non_mvp"
  | "feature_disabled"
  | "production_real_money_disabled"
  | "round_not_labs_open"
  | "pool_not_labs_open"
  | "open_gate_not_passed"
  | "copy_preflight_failed"
  | "draft_pledge_required"
  | "final_review_missing"
  | "fee_acknowledgement_missing"
  | "sealed_progress_acknowledgement_missing"
  | "bonus_terms_acknowledgement_missing"
  | "payment_saved_before_final_review"
  | "identity_snapshot_missing_or_failed"
  | "bonus_eligibility_snapshot_missing_or_failed"
  | "payment_method_not_confirmed"
  | "bonus_exposure_not_reserved"
  | "bonus_reserve_unbacked"
  | "gross_invalid"
  | "below_participant_min"
  | "above_participant_max"
  | "fixed_pledge_amount_mismatch"
  | "round_gross_cap_exceeded"
  | "round_bonus_exposure_cap_exceeded"
  | "pool_bonus_exposure_cap_exceeded"
  | "reserve_exposure_cap_exceeded"
  | "rulebook_hash_mismatch"
  | "fee_policy_hash_mismatch"
  | "bonus_policy_hash_mismatch"
  | "visibility_not_aggregate_only";

export interface RefundBonusHardPledgeGateInput {
  environment: RefundBonusEnvironment;
  featureEnabled?: boolean;
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  gate: RefundBonusOpenGate;
  reserve: RefundBonusReserve;
  pledge: RefundBonusPledge;
  currentGrossExposureCents: number;
  currentBonusExposureCents: number;
  visibility?: "aggregate_only" | "public_name" | "public_amount";
}

export interface RefundBonusHardPledgeGateResult {
  allowed: boolean;
  providerCallsAllowed: false;
  blockerCodes: RefundBonusHardPledgeBlocker[];
}

export interface RefundBonusHardPledgeSubmissionInput {
  environment: RefundBonusEnvironment;
  featureEnabled?: boolean;
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  gate: RefundBonusOpenGate;
  reserve: RefundBonusReserve;
  draftPledge: RefundBonusPledge;
  identitySnapshot: RefundBonusIdentityEligibilitySnapshot;
  bonusEligibilitySnapshot: RefundBonusBonusEligibilitySnapshot;
  paymentCommitmentSnapshot: RefundBonusPaymentCommitmentSnapshot;
  currentGrossExposureCents: number;
  currentBonusExposureCents: number;
}

export interface RefundBonusHardPledgeSubmissionResult {
  allowed: boolean;
  providerCallsAllowed: false;
  blockerCodes: RefundBonusHardPledgeBlocker[];
  pledge: RefundBonusPledge;
  reserve: RefundBonusReserve;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isCanonicalHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isTrimStableNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function isOrderedIsoTimestamp(left: string, right: string) {
  return left <= right;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function allocateProjectFundingCents(pool: RefundBonusPledgePool, totalCents: number) {
  const projectIds = pool.projectIds;
  const zeroAllocations = Object.fromEntries(projectIds.map((projectId) => [projectId, 0]));
  if (!isPositiveSafeInteger(totalCents)) return zeroAllocations;

  const weightedProjects = projectIds.map((projectId, index) => ({
    projectId,
    index,
    weightBps: Math.max(0, pool.allocationWeightsBpsByProjectId[projectId] ?? 0),
  }));
  const denominator = weightedProjects.reduce((sum, item) => sum + item.weightBps, 0);
  if (denominator <= 0) return zeroAllocations;

  const allocations = { ...zeroAllocations };
  const fractionalRows = weightedProjects.map((item) => {
    const weightedCents = totalCents * item.weightBps;
    const floorCents = Math.floor(weightedCents / denominator);
    allocations[item.projectId] = floorCents;

    return {
      ...item,
      remainder: weightedCents % denominator,
    };
  });
  let remainingCents = totalCents - Object.values(allocations).reduce((sum, cents) => sum + cents, 0);
  const remainderOrder = [...fractionalRows].sort((left, right) =>
    right.remainder - left.remainder || left.index - right.index
  );

  for (const row of remainderOrder) {
    if (remainingCents <= 0) break;
    allocations[row.projectId] += 1;
    remainingCents -= 1;
  }

  return allocations;
}

function incorrectRateBps(answered: number, incorrect: number) {
  if (answered <= 0) return null;
  return Math.round((incorrect * 10_000) / answered);
}

export function evaluateRefundBonusComprehensionMetrics({
  chargeTimingAnswered,
  chargeTimingIncorrect,
  bonusEligibilityAnswered,
  bonusEligibilityIncorrect,
  bonusCharacterizationAnswered,
  bonusCharacterizationIncorrect,
  realMoneyPilot = false,
}: RefundBonusComprehensionMetricInput): RefundBonusComprehensionMetricResult {
  const pauseReasonCodes: RefundBonusComprehensionMetricResult["pauseReasonCodes"] = [];
  const counts = [
    [chargeTimingAnswered, chargeTimingIncorrect],
    [bonusEligibilityAnswered, bonusEligibilityIncorrect],
    [bonusCharacterizationAnswered, bonusCharacterizationIncorrect],
  ];
  if (counts.some(([answered, incorrect]) =>
    !isNonNegativeSafeInteger(answered) ||
    !isNonNegativeSafeInteger(incorrect) ||
    incorrect > answered
  )) {
    pauseReasonCodes.push("invalid_comprehension_counts");
  }

  if (chargeTimingAnswered === 0) pauseReasonCodes.push("charge_timing_sample_missing");
  if (bonusEligibilityAnswered === 0) pauseReasonCodes.push("bonus_eligibility_sample_missing");
  if (bonusCharacterizationAnswered === 0) pauseReasonCodes.push("bonus_characterization_sample_missing");

  const chargeTimingIncorrectBps = incorrectRateBps(chargeTimingAnswered, chargeTimingIncorrect);
  const bonusEligibilityIncorrectBps = incorrectRateBps(bonusEligibilityAnswered, bonusEligibilityIncorrect);
  const bonusCharacterizationIncorrectBps = incorrectRateBps(
    bonusCharacterizationAnswered,
    bonusCharacterizationIncorrect,
  );

  if (
    realMoneyPilot &&
    chargeTimingIncorrectBps !== null &&
    chargeTimingIncorrectBps > REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.realMoneyChargeTimingIncorrectPauseBps
  ) {
    pauseReasonCodes.push("charge_timing_incorrect_rate_above_5_percent");
  }
  if (
    realMoneyPilot &&
    bonusEligibilityIncorrectBps !== null &&
    bonusEligibilityIncorrectBps > REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.realMoneyBonusEligibilityIncorrectPauseBps
  ) {
    pauseReasonCodes.push("bonus_eligibility_incorrect_rate_above_10_percent");
  }

  const stage0Success =
    chargeTimingIncorrectBps !== null &&
    bonusEligibilityIncorrectBps !== null &&
    bonusCharacterizationIncorrectBps !== null &&
    10_000 - chargeTimingIncorrectBps >=
      REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0ChargeTimingCorrectMinBps &&
    10_000 - bonusEligibilityIncorrectBps >=
      REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0BonusEligibilityCorrectMinBps &&
    10_000 - bonusCharacterizationIncorrectBps >=
      REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.stage0BonusCharacterizationCorrectMinBps;

  return {
    deliveryRequirement: "before_hard_pledge_or_immediately_after_save",
    chargeTimingIncorrectBps,
    bonusEligibilityIncorrectBps,
    bonusCharacterizationIncorrectBps,
    stage0Success,
    pauseRecommended: pauseReasonCodes.some((reason) =>
      reason === "charge_timing_incorrect_rate_above_5_percent" ||
      reason === "bonus_eligibility_incorrect_rate_above_10_percent" ||
      reason === "invalid_comprehension_counts"
    ),
    pauseReasonCodes: unique(pauseReasonCodes),
  };
}

export function evaluateRefundBonusKillCriteria(input: RefundBonusKillCriteriaInput): RefundBonusKillCriteriaResult {
  const reasonCodes: RefundBonusKillCriterion[] = [];
  const add = (condition: boolean | undefined, reason: RefundBonusKillCriterion) => {
    if (condition) reasonCodes.push(reason);
  };

  add(input.publicRouteClaimsMvpOrLive, "public_route_claims_mvp_or_live");
  add(input.bonusCopyFinancialPromotionFound, "bonus_copy_financial_promotion");
  add(
    input.failureBonusDisplayedWithoutBackedReserveEvidence,
    "failure_bonus_displayed_without_backed_reserve_evidence",
  );
  add(input.savedPaymentMethodCopyOverclaimsPaymentState, "saved_payment_method_copy_overclaims_payment_state");
  add(input.preCloseExactGapLeak, "pre_close_exact_gap_leak");
  add(
    input.reviewBlockedPoolSideEffectStatus === "open" ||
      input.reviewBlockedPoolSideEffectStatus === "authorizing" ||
      input.reviewBlockedPoolSideEffectStatus === "payable" ||
      input.reviewBlockedPoolSideEffectStatus === "bonus_payable" ||
      input.reviewBlockedPoolSideEffectStatus === "captured" ||
      input.reviewBlockedPoolSideEffectStatus === "bonus_paid",
    "review_blocked_pool_side_effect_state",
  );
  add(input.disallowedProjectDiscovered, "disallowed_project_discovered");
  add(input.unresolvedBlockingConflictDiscovered, "unresolved_blocking_conflict_discovered");
  add(input.paymentProviderHoldBeforeClose, "payment_provider_hold_before_close");
  add(input.failedAuthorizationRowsRemovedBeforeRecompute === false, "failed_authorization_rows_not_removed");
  add(input.capturedAfterRecomputeBelowThreshold, "capture_after_recompute_below_threshold");
  add(input.bonusPayoutToIneligibleUser, "bonus_payout_to_ineligible_user");
  add(input.bonusPayoutForNonqualifyingFailure, "bonus_payout_for_nonqualifying_failure");
  add(
    isNonNegativeSafeInteger(input.potentialBonusExposureCents) &&
      isNonNegativeSafeInteger(input.backedReserveCents) &&
      input.potentialBonusExposureCents > input.backedReserveCents,
    "bonus_exposure_exceeds_backed_reserve",
  );
  add(
    input.comprehensionMetrics?.pauseReasonCodes.includes("charge_timing_incorrect_rate_above_5_percent"),
    "charge_timing_incorrect_rate_above_5_percent",
  );
  add(
    input.comprehensionMetrics?.pauseReasonCodes.includes("bonus_eligibility_incorrect_rate_above_10_percent"),
    "bonus_eligibility_incorrect_rate_above_10_percent",
  );
  add(
    input.privacyIncidentExposesDonorLevelSensitiveData,
    "privacy_incident_exposes_donor_level_sensitive_data",
  );
  add(input.controlClusterIssueMateriallyAffectsCounting, "control_cluster_issue_materially_affects_counting");
  add(
    isNonNegativeSafeInteger(input.potentialCaptureCents) &&
      isNonNegativeSafeInteger(input.roundGrossCaptureCapCents) &&
      input.potentialCaptureCents > input.roundGrossCaptureCapCents,
    "potential_capture_exceeds_round_cap",
  );
  add(
    isNonNegativeSafeInteger(input.potentialBonusExposureCents) &&
      isNonNegativeSafeInteger(input.roundBonusExposureCapCents) &&
      input.potentialBonusExposureCents > input.roundBonusExposureCapCents,
    "potential_bonus_exposure_exceeds_round_cap",
  );
  add(input.staleActiveCurrentProductLabel, "stale_active_current_product_label");
  add(input.copyPreflightFailedAfterHardPledgeOpen, "copy_preflight_failed_after_hard_pledge_open");
  add(
    input.hardPledgeCreationPossibleWhileOpenGateNotPassed,
    "hard_pledge_possible_while_open_gate_not_passed",
  );
  add(
    input.authorizationPossibleInStatus !== undefined &&
      !canRefundBonusAuthorizeSuccessCharge(input.authorizationPossibleInStatus),
    "authorization_possible_in_disallowed_status",
  );
  add(
    input.capturePossibleInStatus !== undefined &&
      !canRefundBonusCaptureSuccessCharge(input.capturePossibleInStatus),
    "capture_possible_in_disallowed_status",
  );
  add(
    input.bonusPayoutPossibleInStatus !== undefined &&
      input.bonusPayoutPossibleInStatus !== "bonus_payable" &&
      input.bonusPayoutPossibleInStatus !== "bonus_paying",
    "bonus_payout_possible_in_disallowed_status",
  );

  const uniqueReasons = unique(reasonCodes);
  const requiredRecoveryActions: RefundBonusPauseRecoveryAction[] = [];
  if (uniqueReasons.length > 0) {
    if (input.pausePhase === "after_hard_pledges_before_authorization_or_bonus_payout") {
      requiredRecoveryActions.push(
        "keep_pledges_uncharged",
        "publish_status_note",
        "require_manual_review_before_resuming",
      );
    }
    if (input.pausePhase === "after_authorization_before_capture") {
      requiredRecoveryActions.push("release_or_cancel_authorizations_where_possible", "do_not_capture_until_resolved");
    }
    if (input.pausePhase === "after_qualifying_failure_before_bonus_payout") {
      requiredRecoveryActions.push("hold_bonus_liabilities", "do_not_pay_bonus_until_resolved");
    }
  }

  return {
    pauseRecommended: uniqueReasons.length > 0,
    reasonCodes: uniqueReasons,
    requiredRecoveryActions: unique(requiredRecoveryActions),
  };
}

function centsInRange(value: number | undefined, min: number, max: number) {
  return isPositiveSafeInteger(value) && value >= min && value <= max;
}

function bpsInRange(value: number | undefined, min: number, max: number) {
  return isPositiveSafeInteger(value) && value >= min && value <= max;
}

export function evaluateRefundBonusExperimentStageReadiness(
  input: RefundBonusExperimentStageReadinessInput,
): RefundBonusExperimentStageReadinessResult {
  const blockerCodes: RefundBonusExperimentStageBlocker[] = [];
  const add = (condition: boolean, blocker: RefundBonusExperimentStageBlocker) => {
    if (condition) blockerCodes.push(blocker);
  };

  const realBonusPayout = input.bonusPayoutMode === "real";
  if ((input.realMoneyEnabled || realBonusPayout) && !input.promotionRecordApproved) {
    blockerCodes.push("real_money_requires_promotion");
  }
  add(realBonusPayout && !input.realMoneyEnabled, "real_bonus_payout_requires_real_money");

  if (input.stage === "stage_0_fake_door") {
    add(input.realMoneyEnabled, "stage0_real_money_must_be_off");
    add(input.bonusPayoutMode !== "off", "stage0_bonus_payouts_must_be_off");
    add(input.userCommitmentMode !== "none", "stage0_commitments_must_be_none");
    add(Boolean(input.publicMvpRouteConfusion), "stage0_public_mvp_route_confusion");
  }

  if (input.stage === "stage_1_internal_simulation") {
    add(input.realMoneyEnabled, "stage1_real_money_must_be_off");
    add(input.userCommitmentMode !== "simulated", "stage1_requires_simulated_commitments");
    add(input.bonusPayoutMode !== "simulated", "stage1_requires_simulated_bonus");
    add(
      input.participantCohort !== "internal" && input.participantCohort !== "test",
      "stage1_requires_internal_or_test_users",
    );
    add(
      !input.sampleCaseFiftyCentOneDollarCovered || !input.sampleCaseTwentyFiveDollarTenPercentCovered,
      "stage1_required_sample_cases_missing",
    );
  }

  if (input.stage === "stage_2_closed_alpha") {
    add(input.participantCohort !== "invite_only", "stage2_requires_invite_only_users");
    add(!input.identityVerifiedRequired, "stage2_requires_identity_verification");
    add(Boolean(input.publicListingEnabled), "stage2_blocks_public_listing");
    add(
      !centsInRange(input.participantMinGrossCents, 500, 2_500) ||
        !centsInRange(input.participantMaxGrossCents, 500, 2_500) ||
        (input.participantMinGrossCents ?? 0) > (input.participantMaxGrossCents ?? 0),
      "stage2_pledge_cap_out_of_range",
    );
    add(!bpsInRange(input.bonusRatioBps, 500, 1_000), "stage2_bonus_ratio_out_of_range");
    add(!centsInRange(input.perUserBonusCapCents, 50, 250), "stage2_bonus_cap_out_of_range");
    add(!centsInRange(input.roundGrossCapCents, 50_000, 250_000), "stage2_round_gross_cap_out_of_range");
    add(
      !centsInRange(input.roundBonusExposureCapCents, 5_000, 25_000),
      "stage2_bonus_exposure_cap_out_of_range",
    );
    add(
      Boolean(input.realMoneyEnabled && input.highRatioRealMoneyTestEnabled && !input.governanceHighRatioApproved),
      "stage2_high_ratio_real_money_requires_governance",
    );
  }

  if (input.stage === "stage_3_limited_public_pilot") {
    add(!input.promotionRecordApproved, "stage3_requires_promotion_record");
    add(
      input.participantCohort !== "capped_public" && input.participantCohort !== "invite_only",
      "stage3_requires_capped_public_or_invite_only_users",
    );
    add(
      !centsInRange(input.participantMinGrossCents, 500, 5_000) ||
        !centsInRange(input.participantMaxGrossCents, 500, 5_000) ||
        (input.participantMinGrossCents ?? 0) > (input.participantMaxGrossCents ?? 0),
      "stage3_pledge_cap_out_of_range",
    );
    add(!bpsInRange(input.bonusRatioBps, 500, 2_500), "stage3_bonus_ratio_out_of_range");
    add(!centsInRange(input.perUserBonusCapCents, 50, 250), "stage3_bonus_cap_out_of_range");
    add(!centsInRange(input.roundGrossCapCents, 100_000, 500_000), "stage3_round_gross_cap_out_of_range");
    add(!input.bonusExposureExplicitlyBacked, "stage3_bonus_exposure_must_be_explicitly_backed");
  }

  return {
    allowed: blockerCodes.length === 0,
    stage: input.stage,
    policy: REFUND_BONUS_EXPERIMENT_STAGE_POLICIES[input.stage],
    blockerCodes: unique(blockerCodes),
  };
}

export function evaluateRefundBonusExperimentPivotCriteria(
  input: RefundBonusExperimentPivotInput,
): RefundBonusExperimentPivotResult {
  const actions: RefundBonusExperimentPivotAction[] = [];
  if (input.freeRidingRemainsHigh) {
    actions.push("test_tiered_thresholds_or_standing_public_goods_microfunds");
  }
  if (input.usersAttractedPrimarilyByBonusProfit) {
    actions.push("lower_bonus_ratio_or_stop");
  }
  if (input.sybilControlsCostlyRelativeToBonusValue) {
    actions.push("stop_or_restrict_to_verified_members");
  }
  if (input.bonusComprehensionLow) {
    actions.push("return_to_direct_capped_cgpp");
  }
  if (input.legalComplianceUncertain) {
    actions.push("keep_simulation_only");
  }

  return {
    pivotRecommended: actions.length > 0,
    actions: unique(actions),
  };
}

function roleCanUseLabs(role: RefundBonusActorRole) {
  return role === "labs_participant" || role === "admin" || role === "service";
}

function uniqueHardPledgeBlockers(blockers: RefundBonusHardPledgeBlocker[]) {
  return [...new Set(blockers)];
}

export function isRefundBonusProjectReviewSnapshotPledgeable(snapshot: RefundBonusProjectReviewSnapshot) {
  return (
    snapshot.recipientRouteState === "verified" &&
    snapshot.projectScopeState === "valid_moral_public_good" &&
    snapshot.baselineState === "clear" &&
    snapshot.actionEvidenceState === "adequate" &&
    snapshot.antiThreatState === "clear" &&
    snapshot.externalityState === "clear" &&
    (snapshot.conflictState === "clear" || snapshot.conflictState === "non_blocking") &&
    (snapshot.challengeState === "clear" || snapshot.challengeState === "non_blocking") &&
    snapshot.qualifyingFailureBonusAllowed &&
    snapshot.blockedFailureBonusAllowed === false &&
    snapshot.prohibitsPoliticalCampaigns &&
    snapshot.prohibitsCampaignDonations &&
    snapshot.prohibitsLobbyingTrades &&
    snapshot.prohibitsLifestyleTrades &&
    snapshot.prohibitsBehaviorChangePromises &&
    snapshot.prohibitsPrivateBenefitProjects &&
    snapshot.prohibitsPayToStopHarmProposals &&
    snapshot.prohibitsThreatLikeProjects &&
    snapshot.prohibitsCoerciveProposals &&
    snapshot.prohibitsExtortionaryProposals &&
    isCanonicalHash(snapshot.reviewSnapshotHash)
  );
}

export function isRefundBonusIdentityEligibilitySnapshotEligible(
  snapshot: RefundBonusIdentityEligibilitySnapshot,
) {
  return (
    snapshot.humanVerified &&
    snapshot.identityVerified &&
    snapshot.sybilState === "clear" &&
    snapshot.collusionState === "clear" &&
    (snapshot.countingWeightBps === 0 || snapshot.countingWeightBps === 10_000) &&
    (snapshot.bonusEligibilityWeightBps === 0 || snapshot.bonusEligibilityWeightBps === 10_000) &&
    snapshot.countingWeightBps === 10_000 &&
    snapshot.bonusEligibilityWeightBps === 10_000 &&
    isCanonicalHash(snapshot.snapshotHash)
  );
}

export function isRefundBonusBonusEligibilitySnapshotEligible(
  snapshot: RefundBonusBonusEligibilitySnapshot,
) {
  return (
    snapshot.eligibleAtPledgeSave &&
    snapshot.eligibilityReasonCodes.length === 0 &&
    snapshot.humanVerified &&
    snapshot.identityVerified &&
    snapshot.sybilState === "clear" &&
    snapshot.collusionState === "clear" &&
    snapshot.priorBonusAbuseState === "clear" &&
    snapshot.jurisdictionEligibilityState === "clear" &&
    isNonNegativeSafeInteger(snapshot.computedBonusCents) &&
    snapshot.computedBonusCents <= snapshot.perUserBonusCapCents &&
    isCanonicalHash(snapshot.snapshotHash)
  );
}

export function isRefundBonusPaymentCommitmentSnapshotCountable(
  snapshot: RefundBonusPaymentCommitmentSnapshot,
  round: Pick<RefundBonusRound, "id" | "closesAt">,
) {
  return (
    snapshot.roundId === round.id &&
    snapshot.commitmentState === "provider_confirmed" &&
    isTrimStableNonEmpty(snapshot.paymentMethodRef) &&
    snapshot.supportsFutureAuthorization &&
    isOrderedIsoTimestamp(snapshot.savedAt, snapshot.confirmedAt) &&
    isOrderedIsoTimestamp(snapshot.confirmedAt, snapshot.asOf) &&
    isOrderedIsoTimestamp(snapshot.asOf, round.closesAt) &&
    isCanonicalHash(snapshot.providerEvidenceHash) &&
    isCanonicalHash(snapshot.snapshotHash)
  );
}

export function prepareRefundBonusHardPledgeSubmission({
  environment,
  featureEnabled,
  round,
  pool,
  gate,
  reserve,
  draftPledge,
  identitySnapshot,
  bonusEligibilitySnapshot,
  paymentCommitmentSnapshot,
  currentGrossExposureCents,
  currentBonusExposureCents,
}: RefundBonusHardPledgeSubmissionInput): RefundBonusHardPledgeSubmissionResult {
  const identitySnapshotValid =
    identitySnapshot.roundId === round.id &&
    identitySnapshot.participantId === draftPledge.participantId &&
    isRefundBonusIdentityEligibilitySnapshotEligible(identitySnapshot);
  const bonusSnapshotValid =
    bonusEligibilitySnapshot.roundId === round.id &&
    bonusEligibilitySnapshot.poolId === pool.id &&
    bonusEligibilitySnapshot.pledgeId === draftPledge.id &&
    bonusEligibilitySnapshot.participantId === draftPledge.participantId &&
    bonusEligibilitySnapshot.reserveId === reserve.id &&
    bonusEligibilitySnapshot.bonusCalculationMode === pool.bonusCalculationMode &&
    bonusEligibilitySnapshot.reserveBackingStateAtSave === reserve.backingState &&
    bonusEligibilitySnapshot.computedBonusCents === computeRefundBonusCents({
      mode: pool.bonusCalculationMode,
      maxGrossCents: draftPledge.maxGrossCents,
      fixedBonusCents: pool.fixedBonusCents,
      bonusRatioBps: pool.bonusRatioBps,
      perUserBonusCapCents: pool.perUserBonusCapCents,
    }) &&
    isRefundBonusBonusEligibilitySnapshotEligible(bonusEligibilitySnapshot);
  const paymentSnapshotValid =
    paymentCommitmentSnapshot.roundId === round.id &&
    paymentCommitmentSnapshot.poolId === pool.id &&
    paymentCommitmentSnapshot.pledgeId === draftPledge.id &&
    paymentCommitmentSnapshot.participantId === draftPledge.participantId &&
    isRefundBonusPaymentCommitmentSnapshotCountable(paymentCommitmentSnapshot, round);
  const submissionBlockerCodes: RefundBonusHardPledgeBlocker[] = [];

  if (draftPledge.pledgeState !== "draft") {
    submissionBlockerCodes.push("draft_pledge_required");
  }
  if (
    draftPledge.finalReviewConfirmedAt &&
    !isOrderedIsoTimestamp(draftPledge.finalReviewConfirmedAt, paymentCommitmentSnapshot.savedAt)
  ) {
    submissionBlockerCodes.push("payment_saved_before_final_review");
  }

  const candidatePledge: RefundBonusPledge = {
    ...draftPledge,
    pledgeState: "hard_saved",
    paymentCommitmentSnapshotId: paymentSnapshotValid ? paymentCommitmentSnapshot.id : undefined,
    identityEligibilitySnapshotId: identitySnapshotValid ? identitySnapshot.id : undefined,
    bonusEligibilitySnapshotId: bonusSnapshotValid ? bonusEligibilitySnapshot.id : undefined,
    expectedBonusCents: bonusSnapshotValid ? bonusEligibilitySnapshot.computedBonusCents : 0,
    providerPaymentMethodConfirmed: paymentSnapshotValid,
    humanVerified: identitySnapshotValid && identitySnapshot.humanVerified,
    identityVerified: identitySnapshotValid && identitySnapshot.identityVerified,
    sybilState: identitySnapshotValid ? identitySnapshot.sybilState : "blocked",
    collusionState: identitySnapshotValid ? identitySnapshot.collusionState : "blocked",
    sameControlClusterId: identitySnapshotValid ? identitySnapshot.sameControlClusterId : draftPledge.sameControlClusterId,
    paymentClusterId: bonusSnapshotValid ? bonusEligibilitySnapshot.paymentClusterId : draftPledge.paymentClusterId,
    bonusPayoutMethodRef:
      paymentSnapshotValid &&
      paymentCommitmentSnapshot.supportsBonusPayoutMethod &&
      isTrimStableNonEmpty(paymentCommitmentSnapshot.bonusPayoutMethodRef)
        ? paymentCommitmentSnapshot.bonusPayoutMethodRef
        : undefined,
    priorBonusAbuseState: bonusSnapshotValid ? bonusEligibilitySnapshot.priorBonusAbuseState : "blocked",
    jurisdictionEligibilityState: bonusSnapshotValid ? bonusEligibilitySnapshot.jurisdictionEligibilityState : "blocked",
    bonusEligibilityWeightBps: bonusSnapshotValid ? 10_000 : 0,
    countingWeightBps: identitySnapshotValid ? identitySnapshot.countingWeightBps : 0,
    bonusExposureReservedCents: bonusSnapshotValid ? bonusEligibilitySnapshot.computedBonusCents : 0,
    updatedAt: paymentCommitmentSnapshot.asOf,
  };
  const gateResult = evaluateRefundBonusHardPledgeGate({
    environment,
    featureEnabled,
    round,
    pool,
    gate,
    reserve,
    pledge: candidatePledge,
    currentGrossExposureCents,
    currentBonusExposureCents,
  });
  const submissionResult: RefundBonusHardPledgeGateResult = {
    ...gateResult,
    allowed: gateResult.allowed && submissionBlockerCodes.length === 0,
    blockerCodes: uniqueHardPledgeBlockers([...submissionBlockerCodes, ...gateResult.blockerCodes]),
  };

  if (submissionResult.allowed) {
    return {
      ...submissionResult,
      pledge: candidatePledge,
      reserve: {
        ...reserve,
        committedCents: reserve.committedCents + candidatePledge.bonusExposureReservedCents,
        committedExposureCents: reserve.committedExposureCents + candidatePledge.bonusExposureReservedCents,
        updatedAt: paymentCommitmentSnapshot.asOf,
      },
    };
  }

  return {
    ...submissionResult,
    pledge: {
      ...draftPledge,
      pledgeState: "draft",
      paymentCommitmentSnapshotId: undefined,
      identityEligibilitySnapshotId: undefined,
      bonusEligibilitySnapshotId: undefined,
      providerPaymentMethodConfirmed: false,
      bonusExposureReservedCents: 0,
      expectedBonusCents: 0,
      updatedAt: paymentCommitmentSnapshot.asOf,
    },
    reserve,
  };
}

export function isRefundBonusFeaturePromotionApproved(record: RefundBonusFeaturePromotionRecord) {
  return (
    record.featureKey === REFUND_BONUS_FEATURE_KEY &&
    record.fromClassification === REFUND_BONUS_FEATURE_CLASSIFICATION &&
    record.approvalState === "approved" &&
    Boolean(record.approvedAt) &&
    Boolean(record.approvedByProduct) &&
    Boolean(record.approvedByPayments) &&
    Boolean(record.approvedByLegal) &&
    Boolean(record.approvedByTrustSafety) &&
    Boolean(record.approvedByGovernance) &&
    isCanonicalHash(record.promotionHash)
  );
}

export function evaluateRefundBonusCapability(input: RefundBonusCapabilityInput): RefundBonusCapabilityResult {
  const reasons: RefundBonusCapabilityReason[] = ["feature_non_mvp"];

  if (!input.featureEnabled) {
    reasons.push("feature_disabled");
  }
  if (input.action === "view_public_mvp_card") {
    reasons.push("public_surface_disabled");
  }
  if (!roleCanUseLabs(input.actorRole)) {
    reasons.push("insufficient_role");
  }
  if (input.emergencyPaused && input.action !== "view_labs_pool") {
    reasons.push("emergency_pause_active");
  }

  const sideEffect =
    input.action === "create_hard_pledge" ||
    input.action === "save_payment_method" ||
    input.action === "authorize_success_charge" ||
    input.action === "capture_success_charge" ||
    input.action === "plan_bonus_payout" ||
    input.action === "execute_bonus_payout";

  if (sideEffect && !input.openGatePassed) {
    reasons.push("open_gate_not_passed");
  }

  const productionRealMoneyAction = input.action !== "view_labs_pool" && input.environment === "production";
  if (productionRealMoneyAction) {
    if (!input.liveMoneyEnabled) {
      reasons.push("production_real_money_disabled");
    }
    if (!input.promotionRecordApproved) {
      reasons.push("missing_promotion_record");
    }
    if (!input.copyPreflightPassed) {
      reasons.push("copy_preflight_failed");
    }
    if (input.copyPreflightFresh !== true) {
      reasons.push("copy_preflight_stale");
    }
    if (!input.identitySybilControlsReady) {
      reasons.push("identity_sybil_controls_not_ready");
    }
    if (!input.bonusExposureCapConfigured) {
      reasons.push("bonus_exposure_cap_not_configured");
    }
    if (!input.emergencyPauseConfigured) {
      reasons.push("emergency_pause_not_configured");
    }
    if (!input.auditReportingTemplatesReviewed) {
      reasons.push("audit_reporting_templates_not_reviewed");
    }
    if (!input.staleActiveLabelsAbsent) {
      reasons.push("stale_active_labels_present");
    }
  }

  if (sideEffect) {
    if (!input.bonusReserveBacked) {
      reasons.push("bonus_reserve_unbacked");
    }
    if (!input.legalComplianceApproved) {
      reasons.push("legal_compliance_not_approved");
    }
    if (!input.paymentProviderReady) {
      reasons.push("payment_provider_not_ready");
    }
    if (!input.bonusPayoutProviderReady) {
      reasons.push("bonus_payout_provider_not_ready");
    }
  }

  const hardReasons = unique(reasons).filter((reason) => reason !== "feature_non_mvp");

  return {
    allowed: hardReasons.length === 0,
    reasons: unique(reasons),
    featureKey: REFUND_BONUS_FEATURE_KEY,
    liveMoneyFlag: REFUND_BONUS_LIVE_MONEY_FLAG,
    featureClassification: REFUND_BONUS_FEATURE_CLASSIFICATION,
    deploymentMode: REFUND_BONUS_DEPLOYMENT_MODE,
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
  };
}

export function evaluateRefundBonusOpenGate(input: RefundBonusOpenGateInput): RefundBonusOpenGate {
  const checks: Array<[string, boolean]> = [
    ["copy_preflight_failed", input.routeCopyPreflightPassed],
    ["project_review_not_ready", input.projectReviewReady],
    ["bonus_reserve_not_ready", input.bonusReserveReady],
    ["bonus_policy_not_frozen", input.bonusPolicyFrozen],
    ["sponsor_state_not_ready", input.sponsorStateReady],
    ["caps_not_ready", input.capsReady],
    ["payment_provider_not_ready", input.paymentProviderReady],
    ["bonus_payout_provider_not_ready", input.bonusPayoutProviderReady],
    ["identity_sybil_controls_not_ready", input.identitySybilControlsReady],
    ["legal_compliance_not_ready", input.legalComplianceReady],
    ["rulebook_not_frozen", input.rulebookFrozen],
    ["fee_policy_not_frozen", input.feePolicyFrozen],
    ["sealed_progress_not_configured", input.sealedProgressConfigured],
    ["emergency_pause_not_configured", input.emergencyPauseConfigured],
    ["promotion_record_missing", input.promotionRecordReady],
    ["stale_active_labels_present", input.staleActiveLabelsAbsent],
  ];
  const failedReasonCodes = checks.filter(([, passed]) => !passed).map(([reason]) => reason);

  return {
    id: input.id,
    roundId: input.roundId,
    poolId: input.poolId,
    checkedAt: input.checkedAt,
    lastDeployHash: input.lastDeployHash,
    routeCopyPreflightReportId: hashValue(["copy-preflight", input.roundId, input.lastDeployHash]),
    projectReviewReady: input.projectReviewReady,
    bonusReserveReady: input.bonusReserveReady,
    bonusPolicyFrozen: input.bonusPolicyFrozen,
    sponsorStateReady: input.sponsorStateReady,
    capsReady: input.capsReady,
    paymentProviderReady: input.paymentProviderReady,
    bonusPayoutProviderReady: input.bonusPayoutProviderReady,
    identitySybilControlsReady: input.identitySybilControlsReady,
    legalComplianceReady: input.legalComplianceReady,
    rulebookFrozen: input.rulebookFrozen,
    feePolicyFrozen: input.feePolicyFrozen,
    sealedProgressConfigured: input.sealedProgressConfigured,
    emergencyPauseConfigured: input.emergencyPauseConfigured,
    promotionRecordReady: input.promotionRecordReady,
    state: failedReasonCodes.length === 0 ? "passed" : "failed",
    failedReasonCodes,
    gateHash: hashValue({ ...input, failedReasonCodes }),
  };
}

export function computeRefundBonusCents({
  mode,
  maxGrossCents,
  fixedBonusCents,
  bonusRatioBps,
  perUserBonusCapCents,
}: {
  mode: RefundBonusPledgePool["bonusCalculationMode"];
  maxGrossCents: number;
  fixedBonusCents?: number;
  bonusRatioBps?: number;
  perUserBonusCapCents: number;
}) {
  if (mode === "none") {
    return 0;
  }
  if (!isPositiveSafeInteger(perUserBonusCapCents)) {
    return 0;
  }
  if (mode === "fixed_cents") {
    return Math.min(fixedBonusCents ?? 0, perUserBonusCapCents);
  }
  if (!isPositiveSafeInteger(maxGrossCents) || !isNonNegativeSafeInteger(bonusRatioBps)) {
    return 0;
  }
  return Math.min(Math.floor(maxGrossCents * (bonusRatioBps ?? 0) / 10_000), perUserBonusCapCents);
}

export function isRefundBonusReserveBacked(
  reserve: RefundBonusReserve,
  round: RefundBonusRound,
  pool: RefundBonusPledgePool,
) {
  const devSimulationReserve = reserve.backingState === "dev_simulated";

  return (
    pool.refundBonusEnabled &&
    reserve.roundId === round.id &&
    reserve.poolId === pool.id &&
    pool.refundBonusReserveId === reserve.id &&
    reserve.reserveType === "failure_participation_bonus" &&
    (reserve.backingState === "funded" ||
      reserve.backingState === "escrowed" ||
      reserve.backingState === "contractually_committed" ||
      reserve.backingState === "dev_simulated") &&
    reserve.backedCents >= reserve.maxExposureCents &&
    isNonNegativeSafeInteger(reserve.committedCents) &&
    reserve.committedCents <= reserve.maxExposureCents &&
    reserve.maxExposureCents >= pool.roundBonusExposureCapCents &&
    reserve.maxExposureCents >= round.roundBonusExposureCapCents &&
    reserve.bonusPolicyHash === round.bonusPolicyHash &&
    isOrderedIsoTimestamp(reserve.publishedAt, round.parametersFrozenAt) &&
    isOrderedIsoTimestamp(reserve.backingConfirmedAt, round.parametersFrozenAt) &&
    /^sha256:[a-f0-9]{64}$/.test(reserve.sourceHash) &&
    Array.isArray(reserve.jurisdictionSet) &&
    reserve.jurisdictionSet.length > 0 &&
    reserve.jurisdictionSet.every(isTrimStableNonEmpty) &&
    (devSimulationReserve || reserve.legalComplianceState === "approved") &&
    (devSimulationReserve || reserve.payoutProviderReady)
  );
}

export function evaluateRefundBonusHardPledgeGate({
  environment,
  featureEnabled,
  round,
  pool,
  gate,
  reserve,
  pledge,
  currentGrossExposureCents,
  currentBonusExposureCents,
  visibility = "aggregate_only",
}: RefundBonusHardPledgeGateInput): RefundBonusHardPledgeGateResult {
  const blockerCodes: RefundBonusHardPledgeBlocker[] = ["feature_non_mvp"];
  const reserveBacked = isRefundBonusReserveBacked(reserve, round, pool);
  const nextGrossExposureCents = currentGrossExposureCents + pledge.maxGrossCents;
  const nextBonusExposureCents = currentBonusExposureCents + pledge.bonusExposureReservedCents;

  if (!featureEnabled) {
    blockerCodes.push("feature_disabled");
  }
  if (environment === "production") {
    blockerCodes.push("production_real_money_disabled");
  }
  if (round.status !== "labs_open") {
    blockerCodes.push("round_not_labs_open");
  }
  if (pool.status !== "labs_open") {
    blockerCodes.push("pool_not_labs_open");
  }
  if (gate.state !== "passed") {
    blockerCodes.push("open_gate_not_passed");
  }
  if (round.copyPreflightState !== "passed") {
    blockerCodes.push("copy_preflight_failed");
  }
  if (!pledge.finalReviewConfirmedAt) {
    blockerCodes.push("final_review_missing");
  }
  if (!pledge.feeAcknowledged) {
    blockerCodes.push("fee_acknowledgement_missing");
  }
  if (!pledge.sealedProgressAcknowledged) {
    blockerCodes.push("sealed_progress_acknowledgement_missing");
  }
  if (!pledge.bonusTermsAcknowledged) {
    blockerCodes.push("bonus_terms_acknowledgement_missing");
  }
  if (
    !pledge.humanVerified ||
    !pledge.identityVerified ||
    pledge.sybilState !== "clear" ||
    pledge.collusionState !== "clear" ||
    pledge.countingWeightBps !== 10_000
  ) {
    blockerCodes.push("identity_snapshot_missing_or_failed");
  }
  if (
    pledge.priorBonusAbuseState !== "clear" ||
    pledge.jurisdictionEligibilityState !== "clear" ||
    pledge.bonusEligibilityWeightBps !== 10_000
  ) {
    blockerCodes.push("bonus_eligibility_snapshot_missing_or_failed");
  }
  if (!pledge.providerPaymentMethodConfirmed) {
    blockerCodes.push("payment_method_not_confirmed");
  }
  if (!isPositiveSafeInteger(pledge.bonusExposureReservedCents)) {
    blockerCodes.push("bonus_exposure_not_reserved");
  }
  if (!reserveBacked) {
    blockerCodes.push("bonus_reserve_unbacked");
  }
  if (!isPositiveSafeInteger(pledge.maxGrossCents)) {
    blockerCodes.push("gross_invalid");
  }
  if (pledge.maxGrossCents < round.participantMinGrossCents) {
    blockerCodes.push("below_participant_min");
  }
  if (pledge.maxGrossCents > round.participantMaxGrossCents) {
    blockerCodes.push("above_participant_max");
  }
  if (round.fixedPledgeGrossCents != null && pledge.maxGrossCents !== round.fixedPledgeGrossCents) {
    blockerCodes.push("fixed_pledge_amount_mismatch");
  }
  if (!isNonNegativeSafeInteger(currentGrossExposureCents) || nextGrossExposureCents > round.roundGrossCaptureCapCents) {
    blockerCodes.push("round_gross_cap_exceeded");
  }
  if (
    !isNonNegativeSafeInteger(currentBonusExposureCents) ||
    nextBonusExposureCents > round.roundBonusExposureCapCents
  ) {
    blockerCodes.push("round_bonus_exposure_cap_exceeded");
  }
  if (nextBonusExposureCents > pool.roundBonusExposureCapCents) {
    blockerCodes.push("pool_bonus_exposure_cap_exceeded");
  }
  if (nextBonusExposureCents > reserve.maxExposureCents || nextBonusExposureCents > reserve.backedCents) {
    blockerCodes.push("reserve_exposure_cap_exceeded");
  }
  if (pledge.rulebookHashAtConsent !== round.rulebookHash) {
    blockerCodes.push("rulebook_hash_mismatch");
  }
  if (pledge.feePolicyHashAtConsent !== round.feePolicyHash) {
    blockerCodes.push("fee_policy_hash_mismatch");
  }
  if (pledge.bonusPolicyHashAtConsent !== round.bonusPolicyHash) {
    blockerCodes.push("bonus_policy_hash_mismatch");
  }
  if (visibility !== "aggregate_only") {
    blockerCodes.push("visibility_not_aggregate_only");
  }

  const hardBlockers = uniqueHardPledgeBlockers(blockerCodes)
    .filter((blocker) => blocker !== "feature_non_mvp");

  return {
    allowed: hardBlockers.length === 0,
    providerCallsAllowed: false,
    blockerCodes: uniqueHardPledgeBlockers(blockerCodes),
  };
}

function pledgeEligibilityBlockers({
  round,
  pool,
  gate,
  reserve,
  pledge,
}: {
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  gate: RefundBonusOpenGate;
  reserve: RefundBonusReserve;
  pledge: RefundBonusPledge;
}) {
  const blockers: string[] = [];
  if (gate.state !== "passed") blockers.push("open_gate_not_passed");
  if (pledge.roundId !== round.id || pledge.poolId !== pool.id) blockers.push("pledge_wrong_round_or_pool");
  if (pledge.pledgeState !== "hard_saved") blockers.push(`pledge_state_${pledge.pledgeState}`);
  if (!pledge.finalReviewConfirmedAt) blockers.push("final_review_missing");
  if (!pledge.feeAcknowledged) blockers.push("fee_acknowledgement_missing");
  if (!pledge.sealedProgressAcknowledged) blockers.push("sealed_progress_acknowledgement_missing");
  if (!pledge.bonusTermsAcknowledged) blockers.push("bonus_terms_acknowledgement_missing");
  if (!isTrimStableNonEmpty(pledge.identityEligibilitySnapshotId)) blockers.push("identity_snapshot_missing");
  if (!isTrimStableNonEmpty(pledge.bonusEligibilitySnapshotId)) blockers.push("bonus_eligibility_snapshot_missing");
  if (!isTrimStableNonEmpty(pledge.paymentCommitmentSnapshotId)) blockers.push("payment_commitment_snapshot_missing");
  if (!pledge.providerPaymentMethodConfirmed) blockers.push("payment_method_not_confirmed");
  if (!isPositiveSafeInteger(pledge.maxGrossCents)) blockers.push("gross_invalid");
  if (pledge.maxGrossCents < round.participantMinGrossCents) blockers.push("below_participant_min");
  if (pledge.maxGrossCents > round.participantMaxGrossCents) blockers.push("above_participant_max");
  if (round.fixedPledgeGrossCents != null && pledge.maxGrossCents !== round.fixedPledgeGrossCents) {
    blockers.push("fixed_pledge_amount_mismatch");
  }
  if (!pledge.humanVerified || !pledge.identityVerified) blockers.push("identity_not_verified");
  if (pledge.sybilState !== "clear") blockers.push("sybil_not_clear");
  if (pledge.collusionState !== "clear") blockers.push("collusion_not_clear");
  if (pledge.priorBonusAbuseState !== "clear") blockers.push("prior_bonus_abuse_not_clear");
  if (pledge.jurisdictionEligibilityState !== "clear") blockers.push("jurisdiction_not_clear");
  if (pledge.countingWeightBps !== 10_000 || pledge.bonusEligibilityWeightBps !== 10_000) {
    blockers.push("identity_weight_not_full");
  }
  if (pledge.rulebookHashAtConsent !== round.rulebookHash) blockers.push("rulebook_hash_mismatch");
  if (pledge.feePolicyHashAtConsent !== round.feePolicyHash) blockers.push("fee_policy_hash_mismatch");
  if (pledge.bonusPolicyHashAtConsent !== round.bonusPolicyHash) blockers.push("bonus_policy_hash_mismatch");
  if (!isRefundBonusReserveBacked(reserve, round, pool)) blockers.push("bonus_reserve_unbacked");
  if (pledge.bonusExposureReservedCents <= 0) blockers.push("bonus_exposure_not_reserved");
  return blockers;
}

function dedupeEligiblePledges(pledges: RefundBonusPledge[]) {
  const seenSameControl = new Set<string>();
  const seenPayment = new Set<string>();
  const accepted: RefundBonusPledge[] = [];
  const excludedIds: string[] = [];

  for (const pledge of [...pledges].sort((left, right) =>
    (left.finalReviewConfirmedAt ?? left.createdAt).localeCompare(right.finalReviewConfirmedAt ?? right.createdAt) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  )) {
    const sameControlKey = pledge.sameControlClusterId ? `sc:${pledge.sameControlClusterId}` : `participant:${pledge.participantId}`;
    const paymentKey = pledge.paymentClusterId ? `pay:${pledge.paymentClusterId}` : `pledge:${pledge.id}`;
    if (seenSameControl.has(sameControlKey) || seenPayment.has(paymentKey)) {
      excludedIds.push(pledge.id);
      continue;
    }
    seenSameControl.add(sameControlKey);
    seenPayment.add(paymentKey);
    accepted.push(pledge);
  }

  return { accepted, excludedIds };
}

function blockedFailureReason(pool: RefundBonusPledgePool, reserveBacked: boolean): RefundBonusFailureReason | null {
  if (pool.reviewGates.projectScope === "blocked" || pool.reviewGates.recipientRoute === "blocked" ||
    pool.reviewGates.baseline === "blocked" || pool.reviewGates.actionEvidence === "blocked") {
    return "review_block";
  }
  if (pool.reviewGates.antiThreat !== "clear") return "anti_threat_block";
  if (pool.reviewGates.externality !== "clear") return "externality_block";
  if (pool.reviewGates.conflict === "blocked" || pool.reviewGates.conflict === "review") return "conflict_block";
  if (pool.reviewGates.challenge === "open" || pool.reviewGates.challenge === "blocking") return "challenge_block";
  if (pool.sponsorMatchEnabled && !pool.sponsorMatchBacked) return "sponsor_match_unbacked";
  if (!reserveBacked) return "bonus_reserve_unbacked";
  return null;
}

export function evaluateRefundBonusRoundOutcome({
  round,
  pool,
  gate,
  reserve,
  pledges,
  authorizationAttempts,
}: {
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  gate: RefundBonusOpenGate;
  reserve: RefundBonusReserve;
  pledges: RefundBonusPledge[];
  authorizationAttempts?: RefundBonusAuthorizationAttempt[];
}): RefundBonusOutcome {
  const reserveBacked = isRefundBonusReserveBacked(reserve, round, pool);
  const hardEligibilityRows = pledges.map((pledge) => ({
    pledge,
    blockers: pledgeEligibilityBlockers({ round, pool, gate, reserve, pledge }),
  }));
  const hardEligible = hardEligibilityRows
    .filter((row) => row.blockers.length === 0)
    .map((row) => row.pledge);
  const hardIneligiblePledgeIds = hardEligibilityRows
    .filter((row) => row.blockers.length > 0)
    .map((row) => row.pledge.id);
  const deduped = dedupeEligiblePledges(hardEligible);
  const authorizationByPledge = new Map((authorizationAttempts ?? []).map((attempt) => [attempt.pledgeId, attempt]));
  const recomputedAfterAuthorization = Boolean(authorizationAttempts?.length);
  const afterAuthorization = deduped.accepted.filter((pledge) => {
    if (!recomputedAfterAuthorization) return true;
    const attempt = authorizationByPledge.get(pledge.id);
    return isRefundBonusAuthorizationAttemptCaptureReady(attempt, pledge, round.challengeDeadlineAt);
  });
  const eligiblePledges = afterAuthorization.map((pledge) => {
    const netRecipientCents = Math.max(0, pledge.maxGrossCents - pledge.feeCents);
    return {
      pledge,
      netRecipientCents,
      countedCents: netRecipientCents,
      matchEligibleCents: netRecipientCents,
      bonusEligibleCents: computeRefundBonusCents({
        mode: pool.bonusCalculationMode,
        maxGrossCents: pledge.maxGrossCents,
        fixedBonusCents: pool.fixedBonusCents,
        bonusRatioBps: pool.bonusRatioBps,
        perUserBonusCapCents: pool.perUserBonusCapCents,
      }),
    };
  }).filter((row) => row.netRecipientCents > 0);
  const netRecipientCents = eligiblePledges.reduce((sum, row) => sum + row.netRecipientCents, 0);
  const grossExposureCents = eligiblePledges.reduce((sum, row) => sum + row.pledge.maxGrossCents, 0);
  const bonusExposureReservedCents = eligiblePledges.reduce((sum, row) => sum + row.pledge.bonusExposureReservedCents, 0);
  const verifiedSupporterCount = eligiblePledges
    .filter((row) => row.netRecipientCents >= pool.minNetRecipientCentsPerSupporter)
    .length;
  const distinctViewpointClusterCount = new Set(
    eligiblePledges
      .map((row) => row.pledge.viewpointCluster)
      .filter((tag) => tag && tag !== "prefer_not_to_say"),
  ).size;
  const sponsorMatchCents = pool.sponsorMatchEnabled && pool.sponsorMatchBacked ? netRecipientCents : 0;
  const baseFailure = blockedFailureReason(pool, reserveBacked);
  const thresholdFailures: RefundBonusQualifyingFailureMode[] = [];

  if (netRecipientCents < pool.thresholdNetRecipientCents) {
    thresholdFailures.push("net_recipient_threshold_shortfall");
  }
  if (verifiedSupporterCount < pool.minVerifiedSupporters) {
    thresholdFailures.push("verified_supporter_threshold_shortfall");
  }
  if (distinctViewpointClusterCount < pool.minDistinctViewpointClusters) {
    thresholdFailures.push("different_view_threshold_shortfall");
  }

  const capsFail =
    grossExposureCents > round.roundGrossCaptureCapCents ||
    bonusExposureReservedCents > round.roundBonusExposureCapCents ||
    bonusExposureReservedCents > pool.roundBonusExposureCapCents;
  const allThresholdsPass = thresholdFailures.length === 0 && !capsFail;
  const excludedPledgeIds = [
    ...hardIneligiblePledgeIds,
    ...deduped.excludedIds,
    ...deduped.accepted
      .filter((pledge) => !afterAuthorization.includes(pledge))
      .map((pledge) => pledge.id),
  ];
  const uniqueExcludedPledgeIds = unique(excludedPledgeIds);

  if (baseFailure || round.copyPreflightState !== "passed" || gate.state !== "passed") {
    return {
      status: "nonqualifying_failed",
      reasonCodes: [baseFailure ?? (round.copyPreflightState !== "passed" ? "copy_preflight_failure" : "review_block")],
      eligiblePledges,
      excludedPledgeIds: uniqueExcludedPledgeIds,
      netRecipientCents,
      grossExposureCents,
      verifiedSupporterCount,
      distinctViewpointClusterCount,
      bonusExposureReservedCents,
      sponsorMatchCents,
      recomputedAfterAuthorization,
    };
  }

  if (allThresholdsPass) {
    return {
      status: "cleared",
      reasonCodes: recomputedAfterAuthorization && uniqueExcludedPledgeIds.length > 0 ? [] : [],
      eligiblePledges,
      excludedPledgeIds: uniqueExcludedPledgeIds,
      netRecipientCents,
      grossExposureCents,
      verifiedSupporterCount,
      distinctViewpointClusterCount,
      bonusExposureReservedCents,
      sponsorMatchCents,
      recomputedAfterAuthorization,
    };
  }

  if (recomputedAfterAuthorization && uniqueExcludedPledgeIds.length > 0) {
    return {
      status: "nonqualifying_failed",
      reasonCodes: ["authorization_failure_recompute_below_threshold"],
      eligiblePledges,
      excludedPledgeIds: uniqueExcludedPledgeIds,
      netRecipientCents,
      grossExposureCents,
      verifiedSupporterCount,
      distinctViewpointClusterCount,
      bonusExposureReservedCents,
      sponsorMatchCents,
      recomputedAfterAuthorization,
    };
  }

  const allowedQualifyingFailures = thresholdFailures.filter((reason) =>
    pool.qualifyingFailureModes.includes(reason)
  );

  return {
    status: allowedQualifyingFailures.length > 0 ? "qualifying_failed" : "nonqualifying_failed",
    reasonCodes: allowedQualifyingFailures.length > 0
      ? allowedQualifyingFailures
      : (thresholdFailures.length > 0 ? thresholdFailures : ["authorization_failure_recompute_below_threshold"]),
    eligiblePledges,
    excludedPledgeIds: uniqueExcludedPledgeIds,
    netRecipientCents,
    grossExposureCents,
    verifiedSupporterCount,
    distinctViewpointClusterCount,
    bonusExposureReservedCents,
    sponsorMatchCents,
    recomputedAfterAuthorization,
  };
}

export function canRefundBonusAuthorizeSuccessCharge(status: RefundBonusRoundStatus) {
  return status === "cleared" || status === "authorizing";
}

export function canRefundBonusCaptureSuccessCharge(status: RefundBonusRoundStatus) {
  return status === "payable";
}

export function canRefundBonusPayoutBonus(status: RefundBonusRoundStatus) {
  return status === "bonus_payable" || status === "bonus_paying";
}

function isRefundBonusQualifyingFailureReason(
  reason: RefundBonusFailureReason,
): reason is RefundBonusQualifyingFailureMode {
  return DEFAULT_QUALIFYING_FAILURE_MODES.includes(reason as RefundBonusQualifyingFailureMode);
}

function didRefundBonusQualifyingFailurePredicatePass(
  outcome: RefundBonusOutcome,
  pool: RefundBonusPledgePool,
) {
  return (
    outcome.status === "qualifying_failed" &&
    outcome.reasonCodes.some((reason) =>
      isRefundBonusQualifyingFailureReason(reason) &&
      pool.qualifyingFailureModes.includes(reason)
    )
  );
}

export function planRefundBonusSettlement({
  round,
  pool,
  reserve,
  outcome,
  roundStatus,
  emergencyPaused = false,
  simulationOnly = true,
  bonusSettlementPlanApproved = false,
  eligibleRowsRecomputed = false,
  featurePaused = false,
  roundPaused = false,
  bonusReservePaused = false,
  payoutRailPaused = false,
  successPremiumSchedule,
  clearedThresholdIndex,
  successPremiumFundingConfirmed = false,
}: {
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  reserve: RefundBonusReserve;
  outcome: RefundBonusOutcome;
  roundStatus: RefundBonusRoundStatus;
  emergencyPaused?: boolean;
  simulationOnly?: boolean;
  bonusSettlementPlanApproved?: boolean;
  eligibleRowsRecomputed?: boolean;
  featurePaused?: boolean;
  roundPaused?: boolean;
  bonusReservePaused?: boolean;
  payoutRailPaused?: boolean;
  successPremiumSchedule?: FailureBonusSuccessPremiumScheduleQuote;
  clearedThresholdIndex?: number;
  successPremiumFundingConfirmed?: boolean;
}): RefundBonusSettlementPlan {
  const blockedReasonCodes: string[] = [];
  const qualifyingFailurePredicatePassed = didRefundBonusQualifyingFailurePredicatePass(outcome, pool);
  if (!simulationOnly) blockedReasonCodes.push("production_real_money_disabled");
  if (emergencyPaused) blockedReasonCodes.push("emergency_pause_active");
  if (featurePaused) blockedReasonCodes.push("feature_pause_active");
  if (roundPaused) blockedReasonCodes.push("round_pause_active");
  if (bonusReservePaused) blockedReasonCodes.push("bonus_reserve_pause_active");
  if (payoutRailPaused) blockedReasonCodes.push("payout_rail_pause_active");
  if (!isRefundBonusReserveBacked(reserve, round, pool)) blockedReasonCodes.push("bonus_reserve_unbacked");

  const successPremiumConfigured = pool.successPremiumEnabled === true;
  let successPremiumDue = {
    clearedThresholdIndex: 0,
    netRecipientThresholdCents: 0,
    successPremiumCents: 0,
    grossSuccessRequirementCents: 0,
  };
  let successPremiumThresholdId: string | undefined;

  if (outcome.status === "cleared" && successPremiumConfigured) {
    if (!successPremiumSchedule) {
      blockedReasonCodes.push("success_premium_quote_missing");
    } else {
      if (successPremiumSchedule.policyVersion !== FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION) {
        blockedReasonCodes.push("success_premium_policy_version_mismatch");
      }
      if (successPremiumSchedule.premiumIncludedInNetRecipientThreshold !== false) {
        blockedReasonCodes.push("success_premium_must_be_outside_net_threshold");
      }
      if (pool.successPremiumIncludedInNetRecipientThreshold !== false) {
        blockedReasonCodes.push("pool_success_premium_threshold_boundary_missing");
      }
      if (pool.successPremiumPayer !== successPremiumSchedule.premiumPayer) {
        blockedReasonCodes.push("success_premium_payer_mismatch");
      }
      if (pool.successPremiumPolicyVersion !== successPremiumSchedule.policyVersion) {
        blockedReasonCodes.push("pool_success_premium_policy_version_mismatch");
      }

      try {
        const firstQuotedThreshold = successPremiumSchedule.thresholds[0];
        if (
          !firstQuotedThreshold ||
          firstQuotedThreshold.cumulativeNetRecipientThresholdCents !== pool.thresholdNetRecipientCents
        ) {
          blockedReasonCodes.push("success_premium_threshold_mismatch");
        }

        const highestClearedThresholdIndex = getHighestClearedThresholdIndex(
          successPremiumSchedule,
          outcome.netRecipientCents,
        );
        if (highestClearedThresholdIndex === 0) {
          blockedReasonCodes.push("success_premium_no_threshold_cleared");
        }
        if (
          clearedThresholdIndex != null &&
          clearedThresholdIndex !== highestClearedThresholdIndex
        ) {
          blockedReasonCodes.push("success_premium_cleared_threshold_mismatch");
        }

        successPremiumDue = getSuccessPremiumDueForClearedThreshold(
          successPremiumSchedule,
          highestClearedThresholdIndex,
        );
        successPremiumThresholdId =
          successPremiumSchedule.thresholds[highestClearedThresholdIndex - 1]?.thresholdId;
        if (successPremiumDue.netRecipientThresholdCents > outcome.netRecipientCents) {
          blockedReasonCodes.push("success_premium_threshold_not_funded");
        }
      } catch {
        blockedReasonCodes.push("success_premium_cleared_threshold_invalid");
      }
    }

    if (!simulationOnly && !successPremiumFundingConfirmed) {
      blockedReasonCodes.push("success_premium_funding_not_confirmed");
    }
  }

  if (outcome.status === "cleared") {
    if (!canRefundBonusCaptureSuccessCharge(roundStatus)) {
      blockedReasonCodes.push("round_not_payable");
    }
    if (round.status !== "payable") {
      blockedReasonCodes.push("round_record_not_payable");
    }
    if (pool.status !== "payable") {
      blockedReasonCodes.push("pool_not_payable");
    }
    if (!eligibleRowsRecomputed) {
      blockedReasonCodes.push("eligible_rows_not_recomputed");
    }
    if (!outcome.recomputedAfterAuthorization) {
      blockedReasonCodes.push("authorization_reconciliation_missing");
    }
    if (
      !isNonNegativeSafeInteger(outcome.grossExposureCents) ||
      outcome.grossExposureCents > round.roundGrossCaptureCapCents
    ) {
      blockedReasonCodes.push("gross_capture_cap_exceeded");
    }
  }
  if (outcome.status === "qualifying_failed") {
    if (!canRefundBonusPayoutBonus(roundStatus)) {
      blockedReasonCodes.push("round_not_bonus_payable");
    }
    if (!canRefundBonusPayoutBonus(round.status)) {
      blockedReasonCodes.push("round_record_not_bonus_payable");
    }
    if (pool.status !== "qualifying_failed" && pool.status !== "bonus_payable") {
      blockedReasonCodes.push("pool_not_qualifying_failed_or_bonus_payable");
    }
    if (reserve.status !== "active" && reserve.status !== "paying") {
      blockedReasonCodes.push("bonus_reserve_not_active");
    }
    if (!qualifyingFailurePredicatePassed) {
      blockedReasonCodes.push("qualifying_failure_predicate_not_passed");
    }
    if (!bonusSettlementPlanApproved) {
      blockedReasonCodes.push("bonus_settlement_plan_not_approved");
    }
    if (!eligibleRowsRecomputed) {
      blockedReasonCodes.push("eligible_rows_not_recomputed");
    }
  }

  const createdAt = round.updatedAt;
  const payoutOperations = qualifyingFailurePredicatePassed && blockedReasonCodes.length === 0
    ? outcome.eligiblePledges.flatMap((row) => {
      if (!isTrimStableNonEmpty(row.pledge.bonusPayoutMethodRef)) {
        return [];
      }

      const operation = {
        id: `${row.pledge.id}:refund-bonus-payout`,
        roundId: round.id,
        poolId: pool.id,
        pledgeId: row.pledge.id,
        participantId: row.pledge.participantId,
        reserveId: reserve.id,
        bonusGrossCents: row.bonusEligibleCents,
        payoutFeeCents: 0,
        bonusNetCents: row.bonusEligibleCents,
        currency: "usd" as const,
        payoutDestinationRef: row.pledge.bonusPayoutMethodRef,
        payoutState: "succeeded" as const,
        idempotencyKey: `refund-bonus:${round.id}:${pool.id}:${row.pledge.id}`,
        providerPayoutRef: simulationOnly ? `simulated:${row.pledge.id}` : undefined,
        createdAt,
        updatedAt: createdAt,
      };

      return {
        ...operation,
        eventHash: hashValue(operation),
      };
    })
    : [];
  const bonusLiabilityCents = qualifyingFailurePredicatePassed
    ? outcome.eligiblePledges.reduce((sum, row) => sum + row.bonusEligibleCents, 0)
    : 0;
  const bonusPaidCents = payoutOperations.reduce((sum, operation) => sum + operation.bonusNetCents, 0);
  const bonusPayoutFeeCents = payoutOperations.reduce(
    (sum, operation) => sum + operation.payoutFeeCents,
    0,
  );
  const bonusUnclaimedCents = Math.max(0, bonusLiabilityCents - bonusPaidCents);
  const success = outcome.status === "cleared" && blockedReasonCodes.length === 0;
  const feeCents = success ? outcome.eligiblePledges.reduce((sum, row) => sum + row.pledge.feeCents, 0) : 0;
  const grossCapturedCents = success ? outcome.grossExposureCents : 0;
  const netRecipientDisbursedCents = success ? outcome.netRecipientCents : 0;
  const successPremiumCents = success && successPremiumConfigured ? successPremiumDue.successPremiumCents : 0;
  const grossSuccessRequirementCents = success
    ? successPremiumConfigured
      ? successPremiumDue.grossSuccessRequirementCents
      : netRecipientDisbursedCents
    : 0;
  const countedCents = success ? outcome.eligiblePledges.reduce((sum, row) => sum + row.countedCents, 0) : 0;
  const matchEligibleCents = success
    ? outcome.eligiblePledges.reduce((sum, row) => sum + row.matchEligibleCents, 0)
    : 0;
  const bonusUnearnedReleasedCents = qualifyingFailurePredicatePassed
    ? Math.max(0, outcome.bonusExposureReservedCents - bonusLiabilityCents)
    : outcome.bonusExposureReservedCents;
  const hasAuthorizationFailure = outcome.reasonCodes.includes("authorization_failure_recompute_below_threshold");
  const hasReviewBlock = outcome.reasonCodes.some((reason) =>
    reason === "review_block" ||
    reason === "challenge_block" ||
    reason === "anti_threat_block" ||
    reason === "externality_block" ||
    reason === "conflict_block" ||
    reason === "legal_compliance_block" ||
    reason === "sponsor_match_unbacked" ||
    reason === "bonus_reserve_unbacked" ||
    reason === "copy_preflight_failure"
  );
  const finalStatus: RefundBonusAuditReport["finalStatus"] = blockedReasonCodes.length > 0 || outcome.status === "nonqualifying_failed"
    ? outcome.reasonCodes.includes("round_canceled_by_admin")
      ? "canceled_no_bonus"
      : hasAuthorizationFailure
        ? "failed_authorization_no_bonus"
        : hasReviewBlock
          ? "blocked_review_no_bonus"
          : "nonqualifying_failed_no_bonus"
    : success
      ? "cleared_and_captured"
      : payoutOperations.length > 0 && bonusUnclaimedCents === 0
        ? "qualifying_failed_bonus_paid"
        : "qualifying_failed_bonus_payable";
  const reserveLedgerEntryDrafts: Array<Omit<RefundBonusReserveLedgerEntry, "eventHash">> = [];

  if (successPremiumCents > 0) {
    reserveLedgerEntryDrafts.push({
      id: `${round.id}:${pool.id}:success-premium-credit`,
      roundId: round.id,
      poolId: pool.id,
      reserveId: reserve.id,
      thresholdId: successPremiumThresholdId,
      eventType: "success_premium_credit",
      cashDeltaCents: successPremiumCents,
      exposureDeltaCents: 0,
      currency: "usd",
      policyVersion: FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
      sourceRef: `pool-success:${round.id}:${pool.id}`,
      idempotencyKey: `failure-bonus-reserve:success-premium:${round.id}:${pool.id}:${successPremiumThresholdId ?? "threshold"}`,
      createdAt,
    });
  }

  if (bonusPaidCents > 0) {
    reserveLedgerEntryDrafts.push({
      id: `${round.id}:${pool.id}:failure-bonus-debit`,
      roundId: round.id,
      poolId: pool.id,
      reserveId: reserve.id,
      eventType: "failure_bonus_debit",
      cashDeltaCents: -bonusPaidCents,
      exposureDeltaCents: -bonusPaidCents,
      currency: "usd",
      policyVersion: FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
      sourceRef: `qualifying-failure:${round.id}:${pool.id}`,
      idempotencyKey: `failure-bonus-reserve:failure-debit:${round.id}:${pool.id}`,
      createdAt,
    });
  }

  if (bonusUnearnedReleasedCents > 0 && blockedReasonCodes.length === 0) {
    reserveLedgerEntryDrafts.push({
      id: `${round.id}:${pool.id}:bonus-exposure-release`,
      roundId: round.id,
      poolId: pool.id,
      reserveId: reserve.id,
      eventType: "bonus_exposure_release",
      cashDeltaCents: 0,
      exposureDeltaCents: -bonusUnearnedReleasedCents,
      currency: "usd",
      policyVersion: FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
      sourceRef: `settlement-release:${round.id}:${pool.id}`,
      idempotencyKey: `failure-bonus-reserve:exposure-release:${round.id}:${pool.id}`,
      createdAt,
    });
  }

  if (bonusPayoutFeeCents > 0) {
    reserveLedgerEntryDrafts.push({
      id: `${round.id}:${pool.id}:reserve-expense-debit`,
      roundId: round.id,
      poolId: pool.id,
      reserveId: reserve.id,
      eventType: "reserve_expense_debit",
      cashDeltaCents: -bonusPayoutFeeCents,
      exposureDeltaCents: 0,
      currency: "usd",
      policyVersion: FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
      sourceRef: `qualifying-failure-fees:${round.id}:${pool.id}`,
      idempotencyKey: `failure-bonus-reserve:expense-debit:${round.id}:${pool.id}`,
      createdAt,
    });
  }

  const reserveLedgerEntries: RefundBonusReserveLedgerEntry[] = reserveLedgerEntryDrafts.map((entry) => ({
    ...entry,
    eventHash: hashValue(entry),
  }));
  const payoutByPledgeId = new Map(payoutOperations.map((operation) => [operation.pledgeId, operation]));
  const settlementRows: RefundBonusPoolSettlementRow[] = outcome.eligiblePledges.map((row) => {
    const payoutOperation = payoutByPledgeId.get(row.pledge.id);
    const rowSuccess = success && blockedReasonCodes.length === 0;
    const rowBonusPaid = payoutOperation?.bonusNetCents ?? 0;
    const rowBonusFee = payoutOperation?.payoutFeeCents ?? 0;
    const settlementState: RefundBonusPoolSettlementRow["settlementState"] = blockedReasonCodes.length > 0
      ? "blocked"
        : rowSuccess
          ? "captured"
          : qualifyingFailurePredicatePassed
            ? payoutOperation
              ? "bonus_paid"
              : "bonus_held"
            : "released";

    return {
      id: `${round.id}:${pool.id}:${row.pledge.id}:settlement`,
      roundId: round.id,
      poolId: pool.id,
      pledgeId: row.pledge.id,
      participantId: row.pledge.participantId,
      grossCapturedCents: rowSuccess ? row.pledge.maxGrossCents : 0,
      feeCents: rowSuccess ? row.pledge.feeCents : 0,
      netRecipientDisbursedCents: rowSuccess ? row.netRecipientCents : 0,
      actualGrossExposureCents: row.pledge.maxGrossCents,
      countedCents: rowSuccess ? row.countedCents : 0,
      matchEligibleCents: rowSuccess ? row.matchEligibleCents : 0,
      sponsorBaseMatchCents: rowSuccess && pool.sponsorMatchEnabled && pool.sponsorMatchBacked
        ? row.netRecipientCents
        : 0,
      bonusExposureReservedCents: row.pledge.bonusExposureReservedCents,
      bonusEligibleCents: qualifyingFailurePredicatePassed ? row.bonusEligibleCents : 0,
      bonusPaidCents: rowBonusPaid,
      bonusPayoutFeeCents: rowBonusFee,
      bonusUnearnedReleasedCents: qualifyingFailurePredicatePassed
        ? Math.max(0, row.pledge.bonusExposureReservedCents - row.bonusEligibleCents)
        : row.pledge.bonusExposureReservedCents,
      settlementState,
      createdAt,
    };
  });

  return {
    settlementRows,
    payoutOperations,
    reserveLedgerEntries,
    blockedReasonCodes,
    auditReport: {
      id: `${round.id}:${pool.id}:refund-bonus-audit`,
      roundId: round.id,
      poolId: pool.id,
      rulebookHash: round.rulebookHash,
      feePolicyHash: round.feePolicyHash,
      bonusPolicyHash: round.bonusPolicyHash,
      calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
      finalStatus,
      grossCapturedCents,
      feeCents,
      netRecipientDisbursedCents,
      actualGrossExposureCents: outcome.grossExposureCents,
      countedCents,
      matchEligibleCents,
      sponsorBaseMatchCents: success ? outcome.sponsorMatchCents : 0,
      successPremiumCents,
      successPremiumPayer: successPremiumConfigured ? pool.successPremiumPayer : undefined,
      grossSuccessRequirementCents,
      successPremiumPolicyVersion: successPremiumConfigured
        ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
        : undefined,
      bonusReserveBackedCents: reserve.backedCents,
      bonusExposureReservedCents: outcome.bonusExposureReservedCents,
      bonusLiabilityCents,
      bonusHeldCents: reserve.heldCents,
      bonusPaidCents,
      bonusPayoutFeeCents,
      bonusUnclaimedCents,
      bonusUnearnedReleasedCents,
      verifiedSupporterCount: outcome.verifiedSupporterCount,
      distinctViewpointClusterCount: outcome.distinctViewpointClusterCount,
      authorizationFailureCount: hasAuthorizationFailure ? outcome.excludedPledgeIds.length : 0,
      excludedIdentityCount: 0,
      excludedPaymentClusterCount: outcome.excludedPledgeIds.length,
      excludedBonusAbuseCount: outcome.reasonCodes.includes("material_collusion_attack") ||
        outcome.reasonCodes.includes("material_sybil_attack")
        ? outcome.excludedPledgeIds.length
        : 0,
      reviewBlockCount: hasReviewBlock ? 1 : 0,
      reasonCodes: outcome.reasonCodes,
      publicReportJson: {
        grossCapturedCents,
        feeCents,
        netRecipientDisbursedCents,
        actualGrossExposureCents: outcome.grossExposureCents,
        countedCents,
        matchEligibleCents,
        sponsorBaseMatchCents: success ? outcome.sponsorMatchCents : 0,
        successPremiumCents,
        successPremiumPayer: successPremiumConfigured ? pool.successPremiumPayer : undefined,
        grossSuccessRequirementCents,
        successPremiumPolicyVersion: successPremiumConfigured
          ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
          : undefined,
        bonusReserveBackedCents: reserve.backedCents,
        bonusExposureReservedCents: outcome.bonusExposureReservedCents,
        bonusLiabilityCents,
        bonusHeldCents: reserve.heldCents,
        bonusPaidCents,
        bonusPayoutFeeCents,
        bonusUnclaimedCents,
        bonusUnearnedReleasedCents,
        finalStatus,
        reasonCodes: outcome.reasonCodes,
      },
      publishedAt: createdAt,
    },
  };
}

export function buildRefundBonusReceipt({
  round,
  pool,
  reserve,
  pledge,
  plan,
  authorizationAttempt,
}: {
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  reserve: RefundBonusReserve;
  pledge: RefundBonusPledge;
  plan: RefundBonusSettlementPlan;
  authorizationAttempt?: RefundBonusAuthorizationAttempt;
}): RefundBonusReceipt {
  const payoutOperation = plan.payoutOperations.find((operation) => operation.pledgeId === pledge.id);
  const settlementRow = plan.settlementRows.find((row) => row.pledgeId === pledge.id);
  const finalStatus = plan.auditReport.finalStatus;

  if (finalStatus === "cleared_and_captured") {
    if (!isRefundBonusSuccessReceiptCaptureEvidenceReady(authorizationAttempt, pledge, round.challengeDeadlineAt)) {
      return {
        receiptKind: "no_bonus_no_charge",
        roundId: round.id,
        poolId: pool.id,
        pledgeId: pledge.id,
        participantId: pledge.participantId,
        calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
        grossCapturedCents: 0,
        feeCents: 0,
        netRecipientDisbursedCents: 0,
        projectFundingCents: 0,
        projectAllocationCentsByProjectId: allocateProjectFundingCents(pool, 0),
        actualGrossExposureCents: 0,
        countedCents: 0,
        matchEligibleCents: 0,
        sponsorBaseMatchCents: 0,
        failureReasonCategory: "authorization_failure_recompute_below_threshold",
        bonusEligibilityStatus: "not_eligible",
        bonusGrossCents: 0,
        bonusPayoutFeeCents: 0,
        bonusNetCents: 0,
        bonusReserveId: reserve.id,
        rulebookHash: round.rulebookHash,
        bonusPolicyHash: round.bonusPolicyHash,
        copy: "A success-charge receipt was not issued because exact authorization evidence was missing or invalid. You were charged 0 cents.",
      };
    }

    const netRecipientDisbursedCents = Math.max(0, pledge.maxGrossCents - pledge.feeCents);
    const sponsorBaseMatchCents = pool.sponsorMatchEnabled && pool.sponsorMatchBacked
      ? netRecipientDisbursedCents
      : 0;

    return {
      receiptKind: "success_charge",
      roundId: round.id,
      poolId: pool.id,
      pledgeId: pledge.id,
      participantId: pledge.participantId,
      calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
      grossCapturedCents: pledge.maxGrossCents,
      feeCents: pledge.feeCents,
      netRecipientDisbursedCents,
      projectFundingCents: netRecipientDisbursedCents,
      projectAllocationCentsByProjectId: allocateProjectFundingCents(pool, netRecipientDisbursedCents),
      actualGrossExposureCents: pledge.maxGrossCents,
      countedCents: netRecipientDisbursedCents,
      matchEligibleCents: netRecipientDisbursedCents,
      sponsorBaseMatchCents,
      bonusEligibilityStatus: "not_applicable_cleared",
      bonusGrossCents: 0,
      bonusPayoutFeeCents: 0,
      bonusNetCents: 0,
      authorizationReference: authorizationAttempt?.providerAuthorizationRef,
      captureReference: authorizationAttempt.providerCaptureRef,
      rulebookHash: round.rulebookHash,
      feePolicyHash: round.feePolicyHash,
      bonusPolicyHash: round.bonusPolicyHash,
      copy: `The pool cleared. Gross captured: ${pledge.maxGrossCents} cents. Fees: ${pledge.feeCents} cents. Net sent to reviewed projects: ${netRecipientDisbursedCents} cents. Failure bonus: 0 cents because the pool cleared.`,
    };
  }

  if (finalStatus === "qualifying_failed_bonus_payable" || finalStatus === "qualifying_failed_bonus_paid") {
    const bonusGrossCents = payoutOperation?.bonusGrossCents ?? settlementRow?.bonusEligibleCents ?? 0;
    const payoutState = payoutOperation?.payoutState ?? (
      settlementRow?.settlementState === "bonus_held"
        ? "unclaimed"
        : settlementRow?.settlementState === "bonus_payable"
          ? "not_attempted"
          : undefined
    );

    return {
      receiptKind: "qualifying_failure_bonus",
      roundId: round.id,
      poolId: pool.id,
      pledgeId: pledge.id,
      participantId: pledge.participantId,
      calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
      grossCapturedCents: 0,
      feeCents: 0,
      netRecipientDisbursedCents: 0,
      projectFundingCents: 0,
      projectAllocationCentsByProjectId: allocateProjectFundingCents(pool, 0),
      actualGrossExposureCents: 0,
      countedCents: 0,
      matchEligibleCents: 0,
      sponsorBaseMatchCents: 0,
      failureReasonCategory: plan.auditReport.reasonCodes[0],
      bonusEligibilityStatus: bonusGrossCents > 0 ? "eligible" : "not_eligible",
      bonusGrossCents,
      bonusPayoutFeeCents: payoutOperation?.payoutFeeCents ?? 0,
      bonusNetCents: payoutOperation?.bonusNetCents ?? 0,
      bonusPayoutState: payoutState,
      bonusPayoutReference: payoutOperation?.providerPayoutRef,
      bonusReserveId: reserve.id,
      rulebookHash: round.rulebookHash,
      bonusPolicyHash: round.bonusPolicyHash,
      copy: `The pool did not clear. You were charged 0 cents. Project funding: 0 cents. Failure reason: ${plan.auditReport.reasonCodes[0] ?? "support_threshold_shortfall"}. Backed failure-participation bonus: ${bonusGrossCents} cents. Payout state: ${payoutState ?? "not_eligible"}.`,
    };
  }

  return {
    receiptKind: "no_bonus_no_charge",
    roundId: round.id,
    poolId: pool.id,
    pledgeId: pledge.id,
    participantId: pledge.participantId,
    calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
    grossCapturedCents: 0,
    feeCents: 0,
    netRecipientDisbursedCents: 0,
    projectFundingCents: 0,
    projectAllocationCentsByProjectId: allocateProjectFundingCents(pool, 0),
    actualGrossExposureCents: 0,
    countedCents: 0,
    matchEligibleCents: 0,
    sponsorBaseMatchCents: 0,
    failureReasonCategory: plan.auditReport.reasonCodes[0],
    bonusEligibilityStatus: "not_eligible",
    bonusGrossCents: 0,
    bonusPayoutFeeCents: 0,
    bonusNetCents: 0,
    bonusReserveId: reserve.id,
    rulebookHash: round.rulebookHash,
    bonusPolicyHash: round.bonusPolicyHash,
    copy: `The pool did not produce a charge or a bonus. You were charged 0 cents. No project funds were disbursed from this pledge.`,
  };
}

const PROHIBITED_COPY_PATTERNS: Array<[string, RegExp]> = [
  ["free money", /\bfree\s+money\b/i],
  ["profit", /\bprofit\b/i],
  ["investment", /\binvestment\b/i],
  ["interest", /\binterest\b/i],
  ["lottery", /\blottery\b/i],
  ["guaranteed return", /\bguaranteed\s+return\b/i],
  ["risk-free", /\brisk[-\s]?free\b/i],
  ["risk-free return", /\brisk[-\s]?free\s+return\b/i],
  ["cashback", /\bcashback\b/i],
  ["refund with interest", /\brefund\s+with\s+interest\b/i],
  ["guaranteed bonus", /\bguaranteed\s+bonus\b/i],
  ["paid to donate", /\bpaid\s+to\s+donate\b/i],
  ["failure impact", /\bfailure\s+impact\b/i],
  ["paid if it fails no matter why", /\bpaid\s+if\s+it\s+fails\b[\s\S]{0,80}\bno\s+matter\s+why\b/i],
  ["impact", /\bbonus\s+impact\b/i],
  ["held", /\bfunds\s+(?:are\s+)?held\b/i],
  ["escrow", /\bescrow(?:ed)?\b/i],
  ["custody", /\bcustody\b/i],
  ["protected", /\bprotected\b/i],
  ["reserved", /\bfunds\s+(?:are\s+)?reserved\b/i],
  ["authorized", /\bsaved.*authorized\b/i],
  ["guaranteed impact", /\bguaranteed\s+impact\b/i],
  ["tax treatment", /\btax\s+treatment\b/i],
  ["legal advice", /\blegal\s+advice\b/i],
  ["moral ranking", /\bmoral\s+ranking\b/i],
  ["moral reputation power", /\bmoral\s+reputation(?:\s+power)?\b/i],
  ["exact live pivotality", /\bexact\s+live\s+pivotality\b/i],
  ["current CRECM mechanism", /\bcurrent\s+CRECM\s+mechanism\b/i],
];

const REQUIRED_COPY_PATTERNS: Array<[string, RegExp]> = [
  ["non_mvp", /\bnon[-\s]?mvp\b/i],
  ["backed_conditional_bonus", /\bbacked\b[\s\S]{0,80}\bfailure[-\s]?participation bonus\b/i],
  ["qualifying_support_failure", /\bmiss(?:es|ed)?\b[\s\S]{0,80}\bsupport threshold\b/i],
  ["blocked_failure_no_bonus", /\bno bonus\b[\s\S]{0,120}\b(?:blocked|unsafe|ineligible|duplicate|payment-failed|abuse-flagged)\b/i],
  ["not_impact", /\bnot\b[\s\S]{0,80}\b(?:impact|investment return|interest|lottery)\b/i],
];

export function validateRefundBonusCopy(copy: string): RefundBonusCopyPreflight {
  const copyForBlockedTerms = copy
    .replace(/\bnot\s+(?:an?\s+)?investment(?:\s+return)?\b/gi, "")
    .replace(/\bnot\s+interest\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?lottery\b/gi, "")
    .replace(/\bnot\s+public-good\s+impact\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?charge\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?hold\b/gi, "")
    .replace(/\bnot\s+escrow\b/gi, "")
    .replace(/\bnot\s+custody\b/gi, "")
    .replace(/\bnot\s+(?:an?\s+)?authorization\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?guarantee\b[\s\S]{0,120}\b(?:authorization|bonus payout|bonus-eligible failure state)\b/gi, "");
  const blockedTerms = PROHIBITED_COPY_PATTERNS
    .filter(([, pattern]) => pattern.test(copyForBlockedTerms))
    .map(([term]) => term);
  const missingRequiredClaims = REQUIRED_COPY_PATTERNS
    .filter(([, pattern]) => !pattern.test(copy))
    .map(([claim]) => claim);

  return {
    passed: blockedTerms.length === 0 && missingRequiredClaims.length === 0,
    blockedTerms,
    missingRequiredClaims,
  };
}

export function buildRefundBonusCopyPreflightReport({
  id,
  roundId,
  checkedAt,
  lastDeployHash,
  checkedRoutes,
  activeCopy,
  prohibitedActiveLabelsFound = [],
  exactProgressLeakFound = false,
  paymentOverclaimFound = false,
  ordinaryZeroStatePrimaryFound = true,
  staleCtaFound = false,
  nonMvpSurfaceLeakFound = false,
}: {
  id: string;
  roundId: string;
  checkedAt: string;
  lastDeployHash: string;
  checkedRoutes: string[];
  activeCopy: string;
  prohibitedActiveLabelsFound?: string[];
  exactProgressLeakFound?: boolean;
  paymentOverclaimFound?: boolean;
  ordinaryZeroStatePrimaryFound?: boolean;
  staleCtaFound?: boolean;
  nonMvpSurfaceLeakFound?: boolean;
}): RefundBonusCopyPreflightReport {
  const copy = validateRefundBonusCopy(activeCopy);
  const bonusOverclaimFound = copy.blockedTerms.length > 0 || copy.missingRequiredClaims.length > 0;
  const financialPromotionRiskFound = copy.blockedTerms.some((term) =>
    term === "free money" ||
    term === "profit" ||
    term === "investment" ||
    term === "interest" ||
    term === "lottery" ||
    term === "guaranteed return" ||
    term === "risk-free" ||
    term === "risk-free return" ||
    term === "cashback" ||
    term === "refund with interest" ||
    term === "paid to donate"
  );
  const reportWithoutHash = {
    id,
    roundId,
    checkedAt,
    lastDeployHash,
    checkedRoutes,
    prohibitedActiveLabelsFound,
    exactProgressLeakFound,
    paymentOverclaimFound,
    bonusOverclaimFound,
    financialPromotionRiskFound,
    ordinaryZeroStatePrimaryFound,
    staleCtaFound,
    nonMvpSurfaceLeakFound,
    pass: (
      prohibitedActiveLabelsFound.length === 0 &&
      !exactProgressLeakFound &&
      !paymentOverclaimFound &&
      !bonusOverclaimFound &&
      !financialPromotionRiskFound &&
      ordinaryZeroStatePrimaryFound &&
      !staleCtaFound &&
      !nonMvpSurfaceLeakFound
    ),
  };

  return {
    ...reportWithoutHash,
    reportHash: hashValue(reportWithoutHash),
  };
}

function isValidIsoTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value));
}

export function evaluateRefundBonusCopyPreflightFreshness({
  report,
  latestDeployHash,
  latestDeployCompletedAt,
  requiredRoutes,
}: RefundBonusCopyPreflightFreshnessInput): RefundBonusCopyPreflightFreshnessResult {
  const checkedRoutes = new Set(report.checkedRoutes);
  const missingRoutes = unique(requiredRoutes.filter((route) => !checkedRoutes.has(route)));
  const checkedAtValid = isValidIsoTimestamp(report.checkedAt);
  const latestDeployCompletedAtValid = isValidIsoTimestamp(latestDeployCompletedAt);
  const latestDeployHashValid = isCanonicalHash(latestDeployHash);
  const reportPasses = report.pass;
  const deployHashMatches = latestDeployHashValid && report.lastDeployHash === latestDeployHash;
  const generatedAfterLatestDeploy =
    checkedAtValid &&
    latestDeployCompletedAtValid &&
    Date.parse(report.checkedAt) >= Date.parse(latestDeployCompletedAt);
  const requiredRoutesCovered = missingRoutes.length === 0;

  const reasonCodes: RefundBonusCopyPreflightFreshnessReason[] = [];
  if (!reportPasses) reasonCodes.push("copy_preflight_failed");
  if (!checkedAtValid) reasonCodes.push("invalid_copy_preflight_checked_at");
  if (!latestDeployCompletedAtValid) reasonCodes.push("invalid_latest_deploy_completed_at");
  if (!latestDeployHashValid) reasonCodes.push("invalid_latest_deploy_hash");
  if (!deployHashMatches) reasonCodes.push("deploy_hash_mismatch");
  if (!generatedAfterLatestDeploy) reasonCodes.push("copy_preflight_before_latest_deploy");
  if (!requiredRoutesCovered) reasonCodes.push("required_route_missing");

  return {
    fresh: reasonCodes.length === 0,
    reasonCodes: unique(reasonCodes),
    missingRoutes,
    reportPasses,
    deployHashMatches,
    generatedAfterLatestDeploy,
    requiredRoutesCovered,
  };
}
