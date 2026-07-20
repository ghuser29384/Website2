export const DONATION_OFFSET_IMPACT_MODEL_SCHEMA_VERSION =
  "donation-offset-impact-model-v1" as const;
export const DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION =
  "donation-offset-impact-snapshot-v1" as const;
export const DONATION_OFFSET_IMPACT_COMBINATION_VERSION =
  "donation-offset-impact-combination-v1" as const;
export const DONATION_OFFSET_AGGREGATION_KEY_VERSION =
  "donation-offset-impact-aggregation-key-v1" as const;
export const EFFECTIVE_LIFE_YEAR_MICRO_SCALE = 1_000_000;

export const MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE =
  "Effective life-years are a Moral Trade derived scenario calculated from the modeled cost per death averted and the scenario factor. They are not a GiveWell-published DALY estimate.";

export type DonationOffsetPartyRole = "owner" | "counterparty";

export type DonationOffsetImpactDestinationId =
  | "against-malaria-foundation"
  | "malaria-consortium-smc"
  | "helen-keller-intl-vitamin-a"
  | "new-incentives";

export type DonationOffsetProgramOutputUnit =
  | "insecticide_treated_net"
  | "child_receiving_seasonal_malaria_chemoprevention"
  | "child_year_of_vitamin_a_supplementation"
  | "infant_vaccination_incentive";

export interface DonationOffsetAggregationCompatibilityIdentity {
  readonly outcomeMetricId: string;
  readonly outcomeUnit: string;
  readonly aggregationModelId: string;
  readonly aggregationModelVersion: string;
  readonly counterfactualDefinitionId: string;
  readonly sourceDatasetVersion: string;
}

export interface DonationOffsetAggregationCompatibility
  extends DonationOffsetAggregationCompatibilityIdentity {
  readonly keyVersion: typeof DONATION_OFFSET_AGGREGATION_KEY_VERSION;
  readonly compatibilityKey: string;
}

export interface DonationOffsetImpactModel {
  readonly schemaVersion: typeof DONATION_OFFSET_IMPACT_MODEL_SCHEMA_VERSION;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly destinationId: DonationOffsetImpactDestinationId;
  readonly programName: string;
  readonly sourceDatasetId: string;
  readonly sourceDatasetVersion: string;
  readonly sourceLabel: string;
  readonly sourceAsOf: string;
  readonly output: Readonly<{
    unit: DonationOffsetProgramOutputUnit;
    unitLabelSingular: string;
    unitLabelPlural: string;
    costPerOutputUsd: number;
  }>;
  readonly modeledCostPerDeathAvertedUsd: number;
  readonly effectiveLifeYearsPerModeledDeathAverted: number;
  readonly effectiveLifeYearScenarioId: string;
  readonly effectiveLifeYearScenarioVersion: string;
  readonly effectiveLifeYearScenarioLabel: "Moral Trade derived scenario";
  readonly effectiveLifeYearDisclosure: typeof MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE;
  readonly aggregationCompatibility: DonationOffsetAggregationCompatibility;
}

export interface DonationOffsetImpactAttribution {
  readonly partyId: string;
  readonly partyRole: DonationOffsetPartyRole;
}

export interface DonationOffsetImpactAvailableSnapshot {
  readonly schemaVersion: typeof DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION;
  readonly status: "available";
  readonly attribution: DonationOffsetImpactAttribution;
  readonly destinationId: DonationOffsetImpactDestinationId;
  readonly amountCents: number;
  readonly model: DonationOffsetImpactModel;
  readonly programOutput: Readonly<{
    unit: DonationOffsetProgramOutputUnit;
    unitLabelSingular: string;
    unitLabelPlural: string;
    expectedCount: number;
  }>;
  readonly modeledDeathsAverted: number;
  readonly effectiveLifeYears: Readonly<{
    unit: "effective_life_year";
    estimate: number;
    estimateMicroEffectiveLifeYears: number;
    label: "expected effective life-years saved";
    scenarioId: string;
    scenarioVersion: string;
    scenarioLabel: "Moral Trade derived scenario";
    disclosure: typeof MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE;
  }>;
  readonly aggregationCompatibility: DonationOffsetAggregationCompatibility;
}

