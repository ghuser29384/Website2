export const CREDIBILITY_ROLES = [
  "committer",
  "funder",
  "verifier",
  "recipient",
  "counterparty",
] as const;

export const CREDIBILITY_CATEGORIES = [
  "donation",
  "behavioral_pledge",
  "paid_action",
  "service",
  "group_purchase",
  "recurring_commitment",
  "other",
] as const;

export const CREDIBILITY_DIMENSIONS = [
  "fulfilment",
  "evidence_integrity",
  "settlement",
  "dispute_conduct",
  "responsiveness",
] as const;

export type CredibilityRole = (typeof CREDIBILITY_ROLES)[number];
export type CredibilityCategory = (typeof CREDIBILITY_CATEGORIES)[number];
export type CredibilityDimension = (typeof CREDIBILITY_DIMENSIONS)[number];
export type CredibilityEligibility = "eligible" | "review_required" | "restricted";
export type CredibilityConfidence = "limited" | "low" | "medium" | "high";
export type CredibilityLevel =
  | "Unproven"
  | "Developing"
  | "Established"
  | "Strong"
  | "Review required"
  | "Safety-restricted";

export interface CredibilityModel {
  version: string;
  priorSuccess: number;
  priorFailure: number;
  lowerQuantile: number;
  minimumEffectiveObservations: number;
  recencyHalfLifeDays: number;
  dimensionWeights: Record<CredibilityDimension, number>;
  contextWeights: {
    exact: number;
    sameRole: number;
    sameCategory: number;
    unrelated: number;
  };
}

export interface CredibilityAggregateRow {
  profileId: string;
  role: CredibilityRole;
  category: CredibilityCategory;
  dimension: CredibilityDimension;
  weightedSuccess: number;
  weightedFailure: number;
  effectiveObservations: number;
  eventCount: number;
  independentCounterparties: number;
  lastEventAt: string | null;
  asOfAt: string;
  modelVersion: string;
}

export interface CredibilityContext {
  role?: CredibilityRole;
  category?: CredibilityCategory;
}

export interface CredibilityDimensionSummary {
  dimension: CredibilityDimension;
  label: string;
  estimatedProbability: number | null;
  conservativeProbability: number | null;
  effectiveObservations: number;
  eventCount: number;
  confidence: CredibilityConfidence;
}

export interface CredibilitySummary {
  modelVersion: string;
  eligibility: CredibilityEligibility;
  level: CredibilityLevel;
  confidence: CredibilityConfidence;
  score: number | null;
  estimatedProbability: number | null;
  conservativeProbability: number | null;
  credibleInterval: [number, number] | null;
  effectiveObservations: number;
  eventCount: number;
  independentCounterpartiesAtLeast: number;
  lastEventAt: string | null;
  context: CredibilityContext;
  dimensions: CredibilityDimensionSummary[];
  explanation: string;
}

export interface DealRiskInputs extends CredibilityContext {
  stakeRisk: number;
  durationRisk: number;
  complexityRisk: number;
  verificationStrength: number;
  assuranceStrength: number;
  irreversibilityRisk: number;
}

export interface DealCredibilityEstimate {
  modelVersion: string;
  isCalibrated: false;
  level: CredibilityLevel;
  estimatedProbability: number | null;
  conservativeProbability: number | null;
  assuranceLevel: "standard" | "enhanced" | "staged" | "manual_review";
  riskIndex: number;
  safeguards: string[];
  factors: Array<{ label: string; value: string; direction: "protective" | "risk" | "neutral" }>;
  caveat: string;
}

export interface OfferRiskLike {
  mode: string;
  offer_impact?: number | null;
  min_counterparty_impact?: number | null;
  verification?: string | null;
  duration?: string | null;
  trust_level?: number | null;
  payment_interval_value?: number | null;
  payment_interval_unit?: string | null;
}

export const DEFAULT_CREDIBILITY_MODEL: CredibilityModel = {
  version: "v1-beta-contextual",
  priorSuccess: 4,
  priorFailure: 1,
  lowerQuantile: 0.1,
  minimumEffectiveObservations: 3,
  recencyHalfLifeDays: 365,
  dimensionWeights: {
    fulfilment: 0.45,
    evidence_integrity: 0.25,
    settlement: 0.15,
    dispute_conduct: 0.1,
    responsiveness: 0.05,
  },
  contextWeights: {
    exact: 1,
    sameRole: 0.7,
    sameCategory: 0.6,
    unrelated: 0.25,
  },
};

