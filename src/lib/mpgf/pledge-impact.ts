export const MPGF_PLEDGE_IMPACT_SCHEMA_VERSION = "mpgf_pledge_impact_forecast_v1" as const;
export const MPGF_PLEDGE_IMPACT_EXPERIMENT_LABEL = "Experimental estimate" as const;

export type PledgeImpactPoolPublicKey =
  | "pool-bio-salary"
  | "pool-wild-research"
  | "pool-civic-open"
  | "pool-factory-transition";

export type PledgeImpactCampaignId =
  | "campaign-existential-risk-resilience"
  | "campaign-animal-welfare-transition"
  | "campaign-public-interest-knowledge";

export interface PledgeImpactPoolState {
  poolPublicKey: PledgeImpactPoolPublicKey;
  campaignId: PledgeImpactCampaignId;
  title: string;
  currency: "USD";
  thresholdsCents: readonly number[];
  fundedCents: number;
  contributorCount: number;
  deadlineAt: string;
  failureBonusEnabled: boolean;
}

export const PLEDGE_IMPACT_POOL_STATES: Record<
  PledgeImpactPoolPublicKey,
  PledgeImpactPoolState
> = {
  "pool-bio-salary": {
    poolPublicKey: "pool-bio-salary",
    campaignId: "campaign-existential-risk-resilience",
    title: "Verified biosecurity salary-gap pool",
    currency: "USD",
    thresholdsCents: [2_500_000],
    fundedCents: 2_364_000,
    contributorCount: 54,
    deadlineAt: "2026-07-22T23:59:59.000Z",
    failureBonusEnabled: false,
  },
  "pool-wild-research": {
    poolPublicKey: "pool-wild-research",
    campaignId: "campaign-animal-welfare-transition",
    title: "Wild-animal-suffering priority research pool",
    currency: "USD",
    thresholdsCents: [2_500_000],
    fundedCents: 1_680_000,
    contributorCount: 21,
    deadlineAt: "2026-08-15T23:59:59.000Z",
    failureBonusEnabled: true,
  },
  "pool-civic-open": {
    poolPublicKey: "pool-civic-open",
    campaignId: "campaign-public-interest-knowledge",
    title: "Open-source civic infrastructure pool",
    currency: "USD",
    thresholdsCents: [1_500_000],
    fundedCents: 1_204_000,
    contributorCount: 37,
    deadlineAt: "2026-08-05T23:59:59.000Z",
    failureBonusEnabled: false,
  },
  "pool-factory-transition": {
    poolPublicKey: "pool-factory-transition",
    campaignId: "campaign-animal-welfare-transition",
    title: "Factory-farming supplier transition assurance pool",
    currency: "USD",
    thresholdsCents: [3_400_000],
    fundedCents: 1_180_000,
    contributorCount: 61,
    deadlineAt: "2026-07-18T23:59:59.000Z",
    failureBonusEnabled: true,
  },
};

export const PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS = {
  priya: "pool-bio-salary",
  wild: "pool-wild-research",
  civic: "pool-civic-open",
  factory: "pool-factory-transition",
} as const satisfies Record<string, PledgeImpactPoolPublicKey>;

export interface PledgeImpactIntervalCents {
  estimateCents: number;
  lower90Cents: number;
  upper90Cents: number;
}

export interface PledgeImpactThresholdEstimate {
  thresholdIndex: number;
  thresholdCents: number;
  probabilityWithoutPledgeBps: number;
  probabilityWithPledgeBps: number;
  lower90ChangeBps: number;
  upper90ChangeBps: number;
}

export interface PledgeImpactFailureBonusEstimate {
  projectedCents: number;
  lower90Cents: number;
  upper90Cents: number;
  guaranteedMinimumCents: number | null;
}

export interface PledgeImpactForecastPoint {
  pledgeCents: number;
  additionalFundingFromOthers: PledgeImpactIntervalCents;
  allocatedFundingCredit: PledgeImpactIntervalCents;
  thresholds: PledgeImpactThresholdEstimate[];
  failureBonusConditionalOnFailure: PledgeImpactFailureBonusEstimate | null;
  decomposition: {
    directThresholdEffectCents: number;
    followOnContributionEffectCents: number;
    settlementAdjustmentCents: number;
    timingEffectCents: number;
  };
}

