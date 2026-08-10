import {
  IMPACT_ESTIMATE_KINDS,
  IMPACT_INTERVAL_LEVEL_BPS,
  IMPACT_MECHANISM_FAMILIES,
  type ImpactEstimateKind,
  type ImpactMechanismFamily,
} from "./impact-accounting";

export const IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION =
  "moral-trade-impact-model-methodology-v1";

export type ImpactModelLifecycleStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "active"
  | "inactive"
  | "superseded";

export interface ImpactReferenceClassPolicy {
  strategy: "hierarchical";
  narrowFields: string[];
  broadeningOrder: string[];
  minimumSampleSize: number | null;
  noDefensibleClassAction: "withhold";
  uncertaintyExpansionRule: string;
}

export interface ImpactCausalIdentificationPolicy {
  estimand: string;
  designStatus: "specified_not_validated" | "validated";
  admissibleDesigns: string[];
  interferencePolicy: string;
  overlapAndPositivityPolicy: string;
  sensitivityAnalysisPolicy: string;
  noDefensibleDesignAction: "withhold_causal_components";
}

export interface ImpactEvidenceSemanticsPolicy {
  outcomeEvidenceLabel: "verified_outcome";
  additionalityLabel: "assessed_additionality";
  receiptAloneEstablishesAdditionality: false;
  publicCopyRule: string;
}

export interface ImpactStrategicBehaviorPolicy {
  baselineAntecedenceRule: string;
  strategicTimingRule: string;
  interferenceRule: string;
  perverseIncentiveRule: string;
  manipulationChecks: string[];
}

export interface ImpactUncertaintyPolicy {
  intervalLevelBps: typeof IMPACT_INTERVAL_LEVEL_BPS;
  method: string;
  confidencePolicy: string;
  drivers: string[];
}

export interface ImpactValidationPolicy {
  thresholdStatus: "provisional" | "validated";
  highConfidenceAllowed: boolean;
  requiredBeforeHighConfidence: string[];
}

export interface ImpactFreshnessPolicy {
  maxAgeSeconds: number | null;
  requireStateHash: true;
  requiredStateFields: string[];
  invalidateOnLifecycleStates: string[];
}

export interface ImpactHealthPolicy {
  requiredCalibrationMetrics: string[];
  blockedConditions: string[];
  warningConditions: string[];
}

export interface ImpactAggregationPolicy {
  directAndCooperativeNeverSummed: true;
  heterogeneousNativeUnitsRemainSeparate: true;
  directMarginalEffectsDefaultNonAdditive: true;
  additiveClaimRequirement: string;
  overlapHandling: string;
}

export interface ImpactShapleyPolicy {
  enabled: boolean;
  characteristicFunctionDefinition: string;
  maximumExactPlayers: number | null;
  approximationMethod: string | null;
}

export interface ImpactModelMethodology {
  schemaVersion: typeof IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION;
  mechanismFamily: ImpactMechanismFamily;
  modelKey: string;
  displayName: string;
  estimands: ImpactEstimateKind[];
  estimandDefinitions: Record<string, string>;
  baselineDefinition: string;
  causalIdentificationPolicy: ImpactCausalIdentificationPolicy;
  evidenceSemanticsPolicy: ImpactEvidenceSemanticsPolicy;
  strategicBehaviorPolicy: ImpactStrategicBehaviorPolicy;
  algorithmDescription: string;
  referenceClassPolicy: ImpactReferenceClassPolicy;
  uncertaintyPolicy: ImpactUncertaintyPolicy;
  validationPolicy: ImpactValidationPolicy;
  freshnessPolicy: ImpactFreshnessPolicy;
  healthPolicy: ImpactHealthPolicy;
  sourceDataRequirements: string[];
  conceptualBasisRefs: string[];
  calibrationEvidenceRefs: string[];
  knownFailureModes: string[];
  outOfDomainConditions: string[];
  materialChangeTriggers: string[];
  aggregationPolicy: ImpactAggregationPolicy;
  shapleyPolicy: ImpactShapleyPolicy;
  parameters: Record<string, unknown>;
}

