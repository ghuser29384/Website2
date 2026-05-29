import evaluationProfileJson from "../../../config/moral-trade/evaluation-profile.json";

export const MORAL_TRADE_EVALUATION_VALIDATOR_VERSION =
  "moral-trade-evaluation-validator-v0.1";

export type MoralTradeEvaluationMetric = {
  key: string;
  label: string;
  definition: string;
  direction: "increase" | "decrease" | "band";
  target: string;
  source: string;
  publicReporting: string;
  dataBoundary: string;
};

export type MoralTradeEvaluationProfile = {
  version: string;
  purpose: string;
  cadence: string;
  metrics: MoralTradeEvaluationMetric[];
  cohortSlices: string[];
  privacyBoundaries: string[];
  promotionGates: Array<{ stage: string; rule: string }>;
  evaluationTests: string[];
};

export interface MoralTradeEvaluationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeEvaluationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-evaluation-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeEvaluationCheck[];
  blockers: string[];
}

export interface MoralTradeSurfacingEvent {
  id: string;
  eligible: boolean;
  surfaced: boolean;
  slices: Record<string, string | null | undefined>;
}

export interface MoralTradeSurfacingParityCell {
  key: string;
  slice: string;
  value: string;
  eligibleCount: number;
  surfacedCount: number;
  surfacingRate: number | null;
  absoluteGapFromOverall: number | null;
  status: "pass" | "suppressed" | "needs_review" | "reviewed";
}

export interface MoralTradeSurfacingParityAudit {
  status: "pass" | "fail" | "insufficient_data";
  eligibleCount: number;
  surfacedCount: number;
  overallSurfacingRate: number | null;
  minCellSize: number;
  maxAbsoluteGap: number;
  cells: MoralTradeSurfacingParityCell[];
  blockers: string[];
}

export interface MoralTradeUxMetricSnapshot {
  period: string;
  startedDraftCount: number;
  validDraftCount: number;
  medianTimeToValidDraftMinutes: number | null;
  explanationHelpfulMedianRating: number | null;
  reviewerMedianMinutesPerDecision: number | null;
  reviewerOverruleRate: number | null;
}

export interface MoralTradeUxReadinessAudit {
  status: "pass" | "fail" | "insufficient_data";
  currentPeriod: string;
  previousPeriod: string | null;
  checks: MoralTradeEvaluationCheck[];
  blockers: string[];
}

export interface MoralTradeEvaluationSampleAudits {
  surfacingParityAudit: MoralTradeSurfacingParityAudit;
  uxReadinessAudit: MoralTradeUxReadinessAudit;
}

const evaluationProfile = evaluationProfileJson as MoralTradeEvaluationProfile;

export const MORAL_TRADE_SURFACING_PARITY_DEFAULTS = {
  minCellSize: 5,
  maxAbsoluteGap: 0.2,
  sliceKeys: [
    "trade_format",
    "cause_area_pair",
    "geography_bucket",
    "privacy_stage",
    "optional_governed_sensitive_attribute",
  ],
} as const;

export const MORAL_TRADE_UX_READINESS_DEFAULTS = {
  minStartedDrafts: 5,
  maxMedianTimeToValidDraftMinutes: 30,
  minExplanationHelpfulMedianRating: 4,
  maxReviewerMedianMinutesPerDecision: 20,
  maxReviewerOverruleRateIncrease: 0.03,
} as const;

const REQUIRED_METRICS = [
  "draft_completion_rate",
  "time_to_valid_draft",
  "blocked_proposal_precision",
  "privacy_leakage_incidents",
  "explanation_helpfulness",
  "reviewer_efficiency_minutes",
  "false_match_rate",
  "subgroup_surfacing_parity",
  "human_overrule_rate",
  "appeal_overturn_rate",
  "evidence_review_sla",
  "duplicate_proof_miss_rate",
  "unresolved_dispute_share",
] as const;

const REQUIRED_PRIVACY_BOUNDARIES = [
  "aggregate_only_by_default",
  "no_raw_private_wish_text",
  "no_contact_details",
  "no_source_note_leakage",
  "small_cell_suppression",
] as const;

const REQUIRED_PROMOTION_GATES = [
  "shadow_mode",
  "assist_mode",
  "guarded_automation",
  "human_controlled_decisions",
] as const;

