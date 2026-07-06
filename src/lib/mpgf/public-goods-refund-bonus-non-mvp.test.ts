import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REFUND_BONUS_CALCULATION_VERSION,
  REFUND_BONUS_FEATURE_CLASSIFICATION,
  REFUND_BONUS_FEATURE_KEY,
  REFUND_BONUS_LIVE_MONEY_FLAG,
  buildRefundBonusCopyPreflightReport,
  buildRefundBonusReceipt,
  canRefundBonusAuthorizeSuccessCharge,
  canRefundBonusCaptureSuccessCharge,
  computeRefundBonusCents,
  evaluateRefundBonusCapability,
  evaluateRefundBonusHardPledgeGate,
  evaluateRefundBonusOpenGate,
  evaluateRefundBonusRoundOutcome,
  isRefundBonusBonusEligibilitySnapshotEligible,
  isRefundBonusFeaturePromotionApproved,
  isRefundBonusIdentityEligibilitySnapshotEligible,
  isRefundBonusPaymentCommitmentSnapshotCountable,
  isRefundBonusProjectReviewSnapshotPledgeable,
  planRefundBonusSettlement,
  validateRefundBonusCopy,
  type RefundBonusBonusEligibilitySnapshot,
  type RefundBonusFeaturePromotionRecord,
  type RefundBonusIdentityEligibilitySnapshot,
  type RefundBonusOpenGate,
  type RefundBonusPaymentCommitmentSnapshot,
  type RefundBonusPledge,
  type RefundBonusPledgePool,
  type RefundBonusProjectReviewSnapshot,
  type RefundBonusReserve,
  type RefundBonusRound,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";

