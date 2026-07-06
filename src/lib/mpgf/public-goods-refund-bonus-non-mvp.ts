import { createHash } from "node:crypto";

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
  parametersFrozenAt: string;
  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  calculationVersion: typeof REFUND_BONUS_CALCULATION_VERSION;
  sealedProgressMode: "qualitative_only_before_close";
  copyPreflightState: "not_run" | "passed" | "failed";
  productionPublicEnabled: boolean;
  productionRealMoneyEnabled: boolean;
  promotionRecordId?: string;
}

export interface RefundBonusPledgePool {
  id: string;
  roundId: string;
  projectIds: [string, string] | [string, string, string];
  allocationWeightsBpsByProjectId: Record<string, number>;
  thresholdNetRecipientCents: number;
  minVerifiedSupporters: number;
  minDistinctViewpointClusters: number;
  minNetRecipientCentsPerSupporter: number;
  sponsorMatchEnabled: boolean;
  sponsorMatchBacked: boolean;
  refundBonusEnabled: boolean;
  refundBonusReserveId?: string;
  bonusCalculationMode: "fixed_cents" | "percentage_of_pledge_capped" | "none";
  fixedBonusCents?: number;
  bonusRatioBps?: number;
  perUserBonusCapCents: number;
  roundBonusExposureCapCents: number;
  qualifyingFailureModes: RefundBonusQualifyingFailureMode[];
  status: "draft" | "labs_open" | "open" | "closed" | "cleared" | "qualifying_failed" | "nonqualifying_failed" | "blocked" | "canceled";
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
}

export interface RefundBonusReserve {
  id: string;
  roundId: string;
  poolId: string;
  reserveType: "failure_participation_bonus";
  backedCents: number;
  maxExposureCents: number;
  committedExposureCents: number;
  paidCents: number;
  heldCents: number;
  releasedUnusedCents: number;
  backingState: "funded" | "escrowed" | "contractually_committed" | "unbacked" | "dev_simulated";
  legalComplianceState: "approved" | "review" | "blocked";
  payoutProviderReady: boolean;
  sourceHash: string;
  bonusPolicyHash: string;
  publishedAt: string;
  backingConfirmedAt: string;
  status: "draft" | "backed" | "active" | "paying" | "paid" | "released_unused" | "blocked";
}

export interface RefundBonusPledge {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;
  maxGrossCents: number;
  feeCents: number;
  viewpointTag: string;
  sameControlClusterId?: string;
  paymentClusterId?: string;
  pledgeState: "draft" | "hard_saved" | "withdrawn" | "excluded" | "captured" | "bonus_paid";
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
}

