export const IMPACT_ACCOUNTING_SCHEMA_VERSION = "moral-trade-impact-accounting-v1";
export const IMPACT_INTERVAL_LEVEL_BPS = 8_000 as const;

export const IMPACT_MECHANISM_FAMILIES = [
  "trade",
  "co_fund",
  "threshold_funding",
  "donation_upgrade",
  "threshold_sign_on",
  "donation_redirect",
] as const;

export type ImpactMechanismFamily = (typeof IMPACT_MECHANISM_FAMILIES)[number];

export const IMPACT_ESTIMATE_KINDS = [
  "success_case_additional",
  "expected_additional",
  "direct_causal_attribution",
  "verified_additional",
  "cooperative_allocation",
  "value_adjusted",
  "baseline_redirected",
  "platform_funded_bonus",
] as const;

export type ImpactEstimateKind = (typeof IMPACT_ESTIMATE_KINDS)[number];
export type ImpactConfidence = "high" | "moderate" | "low" | "unavailable";
export type ImpactComponentStatus = "available" | "withheld";
export type ImpactComponentSource =
  | "deterministic_terms"
  | "approved_model"
  | "reference_class"
  | "verified_evidence"
  | "platform_subsidy";

export type ImpactQuantity =
  | { kind: "money"; value: number; currency: string }
  | { kind: "value_adjusted_money"; value: number; currency: string }
  | { kind: "count"; value: number; unit: string }
  | { kind: "duration"; value: number; unit: string };

export interface ImpactInterval {
  levelBps: typeof IMPACT_INTERVAL_LEVEL_BPS;
  lower: number;
  upper: number;
}

export interface ImpactModelReference {
  modelKey: string;
  modelVersion: number;
  methodologyHash: string;
  approvedAt: string;
}

export interface ImpactComponent {
  key: string;
  kind: ImpactEstimateKind;
  label: string;
  status: ImpactComponentStatus;
  quantity: ImpactQuantity | null;
  interval: ImpactInterval | null;
  confidence: ImpactConfidence;
  source: ImpactComponentSource;
  model: ImpactModelReference | null;
  explanation: string;
  evidenceRefs: string[];
  blockers: string[];
  additiveToCausedTotal: boolean;
}

export interface ImpactHealth {
  status: "passed" | "warning" | "blocked" | "stale";
  checkedAt: string;
  expiresAt: string | null;
  blockers: string[];
}

export interface ImpactAccountingSnapshot {
  schemaVersion: typeof IMPACT_ACCOUNTING_SCHEMA_VERSION;
  subjectRef: string;
  mechanismFamily: ImpactMechanismFamily;
  inputStateHash: string;
  stateAsOf: string;
  expiresAt: string | null;
  health: ImpactHealth;
  components: ImpactComponent[];
  explanation: string;
  blockers: string[];
}

export interface AvailableImpactEstimateInput {
  key: string;
  kind: ImpactEstimateKind;
  label: string;
  quantity: ImpactQuantity;
  lower?: number;
  upper?: number;
  confidence: Exclude<ImpactConfidence, "unavailable">;
  source: ImpactComponentSource;
  model?: ImpactModelReference | null;
  explanation: string;
  evidenceRefs?: string[];
  additiveToCausedTotal?: boolean;
}

export interface WithheldImpactEstimateInput {
  key: string;
  kind: ImpactEstimateKind;
  label: string;
  explanation: string;
  blockers: string[];
  model?: ImpactModelReference | null;
}