const now = "2026-07-06T00:00:00.000Z";
const roundId = "refund-bonus-round";
const poolId = "refund-bonus-pool";
const reserveId = "refund-bonus-reserve";
const rulebookHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const feePolicyHash = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const bonusPolicyHash = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function round(overrides: Partial<RefundBonusRound> = {}): RefundBonusRound {
  return {
    id: roundId,
    deploymentMode: "refund_bonus_non_mvp_labs",
    featureClassification: "non_mvp",
    status: "closed_to_new_pledges",
    activePoolId: poolId,
    participantMinGrossCents: 50,
    participantMaxGrossCents: 2_500,
    roundGrossCaptureCapCents: 100_000,
    roundBonusExposureCapCents: 25_000,
    opensAt: "2026-07-06T00:00:00.000Z",
    closesAt: "2026-07-13T00:00:00.000Z",
    challengeDeadlineAt: "2026-07-14T00:00:00.000Z",
    parametersFrozenAt: now,
    rulebookHash,
    feePolicyHash,
    bonusPolicyHash,
    calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
    sealedProgressMode: "qualitative_only_before_close",
    copyPreflightState: "passed",
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function pool(overrides: Partial<RefundBonusPledgePool> = {}): RefundBonusPledgePool {
  return {
    id: poolId,
    roundId,
    projectIds: ["project-a", "project-b"],
    allocationWeightsBpsByProjectId: { "project-a": 5_000, "project-b": 5_000 },
    thresholdNetRecipientCents: 5_000,
    minVerifiedSupporters: 2,
    minDistinctViewpointClusters: 2,
    minNetRecipientCentsPerSupporter: 50,
    sponsorMatchEnabled: true,
    sponsorMatchBacked: true,
    refundBonusEnabled: true,
    refundBonusReserveId: reserveId,
    bonusCalculationMode: "percentage_of_pledge_capped",
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
    roundBonusExposureCapCents: 25_000,
    qualifyingFailureModes: [
      "net_recipient_threshold_shortfall",
      "verified_supporter_threshold_shortfall",
      "different_view_threshold_shortfall",
    ],
    status: "closed",
    reviewGates: {
      projectScope: "clear",
      recipientRoute: "verified",
      baseline: "clear",
      actionEvidence: "adequate",
      antiThreat: "clear",
      externality: "clear",
      conflict: "clear",
      challenge: "clear",
    },
    ...overrides,
  };
}

function reserve(overrides: Partial<RefundBonusReserve> = {}): RefundBonusReserve {
  return {
    id: reserveId,
    roundId,
    poolId,
    reserveType: "failure_participation_bonus",
    backedCents: 25_000,
    maxExposureCents: 25_000,
    committedExposureCents: 0,
    paidCents: 0,
    heldCents: 0,
    releasedUnusedCents: 0,
    backingState: "dev_simulated",
    legalComplianceState: "approved",
    payoutProviderReady: true,
    sourceHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    bonusPolicyHash,
    publishedAt: now,
    backingConfirmedAt: now,
    status: "backed",
    ...overrides,
  };
}

function gate(overrides: Partial<RefundBonusOpenGate> = {}): RefundBonusOpenGate {
  return {
    ...evaluateRefundBonusOpenGate({
      id: "gate",
      roundId,
      poolId,
      checkedAt: now,
      lastDeployHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      routeCopyPreflightPassed: true,
      projectReviewReady: true,
      bonusReserveReady: true,
      bonusPolicyFrozen: true,
      sponsorStateReady: true,
      capsReady: true,
      paymentProviderReady: true,
      bonusPayoutProviderReady: true,
      identitySybilControlsReady: true,
      legalComplianceReady: true,
      rulebookFrozen: true,
      feePolicyFrozen: true,
      sealedProgressConfigured: true,
      emergencyPauseConfigured: true,
      promotionRecordReady: true,
      staleActiveLabelsAbsent: true,
    }),
    ...overrides,
  };
}

function pledge(
  id: string,
  participantId: string,
  maxGrossCents: number,
  viewpointCluster: RefundBonusPledge["viewpointCluster"],
  overrides: Partial<RefundBonusPledge> = {},
): RefundBonusPledge {
  const bonusExposureReservedCents = computeRefundBonusCents({
    mode: "percentage_of_pledge_capped",
    maxGrossCents,
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
  });

  return {
    id,
    roundId,
    poolId,
    participantId,
    maxGrossCents,
    feeCents: 0,
    estimatedFeeCents: 0,
    estimatedNetRecipientCents: maxGrossCents,
    viewpointCluster,
    visibility: "aggregate_only",
    sameControlClusterId: `sc-${participantId}`,
    paymentClusterId: `pay-${participantId}`,
    pledgeState: "hard_saved",
    paymentCommitmentSnapshotId: `${id}:payment-snapshot`,
    identityEligibilitySnapshotId: `${id}:identity-snapshot`,
    bonusEligibilitySnapshotId: `${id}:bonus-snapshot`,
    expectedBonusCents: bonusExposureReservedCents,
    finalReviewConfirmedAt: now,
    feeAcknowledged: true,
    sealedProgressAcknowledged: true,
    bonusTermsAcknowledged: true,
    providerPaymentMethodConfirmed: true,
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    priorBonusAbuseState: "clear",
    jurisdictionEligibilityState: "clear",
    bonusEligibilityWeightBps: 10_000,
    countingWeightBps: 10_000,
    rulebookHashAtConsent: rulebookHash,
    feePolicyHashAtConsent: feePolicyHash,
    bonusPolicyHashAtConsent: bonusPolicyHash,
    bonusExposureReservedCents,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("refund-bonus metadata and capability gates keep production disabled by default", () => {
  assert.equal(REFUND_BONUS_FEATURE_KEY, "cgpp_refund_bonus_non_mvp_v0_1");
  assert.equal(REFUND_BONUS_LIVE_MONEY_FLAG, "refund_bonus_live_money_enabled");
  assert.equal(REFUND_BONUS_FEATURE_CLASSIFICATION, "non_mvp");

  const publicCard = evaluateRefundBonusCapability({
    action: "view_public_mvp_card",
    actorRole: "public",
    environment: "production",
  });
  assert.equal(publicCard.allowed, false);
  assert.equal(publicCard.productionPublicEnabled, false);
  assert.ok(publicCard.reasons.includes("public_surface_disabled"));

  const money = evaluateRefundBonusCapability({
    action: "execute_bonus_payout",
    actorRole: "service",
    environment: "production",
    featureEnabled: true,
    openGatePassed: true,
    bonusReserveBacked: true,
    legalComplianceApproved: true,
    paymentProviderReady: true,
    bonusPayoutProviderReady: true,
    liveMoneyEnabled: false,
    promotionRecordApproved: false,
  });
  assert.equal(money.allowed, false);
  assert.ok(money.reasons.includes("production_real_money_disabled"));
  assert.ok(money.reasons.includes("missing_promotion_record"));
});

test("open gate fails closed without promotion or clean copy and passes only when every readiness check passes", () => {
  const failed = evaluateRefundBonusOpenGate({
    id: "gate",
    roundId,
    poolId,
    checkedAt: now,
    lastDeployHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    routeCopyPreflightPassed: false,
    projectReviewReady: true,
    bonusReserveReady: true,
    bonusPolicyFrozen: true,
    sponsorStateReady: true,
    capsReady: true,
    paymentProviderReady: true,
    bonusPayoutProviderReady: true,
    identitySybilControlsReady: true,
    legalComplianceReady: true,
    rulebookFrozen: true,
    feePolicyFrozen: true,
    sealedProgressConfigured: true,
    emergencyPauseConfigured: true,
    promotionRecordReady: false,
    staleActiveLabelsAbsent: false,
  });
  assert.equal(failed.state, "failed");
  assert.ok(failed.failedReasonCodes.includes("copy_preflight_failed"));
  assert.ok(failed.failedReasonCodes.includes("promotion_record_missing"));
  assert.ok(failed.failedReasonCodes.includes("stale_active_labels_present"));
  assert.match(failed.gateHash, /^sha256:[a-f0-9]{64}$/);

  assert.equal(gate().state, "passed");
});

test("refund-bonus v137 model artifacts validate project, identity, payment, copy, and promotion readiness", () => {
  const projectReview: RefundBonusProjectReviewSnapshot = {
    id: "project-review",
    roundId,
    poolId,
    projectId: "project-a",
    title: "Reviewed public-good project",
    summary: "A reviewed moral public good.",
    recipientRouteRef: "recipient-route-a",
    recipientRouteState: "verified",
    projectScopeState: "valid_moral_public_good",
    baselineState: "clear",
    actionEvidenceState: "adequate",
    antiThreatState: "clear",
    externalityState: "clear",
    conflictState: "non_blocking",
    challengeState: "clear",
    qualifyingFailureBonusAllowed: true,
    blockedFailureBonusAllowed: false,
    prohibitsPoliticalCampaigns: true,
    prohibitsLobbyingTrades: true,
    prohibitsLifestyleTrades: true,
    prohibitsBehaviorChangePromises: true,
    prohibitsPrivateBenefitProjects: true,
    prohibitsThreatLikeProjects: true,
    reviewSnapshotHash: "sha256:1212121212121212121212121212121212121212121212121212121212121212",
    createdAt: now,
  };
  assert.equal(isRefundBonusProjectReviewSnapshotPledgeable(projectReview), true);
  assert.equal(isRefundBonusProjectReviewSnapshotPledgeable({
    ...projectReview,
    challengeState: "open",
  }), false);

  const identitySnapshot: RefundBonusIdentityEligibilitySnapshot = {
    id: "identity-snapshot",
    roundId,
    participantId: "alice",
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    sameControlClusterId: "sc-alice",
    paymentClusterId: "pay-alice",
    countingWeightBps: 10_000,
    bonusEligibilityWeightBps: 10_000,
    snapshotHash: "sha256:2323232323232323232323232323232323232323232323232323232323232323",
    asOf: now,
  };
  assert.equal(isRefundBonusIdentityEligibilitySnapshotEligible(identitySnapshot), true);
  assert.equal(isRefundBonusIdentityEligibilitySnapshotEligible({
    ...identitySnapshot,
    countingWeightBps: 0,
  }), false);

  const bonusSnapshot: RefundBonusBonusEligibilitySnapshot = {
    id: "bonus-snapshot",
    roundId,
    poolId,
    pledgeId: "pledge-a",
    participantId: "alice",
    eligibleAtPledgeSave: true,
    eligibilityReasonCodes: [],
    humanVerified: true,
    identityVerified: true,
    sybilState: "clear",
    collusionState: "clear",
    sameControlClusterId: "sc-alice",
    paymentClusterId: "pay-alice",
    priorBonusAbuseState: "clear",
    jurisdictionEligibilityState: "clear",
    bonusCalculationMode: "percentage_of_pledge_capped",
    computedBonusCents: 250,
    perUserBonusCapCents: 250,
    reserveId,
    reserveBackingStateAtSave: "dev_simulated",
    snapshotHash: "sha256:3434343434343434343434343434343434343434343434343434343434343434",
    asOf: now,
  };
  assert.equal(isRefundBonusBonusEligibilitySnapshotEligible(bonusSnapshot), true);
  assert.equal(isRefundBonusBonusEligibilitySnapshotEligible({
    ...bonusSnapshot,
    priorBonusAbuseState: "blocked",
  }), false);

  const paymentSnapshot: RefundBonusPaymentCommitmentSnapshot = {
    id: "payment-snapshot",
    roundId,
    poolId,
    pledgeId: "pledge-a",
    participantId: "alice",
    paymentMethodRef: "pm_alice",
    commitmentState: "provider_confirmed",
    savedAt: "2026-07-06T00:00:00.000Z",
    confirmedAt: "2026-07-06T00:01:00.000Z",
    asOf: "2026-07-06T00:02:00.000Z",
    supportsFutureAuthorization: true,
    supportsBonusPayoutMethod: true,
    bonusPayoutMethodRef: "bonus-destination-alice",
    providerEvidenceHash: "sha256:4545454545454545454545454545454545454545454545454545454545454545",
    snapshotHash: "sha256:5656565656565656565656565656565656565656565656565656565656565656",
  };
  assert.equal(isRefundBonusPaymentCommitmentSnapshotCountable(paymentSnapshot, round()), true);
  assert.equal(isRefundBonusPaymentCommitmentSnapshotCountable({
    ...paymentSnapshot,
    commitmentState: "requires_action",
  }, round()), false);

  const report = buildRefundBonusCopyPreflightReport({
    id: "copy-report",
    roundId,
    checkedAt: now,
    lastDeployHash: "sha256:6767676767676767676767676767676767676767676767676767676767676767",
    checkedRoutes: ["/labs/refund-bonus-pledge-pool"],
    activeCopy: `
      Non-MVP labs mechanism.
      If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
      No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
      This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
    `,
  });
  assert.equal(report.pass, true);
  assert.match(report.reportHash, /^sha256:[a-f0-9]{64}$/);

  const failedReport = buildRefundBonusCopyPreflightReport({
    id: "copy-report-failed",
    roundId,
    checkedAt: now,
    lastDeployHash: "sha256:6767676767676767676767676767676767676767676767676767676767676767",
    checkedRoutes: ["/mpgf/rounds/demo"],
    activeCopy: "Get free money and a guaranteed return from bonus impact.",
    prohibitedActiveLabelsFound: ["MVP refund bonus"],
    ordinaryZeroStatePrimaryFound: false,
  });
  assert.equal(failedReport.pass, false);
  assert.equal(failedReport.bonusOverclaimFound, true);
  assert.equal(failedReport.financialPromotionRiskFound, true);

  const approvedPromotion: RefundBonusFeaturePromotionRecord = {
    id: "promotion",
    featureKey: REFUND_BONUS_FEATURE_KEY,
    fromClassification: REFUND_BONUS_FEATURE_CLASSIFICATION,
    toClassification: "limited_public",
    requestedBy: "product",
    approvedByProduct: "product",
    approvedByPayments: "payments",
    approvedByLegal: "legal",
    approvedByTrustSafety: "trust-safety",
    approvedByGovernance: "governance",
    approvalState: "approved",
    approvedAt: now,
    notes: "Approved for later limited public pilot.",
    promotionHash: "sha256:7878787878787878787878787878787878787878787878787878787878787878",
    createdAt: now,
    updatedAt: now,
  };
  assert.equal(isRefundBonusFeaturePromotionApproved(approvedPromotion), true);
  assert.equal(isRefundBonusFeaturePromotionApproved({
    ...approvedPromotion,
    approvedByLegal: undefined,
  }), false);
});

test("hard pledge gate requires final review, provider-confirmed payment, backed reserve, and exposure caps", () => {
  const candidate = pledge("candidate", "casey", 2_500, "humanitarian");
  const passing = evaluateRefundBonusHardPledgeGate({
    environment: "development",
    featureEnabled: true,
    round: round({ status: "labs_open" }),
    pool: pool({ status: "labs_open" }),
    gate: gate(),
    reserve: reserve(),
    pledge: candidate,
    currentGrossExposureCents: 10_000,
    currentBonusExposureCents: 1_000,
  });
  assert.equal(passing.allowed, true);
  assert.equal(passing.providerCallsAllowed, false);

  const missingConsent = evaluateRefundBonusHardPledgeGate({
    environment: "development",
    featureEnabled: true,
    round: round({ status: "labs_open" }),
    pool: pool({ status: "labs_open" }),
    gate: gate(),
    reserve: reserve(),
    pledge: pledge("missing", "morgan", 2_500, "humanitarian", {
      bonusTermsAcknowledged: false,
      finalReviewConfirmedAt: undefined,
      providerPaymentMethodConfirmed: false,
    }),
    currentGrossExposureCents: 0,
    currentBonusExposureCents: 0,
  });
  assert.equal(missingConsent.allowed, false);
  assert.ok(missingConsent.blockerCodes.includes("final_review_missing"));
  assert.ok(missingConsent.blockerCodes.includes("bonus_terms_acknowledgement_missing"));
  assert.ok(missingConsent.blockerCodes.includes("payment_method_not_confirmed"));

  const capFailure = evaluateRefundBonusHardPledgeGate({
    environment: "development",
    featureEnabled: true,
    round: round({ status: "labs_open", roundGrossCaptureCapCents: 2_500, roundBonusExposureCapCents: 250 }),
    pool: pool({ status: "labs_open", roundBonusExposureCapCents: 250 }),
    gate: gate(),
    reserve: reserve({ backedCents: 250, maxExposureCents: 250 }),
    pledge: candidate,
    currentGrossExposureCents: 1,
    currentBonusExposureCents: 1,
  });
  assert.equal(capFailure.allowed, false);
  assert.ok(capFailure.blockerCodes.includes("round_gross_cap_exceeded"));
  assert.ok(capFailure.blockerCodes.includes("round_bonus_exposure_cap_exceeded"));
  assert.ok(capFailure.blockerCodes.includes("pool_bonus_exposure_cap_exceeded"));
  assert.ok(capFailure.blockerCodes.includes("reserve_exposure_cap_exceeded"));

  const production = evaluateRefundBonusHardPledgeGate({
    environment: "production",
    featureEnabled: true,
    round: round({ status: "open" }),
    pool: pool({ status: "open" }),
    gate: gate(),
    reserve: reserve(),
    pledge: candidate,
    currentGrossExposureCents: 0,
    currentBonusExposureCents: 0,
  });
  assert.equal(production.allowed, false);
  assert.ok(production.blockerCodes.includes("production_real_money_disabled"));
  assert.ok(production.blockerCodes.includes("round_not_labs_open"));
  assert.ok(production.blockerCodes.includes("pool_not_labs_open"));
});

test("refund-bonus copy preflight blocks misleading financial language and requires conditional backed-bonus copy", () => {
  const valid = validateRefundBonusCopy(`
    Non-MVP labs mechanism.
    If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
    No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
    This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
  `);
  assert.equal(valid.passed, true);

  const invalid = validateRefundBonusCopy(
    "Get free money, cashback, profit, a risk-free return, a refund with interest, " +
      "and a guaranteed return from bonus impact. You get paid if it fails, no matter why, with failure impact.",
  );
  assert.equal(invalid.passed, false);
  assert.ok(invalid.blockedTerms.includes("free money"));
  assert.ok(invalid.blockedTerms.includes("cashback"));
  assert.ok(invalid.blockedTerms.includes("profit"));
  assert.ok(invalid.blockedTerms.includes("risk-free return"));
  assert.ok(invalid.blockedTerms.includes("refund with interest"));
  assert.ok(invalid.blockedTerms.includes("guaranteed return"));
  assert.ok(invalid.blockedTerms.includes("failure impact"));
  assert.ok(invalid.blockedTerms.includes("paid if it fails no matter why"));
});

test("bonus calculation handles fixed and percentage capped modes", () => {
  assert.equal(computeRefundBonusCents({
    mode: "fixed_cents",
    maxGrossCents: 50,
    fixedBonusCents: 100,
    perUserBonusCapCents: 100,
  }), 100);
  assert.equal(computeRefundBonusCents({
    mode: "percentage_of_pledge_capped",
    maxGrossCents: 2_500,
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
  }), 250);
  assert.equal(computeRefundBonusCents({
    mode: "percentage_of_pledge_capped",
    maxGrossCents: 1_000,
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
  }), 100);
});

test("round clearing distinguishes qualifying support failures from nonqualifying review and reserve failures", () => {
  const pledges = [
    pledge("a", "alice", 1_000, "humanitarian"),
    pledge("b", "bob", 1_000, "prefer_not_to_say"),
  ];
  const qualifying = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool(),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(qualifying.status, "qualifying_failed");
  assert.ok(qualifying.reasonCodes.includes("net_recipient_threshold_shortfall"));
  assert.ok(qualifying.reasonCodes.includes("different_view_threshold_shortfall"));
  assert.equal(qualifying.verifiedSupporterCount, 2);
  assert.equal(qualifying.distinctViewpointClusterCount, 1);

  const reviewBlocked = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ reviewGates: { ...pool().reviewGates, antiThreat: "blocked" } }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(reviewBlocked.status, "nonqualifying_failed");
  assert.deepEqual(reviewBlocked.reasonCodes, ["anti_threat_block"]);

  const unbackedSponsorMatch = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ sponsorMatchEnabled: true, sponsorMatchBacked: false }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(unbackedSponsorMatch.status, "nonqualifying_failed");
  assert.deepEqual(unbackedSponsorMatch.reasonCodes, ["sponsor_match_unbacked"]);

  const unbacked = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool(),
    gate: gate(),
    reserve: reserve({ backingState: "unbacked", backedCents: 0 }),
    pledges,
  });
  assert.equal(unbacked.status, "nonqualifying_failed");
  assert.deepEqual(unbacked.reasonCodes, ["bonus_reserve_unbacked"]);
});