const DIMENSION_LABELS: Record<CredibilityDimension, string> = {
  fulfilment: "Fulfilment",
  evidence_integrity: "Evidence integrity",
  settlement: "Settlement compliance",
  dispute_conduct: "Dispute conduct",
  responsiveness: "Responsiveness",
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const shifted = value - 1;
  let series = 0.9999999999998099;
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (shifted + index + 1);
  });
  const scale = shifted + coefficients.length - 0.5;

  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(scale) -
    scale +
    Math.log(series)
  );
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const maxIterations = 240;
  const epsilon = 3e-14;
  const floor = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  d = Math.abs(d) < floor ? floor : d;
  d = 1 / d;
  let result = d;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const even = 2 * iteration;
    let numerator =
      (iteration * (b - iteration) * x) / ((qam + even) * (a + even));
    d = 1 + numerator * d;
    d = Math.abs(d) < floor ? floor : d;
    c = 1 + numerator / c;
    c = Math.abs(c) < floor ? floor : c;
    d = 1 / d;
    result *= d * c;

    numerator =
      (-(a + iteration) * (qab + iteration) * x) /
      ((a + even) * (qap + even));
    d = 1 + numerator * d;
    d = Math.abs(d) < floor ? floor : d;
    c = 1 + numerator / c;
    c = Math.abs(c) < floor ? floor : c;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < epsilon) {
      break;
    }
  }

  return result;
}

export function regularizedIncompleteBeta(x: number, a: number, b: number) {
  if (!(a > 0) || !(b > 0)) {
    throw new RangeError("Beta shape parameters must be positive.");
  }
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }

  const logTerm =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log1p(-x);
  const term = Math.exp(logTerm);

  if (x < (a + 1) / (a + b + 2)) {
    return clamp((term * betaContinuedFraction(a, b, x)) / a);
  }

  return clamp(1 - (term * betaContinuedFraction(b, a, 1 - x)) / b);
}

export function betaQuantile(probability: number, a: number, b: number) {
  if (!(probability >= 0 && probability <= 1)) {
    throw new RangeError("Probability must be between 0 and 1.");
  }
  if (probability === 0) {
    return 0;
  }
  if (probability === 1) {
    return 1;
  }

  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const cumulative = regularizedIncompleteBeta(midpoint, a, b);
    if (cumulative < probability) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }

  return (lower + upper) / 2;
}

function confidenceFor(effectiveObservations: number): CredibilityConfidence {
  if (effectiveObservations < 3) {
    return "limited";
  }
  if (effectiveObservations < 10) {
    return "low";
  }
  if (effectiveObservations < 30) {
    return "medium";
  }
  return "high";
}

function contextWeight(
  row: CredibilityAggregateRow,
  context: CredibilityContext,
  model: CredibilityModel,
) {
  const hasRole = Boolean(context.role);
  const hasCategory = Boolean(context.category);

  if (!hasRole && !hasCategory) {
    return 1;
  }

  const roleMatches = !hasRole || row.role === context.role;
  const categoryMatches = !hasCategory || row.category === context.category;

  if (roleMatches && categoryMatches) {
    return model.contextWeights.exact;
  }
  if (hasRole && row.role === context.role) {
    return model.contextWeights.sameRole;
  }
  if (hasCategory && row.category === context.category) {
    return model.contextWeights.sameCategory;
  }
  return model.contextWeights.unrelated;
}

function decayFactor(asOfAt: string, model: CredibilityModel, now: Date) {
  const asOf = Date.parse(asOfAt);
  if (!Number.isFinite(asOf)) {
    return 1;
  }
  const elapsedDays = Math.max(0, (now.getTime() - asOf) / 86_400_000);
  return Math.pow(0.5, elapsedDays / model.recencyHalfLifeDays);
}

function posterior(
  success: number,
  failure: number,
  effectiveObservations: number,
  model: CredibilityModel,
) {
  const alpha = model.priorSuccess + Math.max(0, success);
  const beta = model.priorFailure + Math.max(0, failure);
  const hasEnoughEvidence = effectiveObservations >= model.minimumEffectiveObservations;

  if (!hasEnoughEvidence) {
    return {
      mean: null,
      conservative: null,
      interval: null as [number, number] | null,
    };
  }

  return {
    mean: alpha / (alpha + beta),
    conservative: betaQuantile(model.lowerQuantile, alpha, beta),
    interval: [betaQuantile(0.05, alpha, beta), betaQuantile(0.95, alpha, beta)] as [
      number,
      number,
    ],
  };
}

