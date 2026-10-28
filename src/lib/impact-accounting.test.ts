import assert from "node:assert/strict";
import test from "node:test";

import {
  IMPACT_ACCOUNTING_SCHEMA_VERSION,
  IMPACT_INTERVAL_LEVEL_BPS,
  buildCoFundImpactComponents,
  computeExactShapleyValues,
  createAvailableImpactComponent,
  createWithheldImpactComponent,
  summarizeAdditiveCausedImpact,
  validateImpactAccountingSnapshot,
} from "./impact-accounting";

const model = {
  modelKey: "trade-causal-v2",
  modelVersion: 2,
  methodologyHash: `sha256:${"a".repeat(64)}`,
  approvedAt: "2026-08-10T00:00:00.000Z",
};

test("available estimates require a point inside the approved 80% interval", () => {
  const component = createAvailableImpactComponent({
    key: "expected",
    kind: "expected_additional",
    label: "Expected assessed additionality",
    quantity: { kind: "money", value: 8400, currency: "USD" },
    lower: 2100,
    upper: 14_700,
    confidence: "moderate",
    source: "approved_model",
    model,
    explanation: "Probability-weighted output from the approved causal model.",
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

test("verified outcome evidence cannot be relabeled additive caused impact", () => {
  const outcome = createAvailableImpactComponent({
    key: "outcome",
    kind: "verified_outcome",
    label: "Reviewed outcome",
    quantity: { kind: "money", value: 500, currency: "USD" },
    confidence: "high",
    source: "verified_evidence",
    explanation: "A provider event verifies that the payment reached the destination.",
    evidenceRefs: ["provider:event:1"],
  });
  assert.equal(outcome.additiveToCausedTotal, false);

  assert.throws(
    () =>
      createAvailableImpactComponent({
        key: "invalid-outcome",
        kind: "verified_outcome",
        label: "Invalid caused outcome",
        quantity: { kind: "money", value: 500, currency: "USD" },
        confidence: "high",
        source: "verified_evidence",
        explanation: "Occurrence is not counterfactual additionality.",
        additiveToCausedTotal: true,
        resourceClaimRefs: ["payment:1"],
      }),
    /occurrence, not additive caused impact/,
  );
});

test("caused totals require unique resource claims and reject overlap", () => {
  const first = createAvailableImpactComponent({
    key: "direct-a",
    kind: "direct_causal_attribution",
    label: "Direct marginal effect A",
    quantity: { kind: "money", value: 1200, currency: "USD" },
    lower: 600,
    upper: 1800,
    confidence: "moderate",
    source: "approved_model",
    model,
    explanation: "A validated causal estimate with a unique resource claim.",
    additiveToCausedTotal: true,
    resourceClaimRefs: ["funding:pool-1:pledge-b"],
  });
  const second = createAvailableImpactComponent({
    key: "direct-b",
    kind: "direct_causal_attribution",
    label: "Direct marginal effect B",
    quantity: { kind: "money", value: 800, currency: "USD" },
    lower: 200,
    upper: 1300,
    confidence: "low",
    source: "approved_model",
    model,
    explanation: "A second validated causal estimate.",
    additiveToCausedTotal: true,
    resourceClaimRefs: ["funding:pool-2:pledge-c"],
  });

  assert.deepEqual(summarizeAdditiveCausedImpact([first, second]), [
    { kind: "money", value: 2000, currency: "USD" },
  ]);

  const overlapping = { ...second, resourceClaimRefs: ["funding:pool-1:pledge-b"] };
  assert.throws(
    () => summarizeAdditiveCausedImpact([first, overlapping]),
    /Overlapping additive resource claim/,
  );

  assert.throws(
    () =>
      createAvailableImpactComponent({
        key: "missing-claim",
        kind: "direct_causal_attribution",
        label: "Missing resource claim",
        quantity: { kind: "money", value: 10, currency: "USD" },
        confidence: "low",
        source: "approved_model",
        model,
        explanation: "This must fail closed.",
        additiveToCausedTotal: true,
      }),
    /unique resource claim references/,
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
        resourceClaimRefs: ["coalition:1"],
      }),
    /Only modeled causal quantities|must never be added/,
  );

  const components = buildCoFundImpactComponents({
    directCausalAttribution: {
      key: "direct",
      kind: "direct_causal_attribution",
      label: "Direct marginal effect",
      quantity: { kind: "money", value: 1200, currency: "USD" },
      lower: 600,
      upper: 1800,
      confidence: "moderate",
      source: "approved_model",
      model,
      explanation: "Incremental funding from the approved causal design.",
      additiveToCausedTotal: true,
      resourceClaimRefs: ["project:1:other-funding"],
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
    label: "Expected assessed additionality",
    explanation: "No validated causal design is active.",
    blockers: ["causal_identification_not_validated"],
  });
  assert.equal(component.status, "withheld");
  assert.equal(component.confidence, "unavailable");
  assert.equal(component.quantity, null);
  assert.deepEqual(component.resourceClaimRefs, []);
});

test("blocked health may render deterministic and verified records while modeled components stay withheld", () => {
  const snapshot = {
    schemaVersion: IMPACT_ACCOUNTING_SCHEMA_VERSION,
    subjectRef: "agreement:blocked",
    mechanismFamily: "trade" as const,
    inputStateHash: `sha256:${"b".repeat(64)}`,
    stateAsOf: "2026-08-10T00:00:00.000Z",
    expiresAt: "2026-08-10T01:00:00.000Z",
    health: {
      status: "blocked" as const,
      checkedAt: "2026-08-10T00:00:00.000Z",
      expiresAt: "2026-08-10T01:00:00.000Z",
      blockers: ["causal_identification_not_validated"],
    },
    components: [
      createAvailableImpactComponent({
        key: "terms",
        kind: "success_case_additional",
        label: "Conditional other-party commitment",
        quantity: { kind: "count" as const, value: 1, unit: "commitment" },
        confidence: "high" as const,
        source: "deterministic_terms" as const,
        explanation: "The frozen terms deterministically specify one commitment.",
      }),
      createAvailableImpactComponent({
        key: "outcome",
        kind: "verified_outcome",
        label: "Reviewed completed action",
        quantity: { kind: "count" as const, value: 1, unit: "completed action" },
        confidence: "high" as const,
        source: "verified_evidence" as const,
        explanation: "Reviewed evidence shows that one action occurred.",
      }),
      createWithheldImpactComponent({
        key: "causal",
        kind: "expected_additional",
        label: "Expected assessed additionality",
        explanation: "The causal design is not validated.",
        blockers: ["causal_identification_not_validated"],
        model,
      }),
    ],
    explanation: "Deterministic and outcome records remain visible while causal estimates fail closed.",
    blockers: ["causal_identification_not_validated"],
  };

  assert.equal(
    validateImpactAccountingSnapshot(
      snapshot,
      new Date("2026-08-10T02:00:00.000Z"),
    ).subjectRef,
    "agreement:blocked",
  );

  const invalid = {
    ...snapshot,
    components: [
      createAvailableImpactComponent({
        key: "modeled",
        kind: "expected_additional",
        label: "Improper modeled estimate",
        quantity: { kind: "count" as const, value: 0.5, unit: "completed action" },
        lower: 0.1,
        upper: 0.9,
        confidence: "low" as const,
        source: "approved_model" as const,
        model,
        explanation: "This must not render under blocked health.",
      }),
    ],
  };

  assert.throws(
    () =>
      validateImpactAccountingSnapshot(
        invalid,
        new Date("2026-08-10T00:30:00.000Z"),
      ),
    /must be withheld/,
  );
});

test("passing fresh snapshots may render modeled components", () => {
  const snapshot = {
    schemaVersion: IMPACT_ACCOUNTING_SCHEMA_VERSION,
    subjectRef: "agreement:passing",
    mechanismFamily: "trade" as const,
    inputStateHash: `sha256:${"c".repeat(64)}`,
    stateAsOf: "2026-08-10T00:00:00.000Z",
    expiresAt: "2026-08-10T02:00:00.000Z",
    health: {
      status: "passed" as const,
      checkedAt: "2026-08-10T00:00:00.000Z",
      expiresAt: "2026-08-10T02:00:00.000Z",
      blockers: [],
    },
    components: [
      createAvailableImpactComponent({
        key: "expected",
        kind: "expected_additional",
        label: "Expected assessed additionality",
        quantity: { kind: "count" as const, value: 0.5, unit: "completed action" },
        lower: 0.1,
        upper: 0.9,
        confidence: "low" as const,
        source: "approved_model" as const,
        model,
        explanation: "A validated causal estimate.",
        additiveToCausedTotal: true,
        resourceClaimRefs: ["agreement:passing:counterparty-action"],
      }),
    ],
    explanation: "Passing model output.",
    blockers: [],
  };

  assert.equal(
    validateImpactAccountingSnapshot(
      snapshot,
      new Date("2026-08-10T01:00:00.000Z"),
    ).subjectRef,
    "agreement:passing",
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
    () =>
      computeExactShapleyValues({
        players: ["a", "b"],
        coalitionValues: values,
        maximumExactPlayers: 1,
      }),
    /approved exact Shapley player limit/,
  );
});
