import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEvidenceWeightedPayout,
  EVIDENCE_APPEAL_WINDOW_DAYS,
  EVIDENCE_CONFIDENCE_BANDS,
  EVIDENCE_MAX_APPEALS,
  EVIDENCE_MAX_REPLACEMENTS,
  EVIDENCE_PAYOUT_RULE,
  EVIDENCE_REPLACEMENT_WINDOW_DAYS,
  formatBasisPointsAsPercent,
  formatPrivateAmount,
} from "./evidence-weighted-payout";

test("uses only the five approved confidence bands", () => {
  assert.deepEqual(EVIDENCE_CONFIDENCE_BANDS, [0, 25, 50, 75, 100]);

  assert.throws(
    () =>
      calculateEvidenceWeightedPayout({
        maximumPayoutCents: 500,
        measurementKind: "units",
        completedUnits: 1,
        targetUnits: 1,
        confidenceBand: 60 as 50,
      }),
    /approved fixed band/,
  );
});

test("moderate evidence pays half of the maximum for full completion", () => {
  assert.deepEqual(
    calculateEvidenceWeightedPayout({
      maximumPayoutCents: 500,
      measurementKind: "indivisible",
      completedUnits: 1,
      targetUnits: 1,
      confidenceBand: 50,
    }),
    {
      amountDueCents: 250,
      completionFractionBps: 10_000,
      payoutPercentageBps: 5_000,
    },
  );
});

test("combines pre-agreed completion units with evidence confidence", () => {
  assert.deepEqual(
    calculateEvidenceWeightedPayout({
      maximumPayoutCents: 2_000,
      measurementKind: "units",
      completedUnits: 3,
      targetUnits: 4,
      confidenceBand: 75,
    }),
    {
      amountDueCents: 1_125,
      completionFractionBps: 7_500,
      payoutPercentageBps: 5_625,
    },
  );
});

test("rounds down to the nearest cent and never overpays", () => {
  assert.equal(
    calculateEvidenceWeightedPayout({
      maximumPayoutCents: 101,
      measurementKind: "units",
      completedUnits: 1,
      targetUnits: 3,
      confidenceBand: 50,
    }).amountDueCents,
    16,
  );
  assert.match(EVIDENCE_PAYOUT_RULE, /round down/i);
});

test("rejects partial completion for indivisible milestones", () => {
  assert.throws(
    () =>
      calculateEvidenceWeightedPayout({
        maximumPayoutCents: 500,
        measurementKind: "indivisible",
        completedUnits: 1,
        targetUnits: 2,
        confidenceBand: 100,
      }),
    /only be incomplete or complete/,
  );
});

test("caps completion at the pre-agreed target", () => {
  assert.throws(
    () =>
      calculateEvidenceWeightedPayout({
        maximumPayoutCents: 500,
        measurementKind: "units",
        completedUnits: 6,
        targetUnits: 5,
        confidenceBand: 100,
      }),
    /cannot exceed/,
  );
});

test("locks the approved replacement and appeal limits", () => {
  assert.equal(EVIDENCE_REPLACEMENT_WINDOW_DAYS, 7);
  assert.equal(EVIDENCE_APPEAL_WINDOW_DAYS, 7);
  assert.equal(EVIDENCE_MAX_REPLACEMENTS, 1);
  assert.equal(EVIDENCE_MAX_APPEALS, 1);
});

test("formats participant-private amounts and public-safe percentages", () => {
  assert.equal(formatPrivateAmount(250, "usd"), "$2.50");
  assert.equal(formatBasisPointsAsPercent(5_625), "56.25%");
  assert.equal(formatBasisPointsAsPercent(10_000), "100%");
});