test("same-control and same-payment duplicates do not increase thresholds or bonus counts", () => {
  const pledges = [
    pledge("a", "alice", 2_500, "humanitarian", { sameControlClusterId: "same", paymentClusterId: "pay-a", createdAt: "2026-07-06T00:00:00.000Z" }),
    pledge("b", "bob", 2_500, "animal_inclusive", { sameControlClusterId: "same", paymentClusterId: "pay-b", createdAt: "2026-07-06T00:01:00.000Z" }),
    pledge("c", "carol", 2_500, "long_run_future", { paymentClusterId: "pay-a", createdAt: "2026-07-06T00:02:00.000Z" }),
    pledge("d", "drew", 2_500, "animal_inclusive", { sameControlClusterId: "drew", paymentClusterId: "pay-d", createdAt: "2026-07-06T00:03:00.000Z" }),
  ];
  const outcome = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(outcome.status, "cleared");
  assert.deepEqual(outcome.excludedPledgeIds.sort(), ["b", "c"]);
  assert.equal(outcome.verifiedSupporterCount, 2);
  assert.equal(outcome.distinctViewpointClusterCount, 2);
});

test("authorization and capture side effects are status-gated and exact authorization recomputes thresholds", () => {
  assert.equal(canRefundBonusAuthorizeSuccessCharge("open"), false);
  assert.equal(canRefundBonusAuthorizeSuccessCharge("reviewing"), false);
  assert.equal(canRefundBonusAuthorizeSuccessCharge("cleared"), true);
  assert.equal(canRefundBonusCaptureSuccessCharge("authorizing"), false);
  assert.equal(canRefundBonusCaptureSuccessCharge("payable"), true);

  const pledges = [
    pledge("a", "alice", 2_500, "humanitarian"),
    pledge("b", "bob", 2_500, "animal_inclusive"),
  ];
  const cleared = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(cleared.status, "cleared");

  const recomputed = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
    authorizationAttempts: [
      {
        pledgeId: "a",
        authorizationState: "authorized_exact",
        requiredGrossCents: 2_500,
        authorizedGrossCents: 2_500,
        providerAuthorizationRef: "auth-a",
        validThroughCapture: true,
      },
      {
        pledgeId: "b",
        authorizationState: "wrong_amount",
        requiredGrossCents: 2_500,
        authorizedGrossCents: 2_400,
        providerAuthorizationRef: "auth-b",
        validThroughCapture: true,
      },
    ],
  });
  assert.equal(recomputed.status, "nonqualifying_failed");
  assert.deepEqual(recomputed.reasonCodes, ["authorization_failure_recompute_below_threshold"]);
  assert.equal(recomputed.recomputedAfterAuthorization, true);
  assert.deepEqual(recomputed.excludedPledgeIds, ["b"]);
});

