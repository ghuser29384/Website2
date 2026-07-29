import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MORAL_TRADE_PROJECT_ID,
  DUPLICATE_WEBSITE2_PROJECT_ID,
  RECOMMENDATION_TRAINING_PATH,
  RECOMMENDATION_TRAINING_SCHEDULE,
  buildVercelProjectConfig,
} from "./vercel-project-config.mjs";

function trainingCrons(projectId) {
  return buildVercelProjectConfig({ projectId }).crons.filter(
    (cron) => cron.path === RECOMMENDATION_TRAINING_PATH,
  );
}

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

test("unidentified local configuration retains the canonical schedule", () => {
  assert.equal(trainingCrons(undefined).length, 1);
});