function levelFor(
  eligibility: CredibilityEligibility,
  effectiveObservations: number,
  conservativeProbability: number | null,
  minimumEffectiveObservations: number,
): CredibilityLevel {
  if (eligibility === "restricted") {
    return "Safety-restricted";
  }
  if (eligibility === "review_required") {
    return "Review required";
  }
  if (
    effectiveObservations < minimumEffectiveObservations ||
    conservativeProbability === null
  ) {
    return "Unproven";
  }
  if (effectiveObservations >= 30 && conservativeProbability >= 0.85) {
    return "Strong";
  }
  if (effectiveObservations >= 10 && conservativeProbability >= 0.7) {
    return "Established";
  }
  return "Developing";
}

function latestDate(rows: CredibilityAggregateRow[]) {
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  let latestValue: string | null = null;

  rows.forEach((row) => {
    if (!row.lastEventAt) {
      return;
    }
    const timestamp = Date.parse(row.lastEventAt);
    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestValue = row.lastEventAt;
    }
  });

  return latestValue;
}

export function calculateCredibility(
  rows: CredibilityAggregateRow[],
  model: CredibilityModel = DEFAULT_CREDIBILITY_MODEL,
  eligibility: CredibilityEligibility = "eligible",
  context: CredibilityContext = {},
  now = new Date(),
): CredibilitySummary {
  const byDimension = new Map<
    CredibilityDimension,
    { success: number; failure: number; effective: number; eventCount: number }
  >();
  let overallSuccess = 0;
  let overallFailure = 0;
  let contextualEffectiveObservations = 0;
  let eventCount = 0;
  let independentCounterpartiesAtLeast = 0;

  CREDIBILITY_DIMENSIONS.forEach((dimension) => {
    byDimension.set(dimension, { success: 0, failure: 0, effective: 0, eventCount: 0 });
  });

  rows.forEach((row) => {
    const factor = decayFactor(row.asOfAt, model, now) * contextWeight(row, context, model);
    const success = Math.max(0, finiteOr(row.weightedSuccess, 0)) * factor;
    const failure = Math.max(0, finiteOr(row.weightedFailure, 0)) * factor;
    const effective = Math.max(0, finiteOr(row.effectiveObservations, 0)) * factor;
    const dimensionWeight = model.dimensionWeights[row.dimension] ?? 0;
    const dimensionAggregate = byDimension.get(row.dimension);

    if (dimensionAggregate) {
      dimensionAggregate.success += success;
      dimensionAggregate.failure += failure;
      dimensionAggregate.effective += effective;
      dimensionAggregate.eventCount += Math.max(0, row.eventCount);
    }

    overallSuccess += success * dimensionWeight;
    overallFailure += failure * dimensionWeight;
    contextualEffectiveObservations += effective;
    eventCount += Math.max(0, row.eventCount);
    independentCounterpartiesAtLeast = Math.max(
      independentCounterpartiesAtLeast,
      Math.max(0, row.independentCounterparties),
    );
  });

  const overallPosterior = posterior(
    overallSuccess,
    overallFailure,
    contextualEffectiveObservations,
    model,
  );
  const level = levelFor(
    eligibility,
    contextualEffectiveObservations,
    overallPosterior.conservative,
    model.minimumEffectiveObservations,
  );
  const confidence = confidenceFor(contextualEffectiveObservations);
  const score =
    eligibility === "eligible" && overallPosterior.conservative !== null
      ? Math.round(overallPosterior.conservative * 100)
      : null;
  const dimensions = CREDIBILITY_DIMENSIONS.map((dimension) => {
    const aggregate = byDimension.get(dimension) ?? {
      success: 0,
      failure: 0,
      effective: 0,
      eventCount: 0,
    };
    const dimensionPosterior = posterior(
      aggregate.success,
      aggregate.failure,
      aggregate.effective,
      model,
    );

    return {
      dimension,
      label: DIMENSION_LABELS[dimension],
      estimatedProbability: dimensionPosterior.mean,
      conservativeProbability: dimensionPosterior.conservative,
      effectiveObservations: aggregate.effective,
      eventCount: aggregate.eventCount,
      confidence: confidenceFor(aggregate.effective),
    };
  });

  let explanation: string;
  if (eligibility === "restricted") {
    explanation =
      "Eligibility is restricted by a separate safety or integrity control; positive transaction history cannot offset that control.";
  } else if (eligibility === "review_required") {
    explanation =
      "A safety or integrity review is open. The numerical estimate is withheld until that review is resolved.";
  } else if (score === null) {
    explanation = `Unproven: fewer than ${model.minimumEffectiveObservations} effective, verified observations are available in this context.`;
  } else {
    explanation = `A conservative ${Math.round(
      model.lowerQuantile * 100,
    )}th-percentile Bayesian estimate based on evidence-weighted, time-decayed transaction outcomes.`;
  }

  return {
    modelVersion: model.version,
    eligibility,
    level,
    confidence,
    score,
    estimatedProbability:
      eligibility === "eligible" ? overallPosterior.mean : null,
    conservativeProbability:
      eligibility === "eligible" ? overallPosterior.conservative : null,
    credibleInterval: eligibility === "eligible" ? overallPosterior.interval : null,
    effectiveObservations: contextualEffectiveObservations,
    eventCount,
    independentCounterpartiesAtLeast,
    lastEventAt: latestDate(rows),
    context,
    dimensions,
    explanation,
  };
}

