import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REFUND_BONUS_CALCULATION_VERSION,
  REFUND_BONUS_ACCOUNTING_METRIC_KEYS,
  REFUND_BONUS_COMPREHENSION_QUESTIONS,
  REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS,
  REFUND_BONUS_EXPERIMENT_STAGE_POLICIES,
  REFUND_BONUS_FEATURE_CLASSIFICATION,
  REFUND_BONUS_FEATURE_KEY,
  REFUND_BONUS_LIVE_MONEY_FLAG,
  REFUND_BONUS_PRODUCT_METRIC_KEYS,
  REFUND_BONUS_SAFETY_METRIC_KEYS,
  buildRefundBonusCopyPreflightReport,
  buildRefundBonusReceipt,
  canRefundBonusAuthorizeSuccessCharge,
  canRefundBonusCaptureSuccessCharge,
  canRefundBonusPayoutBonus,
  computeRefundBonusCents,
  evaluateRefundBonusCapability,
  evaluateRefundBonusComprehensionMetrics,
  evaluateRefundBonusCopyPreflightFreshness,
  evaluateRefundBonusExperimentPivotCriteria,
  evaluateRefundBonusExperimentStageReadiness,
  evaluateRefundBonusHardPledgeGate,
  evaluateRefundBonusKillCriteria,
  evaluateRefundBonusOpenGate,
  evaluateRefundBonusRoundOutcome,
  isRefundBonusBonusEligibilitySnapshotEligible,
  isRefundBonusAuthorizationAttemptCaptureReady,
  isRefundBonusFeaturePromotionApproved,
  isRefundBonusFeeQuoteValid,
  isRefundBonusIdentityEligibilitySnapshotEligible,
  isRefundBonusPaymentCommitmentSnapshotCountable,
  isRefundBonusProjectReviewSnapshotPledgeable,
  planRefundBonusSettlement,
  validateRefundBonusCopy,
  type RefundBonusBonusEligibilitySnapshot,
  type RefundBonusFeaturePromotionRecord,
  type RefundBonusFeeQuote,
  type RefundBonusIdentityEligibilitySnapshot,
  type RefundBonusOpenGate,
  type RefundBonusPaymentCommitmentSnapshot,
  type RefundBonusPledge,
  type RefundBonusPledgePool,
  type RefundBonusProjectReviewSnapshot,
  type RefundBonusPublicReportJson,
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

  const legalBlockedBonusRoute = evaluateRefundBonusCapability({
    action: "execute_bonus_payout",
    actorRole: "service",
    environment: "development",
    featureEnabled: true,
    openGatePassed: true,
    bonusReserveBacked: true,
    legalComplianceApproved: false,
    paymentProviderReady: true,
    bonusPayoutProviderReady: true,
  });
  assert.equal(legalBlockedBonusRoute.allowed, false);
  assert.ok(legalBlockedBonusRoute.reasons.includes("legal_compliance_not_approved"));
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
    prohibitsCampaignDonations: true,
    prohibitsLobbyingTrades: true,
    prohibitsLifestyleTrades: true,
    prohibitsBehaviorChangePromises: true,
    prohibitsPrivateBenefitProjects: true,
    prohibitsPayToStopHarmProposals: true,
    prohibitsThreatLikeProjects: true,
    prohibitsCoerciveProposals: true,
    prohibitsExtortionaryProposals: true,
    reviewSnapshotHash: "sha256:1212121212121212121212121212121212121212121212121212121212121212",
    createdAt: now,
  };
  assert.equal(isRefundBonusProjectReviewSnapshotPledgeable(projectReview), true);
  assert.equal(isRefundBonusProjectReviewSnapshotPledgeable({
    ...projectReview,
    challengeState: "open",
  }), false);
  for (const prohibitedCategoryFlag of [
    "prohibitsCampaignDonations",
    "prohibitsPayToStopHarmProposals",
    "prohibitsCoerciveProposals",
    "prohibitsExtortionaryProposals",
  ] as const) {
    assert.equal(isRefundBonusProjectReviewSnapshotPledgeable({
      ...projectReview,
      [prohibitedCategoryFlag]: false,
    }), false, prohibitedCategoryFlag);
  }

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

  const feeQuote: RefundBonusFeeQuote = {
    id: "fee-quote-a",
    roundId,
    pledgeId: "pledge-a",
    grossCents: 2_500,
    feeCents: 125,
    netRecipientCents: 2_375,
    feePayer: "donor",
    feePolicyHash,
    quoteHash: "sha256:5858585858585858585858585858585858585858585858585858585858585858",
  };
  assert.equal(isRefundBonusFeeQuoteValid(feeQuote), true);
  assert.equal(isRefundBonusFeeQuoteValid({
    ...feeQuote,
    netRecipientCents: 2_500,
  }), false);
  assert.equal(isRefundBonusFeeQuoteValid({
    ...feeQuote,
    feePayer: "waived",
    feeCents: 125,
  }), false);
  assert.equal(isRefundBonusFeeQuoteValid({
    ...feeQuote,
    feePayer: "waived",
    feeCents: 0,
    netRecipientCents: 2_500,
  }), true);

  const latestDeployHash = "sha256:6767676767676767676767676767676767676767676767676767676767676767";
  const requiredRefundBonusRoutes = [
    "/labs/refund-bonus-pledge-pool",
    "/labs/refund-bonus-pledge-pool/demo-round",
    "/labs/refund-bonus-pledge-pool/demo-round/amount",
    "/labs/refund-bonus-pledge-pool/demo-round/review",
  ];

  const report = buildRefundBonusCopyPreflightReport({
    id: "copy-report",
    roundId,
    checkedAt: now,
    lastDeployHash: latestDeployHash,
    checkedRoutes: requiredRefundBonusRoutes,
    activeCopy: `
      Non-MVP labs mechanism.
      If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
      No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
      This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
    `,
  });
  assert.equal(report.pass, true);
  assert.match(report.reportHash, /^sha256:[a-f0-9]{64}$/);

  const freshReport = evaluateRefundBonusCopyPreflightFreshness({
    report,
    latestDeployHash,
    latestDeployCompletedAt: "2026-07-05T23:59:59.000Z",
    requiredRoutes: requiredRefundBonusRoutes,
  });
  assert.equal(freshReport.fresh, true);
  assert.deepEqual(freshReport.reasonCodes, []);
  assert.deepEqual(freshReport.missingRoutes, []);
  assert.equal(freshReport.deployHashMatches, true);
  assert.equal(freshReport.generatedAfterLatestDeploy, true);
  assert.equal(freshReport.requiredRoutesCovered, true);

  const staleHashReport = evaluateRefundBonusCopyPreflightFreshness({
    report,
    latestDeployHash: "sha256:6868686868686868686868686868686868686868686868686868686868686868",
    latestDeployCompletedAt: "2026-07-05T23:59:59.000Z",
    requiredRoutes: requiredRefundBonusRoutes,
  });
  assert.equal(staleHashReport.fresh, false);
  assert.ok(staleHashReport.reasonCodes.includes("deploy_hash_mismatch"));

  const preDeployReport = evaluateRefundBonusCopyPreflightFreshness({
    report,
    latestDeployHash,
    latestDeployCompletedAt: "2026-07-06T00:00:01.000Z",
    requiredRoutes: requiredRefundBonusRoutes,
  });
  assert.equal(preDeployReport.fresh, false);
  assert.ok(preDeployReport.reasonCodes.includes("copy_preflight_before_latest_deploy"));

  const routeCoverageFailure = evaluateRefundBonusCopyPreflightFreshness({
    report: {
      ...report,
      checkedRoutes: ["/labs/refund-bonus-pledge-pool"],
    },
    latestDeployHash,
    latestDeployCompletedAt: "2026-07-05T23:59:59.000Z",
    requiredRoutes: requiredRefundBonusRoutes,
  });
  assert.equal(routeCoverageFailure.fresh, false);
  assert.ok(routeCoverageFailure.reasonCodes.includes("required_route_missing"));
  assert.deepEqual(routeCoverageFailure.missingRoutes, [
    "/labs/refund-bonus-pledge-pool/demo-round",
    "/labs/refund-bonus-pledge-pool/demo-round/amount",
    "/labs/refund-bonus-pledge-pool/demo-round/review",
  ]);

  const failedReport = buildRefundBonusCopyPreflightReport({
    id: "copy-report-failed",
    roundId,
    checkedAt: now,
    lastDeployHash: latestDeployHash,
    checkedRoutes: ["/mpgf/rounds/demo"],
    activeCopy: "Get free money and a guaranteed return from bonus impact.",
    prohibitedActiveLabelsFound: ["MVP refund bonus"],
    ordinaryZeroStatePrimaryFound: false,
  });
  assert.equal(failedReport.pass, false);
  assert.equal(failedReport.bonusOverclaimFound, true);
  assert.equal(failedReport.financialPromotionRiskFound, true);

  const paidToDonateReport = buildRefundBonusCopyPreflightReport({
    id: "copy-report-paid-to-donate",
    roundId,
    checkedAt: now,
    lastDeployHash: latestDeployHash,
    checkedRoutes: requiredRefundBonusRoutes,
    activeCopy: `
      Non-MVP labs mechanism.
      If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
      No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
      This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
      You are paid to donate through a risk-free bonus.
    `,
  });
  assert.equal(paidToDonateReport.pass, false);
  assert.equal(paidToDonateReport.bonusOverclaimFound, true);
  assert.equal(paidToDonateReport.financialPromotionRiskFound, true);
  assert.equal(paidToDonateReport.prohibitedActiveLabelsFound.length, 0);

  const failedFreshness = evaluateRefundBonusCopyPreflightFreshness({
    report: failedReport,
    latestDeployHash,
    latestDeployCompletedAt: "2026-07-05T23:59:59.000Z",
    requiredRoutes: requiredRefundBonusRoutes,
  });
  assert.equal(failedFreshness.fresh, false);
  assert.ok(failedFreshness.reasonCodes.includes("copy_preflight_failed"));
  assert.ok(failedFreshness.reasonCodes.includes("required_route_missing"));

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
      "and a guaranteed return from bonus impact. You get paid to donate and paid if it fails, no matter why, with failure impact.",
  );
  assert.equal(invalid.passed, false);
  assert.ok(invalid.blockedTerms.includes("free money"));
  assert.ok(invalid.blockedTerms.includes("cashback"));
  assert.ok(invalid.blockedTerms.includes("profit"));
  assert.ok(invalid.blockedTerms.includes("risk-free"));
  assert.ok(invalid.blockedTerms.includes("risk-free return"));
  assert.ok(invalid.blockedTerms.includes("refund with interest"));
  assert.ok(invalid.blockedTerms.includes("guaranteed return"));
  assert.ok(invalid.blockedTerms.includes("failure impact"));
  assert.ok(invalid.blockedTerms.includes("paid to donate"));
  assert.ok(invalid.blockedTerms.includes("paid if it fails no matter why"));

  const misleadingProductCopy = validateRefundBonusCopy(`
    Non-MVP labs mechanism.
    If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.
    No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.
    This bonus is not interest, not an investment return, not a lottery, and not public-good impact.
    Saved funds are authorized, funds are held, funds are reserved, funds are protected, and custody is available.
    This is escrowed with guaranteed impact, guaranteed bonus, tax treatment, legal advice, moral ranking,
    moral reputation power, exact live pivotality, and current CRECM mechanism status.
  `);
  assert.equal(misleadingProductCopy.passed, false);
  assert.ok(misleadingProductCopy.blockedTerms.includes("authorized"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("held"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("reserved"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("protected"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("custody"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("escrow"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("guaranteed impact"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("guaranteed bonus"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("tax treatment"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("legal advice"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("moral ranking"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("moral reputation power"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("exact live pivotality"));
  assert.ok(misleadingProductCopy.blockedTerms.includes("current CRECM mechanism"));
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

  const verifiedSupporterShortfall = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({
      thresholdNetRecipientCents: 1_000,
      minVerifiedSupporters: 3,
      minDistinctViewpointClusters: 1,
      qualifyingFailureModes: ["verified_supporter_threshold_shortfall"],
    }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(verifiedSupporterShortfall.status, "qualifying_failed");
  assert.deepEqual(verifiedSupporterShortfall.reasonCodes, ["verified_supporter_threshold_shortfall"]);

  const unsupportedVerifiedShortfall = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({
      thresholdNetRecipientCents: 1_000,
      minVerifiedSupporters: 3,
      minDistinctViewpointClusters: 1,
      qualifyingFailureModes: ["net_recipient_threshold_shortfall"],
    }),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(unsupportedVerifiedShortfall.status, "nonqualifying_failed");
  assert.deepEqual(unsupportedVerifiedShortfall.reasonCodes, ["verified_supporter_threshold_shortfall"]);

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

test("abuse-blocked refund-bonus pledges cannot collect bonuses and nonqualifying failures do not pay", () => {
  const pledges = [
    pledge("a", "alice", 1_000, "humanitarian"),
    pledge("b", "bob", 1_000, "animal_inclusive"),
    pledge("sybil", "casey", 1_000, "long_run_future", {
      sybilState: "blocked",
    }),
    pledge("prior-abuse", "drew", 1_000, "public_knowledge", {
      priorBonusAbuseState: "blocked",
    }),
    pledge("collusion-review", "erin", 1_000, "institutional_resilience", {
      collusionState: "review",
    }),
  ];
  const qualifying = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool(),
    gate: gate(),
    reserve: reserve(),
    pledges,
  });
  assert.equal(qualifying.status, "qualifying_failed");
  assert.deepEqual(qualifying.excludedPledgeIds.sort(), ["collusion-review", "prior-abuse", "sybil"]);
  assert.deepEqual(qualifying.eligiblePledges.map((row) => row.pledge.id), ["a", "b"]);

  const plan = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active" }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  assert.deepEqual(plan.payoutOperations.map((operation) => operation.pledgeId), ["a", "b"]);
  assert.equal(plan.payoutOperations.some((operation) => qualifying.excludedPledgeIds.includes(operation.pledgeId)), false);

  const nonqualifyingReasons = [
    "review_block",
    "legal_compliance_block",
    "safety_pause",
  ] as const;
  for (const reason of nonqualifyingReasons) {
    const blocked = planRefundBonusSettlement({
      round: round({ status: "bonus_payable" }),
      pool: pool({ status: "bonus_payable" }),
      reserve: reserve({ status: "active" }),
      outcome: {
        ...qualifying,
        status: "nonqualifying_failed",
        reasonCodes: [reason],
      },
      roundStatus: "bonus_payable",
      simulationOnly: true,
      bonusSettlementPlanApproved: true,
      eligibleRowsRecomputed: true,
    });
    assert.equal(blocked.payoutOperations.length, 0);
    assert.notEqual(blocked.auditReport.finalStatus, "qualifying_failed_bonus_paid");
  }
});

test("authorization and capture side effects are status-gated and exact authorization recomputes thresholds", () => {
  assert.equal(canRefundBonusAuthorizeSuccessCharge("open"), false);
  assert.equal(canRefundBonusAuthorizeSuccessCharge("closed_to_new_pledges"), false);
  assert.equal(canRefundBonusAuthorizeSuccessCharge("reviewing"), false);
  assert.equal(canRefundBonusAuthorizeSuccessCharge("cleared"), true);
  assert.equal(canRefundBonusCaptureSuccessCharge("authorizing"), false);
  assert.equal(canRefundBonusCaptureSuccessCharge("payable"), true);
  assert.equal(canRefundBonusCaptureSuccessCharge("bonus_payable"), false);
  assert.equal(canRefundBonusPayoutBonus("payable"), false);
  assert.equal(canRefundBonusPayoutBonus("bonus_payable"), true);
  assert.equal(canRefundBonusPayoutBonus("bonus_paying"), true);

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

  const exactAuthorization = {
    pledgeId: "a",
    authorizationState: "authorized_exact" as const,
    requiredGrossCents: 2_500,
    authorizedGrossCents: 2_500,
    providerAuthorizationRef: "auth-a",
    validThroughCapture: true,
  };
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady(exactAuthorization, pledges[0]!), true);
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady(undefined, pledges[0]!), false);
  const savedPaymentMethodOnlyPledge: RefundBonusPledge = {
    ...pledges[0]!,
    providerPaymentMethodConfirmed: true,
  };
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady(undefined, savedPaymentMethodOnlyPledge), false);
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady({
    ...exactAuthorization,
    authorizationState: "short_expiring",
  }, pledges[0]!), false);
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady({
    ...exactAuthorization,
    authorizationState: "expired",
    validThroughCapture: false,
  }, pledges[0]!), false);
  assert.equal(isRefundBonusAuthorizationAttemptCaptureReady({
    ...exactAuthorization,
    authorizationState: "authorized_exact",
    authorizedGrossCents: 2_400,
  }, pledges[0]!), false);

  const recomputed = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
    authorizationAttempts: [
      exactAuthorization,
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

  const recomputedSettlement = planRefundBonusSettlement({
    round: round({ status: "payable" }),
    pool: pool({ status: "payable", thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    reserve: reserve({ status: "active" }),
    outcome: recomputed,
    roundStatus: "payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  assert.equal(recomputedSettlement.payoutOperations.length, 0);
  assert.equal(recomputedSettlement.auditReport.grossCapturedCents, 0);
  assert.equal(recomputedSettlement.auditReport.bonusPaidCents, 0);
  assert.equal(recomputedSettlement.auditReport.finalStatus, "failed_authorization_no_bonus");
  assert.ok(recomputedSettlement.settlementRows.every((row) => row.settlementState === "released"));

  const shortExpiring = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges,
    authorizationAttempts: [
      exactAuthorization,
      {
        pledgeId: "b",
        authorizationState: "short_expiring",
        requiredGrossCents: 2_500,
        authorizedGrossCents: 2_500,
        providerAuthorizationRef: "auth-b",
        expiresAt: "2026-07-06T00:02:00.000Z",
        validThroughCapture: false,
      },
    ],
  });
  assert.equal(shortExpiring.status, "nonqualifying_failed");
  assert.deepEqual(shortExpiring.reasonCodes, ["authorization_failure_recompute_below_threshold"]);
  assert.deepEqual(shortExpiring.excludedPledgeIds, ["b"]);

  const expiredAndMissing = evaluateRefundBonusRoundOutcome({
    round: round(),
    pool: pool({ thresholdNetRecipientCents: 5_000, minVerifiedSupporters: 2, minDistinctViewpointClusters: 2 }),
    gate: gate(),
    reserve: reserve(),
    pledges: [
      ...pledges,
      pledge("c", "carol", 2_500, "long_run_future"),
    ],
    authorizationAttempts: [
      exactAuthorization,
      {
        pledgeId: "b",
        authorizationState: "expired",
        requiredGrossCents: 2_500,
        authorizedGrossCents: 2_500,
        providerAuthorizationRef: "auth-b",
        expiresAt: "2026-07-06T00:00:01.000Z",
        validThroughCapture: false,
      },
    ],
  });
  assert.equal(expiredAndMissing.status, "nonqualifying_failed");
  assert.deepEqual(expiredAndMissing.reasonCodes, ["authorization_failure_recompute_below_threshold"]);
  assert.deepEqual(expiredAndMissing.excludedPledgeIds.sort(), ["b", "c"]);
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
    reserve: reserve({ status: "active", heldCents: 300 }),
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
  const retryBonusPlan = planRefundBonusSettlement({
    round: round({ status: "bonus_payable" }),
    pool: pool({ status: "bonus_payable" }),
    reserve: reserve({ status: "active", heldCents: 300 }),
    outcome: qualifying,
    roundStatus: "bonus_payable",
    simulationOnly: true,
    bonusSettlementPlanApproved: true,
    eligibleRowsRecomputed: true,
  });
  assert.deepEqual(
    retryBonusPlan.payoutOperations.map((operation) => [operation.pledgeId, operation.idempotencyKey, operation.eventHash]),
    bonusPlan.payoutOperations.map((operation) => [operation.pledgeId, operation.idempotencyKey, operation.eventHash]),
  );
  assert.deepEqual(
    retryBonusPlan.settlementRows.map((row) => [row.pledgeId, row.settlementState, row.bonusPaidCents]),
    bonusPlan.settlementRows.map((row) => [row.pledgeId, row.settlementState, row.bonusPaidCents]),
  );
  assert.equal(retryBonusPlan.auditReport.bonusPaidCents, bonusPlan.auditReport.bonusPaidCents);
  assert.equal(retryBonusPlan.auditReport.bonusUnclaimedCents, bonusPlan.auditReport.bonusUnclaimedCents);
  assert.equal(bonusPlan.auditReport.finalStatus, "qualifying_failed_bonus_paid");
  assert.equal(bonusPlan.auditReport.rulebookHash, rulebookHash);
  assert.equal(bonusPlan.auditReport.feePolicyHash, feePolicyHash);
  assert.equal(bonusPlan.auditReport.bonusPolicyHash, bonusPolicyHash);
  assert.equal(bonusPlan.auditReport.grossCapturedCents, 0);
  assert.equal(bonusPlan.auditReport.bonusPaidCents, 200);
  assert.equal(bonusPlan.auditReport.bonusReserveBackedCents, 25_000);
  assert.equal(bonusPlan.auditReport.bonusHeldCents, 300);
  const publicReport = bonusPlan.auditReport.publicReportJson as RefundBonusPublicReportJson;
  const requiredPublicReportChannels: Array<keyof RefundBonusPublicReportJson> = [
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
    "finalStatus",
    "reasonCodes",
  ];
  for (const channel of requiredPublicReportChannels) {
    assert.ok(channel in publicReport, `missing refund-bonus public report channel: ${channel}`);
  }
  assert.equal(publicReport.grossCapturedCents, 0);
  assert.equal(publicReport.feeCents, 0);
  assert.equal(publicReport.netRecipientDisbursedCents, 0);
  assert.equal(publicReport.actualGrossExposureCents, 2_000);
  assert.equal(publicReport.countedCents, 0);
  assert.equal(publicReport.matchEligibleCents, 0);
  assert.equal(publicReport.sponsorBaseMatchCents, 0);
  assert.equal(publicReport.bonusReserveBackedCents, 25_000);
  assert.equal(publicReport.bonusExposureReservedCents, 200);
  assert.equal(publicReport.bonusLiabilityCents, 200);
  assert.equal(publicReport.bonusHeldCents, 300);
  assert.equal(publicReport.bonusPaidCents, 200);
  assert.equal(publicReport.bonusPayoutFeeCents, 0);
  assert.equal(publicReport.bonusUnclaimedCents, 0);
  assert.equal(publicReport.bonusUnearnedReleasedCents, 0);
  const serializedPublicReport = JSON.stringify(publicReport);
  assert.equal(serializedPublicReport.includes("humanitarian"), false);
  assert.equal(serializedPublicReport.includes("animal_inclusive"), false);
  assert.equal(serializedPublicReport.includes("participantId"), false);
  assert.equal(serializedPublicReport.includes("viewpointCluster"), false);
  assert.equal(serializedPublicReport.includes("bonusEligibilityStatus"), false);
  assert.equal(serializedPublicReport.includes("bonusPayoutState"), false);
  assert.equal(serializedPublicReport.includes("simulated:"), false);

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

test("refund-bonus comprehension and metrics catalog match v137 experiment gates", () => {
  assert.deepEqual(REFUND_BONUS_COMPREHENSION_QUESTIONS.map((question) => question.id), [
    "charge_timing",
    "bonus_eligibility",
    "bonus_characterization",
  ]);
  assert.deepEqual(REFUND_BONUS_COMPREHENSION_QUESTIONS.map((question) => question.correctChoiceId), ["B", "B", "C"]);
  assert.ok(REFUND_BONUS_COMPREHENSION_QUESTIONS.every((question) =>
    question.deliveryRequirement === "before_hard_pledge_or_immediately_after_save"
  ));
  assert.match(REFUND_BONUS_COMPREHENSION_QUESTIONS[0]!.choices[1]!.label, /Only after the round closes/);
  assert.match(REFUND_BONUS_COMPREHENSION_QUESTIONS[1]!.choices[1]!.label, /bonus-eligible support-threshold reason/);
  assert.match(REFUND_BONUS_COMPREHENSION_QUESTIONS[2]!.choices[2]!.label, /not project impact/);
  assert.equal(REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.realMoneyChargeTimingIncorrectPauseBps, 500);
  assert.equal(REFUND_BONUS_COMPREHENSION_THRESHOLDS_BPS.realMoneyBonusEligibilityIncorrectPauseBps, 1_000);

  const passing = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 100,
    chargeTimingIncorrect: 5,
    bonusEligibilityAnswered: 100,
    bonusEligibilityIncorrect: 10,
    bonusCharacterizationAnswered: 100,
    bonusCharacterizationIncorrect: 25,
    realMoneyPilot: true,
  });
  assert.equal(passing.stage0Success, true);
  assert.equal(passing.pauseRecommended, false);
  assert.deepEqual(passing.pauseReasonCodes, []);

  const paused = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 100,
    chargeTimingIncorrect: 6,
    bonusEligibilityAnswered: 100,
    bonusEligibilityIncorrect: 11,
    bonusCharacterizationAnswered: 100,
    bonusCharacterizationIncorrect: 25,
    realMoneyPilot: true,
  });
  assert.equal(paused.pauseRecommended, true);
  assert.ok(paused.pauseReasonCodes.includes("charge_timing_incorrect_rate_above_5_percent"));
  assert.ok(paused.pauseReasonCodes.includes("bonus_eligibility_incorrect_rate_above_10_percent"));

  const missing = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 0,
    chargeTimingIncorrect: 0,
    bonusEligibilityAnswered: 0,
    bonusEligibilityIncorrect: 0,
    bonusCharacterizationAnswered: 0,
    bonusCharacterizationIncorrect: 0,
  });
  assert.equal(missing.stage0Success, false);
  assert.ok(missing.pauseReasonCodes.includes("charge_timing_sample_missing"));
  assert.ok(missing.pauseReasonCodes.includes("bonus_eligibility_sample_missing"));
  assert.ok(missing.pauseReasonCodes.includes("bonus_characterization_sample_missing"));

  const invalid = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 10,
    chargeTimingIncorrect: 11,
    bonusEligibilityAnswered: 10,
    bonusEligibilityIncorrect: 0,
    bonusCharacterizationAnswered: 10,
    bonusCharacterizationIncorrect: 0,
  });
  assert.equal(invalid.pauseRecommended, true);
  assert.ok(invalid.pauseReasonCodes.includes("invalid_comprehension_counts"));

  assert.ok(REFUND_BONUS_PRODUCT_METRIC_KEYS.includes("provider_confirmed_payment_method_rate"));
  assert.ok(REFUND_BONUS_PRODUCT_METRIC_KEYS.includes("bonus_unclaimed_cents"));
  assert.ok(REFUND_BONUS_SAFETY_METRIC_KEYS.includes("bonus_copy_incidents"));
  assert.ok(REFUND_BONUS_SAFETY_METRIC_KEYS.includes("refund_bonus_open_gate_failures"));
  assert.ok(REFUND_BONUS_ACCOUNTING_METRIC_KEYS.includes("grossCapturedCents"));
  assert.ok(REFUND_BONUS_ACCOUNTING_METRIC_KEYS.includes("bonusHeldCents"));
  assert.ok(REFUND_BONUS_ACCOUNTING_METRIC_KEYS.includes("bonusUnearnedReleasedCents"));
});

test("refund-bonus experiment stages and pivot criteria match v137 staged rollout", () => {
  assert.equal(
    REFUND_BONUS_EXPERIMENT_STAGE_POLICIES.stage_0_fake_door.chargeTimingCorrectMinBps,
    8_500,
  );
  assert.deepEqual(
    REFUND_BONUS_EXPERIMENT_STAGE_POLICIES.stage_1_internal_simulation.requiredSampleCases,
    ["$0.50 pledge -> $1 simulated bonus", "$25 pledge -> 10% bonus capped at $2.50"],
  );
  assert.deepEqual(REFUND_BONUS_EXPERIMENT_STAGE_POLICIES.stage_2_closed_alpha.pledgeCapCents, {
    min: 500,
    max: 2_500,
  });
  assert.deepEqual(REFUND_BONUS_EXPERIMENT_STAGE_POLICIES.stage_3_limited_public_pilot.bonusRatioBps, {
    min: 500,
    max: 2_500,
  });

  const stage0 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_0_fake_door",
    realMoneyEnabled: false,
    bonusPayoutMode: "off",
    userCommitmentMode: "none",
    participantCohort: "fake_door",
  });
  assert.equal(stage0.allowed, true);
  assert.deepEqual(stage0.blockerCodes, []);

  const invalidStage0 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_0_fake_door",
    realMoneyEnabled: true,
    bonusPayoutMode: "real",
    userCommitmentMode: "real",
    participantCohort: "public",
    publicMvpRouteConfusion: true,
  });
  assert.equal(invalidStage0.allowed, false);
  assert.ok(invalidStage0.blockerCodes.includes("real_money_requires_promotion"));
  assert.ok(invalidStage0.blockerCodes.includes("stage0_real_money_must_be_off"));
  assert.ok(invalidStage0.blockerCodes.includes("stage0_bonus_payouts_must_be_off"));
  assert.ok(invalidStage0.blockerCodes.includes("stage0_commitments_must_be_none"));
  assert.ok(invalidStage0.blockerCodes.includes("stage0_public_mvp_route_confusion"));

  const stage1 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_1_internal_simulation",
    realMoneyEnabled: false,
    bonusPayoutMode: "simulated",
    userCommitmentMode: "simulated",
    participantCohort: "internal",
    sampleCaseFiftyCentOneDollarCovered: true,
    sampleCaseTwentyFiveDollarTenPercentCovered: true,
  });
  assert.equal(stage1.allowed, true);

  const invalidStage1 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_1_internal_simulation",
    realMoneyEnabled: false,
    bonusPayoutMode: "off",
    userCommitmentMode: "none",
    participantCohort: "public",
    sampleCaseFiftyCentOneDollarCovered: true,
    sampleCaseTwentyFiveDollarTenPercentCovered: false,
  });
  assert.equal(invalidStage1.allowed, false);
  assert.ok(invalidStage1.blockerCodes.includes("stage1_requires_simulated_commitments"));
  assert.ok(invalidStage1.blockerCodes.includes("stage1_requires_simulated_bonus"));
  assert.ok(invalidStage1.blockerCodes.includes("stage1_requires_internal_or_test_users"));
  assert.ok(invalidStage1.blockerCodes.includes("stage1_required_sample_cases_missing"));

  const stage2 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_2_closed_alpha",
    realMoneyEnabled: true,
    promotionRecordApproved: true,
    bonusPayoutMode: "real",
    userCommitmentMode: "real",
    participantCohort: "invite_only",
    identityVerifiedRequired: true,
    publicListingEnabled: false,
    participantMinGrossCents: 500,
    participantMaxGrossCents: 2_500,
    bonusRatioBps: 1_000,
    perUserBonusCapCents: 250,
    roundGrossCapCents: 250_000,
    roundBonusExposureCapCents: 25_000,
  });
  assert.equal(stage2.allowed, true);

  const invalidStage2 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_2_closed_alpha",
    realMoneyEnabled: true,
    promotionRecordApproved: true,
    bonusPayoutMode: "real",
    userCommitmentMode: "real",
    participantCohort: "public",
    identityVerifiedRequired: false,
    publicListingEnabled: true,
    participantMinGrossCents: 50,
    participantMaxGrossCents: 5_000,
    bonusRatioBps: 2_000,
    perUserBonusCapCents: 500,
    roundGrossCapCents: 500_000,
    roundBonusExposureCapCents: 50_000,
    highRatioRealMoneyTestEnabled: true,
    governanceHighRatioApproved: false,
  });
  assert.equal(invalidStage2.allowed, false);
  assert.ok(invalidStage2.blockerCodes.includes("stage2_requires_invite_only_users"));
  assert.ok(invalidStage2.blockerCodes.includes("stage2_requires_identity_verification"));
  assert.ok(invalidStage2.blockerCodes.includes("stage2_blocks_public_listing"));
  assert.ok(invalidStage2.blockerCodes.includes("stage2_pledge_cap_out_of_range"));
  assert.ok(invalidStage2.blockerCodes.includes("stage2_high_ratio_real_money_requires_governance"));

  const stage3 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_3_limited_public_pilot",
    realMoneyEnabled: true,
    promotionRecordApproved: true,
    bonusPayoutMode: "real",
    userCommitmentMode: "real",
    participantCohort: "capped_public",
    participantMinGrossCents: 500,
    participantMaxGrossCents: 5_000,
    bonusRatioBps: 2_500,
    perUserBonusCapCents: 250,
    roundGrossCapCents: 500_000,
    roundBonusExposureCapCents: 25_000,
    bonusExposureExplicitlyBacked: true,
  });
  assert.equal(stage3.allowed, true);

  const invalidStage3 = evaluateRefundBonusExperimentStageReadiness({
    stage: "stage_3_limited_public_pilot",
    realMoneyEnabled: true,
    bonusPayoutMode: "real",
    userCommitmentMode: "real",
    participantCohort: "public",
    participantMinGrossCents: 100,
    participantMaxGrossCents: 10_000,
    bonusRatioBps: 3_000,
    perUserBonusCapCents: 500,
    roundGrossCapCents: 1_000_000,
    roundBonusExposureCapCents: 25_000,
    bonusExposureExplicitlyBacked: false,
  });
  assert.equal(invalidStage3.allowed, false);
  assert.ok(invalidStage3.blockerCodes.includes("real_money_requires_promotion"));
  assert.ok(invalidStage3.blockerCodes.includes("stage3_requires_promotion_record"));
  assert.ok(invalidStage3.blockerCodes.includes("stage3_requires_capped_public_or_invite_only_users"));
  assert.ok(invalidStage3.blockerCodes.includes("stage3_bonus_exposure_must_be_explicitly_backed"));

  const pivot = evaluateRefundBonusExperimentPivotCriteria({
    freeRidingRemainsHigh: true,
    usersAttractedPrimarilyByBonusProfit: true,
    sybilControlsCostlyRelativeToBonusValue: true,
    bonusComprehensionLow: true,
    legalComplianceUncertain: true,
  });
  assert.deepEqual(pivot.actions, [
    "test_tiered_thresholds_or_standing_public_goods_microfunds",
    "lower_bonus_ratio_or_stop",
    "stop_or_restrict_to_verified_members",
    "return_to_direct_capped_cgpp",
    "keep_simulation_only",
  ]);
  assert.equal(pivot.pivotRecommended, true);
  assert.equal(evaluateRefundBonusExperimentPivotCriteria({}).pivotRecommended, false);
});