test("settlement separates success, qualifying-failure bonus, and unused reserve channels with idempotent payouts", () => {
  const pledges = [
    pledge("a", "alice", 1_000, "humanitarian"),
    pledge("b", "bob", 1_000, "animal_inclusive"),
  ];
  const qualifying = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool(),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  const bonusPlan = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  assert.equal(bonusPlan.blockedReasonCodes.length, 0);
  assert.equal(bonusPlan.payoutOperations.length, 2);
  assert.equal(bonusPlan.settlementRows.length, 2);
  assert.equal(new Set(bonusPlan.payoutOperations.map((operation) => operation.idempotencyKey)).size, 2);
  assert.ok(bonusPlan.payoutOperations.every((operation) => operation.payoutState === "succeeded"));
  assert.ok(bonusPlan.payoutOperations.every((operation) => operation.eventHash.startsWith("sha256:")));
  assert.ok(bonusPlan.settlementRows.every((row) => row.settlementState === "bonus_paid"));
  assert.equal(bonusPlan.auditReport.finalStatus, "qualifying_failed_bonus_paid");
  assert.equal(bonusPlan.auditReport.rulebookHash, rulebookHash);
  assert.equal(bonusPlan.auditReport.feePolicyHash, feePolicyHash);
  assert.equal(bonusPlan.auditReport.bonusPolicyHash, bonusPolicyHash);
  assert.equal(bonusPlan.auditReport.grossCapturedCents, 0);
  assert.equal(bonusPlan.auditReport.bonusPaidCents, 200);
  assert.equal(bonusPlan.auditReport.bonusReserveBackedCents, 25_000);

  const blocked = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    emergencyPaused: true,
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  assert.ok(blocked.blockedReasonCodes.includes("emergency_pause_active"));

  const missingPayoutEvidence = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "qualifying_failed" }),
    reserve: reserve({ status: "backed" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
  });
  assert.equal(missingPayoutEvidence.payoutOperations.length, 0);
  assert.ok(missingPayoutEvidence.blockedReasonCodes.includes("bonus_reserve_not_active"));
  assert.ok(missingPayoutEvidence.blockedReasonCodes.includes("bonus_settlement_plan_not_approved"));
  assert.ok(missingPayoutEvidence.blockedReasonCodes.includes("eligible_rows_not_recomputed"));

  const pausedPayoutRail = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
    featurePaused: true,
    roundPaused: true,
    bonusReservePaused: true,
    payoutRailPaused: true,
  });
  assert.ok(pausedPayoutRail.blockedReasonCodes.includes("feature_pause_active"));
  assert.ok(pausedPayoutRail.blockedReasonCodes.includes("round_pause_active"));
  assert.ok(pausedPayoutRail.blockedReasonCodes.includes("bonus_reserve_pause_active"));
  assert.ok(pausedPayoutRail.blockedReasonCodes.includes("payout_rail_pause_active"));

  const success = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 1_500, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  const successPlan = planRefundBonusSettlement({
    round: round({ status: "captured" }),
    pool: pool(),
    reserve: reserve(),
    outcome: success,
    roundStatus: "captured",
    simulationOnly: true,
  });
  assert.equal(successPlan.auditReport.finalStatus, "cleared_and_captured");
  assert.ok(successPlan.settlementRows.every((row) => row.settlementState === "captured"));
  assert.equal(successPlan.auditReport.netRecipientDisbursedCents, 2_000);
  assert.equal(successPlan.auditReport.bonusLiabilityCents, 0);
  assert.equal(successPlan.auditReport.bonusUnearnedReleasedCents, 200);
});

