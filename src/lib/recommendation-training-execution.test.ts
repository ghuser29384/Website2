import assert from "node:assert/strict";
import test from "node:test";

import { PARETO_MODEL_VERSION } from "./pareto-recommendation-model";
import { buildRecommendationTrainingExecutionContext } from "./recommendation-training-execution";
import type { RecommendationTrainingRuntimeDecision } from "./recommendation-training-runtime";

const canonicalRuntime: RecommendationTrainingRuntimeDecision = {
  execute: true,
  projectId: "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7",
  reason: "canonical_vercel_project",
  targetEnvironment: "production",
};

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

test("a natural 12:30 UTC invocation receives a stable daily idempotency slot", () => {
  const request = new Request("https://www.moraltrade.org/api/jobs/recommendation-training", {
    headers: { "x-vercel-cron-schedule": "30 12 * * *" },
  });
  const context = buildRecommendationTrainingExecutionContext(
    request,
    canonicalRuntime,
    testEnv({ VERCEL_DEPLOYMENT_ID: "dpl_canonical" }),
    new Date("2026-07-30T12:30:48.000Z"),
  );

  assert.deepEqual(context, {
    scheduledFor: "2026-07-30T12:30:00.000Z",
    scheduledSlot: `${PARETO_MODEL_VERSION}:2026-07-30:12:30Z`,
    sourceDeploymentId: "dpl_canonical",
    sourceInvocation: "natural_cron",
    sourceProjectId: canonicalRuntime.projectId,
  });
});

test("manual authorized execution is not assigned a natural cron slot", () => {
  const request = new Request("https://www.moraltrade.org/api/jobs/recommendation-training");
  const context = buildRecommendationTrainingExecutionContext(
    request,
    canonicalRuntime,
    testEnv(),
    new Date("2026-07-30T15:00:00.000Z"),
  );

  assert.equal(context.scheduledSlot, null);
  assert.equal(context.scheduledFor, null);
  assert.equal(context.sourceInvocation, "manual");
});

test("an unrelated cron schedule cannot collide with the daily A1 slot", () => {
  const request = new Request("https://www.moraltrade.org/api/jobs/recommendation-training", {
    headers: { "x-vercel-cron-schedule": "15 * * * *" },
  });
  const context = buildRecommendationTrainingExecutionContext(
    request,
    canonicalRuntime,
    testEnv(),
    new Date("2026-07-30T12:30:00.000Z"),
  );

  assert.equal(context.scheduledSlot, null);
  assert.equal(context.sourceInvocation, "manual");
});