const REQUIRED_COHORT_SLICES = [
  "trade_format",
  "cause_area_pair",
  "geography_bucket",
  "verification_method",
  "privacy_stage",
  "optional_governed_sensitive_attribute",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeEvaluationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeEvaluationProfile() {
  return evaluationProfile;
}

function normalizeSurfacingSliceValue(value: string | null | undefined) {
  const cleaned = String(value ?? "").trim().toLowerCase();

  if (!cleaned) {
    return "unknown";
  }

  if (
    cleaned.length > 80 ||
    /@/.test(cleaned) ||
    /\bhttps?:\/\//.test(cleaned) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(cleaned)
  ) {
    return "redacted_value";
  }

  return cleaned.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "unknown";
}

function roundRate(value: number) {
  return Number(value.toFixed(4));
}

function hasNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function didNotRegress(current: number | null, previous: number | null, direction: "lower" | "higher") {
  if (!hasNumber(current)) {
    return false;
  }

  if (!hasNumber(previous)) {
    return true;
  }

  return direction === "lower" ? current <= previous : current >= previous;
}

export function auditMoralTradeSurfacingParity({
  events,
  maxAbsoluteGap = MORAL_TRADE_SURFACING_PARITY_DEFAULTS.maxAbsoluteGap,
  minCellSize = MORAL_TRADE_SURFACING_PARITY_DEFAULTS.minCellSize,
  reviewedDeviationKeys = [],
  sliceKeys = [...MORAL_TRADE_SURFACING_PARITY_DEFAULTS.sliceKeys],
}: {
  events: readonly MoralTradeSurfacingEvent[];
  maxAbsoluteGap?: number;
  minCellSize?: number;
  reviewedDeviationKeys?: readonly string[];
  sliceKeys?: readonly string[];
}): MoralTradeSurfacingParityAudit {
  const eligibleEvents = events.filter((event) => event.eligible);
  const eligibleCount = eligibleEvents.length;
  const surfacedCount = eligibleEvents.filter((event) => event.surfaced).length;

  if (!eligibleCount) {
    return {
      status: "insufficient_data",
      eligibleCount: 0,
      surfacedCount: 0,
      overallSurfacingRate: null,
      minCellSize,
      maxAbsoluteGap,
      cells: [],
      blockers: ["no_eligible_surfacing_events"],
    };
  }

  const overallSurfacingRate = surfacedCount / eligibleCount;
  const reviewedKeys = new Set(reviewedDeviationKeys);
  const groups = new Map<string, MoralTradeSurfacingParityCell>();

  for (const event of eligibleEvents) {
    for (const slice of sliceKeys) {
      const value = normalizeSurfacingSliceValue(event.slices[slice]);
      const key = `${slice}:${value}`;
      const current =
        groups.get(key) ??
        ({
          key,
          slice,
          value,
          eligibleCount: 0,
          surfacedCount: 0,
          surfacingRate: null,
          absoluteGapFromOverall: null,
          status: "pass",
        } satisfies MoralTradeSurfacingParityCell);

      current.eligibleCount += 1;
      current.surfacedCount += event.surfaced ? 1 : 0;
      groups.set(key, current);
    }
  }

  const cells = [...groups.values()]
    .map((cell) => {
      if (cell.eligibleCount < minCellSize) {
        return {
          ...cell,
          surfacedCount: 0,
          surfacingRate: null,
          absoluteGapFromOverall: null,
          status: "suppressed" as const,
        };
      }

      const surfacingRate = cell.surfacedCount / cell.eligibleCount;
      const absoluteGapFromOverall = Math.abs(surfacingRate - overallSurfacingRate);

      return {
        ...cell,
        surfacingRate: roundRate(surfacingRate),
        absoluteGapFromOverall: roundRate(absoluteGapFromOverall),
        status:
          absoluteGapFromOverall > maxAbsoluteGap
            ? reviewedKeys.has(cell.key)
              ? ("reviewed" as const)
              : ("needs_review" as const)
            : ("pass" as const),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));

  const blockers = cells
    .filter((cell) => cell.status === "needs_review")
    .map((cell) => `unreviewed_surfacing_gap:${cell.key}`);

  return {
    status: blockers.length ? "fail" : "pass",
    eligibleCount,
    surfacedCount,
    overallSurfacingRate: roundRate(overallSurfacingRate),
    minCellSize,
    maxAbsoluteGap,
    cells,
    blockers,
  };
}

export function auditMoralTradeUxReadiness({
  current,
  previous = null,
  maxMedianTimeToValidDraftMinutes =
    MORAL_TRADE_UX_READINESS_DEFAULTS.maxMedianTimeToValidDraftMinutes,
  maxReviewerMedianMinutesPerDecision =
    MORAL_TRADE_UX_READINESS_DEFAULTS.maxReviewerMedianMinutesPerDecision,
  maxReviewerOverruleRateIncrease =
    MORAL_TRADE_UX_READINESS_DEFAULTS.maxReviewerOverruleRateIncrease,
  minExplanationHelpfulMedianRating =
    MORAL_TRADE_UX_READINESS_DEFAULTS.minExplanationHelpfulMedianRating,
  minStartedDrafts = MORAL_TRADE_UX_READINESS_DEFAULTS.minStartedDrafts,
}: {
  current: MoralTradeUxMetricSnapshot;
  previous?: MoralTradeUxMetricSnapshot | null;
  maxMedianTimeToValidDraftMinutes?: number;
  maxReviewerMedianMinutesPerDecision?: number;
  maxReviewerOverruleRateIncrease?: number;
  minExplanationHelpfulMedianRating?: number;
  minStartedDrafts?: number;
}): MoralTradeUxReadinessAudit {
  const sampleReady = current.startedDraftCount >= minStartedDrafts && current.validDraftCount > 0;
  const timeReady =
    hasNumber(current.medianTimeToValidDraftMinutes) &&
    current.medianTimeToValidDraftMinutes <= maxMedianTimeToValidDraftMinutes &&
    didNotRegress(
      current.medianTimeToValidDraftMinutes,
      previous?.medianTimeToValidDraftMinutes ?? null,
      "lower",
    );
  const helpfulnessReady =
    hasNumber(current.explanationHelpfulMedianRating) &&
    current.explanationHelpfulMedianRating >= minExplanationHelpfulMedianRating &&
    didNotRegress(
      current.explanationHelpfulMedianRating,
      previous?.explanationHelpfulMedianRating ?? null,
      "higher",
    );
  const reviewerEfficiencyReady =
    hasNumber(current.reviewerMedianMinutesPerDecision) &&
    current.reviewerMedianMinutesPerDecision <= maxReviewerMedianMinutesPerDecision &&
    didNotRegress(
      current.reviewerMedianMinutesPerDecision,
      previous?.reviewerMedianMinutesPerDecision ?? null,
      "lower",
    );
  const previousOverruleRate = previous?.reviewerOverruleRate ?? null;
  const overruleReady =
    hasNumber(current.reviewerOverruleRate) &&
    (!hasNumber(previousOverruleRate) ||
      current.reviewerOverruleRate <= previousOverruleRate + maxReviewerOverruleRateIncrease);
  const checks = [
    check(
      "ux-sample-size",
      "UX metric sample is large enough to evaluate",
      sampleReady,
      `${current.startedDraftCount} started drafts, ${current.validDraftCount} valid drafts.`,
    ),
    check(
      "time-to-valid-draft",
      "Median time to first valid draft is bounded and non-regressing",
      timeReady,
      `${current.medianTimeToValidDraftMinutes ?? "missing"} minutes.`,
    ),
    check(
      "explanation-helpfulness",
      "Factor-code explanations stay helpful",
      helpfulnessReady,
      `${current.explanationHelpfulMedianRating ?? "missing"} median rating.`,
    ),
    check(
      "reviewer-efficiency",
      "Reviewer median decision time is bounded and non-regressing",
      reviewerEfficiencyReady,
      `${current.reviewerMedianMinutesPerDecision ?? "missing"} minutes per decision.`,
    ),
    check(
      "human-overrule-stability",
      "Human overrule rate is stable before promotion",
      overruleReady,
      `${current.reviewerOverruleRate ?? "missing"} current rate.`,
    ),
  ];
  const blockers = [
    ...(sampleReady ? [] : ["ux_sample_too_small"]),
    ...(timeReady ? [] : ["time_to_valid_draft_not_improving"]),
    ...(helpfulnessReady ? [] : ["explanation_helpfulness_not_improving"]),
    ...(reviewerEfficiencyReady ? [] : ["reviewer_efficiency_not_improving"]),
    ...(overruleReady ? [] : ["human_overrule_rate_unstable"]),
  ];

  return {
    status: sampleReady ? (blockers.length ? "fail" : "pass") : "insufficient_data",
    currentPeriod: current.period,
    previousPeriod: previous?.period ?? null,
    checks,
    blockers,
  };
}

export function getMoralTradeEvaluationSampleAudits(): MoralTradeEvaluationSampleAudits {
  return {
    surfacingParityAudit: auditMoralTradeSurfacingParity({
      events: [
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `sample-pledge-west-${index}`,
          eligible: true,
          surfaced: index < 3,
          slices: {
            trade_format: "pledge_swap",
            cause_area_pair: "animal_welfare__global_poverty",
            geography_bucket: "US-West",
            privacy_stage: "broad_preview",
            optional_governed_sensitive_attribute: "consented_group_a",
          },
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `sample-offset-east-${index}`,
          eligible: true,
          surfaced: index < 3,
          slices: {
            trade_format: "donation_offset",
            cause_area_pair: "climate__global_health",
            geography_bucket: "US-East",
            privacy_stage: "broad_preview",
            optional_governed_sensitive_attribute: "consented_group_b",
          },
        })),
      ],
    }),
    uxReadinessAudit: auditMoralTradeUxReadiness({
      previous: {
        period: "2026-04",
        startedDraftCount: 12,
        validDraftCount: 6,
        medianTimeToValidDraftMinutes: 24,
        explanationHelpfulMedianRating: 4.1,
        reviewerMedianMinutesPerDecision: 16,
        reviewerOverruleRate: 0.18,
      },
      current: {
        period: "2026-05",
        startedDraftCount: 14,
        validDraftCount: 9,
        medianTimeToValidDraftMinutes: 18,
        explanationHelpfulMedianRating: 4.4,
        reviewerMedianMinutesPerDecision: 12,
        reviewerOverruleRate: 0.17,
      },
    }),
  };
}