test("refund-bonus kill criteria recommend fail-closed pauses and recovery actions", () => {
  const pausedComprehension = evaluateRefundBonusComprehensionMetrics({
    chargeTimingAnswered: 100,
    chargeTimingIncorrect: 6,
    bonusEligibilityAnswered: 100,
    bonusEligibilityIncorrect: 11,
    bonusCharacterizationAnswered: 100,
    bonusCharacterizationIncorrect: 0,
    realMoneyPilot: true,
  });
  const kill = evaluateRefundBonusKillCriteria({
    publicRouteClaimsMvpOrLive: true,
    bonusCopyFinancialPromotionFound: true,
    failureBonusDisplayedWithoutBackedReserveEvidence: true,
    savedPaymentMethodCopyOverclaimsPaymentState: true,
    preCloseExactGapLeak: true,
    reviewBlockedPoolSideEffectStatus: "bonus_paid",
    disallowedProjectDiscovered: true,
    unresolvedBlockingConflictDiscovered: true,
    paymentProviderHoldBeforeClose: true,
    failedAuthorizationRowsRemovedBeforeRecompute: false,
    capturedAfterRecomputeBelowThreshold: true,
    bonusPayoutToIneligibleUser: true,
    bonusPayoutForNonqualifyingFailure: true,
    potentialBonusExposureCents: 251,
    backedReserveCents: 250,
    comprehensionMetrics: pausedComprehension,
    privacyIncidentExposesDonorLevelSensitiveData: true,
    controlClusterIssueMateriallyAffectsCounting: true,
    potentialCaptureCents: 501,
    roundGrossCaptureCapCents: 500,
    roundBonusExposureCapCents: 250,
    staleActiveCurrentProductLabel: true,
    copyPreflightFailedAfterHardPledgeOpen: true,
    hardPledgeCreationPossibleWhileOpenGateNotPassed: true,
    authorizationPossibleInStatus: "open",
    capturePossibleInStatus: "reviewing",
    bonusPayoutPossibleInStatus: "payable",
    pausePhase: "after_hard_pledges_before_authorization_or_bonus_payout",
  });

  assert.equal(kill.pauseRecommended, true);
  assert.deepEqual(kill.reasonCodes, [
    "public_route_claims_mvp_or_live",
    "bonus_copy_financial_promotion",
    "failure_bonus_displayed_without_backed_reserve_evidence",
    "saved_payment_method_copy_overclaims_payment_state",
    "pre_close_exact_gap_leak",
    "review_blocked_pool_side_effect_state",
    "disallowed_project_discovered",
    "unresolved_blocking_conflict_discovered",
    "payment_provider_hold_before_close",
    "failed_authorization_rows_not_removed",
    "capture_after_recompute_below_threshold",
    "bonus_payout_to_ineligible_user",
    "bonus_payout_for_nonqualifying_failure",
    "bonus_exposure_exceeds_backed_reserve",
    "charge_timing_incorrect_rate_above_5_percent",
    "bonus_eligibility_incorrect_rate_above_10_percent",
    "privacy_incident_exposes_donor_level_sensitive_data",
    "control_cluster_issue_materially_affects_counting",
    "potential_capture_exceeds_round_cap",
    "potential_bonus_exposure_exceeds_round_cap",
    "stale_active_current_product_label",
    "copy_preflight_failed_after_hard_pledge_open",
    "hard_pledge_possible_while_open_gate_not_passed",
    "authorization_possible_in_disallowed_status",
    "capture_possible_in_disallowed_status",
    "bonus_payout_possible_in_disallowed_status",
  ]);
  assert.deepEqual(kill.requiredRecoveryActions, [
    "keep_pledges_uncharged",
    "publish_status_note",
    "require_manual_review_before_resuming",
  ]);

  const authorizationPause = evaluateRefundBonusKillCriteria({
    paymentProviderHoldBeforeClose: true,
    pausePhase: "after_authorization_before_capture",
  });
  assert.deepEqual(authorizationPause.requiredRecoveryActions, [
    "release_or_cancel_authorizations_where_possible",
    "do_not_capture_until_resolved",
  ]);

  const bonusPause = evaluateRefundBonusKillCriteria({
    bonusPayoutForNonqualifyingFailure: true,
    pausePhase: "after_qualifying_failure_before_bonus_payout",
  });
  assert.deepEqual(bonusPause.requiredRecoveryActions, [
    "hold_bonus_liabilities",
    "do_not_pay_bonus_until_resolved",
  ]);

  const clear = evaluateRefundBonusKillCriteria({
    potentialBonusExposureCents: 250,
    backedReserveCents: 250,
    potentialCaptureCents: 500,
    roundGrossCaptureCapCents: 500,
    roundBonusExposureCapCents: 250,
    authorizationPossibleInStatus: "cleared",
    capturePossibleInStatus: "payable",
    bonusPayoutPossibleInStatus: "bonus_payable",
  });
  assert.equal(clear.pauseRecommended, false);
  assert.deepEqual(clear.reasonCodes, []);
  assert.deepEqual(clear.requiredRecoveryActions, []);
});

