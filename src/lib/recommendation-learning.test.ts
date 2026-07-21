import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBrowsingCauseWeights,
  buildLearnedActionPreferences,
  buildOpportunityFeedbackState,
  getActionDescriptor,
  type RecommendationInteractionSignal,
} from "./recommendation-learning";

function signal(
  eventType: RecommendationInteractionSignal["eventType"],
  overrides: Partial<RecommendationInteractionSignal> = {},
): RecommendationInteractionSignal {
  return {
    opportunityType: "offer",
    opportunityId: "offer-1",
    eventType,
    benefitCauses: ["Existential risk"],
    actionCauses: ["Animal welfare"],
    actionKey: "diet:reduce-meat",
    actionLabel: "Reduce or avoid meat",
    inferredDifficulty: 3.35,
    dwellMs: 0,
    occurredAt: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

test("action taxonomy distinguishes meat, plastic, and donation actions", () => {
  assert.equal(
    getActionDescriptor({ actionText: "Do not eat meat for a month", actionCause: "Animal welfare" }).key,
    "diet:reduce-meat",
  );
  assert.equal(
    getActionDescriptor({ actionText: "Avoid buying plastic bags", actionCause: "Climate" }).key,
    "consumption:avoid-single-use-plastic",
  );
  assert.equal(
    getActionDescriptor({
      actionText: "Redirect a planned donation",
      actionCause: "Animal welfare",
      opportunityType: "donation_redirect",
    }).key,
    "donation:redirect",
  );
});

test("explicit difficulty feedback updates an action model without erasing willingness", () => {
  const preferences = buildLearnedActionPreferences(
    [signal("save"), signal("hard"), signal("dwell", { dwellMs: 120_000 })],
    new Date("2026-07-21T12:00:00.000Z"),
  );
  const preference = preferences.get("diet:reduce-meat");

  assert.ok(preference);
  assert.ok(preference.difficulty > 3.8);
  assert.ok(preference.willingness > 50);
  assert.equal(preference.observationCount, 3);
});

test("browsing contributes bounded, lower-confidence cause weights", () => {
  const weights = buildBrowsingCauseWeights(
    [
      signal("open"),
      signal("dwell", { dwellMs: 90_000 }),
      signal("cause_view", {
        opportunityType: "cause_topic",
        opportunityId: "animal-welfare",
        benefitCauses: ["Animal welfare"],
        actionCauses: [],
        actionKey: "",
        actionLabel: "",
        inferredDifficulty: null,
      }),
    ],
    new Date("2026-07-21T12:00:00.000Z"),
  );

  const existentialRisk = weights.find((item) => item.cause === "Existential risk");
  const animalWelfare = weights.find((item) => item.cause === "Animal welfare");
  assert.ok(existentialRisk && existentialRisk.weight <= 38);
  assert.ok(animalWelfare && animalWelfare.weight <= 38);
});

test("the latest save or hide state controls feed persistence", () => {
  const state = buildOpportunityFeedbackState([
    signal("save", { occurredAt: "2026-07-20T10:00:00.000Z" }),
    signal("unsave", { occurredAt: "2026-07-20T11:00:00.000Z" }),
    signal("hide", { opportunityId: "offer-2", occurredAt: "2026-07-20T12:00:00.000Z" }),
  ]);

  assert.equal(state.savedOpportunityKeys.has("offer:offer-1"), false);
  assert.equal(state.hiddenOpportunityKeys.has("offer:offer-2"), true);
});
