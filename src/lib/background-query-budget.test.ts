import test from "node:test";
import assert from "node:assert/strict";

import {
  countRegistrySearchSpecificity,
  decideBackgroundQueryBudget,
  getBackgroundQueryFingerprint,
  scoreRegistrySearchAnomaly,
  shouldApplySparseResultPrivacyFloor,
} from "@/lib/background-query-budget";

test("query fingerprints are stable for equivalent objects", () => {
  assert.equal(
    getBackgroundQueryFingerprint({ scope: "registry", q: "animal welfare", cause: "animals" }),
    getBackgroundQueryFingerprint({ cause: "animals", q: "animal welfare", scope: "registry" }),
  );
});

test("budget decisions count only non-limited events", () => {
  const decision = decideBackgroundQueryBudget({
    cost: 3,
    events: [
      { cost: 4, created_at: new Date().toISOString(), was_limited: false },
      { cost: 100, created_at: new Date().toISOString(), was_limited: true },
    ],
    limit: 6,
  });

  assert.equal(decision.used, 4);
  assert.equal(decision.limited, true);
  assert.equal(decision.remaining, 2);
});

test("sparse registry privacy floor only applies to highly specific tiny result sets", () => {
  const specificity = countRegistrySearchSpecificity({
    cause: "animals",
    opennessToPayment: true,
    query: "local pledge exchange",
  });

  assert.ok(specificity >= 3);
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 2, specificity }), true);
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 4, specificity: 3 }), false);
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 4, specificity: 5 }), true);
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 1, specificity: 1 }), false);
});

test("registry anomaly score escalates repeated narrow sparse searches", () => {
  const ordinary = scoreRegistrySearchAnomaly({
    floorApplied: false,
    recentSimilarCount: 0,
    resultCount: 20,
    specificity: 1,
  });
  const suspicious = scoreRegistrySearchAnomaly({
    floorApplied: true,
    recentSimilarCount: 6,
    resultCount: 2,
    specificity: 6,
  });

  assert.equal(ordinary.level, "none");
  assert.equal(suspicious.level, "high");
  assert.ok(suspicious.score > ordinary.score);
});
