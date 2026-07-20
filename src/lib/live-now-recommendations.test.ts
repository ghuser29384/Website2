import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveNowRecentChanges,
  rankLiveNowOffers,
  uniqueProfileCauses,
  type LiveNowOfferCandidate,
} from "./live-now-recommendations";

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
  assert.equal(animalResults[0]?.reason, "Matches your Animal welfare priority");
  assert.equal(aiResults[0]?.reason, "Matches your AI safety priority");
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
  assert.deepEqual(
    rankLiveNowOffers(
      [payment, pledge],
      { causes: ["Animal welfare"], openToPayment: false, openToPledges: true },
      now,
    ).map((candidate) => candidate.id),
    ["pledge"],
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
      label: "Animal welfare · 2 proposals new or updated",
    },
  ]);
});