export type DonationOffsetImpactUnavailableReason =
  | "invalid_party_attribution"
  | "invalid_amount"
  | "model_unavailable";

export interface DonationOffsetImpactUnavailableSnapshot {
  readonly schemaVersion: typeof DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION;
  readonly status: "unavailable";
  readonly attribution: DonationOffsetImpactAttribution;
  readonly destinationId: string;
  readonly amountCents: number | null;
  readonly reason: DonationOffsetImpactUnavailableReason;
  readonly message: string;
}

export type DonationOffsetImpactSnapshot =
  | DonationOffsetImpactAvailableSnapshot
  | DonationOffsetImpactUnavailableSnapshot;

export interface DonationOffsetImpactCalculationInput {
  readonly partyId: string;
  readonly partyRole: DonationOffsetPartyRole;
  readonly destinationId: string;
  readonly amountCents: number;
}

export interface DonationOffsetImpactPartyResult {
  readonly partyId: string;
  readonly partyRole: DonationOffsetPartyRole;
  readonly destinationId: string;
  readonly amountCents: number | null;
  readonly modelId: string | null;
  readonly modelVersion: string | null;
  readonly estimate: number | null;
  readonly estimateMicroEffectiveLifeYears: number | null;
}

export interface DonationOffsetImpactCombinedCompatible {
  readonly schemaVersion: typeof DONATION_OFFSET_IMPACT_COMBINATION_VERSION;
  readonly status: "compatible";
  readonly partySnapshots: readonly [
    DonationOffsetImpactAvailableSnapshot,
    DonationOffsetImpactAvailableSnapshot,
  ];
  readonly perPartyAttribution: readonly [
    DonationOffsetImpactPartyResult,
    DonationOffsetImpactPartyResult,
  ];
  readonly aggregationCompatibility: DonationOffsetAggregationCompatibility;
  readonly combinedImpact: Readonly<{
    unit: "effective_life_year";
    estimate: number;
    estimateMicroEffectiveLifeYears: number;
    label: "combined expected effective life-years saved";
    scenarioLabel: "Moral Trade derived scenario";
    disclosure: typeof MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE;
  }>;
}

export type DonationOffsetImpactIncompatibilityReason =
  | "unavailable_estimate"
  | "duplicate_party_attribution"
  | "invalid_aggregation_compatibility"
  | "incompatible_aggregation";

export interface DonationOffsetImpactCombinedIncompatible {
  readonly schemaVersion: typeof DONATION_OFFSET_IMPACT_COMBINATION_VERSION;
  readonly status: "incompatible";
  readonly reason: DonationOffsetImpactIncompatibilityReason;
  readonly message: string;
  readonly partySnapshots: readonly [
    DonationOffsetImpactSnapshot,
    DonationOffsetImpactSnapshot,
  ];
  readonly perPartyAttribution: readonly [
    DonationOffsetImpactPartyResult,
    DonationOffsetImpactPartyResult,
  ];
  readonly compatibilityKeys: readonly [string | null, string | null];
  readonly combinedImpact: null;
}

export type DonationOffsetImpactCombinedResult =
  | DonationOffsetImpactCombinedCompatible
  | DonationOffsetImpactCombinedIncompatible;

const GIVEWELL_SOURCE_DATASET_ID = "givewell-cost-effectiveness-analysis";
const GIVEWELL_SOURCE_DATASET_VERSION =
  "givewell-nov-2025-2022-2024-average-inputs-v1";
const GIVEWELL_SOURCE_LABEL =
  "GiveWell November 2025 cost-effectiveness analysis, using 2022–2024 average inputs";
const GIVEWELL_SOURCE_AS_OF = "2025-11";
const EFFECTIVE_LIFE_YEAR_SCENARIO_ID =
  "moral-trade-derived-effective-life-years";
