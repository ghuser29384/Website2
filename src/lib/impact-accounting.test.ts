import assert from "node:assert/strict";
import test from "node:test";

import {
  IMPACT_ACCOUNTING_SCHEMA_VERSION,
  IMPACT_INTERVAL_LEVEL_BPS,
  buildCoFundImpactComponents,
  computeExactShapleyValues,
  createAvailableImpactComponent,
  createWithheldImpactComponent,
  mergeImpactComponents,
  summarizeAdditiveCausedImpact,
  validateImpactAccountingSnapshot,
} from "./impact-accounting";

const model = {
  modelKey: "trade-first-model",
  modelVersion: 1,
  methodologyHash: `sha256:${"a".repeat(64)}`,
  approvedAt: "2026-08-06T00:00:00.000Z",
};

test("available estimates require a point inside the approved 80% interval", () => {
  const component = createAvailableImpactComponent({
    key: "expected",
    kind: "expected_additional",
    label: "Expected additional effect",
    quantity: { kind: "money", value: 8400, currency: "USD" },
    lower: 2100,
    upper: 14_700,
    confidence: "moderate",
    source: "approved_model",
    model,
    explanation: "Probability-weighted output from the approved model.",
  });

  assert.equal(component.interval?.levelBps, IMPACT_INTERVAL_LEVEL_BPS);
  assert.throws(
    () =>
      createAvailableImpactComponent({
        key: "invalid",
        kind: "expected_additional",
        label: "Invalid",
        quantity: { kind: "money", value: 100, currency: "USD" },
        lower: 101,
        upper: 200,
        confidence: "low",
        source: "approved_model",
        model,
        explanation: "Invalid interval.",
      }),
    /inside its 80% interval/,
  );
});

test("cooperative allocation can never inflate direct caused-resource totals", () => {
  assert.throws(
    () =>
      createAvailableImpactComponent({
        key: "shapley",
        kind: "cooperative_allocation",
        label: "Cooperative allocation",
        quantity: { kind: "money", value: 1000, currency: "USD" },
        confidence: "high",
        source: "approved_model",
        model,
        explanation: "Exact Shapley allocation.",
        additiveToCausedTotal: true,
      }),
    /must never be added/,
  );

  const components = buildCoFundImpactComponents({
    directCausalAttribution: {
      key: "direct",
      kind: "direct_causal_attribution",
      label: "Direct causal attribution",
      quantity: { kind: "money", value: 1200, currency: "USD" },
      lower: 600,
      upper: 1800,
      confidence: "moderate",
      source: "approved_model",
      model,
      explanation: "Incremental funding estimated from the approved model.",
      additiveToCausedTotal: true,
    },
    cooperativeAllocation: {
      key: "shapley",
      kind: "cooperative_allocation",
      label: "Cooperative allocation",
      quantity: { kind: "money", value: 2200, currency: "USD" },
      lower: 2200,
      upper: 2200,
      confidence: "high",
      source: "approved_model",
      model,
      explanation: "Exact cooperative allocation, reported separately.",
    },
  });

  assert.deepEqual(summarizeAdditiveCausedImpact(components), [
    { kind: "money", value: 1200, currency: "USD" },
  ]);
});

test("withheld estimates fail closed with explicit blockers", () => {
  const component = createWithheldImpactComponent({
    key: "expected",
    kind: "expected_additional",
    label: "Expected additional effect",
    explanation: "No approved model is active for this mechanism.",
    blockers: ["model_not_approved"],
  });
  assert.equal(component.status, "withheld");
  assert.equal(component.confidence, "unavailable");
  assert.equal(component.quantity, null);
});

test("modeled components replace deterministic components only by exact key", () => {
  const deterministic = createAvailableImpactComponent({
    key: "verified",
    kind: "verified_additional",
    label: "Verified additional resources",
    quantity: { kind: "money", value: 500, currency: "USD" },
    confidence: "high",
    source: "verified_evidence",
    explanation: "Verified evidence.",
    additiveToCausedTotal: true,
  });
  const modeled = createAvailableImpactComponent({
    key: "expected",
    kind: "expected_additional",
    label: "Expected additional resources",
    quantity: { kind: "money", value: 400, currency: "USD" },
    lower: 100,
    upper: 700,
    confidence: "low",
    source: "approved_model",
    model,
    explanation: "Approved estimate.",
  });

  assert.deepEqual(
    mergeImpactComponents([deterministic], [modeled]).map((entry) => entry.key),
    ["verified", "expected"],
  );
});

test("exact Shapley values require complete coalition values and an approved size limit", () => {
  const values = new Map([
    ["", 0],
    ["a", 2],
    ["b", 2],
    ["a|b", 6],
  ]);
  const result = computeExactShapleyValues({
    players: ["a", "b"],
    coalitionValues: values,
    maximumExactPlayers: 2,
  });
  assert.equal(result.get("a"), 3);
  assert.equal(result.get("b"), 3);
  assert.throws(
    () => computeExactShapleyValues({ players: ["a", "b"], coalitionValues: values, maximumExactPlayers: 1 }),
    /approved exact Shapley player limit/,
  );
});

test("participant snapshots must be passing, fresh, state-bound, and 80% interval compliant", () => {
  const snapshot = {
    schemaVersion: IMPACT_ACCOUNTING_SCHEMA_VERSION,
    subjectRef: "agreement:example",
    mechanismFamily: "trade" as const,
    inputStateHash: `sha256:${"b".repeat(64)}`,
    stateAsOf: "2026-08-06T00:00:00.000Z",
    expiresAt: "2026-08-07T00:00:00.000Z",
    health: {
      status: "passed" as const,
      checkedAt: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-07T00:00:00.000Z",
      blockers: [],
    },
    components: [
      createAvailableImpactComponent({
        key: "expected",
        kind: "expected_additional",
        label: "Expected additional effect",
        quantity: { kind: "count" as const, value: 3.2, unit: "action-months" },
        lower: 0.8,
        upper: 5.7,
        confidence: "moderate" as const,
        source: "reference_class" as const,
        model,
        explanation: "Hierarchical reference-class estimate.",
      }),
    ],
    explanation: "Approved model output.",
    blockers: [],
  };

  assert.equal(
    validateImpactAccountingSnapshot(snapshot, new Date("2026-08-06T12:00:00.000Z")).subjectRef,
    "agreement:example",
  );
  assert.throws(
    () => validateImpactAccountingSnapshot(snapshot, new Date("2026-08-08T00:00:00.000Z")),
    /stale/,
  );
});
