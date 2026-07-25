export const PARETO_MODEL_VERSION = "pareto-causal-v1" as const;
export const PARETO_HEURISTIC_MODEL_KEY = "pareto-heuristic-v1" as const;
export const PARETO_EXPERIMENT_KEY = "pareto-nondirect-holdout-v1" as const;
export const PARETO_EXPERIMENT_RATE = 0.05;
export const PARETO_FACTOR_DIMENSIONS = 8;

export const PARETO_FEATURE_KEYS = [
  "substantive_compatibility",
  "base_user_acceptance",
  "base_counterparty_acceptance",
  "base_completion",
  "reciprocal_score",
  "difficulty_inverse",
  "willingness",
  "trust",
  "public_quality",
  "saved",
  "direct_prior",
  "near_prior",
  "collaborative_affinity",
  "graph_affinity",
  "owner_acceptance_prior",
  "owner_completion_prior",
] as const;

export type ParetoFeatureKey = (typeof PARETO_FEATURE_KEYS)[number];
export type ParetoFeatureSnapshot = Record<ParetoFeatureKey, number>;
export type ParetoHeadKey =
  | "userAcceptance"
  | "counterpartyAcceptance"
  | "verifiedCompletion"
  | "viewerGain"
  | "counterpartyGain"
  | "additionality"
  | "externalitySafety"
  | "satisfaction";

export interface ParetoCalibrationArtifact {
  intercept: number;
  slope: number;
}

export interface ParetoHeadMetrics {
  brier: number | null;
  ece: number | null;
  negatives: number;
  positives: number;
  sampleCount: number;
}

export interface ParetoLogisticHead {
  calibration: ParetoCalibrationArtifact;
  coefficients: number[];
  enabled: boolean;
  intercept: number;
  metrics: ParetoHeadMetrics;
}

export interface ParetoThresholds {
  additionality: number;
  counterpartyAcceptance: number;
  counterpartyGain: number;
  externalitySafety: number;
  paretoSuccess: number;
  userAcceptance: number;
  verifiedCompletion: number;
  viewerGain: number;
}

export interface ParetoModelArtifact {
  featureKeys: readonly ParetoFeatureKey[];
  heads: Record<ParetoHeadKey, ParetoLogisticHead>;
  modelVersion: typeof PARETO_MODEL_VERSION;
  platformPriors: {
    acceptance: number;
    completion: number;
  };
  thresholds: ParetoThresholds;
  trainedAt: string;
}

export interface ParetoPredictionVector {
  additionality: number;
  counterpartyAcceptance: number;
  counterpartyGain: number;
  externalitySafety: number;
  paretoSuccess: number;
  satisfaction: number;
  userAcceptance: number;
  verifiedCompletion: number;
  viewerGain: number;
}

export interface BinaryTrainingExample {
  features: ParetoFeatureSnapshot;
  id: string;
  label: 0 | 1;
  weight?: number;
}

export interface ImplicitEdge {
  opportunityKey: string;
  profileId: string;
  weight: number;
}

export interface ImplicitFactorResult {
  opportunityFactors: Map<string, number[]>;
  profileFactors: Map<string, number[]>;
}

export interface CausalCandidate {
  id: string;
  matchClass: "direct" | "near" | "adjacent" | "discovery";
  opportunityType: string;
}

export interface CausalAssignment {
  affectedCandidateKey: string | null;
  arm: "not_assigned" | "treatment" | "holdout";
  assignmentProbability: number;
  candidateProbability: number;
  jointPropensity: number;
  stableBucket: number;
}

export const DEFAULT_PARETO_THRESHOLDS: ParetoThresholds = {
  additionality: 0.55,
  counterpartyAcceptance: 0.5,
  counterpartyGain: 0.55,
  externalitySafety: 0.8,
  paretoSuccess: 0.5,
  userAcceptance: 0.48,
  verifiedCompletion: 0.46,
  viewerGain: 0.55,
};

export const EMPTY_HEAD: ParetoLogisticHead = {
  calibration: { intercept: 0, slope: 1 },
  coefficients: PARETO_FEATURE_KEYS.map(() => 0),
  enabled: false,
  intercept: 0,
  metrics: { brier: null, ece: null, negatives: 0, positives: 0, sampleCount: 0 },
};

export function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

