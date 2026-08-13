import { ARMS, createPrng, sha256 } from "./assignment.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function t95(df) {
  const z = 1.959963984540054;
  if (!Number.isFinite(df) || df <= 0) return Infinity;
  return z + (z ** 3 + z) / (4 * df) +
    (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2) +
    (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
}

function arm(records, armKey) {
  const rows = records.filter((row) => row.armKey === armKey);
  assert(rows.length >= 2, `Arm ${armKey} requires at least two clusters.`);
  const observedDyadCount = rows.reduce((sum, row) => sum + row.observedDyadCount, 0);
  const reviewedOutcomeTotal = rows.reduce((sum, row) => sum + row.reviewedOutcomeTotal, 0);
  assert(observedDyadCount > 0, `Arm ${armKey} has no resolved dyads.`);
  const mean = reviewedOutcomeTotal / observedDyadCount;
  const residualSquares = rows.reduce((sum, row) => {
    const residual = row.reviewedOutcomeTotal - mean * row.observedDyadCount;
    return sum + residual * residual;
  }, 0);
  const clusterCount = rows.length;
  return {
    armKey,
    clusterCount,
    observedDyadCount,
    reviewedOutcomeTotal,
    mean,
    variance: (clusterCount / (clusterCount - 1)) * residualSquares /
      (observedDyadCount * observedDyadCount),
  };
}

export function estimatePrimaryPolicyItt(records) {
  assert(Array.isArray(records) && records.length > 0, "records must be non-empty.");
  const keys = new Set();
  for (const row of records) {
    assert(row && typeof row === "object", "record must be an object.");
    assert(/^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(row.clusterKey), "clusterKey must be synthetic.");
    assert(ARMS.includes(row.armKey), "armKey is invalid.");
    assert(Number.isInteger(row.observedDyadCount) && row.observedDyadCount > 0, "observedDyadCount must be positive.");
    assert(Number.isFinite(row.reviewedOutcomeTotal) && row.reviewedOutcomeTotal >= 0 &&
      row.reviewedOutcomeTotal <= row.observedDyadCount, "reviewedOutcomeTotal is invalid.");
    assert(!keys.has(row.clusterKey), "cluster records must be unique.");
    keys.add(row.clusterKey);
  }
  const control = arm(records, "neither_role");
  const treated = arm(records, "both_roles");
  const estimate = treated.mean - control.mean;
  const standardError = Math.sqrt(treated.variance + control.variance);
  const degreesOfFreedom = Math.min(control.clusterCount, treated.clusterCount) - 1;
  const criticalValue95 = t95(degreesOfFreedom);
  return {
    estimandKey: "bilateral_encouragement_policy_itt",
    claimScope: "policy_level",
    contrast: "both_roles_minus_neither_role",
    estimate,
    standardError,
    z: standardError > 0 ? estimate / standardError : null,
    confidenceInterval95: standardError > 0
      ? [estimate - criticalValue95 * standardError, estimate + criticalValue95 * standardError]
      : [estimate, estimate],
    degreesOfFreedom,
    criticalValue95,
    arms: { control, treated },
    participantSpecificCreditAuthorized: false,
    additiveParticipantAttributionAuthorized: false,
  };
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
}

export function randomizationTest(records, { seed, permutations = 10000 } = {}) {
  assert(Number.isInteger(permutations) && permutations >= 1000, "permutations must be at least 1000.");
  const observed = estimatePrimaryPolicyItt(records).estimate;
  const labels = records.map((row) => row.armKey);
  const random = createPrng(seed ?? "synthetic:trade-analysis-default-seed");
  let extreme = 0;
  for (let iteration = 0; iteration < permutations; iteration += 1) {
    const permuted = [...labels];
    shuffle(permuted, random);
    const estimate = estimatePrimaryPolicyItt(
      records.map((row, index) => ({ ...row, armKey: permuted[index] })),
    ).estimate;
    if (Math.abs(estimate) >= Math.abs(observed) - 1e-15) extreme += 1;
  }
  return {
    method: "monte_carlo_cluster_randomization_test",
    permutations,
    pValueTwoSided: (extreme + 1) / (permutations + 1),
    observedEstimate: observed,
    seedCommitment: sha256(seed ?? "synthetic:trade-analysis-default-seed"),
  };
}

export function analyzeTradeStudy(records, options = {}) {
  const payload = {
    analysisVersion: "commitments-trade-policy-itt-analysis-v1",
    estimate: estimatePrimaryPolicyItt(records),
    inference: randomizationTest(records, options),
    evidenceBoundary: {
      supports: ["assignment_policy_itt", "reviewed_outcome_quantity"],
      doesNotSupport: [
        "participant_expected_additional",
        "participant_direct_causal_attribution",
        "verified_counterfactual_additionality",
      ],
    },
  };
  return { ...payload, analysisPayloadHash: sha256(payload) };
}