const EFFECTIVE_LIFE_YEAR_SCENARIO_VERSION = "v1";

export function buildDonationOffsetAggregationCompatibilityKey(
  identity: DonationOffsetAggregationCompatibilityIdentity,
): string {
  return [
    DONATION_OFFSET_AGGREGATION_KEY_VERSION,
    identity.outcomeMetricId,
    identity.outcomeUnit,
    identity.aggregationModelId,
    identity.aggregationModelVersion,
    identity.counterfactualDefinitionId,
    identity.sourceDatasetVersion,
  ]
    .map((value) => encodeURIComponent(value))
    .join("|");
}

export function createDonationOffsetAggregationCompatibility(
  identity: DonationOffsetAggregationCompatibilityIdentity,
): DonationOffsetAggregationCompatibility {
  const frozenIdentity = Object.freeze({ ...identity });
  return Object.freeze({
    ...frozenIdentity,
    keyVersion: DONATION_OFFSET_AGGREGATION_KEY_VERSION,
    compatibilityKey: buildDonationOffsetAggregationCompatibilityKey(frozenIdentity),
  });
}

const EFFECTIVE_LIFE_YEAR_AGGREGATION_COMPATIBILITY =
  createDonationOffsetAggregationCompatibility({
    outcomeMetricId: "expected-effective-life-years-saved",
    outcomeUnit: "effective_life_year",
    aggregationModelId: "modeled-deaths-averted-times-effective-life-year-factor",
    aggregationModelVersion: "moral-trade-derived-scenario-v1",
    counterfactualDefinitionId: "destination-impact-before-baseline-adjustment-v1",
    sourceDatasetVersion: GIVEWELL_SOURCE_DATASET_VERSION,
  });

function createImpactModel(input: {
  destinationId: DonationOffsetImpactDestinationId;
  programName: string;
  outputUnit: DonationOffsetProgramOutputUnit;
  outputUnitLabelSingular: string;
  outputUnitLabelPlural: string;
  costPerOutputUsd: number;
  modeledCostPerDeathAvertedUsd: number;
  effectiveLifeYearsPerModeledDeathAverted: number;
}): DonationOffsetImpactModel {
  return Object.freeze({
    schemaVersion: DONATION_OFFSET_IMPACT_MODEL_SCHEMA_VERSION,
    modelId: `donation-offset-impact:${input.destinationId}`,
    modelVersion: "givewell-nov-2025-moral-trade-ely-v1",
    destinationId: input.destinationId,
    programName: input.programName,
    sourceDatasetId: GIVEWELL_SOURCE_DATASET_ID,
    sourceDatasetVersion: GIVEWELL_SOURCE_DATASET_VERSION,
    sourceLabel: GIVEWELL_SOURCE_LABEL,
    sourceAsOf: GIVEWELL_SOURCE_AS_OF,
    output: Object.freeze({
      unit: input.outputUnit,
      unitLabelSingular: input.outputUnitLabelSingular,
      unitLabelPlural: input.outputUnitLabelPlural,
      costPerOutputUsd: input.costPerOutputUsd,
    }),
    modeledCostPerDeathAvertedUsd: input.modeledCostPerDeathAvertedUsd,
    effectiveLifeYearsPerModeledDeathAverted:
      input.effectiveLifeYearsPerModeledDeathAverted,
    effectiveLifeYearScenarioId: EFFECTIVE_LIFE_YEAR_SCENARIO_ID,
    effectiveLifeYearScenarioVersion: EFFECTIVE_LIFE_YEAR_SCENARIO_VERSION,
    effectiveLifeYearScenarioLabel: "Moral Trade derived scenario",
    effectiveLifeYearDisclosure: MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE,
    aggregationCompatibility: EFFECTIVE_LIFE_YEAR_AGGREGATION_COMPATIBILITY,
  });
}

export const DONATION_OFFSET_IMPACT_MODELS: Readonly<
  Record<DonationOffsetImpactDestinationId, DonationOffsetImpactModel>