export function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function stableHash32(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function stableUnitInterval(value: string) {
  return stableHash32(value) / 0xffffffff;
}

function sigmoid(value: number) {
  if (value >= 0) {
    const exp = Math.exp(-Math.min(35, value));
    return 1 / (1 + exp);
  }
  const exp = Math.exp(Math.max(-35, value));
  return exp / (1 + exp);
}

export function featureVector(snapshot: Partial<ParetoFeatureSnapshot>) {
  return PARETO_FEATURE_KEYS.map((key) => clamp(Number(snapshot[key]) || 0));
}

function rawLogit(head: ParetoLogisticHead, snapshot: ParetoFeatureSnapshot) {
  const vector = featureVector(snapshot);
  return head.intercept + vector.reduce(
    (sum, value, index) => sum + value * Number(head.coefficients[index] ?? 0),
    0,
  );
}

export function predictHead(head: ParetoLogisticHead, snapshot: ParetoFeatureSnapshot, fallback: number) {
  if (!head.enabled || head.coefficients.length !== PARETO_FEATURE_KEYS.length) return clamp(fallback);
  const logit = rawLogit(head, snapshot);
  return clamp(sigmoid(head.calibration.intercept + head.calibration.slope * logit));
}

export function paretoSuccessScore(prediction: Omit<ParetoPredictionVector, "paretoSuccess">) {
  const positiveProduct = Math.max(
    1e-8,
    prediction.viewerGain *
      prediction.counterpartyGain *
      prediction.verifiedCompletion *
      prediction.additionality *
      prediction.externalitySafety,
  );
  return clamp(Math.pow(positiveProduct, 1 / 5));
}

export function predictParetoModel(
  artifact: ParetoModelArtifact,
  snapshot: ParetoFeatureSnapshot,
): ParetoPredictionVector {
  const base = {
    userAcceptance: snapshot.base_user_acceptance,
    counterpartyAcceptance: snapshot.base_counterparty_acceptance,
    verifiedCompletion: snapshot.base_completion,
    viewerGain: Math.max(snapshot.substantive_compatibility, snapshot.base_user_acceptance * 0.9),
    counterpartyGain: Math.max(snapshot.base_counterparty_acceptance, snapshot.reciprocal_score * 0.9),
    additionality: clamp(0.42 + snapshot.direct_prior * 0.12 + snapshot.public_quality * 0.08),
    externalitySafety: clamp(0.5 + snapshot.trust * 0.25 + snapshot.public_quality * 0.2),
    satisfaction: clamp(0.3 + snapshot.reciprocal_score * 0.55 + snapshot.public_quality * 0.1),
  };
  const prediction = {
    userAcceptance: predictHead(artifact.heads.userAcceptance, snapshot, base.userAcceptance),
    counterpartyAcceptance: predictHead(
      artifact.heads.counterpartyAcceptance,
      snapshot,
      base.counterpartyAcceptance,
    ),
    verifiedCompletion: predictHead(
      artifact.heads.verifiedCompletion,
      snapshot,
      base.verifiedCompletion,
    ),
    viewerGain: predictHead(artifact.heads.viewerGain, snapshot, base.viewerGain),
    counterpartyGain: predictHead(artifact.heads.counterpartyGain, snapshot, base.counterpartyGain),
    additionality: predictHead(artifact.heads.additionality, snapshot, base.additionality),
    externalitySafety: predictHead(
      artifact.heads.externalitySafety,
      snapshot,
      base.externalitySafety,
    ),
    satisfaction: predictHead(artifact.heads.satisfaction, snapshot, base.satisfaction),
  };
  return {
    ...prediction,
    paretoSuccess: paretoSuccessScore(prediction),
  };
}

export function clearsParetoDirectGate(
  prediction: ParetoPredictionVector,
  thresholds: ParetoThresholds = DEFAULT_PARETO_THRESHOLDS,
) {
  return (
    prediction.userAcceptance >= thresholds.userAcceptance &&
    prediction.counterpartyAcceptance >= thresholds.counterpartyAcceptance &&
    prediction.verifiedCompletion >= thresholds.verifiedCompletion &&
    prediction.viewerGain >= thresholds.viewerGain &&
    prediction.counterpartyGain >= thresholds.counterpartyGain &&
    prediction.additionality >= thresholds.additionality &&
    prediction.externalitySafety >= thresholds.externalitySafety &&
    prediction.paretoSuccess >= thresholds.paretoSuccess
  );
}

function splitExamples(examples: readonly BinaryTrainingExample[]) {
  const training: BinaryTrainingExample[] = [];
  const validation: BinaryTrainingExample[] = [];
  examples.forEach((example) => {
    if (stableHash32(`validation:${example.id}`) % 5 === 0) validation.push(example);
    else training.push(example);
  });
  if (!validation.length && training.length > 1) validation.push(training.pop()!);
  return { training, validation };
}

function fitRawLogistic(
  examples: readonly BinaryTrainingExample[],
  iterations = 360,
  learningRate = 0.18,
  regularization = 0.035,
) {
  const coefficients = PARETO_FEATURE_KEYS.map(() => 0);
  const positiveRate = clamp(
    examples.reduce((sum, example) => sum + example.label, 0) / Math.max(1, examples.length),
    0.02,
    0.98,
  );
  let intercept = Math.log(positiveRate / (1 - positiveRate));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const gradient = coefficients.map(() => 0);
    let interceptGradient = 0;
    let totalWeight = 0;
    for (const example of examples) {
      const vector = featureVector(example.features);
      const weight = clamp(Number(example.weight ?? 1), 0.05, 20);
      const prediction = sigmoid(
        intercept + vector.reduce((sum, value, index) => sum + value * coefficients[index], 0),
      );
      const error = (prediction - example.label) * weight;
      interceptGradient += error;
      totalWeight += weight;
      vector.forEach((value, index) => {
        gradient[index] += error * value;
      });
    }
    const scale = 1 / Math.max(1, totalWeight);
    const step = learningRate / Math.sqrt(1 + iteration / 40);
    intercept -= step * interceptGradient * scale;
    coefficients.forEach((value, index) => {
      coefficients[index] -= step * (gradient[index] * scale + regularization * value);
    });
  }
  return { coefficients, intercept };
}