export interface MechanismImpactInputs {
  successCaseAdditional?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  expectedAdditional?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  directCausalAttribution?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  verifiedAdditional?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  cooperativeAllocation?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  valueAdjusted?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  baselineRedirected?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
  platformFundedBonus?: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null;
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function validateQuantity(quantity: ImpactQuantity) {
  assertFinite(quantity.value, "Impact quantity");
  if (quantity.value < 0) {
    throw new Error("Impact quantities cannot be negative.");
  }

  if ((quantity.kind === "money" || quantity.kind === "value_adjusted_money") && !quantity.currency.trim()) {
    throw new Error("Money quantities require a currency.");
  }

  if ((quantity.kind === "count" || quantity.kind === "duration") && !quantity.unit.trim()) {
    throw new Error("Count and duration quantities require a unit.");
  }
}

function intervalFor(quantity: ImpactQuantity, lower?: number, upper?: number): ImpactInterval {
  const resolvedLower = lower ?? quantity.value;
  const resolvedUpper = upper ?? quantity.value;
  assertFinite(resolvedLower, "Impact interval lower bound");
  assertFinite(resolvedUpper, "Impact interval upper bound");

  if (resolvedLower < 0 || resolvedUpper < 0) {
    throw new Error("Impact intervals cannot contain negative values.");
  }
  if (resolvedLower > quantity.value || quantity.value > resolvedUpper) {
    throw new Error("Impact point estimate must lie inside its 80% interval.");
  }

  return {
    levelBps: IMPACT_INTERVAL_LEVEL_BPS,
    lower: resolvedLower,
    upper: resolvedUpper,
  };
}

export function createAvailableImpactComponent(
  input: AvailableImpactEstimateInput,
): ImpactComponent {
  validateQuantity(input.quantity);
  if (input.model && !HASH_PATTERN.test(input.model.methodologyHash)) {
    throw new Error("Approved model references require a sha256 methodology hash.");
  }

  const component: ImpactComponent = {
    key: input.key,
    kind: input.kind,
    label: input.label,
    status: "available",
    quantity: input.quantity,
    interval: intervalFor(input.quantity, input.lower, input.upper),
    confidence: input.confidence,
    source: input.source,
    model: input.model ?? null,
    explanation: input.explanation.trim(),
    evidenceRefs: [...new Set(input.evidenceRefs ?? [])],
    blockers: [],
    additiveToCausedTotal: input.additiveToCausedTotal ?? false,
  };

  if (component.kind === "cooperative_allocation" && component.additiveToCausedTotal) {
    throw new Error("Cooperative allocation must never be added to direct caused-resource totals.");
  }
  if (!component.explanation) {
    throw new Error("Available impact components require an explanation.");
  }
  return component;
}

export function createWithheldImpactComponent(
  input: WithheldImpactEstimateInput,
): ImpactComponent {
  if (!input.blockers.length) {
    throw new Error("Withheld impact components require at least one blocker.");
  }
  return {
    key: input.key,
    kind: input.kind,
    label: input.label,
    status: "withheld",
    quantity: null,
    interval: null,
    confidence: "unavailable",
    source: "approved_model",
    model: input.model ?? null,
    explanation: input.explanation.trim(),
    evidenceRefs: [],
    blockers: [...new Set(input.blockers)],
    additiveToCausedTotal: false,
  };
}

function isAvailableInput(
  input: AvailableImpactEstimateInput | WithheldImpactEstimateInput,
): input is AvailableImpactEstimateInput {
  return "quantity" in input;
}

function componentFromInput(
  input: AvailableImpactEstimateInput | WithheldImpactEstimateInput | null | undefined,
) {
  if (!input) return null;
  return isAvailableInput(input)
    ? createAvailableImpactComponent(input)
    : createWithheldImpactComponent(input);
}

function buildMechanismComponents(inputs: MechanismImpactInputs) {
  return [
    componentFromInput(inputs.baselineRedirected),
    componentFromInput(inputs.successCaseAdditional),
    componentFromInput(inputs.expectedAdditional),
    componentFromInput(inputs.directCausalAttribution),
    componentFromInput(inputs.verifiedAdditional),
    componentFromInput(inputs.cooperativeAllocation),
    componentFromInput(inputs.valueAdjusted),
    componentFromInput(inputs.platformFundedBonus),
  ].filter((component): component is ImpactComponent => Boolean(component));
}

export function buildTradeImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function buildCoFundImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function buildThresholdFundingImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function buildDonationUpgradeImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function buildThresholdSignOnImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function buildDonationRedirectImpactComponents(inputs: MechanismImpactInputs) {
  return buildMechanismComponents(inputs);
}

export function impactQuantityKey(quantity: ImpactQuantity) {
  if (quantity.kind === "money" || quantity.kind === "value_adjusted_money") {
    return `${quantity.kind}:${quantity.currency.toUpperCase()}`;
  }
  return `${quantity.kind}:${quantity.unit}`;
}

export function summarizeAdditiveCausedImpact(components: ImpactComponent[]) {
  const totals = new Map<string, ImpactQuantity>();

  for (const component of components) {
    if (
      component.status !== "available" ||
      !component.additiveToCausedTotal ||
      component.kind === "cooperative_allocation" ||
      !component.quantity
    ) {
      continue;
    }

    const key = impactQuantityKey(component.quantity);
    const previous = totals.get(key);
    if (!previous) {
      totals.set(key, { ...component.quantity });
      continue;
    }
    previous.value += component.quantity.value;
  }

  return [...totals.values()];
}

export function mergeImpactComponents(
  deterministic: ImpactComponent[],
  modeled: ImpactComponent[],
) {
  const merged = new Map<string, ImpactComponent>();
  for (const component of deterministic) merged.set(component.key, component);
  for (const component of modeled) merged.set(component.key, component);
  return [...merged.values()];
}

function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
}

