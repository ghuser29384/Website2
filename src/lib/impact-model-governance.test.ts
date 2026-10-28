import assert from "node:assert/strict";
import test from "node:test";

import {
  createImpactMethodologyDraft,
  evaluateImpactMethodologyForApproval,
  isMaterialImpactMethodologyChange,
  type ImpactModelMethodology,
} from "./impact-model-governance";

function structurallyCompleteTradeMethodology(): ImpactModelMethodology {
  return {
    ...createImpactMethodologyDraft("trade"),
    modelKey: "commitments-reciprocal-trade-v2",
    displayName: "Trade outcome and causal-additionality methodology",
    estimands: [
      "success_case_additional",
      "expected_additional",
      "direct_causal_attribution",
      "verified_outcome",
    ],
    estimandDefinitions: {
      success_case_additional:
        "Counterparty action above the frozen no-agreement baseline if all terms succeed.",
      expected_additional:
        "The agreement-versus-no-agreement probability change multiplied by the counterparty quantity.",
      direct_causal_attribution:
        "The participant-specific marginal effect under the validated bilateral design.",
      verified_outcome:
        "The counterparty action shown by reviewed evidence to have occurred, without a counterfactual claim.",
    },
    baselineDefinition:
      "Freeze both pre-offer no-agreement plans, quantities, timing, evidence, and overlap state.",
    causalIdentificationPolicy: {
      estimand:
        "Difference in the counterparty outcome distribution under agreement versus no agreement.",
      designStatus: "specified_not_validated",
      admissibleDesigns: [
        "randomized invitation or encouragement",
        "pre-specified defensible quasi-experimental design",
      ],
      interferencePolicy:
        "Cluster repeated counterparties and represent spillovers to other agreements.",
      overlapAndPositivityPolicy:
        "Withhold where both treatment states lack empirical support.",
      sensitivityAnalysisPolicy:
        "Report pre-specified confounding and baseline-misclassification bounds.",
      noDefensibleDesignAction: "withhold_causal_components",
    },
    evidenceSemanticsPolicy: {
      outcomeEvidenceLabel: "verified_outcome",
      additionalityLabel: "assessed_additionality",
      receiptAloneEstablishesAdditionality: false,
      publicCopyRule:
        "Describe evidence as reviewed outcome evidence, never verified impact.",
    },
    strategicBehaviorPolicy: {
      baselineAntecedenceRule:
        "Material baseline evidence must predate participant-facing exposure.",
      strategicTimingRule:
        "Detect offer timing, baseline edits, and endogenous selection.",
      interferenceRule:
        "Model bilateral dependence and repeated counterparties.",
      perverseIncentiveRule:
        "Reject incentives to create a worse or harmful baseline.",
      manipulationChecks: [
        "baseline timestamp check",
        "repeated-pair dependence check",
      ],
    },
    algorithmDescription:
      "Predict completion separately from causal identification and withhold causal output without a validated design.",
    referenceClassPolicy: {
      strategy: "hierarchical",
      narrowFields: [
        "mechanism",
        "action type",
        "duration",
        "baseline evidence",
      ],
      broadeningOrder: ["duration", "cause", "mechanism family"],
      minimumSampleSize: 40,
      noDefensibleClassAction: "withhold",
      uncertaintyExpansionRule:
        "Use reference classes only for prediction and widen the interval at every broadening step.",
    },
    uncertaintyPolicy: {
      intervalLevelBps: 8_000,
      method:
        "Propagate predictive, baseline, and causal-design uncertainty.",
      confidencePolicy:
        "High confidence remains disabled until independent validation.",
      drivers: [
        "causal-design validity",
        "reference specificity",
        "sample size",
      ],
    },
    validationPolicy: {
      thresholdStatus: "provisional",
      highConfidenceAllowed: false,
      requiredBeforeHighConfidence: [
        "independent holdout evaluation",
        "uncertainty intervals for calibration metrics",
      ],
    },
    freshnessPolicy: {
      maxAgeSeconds: 3600,
      requireStateHash: true,
      requiredStateFields: [
        "agreement terms",
        "baseline",
        "evidence state",
      ],
      invalidateOnLifecycleStates: ["cancelled", "expired", "disputed"],
    },
    healthPolicy: {
      requiredCalibrationMetrics: [
        "out-of-sample interval coverage",
        "calibration slope with uncertainty",
      ],
      blockedConditions: [
        "causal design not validated",
        "source data incomplete",
      ],
      warningConditions: [
        "reference class broadened",
        "provisional thresholds",
      ],
    },
    sourceDataRequirements: [
      "accepted terms",
      "frozen baseline",
      "reviewed outcome record",
    ],
    conceptualBasisRefs: [
      "source:toby-ord-moral-trade-2015",
      "source:forethought-convergence-and-compromise-2025",
    ],
    calibrationEvidenceRefs: [],
    knownFailureModes: [
      "self-reported baseline error",
      "receipt mistaken for causation",
    ],
    outOfDomainConditions: [
      "novel action without a defensible causal design",
    ],
    materialChangeTriggers: [
      "estimand change",
      "causal-design change",
      "evidence semantics change",
    ],
    aggregationPolicy: {
      directAndCooperativeNeverSummed: true,
      heterogeneousNativeUnitsRemainSeparate: true,
      directMarginalEffectsDefaultNonAdditive: true,
      additiveClaimRequirement:
        "Every additive causal quantity requires stable unique resource claim references.",
      overlapHandling:
        "Reject overlapping additive claims and keep verified outcomes outside caused totals.",
    },
    shapleyPolicy: {
      enabled: false,
      characteristicFunctionDefinition:
        "Not used for this methodology.",
      maximumExactPlayers: null,
      approximationMethod: null,
    },
    parameters: { minimumSampleStatus: "provisional" },
  };
}