export interface ImpactMethodologyApprovalEvaluation {
  approvable: boolean;
  blockers: string[];
}

const PLACEHOLDER_PATTERN = /\[(?:required|replace|todo)[^\]]*\]/i;
const MISCLASSIFIED_CALIBRATION_REF = /^(?:source:|github-actions:)/i;

function nonPlaceholder(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized && !PLACEHOLDER_PATTERN.test(normalized));
}

function nonEmptyStrings(values: string[] | null | undefined) {
  return Boolean(values?.length && values.every(nonPlaceholder));
}

function stringArray(values: string[] | null | undefined) {
  return Boolean(Array.isArray(values) && values.every(nonPlaceholder));
}

function recordOfStrings(value: Record<string, string> | null | undefined) {
  return Boolean(
    value &&
      Object.keys(value).length > 0 &&
      Object.entries(value).every(
        ([key, entry]) => nonPlaceholder(key) && nonPlaceholder(entry),
      ),
  );
}

export function createImpactMethodologyDraft(
  mechanismFamily: ImpactMechanismFamily,
): ImpactModelMethodology {
  return {
    schemaVersion: IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION,
    mechanismFamily,
    modelKey: `${mechanismFamily}-v1`,
    displayName: `[REQUIRED: ${mechanismFamily} model name]`,
    estimands: [],
    estimandDefinitions: {},
    baselineDefinition: "[REQUIRED: define the no-agreement counterfactual]",
    causalIdentificationPolicy: {
      estimand: "[REQUIRED: define the participant-level causal estimand]",
      designStatus: "specified_not_validated",
      admissibleDesigns: [],
      interferencePolicy: "[REQUIRED: define interference treatment]",
      overlapAndPositivityPolicy: "[REQUIRED: define overlap and positivity checks]",
      sensitivityAnalysisPolicy: "[REQUIRED: define sensitivity analyses]",
      noDefensibleDesignAction: "withhold_causal_components",
    },
    evidenceSemanticsPolicy: {
      outcomeEvidenceLabel: "verified_outcome",
      additionalityLabel: "assessed_additionality",
      receiptAloneEstablishesAdditionality: false,
      publicCopyRule:
        "[REQUIRED: distinguish verified occurrence from assessed additionality]",
    },
    strategicBehaviorPolicy: {
      baselineAntecedenceRule: "[REQUIRED: define baseline antecedence]",
      strategicTimingRule: "[REQUIRED: define strategic timing treatment]",
      interferenceRule: "[REQUIRED: define strategic interference treatment]",
      perverseIncentiveRule: "[REQUIRED: define perverse-incentive safeguards]",
      manipulationChecks: [],
    },
    algorithmDescription: "[REQUIRED: describe the formula or algorithm]",
    referenceClassPolicy: {
      strategy: "hierarchical",
      narrowFields: [],
      broadeningOrder: [],
      minimumSampleSize: null,
      noDefensibleClassAction: "withhold",
      uncertaintyExpansionRule:
        "[REQUIRED: explain how intervals widen as the reference class broadens]",
    },
    uncertaintyPolicy: {
      intervalLevelBps: IMPACT_INTERVAL_LEVEL_BPS,
      method: "[REQUIRED: define the 80% interval method]",
      confidencePolicy: "[REQUIRED: define confidence and withholding]",
      drivers: [],
    },
    validationPolicy: {
      thresholdStatus: "provisional",
      highConfidenceAllowed: false,
      requiredBeforeHighConfidence: [],
    },
    freshnessPolicy: {
      maxAgeSeconds: null,
      requireStateHash: true,
      requiredStateFields: [],
      invalidateOnLifecycleStates: [],
    },
    healthPolicy: {
      requiredCalibrationMetrics: [],
      blockedConditions: [],
      warningConditions: [],
    },
    sourceDataRequirements: [],
    conceptualBasisRefs: [],
    calibrationEvidenceRefs: [],
    knownFailureModes: [],
    outOfDomainConditions: [],
    materialChangeTriggers: [],
    aggregationPolicy: {
      directAndCooperativeNeverSummed: true,
      heterogeneousNativeUnitsRemainSeparate: true,
      directMarginalEffectsDefaultNonAdditive: true,
      additiveClaimRequirement:
        "[REQUIRED: define unique claim references for additive causal quantities]",
      overlapHandling: "[REQUIRED: define overlap and dependence treatment]",
    },
    shapleyPolicy: {
      enabled: mechanismFamily === "co_fund",
      characteristicFunctionDefinition:
        mechanismFamily === "co_fund"
          ? "[REQUIRED: define coalition value]"
          : "Not used for this methodology.",
      maximumExactPlayers: null,
      approximationMethod: null,
    },
    parameters: {},
  };
}