export interface PledgeImpactModelPerformance {
  sampleSize: number;
  evaluationWindowStart: string;
  evaluationWindowEnd: string;
  brierScore: number;
  calibrationErrorBps: number;
  notes: string;
}

export interface PledgeImpactForecastPayload {
  schemaVersion: typeof MPGF_PLEDGE_IMPACT_SCHEMA_VERSION;
  audience: "pool_state";
  experimental: true;
  currency: "USD";
  forecastErrorFloorBps: number;
  followOnEffect: {
    included: boolean;
    evidenceType: "randomized" | "quasi_experimental" | "none";
    evidenceReference: string | null;
  };
  points: PledgeImpactForecastPoint[];
  modelPerformance: PledgeImpactModelPerformance;
}

export interface PledgeImpactForecastRelease {
  id: string;
  poolPublicKey: PledgeImpactPoolPublicKey;
  campaignId: PledgeImpactCampaignId;
  forecastVersion: string;
  modelVersion: string;
  releasedAt: string;
  expiresAt: string;
  poolState: PledgeImpactPoolState;
  forecast: PledgeImpactForecastPayload;
  contentSha256: string;
}

export type PledgeImpactUnavailableReason =
  | "forecast_not_released"
  | "forecast_stale"
  | "forecast_invalid"
  | "pool_state_mismatch"
  | "campaign_mismatch"
  | "amount_out_of_range"
  | "service_unavailable";

export interface PledgeImpactMechanicalEffect {
  currentGapCents: number;
  remainingAfterPledgeCents: number;
  shareOfCurrentGapBps: number;
}

export interface PledgeImpactRecommendation {
  pledgeCents: number;
  thresholdIndex: number;
  lower90ChangeBps: number;
  forecastErrorFloorBps: number;
}

export interface PledgeImpactAvailableEstimate {
  status: "available";
  experimental: true;
  poolPublicKey: PledgeImpactPoolPublicKey;
  campaignId: PledgeImpactCampaignId;
  pledgeCents: number;
  currency: "USD";
  additionalFundingFromOthers: PledgeImpactIntervalCents;
  fundingMultiplier: number;
  allocatedFundingCredit: PledgeImpactIntervalCents;
  thresholds: PledgeImpactThresholdEstimate[];
  failureBonusConditionalOnFailure: PledgeImpactFailureBonusEstimate | null;
  decomposition: PledgeImpactForecastPoint["decomposition"];
  mechanicalEffect: PledgeImpactMechanicalEffect;
  recommendation: PledgeImpactRecommendation | null;
  followOnEffect: PledgeImpactForecastPayload["followOnEffect"];
  modelPerformance: PledgeImpactModelPerformance;
  forecastVersion: string;
  modelVersion: string;
  releasedAt: string;
  expiresAt: string;
  explanation: {
    causalEstimatesMayOverlap: true;
    allocatedCreditIsNotCausal: true;
    failureBonusIsConditionalOnFailure: true;
  };
}

export interface PledgeImpactUnavailableEstimate {
  status: "unavailable";
  experimental: true;
  poolPublicKey: PledgeImpactPoolPublicKey;
  campaignId: PledgeImpactCampaignId;
  pledgeCents: number;
  reason: PledgeImpactUnavailableReason;
  message: string;
  mechanicalEffect: PledgeImpactMechanicalEffect;
}

export type PledgeImpactApiResponse =
  | PledgeImpactAvailableEstimate
  | PledgeImpactUnavailableEstimate;

const forbiddenPersonalizationKeys = new Set([
  "userid",
  "user_id",
  "profileid",
  "profile_id",
  "viewerid",
  "viewer_id",
  "email",
  "demographic",
  "demographics",
  "paymenthistory",
  "payment_history",
  "sharingpropensity",
  "sharing_propensity",
  "individualhistory",
  "individual_history",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIntegerInRange(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isCanonicalTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function containsForbiddenPersonalizationKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenPersonalizationKey);
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    return forbiddenPersonalizationKeys.has(normalized) || containsForbiddenPersonalizationKey(child);
  });
}

