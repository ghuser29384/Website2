import assert from "node:assert/strict";
import test from "node:test";

import {
  DETERMINISTIC_PARETO_SAFE_BOOTSTRAP,
  evaluateLearnedRankingReadiness,
  type LearnedRankingReadinessInput,
} from "./learned-ranking-readiness";

function completeInput(): LearnedRankingReadinessInput {
  return {
    observationProvenance: "durable_real_observations",
    observations: {
      exposure: { availability: "available", value: 1_000 },
      response: { availability: "available", value: 200 },
      terminalOutcome: { availability: "available", value: 120 },
      completion: { availability: "available", value: 100 },
      additionality: { availability: "available", value: 80 },
      safety: { availability: "available", value: 100 },
      observationWindowDays: { availability: "available", value: 90 },
    },
    policy: {
      approval: "approved",
      minimums: {
        exposure: 1_000,
        response: 200,
        terminalOutcome: 120,
        completion: 100,
        additionality: 80,
        safety: 100,
        observationWindowDays: 90,
      },
      policyId: "feed-learned-ranking-readiness",
      policyVersion: "reviewed-v1",
      sourceHash: `sha256:${"a".repeat(64)}`,
    },
    reviews: {
      sourceBinding: "approved",
      independentCalibration: "approved",
      privacy: "approved",
      safety: "approved",
    },
  };
}

test("complete durable evidence is eligible only for calibration review", () => {
  const decision = evaluateLearnedRankingReadiness(completeInput());

  assert.equal(decision.status, "eligible_for_calibration_review");
  assert.deepEqual(decision.reasonCodes, []);
  assert.equal(decision.learnedRankingMayActivate, false);
  assert.equal(
    decision.authoritativeRanker,
    DETERMINISTIC_PARETO_SAFE_BOOTSTRAP,
  );
  assert.equal(decision.authoritativeImplementationKey, "pareto-heuristic-v1");
});

test("missing reviewed policy never receives guessed thresholds", () => {
  const input = completeInput();
  input.policy = null;

  const decision = evaluateLearnedRankingReadiness(input);

  assert.equal(decision.status, "not_ready");
  assert.deepEqual(decision.reasonCodes, ["reviewed_policy_missing"]);
  assert.equal(decision.learnedRankingMayActivate, false);
});

test("an unapproved or unidentified policy fails closed", () => {
  const input = completeInput();
  input.policy = {
    ...input.policy!,
    approval: "not_approved",
    policyId: "",
  };

  const decision = evaluateLearnedRankingReadiness(input);

  assert.deepEqual(decision.reasonCodes, [
    "reviewed_policy_not_approved",
    "reviewed_policy_identity_invalid",
  ]);
  assert.equal(decision.status, "not_ready");
});

test("only durable real observations satisfy the provenance gate", () => {
  for (const provenance of [
    "synthetic_or_qa",
    "mixed_or_unknown",
    "unavailable",
  ] as const) {
    const input = completeInput();
    input.observationProvenance = provenance;

    const decision = evaluateLearnedRankingReadiness(input);

    assert.equal(decision.status, "not_ready");
    assert.deepEqual(decision.reasonCodes, [
      "observation_provenance_not_durable_real",
    ]);
    assert.equal(decision.learnedRankingMayActivate, false);
  }
});

test("unavailable observations remain unavailable rather than becoming zero", () => {
  const input = completeInput();
  input.observations.additionality = {
    availability: "unavailable",
    reason: "terminal additionality follow-up has not closed",
  };

  const decision = evaluateLearnedRankingReadiness(input);

  assert.equal(decision.status, "not_ready");
  assert.deepEqual(decision.observations.additionality, {
    availability: "unavailable",
    reason: "terminal additionality follow-up has not closed",
  });
  assert.deepEqual(decision.reasonCodes, [
    "observation_unavailable:additionality",
  ]);
  assert.equal(
    decision.reasonCodes.includes(
      "observation_below_reviewed_minimum:additionality",
    ),
    false,
  );
});

test("invalid observation values and reviewed minima fail closed", () => {
  const input = completeInput();
  input.observations.response = { availability: "available", value: Number.NaN };
  input.policy!.minimums.completion = Number.POSITIVE_INFINITY;

  const decision = evaluateLearnedRankingReadiness(input);

  assert.deepEqual(decision.reasonCodes, [
    "reviewed_minimum_invalid:completion",
    "observation_invalid:response",
  ]);
  assert.equal(decision.status, "not_ready");
});

test("evidence below the reviewed minimum is not calibration-review eligible", () => {
  const input = completeInput();
  input.observations.exposure = { availability: "available", value: 999 };
  input.observations.observationWindowDays = {
    availability: "available",
    value: 89,
  };

  const decision = evaluateLearnedRankingReadiness(input);

  assert.deepEqual(decision.reasonCodes, [
    "observation_below_reviewed_minimum:exposure",
    "observation_below_reviewed_minimum:observationWindowDays",
  ]);
  assert.equal(decision.status, "not_ready");
});

test("all independent reviews are mandatory", () => {
  const input = completeInput();
  input.reviews = {
    sourceBinding: "not_approved",
    independentCalibration: "unavailable",
    privacy: "not_approved",
    safety: "unavailable",
  };

  const decision = evaluateLearnedRankingReadiness(input);

  assert.deepEqual(decision.reasonCodes, [
    "review_not_approved:sourceBinding",
    "review_not_approved:independentCalibration",
    "review_not_approved:privacy",
    "review_not_approved:safety",
  ]);
  assert.equal(decision.status, "not_ready");
});

test("reason ordering is deterministic across repeated evaluation", () => {
  const input = completeInput();
  input.policy = null;
  input.observationProvenance = "unavailable";
  input.observations.exposure = {
    availability: "unavailable",
    reason: "no durable exposure ledger",
  };
  input.reviews.sourceBinding = "unavailable";

  const first = evaluateLearnedRankingReadiness(input);
  const second = evaluateLearnedRankingReadiness(input);

  assert.deepEqual(first, second);
  assert.deepEqual(first.reasonCodes, [
    "reviewed_policy_missing",
    "observation_provenance_not_durable_real",
    "observation_unavailable:exposure",
    "review_not_approved:sourceBinding",
  ]);
});

test("no readiness result can activate learned ranking", () => {
  const ready = evaluateLearnedRankingReadiness(completeInput());
  const blockedInput = completeInput();
  blockedInput.policy = null;
  const blocked = evaluateLearnedRankingReadiness(blockedInput);

  assert.equal(ready.learnedRankingMayActivate, false);
  assert.equal(blocked.learnedRankingMayActivate, false);
  assert.deepEqual(
    new Set([ready.status, blocked.status]),
    new Set(["eligible_for_calibration_review", "not_ready"]),
  );
});
