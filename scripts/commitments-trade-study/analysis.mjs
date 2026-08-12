import { ARMS, createPrng, sha256 } from "./assignment.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}


function studentTCritical95(degreesOfFreedom) {
  const z = 1.959963984540054;
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) return Infinity;
  const df = degreesOfFreedom;
  return (
    z +
    (z ** 3 + z) / (4 * df) +
    (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2) +
    (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3)
  );
}

function armSummary(records, armKey) {
  const selected = records.filter((record) => record.armKey === armKey);
  assert(selected.length >= 2, `Arm ${armKey} requires at least two clusters.`);
  const totalEligible = selected.reduce((sum, record) => sum + record.observedDyadCount, 0);
  const totalOutcome = selected.reduce((sum, record) => sum + record.reviewedOutcomeTotal, 0);
  assert(totalEligible > 0, `Arm ${armKey} has no resolved dyads.`);
  const mean = totalOutcome / totalEligible;
  const residuals = selected.map(
    (record) => record.reviewedOutcomeTotal - mean * record.observedDyadCount,
  );
  const n = selected.length;
  const variance =
    (n / (n - 1)) *
    residuals.reduce((sum, residual) => sum + residual * residual, 0) /
    (totalEligible * totalEligible);
  return {
    armKey,
    clusterCount: n,
    observedDyadCount: totalEligible,
    reviewedOutcomeTotal: totalOutcome,
    mean,
    variance,
  };
}

export function estimatePrimaryPolicyItt(records) {
  assert(Array.isArray(records) && records.length > 0, "records must be non-empty.");
  const clusterKeys = new Set();
  for (const record of records) {
    assert(record && typeof record === "object", "record must be an object.");
    assert(/^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(record.clusterKey), "clusterKey must be synthetic.");
    assert(ARMS.includes(record.armKey), "armKey is invalid.");
    assert(Number.isInteger(record.observedDyadCount) && record.observedDyadCount > 0, "observedDyadCount must be positive.");
    assert(Number.isFinite(record.reviewedOutcomeTotal), "reviewedOutcomeTotal must be finite.");
    assert(record.reviewedOutcomeTotal >= 0 && record.reviewedOutcomeTotal <= record.observedDyadCount, "reviewedOutcomeTotal must be within [0, observedDyadCount].");
    assert(!clusterKeys.has(record.clusterKey), "cluster records must be unique.");
    clusterKeys.add(record.clusterKey);
  }

  const control = armSummary(records, "neither_role");
  const treated = armSummary(records, "both_roles");
  const estimate = treated.mean - control.mean;
  const standardError = Math.sqrt(treated.variance + control.variance);
  const z = standardError > 0 ? estimate / standardError : null;
  const degreesOfFreedom = Math.min(control.clusterCount, treated.clusterCount) - 1;
  const criticalValue95 = studentTCritical95(degreesOfFreedom);
  const confidenceInterval95 = standardError > 0
    ? [estimate - criticalValue95 * standardError, estimate + criticalValue95 * standardError]
    : [estimate, estimate];

  return {
    estimandKey: "bilateral_encouragement_policy_itt",
    claimScope: "policy_level",
    contrast: "both_roles_minus_neither_role",
    estimate,
    standardError,
    z,
    confidenceInterval95,
    degreesOfFredom,
    criticalValue95,
    arms: { control, treated },
    participantSpecificCreditAuthorized: false,
    additiveParticipantAttributionAuthorized: false,
  };
}

function shuffleInPlace(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
}

/**
 * Monte Carlo randomization test preserving the exact arm counts. This is a
 * finite-sample diagnostic for the policy-level contrast, not an authorization
 * for participant-level causal credit.
 */
export function randomizationTest(records, { seed, permutations = 10000 } = {}) {
  assert(Number.isInteger(permutations) && permutations >= 1000, "permutations must be at least 1000.");
  const observed = estimatePrimaryPolicyItt(records).estimate;
  const armLabels = records.map((record) => record.armKey);
  const random = createPrng(seed ?? "synthetic:trade-analysis-default-seed");
  let asOrMoreExtreme = 0;

  for (let iteration = 0; iteration < permutations; iteration += 1) {
    const permuted = [...armLabels];
    shuffleInPlace(permuted, random);
    const candidate = records.map((record, index) => ({ ...record, armKey: permuted[index] }));
    const estimate = estimatePrimaryPolicyItt(candidate).estimate;
    if (Math.abs(estimate) >= Math.abs(observed) - 1e-15) asOrMoreExtreme += 1;
  }

  return {
    method: "monte_carlo_cluster_randomization_test",
    permutations,
    pValueTwoSided: (asOrMoreExtreme + 1) / (permutations + 1),
    observedEstimate: observed,
    seedCommitment: sha256(seed ?? "synthetic:trade-analysis-default-seed"),
  };
}

export function analyzeTradeStudy(records, options = {}) {
  const estimate = estimatePrimaryPolicyItt(records);
  const inference = randomizationTest(records, options);
  const payload = {
    analysisVersion: "commitments-trade-policy-itt-analysis-v1",
    estimate,
    inference,
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