export function evaluateImpactMethodologyForApproval(
  methodology: ImpactModelMethodology,
): ImpactMethodologyApprovalEvaluation {
  const blockers: string[] = [];
  const block = (condition: boolean, code: string) => {
    if (condition) blockers.push(code);
  };

  block(
    methodology.schemaVersion !== IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION,
    "unsupported_schema_version",
  );
  block(
    !(IMPACT_MECHANISM_FAMILIES as readonly string[]).includes(
      methodology.mechanismFamily,
    ),
    "invalid_mechanism_family",
  );
  block(!nonPlaceholder(methodology.modelKey), "model_key_required");
  block(!nonPlaceholder(methodology.displayName), "display_name_required");
  block(
    !methodology.estimands.length ||
      methodology.estimands.some(
        (estimand) =>
          !(IMPACT_ESTIMATE_KINDS as readonly string[]).includes(estimand),
      ),
    "valid_estimands_required",
  );
  block(
    !recordOfStrings(methodology.estimandDefinitions) ||
      methodology.estimands.some(
        (estimand) =>
          !nonPlaceholder(methodology.estimandDefinitions[estimand]),
      ),
    "estimand_definitions_required",
  );
  block(
    methodology.estimands.includes(
      "verified_additional" as ImpactEstimateKind,
    ),
    "verified_additional_term_retired",
  );
  block(
    !nonPlaceholder(methodology.baselineDefinition),
    "baseline_definition_required",
  );
  block(
    !nonPlaceholder(methodology.algorithmDescription),
    "algorithm_required",
  );

  const causal = methodology.causalIdentificationPolicy;
  block(!nonPlaceholder(causal?.estimand), "causal_estimand_required");
  block(
    !["specified_not_validated", "validated"].includes(causal?.designStatus),
    "causal_design_status_invalid",
  );
  block(
    !nonEmptyStrings(causal?.admissibleDesigns),
    "admissible_causal_designs_required",
  );
  block(
    !nonPlaceholder(causal?.interferencePolicy),
    "causal_interference_policy_required",
  );
  block(
    !nonPlaceholder(causal?.overlapAndPositivityPolicy),
    "causal_overlap_policy_required",
  );
  block(
    !nonPlaceholder(causal?.sensitivityAnalysisPolicy),
    "causal_sensitivity_policy_required",
  );
  block(
    causal?.noDefensibleDesignAction !== "withhold_causal_components",
    "causal_design_must_fail_closed",
  );

  const evidence = methodology.evidenceSemanticsPolicy;
  block(
    evidence?.outcomeEvidenceLabel !== "verified_outcome",
    "verified_outcome_label_required",
  );
  block(
    evidence?.additionalityLabel !== "assessed_additionality",
    "assessed_additionality_label_required",
  );
  block(
    evidence?.receiptAloneEstablishesAdditionality !== false,
    "receipt_cannot_establish_additionality",
  );
  block(
    !nonPlaceholder(evidence?.publicCopyRule),
    "evidence_public_copy_rule_required",
  );

  const strategic = methodology.strategicBehaviorPolicy;
  block(
    !nonPlaceholder(strategic?.baselineAntecedenceRule),
    "baseline_antecedence_rule_required",
  );
  block(
    !nonPlaceholder(strategic?.strategicTimingRule),
    "strategic_timing_rule_required",
  );
  block(
    !nonPlaceholder(strategic?.interferenceRule),
    "strategic_interference_rule_required",
  );
  block(
    !nonPlaceholder(strategic?.perverseIncentiveRule),
    "perverse_incentive_rule_required",
  );
  block(
    !nonEmptyStrings(strategic?.manipulationChecks),
    "manipulation_checks_required",
  );

  block(
    methodology.referenceClassPolicy.strategy !== "hierarchical",
    "hierarchical_reference_class_required",
  );
  block(
    !nonEmptyStrings(methodology.referenceClassPolicy.narrowFields),
    "reference_class_narrow_fields_required",
  );
  block(
    !nonEmptyStrings(methodology.referenceClassPolicy.broadeningOrder),
    "reference_class_broadening_order_required",
  );
  block(
    !Number.isInteger(methodology.referenceClassPolicy.minimumSampleSize) ||
      (methodology.referenceClassPolicy.minimumSampleSize ?? 0) < 1,
    "reference_class_minimum_sample_required",
  );
  block(
    methodology.referenceClassPolicy.noDefensibleClassAction !== "withhold",
    "reference_class_must_withhold",
  );
  block(
    !nonPlaceholder(
      methodology.referenceClassPolicy.uncertaintyExpansionRule,
    ),
    "reference_class_uncertainty_expansion_required",
  );

  block(
    methodology.uncertaintyPolicy.intervalLevelBps !==
      IMPACT_INTERVAL_LEVEL_BPS,
    "eighty_percent_interval_required",
  );
  block(
    !nonPlaceholder(methodology.uncertaintyPolicy.method),
    "uncertainty_method_required",
  );
  block(
    !nonPlaceholder(methodology.uncertaintyPolicy.confidencePolicy),
    "confidence_policy_required",
  );
  block(
    !nonEmptyStrings(methodology.uncertaintyPolicy.drivers),
    "uncertainty_drivers_required",
  );

  const validation = methodology.validationPolicy;
  block(
    !["provisional", "validated"].includes(validation?.thresholdStatus),
    "validation_threshold_status_invalid",
  );
  block(
    validation?.thresholdStatus === "provisional" &&
      validation?.highConfidenceAllowed !== false,
    "provisional_thresholds_cannot_allow_high_confidence",
  );
  block(
    !nonEmptyStrings(validation?.requiredBeforeHighConfidence),
    "high_confidence_validation_requirements_required",
  );

  block(
    !Number.isInteger(methodology.freshnessPolicy.maxAgeSeconds) ||
      (methodology.freshnessPolicy.maxAgeSeconds ?? 0) < 1,
    "freshness_max_age_required",
  );
  block(
    methodology.freshnessPolicy.requireStateHash !== true,
    "state_hash_required",
  );
  block(
    !nonEmptyStrings(methodology.freshnessPolicy.requiredStateFields),
    "freshness_state_fields_required",
  );
  block(
    !nonEmptyStrings(
      methodology.freshnessPolicy.invalidateOnLifecycleStates,
    ),
    "freshness_terminal_states_required",
  );
  block(
    !nonEmptyStrings(methodology.healthPolicy.requiredCalibrationMetrics),
    "health_metrics_required",
  );
  block(
    !nonEmptyStrings(methodology.healthPolicy.blockedConditions),
    "health_blockers_required",
  );
  block(
    !nonEmptyStrings(methodology.healthPolicy.warningConditions),
    "health_warnings_required",
  );

  block(
    !nonEmptyStrings(methodology.sourceDataRequirements),
    "source_data_requirements_required",
  );
  block(
    !nonEmptyStrings(methodology.conceptualBasisRefs),
    "conceptual_basis_required",
  );
  block(
    !stringArray(methodology.calibrationEvidenceRefs),
    "calibration_evidence_array_required",
  );
  block(
    methodology.calibrationEvidenceRefs.some((reference) =>
      MISCLASSIFIED_CALIBRATION_REF.test(reference),
    ),
    "calibration_evidence_misclassified",
  );
  block(
    !nonEmptyStrings(methodology.knownFailureModes),
    "known_failure_modes_required",
  );
  block(
    !nonEmptyStrings(methodology.outOfDomainConditions),
    "out_of_domain_conditions_required",
  );
  block(
    !nonEmptyStrings(methodology.materialChangeTriggers),
    "material_change_triggers_required",
  );

  block(
    methodology.aggregationPolicy.directAndCooperativeNeverSummed !== true,
    "direct_and_cooperative_separation_required",
  );
  block(
    methodology.aggregationPolicy.heterogeneousNativeUnitsRemainSeparate !==
      true,
    "native_units_must_remain_separate",
  );
  block(
    methodology.aggregationPolicy.directMarginalEffectsDefaultNonAdditive !==
      true,
    "direct_marginal_effects_must_default_non_additive",
  );
  block(
    !nonPlaceholder(methodology.aggregationPolicy.additiveClaimRequirement),
    "additive_claim_requirement_required",
  );
  block(
    !nonPlaceholder(methodology.aggregationPolicy.overlapHandling),
    "overlap_handling_required",
  );

  if (methodology.shapleyPolicy.enabled) {
    block(
      !nonPlaceholder(
        methodology.shapleyPolicy.characteristicFunctionDefinition,
      ),
      "shapley_characteristic_function_required",
    );
    block(
      methodology.shapleyPolicy.maximumExactPlayers === null &&
        !nonPlaceholder(methodology.shapleyPolicy.approximationMethod),
      "shapley_execution_policy_required",
    );
    block(
      methodology.shapleyPolicy.maximumExactPlayers !== null &&
        (!Number.isInteger(
          methodology.shapleyPolicy.maximumExactPlayers,
        ) ||
          methodology.shapleyPolicy.maximumExactPlayers < 1 ||
          methodology.shapleyPolicy.maximumExactPlayers > 15),
      "shapley_exact_player_limit_invalid",
    );
  }

  return {
    approvable: blockers.length === 0,
    blockers: [...new Set(blockers)],
  };
}

