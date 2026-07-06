import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION,
  AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION,
  AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
  AT_LEAST_TIER_PLATFORM_MATCH_LIVE_MONEY_FLAG,
  AT_LEAST_TIER_PLATFORM_MATCH_NON_MVP_WARNING,
  buildAtLeastTierCopyPreflightReport,
  buildAtLeastTierDevSeedData,
  buildAtLeastTierPlatformMatchCommitmentPreview,
  computeDampedOddsRewardSchedule,
  evaluateAtLeastTierAdminWorkflow,
  evaluateAtLeastTierCommitmentOpenGate,
  evaluateAtLeastTierJobGate,
  evaluateAtLeastTierPlatformMatchCapability,
  isAtLeastTierFeaturePromotionApproved,
  isAtLeastTierLossAuthorizationCaptureReady,
  isAtLeastTierRoundReadyForLabs,
  planAtLeastTierPlatformMatchSettlement,
  reconcileAtLeastTierLossAuthorizations,
  resolveAtLeastTierPlatformMatch,
  validateAtLeastTierOrdinaryCopy,
  type AtLeastTierAdminWorkflowAction,
  type AtLeastTierFeaturePromotionRecord,
  type AtLeastTierPublicReportJson,
  type AtLeastTierPlatformMatchRound,
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
    copyPreflightPassed: false,
    paymentProviderReady: true,
    legalComplianceApproved: true,
    sybilControlsReady: false,
  });
  assert.equal(productionMoney.allowed, false);
  assert.ok(productionMoney.reasons.includes("production_real_money_disabled"));
  assert.ok(productionMoney.reasons.includes("missing_promotion_record"));
  assert.ok(productionMoney.reasons.includes("copy_preflight_failed"));
  assert.ok(productionMoney.reasons.includes("sybil_controls_not_ready"));

  const productionOpenRound = evaluateAtLeastTierPlatformMatchCapability({
    action: "open_round",
    actorRole: "admin",
    environment: "production",
    featureEnabled: true,
    liveMoneyEnabled: false,
    promotionRecordApproved: false,
    copyPreflightPassed: false,
  });
  assert.equal(productionOpenRound.allowed, false);
  assert.ok(productionOpenRound.reasons.includes("production_real_money_disabled"));
  assert.ok(productionOpenRound.reasons.includes("missing_promotion_record"));
  assert.ok(productionOpenRound.reasons.includes("copy_preflight_failed"));

  const productionPublicReport = evaluateAtLeastTierPlatformMatchCapability({
    action: "publish_public_report",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    promotionRecordApproved: false,
    copyPreflightPassed: false,
  });
  assert.equal(productionPublicReport.allowed, false);
  assert.ok(productionPublicReport.reasons.includes("missing_promotion_record"));
  assert.ok(productionPublicReport.reasons.includes("copy_preflight_failed"));

  const labsSchedule = evaluateAtLeastTierPlatformMatchCapability({
    action: "compute_reward_schedule",
    actorRole: "admin",
    environment: "development",
    featureEnabled: true,
  });
  assert.equal(labsSchedule.allowed, true);
});