function riskLabel(value: number) {
  if (value < 0.34) {
    return "Low";
  }
  if (value < 0.67) {
    return "Moderate";
  }
  return "High";
}

export function estimateDealCredibility(
  credibility: CredibilitySummary,
  inputs: DealRiskInputs,
): DealCredibilityEstimate {
  const stakeRisk = clamp(inputs.stakeRisk);
  const durationRisk = clamp(inputs.durationRisk);
  const complexityRisk = clamp(inputs.complexityRisk);
  const verificationStrength = clamp(inputs.verificationStrength);
  const assuranceStrength = clamp(inputs.assuranceStrength);
  const irreversibilityRisk = clamp(inputs.irreversibilityRisk);
  const riskIndex =
    0.28 * stakeRisk +
    0.2 * durationRisk +
    0.18 * complexityRisk +
    0.2 * irreversibilityRisk +
    0.14 * (1 - verificationStrength);

  const adjustment =
    0.05 * (verificationStrength - 0.5) * 2 +
    0.035 * assuranceStrength -
    0.045 * stakeRisk -
    0.035 * durationRisk -
    0.03 * complexityRisk -
    0.04 * irreversibilityRisk;
  const estimatedProbability =
    credibility.estimatedProbability === null
      ? null
      : clamp(credibility.estimatedProbability + adjustment, 0.05, 0.99);
  const conservativeProbability =
    credibility.conservativeProbability === null
      ? null
      : clamp(credibility.conservativeProbability + adjustment, 0.02, 0.98);

  let assuranceLevel: DealCredibilityEstimate["assuranceLevel"] = "standard";
  if (
    credibility.eligibility !== "eligible" ||
    riskIndex >= 0.78
  ) {
    assuranceLevel = "manual_review";
  } else if (credibility.level === "Unproven" || riskIndex >= 0.58) {
    assuranceLevel = "staged";
  } else if (riskIndex >= 0.34 || credibility.confidence === "low") {
    assuranceLevel = "enhanced";
  }

  const safeguards: string[] = [];
  if (credibility.level === "Unproven") {
    safeguards.push("Begin with a small, fully reviewable pilot rather than an unsecured long commitment.");
  }
  if (stakeRisk >= 0.6 || irreversibilityRisk >= 0.6) {
    safeguards.push("Use milestones or an external regulated payment/custody mechanism before irreversible performance.");
  }
  if (durationRisk >= 0.5) {
    safeguards.push("Split the commitment into dated milestones with explicit amendment and exit rules.");
  }
  if (verificationStrength < 0.55) {
    safeguards.push("Require independent or platform-verifiable evidence instead of unilateral self-report.");
  }
  if (assuranceStrength < 0.35) {
    safeguards.push("Add a proportionate performance bond, staged settlement, or equivalent external assurance.");
  }
  if (credibility.eligibility !== "eligible") {
    safeguards.unshift("Pause matching until the separate safety or integrity review is resolved.");
  }
  if (safeguards.length === 0) {
    safeguards.push("Use the stated evidence plan and retain the ordinary challenge window.");
  }

  return {
    modelVersion: credibility.modelVersion,
    isCalibrated: false,
    level: credibility.level,
    estimatedProbability,
    conservativeProbability,
    assuranceLevel,
    riskIndex,
    safeguards,
    factors: [
      { label: "Stake", value: riskLabel(stakeRisk), direction: stakeRisk >= 0.67 ? "risk" : "neutral" },
      {
        label: "Duration",
        value: riskLabel(durationRisk),
        direction: durationRisk >= 0.67 ? "risk" : "neutral",
      },
      {
        label: "Complexity",
        value: riskLabel(complexityRisk),
        direction: complexityRisk >= 0.67 ? "risk" : "neutral",
      },
      {
        label: "Verification",
        value: riskLabel(verificationStrength),
        direction: verificationStrength >= 0.67 ? "protective" : verificationStrength < 0.34 ? "risk" : "neutral",
      },
      {
        label: "Assurance",
        value: riskLabel(assuranceStrength),
        direction: assuranceStrength >= 0.67 ? "protective" : assuranceStrength < 0.34 ? "risk" : "neutral",
      },
    ],
    caveat:
      "This is the transparent version-one risk rule, not a statistically calibrated production prediction. Exact probabilities remain hidden when evidence is insufficient.",
  };
}