test("draft templates are deliberately impossible to approve", () => {
  const evaluation = evaluateImpactMethodologyForApproval(
    createImpactMethodologyDraft("co_fund"),
  );
  assert.equal(evaluation.approvable, false);
  assert.ok(evaluation.blockers.includes("baseline_definition_required"));
  assert.ok(evaluation.blockers.includes("admissible_causal_designs_required"));
  assert.ok(evaluation.blockers.includes("shapley_execution_policy_required"));
});

test("a complete methodology passes structural gates without approving or activating a model", () => {
  const evaluation = evaluateImpactMethodologyForApproval(
    structurallyCompleteTradeMethodology(),
  );
  assert.deepEqual(evaluation, { approvable: true, blockers: [] });
});

test("conceptual sources cannot be mislabeled as empirical calibration evidence", () => {
  const methodology = structurallyCompleteTradeMethodology();
  const evaluation = evaluateImpactMethodologyForApproval({
    ...methodology,
    calibrationEvidenceRefs: [
      "source:toby-ord-moral-trade-2015",
      "github-actions:ghuser29384/Website2:31348990179",
    ],
  });
  assert.ok(
    evaluation.blockers.includes("calibration_evidence_misclassified"),
  );
});

test("provisional validation thresholds cannot authorize high confidence", () => {
  const methodology = structurallyCompleteTradeMethodology();
  const evaluation = evaluateImpactMethodologyForApproval({
    ...methodology,
    validationPolicy: {
      ...methodology.validationPolicy,
      highConfidenceAllowed: true,
    },
  });
  assert.ok(
    evaluation.blockers.includes(
      "provisional_thresholds_cannot_allow_high_confidence",
    ),
  );
});

test("material changes include causal identification, evidence semantics, validation, and calibration provenance", () => {
  const current = structurallyCompleteTradeMethodology();

  assert.equal(
    isMaterialImpactMethodologyChange({
      current,
      proposed: {
        ...current,
        causalIdentificationPolicy: {
          ...current.causalIdentificationPolicy,
          designStatus: "validated",
        },
      },
    }),
    true,
  );
  assert.equal(
    isMaterialImpactMethodologyChange({
      current,
      proposed: {
        ...current,
        calibrationEvidenceRefs: ["registry:trade:holdout:v1"],
      },
    }),
    true,
  );
  assert.equal(
    isMaterialImpactMethodologyChange({
      current,
      proposed: {
        ...current,
        displayName: "A presentation-only rename",
      },
    }),
    false,
  );
});