test("dev and test seed data covers v137 sample cases without production activation", () => {
  const production = buildAtLeastTierDevSeedData({ environment: "production", now });
  assert.equal(production.allowed, false);
  assert.deepEqual(production.blockerCodes, ["production_seed_disabled"]);
  assert.equal(production.productionSeedCreatesActiveRecords, false);
  assert.deepEqual(production.publicRoutes, []);
  assert.deepEqual(production.tiers, []);
  assert.deepEqual(production.commitments, []);

  const seed = buildAtLeastTierDevSeedData({ environment: "development", now });
  assert.equal(seed.allowed, true);
  assert.equal(seed.productionSeedCreatesActiveRecords, false);
  assert.deepEqual(seed.publicRoutes, []);
  assert.equal(seed.reviewedPool?.projectReviewState, "reviewed_moral_public_good");
  assert.equal(seed.reviewedPool?.recipientRouteState, "verified");
  assert.deepEqual(seed.tiers.map((tier) => tier.thresholdNetRecipientCents), [
    100_000,
    300_000,
    500_000,
    1_000_000,
    2_500_000,
  ]);
  assert.deepEqual(seed.tiers.map((tier) => tier.frozenForecastProbabilityBps), [7_500, 5_500, 3_500, 2_000, 1_000]);
  assert.deepEqual(seed.tiers.map((tier) => tier.rewardRateBps), [500, 905, 1473, 2262, 3500]);
  assert.equal(seed.reserve?.backingState, "dev_simulated");
  assert.equal(seed.reserve?.status, "backed");

  assert.ok(seed.resolution?.rows.some((row) => row.outcome === "won_platform_pays"));
  assert.ok(seed.resolution?.rows.some((row) => row.outcome === "lost_user_pays"));
  assert.ok(seed.resolution?.rows.some((row) => row.exclusionReason === "commitment_state_excluded_payment"));
  assert.ok(seed.resolution?.rows.some((row) => row.excludedSameControlEffectiveSupportCents > 0));
  assert.deepEqual(seed.settlementPlan?.blockedReasonCodes, []);
  assert.ok(seed.reserveInsufficiencyPlan?.blockedReasonCodes.includes("reserve_exposure_exceeded"));

  const firstCircularityRow = seed.circularityResolution?.rows[0];
  assert.equal(seed.circularityResolution?.snapshot.effectiveSupportTotalCents, 10_000);
  assert.equal(firstCircularityRow?.otherEligibleEffectiveSupportCents, 9_900);
  assert.equal(firstCircularityRow?.outcome, "lost_user_pays");
});

