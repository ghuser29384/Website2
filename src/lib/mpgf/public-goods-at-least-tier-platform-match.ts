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
  | "legal_compliance_not_approved"
  | "payment_provider_not_ready"
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
  paymentProviderReady?: boolean;
  legalComplianceApproved?: boolean;
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
  settlementState:
    | "pending"
    | "captured_user_loss"
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
  publicReportJson: unknown;
  publishedAt?: string;
}

export interface AtLeastTierSettlementPlan {
  rows: AtLeastTierSettlementRow[];
  platformMatchOperations: PlatformMatchContributionOperation[];
  auditReport: AtLeastTierAuditReport;
  blockedReasonCodes: string[];
}

export interface AtLeastTierOrdinaryCopyPreflight {
  passed: boolean;
  blockedTerms: string[];
  missingRequiredClaims: string[];
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

function isRoleAllowedForLabs(role: AtLeastTierPlatformMatchActorRole) {
  return role === "labs_participant" || role === "admin" || role === "service";
}

function isRoleAllowedForAdminAction(role: AtLeastTierPlatformMatchActorRole) {
  return role === "admin" || role === "service";
}

function uniqueReasons(reasons: AtLeastTierPlatformMatchCapabilityReason[]) {
  return [...new Set(reasons)];
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

  if (MONEY_OR_PROVIDER_ACTIONS.has(input.action)) {
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
    if (!input.legalComplianceApproved) {
      reasons.push("legal_compliance_not_approved");
    }
    if (!input.paymentProviderReady) {
      reasons.push("payment_provider_not_ready");
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

function sqrtOddsScaled(qBps: number) {
  return integerSquareRoot(
    BigInt(BPS_DENOMINATOR - qBps) * SQRT_SCALE * SQRT_SCALE / BigInt(qBps),
  );
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
  if (gammaDecimalString !== "0.5") {
    invalidReasonCodes.push("gamma_not_supported_by_sqrt_v0_1");
  }
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

  if (invalidReasonCodes.length > 0) {
    return invalidSchedule(input, invalidReasonCodes);
  }

  const roots = tiers.map((tier) => sqrtOddsScaled(tier.frozenForecastProbabilityBps));
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

function isReserveBacked(reserve: PlatformMatchReserve) {
  return (
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
  simulationOnly?: boolean;
  now?: string;
}): AtLeastTierSettlementPlan {
  const createdAt = nowIso(now);
  const commitmentById = new Map(commitments.map((commitment) => [commitment.id, commitment]));
  const blockedReasonCodes: string[] = [];
  const totalWinnerExposureCents = resolution.rows
    .filter((row) => row.outcome === "won_platform_pays")
    .reduce((sum, row) => sum + row.platformMatchNetCents, 0);

  if (!isReserveBacked(reserve)) {
    blockedReasonCodes.push("platform_match_reserve_unbacked");
  }
  if (totalWinnerExposureCents > reserve.maxExposureCents || reserve.maxExposureCents > reserve.backedCents) {
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
        settlementState: "paid_platform_match",
        createdAt,
      };
    }

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
      settlementState: "captured_user_loss",
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

  const grossUserLossCapturedCents = rows.reduce((sum, row) => sum + row.userGrossCapturedCents, 0);
  const userLossFeeCents = rows.reduce((sum, row) => sum + row.userFeeCents, 0);
  const userLossNetRecipientCents = rows.reduce((sum, row) => sum + row.userNetRecipientDisbursedCents, 0);
  const platformMatchGrossPaidCents = rows.reduce((sum, row) => sum + row.platformMatchGrossCostCents, 0);
  const platformMatchFeeCents = rows.reduce((sum, row) => sum + row.platformMatchFeeCents, 0);
  const platformMatchNetRecipientCents = rows.reduce((sum, row) => sum + row.platformMatchNetRecipientDisbursedCents, 0);
  const platformMatchExposureReservedCents = rows.reduce((sum, row) => sum + row.platformMatchExposureReservedCents, 0);
  const platformMatchUnusedReleasedCents = rows.reduce((sum, row) => sum + row.platformMatchExposureReleasedCents, 0);
  const finalProjectDisbursementCents =
    userLossNetRecipientCents + platformMatchNetRecipientCents + ordinaryDirectPledgeNetCents;

  return {
    rows,
    platformMatchOperations,
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
        userPaidOnLossCents: userLossNetRecipientCents,
        platformPaidOnWinCents: platformMatchNetRecipientCents,
        platformMatchReserveBackedCents: reserve.backedCents,
        platformMatchExposureReservedCents,
        platformMatchPaidCents: platformMatchNetRecipientCents,
        platformMatchReleasedUnusedCents: platformMatchUnusedReleasedCents,
        ordinaryDirectPledgeNetCents,
        finalProjectDisbursementCents,
        feesCents: userLossFeeCents + platformMatchFeeCents,
        note: "Simulation-only non-MVP report. User-paid loss funds, platform-paid win funds, reserves, fees, and final project disbursement are separate.",
      },
    },
  };
}

const PROHIBITED_ORDINARY_COPY_PATTERNS: Array<[string, RegExp]> = [
  ["bet", /\bbet(?:s|ting)?\b/i],
  ["wager", /\bwager(?:s|ing)?\b/i],
  ["gamble", /\bgambl(?:e|es|ing)\b/i],
  ["profit", /\bprofit\b/i],
  ["prize", /\bprize\b/i],
  ["lottery", /\blottery\b/i],
  ["investment", /\binvestment\b/i],
  ["return", /\b(?:guaranteed\s+)?return\b/i],
  ["cashback", /\bcashback\b/i],
  ["free money", /\bfree\s+money\b/i],
  ["paid if right", /\bpaid\s+if\s+right\b/i],
  ["payout to you", /\bpayout\s+to\s+you\b/i],
  ["guaranteed match", /\bguaranteed\s+match\b/i],
  ["objective impact", /\bobjective\s+impact\b/i],
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
];

export function validateAtLeastTierOrdinaryCopy(copy: string): AtLeastTierOrdinaryCopyPreflight {
  const blockedTerms = PROHIBITED_ORDINARY_COPY_PATTERNS
    .filter(([, pattern]) => pattern.test(copy))
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
