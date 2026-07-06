import { createHash } from "node:crypto";

export const AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY =
  "cgpp_at_least_tier_platform_match_non_mvp_v0_1" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_LIVE_MONEY_FLAG =
  "at_least_tier_platform_match_live_money_enabled" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE =
  "at_least_tier_platform_match_non_mvp_labs" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION =
  "at_least_tier_platform_match_v0_1" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION =
  "damped_odds_sqrt_v0_1" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION = "non_mvp" as const;
export const AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING =
  "Non-MVP mechanism. Not part of the current Common Ground Pledge Pool MVP. Production real-money use is disabled unless this mechanism is explicitly promoted.";

const BPS_DENOMINATOR = 10_000;
const SQRT_SCALE = BigInt(1_000_000_000_000);

export type AtLeastTierPlatformMatchAction =
  | "view_labs_landing"
  | "view_public_landing"
  | "create_config"
  | "create_round"
  | "open_round"
  | "create_commitment"
  | "save_payment_method"
  | "authorize_loss_payment"
  | "capture_loss_payment"
  | "release_winner_authorization"
  | "compute_reward_schedule"
  | "compute_resolution"
  | "approve_settlement"
  | "execute_platform_match_contribution"
  | "execute_user_loss_contribution"
  | "publish_public_report"
  | "seed_demo_data";

export type AtLeastTierPlatformMatchActorRole = "public" | "labs_participant" | "admin" | "service";
export type AtLeastTierPlatformMatchEnvironment = "production" | "preview" | "development" | "test";
export type AtLeastTierPlatformMatchCapabilityReason =
  | "feature_non_mvp"
  | "feature_disabled"
  | "public_surface_disabled"
  | "production_real_money_disabled"
  | "missing_promotion_record"
  | "insufficient_role"
  | "missing_platform_match_reserve"
  | "platform_match_reserve_unbacked"
  | "damped_odds_schedule_invalid"
  | "payment_mode_not_allowed_for_non_mvp"
  | "route_not_available_in_current_deployment"
  | "copy_preflight_failed"
  | "legal_compliance_not_approved"
  | "payment_provider_not_ready"
  | "sybil_controls_not_ready"
  | "emergency_pause_active";

export interface AtLeastTierPlatformMatchCapabilityInput {
  action: AtLeastTierPlatformMatchAction;
  actorRole: AtLeastTierPlatformMatchActorRole;
  environment: AtLeastTierPlatformMatchEnvironment;
  featureEnabled?: boolean;
  liveMoneyEnabled?: boolean;
  promotionRecordApproved?: boolean;
  platformMatchReserveExists?: boolean;
  platformMatchReserveBacked?: boolean;
  rewardScheduleFrozen?: boolean;
  rewardScheduleValid?: boolean;
  copyPreflightPassed?: boolean;
  paymentProviderReady?: boolean;
  legalComplianceApproved?: boolean;
  sybilControlsReady?: boolean;
  emergencyPaused?: boolean;
}

export interface AtLeastTierPlatformMatchCapabilityResult {
  allowed: boolean;
  reasons: AtLeastTierPlatformMatchCapabilityReason[];
  featureKey: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY;
  featureClassification: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION;
  deploymentMode: typeof AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE;
  productionPublicEnabled: false;
  productionRealMoneyEnabled: false;
}