test("refund-bonus receipts distinguish success charge from qualifying-failure bonus", () => {
  const pledges = [
    pledge("a", "alice", 1_000, "humanitarian"),
    pledge("b", "bob", 1_000, "animal_inclusive"),
  ];
  const success = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 1_500, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  const successPlan = planRefundBonusSettlement({
    round: round({ status: "captured" }),
    pool: pool(),
    reserve: reserve(),
    outcome: success,
    roundStatus: "captured",
    simulationOnly: true,
  });
  const successReceipt = buildRefundBonusReceipt({
    round: round(),
    pool: pool(),
    reserve: reserve(),
    pledge: pledges[0]!,
    plan: successPlan,
    authorizationAttempt: {
      pledgeId: "a",
      authorizationState: "authorized_exact",
      requiredGrossCents: 1_000,
      authorizedGrossCents: 1_000,
      providerAuthorizationRef: "auth-a",
      validThroughCapture: true,
    },
  });
  assert.equal(successReceipt.receiptKind, "success_charge");
  assert.equal(successReceipt.grossCapturedCents, 1_000);
  assert.equal(successReceipt.netRecipientDisbursedCents, 1_000);
  assert.equal(successReceipt.bonusGrossCents, 0);
  assert.equal(successReceipt.authorizationReference, "auth-a");
  assert.equal(successReceipt.captureReference, "capture:auth-a");
  assert.equal(successReceipt.rulebookHash, rulebookHash);
  assert.equal(successReceipt.feePolicyHash, feePolicyHash);
  assert.equal(successReceipt.bonusPolicyHash, bonusPolicyHash);
  assert.equal(successReceipt.calculationVersion, REFUND_BONUS_CALCULATION_VERSION);
  assert.match(successReceipt.copy, /Failure bonus: 0 cents because the pool cleared/);

  const qualifying = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool(),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  const bonusPlan = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  const failureReceipt = buildRefundBonusReceipt({
    round: round(),
    pool: pool(),
    reserve: reserve(),
    pledge: pledges[0]!,
    plan: bonusPlan,
  });
  assert.equal(failureReceipt.receiptKind, "qualifying_failure_bonus");
  assert.equal(failureReceipt.grossCapturedCents, 0);
  assert.equal(failureReceipt.projectFundingCents, 0);
  assert.equal(failureReceipt.bonusReserveId, reserveId);
  assert.equal(failureReceipt.bonusGrossCents, 100);
  assert.equal(failureReceipt.bonusPayoutState, "succeeded");
  assert.equal(failureReceipt.bonusPayoutReference, "simulated:a");
  assert.equal(failureReceipt.rulebookHash, rulebookHash);
  assert.equal(failureReceipt.bonusPolicyHash, bonusPolicyHash);
  assert.equal(failureReceipt.calculationVersion, REFUND_BONUS_CALCULATION_VERSION);
  assert.match(failureReceipt.copy, /charged 0 cents/);
  assert.match(failureReceipt.copy, /Backed failure-participation bonus: 100 cents/);
});