> = Object.freeze({
  "against-malaria-foundation": createImpactModel({
    destinationId: "against-malaria-foundation",
    programName: "Against Malaria Foundation",
    outputUnit: "insecticide_treated_net",
    outputUnitLabelSingular: "insecticide-treated malaria net",
    outputUnitLabelPlural: "insecticide-treated malaria nets",
    costPerOutputUsd: 6,
    modeledCostPerDeathAvertedUsd: 5_500,
    effectiveLifeYearsPerModeledDeathAverted: 45,
  }),
  "malaria-consortium-smc": createImpactModel({
    destinationId: "malaria-consortium-smc",
    programName: "Malaria Consortium — Seasonal Malaria Chemoprevention",
    outputUnit: "child_receiving_seasonal_malaria_chemoprevention",
    outputUnitLabelSingular: "child receiving a season of SMC",
    outputUnitLabelPlural: "children receiving a season of SMC",
    costPerOutputUsd: 7,
    modeledCostPerDeathAvertedUsd: 4_000,
    effectiveLifeYearsPerModeledDeathAverted: 50,
  }),
  "helen-keller-intl-vitamin-a": createImpactModel({
    destinationId: "helen-keller-intl-vitamin-a",
    programName: "Helen Keller Intl — Vitamin A Supplementation",
    outputUnit: "child_year_of_vitamin_a_supplementation",
    outputUnitLabelSingular: "child-year of vitamin A supplementation",
    outputUnitLabelPlural: "child-years of vitamin A supplementation",
    costPerOutputUsd: 2,
    modeledCostPerDeathAvertedUsd: 3_500,
    effectiveLifeYearsPerModeledDeathAverted: 52,
  }),
  "new-incentives": createImpactModel({
    destinationId: "new-incentives",
    programName: "New Incentives",
    outputUnit: "infant_vaccination_incentive",
    outputUnitLabelSingular: "infant vaccination incentive",
    outputUnitLabelPlural: "infant vaccination incentives",
    costPerOutputUsd: 146,
    modeledCostPerDeathAvertedUsd: 4_500,
    effectiveLifeYearsPerModeledDeathAverted: 50,
  }),
});

export function getDonationOffsetImpactModel(
  destinationId: string,
): DonationOffsetImpactModel | null {
  const normalizedDestinationId = destinationId.trim();
  return (
    DONATION_OFFSET_IMPACT_MODELS[
      normalizedDestinationId as DonationOffsetImpactDestinationId
    ] ?? null
  );
}

function freezeAttribution(
  partyId: string,
  partyRole: DonationOffsetPartyRole,
): DonationOffsetImpactAttribution {
  return Object.freeze({ partyId: partyId.trim(), partyRole });
}

function unavailableSnapshot(input: {
  attribution: DonationOffsetImpactAttribution;
  destinationId: string;
  amountCents: number | null;
  reason: DonationOffsetImpactUnavailableReason;
  message: string;
}): DonationOffsetImpactUnavailableSnapshot {
  return Object.freeze({
    schemaVersion: DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION,
    status: "unavailable",
    ...input,
  });
}

function calculateMicroEffectiveLifeYears(
  amountCents: number,
  model: DonationOffsetImpactModel,
): number | null {
  const numerator =
    BigInt(amountCents) *
    BigInt(model.effectiveLifeYearsPerModeledDeathAverted) *
    BigInt(EFFECTIVE_LIFE_YEAR_MICRO_SCALE);
  const denominator = BigInt(model.modeledCostPerDeathAvertedUsd * 100);
  const rounded = (numerator + denominator / BigInt(2)) / denominator;
  const result = Number(rounded);
  return Number.isSafeInteger(result) ? result : null;
}

