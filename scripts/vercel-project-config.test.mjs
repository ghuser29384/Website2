import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MORAL_TRADE_PROJECT_ID,
  DUPLICATE_WEBSITE2_PROJECT_ID,
  RECOMMENDATION_TRAINING_PATH,
  RECOMMENDATION_TRAINING_SCHEDULE,
  COLLECTIVE_COMMITMENT_EXPIRY_PATH,
  COLLECTIVE_COMMITMENT_EXPIRY_SCHEDULE,
  buildVercelProjectConfig,
} from "./vercel-project-config.mjs";

function matchingCrons(projectId, path) {
  return buildVercelProjectConfig({ projectId }).crons.filter(
    (cron) => cron.path === path,
  );
}

test("the canonical Moral Trade project owns exactly one A1 training cron", () => {
  assert.deepEqual(matchingCrons(CANONICAL_MORAL_TRADE_PROJECT_ID, RECOMMENDATION_TRAINING_PATH), [
    { path: RECOMMENDATION_TRAINING_PATH, schedule: RECOMMENDATION_TRAINING_SCHEDULE },
  ]);
});

test("the duplicate website2 project receives no A1 training cron", () => {
  assert.deepEqual(matchingCrons(DUPLICATE_WEBSITE2_PROJECT_ID, RECOMMENDATION_TRAINING_PATH), []);
});

test("an explicitly unidentified local configuration retains the canonical schedules", () => {
  assert.equal(matchingCrons(null, RECOMMENDATION_TRAINING_PATH).length, 1);
  assert.equal(matchingCrons(null, COLLECTIVE_COMMITMENT_EXPIRY_PATH).length, 1);
});

test("the canonical Moral Trade project owns exactly one Collective Commitment expiry cron", () => {
  assert.deepEqual(matchingCrons(CANONICAL_MORAL_TRADE_PROJECT_ID, COLLECTIVE_COMMITMENT_EXPIRY_PATH), [
    {
      path: COLLECTIVE_COMMITMENT_EXPIRY_PATH,
      schedule: COLLECTIVE_COMMITMENT_EXPIRY_SCHEDULE,
    },
  ]);
});

test("the duplicate website2 project receives no Collective Commitment expiry cron", () => {
  assert.deepEqual(matchingCrons(DUPLICATE_WEBSITE2_PROJECT_ID, COLLECTIVE_COMMITMENT_EXPIRY_PATH), []);
});