function isInterval(value: unknown): value is PledgeImpactIntervalCents {
  if (!isRecord(value)) return false;
  const { estimateCents, lower90Cents, upper90Cents } = value;
  return (
    isSafeIntegerInRange(estimateCents, 0) &&
    isSafeIntegerInRange(lower90Cents, 0) &&
    isSafeIntegerInRange(upper90Cents, 0) &&
    Number(lower90Cents) <= Number(estimateCents) &&
    Number(estimateCents) <= Number(upper90Cents)
  );
}

function isThresholdEstimate(value: unknown): value is PledgeImpactThresholdEstimate {
  if (!isRecord(value)) return false;
  return (
    isSafeIntegerInRange(value.thresholdIndex, 1, 10) &&
    isSafeIntegerInRange(value.thresholdCents, 1) &&
    isSafeIntegerInRange(value.probabilityWithoutPledgeBps, 0, 10_000) &&
    isSafeIntegerInRange(value.probabilityWithPledgeBps, 0, 10_000) &&
    Number(value.probabilityWithPledgeBps) >= Number(value.probabilityWithoutPledgeBps) &&
    isSafeIntegerInRange(value.lower90ChangeBps, 0, 10_000) &&
    isSafeIntegerInRange(value.upper90ChangeBps, 0, 10_000) &&
    Number(value.lower90ChangeBps) <= Number(value.upper90ChangeBps)
  );
}

function isFailureBonusEstimate(value: unknown): value is PledgeImpactFailureBonusEstimate {
  if (!isRecord(value)) return false;
  return (
    isSafeIntegerInRange(value.projectedCents, 0) &&
    isSafeIntegerInRange(value.lower90Cents, 0) &&
    isSafeIntegerInRange(value.upper90Cents, 0) &&
    Number(value.lower90Cents) <= Number(value.projectedCents) &&
    Number(value.projectedCents) <= Number(value.upper90Cents) &&
    (value.guaranteedMinimumCents === null ||
      isSafeIntegerInRange(value.guaranteedMinimumCents, 0, Number(value.projectedCents)))
  );
}

function isForecastPoint(value: unknown, expectedThresholds: readonly number[]): value is PledgeImpactForecastPoint {
  if (!isRecord(value)) return false;
  if (!isSafeIntegerInRange(value.pledgeCents, 0)) return false;
  if (!isInterval(value.additionalFundingFromOthers) || !isInterval(value.allocatedFundingCredit)) return false;
  if (!Array.isArray(value.thresholds) || value.thresholds.length !== expectedThresholds.length) return false;
  if (!value.thresholds.every(isThresholdEstimate)) return false;
  if (
    !value.thresholds.every(
      (threshold, index) =>
        threshold.thresholdIndex === index + 1 && threshold.thresholdCents === expectedThresholds[index],
    )
  ) {
    return false;
  }
  if (
    value.failureBonusConditionalOnFailure !== null &&
    !isFailureBonusEstimate(value.failureBonusConditionalOnFailure)
  ) {
    return false;
  }
  if (!isRecord(value.decomposition)) return false;
  const decomposition = value.decomposition;
  return (
    isSafeIntegerInRange(decomposition.directThresholdEffectCents, 0) &&
    isSafeIntegerInRange(decomposition.followOnContributionEffectCents, 0) &&
    Number.isSafeInteger(decomposition.settlementAdjustmentCents) &&
    isSafeIntegerInRange(decomposition.timingEffectCents, 0)
  );
}

export function isPledgeImpactPoolPublicKey(value: string): value is PledgeImpactPoolPublicKey {
  return Object.prototype.hasOwnProperty.call(PLEDGE_IMPACT_POOL_STATES, value);
}

export function getPledgeImpactPoolState(poolPublicKey: PledgeImpactPoolPublicKey) {
  return PLEDGE_IMPACT_POOL_STATES[poolPublicKey];
}

