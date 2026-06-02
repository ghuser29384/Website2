import assert from "node:assert/strict";
import test from "node:test";

import {
  getBackgroundNetworkingRolloutPlan,
  serializeBackgroundNetworkingRolloutSurface,
  validateBackgroundNetworkingRolloutPlan,
} from "@/lib/background-rollout";

test("background networking bg14 rollout starts default-off and validates", () => {
  const plan = getBackgroundNetworkingRolloutPlan({});
  const validation = validateBackgroundNetworkingRolloutPlan(plan);

  assert.equal(plan.stage, "internal");
  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.deepEqual(
    plan.flags.map((flag) => flag.key),
    [
      "background_source_summary_enabled",
      "background_wish_interview_enabled",
      "background_opportunity_briefs_enabled",
    ],
  );
  assert.ok(plan.flags.every((flag) => flag.defaultEnabled === false));
  assert.ok(plan.flags.every((flag) => flag.enabled === false));
  assert.match(plan.deploymentNote.summary, /internal\/staff/);
  assert.match(plan.deploymentNote.summary, /tiny consenting cohort/);
  assert.match(plan.deploymentNote.summary, /pilot pack/);
  assert.ok(plan.deploymentNote.broadenOnlyAfter.includes("zero unresolved privacy incidents"));
});

test("background networking bg14 rollout reads enabled env flags and safe surface metadata", () => {
  const plan = getBackgroundNetworkingRolloutPlan({
    BACKGROUND_NETWORKING_ROLLOUT_STAGE: "tiny_cohort",
    BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED: "true",
    BACKGROUND_SOURCE_SUMMARY_ENABLED: "1",
    BACKGROUND_WISH_INTERVIEW_ENABLED: "false",
  });
  const opportunitySurface = serializeBackgroundNetworkingRolloutSurface(
    "background_opportunity_briefs_enabled",
    {
      BACKGROUND_NETWORKING_ROLLOUT_STAGE: "tiny_cohort",
      BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED: "true",
    },
  );

  assert.equal(plan.stage, "tiny_cohort");
  assert.equal(
    plan.flags.find((flag) => flag.key === "background_source_summary_enabled")?.enabled,
    true,
  );
  assert.equal(
    plan.flags.find((flag) => flag.key === "background_wish_interview_enabled")?.enabled,
    false,
  );
  assert.equal(opportunitySurface.flag?.enabled, true);
  assert.equal(opportunitySurface.rawPrivateFeedIngestionEnabled, false);
  assert.ok(opportunitySurface.hardInvariants.some((invariant) => /No autonomous outreach/.test(invariant)));
});

test("background networking bg14 rollout validation fails when required flag is missing", () => {
  const plan = getBackgroundNetworkingRolloutPlan({});
  const weakened = {
    ...plan,
    flags: plan.flags.filter((flag) => flag.key !== "background_wish_interview_enabled"),
  };
  const validation = validateBackgroundNetworkingRolloutPlan(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-bg14-flags")));
});
