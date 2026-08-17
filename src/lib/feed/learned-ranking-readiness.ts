import { PARETO_HEURISTIC_MODEL_KEY } from "../pareto-recommendation-model";

export const DETERMINISTIC_PARETO_SAFE_BOOTSTRAP =
  "deterministic_pareto_safe_bootstrap" as const;

export const LEARNED_RANKING_READINESS_STATUSES = [
  "not_ready",
  "eligible_for_calibration_review",
] as const;

export const REQUIRED_LEARNED_RANKING_OBSERVATIONS = [
  "exposure",
  "response",
  "terminalOutcome",
  "completion",
  "additionality",
  "safety",
  "observationWindowDays",
] as const;

export const REQUIRED_LEARNED_RANKING_REVIEWS = [
  "sourceBinding",
  "independentCalibration",
  "privacy",
  "safety",
] as const;

export type LearnedRankingReadinessStatus =
  (typeof LEARNED_RANKING_READINESS_STATUSES)[number];

export type LearnedRankingObservationKey =
  (typeof REQUIRED_LEARNED_RANKING_OBSERVATIONS)[number];

export type LearnedRankingReviewKey =
  (typeof REQUIRED_LEARNED_RANKING_REVIEWS)[number];

export type LearnedRankingObservationProvenance =
  | "durable_real_observations"
  | "synthetic_or_qa"
  | "mixed_or_unknown"
  | "unavailable";

export type LearnedRankingReviewDecision =
  | "approved"
  | "not_approved"
  | "unavailable";

export type LearnedRankingObservation =
  | {
      availability: "available";
      value: number;
    }
  | {
      availability: "unavailable";
      reason: string;
    };

export interface ReviewedLearnedRankingPolicy {
  approval: "approved" | "not_approved";
  minimums: Partial<Record<LearnedRankingObservationKey, number>>;
  policyId: string;
  policyVersion: string;
  sourceHash: string;
}

export interface LearnedRankingReadinessInput {
  observationProvenance: LearnedRankingObservationProvenance;
  observations: Partial<
    Record<LearnedRankingObservationKey, LearnedRankingObservation>
  >;
  policy: ReviewedLearnedRankingPolicy | null;
  reviews: Partial<Record<LearnedRankingReviewKey, LearnedRankingReviewDecision>>;
}

export type LearnedRankingReadinessReasonCode =
  | "reviewed_policy_missing"
  | "reviewed_policy_not_approved"
  | "reviewed_policy_identity_invalid"
  | "observation_provenance_not_durable_real"
  | `reviewed_minimum_invalid:${LearnedRankingObservationKey}`
  | `observation_unavailable:${LearnedRankingObservationKey}`
  | `observation_invalid:${LearnedRankingObservationKey}`
  | `observation_below_reviewed_minimum:${LearnedRankingObservationKey}`
  | `review_not_approved:${LearnedRankingReviewKey}`;

export interface LearnedRankingReadinessDecision {
  authoritativeImplementationKey: typeof PARETO_HEURISTIC_MODEL_KEY;
  authoritativeRanker: typeof DETERMINISTIC_PARETO_SAFE_BOOTSTRAP;
  learnedRankingMayActivate: false;
  observations: Record<LearnedRankingObservationKey, LearnedRankingObservation>;
  reasonCodes: LearnedRankingReadinessReasonCode[];
  status: LearnedRankingReadinessStatus;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasPolicyIdentity(policy: ReviewedLearnedRankingPolicy) {
  return [policy.policyId, policy.policyVersion, policy.sourceHash].every(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function normalizeObservations(
  observations: LearnedRankingReadinessInput["observations"],
) {
  const normalized = {} as Record<
    LearnedRankingObservationKey,
    LearnedRankingObservation
  >;
  for (const key of REQUIRED_LEARNED_RANKING_OBSERVATIONS) {
    normalized[key] = observations[key] ?? {
      availability: "unavailable",
      reason: "missing_observation",
    };
  }
  return normalized;
}

/**
 * Determines whether durable observation evidence is complete enough to enter
 * an independent calibration review. This function never authorizes a learned
 * ranker, changes the active Feed ranker, or supplies missing thresholds.
 */
export function evaluateLearnedRankingReadiness(
  input: LearnedRankingReadinessInput,
): LearnedRankingReadinessDecision {
  const reasonCodes: LearnedRankingReadinessReasonCode[] = [];
  const observations = normalizeObservations(input.observations);
  const { policy } = input;

  if (!policy) {
    reasonCodes.push("reviewed_policy_missing");
  } else {
    if (policy.approval !== "approved") {
      reasonCodes.push("reviewed_policy_not_approved");
    }
    if (!hasPolicyIdentity(policy)) {
      reasonCodes.push("reviewed_policy_identity_invalid");
    }
    for (const key of REQUIRED_LEARNED_RANKING_OBSERVATIONS) {
      if (!isNonNegativeFiniteNumber(policy.minimums[key])) {
        reasonCodes.push(`reviewed_minimum_invalid:${key}`);
      }
    }
  }

  if (input.observationProvenance !== "durable_real_observations") {
    reasonCodes.push("observation_provenance_not_durable_real");
  }

  for (const key of REQUIRED_LEARNED_RANKING_OBSERVATIONS) {
    const observation = observations[key];
    if (observation.availability === "unavailable") {
      reasonCodes.push(`observation_unavailable:${key}`);
      continue;
    }
    if (!isNonNegativeFiniteNumber(observation.value)) {
      reasonCodes.push(`observation_invalid:${key}`);
      continue;
    }
    const minimum = policy?.minimums[key];
    if (
      isNonNegativeFiniteNumber(minimum) &&
      observation.value < minimum
    ) {
      reasonCodes.push(`observation_below_reviewed_minimum:${key}`);
    }
  }

  for (const key of REQUIRED_LEARNED_RANKING_REVIEWS) {
    if (input.reviews[key] !== "approved") {
      reasonCodes.push(`review_not_approved:${key}`);
    }
  }

  return {
    authoritativeImplementationKey: PARETO_HEURISTIC_MODEL_KEY,
    authoritativeRanker: DETERMINISTIC_PARETO_SAFE_BOOTSTRAP,
    learnedRankingMayActivate: false,
    observations,
    reasonCodes,
    status: reasonCodes.length
      ? "not_ready"
      : "eligible_for_calibration_review",
  };
}
