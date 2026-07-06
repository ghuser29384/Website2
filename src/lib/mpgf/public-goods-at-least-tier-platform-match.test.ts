import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION,
  AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION,
  AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
  AT_LEAST_TIER_PLATFORM_MATCH_LIVE_MONEY_FLAG,
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  buildAtLeastTierPlatformMatchCommitmentPreview,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierAdminWorkflow,
  evaluateAtLeastTierCommitmentOpenGate,
  evaluateAtLeastTierJobGate,
  evaluateAtLeastTierPlatformMatchCapability,
  planAtLeastTierPlatformMatchSettlement,
  resolveAtLeastTierPlatformMatch,
  validateAtLeastTierOrdinaryCopy,
  type AtLeastTierPlatformMatchCommitment,
  type PlatformMatchReserve,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";

const roundId = "at-least-tier-round-1";
const poolId = "reviewed-public-goods-pool";
const reserveId = "platform-match-reserve";
const now = "2026-07-06T00:00:00.000Z";

function defaultSchedule() {
  return computeDampedOddsRewardSchedule({
    roundId,
    freeze: true,
    now,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
}

function commitment(
  id: string,
  participantId: string,
  selectedTierIndex: number,
  statedGrossCents: number,
  rewardRateBps: number,
  sameControlClusterId?: string,
): AtLeastTierPlatformMatchCommitment {
  return buildAtLeastTierPlatformMatchCommitmentPreview({
    id,
    roundId,
    poolId,
    participantId,
    selectedTierIndex,
    statedGrossCents,
    estimatedFeeCents: 0,
    rewardRateBps,
    platformMatchReserveId: reserveId,
    sameControlClusterId,
    now,
  });
}

function backedReserve(overrides: Partial<PlatformMatchReserve> = {}): PlatformMatchReserve {
  return {
    id: reserveId,
    roundId,
    poolId,
    reserveType: "at_least_tier_platform_match",
    backedCents: 1_000_000,
    committedCents: 0,
    paidCents: 0,
    releasedUnusedCents: 0,
    maxExposureCents: 1_000_000,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    paymentProviderReady: true,
    recipientRouteReady: true,
    sourceHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    platformMatchPolicyHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    status: "backed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("at-least-tier feature metadata and capability gate keep production disabled by default", () => {
  assert.equal(AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY, "cgpp_at_least_tier_platform_match_non_mvp_v0_1");
  assert.equal(AT_LEAST_TIER_PLATFORM_MATCH_LIVE_MONEY_FLAG, "at_least_tier_platform_match_live_money_enabled");
  assert.equal(AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION, "non_mvp");
  assert.match(AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING, /Production real-money use is disabled/);

  const publicRoute = evaluateAtLeastTierPlatformMatchCapability({
    action: "view_public_landing",
    actorRole: "public",
    environment: "production",
  });
  assert.equal(publicRoute.allowed, false);
  assert.equal(publicRoute.productionPublicEnabled, false);
  assert.equal(publicRoute.productionRealMoneyEnabled, false);
  assert.ok(publicRoute.reasons.includes("public_surface_disabled"));
  assert.ok(publicRoute.reasons.includes("route_not_available_in_current_deployment"));

  const productionMoney = evaluateAtLeastTierPlatformMatchCapability({
    action: "execute_platform_match_contribution",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    liveMoneyEnabled: false,
    promotionRecordApproved: false,
    platformMatchReserveExists: true,
    platformMatchReserveBacked: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    paymentProviderReady: true,
    legalComplianceApproved: true,
  });
  assert.equal(productionMoney.allowed, false);
  assert.ok(productionMoney.reasons.includes("production_real_money_disabled"));
  assert.ok(productionMoney.reasons.includes("missing_promotion_record"));

  const labsSchedule = evaluateAtLeastTierPlatformMatchCapability({
    action: "compute_reward_schedule",
    actorRole: "admin",
    environment: "development",
    featureEnabled: true,
  });
  assert.equal(labsSchedule.allowed, true);
});

test("admin and job gates keep at-least-tier live operations blocked while labs simulation can run", () => {
  const labsSchedule = evaluateAtLeastTierAdminWorkflow({
    action: "compute_reward_schedule",
    actorRole: "admin",
    environment: "development",
    featureEnabled: true,
  });
  assert.equal(labsSchedule.allowed, true);
  assert.equal(labsSchedule.providerCallsAllowed, false);

  const invalidSimulation = evaluateAtLeastTierAdminWorkflow({
    action: "run_simulated_authorization_resolution_settlement",
    actorRole: "admin",
    environment: "development",
    featureEnabled: true,
    rewardScheduleFrozen: false,
    rewardScheduleValid: false,
    reserveBacked: false,
  });
  assert.equal(invalidSimulation.allowed, false);
  assert.ok(invalidSimulation.blockerCodes.includes("invalid_damped_odds_schedule"));
  assert.ok(invalidSimulation.blockerCodes.includes("schedule_not_frozen"));
  assert.ok(invalidSimulation.blockerCodes.includes("reserve_unbacked"));

  const realSettlement = evaluateAtLeastTierAdminWorkflow({
    action: "execute_real_payment_authorization_capture",
    actorRole: "admin",
    environment: "production",
    featureEnabled: true,
    liveMoneyEnabled: true,
    promotionRecordApproved: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserveBacked: true,
    copyPreflightPassed: true,
    legalComplianceApproved: true,
    paymentProviderReady: true,
    sybilControlsReady: true,
  });
  assert.equal(realSettlement.allowed, false);
  assert.equal(realSettlement.providerCallsAllowed, false);
  assert.ok(realSettlement.blockerCodes.includes("feature_non_mvp"));
  assert.ok(realSettlement.blockerCodes.includes("production_real_money_disabled"));

  const settlementJob = evaluateAtLeastTierJobGate({
    job: "settlement_job",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    simulationOnly: false,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserveBacked: true,
  });
  assert.equal(settlementJob.allowed, false);
  assert.equal(settlementJob.providerCallsAllowed, false);
  assert.ok(settlementJob.blockerCodes.includes("feature_non_mvp"));
  assert.ok(settlementJob.blockerCodes.includes("production_real_money_disabled"));
  assert.ok(settlementJob.blockerCodes.includes("missing_promotion_record"));

  const scheduledCloseSimulation = evaluateAtLeastTierJobGate({
    job: "scheduled_close_job",
    actorRole: "service",
    environment: "test",
    featureEnabled: true,
    simulationOnly: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
  });
  assert.equal(scheduledCloseSimulation.allowed, true);

  const productionReport = evaluateAtLeastTierJobGate({
    job: "public_report_job",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    simulationOnly: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    publicReportImpliesLiveProduct: true,
  });
  assert.equal(productionReport.allowed, false);
  assert.ok(productionReport.blockerCodes.includes("public_report_live_product_copy_blocked"));
});

test("commitment open gate requires labs access, frozen schedule, backed reserve, caps, payment, and final acknowledgements", () => {
  const passingGate = evaluateAtLeastTierCommitmentOpenGate({
    actorRole: "labs_participant",
    environment: "development",
    roundStatus: "labs_open",
    featureEnabled: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserve: backedReserve({ backedCents: 10_000, maxExposureCents: 10_000 }),
    currentReservedExposureCents: 2_000,
    requestedExposureCents: 1_000,
    copyPreflightPassed: true,
    paymentMethodProviderConfirmed: true,
    finalReviewConfirmed: true,
    ownCommitmentExclusionAcknowledged: true,
    lossChargeAcknowledged: true,
    noDirectPayoutAcknowledged: true,
    nonMvpAcknowledged: true,
  });
  assert.equal(passingGate.allowed, true);
  assert.equal(passingGate.providerCallsAllowed, false);

  const reserveBlocked = evaluateAtLeastTierCommitmentOpenGate({
    actorRole: "labs_participant",
    environment: "development",
    roundStatus: "labs_open",
    featureEnabled: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserve: backedReserve({ backedCents: 3_000, maxExposureCents: 3_000 }),
    currentReservedExposureCents: 2_500,
    requestedExposureCents: 1_000,
    copyPreflightPassed: true,
    paymentMethodProviderConfirmed: true,
    finalReviewConfirmed: true,
    ownCommitmentExclusionAcknowledged: true,
    lossChargeAcknowledged: true,
    noDirectPayoutAcknowledged: true,
    nonMvpAcknowledged: true,
  });
  assert.equal(reserveBlocked.allowed, false);
  assert.ok(reserveBlocked.blockerCodes.includes("reserve_exposure_exceeded"));

  const missingConsent = evaluateAtLeastTierCommitmentOpenGate({
    actorRole: "labs_participant",
    environment: "development",
    roundStatus: "labs_open",
    featureEnabled: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserve: backedReserve(),
    currentReservedExposureCents: 0,
    requestedExposureCents: 1_000,
    copyPreflightPassed: true,
    paymentMethodProviderConfirmed: false,
    finalReviewConfirmed: false,
    ownCommitmentExclusionAcknowledged: false,
    lossChargeAcknowledged: false,
    noDirectPayoutAcknowledged: false,
    nonMvpAcknowledged: false,
  });
  assert.equal(missingConsent.allowed, false);
  assert.ok(missingConsent.blockerCodes.includes("payment_method_not_confirmed"));
  assert.ok(missingConsent.blockerCodes.includes("final_review_consent_missing"));
  assert.ok(missingConsent.blockerCodes.includes("own_commitment_exclusion_ack_missing"));
  assert.ok(missingConsent.blockerCodes.includes("loss_charge_ack_missing"));
  assert.ok(missingConsent.blockerCodes.includes("no_direct_payout_ack_missing"));
  assert.ok(missingConsent.blockerCodes.includes("non_mvp_ack_missing"));

  const productionGate = evaluateAtLeastTierCommitmentOpenGate({
    actorRole: "labs_participant",
    environment: "production",
    roundStatus: "open",
    featureEnabled: true,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    reserve: backedReserve(),
    currentReservedExposureCents: 0,
    requestedExposureCents: 1_000,
    copyPreflightPassed: true,
    paymentMethodProviderConfirmed: true,
    finalReviewConfirmed: true,
    ownCommitmentExclusionAcknowledged: true,
    lossChargeAcknowledged: true,
    noDirectPayoutAcknowledged: true,
    nonMvpAcknowledged: true,
  });
  assert.equal(productionGate.allowed, false);
  assert.ok(productionGate.blockerCodes.includes("feature_non_mvp"));
  assert.ok(productionGate.blockerCodes.includes("production_real_money_disabled"));
  assert.ok(productionGate.blockerCodes.includes("round_not_labs_open"));
});

test("damped odds schedule computes frozen monotone default tier rates and fails closed on invalid inputs", () => {
  const schedule = defaultSchedule();

  assert.equal(schedule.valid, true);
  assert.equal(schedule.schedule.state, "frozen");
  assert.equal(schedule.schedule.scheduleVersion, "damped_odds_sqrt_v0_1");
  assert.match(schedule.schedule.inputHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(schedule.schedule.outputHash, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(schedule.tiers.map((tier) => tier.rewardRateBps), [500, 905, 1473, 2262, 3500]);
  assert.ok(schedule.tiers.every((tier, index, tiers) => index === 0 || tier.rewardRateBps > tiers[index - 1]!.rewardRateBps));
  assert.ok(schedule.tiers.every((tier, index, tiers) => index === 0 || tier.thresholdNetRecipientCents > tiers[index - 1]!.thresholdNetRecipientCents));
  assert.ok(schedule.tiers.every((tier, index, tiers) => index === 0 || tier.frozenForecastProbabilityBps < tiers[index - 1]!.frozenForecastProbabilityBps));

  const badThresholds = computeDampedOddsRewardSchedule({
    roundId,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(badThresholds.valid, false);
  assert.ok(badThresholds.schedule.invalidReasonCodes.includes("tier_2_threshold_not_strictly_increasing"));

  const nonDecreasingQ = computeDampedOddsRewardSchedule({
    roundId,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(nonDecreasingQ.valid, false);
  assert.ok(nonDecreasingQ.schedule.invalidReasonCodes.includes("tier_2_q_not_strictly_decreasing"));

  const gammaSix = computeDampedOddsRewardSchedule({
    roundId,
    gammaDecimalString: "0.6",
    freeze: true,
    now,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 500_000, frozenForecastProbabilityBps: 3_500 },
      { tierIndex: 4, thresholdNetRecipientCents: 1_000_000, frozenForecastProbabilityBps: 2_000 },
      { tierIndex: 5, thresholdNetRecipientCents: 2_500_000, frozenForecastProbabilityBps: 1_000 },
    ],
  });
  assert.equal(gammaSix.valid, true);
  assert.equal(gammaSix.schedule.gammaDecimalString, "0.6");
  assert.equal(gammaSix.tiers[0]?.rewardRateBps, 500);
  assert.equal(gammaSix.tiers.at(-1)?.rewardRateBps, 3500);
  assert.ok(gammaSix.tiers.every((tier, index, tiers) => index === 0 || tier.rewardRateBps > tiers[index - 1]!.rewardRateBps));

  const gammaSeven = computeDampedOddsRewardSchedule({
    roundId,
    gammaDecimalString: "0.70",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(gammaSeven.valid, true);

  const invalidGamma = computeDampedOddsRewardSchedule({
    roundId,
    gammaDecimalString: "0.9",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(invalidGamma.valid, false);
  assert.ok(invalidGamma.schedule.invalidReasonCodes.includes("gamma_out_of_range"));

  const unsupportedPrecision = computeDampedOddsRewardSchedule({
    roundId,
    gammaDecimalString: "0.555",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(unsupportedPrecision.valid, false);
  assert.ok(unsupportedPrecision.schedule.invalidReasonCodes.includes("gamma_decimal_precision_unsupported"));
});

test("leave-one-cluster-out resolution uses effective support and excludes own, same-control, fees, drafts, and failed rows", () => {
  const schedule = defaultSchedule();
  const tierOne = schedule.tiers[0]!;
  const tierFive = schedule.tiers[4]!;
  const commitments = [
    commitment("winner", "alice", tierOne.tierIndex, 10_000, 10_000, "cluster-a"),
    commitment("supporter-b", "bob", tierOne.tierIndex, 100_000, 10_000, "cluster-b"),
    commitment("supporter-c", "carol", tierOne.tierIndex, 100_000, 10_000, "cluster-c"),
    commitment("same-control", "alex", tierOne.tierIndex, 1_000_000, 10_000, "cluster-a"),
    commitment("loser", "drew", tierFive.tierIndex, 10_000, tierFive.rewardRateBps, "cluster-d"),
    {
      ...commitment("draft", "erin", tierOne.tierIndex, 1_000_000, 10_000, "cluster-e"),
      commitmentState: "draft" as const,
    },
    {
      ...commitment("payment-failed", "fran", tierOne.tierIndex, 1_000_000, 10_000, "cluster-f"),
      commitmentState: "excluded_payment" as const,
    },
  ];
  const resolution = resolveAtLeastTierPlatformMatch({
    roundId,
    tiers: schedule.tiers,
    commitments,
    ordinaryDirectPledges: [
      { id: "direct-hard", participantId: "grace", netRecipientCents: 25_000, state: "hard_saved" },
      { id: "direct-fee-only", participantId: "hank", netRecipientCents: 0, state: "hard_saved" },
      { id: "direct-stale", participantId: "irene", netRecipientCents: 1_000_000, state: "stale_authorization" },
    ],
    now,
  });

  const winner = resolution.rows.find((row) => row.commitmentId === "winner");
  assert.ok(winner);
  assert.equal(winner.outcome, "won_platform_pays");
  assert.equal(winner.otherEligibleEffectiveSupportCents, 228_500);
  assert.equal(winner.excludedSameControlEffectiveSupportCents, 1_000_000);
  assert.equal(winner.guaranteedEffectiveSupportCents, 10_000);

  const loser = resolution.rows.find((row) => row.commitmentId === "loser");
  assert.ok(loser);
  assert.equal(loser.outcome, "lost_user_pays");
  assert.equal(loser.selectedTierThresholdNetCents, tierFive.thresholdNetRecipientCents);

  const draft = resolution.rows.find((row) => row.commitmentId === "draft");
  assert.equal(draft?.outcome, "excluded");
  assert.equal(draft?.exclusionReason, "commitment_state_draft");
  const paymentFailed = resolution.rows.find((row) => row.commitmentId === "payment-failed");
  assert.equal(paymentFailed?.outcome, "excluded");
  assert.equal(paymentFailed?.exclusionReason, "commitment_state_excluded_payment");
  assert.equal(resolution.snapshot.ordinaryDirectPledgeSupportCents, 25_000);
  assert.match(resolution.snapshot.outputHash, /^sha256:[a-f0-9]{64}$/);
});

test("circularity guard does not clear a tier from raw stated commitments", () => {
  const schedule = computeDampedOddsRewardSchedule({
    roundId: "circularity-round",
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_000 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_000 },
    ],
    rMinBps: 1_000,
    rMaxBps: 2_000,
    freeze: true,
    now,
  });
  assert.equal(schedule.valid, true);
  const commitments = Array.from({ length: 100 }, (_, index) =>
    commitment(`user-${index}`, `participant-${index}`, 1, 1_000, 1_000, `cluster-${index}`),
  );
  const resolution = resolveAtLeastTierPlatformMatch({
    roundId: "circularity-round",
    tiers: schedule.tiers,
    commitments,
    now,
  });
  const first = resolution.rows[0]!;

  assert.equal(commitments.reduce((sum, row) => sum + row.statedNetRecipientCents, 0), 100_000);
  assert.equal(resolution.snapshot.effectiveSupportTotalCents, 10_000);
  assert.equal(first.otherEligibleEffectiveSupportCents, 9_900);
  assert.equal(first.outcome, "lost_user_pays");
});

test("simulated settlement separates user-paid loss, platform-paid win, reserve, fees, and idempotency channels", () => {
  const schedule = defaultSchedule();
  const commitments = [
    commitment("winner", "alice", 1, 10_000, 10_000, "cluster-a"),
    commitment("supporter-b", "bob", 1, 100_000, 10_000, "cluster-b"),
    commitment("loser", "drew", 2, 10_000, schedule.tiers[1]!.rewardRateBps, "cluster-d"),
  ];
  const resolution = resolveAtLeastTierPlatformMatch({
    roundId,
    tiers: schedule.tiers,
    commitments,
    ordinaryDirectPledges: [
      { id: "direct-hard", participantId: "grace", netRecipientCents: 100_000, state: "captured" },
    ],
    now,
  });
  const plan = planAtLeastTierPlatformMatchSettlement({
    roundId,
    resolution,
    commitments,
    reserve: backedReserve(),
    rulebookHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    feePolicyHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    platformMatchPolicyHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    rewardScheduleHash: schedule.schedule.outputHash,
    ordinaryDirectPledgeNetCents: 100_000,
    simulationOnly: true,
    now,
  });

  assert.deepEqual(plan.blockedReasonCodes, []);
  assert.equal(plan.auditReport.calculationVersion, AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION);
  assert.equal(plan.auditReport.finalStatus, "simulation_only");
  assert.ok(plan.rows.some((row) => row.outcome === "won_platform_pays" && row.userGrossCapturedCents === 0));
  assert.ok(plan.rows.some((row) => row.outcome === "lost_user_pays" && row.userGrossCapturedCents > 0));
  assert.ok(plan.platformMatchOperations.every((operation) => operation.destinationProjectId === "reviewed-public-good-projects"));
  assert.equal(new Set(plan.platformMatchOperations.map((operation) => operation.idempotencyKey)).size, plan.platformMatchOperations.length);
  assert.equal(
    plan.auditReport.finalProjectDisbursementCents,
    plan.auditReport.userLossNetRecipientCents +
      plan.auditReport.platformMatchNetRecipientCents +
      plan.auditReport.ordinaryDirectPledgeNetCents,
  );
  assert.match(
    JSON.stringify(plan.auditReport.publicReportJson),
    /User-paid loss funds, platform-paid win funds, reserves, fees, and final project disbursement are separate/,
  );

  const blocked = planAtLeastTierPlatformMatchSettlement({
    roundId,
    resolution,
    commitments,
    reserve: backedReserve({ backingState: "unbacked", backedCents: 0 }),
    rulebookHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    feePolicyHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    platformMatchPolicyHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    rewardScheduleHash: schedule.schedule.outputHash,
    simulationOnly: true,
    now,
  });
  assert.ok(blocked.blockedReasonCodes.includes("platform_match_reserve_unbacked"));
  assert.equal(blocked.auditReport.finalStatus, "blocked");
});

test("ordinary copy preflight blocks wagering and return language while requiring non-MVP user promises", () => {
  const valid = validateAtLeastTierOrdinaryCopy(`
    Non-MVP labs mechanism.
    There is no direct user payout.
    If you win, the platform contributes the tier-specific match to reviewed projects.
    If you lose, the user contributes the stated amount to reviewed projects.
    Your own commitment does not count toward your forecast result.
    Same-control accounts do not count toward your forecast result.
    Platform-match payments do not count toward forecast results.
  `);
  assert.equal(valid.passed, true);

  const invalid = validateAtLeastTierOrdinaryCopy(`
    Make a bet for a guaranteed return and get a payout to you if right.
  `);
  assert.equal(invalid.passed, false);
  assert.ok(invalid.blockedTerms.includes("bet"));
  assert.ok(invalid.blockedTerms.includes("return"));
  assert.ok(invalid.blockedTerms.includes("payout to you"));
  assert.ok(invalid.missingRequiredClaims.includes("non_mvp_warning"));
});

test("documentation and route absence match v137 non-MVP constraints", () => {
  const docs = readFileSync("docs/at-least-tier-platform-match-non-mvp.md", "utf8");
  const labsPage = readFileSync("src/app/labs/at-least-tier-platform-match/page.tsx", "utf8");
  const site = readFileSync("src/lib/site.ts", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");

  assert.match(docs, /Status: NON-MVP/);
  assert.match(docs, /no direct user payout/i);
  assert.match(docs, /damped odds schedule formula/i);
  assert.match(docs, /leave-one-cluster-out/i);
  assert.match(docs, /Production public commitments, real-money authorization, capture, platform-match contribution, project routing, and settlement are disabled/);
  assert.match(labsPage, /At-Least-Tier Platform Match/);
  assert.match(labsPage, /AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING/);
  assert.match(labsPage, /There is no direct user payout/);
  assert.match(labsPage, /platform contributes/);
  assert.match(labsPage, /you contribute the stated amount/);
  assert.match(labsPage, /Own commitments, same-control accounts, fees, sponsor match/);
  assert.equal(site.includes("/labs/at-least-tier-platform-match"), false);
  assert.equal(roundPage.includes("At-Least-Tier Platform Match"), false);
});