test("round, copy preflight report, and promotion record preserve at-least-tier non-MVP gates", () => {
  const schedule = defaultSchedule();
  const round: AtLeastTierPlatformMatchRound = {
    id: roundId,
    poolId,
    featureKey: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
    deploymentMode: "at_least_tier_platform_match_non_mvp_labs",
    featureClassification: "non_mvp",
    status: "labs_open",
    opensAt: "2026-07-06T00:00:00.000Z",
    closesAt: "2026-07-13T00:00:00.000Z",
    parametersFrozenAt: "2026-07-05T00:00:00.000Z",
    rulebookHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    feePolicyHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    platformMatchPolicyHash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    rewardScheduleHash: schedule.schedule.outputHash,
    calculationVersion: AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION,
    sealedProgressMode: "qualitative_only_before_close",
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
  assert.equal(isAtLeastTierRoundReadyForLabs(round), true);
  assert.equal(isAtLeastTierRoundReadyForLabs({
    ...round,
    productionRealMoneyEnabled: true,
  }), false);

  const report = buildAtLeastTierCopyPreflightReport({
    id: "at-least-copy-report",
    roundId,
    checkedAt: now,
    lastDeployHash: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    checkedRoutes: ["/labs/at-least-tier-platform-match"],
    ordinaryCopy: `
      Non-MVP labs mechanism.
      There is no direct user payout.
      If the user wins, the platform contributes the tier-specific match to reviewed projects.
      If the user loses, the user contributes the stated amount to reviewed projects.
      The user's own commitment does not count toward the forecast result.
      Same-control accounts do not count toward the forecast result.
      Platform-match payments do not count toward forecast results.
      Production real-money use is disabled unless this mechanism is explicitly promoted.
    `,
  });
  assert.equal(report.pass, true);
  assert.equal(report.ordinaryCopyPass, true);
  assert.match(report.reportHash, /^sha256:[a-f0-9]{64}$/);

  const failedReport = buildAtLeastTierCopyPreflightReport({
    id: "at-least-copy-report-failed",
    roundId,
    checkedAt: now,
    lastDeployHash: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    checkedRoutes: ["/mpgf"],
    ordinaryCopy: "Live MVP launch: make a bet for guaranteed return and payout to you.",
    publicMvpSurfaceLeakFound: true,
    liveMoneyOverclaimFound: true,
  });
  assert.equal(failedReport.pass, false);
  assert.ok(failedReport.prohibitedTermsFound.includes("bet"));
  assert.ok(failedReport.prohibitedTermsFound.includes("MVP"));
  assert.ok(failedReport.prohibitedTermsFound.includes("live"));
  assert.ok(failedReport.missingRequiredClaims.includes("production_real_money_disabled"));

  const promotion: AtLeastTierFeaturePromotionRecord = {
    id: "at-least-promotion",
    featureKey: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_KEY,
    fromClassification: AT_LEAST_TIER_PLATFORM_MATCH_FEATURE_CLASSIFICATION,
    toClassification: "limited_public",
    requestedBy: "product",
    approvedByProduct: "product",
    approvedByPayments: "payments",
    approvedByLegal: "legal",
    approvedByTrustSafety: "trust-safety",
    approvedByGovernance: "governance",
    approvalState: "approved",
    approvedAt: now,
    notes: "Approved for a future limited public pilot.",
    promotionHash: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    createdAt: now,
    updatedAt: now,
  };
  assert.equal(isAtLeastTierFeaturePromotionApproved(promotion), true);
  assert.equal(isAtLeastTierFeaturePromotionApproved({
    ...promotion,
    approvedByPayments: undefined,
  }), false);
});

test("admin and job gates keep at-least-tier live operations blocked while labs simulation can run", () => {
  const allowedLabsAdminActions: AtLeastTierAdminWorkflowAction[] = [
    "create_draft_labs_round",
    "configure_reviewed_pool",
    "configure_tiers",
    "enter_frozen_forecast_probabilities",
    "compute_reward_schedule",
    "inspect_reward_schedule",
    "freeze_reward_schedule",
    "configure_platform_match_reserve",
    "run_copy_preflight",
    "run_simulated_commitments",
    "run_simulated_authorization_resolution_settlement",
    "view_audit_report",
    "pause_or_kill_switch",
  ];
  for (const action of allowedLabsAdminActions) {
    const gate = evaluateAtLeastTierAdminWorkflow({
      action,
      actorRole: "admin",
      environment: "development",
      featureEnabled: true,
      rewardScheduleFrozen: true,
      rewardScheduleValid: true,
      reserveBacked: true,
      reserveExposureExceeded: false,
    });
    assert.equal(gate.allowed, true, action);
    assert.equal(gate.providerCallsAllowed, false, action);
  }

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

  const invalidQ = computeDampedOddsRewardSchedule({
    roundId,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 50 },
    ],
  });
  assert.equal(invalidQ.valid, false);
  assert.ok(invalidQ.schedule.invalidReasonCodes.includes("tier_2_q_invalid"));

  const cappedReward = computeDampedOddsRewardSchedule({
    roundId,
    rMinBps: 100,
    rMaxBps: 600,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
      { tierIndex: 3, thresholdNetRecipientCents: 300_000, frozenForecastProbabilityBps: 3_500 },
    ],
  });
  assert.equal(cappedReward.valid, true);
  assert.equal(cappedReward.tiers.at(-1)?.rewardRateBps, 600);
  assert.ok(cappedReward.tiers.every((tier) => tier.rewardRateBps <= 600));

  const impossibleRounding = computeDampedOddsRewardSchedule({
    roundId,
    rMinBps: 500,
    rMaxBps: 501,
    minRewardIncrementBps: 2,
    tiers: [
      { tierIndex: 1, thresholdNetRecipientCents: 100_000, frozenForecastProbabilityBps: 7_500 },
      { tierIndex: 2, thresholdNetRecipientCents: 200_000, frozenForecastProbabilityBps: 5_500 },
    ],
  });
  assert.equal(impossibleRounding.valid, false);
  assert.ok(impossibleRounding.schedule.invalidReasonCodes.includes("reward_rounding_breaks_monotonicity"));

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

