import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION,
  MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION,
  calculatePledgeImpactMechanicalEffect,
  evaluatePledgeImpactLiveBundle,
  parsePledgeImpactForecastPayload,
  parsePledgeImpactLiveBundle,
  type PledgeImpactForecastPayload,
  type PledgeImpactLiveBundle,
  type PledgeImpactLivePoolState,
} from "./pledge-impact-live";

const poolState: PledgeImpactLivePoolState = {
  schemaVersion: MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION,
  poolPublicKey: "qa-pool-wild-research",
  poolProposalId: "11111111-1111-4111-8111-111111111111",
  title: "QA wild-animal-suffering priority research pool",
  causeArea: "Animal welfare",
  currency: "USD",
  thresholds: [
    {
      thresholdIndex: 1,
      thresholdId: "threshold-1",
      cumulativeNetRecipientThresholdCents: 2_500_000,
      grossSuccessRequirementCents: 2_500_000,
      premiumRateBps: 0,
      successPremiumCents: 0,
    },
  ],
  fundedCents: 1_680_000,
  contributorCount: 21,
  deadlineAt: "2026-08-31T23:59:59.000Z",
  thresholdSupporters: 2,
  thresholdVisibility: "public_exact",
  progressVisibility: "exact_amount",
  destinationType: "external_charity",
  failureBonus: {
    enabled: false,
    scheduleStatus: null,
    rateBps: null,
    maxParticipants: null,
    maxPerParticipantCents: null,
  },
};

const zeroThreshold = {
  thresholdIndex: 1,
  thresholdCents: 2_500_000,
  probabilityWithoutPledgeBps: 4_200,
  probabilityWithPledgeBps: 4_200,
  lower90ChangeBps: 0,
  upper90ChangeBps: 0,
};

const forecast: PledgeImpactForecastPayload = {
  schemaVersion: MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION,
  audience: "pool_state",
  experimental: true,
  currency: "USD",
  forecastErrorFloorBps: 50,
  followOnEffect: {
    included: false,
    evidenceType: "none",
    evidenceReference: null,
  },
  points: [
    {
      pledgeCents: 0,
      additionalFundingFromOthers: {
        estimateCents: 0,
        lower90Cents: 0,
        upper90Cents: 0,
      },
      allocatedFundingCredit: {
        estimateCents: 0,
        lower90Cents: 0,
        upper90Cents: 0,
      },
      thresholds: [zeroThreshold],
      failureBonusConditionalOnFailure: null,
      decomposition: {
        directThresholdEffectCents: 0,
        followOnContributionEffectCents: 0,
        settlementAdjustmentCents: 0,
        timingEffectCents: 0,
      },
    },
    {
      pledgeCents: 3_500,
      additionalFundingFromOthers: {
        estimateCents: 10_200,
        lower90Cents: 1_200,
        upper90Cents: 28_600,
      },
      allocatedFundingCredit: {
        estimateCents: 8_900,
        lower90Cents: 1_000,
        upper90Cents: 20_000,
      },
      thresholds: [
        {
          thresholdIndex: 1,
          thresholdCents: 2_500_000,
          probabilityWithoutPledgeBps: 4_200,
          probabilityWithPledgeBps: 4_260,
          lower90ChangeBps: 12,
          upper90ChangeBps: 110,
        },
      ],
      failureBonusConditionalOnFailure: null,
      decomposition: {
        directThresholdEffectCents: 11_100,
        followOnContributionEffectCents: 0,
        settlementAdjustmentCents: -900,
        timingEffectCents: 0,
      },
    },
    {
      pledgeCents: 8_500,
      additionalFundingFromOthers: {
        estimateCents: 30_600,
        lower90Cents: 9_500,
        upper90Cents: 62_000,
      },
      allocatedFundingCredit: {
        estimateCents: 22_000,
        lower90Cents: 7_000,
        upper90Cents: 45_000,
      },
      thresholds: [
        {
          thresholdIndex: 1,
          thresholdCents: 2_500_000,
          probabilityWithoutPledgeBps: 4_200,
          probabilityWithPledgeBps: 4_390,
          lower90ChangeBps: 65,
          upper90ChangeBps: 300,
        },
      ],
      failureBonusConditionalOnFailure: null,
      decomposition: {
        directThresholdEffectCents: 32_000,
        followOnContributionEffectCents: 0,
        settlementAdjustmentCents: -1_400,
        timingEffectCents: 0,
      },
    },
  ],
  modelPerformance: {
    sampleSize: 1_240,
    evaluationWindowStart: "2026-04-01T00:00:00.000Z",
    evaluationWindowEnd: "2026-07-30T23:59:59.000Z",
    brierScore: 0.173,
    calibrationErrorBps: 42,
    notes: "QA-only production-shaped fixture; no viewer-level inputs.",
  },
};

