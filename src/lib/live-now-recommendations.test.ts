import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveNowRecentChanges,
  buildWeightedCauseSignals,
  rankLiveNowOffers,
  uniqueProfileCauses,
  type LiveNowOfferCandidate,
} from "./live-now-recommendations";
import type { LearnedActionPreference } from "./recommendation-learning";

const now = new Date("2026-07-20T12:00:00.000Z");

function offer(
  id: string,
  offeredCause: string,
  requestedCause: string,
  updatedAt = "2026-07-20T08:00:00.000Z",
): LiveNowOfferCandidate {
  return {
    id,
    ownerId: `owner-${id}`,
    ownerAlias: `Participant ${id}`,
    mode: "payment",
    offeredCause,
    requestedCause,
    compromiseCause: "Not needed",
    offerAction: `Deliver work for ${offeredCause}`,
    requestAction: `Support ${requestedCause}`,
    verification: "Public receipt and counterparty confirmation",
    duration: "Complete within 30 days",
    trustLevel: 3,
    createdAt: "2026-07-18T08:00:00.000Z",
    updatedAt,
  };
}

test("profile causes select distinct live offers instead of a universal fixed feed", () => {
  const candidates = [
    offer("animal", "Animal welfare", "Plant-based meal evidence"),
    offer("ai", "AI safety", "Evaluation tooling"),
    offer("health", "Global health", "Malaria prevention"),
  ];

  const animalResults = rankLiveNowOffers(
    candidates,
    { causes: ["Animal welfare"], openToPayment: true, openToPledges: true },
    now,
  );
  const aiResults = rankLiveNowOffers(
    candidates,
    { causes: ["AI safety"], openToPayment: true, openToPledges: true },
    now,
  );

  assert.deepEqual(animalResults.map((candidate) => candidate.id), ["animal"]);
  assert.deepEqual(aiResults.map((candidate) => candidate.id), ["ai"]);
  assert.match(animalResults[0]?.reason ?? "", /Animal welfare priority/);
  assert.match(aiResults[0]?.reason ?? "", /AI safety priority/);
});

test("explicit profile allocations preserve moral priority intensity", () => {
  const causeSignals = buildWeightedCauseSignals({
    priorityAllocations: [
      { label: "AI safety", causeArea: "Existential risk", share: 50, rank: 1 },
      { label: "End factory farming", causeArea: "Animal welfare", share: 30, rank: 2 },
      { label: "Climate & environment", causeArea: "Climate", share: 20, rank: 3 },
    ],
  });

  const existential = causeSignals.find((signal) => signal.cause === "Existential risk");
  const animal = causeSignals.find((signal) => signal.cause === "Animal welfare");
  const climate = causeSignals.find((signal) => signal.cause === "Climate");
  assert.ok(existential && animal && climate);
  assert.ok(existential.weight > animal.weight);
  assert.ok(animal.weight > climate.weight);
});

test("moral co-benefit can outweigh default burden, while learned difficulty can reverse it", () => {
  const candidates = [
    {
      ...offer("meat", "Existential risk", "Animal welfare"),
      requestAction: "Do not eat meat for one month",
    },
    {
      ...offer("plastic", "Existential risk", "Climate"),
      requestAction: "Do not buy single-use plastic bags for one month",
    },
  ];
  const causeSignals = buildWeightedCauseSignals({
    priorityAllocations: [
      { label: "AI safety", causeArea: "Existential risk", share: 50, rank: 1 },
      { label: "End factory farming", causeArea: "Animal welfare", share: 30, rank: 2 },
      { label: "Climate & environment", causeArea: "Climate", share: 20, rank: 3 },
    ],
  });

  const baseline = rankLiveNowOffers(
    candidates,
    {
      causes: causeSignals.map((signal) => signal.cause),
      causeSignals,
      openToPayment: true,
      openToPledges: true,
    },
    now,
  );
  assert.deepEqual(baseline.map((candidate) => candidate.id), ["meat", "plastic"]);

  const hardMeat: LearnedActionPreference = {
    actionKey: "diet:reduce-meat",
    actionLabel: "Reduce or avoid meat",
    difficulty: 5,
    willingness: 20,
    observationCount: 4,
    explicitDifficultyCount: 2,
  };
  const learned = rankLiveNowOffers(
    candidates,
    {
      causes: causeSignals.map((signal) => signal.cause),
      causeSignals,
      openToPayment: true,
      openToPledges: true,
      actionPreferences: new Map([[hardMeat.actionKey, hardMeat]]),
    },
    now,
  );
  assert.deepEqual(learned.map((candidate) => candidate.id), ["plastic", "meat"]);
});

test("profile order breaks otherwise equal matches transparently", () => {
  const candidates = [
    offer("animal", "Animal welfare", "Plant-based meal evidence"),
    offer("ai", "AI safety", "Evaluation tooling"),
  ];

  const results = rankLiveNowOffers(
    candidates,
    { causes: ["AI safety", "Animal welfare"], openToPayment: true, openToPledges: true },
    now,
  );

  assert.deepEqual(results.map((candidate) => candidate.id), ["ai", "animal"]);
});

test("short profile terms match phrase boundaries instead of substrings", () => {
  const results = rankLiveNowOffers(
    [
      offer("fair-trade", "Fair trade", "Worker cooperatives"),
      offer("ai-safety", "AI safety", "Evaluation tooling"),
    ],
    { causes: ["AI"], openToPayment: true, openToPledges: true },
    now,
  );

  assert.deepEqual(results.map((candidate) => candidate.id), ["ai-safety"]);
});

test("missing priorities and incompatible participation settings do not produce filler suggestions", () => {
  const pledge = {
    ...offer("pledge", "Animal welfare", "Meal commitment"),
    mode: "pledge" as const,
  };
  const payment = offer("payment", "Animal welfare", "Research support");

  assert.deepEqual(
    rankLiveNowOffers(
      [pledge],
      { causes: [], openToPayment: null, openToPledges: null },
      now,
    ),
    [],
  );
  assert.deepEqual(
    rankLiveNowOffers(
      [payment, pledge],
      { causes: ["Animal welfare"], openToPayment: true, openToPledges: false },
      now,
    ).map((candidate) => candidate.id),
    ["payment"],
  );
});

test("profile sources are de-duplicated without changing their stated order", () => {
  assert.deepEqual(
    uniqueProfileCauses(
      ["AI safety", "Animal welfare"],
      ["ai safety", "Global health"],
      ["  Animal welfare  "],
    ),
    ["AI safety", "Animal welfare", "Global health"],
  );
});

test("recent-change counts include only matched records changed in the last 24 hours", () => {
  const recommendations = rankLiveNowOffers(
    [
      offer("new-a", "Animal welfare", "Meal evidence"),
      offer("new-b", "Animal welfare", "Farm transition"),
      offer("old", "Animal welfare", "Research", "2026-07-18T08:00:00.000Z"),
    ],
    { causes: ["Animal welfare"], openToPayment: true, openToPledges: true },
    now,
  );

  assert.deepEqual(buildLiveNowRecentChanges(recommendations, now), [
    {
      cause: "Animal welfare",
      count: 2,
      label: "Animal welfare · 2 opportunities new or updated",
    },
  ]);
});
