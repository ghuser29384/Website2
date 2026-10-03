import { estimatePrimaryPolicyItt } from "./analysis.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normal(random) {
  let first = 0;
  let second = 0;
  while (first <= Number.EPSILON) first = random();
  while (second <= Number.EPSILON) second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function gamma(shape, random) {
  assert(shape > 0, "Gamma shape must be positive.");
  if (shape < 1) {
    return gamma(shape + 1, random) * Math.pow(random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const x = normal(random);
    const vBase = 1 + c * x;
    if (vBase <= 0) continue;
    const v = vBase * vBase * vBase;
    const u = random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function betaFromMeanAndIcc(mean, icc, random) {
  if (icc <= 0) return mean;
  const concentration = 1 / icc - 1;
  const alpha = Math.max(1e-8, mean * concentration);
  const beta = Math.max(1e-8, (1 - mean) * concentration);
  const left = gamma(alpha, random);
  const right = gamma(beta, random);
  return left / (left + right);
}

function binomial(trials, probability, random) {
  let successes = 0;
  for (let index = 0; index < trials; index += 1) {
    if (random() < probability) successes += 1;
  }
  return successes;
}

function lognormalClusterSize(mean, coefficientOfVariation, maximum, random) {
  const sigmaSquared = Math.log(1 + coefficientOfVariation ** 2);
  const sigma = Math.sqrt(sigmaSquared);
  const mu = Math.log(mean) - sigmaSquared / 2;
  return clamp(Math.round(Math.exp(mu + sigma * normal(random))), 1, maximum);
}

function wilsonInterval(successes, trials, z = 1.959963984540054) {
  if (trials === 0) return [null, null];
  const proportion = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = (proportion + (z * z) / (2 * trials)) / denominator;
  const halfWidth =
    (z / denominator) *
    Math.sqrt((proportion * (1 - proportion)) / trials + (z * z) / (4 * trials * trials));
  return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];
}

function quantile(sorted, probability) {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function validateSpec(spec) {
  assert(spec.schemaVersion === "commitments-trade-precision-spec-v1", "schemaVersion mismatch.");
  assert(spec.studyVariant === "graph_cluster_role_2x2_encouragement", "studyVariant mismatch.");
  assert(spec.primaryContrast === "both_roles_minus_neither_role", "primaryContrast mismatch.");
  assert(Number.isInteger(spec.replicates) && spec.replicates >= 250, "replicates must be at least 250.");
  for (const field of [
    "clustersPerArm",
    "baselineCompletionRates",
    "absolutePolicyEffects",
    "intraclusterCorrelations",
  ]) {
    assert(Array.isArray(spec[field]) && spec[field].length > 0, `${field} must be non-empty.`);
  }
  assert(spec.clustersPerArm.every((value) => Number.isInteger(value) && value >= 8), "clustersPerArm is invalid.");
  assert(spec.baselineCompletionRates.every((value) => value > 0 && value < 1), "baselineCompletionRates is invalid.");
  assert(spec.absolutePolicyEffects.every((value) => value >= 0 && value < 1), "absolutePolicyEffects is invalid.");
  assert(spec.intraclusterCorrelations.every((value) => value >= 0 && value < 1), "intraclusterCorrelations is invalid.");
  assert(spec.meanEligibleDyadsPerCluster > 0, "meanEligibleDyadsPerCluster must be positive.");
  assert(spec.clusterSizeCoefficientOfVariation >= 0, "clusterSizeCoefficientOfVariation must be non-negative.");
  assert(spec.maximumEligibleDyadsPerCluster >= spec.meanEligibleDyadsPerCluster, "maximumEligibleDyadsPerCluster is too small.");
  assert(spec.complianceRate > 0 && spec.complianceRate <= 1, "complianceRate is invalid.");
  assert(spec.contaminationRate >= 0 && spec.contaminationRate < 1, "contaminationRate is invalid.");
  assert(spec.attritionRate >= 0 && spec.attritionRate < 1, "attritionRate is invalid.");
  assert(spec.scientificIntervalLevelBps === 9500, "scientificIntervalLevelBps must remain 9500.");
  assert(spec.executionAuthorized === false, "executionAuthorized must remain false.");
  assert(spec.realUserAssignmentAllowed === false, "realUserAssignmentAllowed must remain false.");
}

export function simulateScenario(spec, scenario, random) {
  let significant = 0;
  let intervalCoversTruth = 0;
  const estimates = [];
  const standardErrors = [];
  const halfWidths = [];
  const observedDyads = [];

  const effectiveEffect =
    scenario.absolutePolicyEffect * spec.complianceRate * (1 - spec.contaminationRate);
  const armProbabilities = {
    neither_role: scenario.baselineCompletionRate,
    role_a_only: scenario.baselineCompletionRate + effectiveEffect / 2,
    role_b_only: scenario.baselineCompletionRate + effectiveEffect / 2,
    both_roles: scenario.baselineCompletionRate + effectiveEffect,
  };

  for (let replicate = 0; replicate < spec.replicates; replicate += 1) {
    const records = [];
    for (const [armKey, probability] of Object.entries(armProbabilities)) {
      for (let clusterIndex = 0; clusterIndex < scenario.clustersPerArm; clusterIndex += 1) {
        const eligibleDyadCount = lognormalClusterSize(
          spec.meanEligibleDyadsPerCluster,
          spec.clusterSizeCoefficientOfVariation,
          spec.maximumEligibleDyadsPerCluster,
          random,
        );
        const observedDyadCount = Math.max(
          1,
          binomial(eligibleDyadCount, 1 - spec.attritionRate, random),
        );
        const clusterProbability = betaFromMeanAndIcc(
          clamp(probability, 1e-6, 1 - 1e-6),
          scenario.intraclusterCorrelation,
          random,
        );
        const reviewedOutcomeTotal = binomial(observedDyadCount, clusterProbability, random);
        records.push({
          clusterKey: `synthetic:${armKey}:${replicate}:${clusterIndex}`,
          armKey,
          observedDyadCount,
          reviewedOutcomeTotal,
        });
      }
    }

    const estimate = estimatePrimaryPolicyItt(records);
    const lower = estimate.confidenceInterval95[0];
    const upper = estimate.confidenceInterval95[1];
    if (lower > 0 || upper < 0) significant += 1;
    if (lower <= effectiveEffect && effectiveEffect <= upper) intervalCoversTruth += 1;
    estimates.push(estimate.estimate);
    standardErrors.push(estimate.standardError);
    halfWidths.push(estimate.criticalValue95 * estimate.standardError);
    observedDyads.push(
      estimate.arms.control.observedDyadCount + estimate.arms.treated.observedDyadCount,
    );
  }

  estimates.sort((a, b) => a - b);
  standardErrors.sort((a, b) => a - b);
  halfWidths.sort((a, b) => a - b);
  observedDyads.sort((a, b) => a - b);

  const rejectionInterval95 = wilsonInterval(significant, spec.replicates);
  const coverageInterval95 = wilsonInterval(intervalCoversTruth, spec.replicates);

  return {
    ...scenario,
    totalClusters: scenario.clustersPerArm * 4,
    intendedAbsolutePolicyEffect: scenario.absolutePolicyEffect,
    effectiveIttEffectAfterDilution: effectiveEffect,
    simulatedPowerOrTypeIError: significant / spec.replicates,
    simulatedPowerOrTypeIErrorMonteCarloInterval95: rejectionInterval95,
    empiricalCoverage95: intervalCoversTruth / spec.replicates,
    empiricalCoverageMonteCarloInterval95: coverageInterval95,
    medianEstimate: quantile(estimates, 0.5),
    estimateQuantiles: {
      p05: quantile(estimates, 0.05),
      p50: quantile(estimates, 0.5),
      p95: quantile(estimates, 0.95),
    },
    medianStandardError: quantile(standardErrors, 0.5),
    medianConfidenceHalfWidth95: quantile(halfWidths, 0.5),
    medianObservedDyadsInPrimaryContrast: quantile(observedDyads, 0.5),
  };
}