export interface RefundBonusAuthorizationAttempt {
  pledgeId: string;
  authorizationState: "authorized_exact" | "failed" | "wrong_amount" | "expired" | "short_expiring" | "missing";
  requiredGrossCents: number;
  authorizedGrossCents: number;
  providerAuthorizationRef?: string;
  validThroughCapture: boolean;
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

export interface RefundBonusPayoutOperation {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  reserveId: string;
  bonusGrossCents: number;
  bonusPayoutFeeCents: number;
  bonusNetCents: number;
  operationState: "not_attempted" | "pending" | "succeeded" | "failed_retryable" | "failed_final" | "held_compliance";
  idempotencyKey: string;
  providerPayoutRef?: string;
}

export interface RefundBonusAuditReport {
  id: string;
  roundId: string;
  poolId: string;
  calculationVersion: typeof REFUND_BONUS_CALCULATION_VERSION;
  finalStatus: "captured" | "qualifying_failed" | "nonqualifying_failed" | "blocked" | "simulation_only";
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;
  bonusReserveBackedCents: number;
  bonusExposureReservedCents: number;
  bonusLiabilityCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnclaimedCents: number;
  bonusUnearnedReleasedCents: number;
  reasonCodes: RefundBonusFailureReason[];
  publicReportJson: unknown;
}

export interface RefundBonusSettlementPlan {
  payoutOperations: RefundBonusPayoutOperation[];
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
  failureReasonCategory?: RefundBonusFailureReason;
  bonusEligibilityStatus: "not_applicable_cleared" | "eligible" | "not_eligible";
  bonusGrossCents: number;
  bonusPayoutFeeCents: number;
  bonusNetCents: number;
  bonusPayoutState?: RefundBonusPayoutOperation["operationState"];
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

export type RefundBonusHardPledgeBlocker =
  | "feature_non_mvp"
  | "feature_disabled"
  | "production_real_money_disabled"
  | "round_not_labs_open"
  | "pool_not_labs_open"
  | "open_gate_not_passed"
  | "copy_preflight_failed"
  | "final_review_missing"
  | "fee_acknowledgement_missing"
  | "sealed_progress_acknowledgement_missing"
  | "bonus_terms_acknowledgement_missing"
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

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function roleCanUseLabs(role: RefundBonusActorRole) {
  return role === "labs_participant" || role === "admin" || role === "service";
}

function uniqueHardPledgeBlockers(blockers: RefundBonusHardPledgeBlocker[]) {
  return [...new Set(blockers)];
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

  if (input.action !== "view_labs_pool" && input.environment === "production") {
    reasons.push("production_real_money_disabled");
    if (!input.liveMoneyEnabled) {
      reasons.push("production_real_money_disabled");
    }
    if (!input.promotionRecordApproved) {
      reasons.push("missing_promotion_record");
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
    if (input.action === "execute_bonus_payout" && !input.bonusPayoutProviderReady) {
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
  return (
    pool.refundBonusEnabled &&
    pool.refundBonusReserveId === reserve.id &&
    reserve.reserveType === "failure_participation_bonus" &&
    (reserve.backingState === "funded" ||
      reserve.backingState === "escrowed" ||
      reserve.backingState === "contractually_committed" ||
      reserve.backingState === "dev_simulated") &&
    reserve.backedCents >= reserve.maxExposureCents &&
    reserve.maxExposureCents >= pool.roundBonusExposureCapCents &&
    reserve.maxExposureCents >= round.roundBonusExposureCapCents &&
    reserve.bonusPolicyHash === round.bonusPolicyHash &&
    /^sha256:[a-f0-9]{64}$/.test(reserve.sourceHash) &&
    reserve.legalComplianceState === "approved" &&
    reserve.payoutProviderReady
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
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
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
  const hardEligible = pledges.filter((pledge) =>
    pledgeEligibilityBlockers({ round, pool, gate, reserve, pledge }).length === 0
  );
  const deduped = dedupeEligiblePledges(hardEligible);
  const authorizationByPledge = new Map((authorizationAttempts ?? []).map((attempt) => [attempt.pledgeId, attempt]));
  const afterAuthorization = deduped.accepted.filter((pledge) => {
    const attempt = authorizationByPledge.get(pledge.id);
    if (!attempt) return true;
    return (
      attempt.authorizationState === "authorized_exact" &&
      attempt.requiredGrossCents === pledge.maxGrossCents &&
      attempt.authorizedGrossCents === pledge.maxGrossCents &&
      Boolean(attempt.providerAuthorizationRef) &&
      attempt.validThroughCapture
    );
  });
  const recomputedAfterAuthorization = Boolean(authorizationAttempts?.length);
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
      .map((row) => row.pledge.viewpointTag)
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
    ...deduped.excludedIds,
    ...deduped.accepted
      .filter((pledge) => !afterAuthorization.includes(pledge))
      .map((pledge) => pledge.id),
  ];

  if (baseFailure || round.copyPreflightState !== "passed" || gate.state !== "passed") {
    return {
      status: "nonqualifying_failed",
      reasonCodes: [baseFailure ?? (round.copyPreflightState !== "passed" ? "copy_preflight_failure" : "review_block")],
      eligiblePledges,
      excludedPledgeIds,
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
      reasonCodes: recomputedAfterAuthorization && excludedPledgeIds.length > 0 ? [] : [],
      eligiblePledges,
      excludedPledgeIds,
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
    excludedPledgeIds,
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

export function planRefundBonusSettlement({
  round,
  pool,
  reserve,
  outcome,
  roundStatus,
  emergencyPaused = false,
  simulationOnly = true,
}: {
  round: RefundBonusRound;
  pool: RefundBonusPledgePool;
  reserve: RefundBonusReserve;
  outcome: RefundBonusOutcome;
  roundStatus: RefundBonusRoundStatus;
  emergencyPaused?: boolean;
  simulationOnly?: boolean;
}): RefundBonusSettlementPlan {
  const blockedReasonCodes: string[] = [];
  if (!simulationOnly) blockedReasonCodes.push("production_real_money_disabled");
  if (emergencyPaused) blockedReasonCodes.push("emergency_pause_active");
  if (!isRefundBonusReserveBacked(reserve, round, pool)) blockedReasonCodes.push("bonus_reserve_unbacked");
  if (outcome.status === "qualifying_failed" && roundStatus !== "bonus_payable" && roundStatus !== "bonus_paying") {
    blockedReasonCodes.push("round_not_bonus_payable");
  }

  const payoutOperations = outcome.status === "qualifying_failed" && blockedReasonCodes.length === 0
    ? outcome.eligiblePledges.map((row) => ({
      id: `${row.pledge.id}:refund-bonus-payout`,
      roundId: round.id,
      poolId: pool.id,
      pledgeId: row.pledge.id,
      participantId: row.pledge.participantId,
      reserveId: reserve.id,
      bonusGrossCents: row.bonusEligibleCents,
      bonusPayoutFeeCents: 0,
      bonusNetCents: row.bonusEligibleCents,
      operationState: "succeeded" as const,
      idempotencyKey: `refund-bonus:${round.id}:${pool.id}:${row.pledge.id}`,
      providerPayoutRef: simulationOnly ? `simulated:${row.pledge.id}` : undefined,
    }))
    : [];
  const bonusLiabilityCents = outcome.status === "qualifying_failed"
    ? outcome.eligiblePledges.reduce((sum, row) => sum + row.bonusEligibleCents, 0)
    : 0;
  const bonusPaidCents = payoutOperations.reduce((sum, operation) => sum + operation.bonusNetCents, 0);
  const success = outcome.status === "cleared";
  const finalStatus = blockedReasonCodes.length > 0
    ? "blocked"
    : success
      ? "captured"
      : outcome.status === "qualifying_failed"
        ? "qualifying_failed"
        : "nonqualifying_failed";
  const feeCents = success ? outcome.eligiblePledges.reduce((sum, row) => sum + row.pledge.feeCents, 0) : 0;
  const grossCapturedCents = success ? outcome.grossExposureCents : 0;
  const netRecipientDisbursedCents = success ? outcome.netRecipientCents : 0;
  const bonusUnearnedReleasedCents = outcome.status === "qualifying_failed"
    ? Math.max(0, outcome.bonusExposureReservedCents - bonusLiabilityCents)
    : outcome.bonusExposureReservedCents;

  return {
    payoutOperations,
    blockedReasonCodes,
    auditReport: {
      id: `${round.id}:${pool.id}:refund-bonus-audit`,
      roundId: round.id,
      poolId: pool.id,
      calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
      finalStatus,
      grossCapturedCents,
      feeCents,
      netRecipientDisbursedCents,
      actualGrossExposureCents: outcome.grossExposureCents,
      countedCents: success ? outcome.netRecipientCents : 0,
      matchEligibleCents: success ? outcome.netRecipientCents : 0,
      sponsorBaseMatchCents: success ? outcome.sponsorMatchCents : 0,
      bonusReserveBackedCents: reserve.backedCents,
      bonusExposureReservedCents: outcome.bonusExposureReservedCents,
      bonusLiabilityCents,
      bonusPaidCents,
      bonusPayoutFeeCents: payoutOperations.reduce((sum, operation) => sum + operation.bonusPayoutFeeCents, 0),
      bonusUnclaimedCents: Math.max(0, bonusLiabilityCents - bonusPaidCents),
      bonusUnearnedReleasedCents,
      reasonCodes: outcome.reasonCodes,
      publicReportJson: {
        grossCapturedCents,
        feeCents,
        netRecipientDisbursedCents,
        actualGrossExposureCents: outcome.grossExposureCents,
        countedCents: success ? outcome.netRecipientCents : 0,
        matchEligibleCents: success ? outcome.netRecipientCents : 0,
        sponsorBaseMatchCents: success ? outcome.sponsorMatchCents : 0,
        bonusReserveBackedCents: reserve.backedCents,
        bonusExposureReservedCents: outcome.bonusExposureReservedCents,
        bonusLiabilityCents,
        bonusPaidCents,
        bonusUnearnedReleasedCents,
        finalStatus: outcome.status,
        reasonCodes: outcome.reasonCodes,
      },
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
  const finalStatus = plan.auditReport.finalStatus;

  if (finalStatus === "captured") {
    const netRecipientDisbursedCents = Math.max(0, pledge.maxGrossCents - pledge.feeCents);

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
      bonusEligibilityStatus: "not_applicable_cleared",
      bonusGrossCents: 0,
      bonusPayoutFeeCents: 0,
      bonusNetCents: 0,
      authorizationReference: authorizationAttempt?.providerAuthorizationRef,
      captureReference: authorizationAttempt?.authorizationState === "authorized_exact"
        ? `capture:${authorizationAttempt.providerAuthorizationRef ?? pledge.id}`
        : undefined,
      rulebookHash: round.rulebookHash,
      feePolicyHash: round.feePolicyHash,
      bonusPolicyHash: round.bonusPolicyHash,
      copy: `The pool cleared. Gross captured: ${pledge.maxGrossCents} cents. Fees: ${pledge.feeCents} cents. Net sent to reviewed projects: ${netRecipientDisbursedCents} cents. Failure bonus: 0 cents because the pool cleared.`,
    };
  }

  if (finalStatus === "qualifying_failed") {
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
      failureReasonCategory: plan.auditReport.reasonCodes[0],
      bonusEligibilityStatus: payoutOperation ? "eligible" : "not_eligible",
      bonusGrossCents: payoutOperation?.bonusGrossCents ?? 0,
      bonusPayoutFeeCents: payoutOperation?.bonusPayoutFeeCents ?? 0,
      bonusNetCents: payoutOperation?.bonusNetCents ?? 0,
      bonusPayoutState: payoutOperation?.operationState,
      bonusPayoutReference: payoutOperation?.providerPayoutRef,
      bonusReserveId: reserve.id,
      rulebookHash: round.rulebookHash,
      bonusPolicyHash: round.bonusPolicyHash,
      copy: `The pool did not clear. You were charged 0 cents. Project funding: 0 cents. Failure reason: ${plan.auditReport.reasonCodes[0] ?? "support_threshold_shortfall"}. Backed failure-participation bonus: ${payoutOperation?.bonusGrossCents ?? 0} cents.`,
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
  ["investment", /\binvestment\b/i],
  ["interest", /\binterest\b/i],
  ["lottery", /\blottery\b/i],
  ["guaranteed return", /\bguaranteed\s+return\b/i],
  ["cashback", /\bcashback\b/i],
  ["guaranteed bonus", /\bguaranteed\s+bonus\b/i],
  ["impact", /\bbonus\s+impact\b/i],
  ["held", /\bfunds\s+(?:are\s+)?held\b/i],
  ["escrow", /\bescrow(?:ed)?\b/i],
  ["protected", /\bprotected\b/i],
  ["reserved", /\bfunds\s+(?:are\s+)?reserved\b/i],
  ["authorized", /\bsaved.*authorized\b/i],
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
    .replace(/\bnot\s+public-good\s+impact\b/gi, "");
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
