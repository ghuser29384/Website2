import assert from "node:assert/strict";
import test from "node:test";

import {
  isBackgroundConciergeAppealOpen,
  isBackgroundConciergeRequestAppealable,
  normalizeBackgroundConciergeAppealStatus,
  validateBackgroundConciergeAppealRequest,
} from "@/lib/background-concierge-appeals";

test("background concierge appeal statuses normalize to a closed lattice", () => {
  assert.equal(normalizeBackgroundConciergeAppealStatus("requested"), "requested");
  assert.equal(normalizeBackgroundConciergeAppealStatus("under_review"), "under_review");
  assert.equal(normalizeBackgroundConciergeAppealStatus("surprise"), "none");
});

test("background concierge appeals only open for requested and under-review states", () => {
  assert.equal(isBackgroundConciergeAppealOpen("requested"), true);
  assert.equal(isBackgroundConciergeAppealOpen("under_review"), true);
  assert.equal(isBackgroundConciergeAppealOpen("resolved"), false);
  assert.equal(isBackgroundConciergeAppealOpen("none"), false);
});

test("background concierge requests are appealable after operator decline or closure", () => {
  assert.equal(isBackgroundConciergeRequestAppealable("declined"), true);
  assert.equal(isBackgroundConciergeRequestAppealable("closed"), true);
  assert.equal(isBackgroundConciergeRequestAppealable("open"), false);
  assert.equal(isBackgroundConciergeRequestAppealable("waiting_on_requester"), false);
});

test("background concierge appeal validation blocks active requests, duplicate appeals, and vague reasons", () => {
  const active = validateBackgroundConciergeAppealRequest({
    appealStatus: "none",
    reason: "Please review because the operator missed the agreed privacy condition.",
    requestStatus: "open",
  });
  assert.ok(active.errors.some((error) => error.includes("declined or closed")));

  const duplicate = validateBackgroundConciergeAppealRequest({
    appealStatus: "under_review",
    reason: "Please review because the operator missed the agreed privacy condition.",
    requestStatus: "declined",
  });
  assert.ok(duplicate.errors.some((error) => error.includes("already has an appeal")));

  const vague = validateBackgroundConciergeAppealRequest({
    appealStatus: "none",
    reason: "why",
    requestStatus: "closed",
  });
  assert.ok(vague.errors.some((error) => error.includes("brief reason")));
});

test("background concierge appeal validation trims and caps reason text", () => {
  const validation = validateBackgroundConciergeAppealRequest({
    appealStatus: "dismissed",
    reason: `  ${"review ".repeat(300)}  `,
    requestStatus: "declined",
  });

  assert.equal(validation.errors.length, 0);
  assert.equal(validation.reason.length, 1000);
  assert.ok(validation.reason.startsWith("review"));
});