export function calculateDonationOffsetImpactSnapshot(
  input: DonationOffsetImpactCalculationInput,
): DonationOffsetImpactSnapshot {
  const attribution = freezeAttribution(input.partyId, input.partyRole);
  const destinationId = input.destinationId.trim();

  if (
    attribution.partyId.length === 0 ||
    (attribution.partyRole !== "owner" && attribution.partyRole !== "counterparty")
  ) {
    return unavailableSnapshot({
      attribution,
      destinationId,
      amountCents: Number.isFinite(input.amountCents) ? input.amountCents : null,
      reason: "invalid_party_attribution",
      message: "A distinct owner or counterparty attribution is required.",
    });
  }

  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0) {
    return unavailableSnapshot({
      attribution,
      destinationId,
      amountCents: Number.isFinite(input.amountCents) ? input.amountCents : null,
      reason: "invalid_amount",
      message: "Donation impact requires a non-negative whole-cent amount.",
    });
  }

  const model = getDonationOffsetImpactModel(destinationId);
  if (!model) {
    return unavailableSnapshot({
      attribution,
      destinationId,
      amountCents: input.amountCents,
      reason: "model_unavailable",
      message: "No versioned effective-life-year model is available for this destination.",
    });
  }

  const estimateMicroEffectiveLifeYears = calculateMicroEffectiveLifeYears(
    input.amountCents,
    model,
  );
  if (estimateMicroEffectiveLifeYears === null) {
    return unavailableSnapshot({
      attribution,
      destinationId,
      amountCents: input.amountCents,
      reason: "invalid_amount",
      message: "The donation amount is too large to calculate safely.",
    });
  }

  const amountUsd = input.amountCents / 100;
  return Object.freeze({
    schemaVersion: DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION,
    status: "available",
    attribution,
    destinationId: model.destinationId,
    amountCents: input.amountCents,
    model,
    programOutput: Object.freeze({
      unit: model.output.unit,
      unitLabelSingular: model.output.unitLabelSingular,
      unitLabelPlural: model.output.unitLabelPlural,
      expectedCount: amountUsd / model.output.costPerOutputUsd,
    }),
    modeledDeathsAverted: amountUsd / model.modeledCostPerDeathAvertedUsd,
    effectiveLifeYears: Object.freeze({
      unit: "effective_life_year",
      estimate:
        estimateMicroEffectiveLifeYears / EFFECTIVE_LIFE_YEAR_MICRO_SCALE,
      estimateMicroEffectiveLifeYears,
      label: "expected effective life-years saved",
      scenarioId: model.effectiveLifeYearScenarioId,
      scenarioVersion: model.effectiveLifeYearScenarioVersion,
      scenarioLabel: model.effectiveLifeYearScenarioLabel,
      disclosure: model.effectiveLifeYearDisclosure,
    }),
    aggregationCompatibility: model.aggregationCompatibility,
  });
}

function partyResult(
  snapshot: DonationOffsetImpactSnapshot,
): DonationOffsetImpactPartyResult {
  return Object.freeze({
    partyId: snapshot.attribution.partyId,
    partyRole: snapshot.attribution.partyRole,
    destinationId: snapshot.destinationId,
    amountCents: snapshot.amountCents,
    modelId: snapshot.status === "available" ? snapshot.model.modelId : null,
    modelVersion: snapshot.status === "available" ? snapshot.model.modelVersion : null,
    estimate:
      snapshot.status === "available" ? snapshot.effectiveLifeYears.estimate : null,
    estimateMicroEffectiveLifeYears:
      snapshot.status === "available"
        ? snapshot.effectiveLifeYears.estimateMicroEffectiveLifeYears
        : null,
  });
}

function isCompatibilityIntact(
  snapshot: DonationOffsetImpactAvailableSnapshot,
): boolean {
  const compatibility = snapshot.aggregationCompatibility;
  return (
    compatibility.compatibilityKey ===
      buildDonationOffsetAggregationCompatibilityKey(compatibility) &&
    compatibility.outcomeUnit === snapshot.effectiveLifeYears.unit &&
    compatibility.aggregationModelVersion ===
      `moral-trade-derived-scenario-${snapshot.effectiveLifeYears.scenarioVersion}` &&
    compatibility.sourceDatasetVersion === snapshot.model.sourceDatasetVersion
  );
}