export function getPledgeImpactCampaignId(poolPublicKey: PledgeImpactPoolPublicKey) {
  return PLEDGE_IMPACT_POOL_STATES[poolPublicKey].campaignId;
}

export function buildPledgeImpactContributionHref({
  amountCents,
  poolPublicKey,
  source,
}: {
  amountCents: number;
  poolPublicKey: PledgeImpactPoolPublicKey;
  source: "threshold-radar" | "discover-threshold";
}) {
  const campaignId = getPledgeImpactCampaignId(poolPublicKey);
  const dollars = Math.max(1, Math.round(amountCents / 100));
  const params = new URLSearchParams({
    campaign: campaignId,
    amount: String(dollars),
    pool: poolPublicKey,
    source,
  });
  return `/mpgf/contribute?${params.toString()}`;
}

export function calculatePledgeImpactMechanicalEffect(
  poolState: PledgeImpactPoolState,
  pledgeCents: number,
): PledgeImpactMechanicalEffect {
  const finalThresholdCents = poolState.thresholdsCents.at(-1) ?? 0;
  const currentGapCents = Math.max(0, finalThresholdCents - poolState.fundedCents);
  const boundedPledgeCents = Math.max(0, Math.round(pledgeCents));
  return {
    currentGapCents,
    remainingAfterPledgeCents: Math.max(0, currentGapCents - boundedPledgeCents),
    shareOfCurrentGapBps:
      currentGapCents === 0 ? 0 : Math.min(10_000, Math.round((boundedPledgeCents * 10_000) / currentGapCents)),
  };
}

function isPledgeImpactPoolState(value: unknown): value is PledgeImpactPoolState {
  if (!isRecord(value) || !isPledgeImpactPoolPublicKey(String(value.poolPublicKey))) return false;
  const expectedCampaignId = getPledgeImpactCampaignId(
    value.poolPublicKey as PledgeImpactPoolPublicKey,
  );
  return (
    value.campaignId === expectedCampaignId &&
    typeof value.title === "string" &&
    Boolean(value.title.trim()) &&
    value.currency === "USD" &&
    Array.isArray(value.thresholdsCents) &&
    value.thresholdsCents.length >= 1 &&
    value.thresholdsCents.length <= 10 &&
    value.thresholdsCents.every((threshold) => isSafeIntegerInRange(threshold, 1)) &&
    isSafeIntegerInRange(value.fundedCents, 0) &&
    isSafeIntegerInRange(value.contributorCount, 0) &&
    isCanonicalTimestamp(value.deadlineAt) &&
    typeof value.failureBonusEnabled === "boolean"
  );
}

export function poolStatesEqual(left: unknown, right: PledgeImpactPoolState) {
  if (!isPledgeImpactPoolState(left)) return false;
  return (
    left.poolPublicKey === right.poolPublicKey &&
    left.campaignId === right.campaignId &&
    left.title === right.title &&
    left.currency === right.currency &&
    left.fundedCents === right.fundedCents &&
    left.contributorCount === right.contributorCount &&
    left.deadlineAt === right.deadlineAt &&
    left.failureBonusEnabled === right.failureBonusEnabled &&
    left.thresholdsCents.length === right.thresholdsCents.length &&
    left.thresholdsCents.every((threshold, index) => threshold === right.thresholdsCents[index])
  );
}

