import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBrowsingCauseWeights,
  buildLearnedActionPreferences,
  buildOpportunityFeedbackState,
  type RecommendationEventType,
  type RecommendationInteractionSignal,
} from "./recommendation-learning";

function signal(
  eventType: RecommendationEventType,
  overrides: Partial<RecommendationInteractionSignal> = {},
): RecommendationInteractionSignal {
  return {
    opportunityType: "offer",
    opportunityId: "offer-1",
    eventType,
    benefitCauses: ["Animal welfare"],
    actionCauses: ["Unrelated requested cause"],
    actionKey: "action:review",
    actionLabel: "Review a brief",
    inferredDifficulty: 3,
    dwellMs: eventType === "dwell" ? 30_000 : 0,
    occurredAt: "2026-09-24T00:00:00.000Z",
    ...overrides,
  };
}

test("passive attention and bookmarks do not become action willingness", () => {
  const preference = buildLearnedActionPreferences([
    signal("open"),
    signal("dwell"),
    signal("save"),
  ], new Date("2026-09-24T00:01:00.000Z")).get("action:review");

  assert.ok(preference);
  assert.equal(preference.willingness, 50);
});

test("optional browsing relevance does not infer support for the requested-action cause", () => {
  const weights = buildBrowsingCauseWeights(
    [signal("dwell")],
    new Date("2026-09-24T00:01:00.000Z"),
  );
  assert.ok(weights.some((item) => item.cause === "Animal welfare"));
  assert.equal(weights.some((item) => item.cause === "Unrelated requested cause"), false);
});

test("recommendation interaction history no longer acts as a bookmark store", () => {
  const state = buildOpportunityFeedbackState([
    signal("save"),
    signal("not_for_me", { opportunityId: "offer-2" }),
  ]);
  assert.equal(state.savedOpportunityKeys.size, 0);
  assert.equal(state.hiddenOpportunityKeys.has("offer:offer-2"), true);
});

test("feed implementation uses opt-in browsing, canonical bookmarks, and honest mechanism controls", () => {
  const route = readFileSync("src/app/api/live-now/route.ts", "utf8");
  const feedback = readFileSync("src/app/api/live-now/feedback/route.ts", "utf8");
  const saved = readFileSync("src/app/api/saved-offers/route.ts", "utf8");
  const shell = readFileSync("public/moral-trade-live-now.js", "utf8");
  const diagnostics = readFileSync("public/moral-trade-live-learning-diagnostics.js", "utf8");
  const create = readFileSync("public/moral-trade-live-feed-create.js", "utf8");
  const hybrid = readFileSync("src/lib/live-now-hybrid-feed.ts", "utf8");
  const additional = readFileSync("src/app/api/live-now-a1/route.ts", "utf8");

  assert.match(route, /preference\?\.learn_from_browsing === true/);
  assert.match(route, /from\("offer_carts"\)/);
  assert.match(route, /mechanism: "published_offer"/);
  assert.match(feedback, /!\["save", "unsave"\]\.includes/);
  assert.match(feedback, /clearedBrowsingInferences: true/);
  assert.match(feedback, /preservedExclusions: true/);
  assert.match(saved, /from\("offer_carts"\)/);
  assert.match(shell, /fetch\("\/api\/saved-offers"/);
  assert.match(shell, /Use viewing activity:/);
  assert.match(shell, /Clear browsing inferences/);
  assert.match(shell, /metadata\.mechanism === "published_offer"/);
  assert.match(shell, /"donation_upgrade", "dominant_assurance_contract", "threshold_pool"/);
  assert.doesNotMatch(shell, /Saved\. The feed will learn from this/);
  assert.doesNotMatch(diagnostics, /composite estimate/i);
  assert.doesNotMatch(create, /matchPercent:/);
  assert.doesNotMatch(hybrid, /likelihood that the requested action is workable for you/);
  assert.match(hybrid, /Counterparty acceptance and completion remain unverified/);
  assert.match(additional, /loadAdditionalPreferenceState/);
  assert.match(additional, /explicit_exclusions:/);
});