export interface AtLeastTierPlatformMatchRound {
  id: string;
  poolId: string;
  roundId?: string;
  featureKey: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY;
  deploymentMode: typeof AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE;
  featureClassification: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION;
  status:
    | "draft"
    | "preflight"
    | "labs_open"
    | "open"
    | "closed_to_new_commitments"
    | "reviewing"
    | "authorizing"
    | "resolving"
    | "settlement_planned"
    | "payable"
    | "settling"
    | "settled"
    | "released"
    | "blocked"
    | "canceled";
  opensAt: string;
  closesAt: string;
  parametersFrozenAt: string;
  rulebookHash: string;
  feePolicyHash: string;
  platformMatchPolicyHash: string;
  rewardScheduleHash: string;
  calculationVersion: typeof AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION;
  sealedProgressMode: "qualitative_only_before_close";
  productionPublicEnabled: boolean;
  productionRealMoneyEnabled: boolean;
  promotionRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicGoodTierInput {
  id?: string;
  tierIndex: number;
  thresholdNetRecipientCents: number;
  frozenForecastProbabilityBps: number;
  publicLabel?: string;
}

export interface PublicGoodTier {
  id: string;
  roundId: string;
  tierIndex: number;
  publicLabel: string;
  thresholdNetRecipientCents: number;
  frozenForecastProbabilityBps: number;
  oddsAgainstDecimalString: string;
  rewardRateBps: number;
  scheduleVersion: typeof AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION;
  createdAt: string;
}

export interface DampedOddsRewardSchedule {
  id: string;
  roundId: string;
  scheduleVersion: typeof AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION;
  rMinBps: number;
  rMaxBps: number;
  gammaDecimalString: string;
  qMinBps: number;
  qMaxBps: number;
  minRewardIncrementBps: number;
  fallbackMode: "fail_closed" | "capped_geometric_dev_only";
  inputHash: string;
  outputHash: string;
  state: "draft" | "computed" | "frozen" | "invalid" | "superseded";
  invalidReasonCodes: string[];
  createdAt: string;
  frozenAt?: string;
}

export interface DampedOddsRewardScheduleInput {
  id?: string;
  roundId: string;
  tiers: PublicGoodTierInput[];
  rMinBps?: number;
  rMaxBps?: number;
  gammaDecimalString?: string;
  qMinBps?: number;
  qMaxBps?: number;
  minRewardIncrementBps?: number;
  fallbackMode?: "fail_closed" | "capped_geometric_dev_only";
  freeze?: boolean;
  now?: string;
}

export interface DampedOddsRewardScheduleResult {
  valid: boolean;
  schedule: DampedOddsRewardSchedule;
  tiers: PublicGoodTier[];
}

export type AtLeastTierPlatformMatchCommitmentState =
  | "draft"
  | "hard_saved"
  | "excluded_identity"
  | "excluded_payment"
  | "excluded_sybil"
  | "excluded_same_control"
  | "excluded_review"
  | "authorized_for_possible_loss"
  | "won_platform_pays"
  | "lost_user_pays"
  | "user_loss_captured"
  | "platform_match_paid"
  | "released"
  | "settled"
  | "blocked"
  | "canceled";

export interface AtLeastTierPlatformMatchCommitment {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;
  selectedTierIndex: number;
  statedGrossCents: number;
  estimatedFeeCents: number;
  statedNetRecipientCents: number;
  platformMatchRewardRateBps: number;
  platformMatchNetCents: number;
  platformMatchGrossCostCents: number;
  guaranteedEffectiveSupportCents: number;
  viewpointCluster?: string;
  visibility: "aggregate_only";
  commitmentState: AtLeastTierPlatformMatchCommitmentState;
  paymentCommitmentSnapshotId?: string;
  identityEligibilitySnapshotId?: string;
  sameControlClusterId?: string;
  platformMatchReserveId: string;
  platformMatchExposureReservedCents: number;
  rulebookHashAtConsent: string;
  feePolicyHashAtConsent: string;
  platformMatchPolicyHashAtConsent: string;
  finalReviewConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AtLeastTierLossAuthorizationAttempt {
  id: string;
  roundId: string;
  poolId: string;
  commitmentId: string;
  participantId: string;
  requiredGrossCents: number;
  providerAuthorizationRef?: string;
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

export interface AtLeastTierAuthorizationReconciliationResult {
  commitments: AtLeastTierPlatformMatchCommitment[];
  excludedCommitmentIds: string[];
  exactAuthorizedCommitmentIds: string[];
  authorizationFailureCount: number;
}

export interface OrdinaryDirectHardPledge {
  id: string;
  participantId: string;
  sameControlClusterId?: string;
  netRecipientCents: number;
  state: "draft" | "hard_saved" | "captured" | "payment_failed" | "blocked" | "stale_authorization";
}

export interface AtLeastTierResolutionSnapshot {
  id: string;
  roundId: string;
  inputHash: string;
  outputHash: string;
  resolvedAt: string;
  eligibleCommitmentCount: number;
  excludedCommitmentCount: number;
  ordinaryDirectPledgeSupportCents: number;
  effectiveSupportTotalCents: number;
  resolutionMethod: "leave_one_cluster_out_effective_support";
  status: "computed" | "approved" | "superseded" | "blocked";
  createdAt: string;
}

export interface AtLeastTierResolutionRow {
  id: string;
  resolutionSnapshotId: string;
  roundId: string;
  commitmentId: string;
  participantId: string;
  selectedTierIndex: number;
  selectedTierThresholdNetCents: number;
  statedNetRecipientCents: number;
  rewardRateBps: number;
  platformMatchNetCents: number;
  guaranteedEffectiveSupportCents: number;
  otherEligibleEffectiveSupportCents: number;
  excludedSameControlEffectiveSupportCents: number;
  won: boolean;
  outcome: "won_platform_pays" | "lost_user_pays" | "excluded";
  exclusionReason?: string;
  rowHash: string;
  createdAt: string;
}

export interface AtLeastTierResolutionResult {
  snapshot: AtLeastTierResolutionSnapshot;
  rows: AtLeastTierResolutionRow[];
}

interface AtLeastTierEffectiveSupportSource {
  id: string;
  participantId: string;
  sameControlClusterId?: string;
  effectiveSupportCents: number;
  sourceType: "at_least_tier" | "ordinary_direct_pledge";
}

export interface PlatformMatchReserve {
  id: string;
  roundId: string;
  poolId: string;
  reserveType: "at_least_tier_platform_match";
  backedCents: number;
  committedCents: number;
  paidCents: number;
  releasedUnusedCents: number;
  maxExposureCents: number;
  backingState: "funded" | "escrowed" | "contractually_committed" | "unbacked" | "dev_simulated";
  legalComplianceState: "approved" | "review" | "blocked";
  paymentProviderReady: boolean;
  recipientRouteReady: boolean;
  sourceHash: string;
  platformMatchPolicyHash: string;
  status: "draft" | "backed" | "active" | "paying" | "paid" | "released_unused" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export interface PlatformMatchContributionOperation {
  id: string;
  roundId: string;
  commitmentId: string;
  reserveId: string;
  destinationProjectId: string;
  grossCostCents: number;
  feeCents: number;
  netRecipientCents: number;
  currency: "usd";
  providerOperationRef?: string;
  operationState:
    | "not_attempted"
    | "pending"
    | "succeeded"
    | "failed_retryable"
    | "failed_final"
    | "held_compliance"
    | "reversed";
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export type AtLeastTierSettlementLedgerEntryType =
  | "user_authorization"
  | "user_capture"
  | "user_release"
  | "platform_match_reserve_commitment"
  | "platform_match_reserve_disbursement"
  | "platform_match_exposure_release"
  | "project_disbursement"
  | "fee"
  | "provider_operation_reconciliation";

export interface AtLeastTierSettlementLedgerEntry {
  id: string;
  roundId: string;
  commitmentId: string;
  entryType: AtLeastTierSettlementLedgerEntryType;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
  currency: "usd";
  simulationOnly: boolean;
  providerOperationRef?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface AtLeastTierSettlementRow {
  id: string;
  roundId: string;
  commitmentId: string;
  participantId: string;
  outcome: "won_platform_pays" | "lost_user_pays" | "excluded" | "blocked";
  userGrossCapturedCents: number;
  userFeeCents: number;
  userNetRecipientDisbursedCents: number;
  platformMatchGrossCostCents: number;
  platformMatchFeeCents: number;
  platformMatchNetRecipientDisbursedCents: number;
  platformMatchExposureReservedCents: number;
  platformMatchExposureReleasedCents: number;
  finalProjectDisbursementCents: number;
  userAuthorizationOperation: "release" | "capture" | "simulated_capture" | "none";
  userAuthorizationIdempotencyKey?: string;
  settlementState:
    | "pending"
    | "captured_user_loss"
    | "simulated_user_loss"
    | "paid_platform_match"
    | "released"
    | "blocked"
    | "failed"
    | "settled";
  createdAt: string;
}

export interface AtLeastTierAuditReport {
  id: string;
  roundId: string;
  calculationVersion: typeof AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION;
  rulebookHash: string;
  feePolicyHash: string;
  platformMatchPolicyHash: string;
  rewardScheduleHash: string;
  grossUserLossCapturedCents: number;
  userLossFeeCents: number;
  userLossNetRecipientCents: number;
  platformMatchReserveBackedCents: number;
  platformMatchExposureReservedCents: number;
  platformMatchGrossPaidCents: number;
  platformMatchFeeCents: number;
  platformMatchNetRecipientCents: number;
  platformMatchUnusedReleasedCents: number;
  ordinaryDirectPledgeNetCents: number;
  sponsorMatchNetRecipientCents: number;
  finalProjectDisbursementCents: number;
  eligibleCommitmentCount: number;
  winningCommitmentCount: number;
  losingCommitmentCount: number;
  excludedIdentityCount: number;
  excludedPaymentCount: number;
  excludedSybilCount: number;
  excludedSameControlCount: number;
  authorizationFailureCount: number;
  finalStatus: "settled" | "blocked" | "canceled" | "simulation_only";
  publicReportJson: AtLeastTierPublicReportJson;
  publishedAt?: string;
}

export interface AtLeastTierPublicReportJson {
  forecastCommitmentGrossCents: number;
  forecastCommitmentNetRecipientCents: number;
  forecastResolutionOtherUserNetCents: number;
  selectedAtLeastTier: Record<string, number>;
  resolvedAtLeastTier: number | null;
  forecastWon: {
    wonCount: number;
    lostCount: number;
    excludedCount: number;
  };
  userPaidOnLossCents: number;
  platformPaidOnWinCents: number;
  platformMatchReserveBackedCents: number;
  platformMatchExposureReservedCents: number;
  platformMatchPaidCents: number;
  platformMatchReleasedUnusedCents: number;
  ordinaryDirectPledgeNetCents: number;
  sponsorMatchNetRecipientCents: number;
  finalProjectDisbursementCents: number;
  feesCents: number;
  note: string;
}

export interface AtLeastTierSettlementPlan {
  rows: AtLeastTierSettlementRow[];
  platformMatchOperations: PlatformMatchContributionOperation[];
  ledgerEntries: AtLeastTierSettlementLedgerEntry[];
  auditReport: AtLeastTierAuditReport;
  blockedReasonCodes: string[];
}

export interface AtLeastTierReviewedSeedPool {
  id: string;
  roundId: string;
  title: string;
  projectIds: [string, string] | [string, string, string];
  projectReviewState: "reviewed_moral_public_good";
  recipientRouteState: "verified";
  createdAt: string;
}

export interface AtLeastTierOrdinaryCopyPreflight {
  passed: boolean;
  blockedTerms: string[];
  missingRequiredClaims: string[];
}

export interface AtLeastTierCopyPreflightReport {
  id: string;
  roundId: string;
  checkedAt: string;
  lastDeployHash: string;
  checkedRoutes: string[];
  prohibitedTermsFound: string[];
  missingRequiredClaims: string[];
  publicMvpSurfaceLeakFound: boolean;
  liveMoneyOverclaimFound: boolean;
  exactProgressLeakFound: boolean;
  ordinaryCopyPass: boolean;
  pass: boolean;
  reportHash: string;
}

export interface AtLeastTierFeaturePromotionRecord {
  id: string;
  featureKey: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY;
  fromClassification: typeof AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION;
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

export interface AtLeastTierDevSeedData {
  allowed: boolean;
  blockerCodes: string[];
  productionSeedCreatesActiveRecords: false;
  publicRoutes: string[];
  round?: AtLeastTierPlatformMatchRound;
  reviewedPool?: AtLeastTierReviewedSeedPool;
  schedule?: DampedOddsRewardSchedule;
  tiers: PublicGoodTier[];
  reserve?: PlatformMatchReserve;
  commitments: AtLeastTierPlatformMatchCommitment[];
  ordinaryDirectPledges: OrdinaryDirectHardPledge[];
  resolution?: AtLeastTierResolutionResult;
  settlementPlan?: AtLeastTierSettlementPlan;
  reserveInsufficiencyPlan?: AtLeastTierSettlementPlan;
  circularityResolution?: AtLeastTierResolutionResult;
}

export type AtLeastTierAdminWorkflowAction =
  | "create_draft_labs_round"
  | "configure_reviewed_pool"
  | "configure_tiers"
  | "enter_frozen_forecast_probabilities"
  | "compute_reward_schedule"
  | "inspect_reward_schedule"
  | "freeze_reward_schedule"
  | "configure_platform_match_reserve"
  | "run_copy_preflight"
  | "run_simulated_commitments"
  | "run_simulated_authorization_resolution_settlement"
  | "view_audit_report"
  | "pause_or_kill_switch"
  | "open_public_real_money_round"
  | "accept_public_real_money_commitments"
  | "execute_real_payment_authorization_capture"
  | "execute_live_platform_match_contribution"
  | "publish_live_public_report";

export type AtLeastTierJobAction =
  | "resolution_job"
  | "settlement_job"
  | "scheduled_close_job"
  | "public_report_job";

export type AtLeastTierOperationalBlocker =
  | "feature_non_mvp"
  | "feature_disabled"
  | "insufficient_role"
  | "production_real_money_disabled"
  | "missing_promotion_record"
  | "invalid_damped_odds_schedule"
  | "schedule_not_frozen"
  | "reserve_unbacked"
  | "reserve_exposure_exceeded"
  | "copy_preflight_failed"
  | "legal_compliance_not_approved"
  | "payment_provider_not_ready"
  | "sybil_controls_not_ready"
  | "emergency_pause_active"
  | "simulation_only_allowed_in_dev_or_test"
  | "public_report_live_product_copy_blocked"
  | "round_not_labs_open"
  | "payment_method_not_confirmed"
  | "final_review_consent_missing"
  | "own_commitment_exclusion_ack_missing"
  | "loss_charge_ack_missing"
  | "no_direct_payout_ack_missing"
  | "non_mvp_ack_missing";

export interface AtLeastTierAdminWorkflowInput {
  action: AtLeastTierAdminWorkflowAction;
  actorRole: AtLeastTierPlatformMatchActorRole;
  environment: AtLeastTierPlatformMatchEnvironment;
  featureEnabled?: boolean;
  liveMoneyEnabled?: boolean;
  promotionRecordApproved?: boolean;
  rewardScheduleFrozen?: boolean;
  rewardScheduleValid?: boolean;
  reserveBacked?: boolean;
  reserveExposureExceeded?: boolean;
  copyPreflightPassed?: boolean;
  legalComplianceApproved?: boolean;
  paymentProviderReady?: boolean;
  sybilControlsReady?: boolean;
  emergencyPaused?: boolean;
}

export interface AtLeastTierJobGateInput {
  job: AtLeastTierJobAction;
  actorRole: AtLeastTierPlatformMatchActorRole;
  environment: AtLeastTierPlatformMatchEnvironment;
  featureEnabled?: boolean;
  simulationOnly?: boolean;
  liveMoneyEnabled?: boolean;
  promotionRecordApproved?: boolean;
  rewardScheduleFrozen?: boolean;
  rewardScheduleValid?: boolean;
  reserveBacked?: boolean;
  reserveExposureExceeded?: boolean;
  copyPreflightPassed?: boolean;
  legalComplianceApproved?: boolean;
  paymentProviderReady?: boolean;
  sybilControlsReady?: boolean;
  emergencyPaused?: boolean;
  publicReportImpliesLiveProduct?: boolean;
}

export interface AtLeastTierCommitmentOpenGateInput {
  actorRole: AtLeastTierPlatformMatchActorRole;
  environment: AtLeastTierPlatformMatchEnvironment;
  roundId: string;
  poolId: string;
  roundStatus: "draft" | "preflight" | "labs_open" | "open" | "closed_to_new_commitments" | "blocked" | "canceled";
  featureEnabled?: boolean;
  rewardScheduleFrozen?: boolean;
  rewardScheduleValid?: boolean;
  reserve: PlatformMatchReserve;
  currentReservedExposureCents: number;
  requestedExposureCents: number;
  copyPreflightPassed?: boolean;
  paymentMethodProviderConfirmed?: boolean;
  finalReviewConfirmed?: boolean;
  ownCommitmentExclusionAcknowledged?: boolean;
  lossChargeAcknowledged?: boolean;
  noDirectPayoutAcknowledged?: boolean;
  nonMvpAcknowledged?: boolean;
  emergencyPaused?: boolean;
}

export interface AtLeastTierOperationalGateResult {
  allowed: boolean;
  providerCallsAllowed: boolean;
  blockerCodes: AtLeastTierOperationalBlocker[];
}

const ADMIN_OR_SERVICE_ACTIONS = new Set<AtLeastTierPlatformMatchAction>([
  "create_config",
  "create_round",
  "open_round",
  "compute_reward_schedule",
  "compute_resolution",
  "approve_settlement",
  "publish_public_report",
  "seed_demo_data",
]);

const MONEY_OR_PROVIDER_ACTIONS = new Set<AtLeastTierPlatformMatchAction>([
  "save_payment_method",
  "authorize_loss_payment",
  "capture_loss_payment",
  "release_winner_authorization",
  "execute_platform_match_contribution",
  "execute_user_loss_contribution",
]);

const COMMITMENT_ACTIONS = new Set<AtLeastTierPlatformMatchAction>([
  "create_commitment",
  "save_payment_method",
  "authorize_loss_payment",
  "capture_loss_payment",
  "release_winner_authorization",
  "execute_platform_match_contribution",
  "execute_user_loss_contribution",
]);

const PRODUCTION_PROMOTION_REQUIRED_ACTIONS = new Set<AtLeastTierPlatformMatchAction>([
  "open_round",
  "publish_public_report",
]);

const LIVE_ADMIN_WORKFLOW_ACTIONS = new Set<AtLeastTierAdminWorkflowAction>([
  "open_public_real_money_round",
  "accept_public_real_money_commitments",
  "execute_real_payment_authorization_capture",
  "execute_live_platform_match_contribution",
  "publish_live_public_report",
]);

const SCHEDULE_DEPENDENT_ADMIN_ACTIONS = new Set<AtLeastTierAdminWorkflowAction>([
  "run_simulated_authorization_resolution_settlement",
  "open_public_real_money_round",
  "accept_public_real_money_commitments",
  "execute_real_payment_authorization_capture",
  "execute_live_platform_match_contribution",
  "publish_live_public_report",
]);

const RESERVE_DEPENDENT_ADMIN_ACTIONS = new Set<AtLeastTierAdminWorkflowAction>([
  "run_simulated_commitments",
  "run_simulated_authorization_resolution_settlement",
  "open_public_real_money_round",
  "accept_public_real_money_commitments",
  "execute_real_payment_authorization_capture",
  "execute_live_platform_match_contribution",
  "publish_live_public_report",
]);

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

function nowIso(value?: string) {
  return value ?? new Date(0).toISOString();
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isCanonicalHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isRoleAllowedForLabs(role: AtLeastTierPlatformMatchActorRole) {
  return role === "labs_participant" || role === "admin" || role === "service";
}

function isRoleAllowedForAdminAction(role: AtLeastTierPlatformMatchActorRole) {
  return role === "admin" || role === "service";
}

function uniqueReasons(reasons: AtLeastTierPlatformMatchCapabilityReason[]) {
  return [...new Set(reasons)];
}

function uniqueOperationalBlockers(blockers: AtLeastTierOperationalBlocker[]) {
  return [...new Set(blockers)];
}

export function isAtLeastTierRoundReadyForLabs(round: AtLeastTierPlatformMatchRound) {
  return (
    round.featureKey === AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY &&
    round.deploymentMode === AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE &&
    round.featureClassification === AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION &&
    round.calculationVersion === AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION &&
    round.sealedProgressMode === "qualitative_only_before_close" &&
    round.productionPublicEnabled === false &&
    round.productionRealMoneyEnabled === false &&
    round.opensAt <= round.closesAt &&
    round.parametersFrozenAt <= round.opensAt &&
    isCanonicalHash(round.rulebookHash) &&
    isCanonicalHash(round.feePolicyHash) &&
    isCanonicalHash(round.platformMatchPolicyHash) &&
    isCanonicalHash(round.rewardScheduleHash)
  );
}

export function isAtLeastTierFeaturePromotionApproved(record: AtLeastTierFeaturePromotionRecord) {
  return (
    record.featureKey === AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY &&
    record.fromClassification === AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION &&
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

export function evaluateAtLeastTierPlatformMatchCapability(
  input: AtLeastTierPlatformMatchCapabilityInput,
): AtLeastTierPlatformMatchCapabilityResult {
  const reasons: AtLeastTierPlatformMatchCapabilityReason[] = ["feature_non_mvp"];

  if (!input.featureEnabled) {
    reasons.push("feature_disabled");
  }

  if (input.action === "view_public_landing") {
    reasons.push("public_surface_disabled");
    reasons.push("route_not_available_in_current_deployment");
  }

  if (!isRoleAllowedForLabs(input.actorRole)) {
    reasons.push("insufficient_role");
  }

  if (ADMIN_OR_SERVICE_ACTIONS.has(input.action) && !isRoleAllowedForAdminAction(input.actorRole)) {
    reasons.push("insufficient_role");
  }

  if (input.emergencyPaused && input.action !== "view_labs_landing") {
    reasons.push("emergency_pause_active");
  }

  if (COMMITMENT_ACTIONS.has(input.action) && input.environment === "production") {
    reasons.push("production_real_money_disabled");
    reasons.push("payment_mode_not_allowed_for_non_mvp");
  }

  if (PRODUCTION_PROMOTION_REQUIRED_ACTIONS.has(input.action) && input.environment === "production") {
    if (!input.liveMoneyEnabled) {
      reasons.push("production_real_money_disabled");
    }
    if (!input.promotionRecordApproved) {
      reasons.push("missing_promotion_record");
    }
    if (input.action === "open_round") {
      if (!input.platformMatchReserveExists) {
        reasons.push("missing_platform_match_reserve");
      }
      if (!input.platformMatchReserveBacked) {
        reasons.push("platform_match_reserve_unbacked");
      }
      if (!input.rewardScheduleFrozen || !input.rewardScheduleValid) {
        reasons.push("damped_odds_schedule_invalid");
      }
      if (!input.legalComplianceApproved) {
        reasons.push("legal_compliance_not_approved");
      }
      if (!input.paymentProviderReady) {
        reasons.push("payment_provider_not_ready");
      }
      if (!input.sybilControlsReady) {
        reasons.push("sybil_controls_not_ready");
      }
    }
    if (!input.copyPreflightPassed) {
      reasons.push("copy_preflight_failed");
    }
  }

  if (MONEY_OR_PROVIDER_ACTIONS.has(input.action)) {
    if (input.environment !== "production") {
      reasons.push("payment_mode_not_allowed_for_non_mvp");
    }
    if (!input.liveMoneyEnabled) {
      reasons.push("production_real_money_disabled");
    }
    if (!input.promotionRecordApproved) {
      reasons.push("missing_promotion_record");
    }
    if (!input.platformMatchReserveExists) {
      reasons.push("missing_platform_match_reserve");
    }
    if (!input.platformMatchReserveBacked) {
      reasons.push("platform_match_reserve_unbacked");
    }
    if (!input.rewardScheduleFrozen || !input.rewardScheduleValid) {
      reasons.push("damped_odds_schedule_invalid");
    }
    if (!input.copyPreflightPassed) {
      reasons.push("copy_preflight_failed");
    }
    if (!input.legalComplianceApproved) {
      reasons.push("legal_compliance_not_approved");
    }
    if (!input.paymentProviderReady) {
      reasons.push("payment_provider_not_ready");
    }
    if (!input.sybilControlsReady) {
      reasons.push("sybil_controls_not_ready");
    }
  }

  const hardReasons = uniqueReasons(reasons).filter((reason) => reason !== "feature_non_mvp");

  return {
    allowed: hardReasons.length === 0,
    reasons: uniqueReasons(reasons),
    featureKey: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
    featureClassification: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION,
    deploymentMode: AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE,
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
  };
}

export function assertAtLeastTierPlatformMatchCapability(
  input: AtLeastTierPlatformMatchCapabilityInput,
) {
  const result = evaluateAtLeastTierPlatformMatchCapability(input);

  if (!result.allowed) {
    throw new Error(`At-least-tier platform-match action blocked: ${result.reasons.join(",")}`);
  }

  return result;
}

export function evaluateAtLeastTierAdminWorkflow(
  input: AtLeastTierAdminWorkflowInput,
): AtLeastTierOperationalGateResult {
  const blockerCodes: AtLeastTierOperationalBlocker[] = [];

  if (!input.featureEnabled) {
    blockerCodes.push("feature_disabled");
  }
  if (!isRoleAllowedForAdminAction(input.actorRole)) {
    blockerCodes.push("insufficient_role");
  }
  if (input.emergencyPaused && input.action !== "pause_or_kill_switch") {
    blockerCodes.push("emergency_pause_active");
  }
  if (SCHEDULE_DEPENDENT_ADMIN_ACTIONS.has(input.action)) {
    if (!input.rewardScheduleValid) {
      blockerCodes.push("invalid_damped_odds_schedule");
    }
    if (!input.rewardScheduleFrozen) {
      blockerCodes.push("schedule_not_frozen");
    }
  }
  if (RESERVE_DEPENDENT_ADMIN_ACTIONS.has(input.action)) {
    if (!input.reserveBacked) {
      blockerCodes.push("reserve_unbacked");
    }
    if (input.reserveExposureExceeded) {
      blockerCodes.push("reserve_exposure_exceeded");
    }
  }
  if (LIVE_ADMIN_WORKFLOW_ACTIONS.has(input.action)) {
    blockerCodes.push("feature_non_mvp");
    if (!input.liveMoneyEnabled || input.environment === "production") {
      blockerCodes.push("production_real_money_disabled");
    }
    if (!input.promotionRecordApproved) {
      blockerCodes.push("missing_promotion_record");
    }
    if (!input.copyPreflightPassed) {
      blockerCodes.push("copy_preflight_failed");
    }
    if (!input.legalComplianceApproved) {
      blockerCodes.push("legal_compliance_not_approved");
    }
    if (!input.paymentProviderReady) {
      blockerCodes.push("payment_provider_not_ready");
    }
    if (!input.sybilControlsReady) {
      blockerCodes.push("sybil_controls_not_ready");
    }
  }

  const uniqueBlockerCodes = uniqueOperationalBlockers(blockerCodes);

  return {
    allowed: uniqueBlockerCodes.length === 0,
    providerCallsAllowed: false,
    blockerCodes: uniqueBlockerCodes,
  };
}

export function evaluateAtLeastTierJobGate(input: AtLeastTierJobGateInput): AtLeastTierOperationalGateResult {
  const blockerCodes: AtLeastTierOperationalBlocker[] = [];
  const simulationOnly = input.simulationOnly ?? true;

  if (!input.featureEnabled) {
    blockerCodes.push("feature_disabled");
  }
  if (!isRoleAllowedForAdminAction(input.actorRole)) {
    blockerCodes.push("insufficient_role");
  }
  if (input.emergencyPaused) {
    blockerCodes.push("emergency_pause_active");
  }
  if (!input.rewardScheduleValid) {
    blockerCodes.push("invalid_damped_odds_schedule");
  }
  if (!input.rewardScheduleFrozen) {
    blockerCodes.push("schedule_not_frozen");
  }

  if (input.job === "scheduled_close_job" && input.environment !== "development" && input.environment !== "test") {
    blockerCodes.push("simulation_only_allowed_in_dev_or_test");
  }

  if (input.job === "settlement_job") {
    if (!input.reserveBacked) {
      blockerCodes.push("reserve_unbacked");
    }
    if (input.reserveExposureExceeded) {
      blockerCodes.push("reserve_exposure_exceeded");
    }
    if (!simulationOnly) {
      blockerCodes.push("feature_non_mvp");
      if (!input.liveMoneyEnabled || input.environment === "production") {
        blockerCodes.push("production_real_money_disabled");
      }
      if (!input.promotionRecordApproved) {
        blockerCodes.push("missing_promotion_record");
      }
      if (!input.copyPreflightPassed) {
        blockerCodes.push("copy_preflight_failed");
      }
      if (!input.legalComplianceApproved) {
        blockerCodes.push("legal_compliance_not_approved");
      }
      if (!input.paymentProviderReady) {
        blockerCodes.push("payment_provider_not_ready");
      }
      if (!input.sybilControlsReady) {
        blockerCodes.push("sybil_controls_not_ready");
      }
    }
  }

  if (
    input.job === "public_report_job" &&
    input.environment === "production" &&
    input.publicReportImpliesLiveProduct
  ) {
    blockerCodes.push("public_report_live_product_copy_blocked");
  }

  const uniqueBlockerCodes = uniqueOperationalBlockers(blockerCodes);

  return {
    allowed: uniqueBlockerCodes.length === 0,
    providerCallsAllowed: uniqueBlockerCodes.length === 0 && !simulationOnly && input.job === "settlement_job",
    blockerCodes: uniqueBlockerCodes,
  };
}

export function evaluateAtLeastTierCommitmentOpenGate(
  input: AtLeastTierCommitmentOpenGateInput,
): AtLeastTierOperationalGateResult {
  const blockerCodes: AtLeastTierOperationalBlocker[] = [];

  if (!input.featureEnabled) {
    blockerCodes.push("feature_disabled");
  }
  if (!isRoleAllowedForLabs(input.actorRole)) {
    blockerCodes.push("insufficient_role");
  }
  if (input.environment === "production") {
    blockerCodes.push("feature_non_mvp");
    blockerCodes.push("production_real_money_disabled");
  }
  if (input.roundStatus !== "labs_open") {
    blockerCodes.push("round_not_labs_open");
  }
  if (input.emergencyPaused) {
    blockerCodes.push("emergency_pause_active");
  }
  if (!input.rewardScheduleValid) {
    blockerCodes.push("invalid_damped_odds_schedule");
  }
  if (!input.rewardScheduleFrozen) {
    blockerCodes.push("schedule_not_frozen");
  }
  if (!isReserveBacked(input.reserve, input.roundId, input.poolId)) {
    blockerCodes.push("reserve_unbacked");
  }
  if (
    !isNonNegativeSafeInteger(input.currentReservedExposureCents) ||
    !isPositiveSafeInteger(input.requestedExposureCents) ||
    input.currentReservedExposureCents + input.requestedExposureCents > input.reserve.maxExposureCents ||
    input.currentReservedExposureCents + input.requestedExposureCents > input.reserve.backedCents
  ) {
    blockerCodes.push("reserve_exposure_exceeded");
  }
  if (!input.copyPreflightPassed) {
    blockerCodes.push("copy_preflight_failed");
  }
  if (!input.paymentMethodProviderConfirmed) {
    blockerCodes.push("payment_method_not_confirmed");
  }
  if (!input.finalReviewConfirmed) {
    blockerCodes.push("final_review_consent_missing");
  }
  if (!input.ownCommitmentExclusionAcknowledged) {
    blockerCodes.push("own_commitment_exclusion_ack_missing");
  }
  if (!input.lossChargeAcknowledged) {
    blockerCodes.push("loss_charge_ack_missing");
  }
  if (!input.noDirectPayoutAcknowledged) {
    blockerCodes.push("no_direct_payout_ack_missing");
  }
  if (!input.nonMvpAcknowledged) {
    blockerCodes.push("non_mvp_ack_missing");
  }

  const uniqueBlockerCodes = uniqueOperationalBlockers(blockerCodes);

  return {
    allowed: uniqueBlockerCodes.length === 0,
    providerCallsAllowed: false,
    blockerCodes: uniqueBlockerCodes,
  };
}

function integerSquareRoot(value: bigint) {
  const zero = BigInt(0);
  const two = BigInt(2);

  if (value < zero) {
    throw new Error("square root input must be non-negative");
  }
  if (value < two) {
    return value;
  }

  let x0 = value / two;
  let x1 = (x0 + value / x0) / two;

  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) / two;
  }

  return x0;
}

function integerNthRoot(value: bigint, degree: number) {
  if (!Number.isSafeInteger(degree) || degree < 1) {
    throw new Error("root degree must be a positive safe integer");
  }
  if (degree === 1) {
    return value;
  }
  if (degree === 2) {
    return integerSquareRoot(value);
  }
  if (value < BigInt(0)) {
    throw new Error("root input must be non-negative");
  }
  if (value < BigInt(2)) {
    return value;
  }

  const bigDegree = BigInt(degree);
  const bitLength = value.toString(2).length;
  let current = BigInt(1) << BigInt(Math.ceil(bitLength / degree));
  let next = (
    BigInt(degree - 1) * current +
    value / (current ** BigInt(degree - 1))
  ) / bigDegree;

  while (next < current) {
    current = next;
    next = (
      BigInt(degree - 1) * current +
      value / (current ** BigInt(degree - 1))
    ) / bigDegree;
  }

  while ((current + BigInt(1)) ** bigDegree <= value) {
    current += BigInt(1);
  }
  while (current ** bigDegree > value) {
    current -= BigInt(1);
  }

  return current;
}

function roundDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0)) {
    throw new Error("denominator must be positive");
  }

  return (numerator + denominator / BigInt(2)) / denominator;
}

function oddsAgainstDecimalString(qBps: number) {
  const decimalScale = BigInt(1_000_000);
  const numerator = BigInt(BPS_DENOMINATOR - qBps) * decimalScale;
  const denominator = BigInt(qBps);
  const scaled = roundDivide(numerator, denominator);
  const whole = scaled / decimalScale;
  const fractional = `${scaled % decimalScale}`.padStart(6, "0");

  return `${whole}.${fractional}`;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

function parseGammaDecimal(gammaDecimalString: string) {
  const trimmed = gammaDecimalString.trim();
  const match = /^0\.(\d{1,2})$/.exec(trimmed);

  if (!match) {
    return {
      valid: false as const,
      invalidReasonCodes: ["gamma_decimal_precision_unsupported"],
    };
  }

  const decimalDigits = match[1]!;
  const numerator = Number(decimalDigits);
  const denominator = 10 ** decimalDigits.length;

  if (numerator * 2 < denominator || numerator * 10 > 7 * denominator) {
    return {
      valid: false as const,
      invalidReasonCodes: ["gamma_out_of_range"],
    };
  }

  const divisor = greatestCommonDivisor(numerator, denominator);

  return {
    valid: true as const,
    numerator: numerator / divisor,
    denominator: denominator / divisor,
    invalidReasonCodes: [],
  };
}

function oddsPowerScaled(qBps: number, gamma: { numerator: number; denominator: number }) {
  const oddsNumerator = BigInt(BPS_DENOMINATOR - qBps);
  const oddsDenominator = BigInt(qBps);
  const exponentNumerator = BigInt(gamma.numerator);
  const exponentDenominator = BigInt(gamma.denominator);
  const radicand =
    (oddsNumerator ** exponentNumerator) *
    (SQRT_SCALE ** exponentDenominator) /
    (oddsDenominator ** exponentNumerator);

  return integerNthRoot(radicand, gamma.denominator);
}

function invalidSchedule(
  input: DampedOddsRewardScheduleInput,
  invalidReasonCodes: string[],
): DampedOddsRewardScheduleResult {
  const createdAt = nowIso(input.now);
  const scheduleInput = {
    ...input,
    fallbackMode: input.fallbackMode ?? "fail_closed",
    gammaDecimalString: input.gammaDecimalString ?? "0.5",
    minRewardIncrementBps: input.minRewardIncrementBps ?? 1,
    qMaxBps: input.qMaxBps ?? 9_900,
    qMinBps: input.qMinBps ?? 100,
    rMaxBps: input.rMaxBps ?? 3_500,
    rMinBps: input.rMinBps ?? 500,
  };

  const schedule: DampedOddsRewardSchedule = {
    id: input.id ?? `${input.roundId}:damped-odds`,
    roundId: input.roundId,
    scheduleVersion: AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION,
    rMinBps: scheduleInput.rMinBps,
    rMaxBps: scheduleInput.rMaxBps,
    gammaDecimalString: scheduleInput.gammaDecimalString,
    qMinBps: scheduleInput.qMinBps,
    qMaxBps: scheduleInput.qMaxBps,
    minRewardIncrementBps: scheduleInput.minRewardIncrementBps,
    fallbackMode: scheduleInput.fallbackMode,
    inputHash: hashValue(scheduleInput),
    outputHash: hashValue({ invalidReasonCodes, state: "invalid" }),
    state: "invalid",
    invalidReasonCodes,
    createdAt,
  };

  return { valid: false, schedule, tiers: [] };
}

export function computeDampedOddsRewardSchedule(
  input: DampedOddsRewardScheduleInput,
): DampedOddsRewardScheduleResult {
  const rMinBps = input.rMinBps ?? 500;
  const rMaxBps = input.rMaxBps ?? 3_500;
  const gammaDecimalString = input.gammaDecimalString ?? "0.5";
  const qMinBps = input.qMinBps ?? 100;
  const qMaxBps = input.qMaxBps ?? 9_900;
  const minRewardIncrementBps = input.minRewardIncrementBps ?? 1;
  const fallbackMode = input.fallbackMode ?? "fail_closed";
  const invalidReasonCodes: string[] = [];

  if (!input.roundId.trim()) {
    invalidReasonCodes.push("round_id_invalid");
  }
  if (input.tiers.length < 2) {
    invalidReasonCodes.push("tiers_too_short");
  }
  if (!isNonNegativeSafeInteger(rMinBps)) {
    invalidReasonCodes.push("r_min_bps_invalid");
  }
  if (!isPositiveSafeInteger(rMaxBps) || rMaxBps > BPS_DENOMINATOR) {
    invalidReasonCodes.push("r_max_bps_invalid");
  }
  if (isNonNegativeSafeInteger(rMinBps) && isPositiveSafeInteger(rMaxBps) && rMinBps >= rMaxBps) {
    invalidReasonCodes.push("reward_bounds_not_increasing");
  }
  const gamma = parseGammaDecimal(gammaDecimalString);
  invalidReasonCodes.push(...gamma.invalidReasonCodes);
  if (!isPositiveSafeInteger(qMinBps) || !isPositiveSafeInteger(qMaxBps) || qMinBps >= qMaxBps) {
    invalidReasonCodes.push("q_bounds_invalid");
  }
  if (!isPositiveSafeInteger(minRewardIncrementBps)) {
    invalidReasonCodes.push("min_reward_increment_invalid");
  }

  const tiers = [...input.tiers].sort((left, right) => left.tierIndex - right.tierIndex);

  tiers.forEach((tier, index) => {
    if (!isPositiveSafeInteger(tier.tierIndex)) {
      invalidReasonCodes.push(`tier_${index + 1}_index_invalid`);
    }
    if (!isPositiveSafeInteger(tier.thresholdNetRecipientCents)) {
      invalidReasonCodes.push(`tier_${tier.tierIndex}_threshold_invalid`);
    }
    if (
      !isPositiveSafeInteger(tier.frozenForecastProbabilityBps) ||
      tier.frozenForecastProbabilityBps < qMinBps ||
      tier.frozenForecastProbabilityBps > qMaxBps
    ) {
      invalidReasonCodes.push(`tier_${tier.tierIndex}_q_invalid`);
    }

    const previousTier = tiers[index - 1];
    if (previousTier) {
      if (tier.thresholdNetRecipientCents <= previousTier.thresholdNetRecipientCents) {
        invalidReasonCodes.push(`tier_${tier.tierIndex}_threshold_not_strictly_increasing`);
      }
      if (tier.frozenForecastProbabilityBps >= previousTier.frozenForecastProbabilityBps) {
        invalidReasonCodes.push(`tier_${tier.tierIndex}_q_not_strictly_decreasing`);
      }
    }
  });

  if (invalidReasonCodes.length > 0 || !gamma.valid) {
    return invalidSchedule(input, invalidReasonCodes);
  }

  const roots = tiers.map((tier) => oddsPowerScaled(tier.frozenForecastProbabilityBps, gamma));
  const firstRoot = roots[0] ?? BigInt(0);
  const lastRoot = roots[roots.length - 1] ?? BigInt(0);
  const denominator = lastRoot - firstRoot;

  if (denominator <= BigInt(0)) {
    return invalidSchedule(input, ["damped_odds_denominator_zero"]);
  }

  const rewardSpread = BigInt(rMaxBps - rMinBps);
  const rewardRates: number[] = [];

  for (const root of roots) {
    const rewardBps = BigInt(rMinBps) + roundDivide(rewardSpread * (root - firstRoot), denominator);
    rewardRates.push(Number(rewardBps));
  }

  for (let index = 1; index < rewardRates.length; index += 1) {
    const previous = rewardRates[index - 1] ?? rMinBps;
    const current = rewardRates[index] ?? rMinBps;

    if (current - previous < minRewardIncrementBps) {
      const bumped = previous + minRewardIncrementBps;
      if (bumped > rMaxBps) {
        return invalidSchedule(input, ["reward_rounding_breaks_monotonicity"]);
      }
      rewardRates[index] = bumped;
    }
  }

  const createdAt = nowIso(input.now);
  const scheduleInput = {
    fallbackMode,
    gammaDecimalString,
    minRewardIncrementBps,
    qMaxBps,
    qMinBps,
    rMaxBps,
    rMinBps,
    roundId: input.roundId,
    scheduleVersion: AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION,
    tiers,
  };
  const computedTiers: PublicGoodTier[] = tiers.map((tier, index) => ({
    id: tier.id ?? `${input.roundId}:tier-${tier.tierIndex}`,
    roundId: input.roundId,
    tierIndex: tier.tierIndex,
    publicLabel: tier.publicLabel ?? `Tier ${tier.tierIndex}`,
    thresholdNetRecipientCents: tier.thresholdNetRecipientCents,
    frozenForecastProbabilityBps: tier.frozenForecastProbabilityBps,
    oddsAgainstDecimalString: oddsAgainstDecimalString(tier.frozenForecastProbabilityBps),
    rewardRateBps: rewardRates[index] ?? rMinBps,
    scheduleVersion: AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION,
    createdAt,
  }));
  const outputHash = hashValue({ rewardRates, tiers: computedTiers });

  return {
    valid: true,
    schedule: {
      id: input.id ?? `${input.roundId}:damped-odds`,
      roundId: input.roundId,
      scheduleVersion: AT_LEAST_TIER_PLATFORM_MATCH_SCHEDULE_VERSION,
      rMinBps,
      rMaxBps,
      gammaDecimalString,
      qMinBps,
      qMaxBps,
      minRewardIncrementBps,
      fallbackMode,
      inputHash: hashValue(scheduleInput),
      outputHash,
      state: input.freeze ? "frozen" : "computed",
      invalidReasonCodes: [],
      createdAt,
      frozenAt: input.freeze ? createdAt : undefined,
    },
    tiers: computedTiers,
  };
}

export function buildAtLeastTierPlatformMatchCommitmentPreview({
  id,
  roundId,
  poolId,
  participantId,
  selectedTierIndex,
  statedGrossCents,
  estimatedFeeCents,
  rewardRateBps,
  platformMatchReserveId,
  sameControlClusterId,
  now,
}: {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;
  selectedTierIndex: number;
  statedGrossCents: number;
  estimatedFeeCents: number;
  rewardRateBps: number;
  platformMatchReserveId: string;
  sameControlClusterId?: string;
  now?: string;
}): AtLeastTierPlatformMatchCommitment {
  const createdAt = nowIso(now);
  const statedNetRecipientCents = Math.max(0, statedGrossCents - estimatedFeeCents);
  const platformMatchNetCents = Math.floor(statedNetRecipientCents * rewardRateBps / BPS_DENOMINATOR);
  const platformMatchGrossCostCents = platformMatchNetCents;

  return {
    id,
    roundId,
    poolId,
    participantId,
    selectedTierIndex,
    statedGrossCents,
    estimatedFeeCents,
    statedNetRecipientCents,
    platformMatchRewardRateBps: rewardRateBps,
    platformMatchNetCents,
    platformMatchGrossCostCents,
    guaranteedEffectiveSupportCents: Math.min(statedNetRecipientCents, platformMatchNetCents),
    visibility: "aggregate_only",
    commitmentState: "hard_saved",
    sameControlClusterId,
    platformMatchReserveId,
    platformMatchExposureReservedCents: platformMatchGrossCostCents,
    rulebookHashAtConsent: hashValue([AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION, "rulebook"]),
    feePolicyHashAtConsent: hashValue([AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION, "fee-policy"]),
    platformMatchPolicyHashAtConsent: hashValue([AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION, "policy"]),
    finalReviewConfirmedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

export function isAtLeastTierLossAuthorizationCaptureReady(
  attempt: AtLeastTierLossAuthorizationAttempt | undefined,
  commitment: Pick<AtLeastTierPlatformMatchCommitment, "id" | "roundId" | "poolId" | "participantId" | "statedGrossCents">,
  expectedCaptureAt?: string,
) {
  const expiresAfterExpectedCapture = (() => {
    if (!expectedCaptureAt) return true;
    if (!attempt?.expiresAt) return false;
    const expiresAtMs = Date.parse(attempt.expiresAt);
    const expectedCaptureAtMs = Date.parse(expectedCaptureAt);
    return Number.isFinite(expiresAtMs) && Number.isFinite(expectedCaptureAtMs) && expiresAtMs > expectedCaptureAtMs;
  })();

  return Boolean(
    attempt &&
      attempt.roundId === commitment.roundId &&
      attempt.poolId === commitment.poolId &&
      attempt.commitmentId === commitment.id &&
      attempt.participantId === commitment.participantId &&
      attempt.authorizationState === "authorized_exact" &&
      attempt.requiredGrossCents === commitment.statedGrossCents &&
      Boolean(attempt.providerAuthorizationRef) &&
      expiresAfterExpectedCapture &&
      isCanonicalHash(attempt.eventHash),
  );
}

export function reconcileAtLeastTierLossAuthorizations({
  commitments,
  authorizationAttempts,
  expectedCaptureAt,
  now,
}: {
  commitments: AtLeastTierPlatformMatchCommitment[];
  authorizationAttempts: AtLeastTierLossAuthorizationAttempt[];
  expectedCaptureAt?: string;
  now?: string;
}): AtLeastTierAuthorizationReconciliationResult {
  const updatedAt = nowIso(now);
  const captureMustRemainValidThrough = expectedCaptureAt ?? updatedAt;
  const attemptsByCommitmentId = new Map(
    authorizationAttempts.map((attempt) => [attempt.commitmentId, attempt]),
  );
  const excludedCommitmentIds: string[] = [];
  const exactAuthorizedCommitmentIds: string[] = [];
  const reconciledCommitments = commitments.map((commitment) => {
    if (!isEligibleCommitmentState(commitment.commitmentState)) {
      return commitment;
    }

    const attempt = attemptsByCommitmentId.get(commitment.id);
    if (!isAtLeastTierLossAuthorizationCaptureReady(attempt, commitment, captureMustRemainValidThrough)) {
      excludedCommitmentIds.push(commitment.id);
      return {
        ...commitment,
        commitmentState: "excluded_payment" as const,
        updatedAt,
      };
    }

    exactAuthorizedCommitmentIds.push(commitment.id);
    return {
      ...commitment,
      commitmentState: "authorized_for_possible_loss" as const,
      updatedAt,
    };
  });

  return {
    commitments: reconciledCommitments,
    excludedCommitmentIds,
    exactAuthorizedCommitmentIds,
    authorizationFailureCount: excludedCommitmentIds.length,
  };
}

function isEligibleCommitmentState(state: AtLeastTierPlatformMatchCommitmentState) {
  return state === "hard_saved" || state === "authorized_for_possible_loss";
}

function sameControl(
  left: { participantId: string; sameControlClusterId?: string },
  right: { participantId: string; sameControlClusterId?: string },
) {
  return (
    left.participantId === right.participantId ||
    (
      Boolean(left.sameControlClusterId) &&
      Boolean(right.sameControlClusterId) &&
      left.sameControlClusterId === right.sameControlClusterId
    )
  );
}

function commitmentExclusionReason(commitment: AtLeastTierPlatformMatchCommitment, tiersByIndex: Map<number, PublicGoodTier>) {
  if (!tiersByIndex.has(commitment.selectedTierIndex)) {
    return "selected_tier_missing";
  }
  if (!isEligibleCommitmentState(commitment.commitmentState)) {
    return `commitment_state_${commitment.commitmentState}`;
  }
  if (!isPositiveSafeInteger(commitment.statedNetRecipientCents)) {
    return "stated_net_recipient_invalid";
  }
  if (!isNonNegativeSafeInteger(commitment.platformMatchNetCents)) {
    return "platform_match_net_invalid";
  }

  return null;
}

export function resolveAtLeastTierPlatformMatch({
  roundId,
  tiers,
  commitments,
  ordinaryDirectPledges = [],
  now,
}: {
  roundId: string;
  tiers: PublicGoodTier[];
  commitments: AtLeastTierPlatformMatchCommitment[];
  ordinaryDirectPledges?: OrdinaryDirectHardPledge[];
  now?: string;
}): AtLeastTierResolutionResult {
  const createdAt = nowIso(now);
  const resolutionSnapshotId = `${roundId}:resolution:${hashValue([commitments, ordinaryDirectPledges, tiers]).slice(7, 19)}`;
  const tiersByIndex = new Map(tiers.map((tier) => [tier.tierIndex, tier]));
  const atLeastTierSupportSources: AtLeastTierEffectiveSupportSource[] = commitments
    .filter((commitment) => commitmentExclusionReason(commitment, tiersByIndex) == null)
    .map((commitment) => ({
      id: commitment.id,
      participantId: commitment.participantId,
      sameControlClusterId: commitment.sameControlClusterId,
      effectiveSupportCents: Math.min(commitment.statedNetRecipientCents, commitment.platformMatchNetCents),
      sourceType: "at_least_tier" as const,
    }));
  const ordinaryDirectSupportSources: AtLeastTierEffectiveSupportSource[] = ordinaryDirectPledges
    .filter((pledge) =>
      (pledge.state === "hard_saved" || pledge.state === "captured") &&
      isPositiveSafeInteger(pledge.netRecipientCents)
    )
    .map((pledge) => ({
      id: pledge.id,
      participantId: pledge.participantId,
      sameControlClusterId: pledge.sameControlClusterId,
      effectiveSupportCents: pledge.netRecipientCents,
      sourceType: "ordinary_direct_pledge" as const,
    }));
  const supportSources: AtLeastTierEffectiveSupportSource[] = [
    ...atLeastTierSupportSources,
    ...ordinaryDirectSupportSources,
  ];
  const ordinaryDirectPledgeSupportCents = supportSources
    .filter((source) => source.sourceType === "ordinary_direct_pledge")
    .reduce((sum, source) => sum + source.effectiveSupportCents, 0);

  const rows: AtLeastTierResolutionRow[] = commitments.map((commitment) => {
    const tier = tiersByIndex.get(commitment.selectedTierIndex);
    const exclusionReason = commitmentExclusionReason(commitment, tiersByIndex);

    if (exclusionReason || !tier) {
      const row = {
        id: `${resolutionSnapshotId}:${commitment.id}`,
        resolutionSnapshotId,
        roundId,
        commitmentId: commitment.id,
        participantId: commitment.participantId,
        selectedTierIndex: commitment.selectedTierIndex,
        selectedTierThresholdNetCents: tier?.thresholdNetRecipientCents ?? 0,
        statedNetRecipientCents: commitment.statedNetRecipientCents,
        rewardRateBps: commitment.platformMatchRewardRateBps,
        platformMatchNetCents: commitment.platformMatchNetCents,
        guaranteedEffectiveSupportCents: 0,
        otherEligibleEffectiveSupportCents: 0,
        excludedSameControlEffectiveSupportCents: 0,
        won: false,
        outcome: "excluded" as const,
        exclusionReason: exclusionReason ?? undefined,
        rowHash: "",
        createdAt,
      };

      return { ...row, rowHash: hashValue(row) };
    }

    const excludedSameControlEffectiveSupportCents = supportSources
      .filter((source) => source.id !== commitment.id && sameControl(source, commitment))
      .reduce((sum, source) => sum + source.effectiveSupportCents, 0);
    const otherEligibleEffectiveSupportCents = supportSources
      .filter((source) => source.id !== commitment.id && !sameControl(source, commitment))
      .reduce((sum, source) => sum + source.effectiveSupportCents, 0);
    const guaranteedEffectiveSupportCents = Math.min(
      commitment.statedNetRecipientCents,
      commitment.platformMatchNetCents,
    );
    const won = otherEligibleEffectiveSupportCents >= tier.thresholdNetRecipientCents;
    const row = {
      id: `${resolutionSnapshotId}:${commitment.id}`,
      resolutionSnapshotId,
      roundId,
      commitmentId: commitment.id,
      participantId: commitment.participantId,
      selectedTierIndex: commitment.selectedTierIndex,
      selectedTierThresholdNetCents: tier.thresholdNetRecipientCents,
      statedNetRecipientCents: commitment.statedNetRecipientCents,
      rewardRateBps: commitment.platformMatchRewardRateBps,
      platformMatchNetCents: commitment.platformMatchNetCents,
      guaranteedEffectiveSupportCents,
      otherEligibleEffectiveSupportCents,
      excludedSameControlEffectiveSupportCents,
      won,
      outcome: won ? "won_platform_pays" as const : "lost_user_pays" as const,
      rowHash: "",
      createdAt,
    };

    return { ...row, rowHash: hashValue(row) };
  });

  const eligibleCommitmentCount = rows.filter((row) => row.outcome !== "excluded").length;
  const snapshotWithoutHash = {
    id: resolutionSnapshotId,
    roundId,
    inputHash: hashValue({ commitments, ordinaryDirectPledges, tiers }),
    resolvedAt: createdAt,
    eligibleCommitmentCount,
    excludedCommitmentCount: rows.length - eligibleCommitmentCount,
    ordinaryDirectPledgeSupportCents,
    effectiveSupportTotalCents: supportSources.reduce((sum, source) => sum + source.effectiveSupportCents, 0),
    resolutionMethod: "leave_one_cluster_out_effective_support" as const,
    status: "computed" as const,
    createdAt,
  };

  return {
    snapshot: {
      ...snapshotWithoutHash,
      outputHash: hashValue(rows),
    },
    rows,
  };
}

function isReserveBacked(reserve: PlatformMatchReserve, expectedRoundId: string, expectedPoolId: string) {
  return (
    reserve.roundId === expectedRoundId &&
    reserve.poolId === expectedPoolId &&
    reserve.reserveType === "at_least_tier_platform_match" &&
    (reserve.backingState === "funded" ||
      reserve.backingState === "escrowed" ||
      reserve.backingState === "contractually_committed" ||
      reserve.backingState === "dev_simulated") &&
    reserve.backedCents >= reserve.maxExposureCents &&
    reserve.legalComplianceState === "approved" &&
    reserve.paymentProviderReady &&
    reserve.recipientRouteReady
  );
}

function buildAtLeastTierSettlementLedgerEntries({
  roundId,
  rows,
  commitmentById,
  platformMatchOperations,
  simulationOnly,
  createdAt,
}: {
  roundId: string;
  rows: AtLeastTierSettlementRow[];
  commitmentById: Map<string, AtLeastTierPlatformMatchCommitment>;
  platformMatchOperations: PlatformMatchContributionOperation[];
  simulationOnly: boolean;
  createdAt: string;
}): AtLeastTierSettlementLedgerEntry[] {
  const platformMatchOperationByCommitmentId = new Map(
    platformMatchOperations.map((operation) => [operation.commitmentId, operation]),
  );
  const ledgerEntries: AtLeastTierSettlementLedgerEntry[] = [];

  const addLedgerEntry = ({
    row,
    entryType,
    variant,
    amountCents,
    debitAccount,
    creditAccount,
    providerOperationRef,
  }: {
    row: AtLeastTierSettlementRow;
    entryType: AtLeastTierSettlementLedgerEntryType;
    variant: string;
    amountCents: number;
    debitAccount: string;
    creditAccount: string;
    providerOperationRef?: string;
  }) => {
    ledgerEntries.push({
      id: `${row.id}:ledger:${entryType}:${variant}`,
      roundId,
      commitmentId: row.commitmentId,
      entryType,
      debitAccount,
      creditAccount,
      amountCents,
      currency: "usd",
      simulationOnly,
      providerOperationRef,
      idempotencyKey: `at-least-tier:${roundId}:${row.commitmentId}:ledger:${entryType}:${variant}`,
      createdAt,
    });
  };

  for (const row of rows) {
    const commitment = commitmentById.get(row.commitmentId);
    const authorizationAmountCents = commitment?.statedGrossCents ?? row.userGrossCapturedCents;
    const simulatedProviderPrefix =
      simulationOnly && row.outcome !== "blocked" ? `simulated:${row.commitmentId}` : undefined;

    if (row.userAuthorizationOperation !== "none") {
      addLedgerEntry({
        row,
        entryType: "user_authorization",
        variant: "loss-payment",
        amountCents: authorizationAmountCents,
        debitAccount: "user_authorization_pending",
        creditAccount: "user_authorization_control",
      });
    }

    if (row.userAuthorizationOperation === "release") {
      const providerOperationRef = simulatedProviderPrefix
        ? `${simulatedProviderPrefix}:user-authorization-release`
        : undefined;
      addLedgerEntry({
        row,
        entryType: "user_release",
        variant: "loss-payment",
        amountCents: authorizationAmountCents,
        debitAccount: "user_authorization_control",
        creditAccount: "user_authorization_released",
        providerOperationRef,
      });
      addLedgerEntry({
        row,
        entryType: "provider_operation_reconciliation",
        variant: "user-authorization-release",
        amountCents: authorizationAmountCents,
        debitAccount: "payment_provider_release_events",
        creditAccount: "user_authorization_released",
        providerOperationRef,
      });
    }

    if (row.userAuthorizationOperation === "capture" || row.userAuthorizationOperation === "simulated_capture") {
      const providerOperationRef = simulatedProviderPrefix
        ? `${simulatedProviderPrefix}:user-loss-capture`
        : undefined;
      addLedgerEntry({
        row,
        entryType: "user_capture",
        variant: "loss-payment",
        amountCents: row.userGrossCapturedCents,
        debitAccount: "user_payment_capture_receivable",
        creditAccount: "user_loss_captured_funds",
        providerOperationRef,
      });
      addLedgerEntry({
        row,
        entryType: "provider_operation_reconciliation",
        variant: "user-loss-capture",
        amountCents: row.userGrossCapturedCents,
        debitAccount: "payment_provider_capture_events",
        creditAccount: "user_loss_captured_funds",
        providerOperationRef,
      });
    }

    if (row.platformMatchExposureReservedCents > 0) {
      addLedgerEntry({
        row,
        entryType: "platform_match_reserve_commitment",
        variant: "maximum-exposure",
        amountCents: row.platformMatchExposureReservedCents,
        debitAccount: "platform_match_reserve_available",
        creditAccount: "platform_match_reserve_committed",
      });
    }

    if (row.platformMatchGrossCostCents > 0) {
      const platformMatchOperation = platformMatchOperationByCommitmentId.get(row.commitmentId);
      addLedgerEntry({
        row,
        entryType: "platform_match_reserve_disbursement",
        variant: "reviewed-projects",
        amountCents: row.platformMatchGrossCostCents,
        debitAccount: "platform_match_reserve_committed",
        creditAccount: "platform_match_reserve_disbursed",
        providerOperationRef: platformMatchOperation?.providerOperationRef,
      });
      addLedgerEntry({
        row,
        entryType: "provider_operation_reconciliation",
        variant: "platform-match-reviewed-projects",
        amountCents: row.platformMatchGrossCostCents,
        debitAccount: "payment_provider_platform_match_events",
        creditAccount: "platform_match_reserve_disbursed",
        providerOperationRef: platformMatchOperation?.providerOperationRef,
      });
    }

    if (row.platformMatchExposureReleasedCents > 0) {
      addLedgerEntry({
        row,
        entryType: "platform_match_exposure_release",
        variant: "unused-exposure",
        amountCents: row.platformMatchExposureReleasedCents,
        debitAccount: "platform_match_reserve_committed",
        creditAccount: "platform_match_reserve_available",
      });
    }

    if (row.userNetRecipientDisbursedCents > 0) {
      addLedgerEntry({
        row,
        entryType: "project_disbursement",
        variant: "user-loss-reviewed-projects",
        amountCents: row.userNetRecipientDisbursedCents,
        debitAccount: "user_loss_captured_funds",
        creditAccount: "reviewed_project_disbursements",
      });
    }

    if (row.platformMatchNetRecipientDisbursedCents > 0) {
      addLedgerEntry({
        row,
        entryType: "project_disbursement",
        variant: "platform-match-reviewed-projects",
        amountCents: row.platformMatchNetRecipientDisbursedCents,
        debitAccount: "platform_match_reserve_disbursed",
        creditAccount: "reviewed_project_disbursements",
      });
    }

    if (row.userFeeCents > 0) {
      addLedgerEntry({
        row,
        entryType: "fee",
        variant: "user-loss-provider-fee",
        amountCents: row.userFeeCents,
        debitAccount: "user_loss_captured_funds",
        creditAccount: "payment_provider_fee_payable",
      });
    }

    if (row.platformMatchFeeCents > 0) {
      addLedgerEntry({
        row,
        entryType: "fee",
        variant: "platform-match-provider-fee",
        amountCents: row.platformMatchFeeCents,
        debitAccount: "platform_match_reserve_disbursed",
        creditAccount: "payment_provider_fee_payable",
      });
    }
  }

  return ledgerEntries;
}

export function planAtLeastTierPlatformMatchSettlement({
  roundId,
  resolution,
  commitments,
  reserve,
  rulebookHash,
  feePolicyHash,
  platformMatchPolicyHash,
  rewardScheduleHash,
  ordinaryDirectPledgeNetCents = 0,
  sponsorMatchNetRecipientCents = 0,
  simulationOnly = true,
  now,
}: {
  roundId: string;
  resolution: AtLeastTierResolutionResult;
  commitments: AtLeastTierPlatformMatchCommitment[];
  reserve: PlatformMatchReserve;
  rulebookHash: string;
  feePolicyHash: string;
  platformMatchPolicyHash: string;
  rewardScheduleHash: string;
  ordinaryDirectPledgeNetCents?: number;
  sponsorMatchNetRecipientCents?: number;
  simulationOnly?: boolean;
  now?: string;
}): AtLeastTierSettlementPlan {
  const createdAt = nowIso(now);
  const commitmentById = new Map(commitments.map((commitment) => [commitment.id, commitment]));
  const blockedReasonCodes: string[] = [];
  const commitmentPoolIds = [...new Set(commitments.map((commitment) => commitment.poolId))];
  const expectedPoolId = commitmentPoolIds[0] ?? reserve.poolId;
  if (commitmentPoolIds.length > 1 || commitments.some((commitment) => commitment.roundId !== roundId)) {
    blockedReasonCodes.push("commitment_scope_mismatch");
  }
  const totalWinnerExposureCents = resolution.rows
    .filter((row) => row.outcome === "won_platform_pays")
    .reduce((sum, row) => sum + row.platformMatchNetCents, 0);
  const eligibleReservedExposureCents = commitments
    .filter((commitment) => isEligibleCommitmentState(commitment.commitmentState))
    .reduce((sum, commitment) => {
      if (!isNonNegativeSafeInteger(commitment.platformMatchExposureReservedCents)) {
        return Number.POSITIVE_INFINITY;
      }

      return sum + commitment.platformMatchExposureReservedCents;
    }, 0);

  if (!isReserveBacked(reserve, roundId, expectedPoolId)) {
    blockedReasonCodes.push("platform_match_reserve_unbacked");
  }
  if (
    !Number.isSafeInteger(eligibleReservedExposureCents) ||
    eligibleReservedExposureCents > reserve.maxExposureCents ||
    eligibleReservedExposureCents > reserve.backedCents ||
    totalWinnerExposureCents > reserve.maxExposureCents ||
    reserve.maxExposureCents > reserve.backedCents
  ) {
    blockedReasonCodes.push("reserve_exposure_exceeded");
  }
  if (!simulationOnly) {
    blockedReasonCodes.push("production_real_money_disabled");
    blockedReasonCodes.push("missing_promotion_record");
  }

  const settlementBlocked = blockedReasonCodes.length > 0;
  const rows: AtLeastTierSettlementRow[] = resolution.rows.map((row) => {
    const commitment = commitmentById.get(row.commitmentId);
    const reservedExposure = commitment?.platformMatchExposureReservedCents ?? row.platformMatchNetCents;

    if (settlementBlocked || row.outcome === "excluded") {
      return {
        id: `${row.id}:settlement`,
        roundId,
        commitmentId: row.commitmentId,
        participantId: row.participantId,
        outcome: settlementBlocked ? "blocked" : "excluded",
        userGrossCapturedCents: 0,
        userFeeCents: 0,
        userNetRecipientDisbursedCents: 0,
        platformMatchGrossCostCents: 0,
        platformMatchFeeCents: 0,
        platformMatchNetRecipientDisbursedCents: 0,
        platformMatchExposureReservedCents: reservedExposure,
        platformMatchExposureReleasedCents: reservedExposure,
        finalProjectDisbursementCents: 0,
        userAuthorizationOperation: "release",
        userAuthorizationIdempotencyKey: `at-least-tier:${roundId}:${row.commitmentId}:user-authorization:release`,
        settlementState: settlementBlocked ? "blocked" : "released",
        createdAt,
      };
    }

    if (row.outcome === "won_platform_pays") {
      return {
        id: `${row.id}:settlement`,
        roundId,
        commitmentId: row.commitmentId,
        participantId: row.participantId,
        outcome: "won_platform_pays",
        userGrossCapturedCents: 0,
        userFeeCents: 0,
        userNetRecipientDisbursedCents: 0,
        platformMatchGrossCostCents: row.platformMatchNetCents,
        platformMatchFeeCents: 0,
        platformMatchNetRecipientDisbursedCents: row.platformMatchNetCents,
        platformMatchExposureReservedCents: reservedExposure,
        platformMatchExposureReleasedCents: Math.max(0, reservedExposure - row.platformMatchNetCents),
        finalProjectDisbursementCents: row.platformMatchNetCents,
        userAuthorizationOperation: "release",
        userAuthorizationIdempotencyKey: `at-least-tier:${roundId}:${row.commitmentId}:user-authorization:release`,
        settlementState: "paid_platform_match",
        createdAt,
      };
    }

    const userAuthorizationOperation = simulationOnly ? "simulated_capture" : "capture";
    const userAuthorizationIdempotencyAction = simulationOnly ? "simulated-capture" : "capture";
    const settlementState = simulationOnly ? "simulated_user_loss" : "captured_user_loss";

    return {
      id: `${row.id}:settlement`,
      roundId,
      commitmentId: row.commitmentId,
      participantId: row.participantId,
      outcome: "lost_user_pays",
      userGrossCapturedCents: commitment?.statedGrossCents ?? row.statedNetRecipientCents,
      userFeeCents: commitment?.estimatedFeeCents ?? 0,
      userNetRecipientDisbursedCents: row.statedNetRecipientCents,
      platformMatchGrossCostCents: 0,
      platformMatchFeeCents: 0,
      platformMatchNetRecipientDisbursedCents: 0,
      platformMatchExposureReservedCents: reservedExposure,
      platformMatchExposureReleasedCents: reservedExposure,
      finalProjectDisbursementCents: row.statedNetRecipientCents,
      userAuthorizationOperation,
      userAuthorizationIdempotencyKey: `at-least-tier:${roundId}:${row.commitmentId}:user-authorization:${userAuthorizationIdempotencyAction}`,
      settlementState,
      createdAt,
    };
  });

  const platformMatchOperations: PlatformMatchContributionOperation[] = rows
    .filter((row) => !settlementBlocked && row.outcome === "won_platform_pays")
    .map((row) => ({
      id: `${row.commitmentId}:platform-match-reviewed-projects`,
      roundId,
      commitmentId: row.commitmentId,
      reserveId: reserve.id,
      destinationProjectId: "reviewed-public-good-projects",
      grossCostCents: row.platformMatchGrossCostCents,
      feeCents: row.platformMatchFeeCents,
      netRecipientCents: row.platformMatchNetRecipientDisbursedCents,
      currency: "usd" as const,
      providerOperationRef: simulationOnly ? `simulated:${row.commitmentId}` : undefined,
      operationState: "succeeded" as const,
      idempotencyKey: `at-least-tier:${roundId}:${row.commitmentId}:platform-match:reviewed-projects`,
      createdAt,
      updatedAt: createdAt,
    }));
  const ledgerEntries = buildAtLeastTierSettlementLedgerEntries({
    roundId,
    rows,
    commitmentById,
    platformMatchOperations,
    simulationOnly,
    createdAt,
  });

  const grossUserLossCapturedCents = rows.reduce((sum, row) => sum + row.userGrossCapturedCents, 0);
  const userLossFeeCents = rows.reduce((sum, row) => sum + row.userFeeCents, 0);
  const userLossNetRecipientCents = rows.reduce((sum, row) => sum + row.userNetRecipientDisbursedCents, 0);
  const platformMatchGrossPaidCents = rows.reduce((sum, row) => sum + row.platformMatchGrossCostCents, 0);
  const platformMatchFeeCents = rows.reduce((sum, row) => sum + row.platformMatchFeeCents, 0);
  const platformMatchNetRecipientCents = rows.reduce((sum, row) => sum + row.platformMatchNetRecipientDisbursedCents, 0);
  const platformMatchExposureReservedCents = rows.reduce((sum, row) => sum + row.platformMatchExposureReservedCents, 0);
  const platformMatchUnusedReleasedCents = rows.reduce((sum, row) => sum + row.platformMatchExposureReleasedCents, 0);
  const finalProjectDisbursementCents =
    userLossNetRecipientCents +
    platformMatchNetRecipientCents +
    ordinaryDirectPledgeNetCents +
    sponsorMatchNetRecipientCents;
  const selectedAtLeastTier: Record<string, number> = {};
  for (const row of resolution.rows) {
    selectedAtLeastTier[String(row.selectedTierIndex)] = (selectedAtLeastTier[String(row.selectedTierIndex)] ?? 0) + 1;
  }
  const resolvedAtLeastTier = resolution.rows.reduce<number | null>((highest, row) => {
    if (resolution.snapshot.effectiveSupportTotalCents < row.selectedTierThresholdNetCents) return highest;
    return highest === null || row.selectedTierIndex > highest ? row.selectedTierIndex : highest;
  }, null);

  return {
    rows,
    platformMatchOperations,
    ledgerEntries,
    blockedReasonCodes,
    auditReport: {
      id: `${roundId}:at-least-tier-audit`,
      roundId,
      calculationVersion: AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION,
      rulebookHash,
      feePolicyHash,
      platformMatchPolicyHash,
      rewardScheduleHash,
      grossUserLossCapturedCents,
      userLossFeeCents,
      userLossNetRecipientCents,
      platformMatchReserveBackedCents: reserve.backedCents,
      platformMatchExposureReservedCents,
      platformMatchGrossPaidCents,
      platformMatchFeeCents,
      platformMatchNetRecipientCents,
      platformMatchUnusedReleasedCents,
      ordinaryDirectPledgeNetCents,
      sponsorMatchNetRecipientCents,
      finalProjectDisbursementCents,
      eligibleCommitmentCount: resolution.snapshot.eligibleCommitmentCount,
      winningCommitmentCount: rows.filter((row) => row.outcome === "won_platform_pays").length,
      losingCommitmentCount: rows.filter((row) => row.outcome === "lost_user_pays").length,
      excludedIdentityCount: resolution.rows.filter((row) => row.exclusionReason === "commitment_state_excluded_identity").length,
      excludedPaymentCount: resolution.rows.filter((row) => row.exclusionReason === "commitment_state_excluded_payment").length,
      excludedSybilCount: resolution.rows.filter((row) => row.exclusionReason === "commitment_state_excluded_sybil").length,
      excludedSameControlCount: resolution.rows.filter((row) => row.exclusionReason === "commitment_state_excluded_same_control").length,
      authorizationFailureCount: resolution.rows.filter((row) => row.exclusionReason === "commitment_state_excluded_payment").length,
      finalStatus: settlementBlocked ? "blocked" : "simulation_only",
      publicReportJson: {
        forecastCommitmentGrossCents: commitments.reduce((sum, commitment) => sum + commitment.statedGrossCents, 0),
        forecastCommitmentNetRecipientCents: commitments.reduce((sum, commitment) => sum + commitment.statedNetRecipientCents, 0),
        forecastResolutionOtherUserNetCents: resolution.rows.reduce(
          (sum, row) => sum + row.otherEligibleEffectiveSupportCents,
          0,
        ),
        selectedAtLeastTier,
        resolvedAtLeastTier,
        forecastWon: {
          wonCount: rows.filter((row) => row.outcome === "won_platform_pays").length,
          lostCount: rows.filter((row) => row.outcome === "lost_user_pays").length,
          excludedCount: rows.filter((row) => row.outcome === "excluded" || row.outcome === "blocked").length,
        },
        userPaidOnLossCents: userLossNetRecipientCents,
        platformPaidOnWinCents: platformMatchNetRecipientCents,
        platformMatchReserveBackedCents: reserve.backedCents,
        platformMatchExposureReservedCents,
        platformMatchPaidCents: platformMatchNetRecipientCents,
        platformMatchReleasedUnusedCents: platformMatchUnusedReleasedCents,
        ordinaryDirectPledgeNetCents,
        sponsorMatchNetRecipientCents,
        finalProjectDisbursementCents,
        feesCents: userLossFeeCents + platformMatchFeeCents,
        note: "Simulation-only non-MVP report. User-paid loss funds, platform-paid win funds, ordinary direct pledges, sponsor match, reserves, fees, and final project disbursement are separate.",
      },
    },
  };
}

export function buildAtLeastTierDevSeedData({
  environment,
  now,
}: {
  environment: AtLeastTierPlatformMatchEnvironment;
  now?: string;
}): AtLeastTierDevSeedData {
  const createdAt = nowIso(now);
  const roundId = "dev-at-least-tier-platform-match-round";
  const poolId = "dev-reviewed-public-good-pool";
  const reserveId = "dev-platform-match-reserve";

  if (environment !== "development" && environment !== "test") {
    return {
      allowed: false,
      blockerCodes: ["production_seed_disabled"],
      productionSeedCreatesActiveRecords: false,
      publicRoutes: [],
      tiers: [],
      commitments: [],
      ordinaryDirectPledges: [],
    };
  }

  const rewardSchedule = computeDampedOddsRewardSchedule({
    roundId,
    freeze: true,
    now: createdAt,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  const tierOne = rewardSchedule.tiers[0]!;
  const tierFive = rewardSchedule.tiers[4]!;
  const round: AtLeastTierPlatformMatchRound = {
    id: roundId,
    poolId,
    featureKey: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
    deploymentMode: AT_LEAST_TIER_PLATFORM_MATCH_DEPLOYMENT_MODE,
    featureClassification: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION,
    status: "labs_open",
    opensAt: createdAt,
    closesAt: "2026-07-13T00:00:00.000Z",
    parametersFrozenAt: createdAt,
    rulebookHash: hashValue([roundId, "rulebook"]),
    feePolicyHash: hashValue([roundId, "fee-policy"]),
    platformMatchPolicyHash: hashValue([roundId, "platform-match-policy"]),
    rewardScheduleHash: rewardSchedule.schedule.outputHash,
    calculationVersion: AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION,
    sealedProgressMode: "qualitative_only_before_close",
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
    createdAt,
    updatedAt: createdAt,
  };
  const reviewedPool: AtLeastTierReviewedSeedPool = {
    id: poolId,
    roundId,
    title: "Dev reviewed moral public-good pool",
    projectIds: ["reviewed-project-a", "reviewed-project-b"],
    projectReviewState: "reviewed_moral_public_good",
    recipientRouteState: "verified",
    createdAt,
  };
  const reserve: PlatformMatchReserve = {
    id: reserveId,
    roundId,
    poolId,
    reserveType: "at_least_tier_platform_match",
    backedCents: 500_000,
    committedCents: 0,
    paidCents: 0,
    releasedUnusedCents: 0,
    maxExposureCents: 500_000,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    paymentProviderReady: true,
    recipientRouteReady: true,
    sourceHash: hashValue([roundId, reserveId, "source"]),
    platformMatchPolicyHash: round.platformMatchPolicyHash,
    status: "backed",
    createdAt,
    updatedAt: createdAt,
  };
  const commitments: AtLeastTierPlatformMatchCommitment[] = [
    buildAtLeastTierPlatformMatchCommitmentPreview({
      id: "seed-winning-alpha",
      roundId,
      poolId,
      participantId: "seed-alpha",
      selectedTierIndex: tierOne.tierIndex,
      statedGrossCents: 2_000_000,
      estimatedFeeCents: 0,
      rewardRateBps: tierOne.rewardRateBps,
      platformMatchReserveId: reserveId,
      sameControlClusterId: "seed-cluster-alpha",
      now: createdAt,
    }),
    buildAtLeastTierPlatformMatchCommitmentPreview({
      id: "seed-same-control-shadow",
      roundId,
      poolId,
      participantId: "seed-alpha-shadow",
      selectedTierIndex: tierOne.tierIndex,
      statedGrossCents: 2_000_000,
      estimatedFeeCents: 0,
      rewardRateBps: tierOne.rewardRateBps,
      platformMatchReserveId: reserveId,
      sameControlClusterId: "seed-cluster-alpha",
      now: createdAt,
    }),
    buildAtLeastTierPlatformMatchCommitmentPreview({
      id: "seed-winning-beta",
      roundId,
      poolId,
      participantId: "seed-beta",
      selectedTierIndex: tierOne.tierIndex,
      statedGrossCents: 2_000_000,
      estimatedFeeCents: 0,
      rewardRateBps: tierOne.rewardRateBps,
      platformMatchReserveId: reserveId,
      sameControlClusterId: "seed-cluster-beta",
      now: createdAt,
    }),
    buildAtLeastTierPlatformMatchCommitmentPreview({
      id: "seed-losing-tier-five",
      roundId,
      poolId,
      participantId: "seed-gamma",
      selectedTierIndex: tierFive.tierIndex,
      statedGrossCents: 10_000,
      estimatedFeeCents: 0,
      rewardRateBps: tierFive.rewardRateBps,
      platformMatchReserveId: reserveId,
      sameControlClusterId: "seed-cluster-gamma",
      now: createdAt,
    }),
    {
      ...buildAtLeastTierPlatformMatchCommitmentPreview({
        id: "seed-payment-failed",
        roundId,
        poolId,
        participantId: "seed-delta",
        selectedTierIndex: tierOne.tierIndex,
        statedGrossCents: 2_000_000,
        estimatedFeeCents: 0,
        rewardRateBps: tierOne.rewardRateBps,
        platformMatchReserveId: reserveId,
        sameControlClusterId: "seed-cluster-delta",
        now: createdAt,
      }),
      commitmentState: "excluded_payment",
    },
  ];
  const ordinaryDirectPledges: OrdinaryDirectHardPledge[] = [
    {
      id: "seed-direct-hard-pledge",
      participantId: "seed-direct",
      sameControlClusterId: "seed-direct-cluster",
      netRecipientCents: 25_000,
      state: "hard_saved",
    },
  ];
  const resolution = resolveAtLeastTierPlatformMatch({
    roundId,
    tiers: rewardSchedule.tiers,
    commitments,
    ordinaryDirectPledges,
    now: createdAt,
  });
  const settlementPlan = planAtLeastTierPlatformMatchSettlement({
    roundId,
    resolution,
    commitments,
    reserve,
    rulebookHash: round.rulebookHash,
    feePolicyHash: round.feePolicyHash,
    platformMatchPolicyHash: round.platformMatchPolicyHash,
    rewardScheduleHash: round.rewardScheduleHash,
    ordinaryDirectPledgeNetCents: ordinaryDirectPledges[0]!.netRecipientCents,
    simulationOnly: true,
    now: createdAt,
  });
  const reserveInsufficiencyPlan = planAtLeastTierPlatformMatchSettlement({
    roundId,
    resolution,
    commitments,
    reserve: {
      ...reserve,
      id: "dev-platform-match-reserve-insufficient",
      backedCents: 5_000,
      maxExposureCents: 5_000,
    },
    rulebookHash: round.rulebookHash,
    feePolicyHash: round.feePolicyHash,
    platformMatchPolicyHash: round.platformMatchPolicyHash,
    rewardScheduleHash: round.rewardScheduleHash,
    ordinaryDirectPledgeNetCents: ordinaryDirectPledges[0]!.netRecipientCents,
    simulationOnly: true,
    now: createdAt,
  });
  const circularitySchedule = computeDampedOddsRewardSchedule({
    roundId: `${roundId}-circularity`,
    freeze: true,
    now: createdAt,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_000 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_000 },
    ],
    rMinBps: 1_000,
    rMaxBps: 2_000,
  });
  const circularityCommitments = Array.from({ length: 100 }, (_, index) =>
    buildAtLeastTierPlatformMatchCommitmentPreview({
      id: `seed-circularity-${index}`,
      roundId: `${roundId}-circularity`,
      poolId,
      participantId: `seed-circularity-participant-${index}`,
      selectedTierIndex: 1,
      statedGrossCents: 1_000,
      estimatedFeeCents: 0,
      rewardRateBps: 1_000,
      platformMatchReserveId: reserveId,
      sameControlClusterId: `seed-circularity-cluster-${index}`,
      now: createdAt,
    })
  );
  const circularityResolution = resolveAtLeastTierPlatformMatch({
    roundId: `${roundId}-circularity`,
    tiers: circularitySchedule.tiers,
    commitments: circularityCommitments,
    now: createdAt,
  });

  return {
    allowed: true,
    blockerCodes: [],
    productionSeedCreatesActiveRecords: false,
    publicRoutes: [],
    round,
    reviewedPool,
    schedule: rewardSchedule.schedule,
    tiers: rewardSchedule.tiers,
    reserve,
    commitments,
    ordinaryDirectPledges,
    resolution,
    settlementPlan,
    reserveInsufficiencyPlan,
    circularityResolution,
  };
}

const PROHIBITED_ORDINARY_COPY_PATTERNS: Array<[string, RegExp]> = [
  ["bet", /\bbet(?:s|ting)?\b/i],
  ["wager", /\bwager(?:s|ing)?\b/i],
  ["gamble", /\bgambl(?:e|es|ing)\b/i],
  ["odds", /\bodds\b/i],
  ["profit", /\bprofit\b/i],
  ["prize", /\bprize\b/i],
  ["lottery", /\blottery\b/i],
  ["investment", /\binvestment\b/i],
  ["return", /\b(?:guaranteed\s+)?return\b/i],
  ["risk-free", /\brisk[-\s]?free\b/i],
  ["cashback", /\bcashback\b/i],
  ["free money", /\bfree\s+money\b/i],
  ["paid to donate", /\bpaid\s+to\s+donate\b/i],
  ["user-payout", /\buser[-\s]?payout\b/i],
  ["paid if right", /\bpaid\s+if\s+right\b/i],
  ["payout to you", /\bpayout\s+to\s+you\b/i],
  ["reward to you", /\breward\s+to\s+you\b/i],
  ["win money", /\bwin\s+money\b/i],
  ["exact-tier forecast", /\bexact[-\s]?tier\s+(?:forecast|reward|claim|outcome)s?\b/i],
  ["below-tier forecast", /\bbelow[-\s]?tier\s+(?:forecast|reward|claim|outcome)s?\b/i],
  ["under-tier forecast", /\bunder[-\s]?tier\s+(?:forecast|reward|claim|outcome)s?\b/i],
  ["shorting failure", /\bshort(?:ing)?\s+failure\b/i],
  ["peer-to-peer forecast", /\bpeer[-\s]?to[-\s]?peer\s+(?:forecast|wager|market|claim|bet)s?\b/i],
  ["tradable tier claim", /\btradable\s+tier\s+claims?\b/i],
  ["tradable impact claim", /\btradable\s+impact\s+claims?\b/i],
  ["escrow", /\bescrow(?:ed)?\b/i],
  ["custody", /\bcustody\b/i],
  ["held funds", /\bfunds\s+(?:are\s+)?held\b/i],
  ["reserved user funds", /\b(?:reserved\s+user\s+funds|user\s+funds\s+(?:are\s+)?reserved|funds\s+(?:are\s+)?reserved)\b/i],
  ["protected funds", /\b(?:protected\s+funds|funds\s+(?:are\s+)?protected)\b/i],
  ["authorized funds", /\b(?:authorized\s+funds|funds\s+(?:are\s+)?authorized|saved\s+funds\s+(?:are\s+)?authorized)\b/i],
  ["tax-deductible platform match", /\btax[-\s]?deductible\b[\s\S]{0,80}\bplatform[-\s]?paid match\b/i],
  ["tax treatment", /\btax\s+treatment\b/i],
  ["legal advice", /\blegal\s+advice\b/i],
  ["guaranteed match", /\bguaranteed\s+match\b/i],
  ["guaranteed impact", /\bguaranteed\s+impact\b/i],
  ["guaranteed bonus", /\bguaranteed\s+bonus\b/i],
  ["objective impact", /\bobjective\s+impact\b/i],
  ["moral ranking", /\bmoral\s+ranking\b/i],
  ["moral reputation power", /\bmoral\s+reputation(?:\s+power)?\b/i],
  ["exact live pivotality", /\bexact\s+live\s+pivotality\b/i],
  ["current CRECM mechanism", /\bcurrent\s+CRECM\s+mechanism\b/i],
  ["MVP", /\bMVP\b/],
  ["live", /\blive\b/i],
  ["launch", /\blaunch\b/i],
  ["production-ready", /\bproduction[-\s]+ready\b/i],
  ["real-money available", /\breal[-\s]+money\s+available\b/i],
];

const REQUIRED_ORDINARY_COPY_CLAIMS: Array<[string, RegExp]> = [
  ["non_mvp_warning", /\bnon[-\s]?mvp\b/i],
  ["no_direct_user_payout", /\b(?:no direct user payout|receive no direct payment|no direct payment)\b/i],
  ["platform_contributes_to_projects_on_win", /\bplatform\b[\s\S]{0,80}\bcontributes\b[\s\S]{0,80}\bprojects\b/i],
  ["user_contributes_on_loss", /\buser\b[\s\S]{0,80}\bcontributes\b[\s\S]{0,80}\bprojects\b/i],
  ["own_commitment_excluded", /\bown commitment\b[\s\S]{0,80}\b(?:does not|doesn't|do not)\s+count\b/i],
  ["same_control_excluded", /\bsame[-\s]?control\b[\s\S]{0,80}\b(?:does not|doesn't|do not)\s+count\b/i],
  ["platform_match_excluded_from_forecast", /\bplatform[-\s]?match payments\b[\s\S]{0,80}\bdo not count\b/i],
  ["production_real_money_disabled", /\bproduction\b[\s\S]{0,80}\breal[-\s]?money\b[\s\S]{0,80}\bdisabled\b[\s\S]{0,80}\bpromoted\b/i],
];

export function validateAtLeastTierOrdinaryCopy(copy: string): AtLeastTierOrdinaryCopyPreflight {
  const copyForBlockedTerms = copy
    .replace(/\bnon[-\s]?mvp\b/gi, "")
    .replace(/\bnot\s+part\s+of\b[\s\S]{0,140}\bMVP\b/gi, "")
    .replace(/\bno\s+direct\s+user[-\s]?payout\b/gi, "")
    .replace(/\bno\s+user[-\s]?payout\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?charge\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?hold\b/gi, "")
    .replace(/\bnot\s+escrow\b/gi, "")
    .replace(/\bnot\s+custody\b/gi, "")
    .replace(/\bnot\s+(?:an?\s+)?authorization\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?guarantee\b[\s\S]{0,120}\bauthorization\b/gi, "");
  const blockedTerms = PROHIBITED_ORDINARY_COPY_PATTERNS
    .filter(([, pattern]) => pattern.test(copyForBlockedTerms))
    .map(([term]) => term);
  const missingRequiredClaims = REQUIRED_ORDINARY_COPY_CLAIMS
    .filter(([, pattern]) => !pattern.test(copy))
    .map(([claim]) => claim);

  return {
    passed: blockedTerms.length === 0 && missingRequiredClaims.length === 0,
    blockedTerms,
    missingRequiredClaims,
  };
}

export function buildAtLeastTierCopyPreflightReport({
  id,
  roundId,
  checkedAt,
  lastDeployHash,
  checkedRoutes,
  ordinaryCopy,
  publicMvpSurfaceLeakFound = false,
  liveMoneyOverclaimFound = false,
  exactProgressLeakFound = false,
}: {
  id: string;
  roundId: string;
  checkedAt: string;
  lastDeployHash: string;
  checkedRoutes: string[];
  ordinaryCopy: string;
  publicMvpSurfaceLeakFound?: boolean;
  liveMoneyOverclaimFound?: boolean;
  exactProgressLeakFound?: boolean;
}): AtLeastTierCopyPreflightReport {
  const ordinary = validateAtLeastTierOrdinaryCopy(ordinaryCopy);
  const reportWithoutHash = {
    id,
    roundId,
    checkedAt,
    lastDeployHash,
    checkedRoutes,
    prohibitedTermsFound: ordinary.blockedTerms,
    missingRequiredClaims: ordinary.missingRequiredClaims,
    publicMvpSurfaceLeakFound,
    liveMoneyOverclaimFound,
    exactProgressLeakFound,
    ordinaryCopyPass: ordinary.passed,
    pass: ordinary.passed && !publicMvpSurfaceLeakFound && !liveMoneyOverclaimFound && !exactProgressLeakFound,
  };

  return {
    ...reportWithoutHash,
    reportHash: hashValue(reportWithoutHash),
  };
}
