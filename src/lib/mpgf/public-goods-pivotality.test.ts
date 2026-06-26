import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES,
  MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
  evaluateMpgfPivotalityCalculator,
} from "./public-goods-pivotality";

test("MPGF pivotality calculator computes the strict assurance example without live data", () => {
  const result = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "advanced_explainer",
    contributionCents: 5_000,
    thresholdCents: 50_000,
    valueRatio: "0.20",
    pSuccessWithoutMe: "0.30",
    userEstimatedPDecisive: "0.25",
    signerOnlyRewardValue: "0",
    nonDecisiveExtraFundingValueFraction: "0",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.requiredPDecisivePercent, "30%");
  assert.equal(result.userEstimatedPDecisivePercent, "25%");
  assert.equal(result.calculatorSurface, "advanced_explainer");
  assert.equal(result.resultCode, "does_not_beat_alternative");
  assert.match(result.interpretation, /By your stated values under this simplified model/);
  assert.equal(result.interpretation.includes("objectively best"), false);
  assert.equal(result.usesLiveRoundData, false);
  assert.equal(result.writesFundingRecords, false);
});

test("MPGF pivotality calculator handles general reward-aware cases deterministically", () => {
  const rewardEnough = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "shadow_simulation",
    contributionCents: 10_000,
    thresholdCents: 50_000,
    valueRatio: "0.20",
    pSuccessWithoutMe: "0.40",
    userEstimatedPDecisive: "0",
    signerOnlyRewardValue: "1",
    nonDecisiveExtraFundingValueFraction: "0",
  });

  assert.equal(rewardEnough.ok, true);
  assert.equal(rewardEnough.requiredPDecisivePercent, "0%");
  assert.equal(rewardEnough.calculatorSurface, "shadow_simulation");
  assert.equal(rewardEnough.resultCode, "beats_alternative");

  const impossibleModel = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "post_round_analysis",
    contributionCents: 5_000,
    thresholdCents: 50_000,
    valueRatio: "0.05",
    pSuccessWithoutMe: "0.30",
    userEstimatedPDecisive: "0.10",
  });

  assert.equal(impossibleModel.ok, true);
  assert.equal(impossibleModel.requiredPDecisivePercent, null);
  assert.equal(impossibleModel.resultCode, "impossible_under_model");

  const impossibleProbability = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "project_card_educational_drawer",
    contributionCents: 5_000,
    thresholdCents: 50_000,
    valueRatio: "0.20",
    pSuccessWithoutMe: "0.80",
    userEstimatedPDecisive: "0.10",
  });

  assert.equal(impossibleProbability.ok, true);
  assert.equal(impossibleProbability.requiredPDecisivePercent, "80%");
  assert.equal(impossibleProbability.resultCode, "impossible_under_probability_inputs");
});

test("MPGF pivotality calculator rejects malformed decimals, probability mass, and live identifiers", () => {
  const result = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "default_pledge_modal",
    contributionCents: 0,
    thresholdCents: 50_000,
    valueRatio: "0.2000001",
    pSuccessWithoutMe: "0.90",
    userEstimatedPDecisive: "0.20",
    roundId: "round-live",
    projectId: "project-live",
    liveThresholdGapCents: 5000,
    liveCounterpartyVolumeGapCents: 2000,
    liveSuccessWithoutMeProbability: "0.8",
    platformGeneratedDecisiveProbability: "0.2",
  });

  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("pivotality_calculator_surface_invalid"));
  assert.ok(result.blockers.includes("contribution_cents_invalid"));
  assert.ok(result.blockers.includes("value_ratio_decimal_invalid"));
  assert.ok(result.blockers.includes("probability_mass_exceeds_one"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_roundId"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_projectId"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_liveThresholdGapCents"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_liveCounterpartyVolumeGapCents"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_liveSuccessWithoutMeProbability"));
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_platformGeneratedDecisiveProbability"));
  assert.equal(result.usesLiveRoundData, false);
  assert.equal(result.writesFundingRecords, false);
});

test("MPGF pivotality calculator requires an allowed educational surface", () => {
  for (const calculatorSurface of MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES) {
    const result = evaluateMpgfPivotalityCalculator({
      calculatorSurface,
      contributionCents: 5_000,
      thresholdCents: 50_000,
      valueRatio: "0.20",
      pSuccessWithoutMe: "0.30",
      userEstimatedPDecisive: "0.25",
    });

    assert.equal(result.ok, true);
    assert.equal(result.calculatorSurface, calculatorSurface);
  }

  const missingSurface = evaluateMpgfPivotalityCalculator({
    contributionCents: 5_000,
    thresholdCents: 50_000,
    valueRatio: "0.20",
    pSuccessWithoutMe: "0.30",
    userEstimatedPDecisive: "0.25",
  });

  assert.equal(missingSurface.ok, false);
  assert.ok(missingSurface.blockers.includes("pivotality_calculator_surface_invalid"));
});

test("MPGF pivotality calculator is exposed only as an advanced educational surface", () => {
  const hubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const route = readFileSync("src/app/api/mpgf/pivotality/route.ts", "utf8");

  assert.match(hubPage, /Advanced: Pivotality Calculator/);
  assert.match(hubPage, /action="\/api\/mpgf\/pivotality"/);
  assert.match(hubPage, /name="calculatorSurface"/);
  assert.match(hubPage, /Calculate from subjective inputs/);
  assert.match(hubPage, /up to unless the maximum liability is\s+fully backed/);
  assert.match(hubPage, /MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE/);
  assert.match(MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE, /does not use live sealed-round data/);
  assert.equal(hubPage.includes("objectively best"), false);
  assert.match(route, /MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS/);
  assert.match(route, /MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES/);
  assert.match(route, /evaluateMpgfPivotalityCalculator/);
});
