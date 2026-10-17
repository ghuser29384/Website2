import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MORAL_TRADE_PROJECT_ID,
  DUPLICATE_WEBSITE2_PROJECT_ID,
  RECOMMENDATION_TRAINING_PATH,
  RECOMMENDATION_TRAINING_SCHEDULE,
  RELEASE_PREVIEW_BRANCH,
  VERCEL_IGNORE_COMMAND,
  buildVercelProjectConfig,
} from "./vercel-project-config.mjs";

function trainingCrons(projectId) {
  return buildVercelProjectConfig({ projectId }).crons.filter(
    (cron) => cron.path === RECOMMENDATION_TRAINING_PATH,
  );
}

test("automatic Git deployments are disabled in favor of gated prebuilt releases", () => {
  const config = buildVercelProjectConfig({
    projectId: CANONICAL_MORAL_TRADE_PROJECT_ID,
  });
  assert.deepEqual(config.git, { deploymentEnabled: false });
  assert.equal(config.ignoreCommand, VERCEL_IGNORE_COMMAND);
  assert.equal(RELEASE_PREVIEW_BRANCH, "release/vercel-preview");
});

test("the canonical Moral Trade project owns exactly one A1 training cron", () => {
  assert.deepEqual(trainingCrons(CANONICAL_MORAL_TRADE_PROJECT_ID), [
    {
      path: RECOMMENDATION_TRAINING_PATH,
      schedule: RECOMMENDATION_TRAINING_SCHEDULE,
    },
  ]);
});

test("the duplicate website2 project receives no A1 training cron", () => {
  assert.deepEqual(trainingCrons(DUPLICATE_WEBSITE2_PROJECT_ID), []);
});

test("an explicitly unidentified local configuration retains the canonical schedule", () => {
  assert.equal(trainingCrons(null).length, 1);
});
