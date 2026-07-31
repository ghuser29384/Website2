import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_PLEDGE_IMPACT_SCHEMA_VERSION,
  buildPledgeImpactContributionHref,
  evaluatePledgeImpactForecast,
  getPledgeImpactCampaignId,
  getPledgeImpactPoolState,
  validatePledgeImpactForecastRelease,
  type PledgeImpactForecastPoint,
  type PledgeImpactForecastRelease,
} from "./pledge-impact";

const poolPublicKey = "pool-wild-research" as const;
const campaignId = getPledgeImpactCampaignId(poolPublicKey);
const poolState = getPledgeImpactPoolState(poolPublicKey);

function point({
  additional,
  allocated,
  pledgeCents,
  probabilityWithPledgeBps,
  lower90ChangeBps,
}: {
  additional: number;
  allocated: number;
  pledgeCents: number;
  probabilityWithPledgeBps: number;
  lower90ChangeBps: number;
}): PledgeImpactForecastPoint {
  return {
    pledgeCents,
    additionalFundingFromOthers: {
      estimateCents: additional,
      lower90Cents: Math.round(additional * 0.25),
      upper90Cents: Math.round(additional * 2),
    },
    allocatedFundingCredit: {
      estimateCents: allocated,
      lower90Cents: Math.round(allocated * 0.5),
      upper90Cents: Math.round(allocated * 1.5),
    },
    thresholds: [
      {
        thresholdIndex: 1,
        thresholdCents: 2_500_000,
        probabilityWithoutPledgeBps: 4_200,
        probabilityWithPledgeBps,
        lower90ChangeBps,
        upper90ChangeBps: Math.max(lower90ChangeBps, probabilityWithPledgeBps - 4_180),
      },
    ],
    failureBonusConditionalOnFailure: {
      projectedCents: Math.round(pledgeCents * 0.04),
      lower90Cents: Math.round(pledgeCents * 0.02),
      upper90Cents: Math.round(pledgeCents * 0.06),
      guaranteedMinimumCents: Math.round(pledgeCents * 0.01),
    },
    decomposition: {
      directThresholdEffectCents: Math.round(additional * 0.8),
      followOnContributionEffectCents: 0,
      settlementAdjustmentCents: -Math.round(additional * 0.05),
      timingEffectCents: Math.round(additional * 0.25),
    },
  };
}

export function buildPledgeImpactTestRelease(
  overrides: Partial<PledgeImpactForecastRelease> = {},
): PledgeImpactForecastRelease {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    poolPublicKey,
    campaignId,
    forecastVersion: "wild-research-2026-07-31t1200z",
    modelVersion: "pledge-impact-test-v1",
    releasedAt: "2026-07-31T12:00:00.000Z",
    expiresAt: "2026-07-31T14:00:00.000Z",
    poolState,
    forecast: {
      schemaVersion: MPGF_PLEDGE_IMPACT_SCHEMA_VERSION,
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
        point({ additional: 0, allocated: 0, pledgeCents: 0, probabilityWithPledgeBps: 4_200, lower90ChangeBps: 0 }),
        point({ additional: 10_000, allocated: 4_000, pledgeCents: 3_500, probabilityWithPledgeBps: 4_260, lower90ChangeBps: 20 }),
        point({ additional: 25_500, allocated: 8_500, pledgeCents: 8_500, probabilityWithPledgeBps: 4_350, lower90ChangeBps: 70 }),
        point({ additional: 62_000, allocated: 18_000, pledgeCents: 20_000, probabilityWithPledgeBps: 4_560, lower90ChangeBps: 140 }),
      ],
      modelPerformance: {
        sampleSize: 1_240,
        evaluationWindowStart: "2026-04-01T00:00:00.000Z",
        evaluationWindowEnd: "2026-07-30T23:59:59.000Z",
        brierScore: 0.173,
        calibrationErrorBps: 42,
        notes: "Pool-level backtest fixture. No viewer-level inputs.",
      },
    },
    contentSha256: `sha256:${"a".repeat(64)}`,
    ...overrides,
  };
}