test("refund-bonus branch remains absent from active public MVP surfaces", () => {
  const labsPage = readFileSync("src/app/labs/refund-bonus-pledge-pool/page.tsx", "utf8");
  const poolPage = readFileSync("src/app/labs/refund-bonus-pledge-pool/[roundSlug]/page.tsx", "utf8");
  const amountPage = readFileSync("src/app/labs/refund-bonus-pledge-pool/[roundSlug]/amount/page.tsx", "utf8");
  const reviewPage = readFileSync("src/app/labs/refund-bonus-pledge-pool/[roundSlug]/review/page.tsx", "utf8");
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
  assert.match(poolPage, /Screen 1 of 3/);
  assert.match(poolPage, /read-only labs Pool screen/);
  assert.match(poolPage, /sealed qualitative status only before close/);
  assert.match(poolPage, /No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed/);
  assert.match(poolPage, /View disabled amount screen/);
  assert.match(amountPage, /Screen 2 of 3/);
  assert.match(amountPage, /Maximum pledge/);
  assert.match(amountPage, /not a moral score/);
  assert.match(amountPage, /does not affect pledge power/);
  assert.match(amountPage, /not interest, not an investment return, not a donation receipt, not a lottery, and not public-good impact/);
  assert.match(amountPage, /Prefer not to say counts as a verified supporter but does not count as a distinct/);
  assert.match(reviewPage, /Screen 3 of 3/);
  assert.match(reviewPage, /not making an immediate donation/);
  assert.match(reviewPage, /Saving your payment method is not a charge, not a hold, not escrow, not custody/);
  assert.match(reviewPage, /not a moral score, not a public reputation reward/);
  assert.match(reviewPage, /REFUND_BONUS_COMPREHENSION_QUESTIONS/);
  assert.match(reviewPage, /Comprehension checks/);
  assert.match(reviewPage, /Correct answer/);
  assert.match(reviewPage, /more than 5% answer charge timing incorrectly/);
  assert.match(reviewPage, /more than\s+10% answer bonus eligibility incorrectly/);
  assert.match(reviewPage, /Save hard pledge disabled/);
  assert.equal(site.includes("Refund-Bonus Pledge Pool"), false);
  assert.equal(site.includes(REFUND_BONUS_FEATURE_KEY), false);
  assert.equal(roundPage.includes("Refund-Bonus Pledge Pool"), false);
});