function incompatibleCombination(input: {
  first: DonationOffsetImpactSnapshot;
  second: DonationOffsetImpactSnapshot;
  reason: DonationOffsetImpactIncompatibilityReason;
  message: string;
}): DonationOffsetImpactCombinedIncompatible {
  const partySnapshots = Object.freeze([
    input.first,
    input.second,
  ]) as readonly [DonationOffsetImpactSnapshot, DonationOffsetImpactSnapshot];
  const perPartyAttribution = Object.freeze([
    partyResult(input.first),
    partyResult(input.second),
  ]) as readonly [DonationOffsetImpactPartyResult, DonationOffsetImpactPartyResult];
  const compatibilityKeys = Object.freeze([
    input.first.status === "available"
      ? input.first.aggregationCompatibility.compatibilityKey
      : null,
    input.second.status === "available"
      ? input.second.aggregationCompatibility.compatibilityKey
      : null,
  ]) as readonly [string | null, string | null];

  return Object.freeze({
    schemaVersion: DONATION_OFFSET_IMPACT_COMBINATION_VERSION,
    status: "incompatible",
    reason: input.reason,
    message: input.message,
    partySnapshots,
    perPartyAttribution,
    compatibilityKeys,
    combinedImpact: null,
  });
}

export function combineDonationOffsetImpactSnapshots(
  first: DonationOffsetImpactSnapshot,
  second: DonationOffsetImpactSnapshot,
): DonationOffsetImpactCombinedResult {
  if (
    first.attribution.partyId === second.attribution.partyId ||
    first.attribution.partyRole === second.attribution.partyRole
  ) {
    return incompatibleCombination({
      first,
      second,
      reason: "duplicate_party_attribution",
      message: "Combined impact requires one distinctly attributed owner and counterparty.",
    });
  }

  if (first.status === "unavailable" || second.status === "unavailable") {
    return incompatibleCombination({
      first,
      second,
      reason: "unavailable_estimate",
      message: "Combined impact is unavailable unless both party estimates are available.",
    });
  }

  if (!isCompatibilityIntact(first) || !isCompatibilityIntact(second)) {
    return incompatibleCombination({
      first,
      second,
      reason: "invalid_aggregation_compatibility",
      message: "At least one impact snapshot has an invalid aggregation compatibility key.",
    });
  }

  if (
    first.aggregationCompatibility.compatibilityKey !==
    second.aggregationCompatibility.compatibilityKey
  ) {
    return incompatibleCombination({
      first,
      second,
      reason: "incompatible_aggregation",
      message: "Impact estimates using unlike units or aggregation models are not summed.",
    });
  }

  const estimateMicroEffectiveLifeYears =
    first.effectiveLifeYears.estimateMicroEffectiveLifeYears +
    second.effectiveLifeYears.estimateMicroEffectiveLifeYears;
  const partySnapshots = Object.freeze([first, second]) as readonly [
    DonationOffsetImpactAvailableSnapshot,
    DonationOffsetImpactAvailableSnapshot,
  ];
  const perPartyAttribution = Object.freeze([
    partyResult(first),
    partyResult(second),
  ]) as readonly [DonationOffsetImpactPartyResult, DonationOffsetImpactPartyResult];

  return Object.freeze({
    schemaVersion: DONATION_OFFSET_IMPACT_COMBINATION_VERSION,
    status: "compatible",
    partySnapshots,
    perPartyAttribution,
    aggregationCompatibility: first.aggregationCompatibility,
    combinedImpact: Object.freeze({
      unit: "effective_life_year",
      estimate:
        estimateMicroEffectiveLifeYears / EFFECTIVE_LIFE_YEAR_MICRO_SCALE,
      estimateMicroEffectiveLifeYears,
      label: "combined expected effective life-years saved",
      scenarioLabel: "Moral Trade derived scenario",
      disclosure: MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE,
    }),
  });
}