export function parseImpactModelMethodology(
  value: unknown,
): ImpactModelMethodology {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Impact methodology must be a JSON object.");
  }
  const methodology = value as ImpactModelMethodology;
  if (
    methodology.schemaVersion !== IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION
  ) {
    throw new Error("Unsupported impact methodology schema version.");
  }
  if (
    !(IMPACT_MECHANISM_FAMILIES as readonly string[]).includes(
      methodology.mechanismFamily,
    )
  ) {
    throw new Error("Impact methodology mechanism family is invalid.");
  }
  if (!Array.isArray(methodology.estimands)) {
    throw new Error("Impact methodology estimands must be an array.");
  }
  return methodology;
}

export function isMaterialImpactMethodologyChange({
  current,
  proposed,
}: {
  current: ImpactModelMethodology;
  proposed: ImpactModelMethodology;
}) {
  const materialPaths: Array<keyof ImpactModelMethodology> = [
    "mechanismFamily",
    "estimands",
    "estimandDefinitions",
    "baselineDefinition",
    "causalIdentificationPolicy",
    "evidenceSemanticsPolicy",
    "strategicBehaviorPolicy",
    "algorithmDescription",
    "referenceClassPolicy",
    "uncertaintyPolicy",
    "validationPolicy",
    "freshnessPolicy",
    "healthPolicy",
    "sourceDataRequirements",
    "conceptualBasisRefs",
    "calibrationEvidenceRefs",
    "knownFailureModes",
    "outOfDomainConditions",
    "aggregationPolicy",
    "shapleyPolicy",
    "parameters",
  ];

  return materialPaths.some(
    (path) =>
      JSON.stringify(current[path]) !== JSON.stringify(proposed[path]),
  );
}
