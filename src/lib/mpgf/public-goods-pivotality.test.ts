import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS,
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
  assert.equal(result.ranksFundingRecords, false);
  assert.equal(result.authorizesOrClearsFundingRecords, false);
  assert.equal(result.privateBenefitInputsCountAsPublicGoodDollars, false);
  assert.equal(result.privateBenefitInputsAffectOnlySubjectiveUtility, true);
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
    exactLiveSupporterCount: 12,
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
  assert.ok(result.blockers.includes("pivotality_unrecognized_input_key_exactLiveSupporterCount"));
  assert.equal(result.usesLiveRoundData, false);
  assert.equal(result.writesFundingRecords, false);
  assert.equal(result.ranksFundingRecords, false);
  assert.equal(result.authorizesOrClearsFundingRecords, false);
  assert.equal(result.privateBenefitInputsCountAsPublicGoodDollars, false);
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

test("MPGF keeps the public assurance receipt educational and the advanced API isolated", () => {
  const hubPage = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const receipt = readFileSync(
    "src/components/mpgf/mpgf-assurance-funding-receipt.tsx",
    "utf8",
  );
  const receiptModel = readFileSync("src/lib/mpgf/assurance-funding-receipt.ts", "utf8");
  const route = readFileSync("src/app/api/mpgf/pivotality-calculator/route.ts", "utf8");

  assert.match(hubPage, /id="assurance-funding"/);
  assert.match(hubPage, /MpgfAssuranceFundingReceipt/);
  assert.match(receipt, /Your estimated chance this pledge would be decisive/);
  assert.match(receipt, /Funding estimate, not an impact guarantee/);
  assert.match(receipt, /ASSURANCE_FUNDING_RECEIPT_BOUNDARY/);
  assert.match(receiptModel, /does not use live round progress/);
  assert.match(receiptModel, /create or change a pledge/);
  assert.equal(hubPage.includes('action="/api/mpgf/pivotality-calculator"'), false);
  assert.match(MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE, /does not use live sealed-round data/);
  assert.ok(MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS.includes("signerOnlyRewardValue"));
  assert.ok(
    MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS.includes(
      "nonDecisiveExtraFundingValueFraction",
    ),
  );
  assert.equal(hubPage.includes("objectively best"), false);
  assert.equal(existsSync("src/app/api/mpgf/pivotality/route.ts"), false);
  assert.match(route, /MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS/);
  assert.match(route, /MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_SURFACES/);
  assert.match(route, /MPGF_PUBLIC_GOODS_PIVOTALITY_ALLOWED_INPUT_KEYS/);
  assert.match(route, /evaluateMpgfPivotalityCalculator/);
  assert.match(route, /for \(const key of formData\.keys\(\)\)/);
  assert.match(route, /for \(const key of MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS\)/);
  assert.match(route, /formData\.has\(key\)/);
  assert.match(route, /input\[key\] = String\(formData\.get\(key\) \?\? ""\)/);
  assert.equal(route.includes(".from("), false);
  assert.equal(route.includes("insert("), false);
  assert.equal(route.includes("update("), false);
  assert.equal(route.includes("upsert("), false);
});

test("MPGF pivotality calculator route rejects forbidden live keys submitted by form", async () => {
  const routeModule = (await import(
    "../../app/api/mpgf/pivotality-calculator/route"
  )) as unknown as {
    POST?: (request: Request) => Promise<Response>;
    default?: { POST: (request: Request) => Promise<Response> };
  };
  const post = routeModule.POST ?? routeModule.default?.POST;
  assert.ok(post);

  const formData = new FormData();
  formData.set("calculatorSurface", "advanced_explainer");
  formData.set("contributionCents", "5000");
  formData.set("thresholdCents", "50000");
  formData.set("valueRatio", "0.20");
  formData.set("pSuccessWithoutMe", "0.30");
  formData.set("userEstimatedPDecisive", "0.25");
  formData.set("liveThresholdGapCents", "100");
  formData.set("exactLiveSupporterCount", "12");

  const response = await post(
    new Request("https://moraltrade.test/api/mpgf/pivotality-calculator", {
      method: "POST",
      body: formData,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("pivotality_forbidden_live_key_liveThresholdGapCents"));
  assert.ok(result.blockers.includes("pivotality_unrecognized_input_key_exactLiveSupporterCount"));
  assert.equal(result.usesLiveRoundData, false);
  assert.equal(result.writesFundingRecords, false);
  assert.equal(result.ranksFundingRecords, false);
  assert.equal(result.privateBenefitInputsCountAsPublicGoodDollars, false);
});