export function validatePledgeImpactForecastPayload(
  value: unknown,
  poolState: PledgeImpactPoolState,
): value is PledgeImpactForecastPayload {
  if (!isRecord(value) || containsForbiddenPersonalizationKey(value)) return false;
  if (
    value.schemaVersion !== MPGF_PLEDGE_IMPACT_SCHEMA_VERSION ||
    value.audience !== "pool_state" ||
    value.experimental !== true ||
    value.currency !== poolState.currency ||
    !isSafeIntegerInRange(value.forecastErrorFloorBps, 0, 10_000)
  ) {
    return false;
  }
  if (!isRecord(value.followOnEffect)) return false;
  if (
    typeof value.followOnEffect.included !== "boolean" ||
    !["randomized", "quasi_experimental", "none"].includes(String(value.followOnEffect.evidenceType)) ||
    (value.followOnEffect.evidenceReference !== null &&
      (typeof value.followOnEffect.evidenceReference !== "string" ||
        !value.followOnEffect.evidenceReference.trim()))
  ) {
    return false;
  }
  if (
    value.followOnEffect.included &&
    value.followOnEffect.evidenceType === "none"
  ) {
    return false;
  }
  if (!value.followOnEffect.included && value.followOnEffect.evidenceType !== "none") return false;
  if (!Array.isArray(value.points) || value.points.length < 2) return false;
  if (!value.points.every((point) => isForecastPoint(point, poolState.thresholdsCents))) return false;
  const pledgeAmounts = value.points.map((point) => point.pledgeCents);
  if (!pledgeAmounts.every((amount, index) => index === 0 || amount > pledgeAmounts[index - 1])) return false;
  if (!isRecord(value.modelPerformance)) return false;
  const performance = value.modelPerformance;
  return (
    isSafeIntegerInRange(performance.sampleSize, 0) &&
    isCanonicalTimestamp(performance.evaluationWindowStart) &&
    isCanonicalTimestamp(performance.evaluationWindowEnd) &&
    Date.parse(String(performance.evaluationWindowStart)) <= Date.parse(String(performance.evaluationWindowEnd)) &&
    typeof performance.brierScore === "number" &&
    Number.isFinite(performance.brierScore) &&
    performance.brierScore >= 0 &&
    performance.brierScore <= 1 &&
    isSafeIntegerInRange(performance.calibrationErrorBps, 0, 10_000) &&
    typeof performance.notes === "string" &&
    Boolean(performance.notes.trim())
  );
}

export function validatePledgeImpactForecastRelease(
  value: unknown,
  expectedPoolState: PledgeImpactPoolState,
): value is PledgeImpactForecastRelease {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    value.poolPublicKey !== expectedPoolState.poolPublicKey ||
    value.campaignId !== expectedPoolState.campaignId ||
    typeof value.forecastVersion !== "string" ||
    !value.forecastVersion.trim() ||
    typeof value.modelVersion !== "string" ||
    !value.modelVersion.trim() ||
    !isCanonicalTimestamp(value.releasedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    typeof value.contentSha256 !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(value.contentSha256) ||
    !poolStatesEqual(value.poolState, expectedPoolState)
  ) {
    return false;
  }
  return validatePledgeImpactForecastPayload(value.forecast, expectedPoolState);
}

function interpolateInteger(left: number, right: number, ratio: number) {
  return Math.round(left + (right - left) * ratio);
}

function interpolateInterval(
  left: PledgeImpactIntervalCents,
  right: PledgeImpactIntervalCents,
  ratio: number,
): PledgeImpactIntervalCents {
  return {
    estimateCents: interpolateInteger(left.estimateCents, right.estimateCents, ratio),
    lower90Cents: interpolateInteger(left.lower90Cents, right.lower90Cents, ratio),
    upper90Cents: interpolateInteger(left.upper90Cents, right.upper90Cents, ratio),
  };
}

function interpolateFailureBonus(
  left: PledgeImpactFailureBonusEstimate | null,
  right: PledgeImpactFailureBonusEstimate | null,
  ratio: number,
): PledgeImpactFailureBonusEstimate | null {
  if (!left || !right) return left ?? right;
  const guaranteedMinimumCents =
    left.guaranteedMinimumCents === null || right.guaranteedMinimumCents === null
      ? null
      : interpolateInteger(left.guaranteedMinimumCents, right.guaranteedMinimumCents, ratio);
  return {
    projectedCents: interpolateInteger(left.projectedCents, right.projectedCents, ratio),
    lower90Cents: interpolateInteger(left.lower90Cents, right.lower90Cents, ratio),
    upper90Cents: interpolateInteger(left.upper90Cents, right.upper90Cents, ratio),
    guaranteedMinimumCents,
  };
}