const availableBundle: PledgeImpactLiveBundle = {
  status: "available",
  checkedAt: "2026-08-01T02:00:00.000Z",
  poolPublicKey: poolState.poolPublicKey,
  poolState,
  poolStateSha256: `sha256:${"a".repeat(64)}`,
  forecastRelease: {
    id: "22222222-2222-4222-8222-222222222222",
    forecastVersion: "qa-wild-v1",
    modelVersion: "qa-model-v1",
    releasedAt: "2026-08-01T01:55:00.000Z",
    expiresAt: "2026-08-01T03:55:00.000Z",
    poolStateSha256: `sha256:${"a".repeat(64)}`,
    forecast,
  },
};

test("mechanical effect uses the live next threshold and preserves sub-one-percent precision", () => {
  const effect = calculatePledgeImpactMechanicalEffect(poolState, 3_500);
  assert.equal(effect.currentGapCents, 820_000);
  assert.equal(effect.remainingAfterPledgeCents, 816_500);
  assert.equal(effect.shareOfCurrentGapBps, 43);
});

test("available bundles return causal funding, allocated credit, recommendation, and exact state", () => {
  const result = evaluatePledgeImpactLiveBundle({
    bundle: availableBundle,
    pledgeCents: 3_500,
    now: new Date("2026-08-01T02:00:00.000Z"),
  });
  assert.equal(result.status, "available");
  if (result.status !== "available") return;
  assert.equal(result.additionalFundingFromOthers.estimateCents, 10_200);
  assert.equal(result.fundingMultiplier, 2.91);
  assert.equal(result.allocatedFundingCredit.estimateCents, 8_900);
  assert.equal(result.mechanicalEffect.remainingAfterPledgeCents, 816_500);
  assert.equal(result.recommendation?.pledgeCents, 8_500);
  assert.equal(result.explanation.viewerPersonalizationUsed, false);
});

test("interpolation remains deterministic and does not mix causal and allocated credit", () => {
  const result = evaluatePledgeImpactLiveBundle({
    bundle: availableBundle,
    pledgeCents: 6_000,
    now: new Date("2026-08-01T02:00:00.000Z"),
  });
  assert.equal(result.status, "available");
  if (result.status !== "available") return;
  assert.equal(result.additionalFundingFromOthers.estimateCents, 20_400);
  assert.equal(result.allocatedFundingCredit.estimateCents, 15_450);
  assert.notEqual(
    result.additionalFundingFromOthers.estimateCents,
    result.allocatedFundingCredit.estimateCents,
  );
});

test("database status fails closed while preserving live mechanical arithmetic", () => {
  for (const status of [
    "forecast_not_released",
    "forecast_stale",
    "pool_state_mismatch",
  ] as const) {
    const result = evaluatePledgeImpactLiveBundle({
      bundle: { ...availableBundle, status, forecastRelease: null },
      pledgeCents: 3_500,
      now: new Date("2026-08-01T02:00:00.000Z"),
    });
    assert.equal(result.status, "unavailable");
    if (result.status !== "unavailable") continue;
    assert.equal(result.reason, status);
    assert.equal(result.mechanicalEffect?.shareOfCurrentGapBps, 43);
  }
});

test("viewer-personalized forecasts are rejected recursively", () => {
  const personalized = structuredClone(forecast) as unknown as Record<string, unknown>;
  personalized.followOnEffect = {
    included: false,
    evidenceType: "none",
    evidenceReference: null,
    nested: { viewer_id: "forbidden" },
  };
  assert.equal(parsePledgeImpactForecastPayload(personalized, poolState), null);
});

test("pool-state hash mismatch and expired releases fail closed", () => {
  const mismatch = evaluatePledgeImpactLiveBundle({
    bundle: {
      ...availableBundle,
      forecastRelease: {
        ...availableBundle.forecastRelease!,
        poolStateSha256: `sha256:${"b".repeat(64)}`,
      },
    },
    pledgeCents: 3_500,
    now: new Date("2026-08-01T02:00:00.000Z"),
  });
  assert.equal(mismatch.status, "unavailable");
  if (mismatch.status === "unavailable") {
    assert.equal(mismatch.reason, "pool_state_mismatch");
  }

  const stale = evaluatePledgeImpactLiveBundle({
    bundle: availableBundle,
    pledgeCents: 3_500,
    now: new Date("2026-08-01T04:00:00.000Z"),
  });
  assert.equal(stale.status, "unavailable");
  if (stale.status === "unavailable") assert.equal(stale.reason, "forecast_stale");
});

test("malformed bundles and out-of-range amounts never become estimates", () => {
  assert.equal(parsePledgeImpactLiveBundle({ status: "available" }), null);
  const outOfRange = evaluatePledgeImpactLiveBundle({
    bundle: availableBundle,
    pledgeCents: 1_000_000,
    now: new Date("2026-08-01T02:00:00.000Z"),
  });
  assert.equal(outOfRange.status, "unavailable");
  if (outOfRange.status === "unavailable") {
    assert.equal(outOfRange.reason, "amount_out_of_range");
  }
});
