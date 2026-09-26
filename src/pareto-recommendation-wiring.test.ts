import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wrapper = readFileSync("src/app/api/live-now-a1/route.ts", "utf8");
const trainingRoute = readFileSync(
  "src/app/api/jobs/recommendation-training/route.ts",
  "utf8",
);
const runtime = readFileSync("src/lib/pareto-feed-runtime.ts", "utf8");
const training = readFileSync("src/lib/recommendation-training.ts", "utf8");
const execution = readFileSync("src/lib/recommendation-training-execution.ts", "utf8");
const model = readFileSync("src/lib/pareto-recommendation-model.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260725120500_pareto_causal_recommendation_learning.sql",
  "utf8",
);
const idempotencyMigration = readFileSync(
  "supabase/migrations/20260729170500_recommendation_training_idempotency_provenance.sql",
  "utf8",
);
const denyPolicyMigration = readFileSync(
  "supabase/migrations/20260729171000_recommendation_training_slot_deny_policies.sql",
  "utf8",
);
const indexMigration = readFileSync(
  "supabase/migrations/20260729171500_recommendation_training_provenance_fk_indexes.sql",
  "utf8",
);
const config = readFileSync("next.config.ts", "utf8");
const vercel = readFileSync("vercel.ts", "utf8");
const vercelProjectConfig = readFileSync("scripts/vercel-project-config.mjs", "utf8");
const stage = readFileSync("src/components/core-trade/trade-agreement-stage.tsx", "utf8");
const loader = readFileSync("public/moral-trade-live.html", "utf8");

test("the production live endpoint is wrapped by the Pareto-safe learning layer", () => {
  assert.match(config, /source:\s*["']\/api\/live-now["']/);
  assert.match(config, /destination:\s*["']\/api\/live-now-a1["']/);
  assert.match(wrapper, /getReciprocalLiveNow/);
  assert.match(wrapper, /applyParetoLearningToLiveNowPayload/);
  assert.match(runtime, /directMatchesRandomized:\s*false/);
  assert.match(runtime, /pareto_safe_additionality/);
});

test("the learning core implements factors, calibration, Pareto gates, and causal propensities", () => {
  assert.match(model, /fitImplicitFactors/);
  assert.match(model, /fitLogisticHead/);
  assert.match(model, /expectedCalibrationError/);
  assert.match(model, /clearsParetoDirectGate/);
  assert.match(model, /assignNonDirectHoldout/);
  assert.match(model, /inversePropensityDifference/);
  assert.match(training, /recommendation_counterparty_priors/);
  assert.match(training, /tuneParetoSuccessThreshold/);
  assert.match(training, /safety_guardrail_stopped/);
});

test("the migration separates participant-visible receipts from service-only model artifacts", () => {
  assert.match(migration, /recommendation_exposures/);
  assert.match(migration, /recommendation_outcome_feedback/);
  assert.match(migration, /recommendation_model_versions/);
  assert.match(migration, /recommendation_user_factors/);
  assert.match(migration, /recommendation_opportunity_factors/);
  assert.match(migration, /recommendation_guardrail_snapshots/);
  assert.match(migration, /Never store raw private profile prose/i);
  assert.match(migration, /revoke all[\s\S]*from anon, authenticated/);
  assert.match(migration, /recommendation_exposures_select_own/);
});

test("generated pseudo-owner identifiers are excluded from UUID-backed learning records", () => {
  assert.match(runtime, /const PROFILE_UUID_PATTERN/);
  assert.match(runtime, /function profileUuid/);
  assert.match(runtime, /owner_id:\s*profileUuid\(recommendation\.ownerId\)/);
  assert.match(runtime, /owner_id:\s*profileUuid\(heldOut\.ownerId\)/);
  assert.doesNotMatch(
    runtime,
    /owner_id:\s*typeof recommendation\.ownerId === ["']string["']/,
  );
});

test("natural training is project-owned, durable, and auditable", () => {
  assert.match(vercel, /buildVercelProjectConfig/);
  assert.match(vercelProjectConfig, /DUPLICATE_WEBSITE2_PROJECT_ID/);
  assert.match(vercelProjectConfig, /projectId !== DUPLICATE_WEBSITE2_PROJECT_ID/);
  assert.match(vercelProjectConfig, /\/api\/jobs\/recommendation-training/);
  assert.match(trainingRoute, /runParetoRecommendationTrainingExecution/);
  assert.match(execution, /x-vercel-cron-schedule/);
  assert.match(execution, /claim_recommendation_training_slot/);
  assert.match(execution, /complete_recommendation_training_slot/);
  assert.match(execution, /duplicate_scheduled_slot/);
  assert.match(idempotencyMigration, /recommendation_training_slots/);
  assert.match(idempotencyMigration, /one_canonical_slot/);
  assert.match(idempotencyMigration, /noncanonical_duplicate/);
  assert.match(denyPolicyMigration, /deny_browser_access/);
  assert.match(indexMigration, /recommendation_training_slots_run_idx/);
  assert.match(indexMigration, /recommendation_training_slots_model_idx/);
});

test("completed agreements collect private own-lights and additionality feedback", () => {
  assert.match(stage, /TradeOutcomeFeedback/);
  assert.match(stage, /lifecycleStatus === "completed"/);
  assert.match(vercelProjectConfig, /\/api\/jobs\/recommendation-training/);
});

test("learning status is disclosed on the static Feed shell", () => {
  assert.match(loader, /moral-trade-live-learning-diagnostics\.css/);
  assert.match(loader, /moral-trade-live-learning-diagnostics\.js/);
});