function interpolatePoint(
  left: PledgeImpactForecastPoint,
  right: PledgeImpactForecastPoint,
  pledgeCents: number,
): PledgeImpactForecastPoint {
  if (left.pledgeCents === right.pledgeCents) return left;
  const ratio = (pledgeCents - left.pledgeCents) / (right.pledgeCents - left.pledgeCents);
  return {
    pledgeCents,
    additionalFundingFromOthers: interpolateInterval(
      left.additionalFundingFromOthers,
      right.additionalFundingFromOthers,
      ratio,
    ),
    allocatedFundingCredit: interpolateInterval(
      left.allocatedFundingCredit,
      right.allocatedFundingCredit,
      ratio,
    ),
    thresholds: left.thresholds.map((threshold, index) => {
      const other = right.thresholds[index];
      return {
        thresholdIndex: threshold.thresholdIndex,
        thresholdCents: threshold.thresholdCents,
        probabilityWithoutPledgeBps: interpolateInteger(
          threshold.probabilityWithoutPledgeBps,
          other.probabilityWithoutPledgeBps,
          ratio,
        ),
        probabilityWithPledgeBps: interpolateInteger(
          threshold.probabilityWithPledgeBps,
          other.probabilityWithPledgeBps,
          ratio,
        ),
        lower90ChangeBps: interpolateInteger(
          threshold.lower90ChangeBps,
          other.lower90ChangeBps,
          ratio,
        ),
        upper90ChangeBps: interpolateInteger(
          threshold.upper90ChangeBps,
          other.upper90ChangeBps,
          ratio,
        ),
      };
    }),
    failureBonusConditionalOnFailure: interpolateFailureBonus(
      left.failureBonusConditionalOnFailure,
      right.failureBonusConditionalOnFailure,
      ratio,
    ),
    decomposition: {
      directThresholdEffectCents: interpolateInteger(
        left.decomposition.directThresholdEffectCents,
        right.decomposition.directThresholdEffectCents,
        ratio,
      ),
      followOnContributionEffectCents: interpolateInteger(
        left.decomposition.followOnContributionEffectCents,
        right.decomposition.followOnContributionEffectCents,
        ratio,
      ),
      settlementAdjustmentCents: interpolateInteger(
        left.decomposition.settlementAdjustmentCents,
        right.decomposition.settlementAdjustmentCents,
        ratio,
      ),
      timingEffectCents: interpolateInteger(
        left.decomposition.timingEffectCents,
        right.decomposition.timingEffectCents,
        ratio,
      ),
    },
  };
}

function resolveForecastPoint(points: PledgeImpactForecastPoint[], pledgeCents: number) {
  const exact = points.find((point) => point.pledgeCents === pledgeCents);
  if (exact) return exact;
  const upperIndex = points.findIndex((point) => point.pledgeCents > pledgeCents);
  if (upperIndex <= 0) return null;
  return interpolatePoint(points[upperIndex - 1], points[upperIndex], pledgeCents);
}

export function getPledgeImpactRecommendation(
  forecast: PledgeImpactForecastPayload,
): PledgeImpactRecommendation | null {
  for (const point of forecast.points) {
    if (point.pledgeCents <= 0) continue;
    const qualifyingThreshold = point.thresholds.find(
      (threshold) => threshold.lower90ChangeBps > forecast.forecastErrorFloorBps,
    );
    if (qualifyingThreshold) {
      return {
        pledgeCents: point.pledgeCents,
        thresholdIndex: qualifyingThreshold.thresholdIndex,
        lower90ChangeBps: qualifyingThreshold.lower90ChangeBps,
        forecastErrorFloorBps: forecast.forecastErrorFloorBps,
      };
    }
  }
  return null;
}

const unavailableMessages: Record<PledgeImpactUnavailableReason, string> = {
  forecast_not_released:
    "No approved forecast has been released for this pool. Only the mechanical gap change is shown.",
  forecast_stale:
    "The latest released forecast has expired. Only the mechanical gap change is shown until the model refreshes.",
  forecast_invalid:
    "The released forecast failed validation and has been withheld. Only the mechanical gap change is shown.",
  pool_state_mismatch:
    "The pool changed after this forecast was released. The estimate is withheld until the model refreshes.",
  campaign_mismatch:
    "This pool is not mapped to the requested contribution campaign. The estimate is withheld.",
  amount_out_of_range:
    "The proposed pledge is outside the released forecast range. Only the mechanical gap change is shown.",
  service_unavailable:
    "The forecast service is temporarily unavailable. Only the mechanical gap change is shown.",
};