test("returns an available exact pledge-impact estimate with separate causal and allocated credit", () => {
  const estimate = evaluatePledgeImpactForecast({
    campaignId,
    now: new Date("2026-07-31T12:30:00.000Z"),
    pledgeCents: 3_500,
    poolPublicKey,
    release: buildPledgeImpactTestRelease(),
  });

  assert.equal(estimate.status, "available");
  if (estimate.status !== "available") return;
  assert.equal(estimate.additionalFundingFromOthers.estimateCents, 10_000);
  assert.equal(estimate.allocatedFundingCredit.estimateCents, 4_000);
  assert.equal(estimate.fundingMultiplier, 2.86);
  assert.equal(estimate.thresholds[0].probabilityWithoutPledgeBps, 4_200);
  assert.equal(estimate.thresholds[0].probabilityWithPledgeBps, 4_260);
  assert.equal(estimate.mechanicalEffect.remainingAfterPledgeCents, 816_500);
  assert.equal(estimate.mechanicalEffect.shareOfCurrentGapBps, 43);
  assert.equal(estimate.explanation.causalEstimatesMayOverlap, true);
});

test("interpolates between released pledge points and preserves exact-cent arithmetic", () => {
  const estimate = evaluatePledgeImpactForecast({
    campaignId,
    now: new Date("2026-07-31T12:30:00.000Z"),
    pledgeCents: 6_000,
    poolPublicKey,
    release: buildPledgeImpactTestRelease(),
  });

  assert.equal(estimate.status, "available");
  if (estimate.status !== "available") return;
  assert.equal(estimate.additionalFundingFromOthers.estimateCents, 17_750);
  assert.equal(estimate.thresholds[0].probabilityWithPledgeBps, 4_305);
  assert.equal(estimate.fundingMultiplier, 2.96);
});

test("recommends the smallest released amount whose lower bound clears model noise", () => {
  const estimate = evaluatePledgeImpactForecast({
    campaignId,
    now: new Date("2026-07-31T12:30:00.000Z"),
    pledgeCents: 3_500,
    poolPublicKey,
    release: buildPledgeImpactTestRelease(),
  });

  assert.equal(estimate.status, "available");
  if (estimate.status !== "available") return;
  assert.deepEqual(estimate.recommendation, {
    pledgeCents: 8_500,
    thresholdIndex: 1,
    lower90ChangeBps: 70,
    forecastErrorFloorBps: 50,
  });
});

test("fails closed for stale forecasts, changed pool state, and campaign mismatch", () => {
  const release = buildPledgeImpactTestRelease();
  const stale = evaluatePledgeImpactForecast({
      campaignId,
      now: new Date("2026-07-31T14:00:00.000Z"),
      pledgeCents: 3_500,
      poolPublicKey,
      release,
    });
  assert.equal(stale.status, "unavailable");
  if (stale.status === "unavailable") assert.equal(stale.reason, "forecast_stale");

  const changed = evaluatePledgeImpactForecast({
      campaignId,
      now: new Date("2026-07-31T12:30:00.000Z"),
      pledgeCents: 3_500,
      poolPublicKey,
      release: {
        ...release,
        poolState: { ...poolState, fundedCents: poolState.fundedCents + 100 },
      },
    });
  assert.equal(changed.status, "unavailable");
  if (changed.status === "unavailable") assert.equal(changed.reason, "pool_state_mismatch");

  const mismatch = evaluatePledgeImpactForecast({
      campaignId: "campaign-public-interest-knowledge",
      now: new Date("2026-07-31T12:30:00.000Z"),
      pledgeCents: 3_500,
      poolPublicKey,
      release,
    });
  assert.equal(mismatch.status, "unavailable");
  if (mismatch.status === "unavailable") assert.equal(mismatch.reason, "campaign_mismatch");
});

test("rejects forecasts with viewer-level personalization anywhere in the payload", () => {
  const release = buildPledgeImpactTestRelease();
  const personalized = {
    ...release,
    forecast: {
      ...release.forecast,
      modelPerformance: {
        ...release.forecast.modelPerformance,
        viewer_id: "not-allowed",
      },
    },
  };
  assert.equal(validatePledgeImpactForecastRelease(personalized, poolState), false);
});

test("malformed pool-state payloads return invalid instead of throwing", () => {
  const release = buildPledgeImpactTestRelease();
  assert.doesNotThrow(() =>
    validatePledgeImpactForecastRelease({ ...release, poolState: { poolPublicKey } }, poolState),
  );
  assert.equal(
    validatePledgeImpactForecastRelease({ ...release, poolState: { poolPublicKey } }, poolState),
    false,
  );
});

test("contribution links preserve the exact pool, campaign, amount, and source", () => {
  assert.equal(
    buildPledgeImpactContributionHref({
      amountCents: 3_500,
      poolPublicKey,
      source: "threshold-radar",
    }),
    "/mpgf/contribute?campaign=campaign-animal-welfare-transition&amount=35&pool=pool-wild-research&source=threshold-radar",
  );
});