test("refund-bonus branch remains absent from active public MVP surfaces", () => {
  const labsPage = readFileSync("src/app/labs/refund-bonus-pledge-pool/page.tsx", "utf8");
  const site = readFileSync("src/lib/site.ts", "utf8");
  const roundPage = readFileSync("src/app/mpgf/rounds/[roundId]/page.tsx", "utf8");

  assert.match(labsPage, /Refund-Bonus Pledge Pool/);
  assert.match(labsPage, /REFUND_BONUS_NON_MVP_WARNING/);
  assert.match(labsPage, /backed\s+failure-participation bonus/);
  assert.match(labsPage, /No bonus is paid for blocked, unsafe, ineligible/);
  assert.match(labsPage, /Support shortfall only/);
  assert.match(labsPage, /No charge occurs from this read-only labs page/);
  assert.match(labsPage, /A hard pledge can exist only after the open gate passes/);
  assert.match(labsPage, /backed bonus exposure fits within the round, pool, and reserve caps/);
  assert.match(labsPage, /Optional viewpoint tags are aggregate-only/);
  assert.match(labsPage, /not a moral score/);
  assert.match(labsPage, /do not affect\s+pledge power/);
  assert.equal(site.includes("Refund-Bonus Pledge Pool"), false);
  assert.equal(site.includes(REFUND_BONUS_FEATURE_KEY), false);
  assert.equal(roundPage.includes("Refund-Bonus Pledge Pool"), false);
});