export function buildPledgeImpactUnavailableEstimate({
  campaignId,
  pledgeCents,
  poolPublicKey,
  reason,
}: {
  campaignId: PledgeImpactCampaignId;
  pledgeCents: number;
  poolPublicKey: PledgeImpactPoolPublicKey;
  reason: PledgeImpactUnavailableReason;
}): PledgeImpactUnavailableEstimate {
  const poolState = getPledgeImpactPoolState(poolPublicKey);
  return {
    status: "unavailable",
    experimental: true,
    poolPublicKey,
    campaignId,
    pledgeCents,
    reason,
    message: unavailableMessages[reason],
    mechanicalEffect: calculatePledgeImpactMechanicalEffect(poolState, pledgeCents),
  };
}

export function evaluatePledgeImpactForecast({
  campaignId,
  now = new Date(),
  pledgeCents,
  poolPublicKey,
  release,
}: {
  campaignId: PledgeImpactCampaignId;
  now?: Date;
  pledgeCents: number;
  poolPublicKey: PledgeImpactPoolPublicKey;
  release: unknown;
}): PledgeImpactApiResponse {
  const poolState = getPledgeImpactPoolState(poolPublicKey);
  const mechanicalEffect = calculatePledgeImpactMechanicalEffect(poolState, pledgeCents);
  if (campaignId !== poolState.campaignId) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "campaign_mismatch",
    });
  }
  if (!release) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "forecast_not_released",
    });
  }
  if (!validatePledgeImpactForecastRelease(release, poolState)) {
    const record = isRecord(release) ? release : null;
    const releasePoolState = record?.poolState;
    const reason =
      isRecord(releasePoolState) &&
      releasePoolState.poolPublicKey === poolState.poolPublicKey &&
      releasePoolState.campaignId === poolState.campaignId
        ? "pool_state_mismatch"
        : "forecast_invalid";
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason,
    });
  }
  if (Date.parse(release.expiresAt) <= now.getTime()) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "forecast_stale",
    });
  }
  if (Date.parse(release.releasedAt) > now.getTime() + 5 * 60_000) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "forecast_invalid",
    });
  }

  const minimum = release.forecast.points[0]?.pledgeCents ?? 0;
  const maximum = release.forecast.points.at(-1)?.pledgeCents ?? 0;
  if (!Number.isSafeInteger(pledgeCents) || pledgeCents < minimum || pledgeCents > maximum) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "amount_out_of_range",
    });
  }
  const point = resolveForecastPoint(release.forecast.points, pledgeCents);
  if (!point) {
    return buildPledgeImpactUnavailableEstimate({
      campaignId,
      pledgeCents,
      poolPublicKey,
      reason: "amount_out_of_range",
    });
  }
  return {
    status: "available",
    experimental: true,
    poolPublicKey,
    campaignId,
    pledgeCents,
    currency: release.forecast.currency,
    additionalFundingFromOthers: point.additionalFundingFromOthers,
    fundingMultiplier:
      pledgeCents === 0
        ? 0
        : Number((point.additionalFundingFromOthers.estimateCents / pledgeCents).toFixed(2)),
    allocatedFundingCredit: point.allocatedFundingCredit,
    thresholds: point.thresholds,
    failureBonusConditionalOnFailure: point.failureBonusConditionalOnFailure,
    decomposition: point.decomposition,
    mechanicalEffect,
    recommendation: getPledgeImpactRecommendation(release.forecast),
    followOnEffect: release.forecast.followOnEffect,
    modelPerformance: release.forecast.modelPerformance,
    forecastVersion: release.forecastVersion,
    modelVersion: release.modelVersion,
    releasedAt: release.releasedAt,
    expiresAt: release.expiresAt,
    explanation: {
      causalEstimatesMayOverlap: true,
      allocatedCreditIsNotCausal: true,
      failureBonusIsConditionalOnFailure: true,
    },
  };
}