function fitCalibration(logits: readonly number[], labels: readonly number[]) {
  let intercept = 0;
  let slope = 1;
  if (logits.length < 10) return { intercept, slope };
  for (let iteration = 0; iteration < 220; iteration += 1) {
    let interceptGradient = 0;
    let slopeGradient = 0;
    logits.forEach((logit, index) => {
      const prediction = sigmoid(intercept + slope * logit);
      const error = prediction - labels[index];
      interceptGradient += error;
      slopeGradient += error * logit;
    });
    const step = 0.12 / Math.sqrt(1 + iteration / 30);
    intercept -= step * interceptGradient / logits.length;
    slope -= step * slopeGradient / logits.length;
    slope = Math.min(4, Math.max(0.05, slope));
  }
  return { intercept: round(intercept, 6), slope: round(slope, 6) };
}

export function brierScore(predictions: readonly number[], labels: readonly number[]) {
  if (!predictions.length || predictions.length !== labels.length) return null;
  return predictions.reduce((sum, prediction, index) => {
    const error = clamp(prediction) - Number(labels[index] ?? 0);
    return sum + error * error;
  }, 0) / predictions.length;
}

export function expectedCalibrationError(
  predictions: readonly number[],
  labels: readonly number[],
  bins = 8,
) {
  if (!predictions.length || predictions.length !== labels.length) return null;
  let result = 0;
  for (let bin = 0; bin < bins; bin += 1) {
    const lower = bin / bins;
    const upper = (bin + 1) / bins;
    const indexes = predictions
      .map((prediction, index) => ({ prediction: clamp(prediction), index }))
      .filter(({ prediction }) => prediction >= lower && (bin === bins - 1 ? prediction <= upper : prediction < upper));
    if (!indexes.length) continue;
    const confidence = indexes.reduce((sum, item) => sum + item.prediction, 0) / indexes.length;
    const accuracy = indexes.reduce((sum, item) => sum + Number(labels[item.index] ?? 0), 0) / indexes.length;
    result += (indexes.length / predictions.length) * Math.abs(confidence - accuracy);
  }
  return result;
}

