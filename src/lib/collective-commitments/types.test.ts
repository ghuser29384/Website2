import assert from "node:assert/strict";
import test from "node:test";

import {
  COLLECTIVE_PROPOSITION_TYPE_META,
  COLLECTIVE_PROPOSITION_TYPES,
  canonicalizeFrozenTerms,
  getCollectiveRiskProfile,
  normalizeRiskDimensions,
} from "./types";

test("the five source proposition classes are enabled as high-risk classes", () => {
  const sourceClasses = [
    "public_letter",
    "workplace_organizing",
    "whistleblowing",
    "political_dissent",
    "funding_pledge",
  ] as const;

  assert.deepEqual(COLLECTIVE_PROPOSITION_TYPES.slice(0, 5), sourceClasses);
  for (const propositionType of sourceClasses) {
    const risk = getCollectiveRiskProfile(propositionType, []);
    assert.equal(risk.riskClass, "high");
    assert.ok(risk.riskDimensions.length > 0);
    assert.equal(COLLECTIVE_PROPOSITION_TYPE_META[propositionType].highRisk, true);
  }
});

test("other collective action becomes high risk when any risk dimension is selected", () => {
  assert.deepEqual(getCollectiveRiskProfile("other_collective_action", []), {
    riskClass: "standard",
    riskDimensions: [],
  });
  assert.deepEqual(
    getCollectiveRiskProfile("other_collective_action", ["legal", "employment", "legal"]),
    {
      riskClass: "high",
      riskDimensions: ["employment", "legal"],
    },
  );
});

test("risk dimensions are deduplicated, filtered, and canonicalized", () => {
  assert.deepEqual(
    normalizeRiskDimensions(["political", "not-a-risk", "financial", "political"]),
    ["financial", "political"],
  );
});

test("frozen terms have deterministic canonicalization", () => {
  const first = canonicalizeFrozenTerms({
    title: "  Exact proposition  ",
    propositionType: "public_letter",
    propositionText: "  We sign this statement.  ",
    requirementsText: "  Verified participants. ",
    eligibilityRule: "  Operator review. ",
    thresholdCount: 4,
    deadlineAt: "2026-08-01T12:00:00-04:00",
    riskClass: "high",
    riskDimensions: ["reputational", "political"],
  });
  const second = canonicalizeFrozenTerms({
    title: "Exact proposition",
    propositionType: "public_letter",
    propositionText: "We sign this statement.",
    requirementsText: "Verified participants.",
    eligibilityRule: "Operator review.",
    thresholdCount: 4,
    deadlineAt: "2026-08-01T16:00:00.000Z",
    riskClass: "high",
    riskDimensions: ["political", "reputational"],
  });

  assert.equal(first, second);
  assert.match(first, /"deadlineAt":"2026-08-01T16:00:00.000Z"/);
});
