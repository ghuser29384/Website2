import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMarketplaceCutoff,
  formatMarketplaceIntroductionDate,
  getNextMarketplaceClearingRound,
} from "./marketplace-clearing-round";

test("uses the current Thursday when the cutoff has not passed", () => {
  const round = getNextMarketplaceClearingRound(
    new Date("2026-07-22T16:03:44.000Z"),
  );

  assert.equal(round.cutoffAt.toISOString(), "2026-07-23T17:00:00.000Z");
  assert.equal(
    round.introductionDate.toISOString(),
    "2026-07-27T12:00:00.000Z",
  );
});

test("moves to the following week once Thursday's cutoff has passed", () => {
  const round = getNextMarketplaceClearingRound(
    new Date("2026-07-23T17:00:00.001Z"),
  );

  assert.equal(round.cutoffAt.toISOString(), "2026-07-30T17:00:00.000Z");
  assert.equal(
    round.introductionDate.toISOString(),
    "2026-08-03T12:00:00.000Z",
  );
});

test("formats the operational schedule in UTC", () => {
  const round = getNextMarketplaceClearingRound(
    new Date("2026-07-22T16:03:44.000Z"),
  );

  assert.match(formatMarketplaceCutoff(round.cutoffAt), /Thursday/);
  assert.match(formatMarketplaceCutoff(round.cutoffAt), /5:00 PM/);
  assert.match(
    formatMarketplaceIntroductionDate(round.introductionDate),
    /Monday/,
  );
});
