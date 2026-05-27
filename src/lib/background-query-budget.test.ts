import test from "node:test";
import assert from "node:assert/strict";

import {
  countRegistrySearchSpecificity,
  decideBackgroundQueryBudget,
  getBackgroundQueryFingerprint,
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
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 4, specificity }), false);
  assert.equal(shouldApplySparseResultPrivacyFloor({ resultCount: 1, specificity: 1 }), false);
});
