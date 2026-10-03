import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_RECOMMENDATION_TRAINING_PROJECT_ID,
  evaluateRecommendationTrainingRuntime,
} from "./recommendation-training-runtime";

test("the canonical Moral Trade project executes recommendation training", () => {
  const decision = evaluateRecommendationTrainingRuntime({
    VERCEL_PROJECT_ID: CANONICAL_RECOMMENDATION_TRAINING_PROJECT_ID,
    VERCEL_TARGET_ENV: "production",
  });

  assert.equal(decision.execute, true);
  assert.equal(decision.reason, "canonical_vercel_project");
  assert.equal(decision.targetEnvironment, "production");
});

test("the duplicate website2 project skips recommendation training", () => {
  const decision = evaluateRecommendationTrainingRuntime({
    VERCEL_PROJECT_ID: "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK",
    VERCEL_TARGET_ENV: "production",
  });

  assert.equal(decision.execute, false);
  assert.equal(decision.reason, "non_canonical_vercel_project");
});

test("local and unidentified runtimes remain testable", () => {
  const decision = evaluateRecommendationTrainingRuntime({});

  assert.equal(decision.execute, true);
  assert.equal(decision.reason, "local_or_unidentified_runtime");
  assert.equal(decision.projectId, null);
});
