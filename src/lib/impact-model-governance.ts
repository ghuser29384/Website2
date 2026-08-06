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

export interface ImpactUncertaintyPolicy {
  intervalLevelBps: typeof IMPACT_INTERVAL_LEVEL_BPS;
  method: string;
  confidencePolicy: string;
  drivers: string[];
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
  algorithmDescription: string;
  referenceClassPolicy: ImpactReferenceClassPolicy;
  uncertaintyPolicy: ImpactUncertaintyPolicy;
  freshnessPolicy: ImpactFreshnessPolicy;
  healthPolicy: ImpactHealthPolicy;
  sourceDataRequirements: string[];
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

function nonPlaceholder(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized && !PLACEHOLDER_PATTERN.test(normalized));
}

function nonEmptyStrings(values: string[] | null | undefined) {
  return Boolean(values?.length && values.every(nonPlaceholder));
}

function recordOfStrings(value: Record<string, string> | null | undefined) {
  return Boolean(
    value &&
      Object.keys(value).length > 0 &&
      Object.entries(value).every(([key, entry]) => nonPlaceholder(key) && nonPlaceholder(entry)),
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
      confidencePolicy: "[REQUIRED: define high, moderate, and low confidence]",
      drivers: [],
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
    calibrationEvidenceRefs: [],
    knownFailureModes: [],
    outOfDomainConditions: [],
    materialChangeTriggers: [],
    aggregationPolicy: {
      directAndCooperativeNeverSummed: true,
      heterogeneousNativeUnitsRemainSeparate: true,
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
        (estimand) => !(IMPACT_ESTIMATE_KINDS as readonly string[]).includes(estimand),
      ),
    "valid_estimands_required",
  );
  block(
    !recordOfStrings(methodology.estimandDefinitions) ||
      methodology.estimands.some(
        (estimand) => !nonPlaceholder(methodology.estimandDefinitions[estimand]),
      ),
    "estimand_definitions_required",
  );
  block(!nonPlaceholder(methodology.baselineDefinition), "baseline_definition_required");
  block(!nonPlaceholder(methodology.algorithmDescription), "algorithm_required");
  block(methodology.referenceClassPolicy.strategy !== "hierarchical", "hierarchical_reference_class_required");
  block(!nonEmptyStrings(methodology.referenceClassPolicy.narrowFields), "reference_class_narrow_fields_required");
  block(!nonEmptyStrings(methodology.referenceClassPolicy.broadeningOrder), "reference_class_broadening_order_required");
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
    !nonPlaceholder(methodology.referenceClassPolicy.uncertaintyExpansionRule),
    "reference_class_uncertainty_expansion_required",
  );
  block(
    methodology.uncertaintyPolicy.intervalLevelBps !== IMPACT_INTERVAL_LEVEL_BPS,
    "eighty_percent_interval_required",
  );
  block(!nonPlaceholder(methodology.uncertaintyPolicy.method), "uncertainty_method_required");
  block(!nonPlaceholder(methodology.uncertaintyPolicy.confidencePolicy), "confidence_policy_required");
  block(!nonEmptyStrings(methodology.uncertaintyPolicy.drivers), "uncertainty_drivers_required");
  block(
    !Number.isInteger(methodology.freshnessPolicy.maxAgeSeconds) ||
      (methodology.freshnessPolicy.maxAgeSeconds ?? 0) < 1,
    "freshness_max_age_required",
  );
  block(methodology.freshnessPolicy.requireStateHash !== true, "state_hash_required");
  block(!nonEmptyStrings(methodology.freshnessPolicy.requiredStateFields), "freshness_state_fields_required");
  block(!nonEmptyStrings(methodology.freshnessPolicy.invalidateOnLifecycleStates), "freshness_terminal_states_required");
  block(!nonEmptyStrings(methodology.healthPolicy.requiredCalibrationMetrics), "health_metrics_required");
  block(!nonEmptyStrings(methodology.healthPolicy.blockedConditions), "health_blockers_required");
  block(!nonEmptyStrings(methodology.healthPolicy.warningConditions), "health_warnings_required");
  block(!nonEmptyStrings(methodology.sourceDataRequirements), "source_data_requirements_required");
  block(!nonEmptyStrings(methodology.calibrationEvidenceRefs), "calibration_evidence_required");
  block(!nonEmptyStrings(methodology.knownFailureModes), "known_failure_modes_required");
  block(!nonEmptyStrings(methodology.outOfDomainConditions), "out_of_domain_conditions_required");
  block(!nonEmptyStrings(methodology.materialChangeTriggers), "material_change_triggers_required");
  block(
    methodology.aggregationPolicy.directAndCooperativeNeverSummed !== true,
    "direct_and_cooperative_separation_required",
  );
  block(
    methodology.aggregationPolicy.heterogeneousNativeUnitsRemainSeparate !== true,
    "native_units_must_remain_separate",
  );
  block(!nonPlaceholder(methodology.aggregationPolicy.overlapHandling), "overlap_handling_required");

  if (methodology.shapleyPolicy.enabled) {
    block(
      !nonPlaceholder(methodology.shapleyPolicy.characteristicFunctionDefinition),
      "shapley_characteristic_function_required",
    );
    block(
      methodology.shapleyPolicy.maximumExactPlayers === null &&
        !nonPlaceholder(methodology.shapleyPolicy.approximationMethod),
      "shapley_execution_policy_required",
    );
    block(
      methodology.shapleyPolicy.maximumExactPlayers !== null &&
        (!Number.isInteger(methodology.shapleyPolicy.maximumExactPlayers) ||
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

export function parseImpactModelMethodology(value: unknown): ImpactModelMethodology {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Impact methodology must be a JSON object.");
  }
  const methodology = value as ImpactModelMethodology;
  if (methodology.schemaVersion !== IMPACT_MODEL_METHODOLOGY_SCHEMA_VERSION) {
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
    "algorithmDescription",
    "referenceClassPolicy",
    "uncertaintyPolicy",
    "freshnessPolicy",
    "healthPolicy",
    "sourceDataRequirements",
    "knownFailureModes",
    "outOfDomainConditions",
    "aggregationPolicy",
    "shapleyPolicy",
    "parameters",
  ];

  return materialPaths.some(
    (path) => JSON.stringify(current[path]) !== JSON.stringify(proposed[path]),
  );
}