export function validateMoralTradeEvaluationProfile(
  profile: MoralTradeEvaluationProfile = evaluationProfile,
): MoralTradeEvaluationValidation {
  const metricKeys = profile.metrics.map((metric) => metric.key);
  const promotionStages = profile.promotionGates.map((gate) => gate.stage);
  const sampleAudits = getMoralTradeEvaluationSampleAudits();
  const checks = [
    check(
      "required-metrics",
      "Codex and reviewer quality metrics",
      hasAll(metricKeys, REQUIRED_METRICS) &&
        profile.metrics.every((metric) => metric.definition && metric.target && metric.source),
      metricKeys.join(", "),
    ),
    check(
      "privacy-boundaries",
      "Privacy-safe measurement boundaries",
      hasAll(profile.privacyBoundaries, REQUIRED_PRIVACY_BOUNDARIES) &&
        profile.metrics.every((metric) => !/raw private/i.test(metric.publicReporting)),
      profile.privacyBoundaries.join(", "),
    ),
    check(
      "cohort-slices",
      "Fairness and review slices",
      hasAll(profile.cohortSlices, REQUIRED_COHORT_SLICES),
      profile.cohortSlices.join(", "),
    ),
    check(
      "promotion-gates",
      "Rollout promotion gates",
      hasAll(promotionStages, REQUIRED_PROMOTION_GATES) &&
        profile.promotionGates.some(
          (gate) =>
            gate.stage === "human_controlled_decisions" &&
            /Safety blocking.*matching disclosure.*reviewed completion.*dispute resolution/i.test(
              gate.rule,
            ),
        ),
      promotionStages.join(", "),
    ),
    check(
      "zero-incident-targets",
      "Privacy and duplicate-proof targets",
      profile.metrics.some(
        (metric) =>
          metric.key === "privacy_leakage_incidents" &&
          metric.direction === "decrease" &&
          /zero/i.test(metric.target),
      ) &&
        profile.metrics.some(
          (metric) => metric.key === "duplicate_proof_miss_rate" && /zero/i.test(metric.target),
        ),
      "privacy_leakage_incidents and duplicate_proof_miss_rate have zero-oriented targets.",
    ),
    check(
      "evaluation-tests",
      "Evaluation test hooks",
      profile.evaluationTests.includes("evaluation_profile_validator") &&
        profile.evaluationTests.includes("surfacing_parity_audit") &&
        profile.evaluationTests.includes("ux_readiness_audit") &&
        profile.evaluationTests.includes("health_route_contract_smoke") &&
        profile.evaluationTests.includes("public_technical_spec_smoke"),
      profile.evaluationTests.join(", "),
    ),
    check(
      "sample-audits",
      "Deterministic sample evaluation audits execute",
      sampleAudits.surfacingParityAudit.status === "pass" &&
        sampleAudits.uxReadinessAudit.status === "pass",
      `surfacing ${sampleAudits.surfacingParityAudit.status}; ux ${sampleAudits.uxReadinessAudit.status}`,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-evaluation-profile",
    validatorVersion: MORAL_TRADE_EVALUATION_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
