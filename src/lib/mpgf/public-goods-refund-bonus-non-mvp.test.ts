import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REFUND_BONUS_CALCULATION_VERSION,
  REFUND_BONUS_FEATURE_CLASSIFICATION,
  REFUND_BONUS_FEATURE_KEY,
  REFUND_BONUS_LIVE_MONEY_FLAG,
  canRefundBonusAuthorizeSuccessCharge,
  canRefundBonusCaptureSuccessCharge,
  computeRefundBonusCents,
  evaluateRefundBonusCapability,
  evaluateRefundBonusOpenGate,
  evaluateRefundBonusRoundOutcome,
  planRefundBonusSettlement,
  validateRefundBonusCopy,
  type RefundBonusOpenGate,
  type RefundBonusPledge,
  type RefundBonusPledgePool,
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
    parametersFrozenAt: now,
    rulebookHash,
    feePolicyHash,
    bonusPolicyHash,
    calculationVersion: REFUND_BONUS_CALCULATION_VERSION,
    sealedProgressMode: "qualitative_only_before_close",
    copyPreflightState: "passed",
    productionPublicEnabled: false,
    productionRealMoneyEnabled: false,
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
  viewpointTag: string,
  overrides: Partial<RefundBonusPledge> = {},
): RefundBonusPledge {
  return {
    id,
    roundId,
    poolId,
    participantId,
    maxGrossCents,
    feeCents: 0,
    viewpointTag,
    sameControlClusterId: `sc-${participantId}`,
    paymentClusterId: `pay-${participantId}`,
    pledgeState: "hard_saved",
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
    bonusExposureReservedCents: computeRefundBonusCents({
      mode: "percentage_of_pledge_capped",
      maxGrossCents,
      bonusRatioBps: 1_000,
      perUserBonusCapCents: 250,
    }),
    createdAt: now,
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

test("refund-bonus copy preflight blocks misleading financial language and requires conditional backed-bonus copy", () => {
  const valid = validateRefundBonusCopy(`
    Non-MVP labs mechanism.
    If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
    No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
    This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
  `);
  assert.equal(valid.passed, true);

  const invalid = validateRefundBonusCopy("Get free money, cashback, and a guaranteed return from bonus impact.");
  assert.equal(invalid.passed, false);
  assert.ok(invalid.blockedTerms.includes("free money"));
  assert.ok(invalid.blockedTerms.includes("cashback"));
  assert.ok(invalid.blockedTerms.includes("guaranteed return"));
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
    pledge("b", "bob", 2_500, "animal-inclusive", { sameControlClusterId: "same", paymentClusterId: "pay-b", createdAt: "2026-07-06T00:01:00.000Z" }),
    pledge("c", "carol", 2_500, "long-run-future", { paymentClusterId: "pay-a", createdAt: "2026-07-06T00:02:00.000Z" }),
    pledge("d", "drew", 2_500, "animal-inclusive", { sameControlClusterId: "drew", paymentClusterId: "pay-d", createdAt: "2026-07-06T00:03:00.000Z" }),
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
    pledge("b", "bob", 2_500, "animal-inclusive"),
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
  assert.equal(recomputed.status, "qualifying_failed");
  assert.equal(recomputed.recomputedAfterAuthorization, true);
  assert.deepEqual(recomputed.excludedPledgeIds, ["b"]);
});

test("settlement separates success, qualifying-failure bonus, and unused reserve channels with idempotent payouts", () => {
  const pledges = [
    pledge("a", "alice", 1_000, "humanitarian"),
    pledge("b", "bob", 1_000, "animal-inclusive"),
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
    pool: pool(),
    reserve: reserve(),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
  });
  assert.equal(bonusPlan.blockedReasonCodes.length, 0);
  assert.equal(bonusPlan.payoutOperations.length, 2);
  assert.equal(new Set(bonusPlan.payoutOperations.map((operation) => operation.idempotencyKey)).size, 2);
  assert.equal(bonusPlan.auditReport.finalStatus, "qualifying_failed");
  assert.equal(bonusPlan.auditReport.grossCapturedCents, 0);
  assert.equal(bonusPlan.auditReport.bonusPaidCents, 200);
  assert.equal(bonusPlan.auditReport.bonusReserveBackedCents, 25_000);

  const blocked = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool(),
    reserve: reserve(),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    emergencyPaused: true,
    simulationOnly: true,
  });
  assert.ok(blocked.blockedReasonCodes.includes("emergency_pause_active"));

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
  assert.equal(successPlan.auditReport.finalStatus, "captured");
  assert.equal(successPlan.auditReport.netRecipientDisbursedCents, 2_000);
  assert.equal(successPlan.auditReport.bonusLiabilityCents, 0);
  assert.equal(successPlan.auditReport.bonusUnearnedReleasedCents, 200);
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
  assert.equal(site.includes("Refund-Bonus Pledge Pool"), false);
  assert.equal(site.includes(REFUND_BONUS_FEATURE_KEY), false);
  assert.equal(roundPage.includes("Refund-Bonus Pledge Pool"), false);
});