function coalitionKey(players: string[]) {
  return [...players].sort().join("|");
}

export function computeExactShapleyValues({
  coalitionValues,
  maximumExactPlayers,
  players,
}: {
  coalitionValues: ReadonlyMap<string, number>;
  maximumExactPlayers: number;
  players: string[];
}) {
  const uniquePlayers = [...new Set(players)].sort();
  if (!Number.isInteger(maximumExactPlayers) || maximumExactPlayers < 1) {
    throw new Error("maximumExactPlayers must be a positive integer approved in the methodology.");
  }
  if (uniquePlayers.length > maximumExactPlayers) {
    throw new Error("Coalition exceeds the methodology-approved exact Shapley player limit.");
  }
  if (uniquePlayers.length > 15) {
    throw new Error("Exact Shapley computation is limited to 15 players for operational safety.");
  }

  const expectedCoalitions = 2 ** uniquePlayers.length;
  if (coalitionValues.size !== expectedCoalitions) {
    throw new Error("Exact Shapley computation requires a value for every coalition, including the empty coalition.");
  }
  for (const value of coalitionValues.values()) assertFinite(value, "Coalition value");

  const n = uniquePlayers.length;
  const denominator = factorial(n);
  const result = new Map(uniquePlayers.map((player) => [player, 0]));

  for (const player of uniquePlayers) {
    const others = uniquePlayers.filter((candidate) => candidate !== player);
    for (let mask = 0; mask < 2 ** others.length; mask += 1) {
      const coalition = others.filter((_candidate, index) => (mask & (1 << index)) !== 0);
      const withPlayer = [...coalition, player];
      const withoutValue = coalitionValues.get(coalitionKey(coalition));
      const withValue = coalitionValues.get(coalitionKey(withPlayer));
      if (withoutValue === undefined || withValue === undefined) {
        throw new Error("Coalition values are incomplete.");
      }
      const weight =
        (factorial(coalition.length) * factorial(n - coalition.length - 1)) /
        denominator;
      result.set(player, (result.get(player) ?? 0) + weight * (withValue - withoutValue));
    }
  }

  return result;
}

export function isImpactMechanismFamily(value: string): value is ImpactMechanismFamily {
  return (IMPACT_MECHANISM_FAMILIES as readonly string[]).includes(value);
}

export function isImpactEstimateKind(value: string): value is ImpactEstimateKind {
  return (IMPACT_ESTIMATE_KINDS as readonly string[]).includes(value);
}

export function validateImpactAccountingSnapshot(
  value: unknown,
  now = new Date(),
): ImpactAccountingSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Impact snapshot must be an object.");
  }
  const candidate = value as Partial<ImpactAccountingSnapshot>;
  if (candidate.schemaVersion !== IMPACT_ACCOUNTING_SCHEMA_VERSION) {
    throw new Error("Unsupported impact-accounting schema version.");
  }
  if (!candidate.subjectRef?.trim()) throw new Error("Impact snapshot subject is required.");
  if (!candidate.mechanismFamily || !isImpactMechanismFamily(candidate.mechanismFamily)) {
    throw new Error("Impact snapshot mechanism family is invalid.");
  }
  if (!HASH_PATTERN.test(candidate.inputStateHash ?? "")) {
    throw new Error("Impact snapshot state hash is invalid.");
  }
  if (!Array.isArray(candidate.components)) throw new Error("Impact snapshot components are required.");
  if (!candidate.health || candidate.health.status !== "passed") {
    throw new Error("Only snapshots with passing model health can be rendered.");
  }
  if (candidate.expiresAt && Date.parse(candidate.expiresAt) <= now.getTime()) {
    throw new Error("Impact snapshot is stale.");
  }

  for (const component of candidate.components) {
    if (!isImpactEstimateKind(component.kind)) throw new Error("Impact component kind is invalid.");
    if (component.status === "available") {
      if (!component.quantity || !component.interval) {
        throw new Error("Available impact components require a quantity and 80% interval.");
      }
      validateQuantity(component.quantity);
      if (component.interval.levelBps !== IMPACT_INTERVAL_LEVEL_BPS) {
        throw new Error("Impact intervals must use the approved 80% level.");
      }
      intervalFor(
        component.quantity,
        component.interval.lower,
        component.interval.upper,
      );
      if (component.model && !HASH_PATTERN.test(component.model.methodologyHash)) {
        throw new Error("Impact component methodology hash is invalid.");
      }
    } else if (!component.blockers.length) {
      throw new Error("Withheld components require blockers.");
    }
  }

  return candidate as ImpactAccountingSnapshot;
}
