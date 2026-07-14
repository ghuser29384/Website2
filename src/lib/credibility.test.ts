import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CREDIBILITY_MODEL,
  betaQuantile,
  calculateCredibility,
  estimateDealCredibility,
  inferDealRiskFromOffer,
  regularizedIncompleteBeta,
  type CredibilityAggregateRow,
} from "./credibility";

function aggregate(
  overrides: Partial<CredibilityAggregateRow> = {},
): CredibilityAggregateRow {
  return {
    profileId: "11111111-1111-4111-8111-111111111111",
    role: "committer",
    category: "behavioral_pledge",
    dimension: "fulfilment",
    weightedSuccess: 0,
    weightedFailure: 0,
    effectiveObservations: 0,
    eventCount: 0,
    independentCounterparties: 0,
    lastEventAt: null,
    asOfAt: "2026-07-14T00:00:00.000Z",
    modelVersion: DEFAULT_CREDIBILITY_MODEL.version,
    ...overrides,
  };
}

test("beta helpers reproduce symmetric reference values", () => {
  assert.ok(Math.abs(regularizedIncompleteBeta(0.5, 2, 2) - 0.5) < 1e-10);
  assert.ok(Math.abs(betaQuantile(0.5, 1, 1) - 0.5) < 1e-10);
});

test("sparse evidence is labelled Unproven without publishing a numerical score", () => {
  const summary = calculateCredibility([], DEFAULT_CREDIBILITY_MODEL, "eligible");

  assert.equal(summary.level, "Unproven");
  assert.equal(summary.score, null);
  assert.equal(summary.estimatedProbability, null);
  assert.match(summary.explanation, /fewer than 3 effective/i);
});

test("verified repeated performance produces a conservative established record", () => {
  const summary = calculateCredibility(
    [
      aggregate({
        weightedSuccess: 12,
        effectiveObservations: 12,
        eventCount: 12,
        independentCounterparties: 8,
        lastEventAt: "2026-07-10T00:00:00.000Z",
      }),
    ],
    DEFAULT_CREDIBILITY_MODEL,
    "eligible",
    {},
    new Date("2026-07-14T00:00:00.000Z"),
  );

  assert.equal(summary.level, "Established");
  assert.ok((summary.score ?? 0) >= 70);
  assert.ok((summary.estimatedProbability ?? 0) > (summary.conservativeProbability ?? 0));
  assert.equal(summary.independentCounterpartiesAtLeast, 8);
});

test("context-specific evidence discounts unrelated failures rather than collapsing all roles", () => {
  const rows = [
    aggregate({
      weightedSuccess: 8,
      effectiveObservations: 8,
      eventCount: 8,
    }),
    aggregate({
      role: "funder",
      category: "donation",
      dimension: "settlement",
      weightedFailure: 8,
      effectiveObservations: 8,
      eventCount: 8,
    }),
  ];
  const general = calculateCredibility(
    rows,
    DEFAULT_CREDIBILITY_MODEL,
    "eligible",
    {},
    new Date("2026-07-14T00:00:00.000Z"),
  );
  const contextual = calculateCredibility(
    rows,
    DEFAULT_CREDIBILITY_MODEL,
    "eligible",
    { role: "committer", category: "behavioral_pledge" },
    new Date("2026-07-14T00:00:00.000Z"),
  );

  assert.ok(
    (contextual.conservativeProbability ?? 0) > (general.conservativeProbability ?? 0),
  );
});

test("a safety restriction is non-compensatory", () => {
  const summary = calculateCredibility(
    [aggregate({ weightedSuccess: 100, effectiveObservations: 100, eventCount: 100 })],
    DEFAULT_CREDIBILITY_MODEL,
    "restricted",
    {},
    new Date("2026-07-14T00:00:00.000Z"),
  );

  assert.equal(summary.level, "Safety-restricted");
  assert.equal(summary.score, null);
  assert.equal(summary.estimatedProbability, null);
});

test("offer inference keeps additionality separate and raises safeguards for weak evidence", () => {
  const risk = inferDealRiskFromOffer({
    mode: "pledge",
    offer_impact: 9,
    min_counterparty_impact: 8,
    duration: "12 months",
    verification: "Self-reported statement",
    trust_level: 8,
  });
  const credibility = calculateCredibility([], DEFAULT_CREDIBILITY_MODEL, "eligible", risk);
  const estimate = estimateDealCredibility(credibility, risk);

  assert.equal(risk.category, "behavioral_pledge");
  assert.equal(estimate.estimatedProbability, null);
  assert.ok(estimate.assuranceLevel === "staged" || estimate.assuranceLevel === "manual_review");
  assert.ok(estimate.safeguards.some((item) => /independent|platform-verifiable/i.test(item)));
});
