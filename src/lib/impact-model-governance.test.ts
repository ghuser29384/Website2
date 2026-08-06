import assert from "node:assert/strict";
import test from "node:test";

import {
  createImpactMethodologyDraft,
  evaluateImpactMethodologyForApproval,
  isMaterialImpactMethodologyChange,
  type ImpactModelMethodology,
} from "./impact-model-governance";

function approvedTradeMethodology(): ImpactModelMethodology {
  return {
    ...createImpactMethodologyDraft("trade"),
    displayName: "Trade incremental-action model",
    estimands: ["success_case_additional", "expected_additional", "direct_causal_attribution"],
    estimandDefinitions: {
      success_case_additional: "Counterparty action above the frozen no-agreement baseline if all terms succeed.",
      expected_additional: "Probability-weighted counterparty action above the no-agreement baseline.",
      direct_causal_attribution: "Counterparty action estimated not to occur without this participant.",
    },
    baselineDefinition: "The frozen participant-specific no-agreement record; otherwise an approved hierarchical reference class.",
    algorithmDescription: "Use the participant baseline when present; otherwise estimate from the approved hierarchical comparison model.",
    referenceClassPolicy: {
      strategy: "hierarchical",
      narrowFields: ["mechanism", "action_type", "duration", "jurisdiction"],
      broadeningOrder: ["jurisdiction", "duration", "cause"],
      minimumSampleSize: 40,
      noDefensibleClassAction: "withhold",
      uncertaintyExpansionRule: "Increase the interval scale after each approved broadening step.",
    },
    uncertaintyPolicy: {
      intervalLevelBps: 8_000,
      method: "Approved bootstrap predictive interval.",
      confidencePolicy: "Confidence combines reference specificity, calibration, completeness, and domain fit.",
      drivers: ["reference specificity", "sample size", "outcome missingness"],
    },
    freshnessPolicy: {
      maxAgeSeconds: 3600,
      requireStateHash: true,
      requiredStateFields: ["agreement_terms", "baseline", "evidence_state"],
      invalidateOnLifecycleStates: ["cancelled", "expired", "disputed"],
    },
    healthPolicy: {
      requiredCalibrationMetrics: ["coverage_80", "absolute_error"],
      blockedConditions: ["coverage below approved floor", "source data incomplete"],
      warningConditions: ["reference class broadened", "drift above warning floor"],
    },
    sourceDataRequirements: ["accepted terms", "frozen baseline", "outcome record"],
    calibrationEvidenceRefs: ["evidence://trade-pilot-1"],
    knownFailureModes: ["self-reported baseline error"],
    outOfDomainConditions: ["novel action type without comparable records"],
    materialChangeTriggers: ["estimand change", "baseline change", "feature or interval method change"],
    aggregationPolicy: {
      directAndCooperativeNeverSummed: true,
      heterogeneousNativeUnitsRemainSeparate: true,
      overlapHandling: "Do not aggregate dependent estimates without an approved overlap model.",
    },
    shapleyPolicy: {
      enabled: false,
      characteristicFunctionDefinition: "Not used for this methodology.",
      maximumExactPlayers: null,
      approximationMethod: null,
    },
    parameters: { example: "reviewed separately" },
  };
}

test("draft templates are deliberately impossible to approve", () => {
  const evaluation = evaluateImpactMethodologyForApproval(
    createImpactMethodologyDraft("co_fund"),
  );
  assert.equal(evaluation.approvable, false);
  assert.ok(evaluation.blockers.includes("baseline_definition_required"));
  assert.ok(evaluation.blockers.includes("shapley_execution_policy_required"));
});

test("a complete methodology passes structural approval gates without silently approving it", () => {
  const evaluation = evaluateImpactMethodologyForApproval(approvedTradeMethodology());
  assert.deepEqual(evaluation, { approvable: true, blockers: [] });
});

test("material changes include baseline, algorithm, uncertainty, and parameters", () => {
  const current = approvedTradeMethodology();
  const proposed = { ...current, baselineDefinition: "A changed baseline." };
  assert.equal(isMaterialImpactMethodologyChange({ current, proposed }), true);
  assert.equal(
    isMaterialImpactMethodologyChange({
      current,
      proposed: { ...current, displayName: "A presentation-only rename" },
    }),
    false,
  );
});