test("failed loss authorizations are excluded before at-least-tier recomputation", () => {
  const schedule = defaultSchedule();
  const tierOne = schedule.tiers[0]!;
  const commitments = [
    commitment("auth-a", "alice", tierOne.tierIndex, 1_000_000, tierOne.rewardRateBps, "cluster-a"),
    commitment("auth-b", "bob", tierOne.tierIndex, 1_000_000, tierOne.rewardRateBps, "cluster-b"),
    commitment("auth-c", "carol", tierOne.tierIndex, 1_000_000, tierOne.rewardRateBps, "cluster-c"),
  ];
  const exactAttempt = {
    commitmentId: "auth-a",
    authorizationState: "authorized_exact" as const,
    requiredGrossCents: 1_000_000,
    authorizedGrossCents: 1_000_000,
    providerAuthorizationRef: "auth-a-ref",
    validThroughCapture: true,
  };
  assert.equal(isAtLeastTierLossAuthorizationCaptureReady(exactAttempt, commitments[0]!), true);
  assert.equal(isAtLeastTierLossAuthorizationCaptureReady({
    ...exactAttempt,
    authorizationState: "wrong_amount",
    authorizedGrossCents: 999_999,
  }, commitments[0]!), false);
  assert.equal(isAtLeastTierLossAuthorizationCaptureReady({
    ...exactAttempt,
    authorizationState: "expired",
    validThroughCapture: false,
  }, commitments[0]!), false);

  const preAuthorizationResolution = resolveAtLeastTierPlatformMatch({
    roundId,
    tiers: schedule.tiers,
    commitments,
    now,
  });
  assert.ok(preAuthorizationResolution.rows.every((row) => row.outcome === "won_platform_pays"));

  const reconciled = reconcileAtLeastTierLossAuthorizations({
    commitments,
    authorizationAttempts: [
      exactAttempt,
      {
        commitmentId: "auth-b",
        authorizationState: "wrong_amount",
        requiredGrossCents: 1_000_000,
        authorizedGrossCents: 999_999,
        providerAuthorizationRef: "auth-b-ref",
        validThroughCapture: true,
      },
    ],
    now,
  });
  assert.deepEqual(reconciled.exactAuthorizedCommitmentIds, ["auth-a"]);
  assert.deepEqual(reconciled.excludedCommitmentIds.sort(), ["auth-b", "auth-c"]);
  assert.equal(reconciled.authorizationFailureCount, 2);

  const recomputed = resolveAtLeastTierPlatformMatch({
    roundId,
    tiers: schedule.tiers,
    commitments: reconciled.commitments,
    now,
  });
  assert.equal(recomputed.rows.find((row) => row.commitmentId === "auth-a")?.outcome, "lost_user_pays");
  assert.equal(recomputed.rows.find((row) => row.commitmentId === "auth-b")?.exclusionReason, "commitment_state_excluded_payment");
  assert.equal(recomputed.rows.find((row) => row.commitmentId === "auth-c")?.exclusionReason, "commitment_state_excluded_payment");
  assert.equal(recomputed.snapshot.eligibleCommitmentCount, 1);
  assert.equal(recomputed.snapshot.excludedCommitmentCount, 2);
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
    {
      ...commitment("payment-failed", "erin", 1, 100_000, 10_000, "cluster-e"),
      commitmentState: "excluded_payment" as const,
    },
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
    sponsorMatchNetRecipientCents: 20_000,
    simulationOnly: true,
    now,
  });

  assert.deepEqual(plan.blockedReasonCodes, []);
  assert.equal(plan.auditReport.calculationVersion, AT_LEAST_TIER_PLATFORM_MATCH_CALCULATION_VERSION);
  assert.equal(plan.auditReport.finalStatus, "simulation_only");
  assert.ok(plan.rows.some((row) => row.outcome === "won_platform_pays" && row.userGrossCapturedCents === 0));
  assert.ok(plan.rows.some((row) => row.outcome === "lost_user_pays" && row.userGrossCapturedCents > 0));
  assert.ok(plan.rows.some((row) => row.outcome === "excluded" && row.userGrossCapturedCents === 0));
  assert.equal(plan.rows.find((row) => row.commitmentId === "winner")?.userAuthorizationOperation, "release");
  assert.equal(plan.rows.find((row) => row.commitmentId === "supporter-b")?.userAuthorizationOperation, "release");
  assert.equal(plan.rows.find((row) => row.commitmentId === "loser")?.userAuthorizationOperation, "capture");
  assert.equal(plan.rows.find((row) => row.commitmentId === "payment-failed")?.userAuthorizationOperation, "release");
  assert.equal(
    new Set(plan.rows.map((row) => row.userAuthorizationIdempotencyKey).filter(Boolean)).size,
    plan.rows.filter((row) => row.userAuthorizationOperation !== "none").length,
  );
  assert.ok(plan.platformMatchOperations.every((operation) => operation.destinationProjectId === "reviewed-public-good-projects"));
  assert.equal(new Set(plan.platformMatchOperations.map((operation) => operation.idempotencyKey)).size, plan.platformMatchOperations.length);
  const retryPlan = planAtLeastTierPlatformMatchSettlement({
    roundId,
    resolution,
    commitments,
    reserve: backedReserve(),
    rulebookHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    feePolicyHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    platformMatchPolicyHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    rewardScheduleHash: schedule.schedule.outputHash,
    ordinaryDirectPledgeNetCents: 100_000,
    sponsorMatchNetRecipientCents: 20_000,
    simulationOnly: true,
    now,
  });
  assert.deepEqual(
    retryPlan.rows.map((row) => [row.commitmentId, row.userAuthorizationOperation, row.userAuthorizationIdempotencyKey]),
    plan.rows.map((row) => [row.commitmentId, row.userAuthorizationOperation, row.userAuthorizationIdempotencyKey]),
  );
  assert.deepEqual(
    retryPlan.platformMatchOperations.map((operation) => [operation.commitmentId, operation.idempotencyKey]),
    plan.platformMatchOperations.map((operation) => [operation.commitmentId, operation.idempotencyKey]),
  );
  assert.equal(retryPlan.auditReport.grossUserLossCapturedCents, plan.auditReport.grossUserLossCapturedCents);
  assert.equal(retryPlan.auditReport.platformMatchGrossPaidCents, plan.auditReport.platformMatchGrossPaidCents);
  assert.equal(
    plan.auditReport.finalProjectDisbursementCents,
      plan.auditReport.userLossNetRecipientCents +
      plan.auditReport.platformMatchNetRecipientCents +
      plan.auditReport.ordinaryDirectPledgeNetCents +
      plan.auditReport.sponsorMatchNetRecipientCents,
  );
  assert.equal(plan.auditReport.sponsorMatchNetRecipientCents, 20_000);
  const publicReport = plan.auditReport.publicReportJson as AtLeastTierPublicReportJson;
  const requiredAccountingChannels: Array<keyof AtLeastTierPublicReportJson> = [
    "forecastCommitmentGrossCents",
    "forecastCommitmentNetRecipientCents",
    "forecastResolutionOtherUserNetCents",
    "selectedAtLeastTier",
    "resolvedAtLeastTier",
    "forecastWon",
    "userPaidOnLossCents",
    "platformPaidOnWinCents",
    "platformMatchReserveBackedCents",
    "platformMatchExposureReservedCents",
    "platformMatchPaidCents",
    "platformMatchReleasedUnusedCents",
    "ordinaryDirectPledgeNetCents",
    "sponsorMatchNetRecipientCents",
    "finalProjectDisbursementCents",
    "feesCents",
  ];
  for (const channel of requiredAccountingChannels) {
    assert.ok(channel in publicReport, `missing at-least-tier accounting channel: ${channel}`);
  }
  assert.equal(publicReport.forecastCommitmentGrossCents, 220_000);
  assert.equal(publicReport.forecastCommitmentNetRecipientCents, 220_000);
  assert.equal(
    publicReport.forecastResolutionOtherUserNetCents,
    resolution.rows.reduce((sum, row) => sum + row.otherEligibleEffectiveSupportCents, 0),
  );
  assert.deepEqual(publicReport.selectedAtLeastTier, { "1": 3, "2": 1 });
  assert.equal(publicReport.resolvedAtLeastTier, 1);
  assert.deepEqual(publicReport.forecastWon, { wonCount: 2, lostCount: 1, excludedCount: 1 });
  assert.equal(publicReport.sponsorMatchNetRecipientCents, 20_000);
  assert.equal(
    publicReport.feesCents,
    plan.auditReport.userLossFeeCents + plan.auditReport.platformMatchFeeCents,
  );
  assert.equal(JSON.stringify(publicReport).includes("objective impact"), false);
  assert.match(
    JSON.stringify(plan.auditReport.publicReportJson),
    /User-paid loss funds, platform-paid win funds, ordinary direct pledges, sponsor match, reserves, fees, and final project disbursement are separate/,
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
  assert.equal(blocked.platformMatchOperations.length, 0);
  assert.ok(blocked.rows.every((row) => row.userAuthorizationOperation === "release"));
  assert.ok(blocked.rows.every((row) => row.userGrossCapturedCents === 0));
  assert.ok(blocked.rows.every((row) => row.platformMatchNetRecipientDisbursedCents === 0));
  assert.equal(new Set(blocked.rows.map((row) => row.userAuthorizationIdempotencyKey)).size, blocked.rows.length);
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
    Production real-money use is disabled unless this mechanism is explicitly promoted.
  `);
  assert.equal(valid.passed, true);

  const invalid = validateAtLeastTierOrdinaryCopy(`
    Make a bet with odds for a guaranteed return and get a payout to you if right. This is user-payout language.
  `);
  assert.equal(invalid.passed, false);
  assert.ok(invalid.blockedTerms.includes("bet"));
  assert.ok(invalid.blockedTerms.includes("odds"));
  assert.ok(invalid.blockedTerms.includes("return"));
  assert.ok(invalid.blockedTerms.includes("payout to you"));
  assert.ok(invalid.blockedTerms.includes("user-payout"));
  assert.ok(invalid.missingRequiredClaims.includes("non_mvp_warning"));

  const unsupportedForecastCopy = validateAtLeastTierOrdinaryCopy(`
    Non-MVP labs mechanism.
    There is no direct user payout.
    If you win, the platform contributes the tier-specific match to reviewed projects.
    If you lose, the user contributes the stated amount to reviewed projects.
    Your own commitment does not count toward your forecast result.
    Same-control accounts do not count toward your forecast result.
    Platform-match payments do not count toward forecast results.
    Production real-money use is disabled unless this mechanism is explicitly promoted.
    Try exact-tier forecasts, below-tier rewards, under-tier claims, shorting failure,
    peer-to-peer forecasts, tradable tier claims, tradable impact claims, reward to you, and win money.
  `);
  assert.equal(unsupportedForecastCopy.passed, false);
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("exact-tier forecast"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("below-tier forecast"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("under-tier forecast"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("shorting failure"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("peer-to-peer forecast"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("tradable tier claim"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("tradable impact claim"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("reward to you"));
  assert.ok(unsupportedForecastCopy.blockedTerms.includes("win money"));

  const misleadingProductCopy = validateAtLeastTierOrdinaryCopy(`
    Non-MVP labs mechanism.
    There is no direct user payout.
    If you win, the platform contributes the tier-specific match to reviewed projects.
    If you lose, the user contributes the stated amount to reviewed projects.
    Your own commitment does not count toward your forecast result.
    Same-control accounts do not count toward your forecast result.
    Platform-match payments do not count toward forecast results.
    Production real-money use is disabled unless this mechanism is explicitly promoted.
    User funds are reserved, funds are held, funds are protected, saved funds are authorized,
    escrowed custody is available, and the platform match has tax treatment and legal advice.
    It offers a guaranteed match, guaranteed impact, guaranteed bonus, paid to donate, risk-free, moral ranking,
    moral reputation power, exact live pivotality, and current CRECM mechanism status.
  `);
  assert.equal(misleadingProductCopy.passed, false);
  assert.ok(misleadingProductCopy.blockedTerms.includes("reserved user funds"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("held funds"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("protected funds"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("authorized funds"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("escrow"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("custody"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("tax treatment"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("legal advice"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("guaranteed match"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("guaranteed impact"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("guaranteed bonus"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("paid to donate"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("risk-free"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("moral ranking"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("moral reputation power"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("exact live pivotality"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("current CRECM mechanism"));
});

test("documentation and route absence match v137 non-MVP constraints", () => {
  const docs = readFileSync("docs/at-least-tier-platform-match-non-mvp.md", "utf8");
  const labsPage = readFileSync("src/app/labs/at-least-tier-platform-match/page.tsx", "utf8");
  const labsRoundPage = readFileSync("src/app/labs/at-least-tier-platform-match/[roundSlug]/page.tsx", "utf8");
  const labsCommitPage = readFileSync("src/app/labs/at-least-tier-platform-match/[roundSlug]/commit/page.tsx", "utf8");
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
  assert.match(labsPage, /Production real-money use is disabled unless this mechanism is explicitly promoted/);
  assert.match(labsPage, /Own commitments, same-control accounts, fees, sponsor match/);
  assert.match(labsRoundPage, /read-only labs surface/);
  assert.match(labsRoundPage, /sealed qualitative status only before close/);
  assert.match(labsRoundPage, /other eligible users&apos; effective support/);
  assert.match(labsRoundPage, /View disabled commitment review/);
  assert.match(labsCommitPage, /required v137 commitment copy in an off state/);
  assert.match(labsCommitPage, /hard, payment-backed platform-match commitment/);
  assert.match(labsCommitPage, /I understand my own commitment does not count toward my forecast result/);
  assert.match(labsCommitPage, /I understand that if I lose, I may be charged my stated contribution/);
  assert.match(labsCommitPage, /I understand that if I win, the platform contributes to the projects and I receive no direct payment/);
  assert.match(labsCommitPage, /Hard commitment disabled/);
  assert.equal(site.includes("/labs/at-least-tier-platform-match"), false);
  assert.equal(roundPage.includes("At-Least-Tier Platform Match"), false);
});

test("v137 non-MVP branches do not expose advanced allocation control surfaces", () => {
  const branchSources = [
    readFileSync("src/lib/mpgf/public-goods-refund-bonus-non-mvp.ts", "utf8"),
    readFileSync("src/lib/mpgf/public-goods-at-least-tier-platform-match.ts", "utf8"),
  ].join("\n");
  const docs = readFileSync("docs/at-least-tier-platform-match-non-mvp.md", "utf8");

  const prohibitedControls: Array<[string, RegExp]> = [
    ["per-user counterparty buckets", /\b(?:counterpartyBucket|counterpartyBuckets|perUserCounterpartyBucket)\b/],
    ["per-project stances", /\b(?:projectStance|projectStances|perProjectStance)\b/],
    ["per-project caps", /\b(?:projectCap|projectCaps|perProjectCap)\b/],
    ["conditional trade intents", /\b(?:conditionalTradeIntent|conditionalTradeIntents)\b/],
    ["coalition optimizer", /\b(?:coalitionOptimizer|coalitionOptimizers)\b/],
    ["algorithmic pool allocation changes", /\b(?:algorithmicPoolAllocation|poolAllocationChangeAfterConsent)\b/],
    ["user-defined fallback routing", /\b(?:userDefinedFallback|fallbackRouting|fallbackRouteOverride)\b/],
    ["coordination credits", /\b(?:coordinationCredit|coordinationCredits)\b/],
    ["impact certificates", /\b(?:impactCertificate|impactCertificates)\b/],
    ["diversity-aware bonus match", /\b(?:diversityAwareBonusMatch|diversityBonusMatch)\b/],
    ["QF-like bonus scoring", /\b(?:qfLikeBonusScoring|quadraticFundingBonusScoring)\b/],
    ["public moral reputation", /\b(?:publicMoralReputation|moralReputationScore)\b/],
  ];

  for (const [label, pattern] of prohibitedControls) {
    assert.equal(pattern.test(branchSources), false, label);
  }
  assert.match(docs, /Advanced allocation controls remain out of scope/);
  assert.match(docs, /per-user counterparty buckets/);
  assert.match(docs, /coalition optimizers/);
  assert.match(docs, /user-defined fallback routing/);
});