function parseDurationRisk(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();
  if (!text) {
    return 0.45;
  }
  if (/ongoing|indefinite|permanent|yearly|annual/.test(text)) {
    return 0.9;
  }
  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  const amount = numberMatch ? Number.parseFloat(numberMatch[0]) : 1;
  let days = amount;
  if (/week/.test(text)) {
    days *= 7;
  } else if (/month/.test(text)) {
    days *= 30;
  } else if (/year/.test(text)) {
    days *= 365;
  } else if (/hour/.test(text)) {
    days /= 24;
  }
  return clamp(Math.log1p(Math.max(0, days)) / Math.log(366));
}

function verificationStrength(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();
  if (/independent|third[- ]party|receipt|audit|bank|api|platform|adjudicat/.test(text)) {
    return 0.85;
  }
  if (/bilateral|public|witness|attestation|log/.test(text)) {
    return 0.6;
  }
  if (/self|honor|honour|statement|report/.test(text)) {
    return 0.25;
  }
  return 0.45;
}

function assuranceStrengthFromTerms(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();
  if (/performance bond|deposit|staged|milestone|payment authori[sz]ation/.test(text)) {
    return 0.78;
  }
  if (/challenge window|independent review|adjudicat|manual review/.test(text)) {
    return 0.48;
  }
  if (/bilateral review|counterparty review|evidence review/.test(text)) {
    return 0.32;
  }
  return 0.15;
}

export function categoryForOfferMode(mode: string): CredibilityCategory {
  if (mode === "pledge") {
    return "behavioral_pledge";
  }
  if (mode === "offset") {
    return "donation";
  }
  if (mode === "payment") {
    return "paid_action";
  }
  return "other";
}

export function inferDealRiskFromOffer(offer: OfferRiskLike): DealRiskInputs {
  const impact = Math.max(
    0,
    finiteOr(offer.offer_impact ?? 0, 0),
    finiteOr(offer.min_counterparty_impact ?? 0, 0),
  );
  const modeComplexity = offer.mode === "offset" ? 0.7 : offer.mode === "payment" ? 0.58 : 0.42;
  const recurring =
    Boolean(offer.payment_interval_unit && offer.payment_interval_unit !== "none") ||
    Boolean(offer.payment_interval_value && offer.payment_interval_value > 1);

  return {
    role: "committer",
    category: categoryForOfferMode(offer.mode),
    stakeRisk: clamp(impact / 10),
    durationRisk: parseDurationRisk(offer.duration),
    complexityRisk: clamp(modeComplexity + (recurring ? 0.12 : 0)),
    verificationStrength: verificationStrength(offer.verification),
    assuranceStrength: assuranceStrengthFromTerms(offer.verification),
    irreversibilityRisk: offer.mode === "offset" ? 0.72 : offer.mode === "payment" ? 0.62 : 0.38,
  };
}