export function fitLogisticHead(examples: readonly BinaryTrainingExample[]): ParetoLogisticHead {
  const positives = examples.filter((example) => example.label === 1).length;
  const negatives = examples.length - positives;
  if (examples.length < 20 || positives < 3 || negatives < 3) {
    return {
      ...EMPTY_HEAD,
      metrics: { brier: null, ece: null, negatives, positives, sampleCount: examples.length },
    };
  }
  const { training, validation } = splitExamples(examples);
  if (training.length < 12 || validation.length < 3) {
    return {
      ...EMPTY_HEAD,
      metrics: { brier: null, ece: null, negatives, positives, sampleCount: examples.length },
    };
  }
  const raw = fitRawLogistic(training);
  const logits = validation.map((example) => raw.intercept + featureVector(example.features).reduce(
    (sum, value, index) => sum + value * raw.coefficients[index],
    0,
  ));
  const labels = validation.map((example) => example.label);
  const calibration = fitCalibration(logits, labels);
  const predictions = logits.map((logit) => sigmoid(calibration.intercept + calibration.slope * logit));
  return {
    calibration,
    coefficients: raw.coefficients.map((value) => round(value, 7)),
    enabled: true,
    intercept: round(raw.intercept, 7),
    metrics: {
      brier: round(brierScore(predictions, labels) ?? 1, 5),
      ece: round(expectedCalibrationError(predictions, labels) ?? 1, 5),
      negatives,
      positives,
      sampleCount: examples.length,
    },
  };
}

function deterministicVector(key: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, (_, index) => {
    return (stableUnitInterval(`${key}:${index}`) - 0.5) * 0.16;
  });
  return vector;
}

export function dotProduct(left: readonly number[] | null | undefined, right: readonly number[] | null | undefined) {
  if (!left?.length || left.length !== right?.length) return 0;
  return left.reduce((sum, value, index) => sum + value * Number(right[index] ?? 0), 0);
}

export function factorAffinity(left: readonly number[] | null | undefined, right: readonly number[] | null | undefined) {
  if (!left?.length || left.length !== right?.length) return 0.5;
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  if (!leftNorm || !rightNorm) return 0.5;
  return clamp((dotProduct(left, right) / (leftNorm * rightNorm) + 1) / 2);
}

export function fitImplicitFactors(
  rawEdges: readonly ImplicitEdge[],
  dimensions = PARETO_FACTOR_DIMENSIONS,
): ImplicitFactorResult {
  const edges = rawEdges
    .filter((edge) => edge.profileId && edge.opportunityKey && Number.isFinite(edge.weight) && edge.weight !== 0)
    .map((edge) => ({ ...edge, weight: clamp((edge.weight + 8) / 16) }))
    .sort((left, right) =>
      left.profileId.localeCompare(right.profileId) || left.opportunityKey.localeCompare(right.opportunityKey),
    );
  const profileFactors = new Map<string, number[]>();
  const opportunityFactors = new Map<string, number[]>();
  edges.forEach((edge) => {
    if (!profileFactors.has(edge.profileId)) {
      profileFactors.set(edge.profileId, deterministicVector(`profile:${edge.profileId}`, dimensions));
    }
    if (!opportunityFactors.has(edge.opportunityKey)) {
      opportunityFactors.set(
        edge.opportunityKey,
        deterministicVector(`opportunity:${edge.opportunityKey}`, dimensions),
      );
    }
  });
  for (let epoch = 0; epoch < 18; epoch += 1) {
    const learningRate = 0.09 / Math.sqrt(1 + epoch / 4);
    for (const edge of edges) {
      const user = profileFactors.get(edge.profileId)!;
      const opportunity = opportunityFactors.get(edge.opportunityKey)!;
      const prediction = sigmoid(dotProduct(user, opportunity));
      const error = edge.weight - prediction;
      for (let index = 0; index < dimensions; index += 1) {
        const userValue = user[index];
        const opportunityValue = opportunity[index];
        user[index] += learningRate * (error * opportunityValue - 0.025 * userValue);
        opportunity[index] += learningRate * (error * userValue - 0.025 * opportunityValue);
      }
    }
  }
  return { profileFactors, opportunityFactors };
}

export function betaPosteriorMean(successes: number, trials: number, priorMean: number, priorStrength = 12) {
  const boundedTrials = Math.max(0, Math.floor(Number(trials) || 0));
  const boundedSuccesses = Math.min(boundedTrials, Math.max(0, Number(successes) || 0));
  const mean = clamp(priorMean, 0.02, 0.98);
  return clamp((boundedSuccesses + mean * priorStrength) / (boundedTrials + priorStrength));
}

