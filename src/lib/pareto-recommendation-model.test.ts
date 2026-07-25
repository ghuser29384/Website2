import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PARETO_THRESHOLDS,
  PARETO_FEATURE_KEYS,
  assignNonDirectHoldout,
  clearsParetoDirectGate,
  factorAffinity,
  fitImplicitFactors,
  fitLogisticHead,
  inversePropensityDifference,
  predictParetoModel,
  tuneParetoSuccessThreshold,
  type BinaryTrainingExample,
  type ParetoFeatureSnapshot,
  type ParetoModelArtifact,
} from "./pareto-recommendation-model";

function snapshot(value: number): ParetoFeatureSnapshot {
  return Object.fromEntries(PARETO_FEATURE_KEYS.map((key) => [key, value])) as ParetoFeatureSnapshot;
}

test("five-percent assignment is stable and never selects a Direct candidate", () => {
  const candidates = [
    { id: "direct", opportunityType: "offer", matchClass: "direct" as const },
    { id: "near", opportunityType: "offer", matchClass: "near" as const },
    { id: "adjacent", opportunityType: "offer", matchClass: "adjacent" as const },
  ];
  let assignedProfile = "";
  let assigned: ReturnType<typeof assignNonDirectHoldout> | null = null;
  for (let index = 0; index < 10_000; index += 1) {
    const profileId = `profile-${index}`;
    const candidate = assignNonDirectHoldout({
      candidates,
      day: "2026-07-25",
      experimentEnabled: true,
      profileId,
    });
    if (candidate.arm !== "not_assigned") {
      assigned = candidate;
      assignedProfile = profileId;
      break;
    }
  }
  assert.ok(assigned);
  if (!assigned) throw new Error("Expected at least one stable assignment");
  assert.notEqual(assigned.affectedCandidateKey, "offer:direct");
  assert.deepEqual(
    assigned,
    assignNonDirectHoldout({
      candidates,
      day: "2026-07-25",
      experimentEnabled: true,
      profileId: assignedProfile,
    }),
  );
});

test("Pareto gate requires every participant and safety dimension to clear", () => {
  const passing = {
    additionality: 0.8,
    counterpartyAcceptance: 0.8,
    counterpartyGain: 0.8,
    externalitySafety: 0.9,
    paretoSuccess: 0.8,
    satisfaction: 0.8,
    userAcceptance: 0.8,
    verifiedCompletion: 0.8,
    viewerGain: 0.8,
  };
  assert.equal(clearsParetoDirectGate(passing), true);
  assert.equal(clearsParetoDirectGate({ ...passing, counterpartyGain: 0.2 }), false);
  assert.equal(clearsParetoDirectGate({ ...passing, externalitySafety: 0.2 }), false);
});

test("implicit factor training produces finite affinities", () => {
  const factors = fitImplicitFactors([
    { profileId: "a", opportunityKey: "offer:1", weight: 8 },
    { profileId: "a", opportunityKey: "offer:2", weight: -4 },
    { profileId: "b", opportunityKey: "offer:1", weight: 6 },
    { profileId: "b", opportunityKey: "offer:3", weight: 5 },
  ]);
  const affinity = factorAffinity(
    factors.profileFactors.get("a"),
    factors.opportunityFactors.get("offer:1"),
  );
  assert.ok(Number.isFinite(affinity));
  assert.ok(affinity >= 0 && affinity <= 1);
});

test("logistic heads train and remain calibrated to probabilities", () => {
  const examples: BinaryTrainingExample[] = Array.from({ length: 80 }, (_, index) => ({
    features: snapshot(index / 79),
    id: `example-${index}`,
    label: index >= 40 ? 1 : 0,
  }));
  const head = fitLogisticHead(examples);
  assert.equal(head.enabled, true);
  assert.equal(head.coefficients.length, PARETO_FEATURE_KEYS.length);
  assert.ok((head.metrics.brier ?? 1) < 0.3);

  const artifact: ParetoModelArtifact = {
    featureKeys: PARETO_FEATURE_KEYS,
    heads: {
      userAcceptance: head,
      counterpartyAcceptance: head,
      verifiedCompletion: head,
      viewerGain: head,
      counterpartyGain: head,
      additionality: head,
      externalitySafety: head,
      satisfaction: head,
    },
    modelVersion: "pareto-causal-v1",
    platformPriors: { acceptance: 0.5, completion: 0.5 },
    thresholds: DEFAULT_PARETO_THRESHOLDS,
    trainedAt: "2026-07-25T00:00:00.000Z",
  };
  const low = predictParetoModel(artifact, snapshot(0.1));
  const high = predictParetoModel(artifact, snapshot(0.9));
  assert.ok(high.paretoSuccess > low.paretoSuccess);
});

test("threshold tuning preserves a minimum precision target", () => {
  const tuned = tuneParetoSuccessThreshold(
    Array.from({ length: 100 }, (_, index) => ({
      label: (index >= 70 ? 1 : 0) as 0 | 1,
      prediction: index / 100,
    })),
  );
  assert.ok(tuned.threshold >= 0.35 && tuned.threshold <= 0.85);
  assert.ok((tuned.precision ?? 0) >= 0.75);
});

test("inverse-propensity estimator distinguishes treatment and holdout outcomes", () => {
  const estimate = inversePropensityDifference([
    { outcome: 1, shown: true, propensity: 0.5 },
    { outcome: 1, shown: true, propensity: 0.5 },
    { outcome: 0, shown: false, propensity: 0.5 },
    { outcome: 0, shown: false, propensity: 0.5 },
  ]);
  assert.equal(estimate.estimate, 1);
  assert.ok(estimate.effectiveSampleSize > 0);
});