export function assignNonDirectHoldout({
  candidates,
  day,
  experimentEnabled,
  profileId,
}: {
  candidates: readonly CausalCandidate[];
  day: string;
  experimentEnabled: boolean;
  profileId: string;
}): CausalAssignment {
  const stableBucket = stableHash32(`${PARETO_EXPERIMENT_KEY}:${profileId}:${day}`) % 10_000;
  const eligible = candidates.filter((candidate) => candidate.matchClass !== "direct");
  if (!experimentEnabled || !profileId || !eligible.length || stableBucket >= PARETO_EXPERIMENT_RATE * 10_000) {
    return {
      affectedCandidateKey: null,
      arm: "not_assigned",
      assignmentProbability: PARETO_EXPERIMENT_RATE,
      candidateProbability: eligible.length ? 1 / eligible.length : 0,
      jointPropensity: 0,
      stableBucket,
    };
  }
  const candidateIndex = stableHash32(`candidate:${profileId}:${day}`) % eligible.length;
  const candidate = eligible[candidateIndex];
  const treatment = stableHash32(`arm:${profileId}:${day}`) % 2 === 0;
  return {
    affectedCandidateKey: `${candidate.opportunityType}:${candidate.id}`,
    arm: treatment ? "treatment" : "holdout",
    assignmentProbability: PARETO_EXPERIMENT_RATE,
    candidateProbability: 1 / eligible.length,
    jointPropensity: PARETO_EXPERIMENT_RATE * (1 / eligible.length) * 0.5,
    stableBucket,
  };
}

export function inversePropensityDifference(
  rows: readonly { outcome: number; shown: boolean; propensity: number }[],
) {
  const usable = rows.filter(
    (row) => Number.isFinite(row.outcome) && row.outcome >= 0 && row.outcome <= 1 && row.propensity > 0 && row.propensity <= 1,
  );
  if (!usable.length) return { estimate: null, effectiveSampleSize: 0, sampleCount: 0 };
  let treatmentSum = 0;
  let treatmentWeight = 0;
  let controlSum = 0;
  let controlWeight = 0;
  let squaredWeightSum = 0;
  let totalWeight = 0;
  usable.forEach((row) => {
    const probability = row.shown ? row.propensity : 1 - row.propensity;
    const weight = 1 / Math.max(0.01, probability);
    totalWeight += weight;
    squaredWeightSum += weight * weight;
    if (row.shown) {
      treatmentSum += row.outcome * weight;
      treatmentWeight += weight;
    } else {
      controlSum += row.outcome * weight;
      controlWeight += weight;
    }
  });
  const treatmentMean = treatmentWeight ? treatmentSum / treatmentWeight : null;
  const controlMean = controlWeight ? controlSum / controlWeight : null;
  return {
    estimate:
      treatmentMean === null || controlMean === null ? null : round(treatmentMean - controlMean, 5),
    effectiveSampleSize: squaredWeightSum ? round((totalWeight * totalWeight) / squaredWeightSum, 2) : 0,
    sampleCount: usable.length,
  };
}

export function tuneParetoSuccessThreshold(
  rows: readonly { label: 0 | 1; prediction: number }[],
  minimumPrecision = 0.75,
) {
  if (rows.length < 20) {
    return { threshold: DEFAULT_PARETO_THRESHOLDS.paretoSuccess, precision: null, recall: null };
  }
  const positives = rows.filter((row) => row.label === 1).length;
  if (positives < 5) {
    return { threshold: DEFAULT_PARETO_THRESHOLDS.paretoSuccess, precision: null, recall: null };
  }
  let best = {
    threshold: DEFAULT_PARETO_THRESHOLDS.paretoSuccess,
    precision: 0,
    recall: 0,
  };
  for (let step = 35; step <= 85; step += 2) {
    const threshold = step / 100;
    const predicted = rows.filter((row) => row.prediction >= threshold);
    if (predicted.length < 5) continue;
    const truePositives = predicted.filter((row) => row.label === 1).length;
    const precision = truePositives / predicted.length;
    const recall = truePositives / positives;
    if (
      precision >= minimumPrecision &&
      (recall > best.recall || (recall === best.recall && precision > best.precision))
    ) {
      best = { threshold, precision, recall };
    }
  }
  return {
    threshold: round(best.threshold, 3),
    precision: round(best.precision, 4),
    recall: round(best.recall, 4),
  };
}
