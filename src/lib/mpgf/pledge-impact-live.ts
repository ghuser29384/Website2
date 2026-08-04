export const MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION =
  "mpgf_pledge_impact_forecast_v1" as const;
export const MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION =
  "mpgf_pledge_impact_pool_state_v1" as const;

export type PledgeImpactLiveBundleStatus =
  | "pool_not_live"
  | "forecast_not_released"
  | "forecast_stale"
  | "pool_state_mismatch"
  | "available";

export type PledgeImpactUnavailableReason =
  | PledgeImpactLiveBundleStatus
  | "forecast_invalid"
  | "amount_out_of_range"
  | "service_unavailable";

export interface PledgeImpactLiveThreshold {
  thresholdIndex: number;
  thresholdId: string;
  cumulativeNetRecipientThresholdCents: number;
  grossSuccessRequirementCents: number;
  premiumRateBps: number;
  successPremiumCents: number;
}

export interface PledgeImpactLivePoolState {
  schemaVersion: typeof MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION;
  poolPublicKey: string;
  poolProposalId: string;
  title: string;
  causeArea: string;
  currency: "USD";
  thresholds: PledgeImpactLiveThreshold[];
  fundedCents: number;
  contributorCount: number;
  deadlineAt: string;
  thresholdSupporters: number;
  thresholdVisibility: "public_exact";
  progressVisibility: "exact_amount";
  destinationType: "external_charity" | "fiscal_host" | "signed_sponsor_route";
  failureBonus: {
    enabled: boolean;
    scheduleStatus: "approved" | null;
    rateBps: number | null;
    maxParticipants: number | null;
    maxPerParticipantCents: number | null;
  };
}

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

export interface PledgeImpactForecastPayload {
  schemaVersion: typeof MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION;
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
  modelPerformance: {
    sampleSize: number;
    evaluationWindowStart: string;
    evaluationWindowEnd: string;
    brierScore: number;
    calibrationErrorBps: number;
    notes: string;
  };
}

export interface PledgeImpactForecastRelease {
  id: string;
  forecastVersion: string;
  modelVersion: string;
  releasedAt: string;
  expiresAt: string;
  poolStateSha256: string;
  forecast: PledgeImpactForecastPayload;
}

export interface PledgeImpactLiveBundle {
  status: PledgeImpactLiveBundleStatus;
  checkedAt: string;
  poolPublicKey: string;
  poolState: PledgeImpactLivePoolState | null;
  poolStateSha256: string | null;
  forecastRelease: PledgeImpactForecastRelease | null;
}

export interface PledgeImpactMechanicalEffect {
  currentThresholdCents: number;
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
  poolPublicKey: string;
  poolProposalId: string;
  pledgeCents: number;
  currency: "USD";
  poolState: PledgeImpactLivePoolState;
  poolStateSha256: string;
  additionalFundingFromOthers: PledgeImpactIntervalCents;
  fundingMultiplier: number;
  allocatedFundingCredit: PledgeImpactIntervalCents;
  thresholds: PledgeImpactThresholdEstimate[];
  failureBonusConditionalOnFailure: PledgeImpactFailureBonusEstimate | null;
  decomposition: PledgeImpactForecastPoint["decomposition"];
  mechanicalEffect: PledgeImpactMechanicalEffect;
  recommendation: PledgeImpactRecommendation | null;
  followOnEffect: PledgeImpactForecastPayload["followOnEffect"];
  modelPerformance: PledgeImpactForecastPayload["modelPerformance"];
  forecastVersion: string;
  modelVersion: string;
  releasedAt: string;
  expiresAt: string;
  explanation: {
    causalEstimatesMayOverlap: true;
    allocatedCreditIsNotCausal: true;
    failureBonusIsConditionalOnFailure: true;
    viewerPersonalizationUsed: false;
  };
}

export interface PledgeImpactUnavailableEstimate {
  status: "unavailable";
  experimental: true;
  poolPublicKey: string;
  pledgeCents: number;
  reason: PledgeImpactUnavailableReason;
  message: string;
  poolState: PledgeImpactLivePoolState | null;
  poolStateSha256: string | null;
  mechanicalEffect: PledgeImpactMechanicalEffect | null;
}

export type PledgeImpactApiResponse =
  | PledgeImpactAvailableEstimate
  | PledgeImpactUnavailableEstimate;

type JsonRecord = Record<string, unknown>;

const PERSONALIZATION_KEYS = new Set([
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const POOL_PUBLIC_KEY_PATTERN = /^(?:pool|qa-pool)-[a-z0-9-]{3,96}$/;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeInteger(
  value: unknown,
  minimum = Number.MIN_SAFE_INTEGER,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isFiniteNumber(
  value: unknown,
  minimum = -Infinity,
  maximum = Infinity,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function hasViewerPersonalization(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasViewerPersonalization);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    return PERSONALIZATION_KEYS.has(normalized) || hasViewerPersonalization(child);
  });
}

function parseInterval(value: unknown): PledgeImpactIntervalCents | null {
  if (!isRecord(value)) return null;
  const { estimateCents, lower90Cents, upper90Cents } = value;
  if (
    !isSafeInteger(estimateCents) ||
    !isSafeInteger(lower90Cents) ||
    !isSafeInteger(upper90Cents) ||
    lower90Cents > estimateCents ||
    estimateCents > upper90Cents
  ) {
    return null;
  }
  return { estimateCents, lower90Cents, upper90Cents };
}

function parseFailureBonus(value: unknown): PledgeImpactFailureBonusEstimate | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { projectedCents, lower90Cents, upper90Cents, guaranteedMinimumCents } = value;
  if (
    !isSafeInteger(projectedCents, 0) ||
    !isSafeInteger(lower90Cents, 0) ||
    !isSafeInteger(upper90Cents, 0) ||
    lower90Cents > projectedCents ||
    projectedCents > upper90Cents ||
    !(
      guaranteedMinimumCents === null ||
      isSafeInteger(guaranteedMinimumCents, 0, projectedCents)
    )
  ) {
    return undefined;
  }
  return { projectedCents, lower90Cents, upper90Cents, guaranteedMinimumCents };
}

function parseLiveThreshold(value: unknown, expectedIndex: number): PledgeImpactLiveThreshold | null {
  if (!isRecord(value)) return null;
  const {
    thresholdIndex,
    thresholdId,
    cumulativeNetRecipientThresholdCents,
    grossSuccessRequirementCents,
    premiumRateBps,
    successPremiumCents,
  } = value;
  if (
    thresholdIndex !== expectedIndex ||
    typeof thresholdId !== "string" ||
    thresholdId.trim() !== thresholdId ||
    thresholdId.length === 0 ||
    !isSafeInteger(cumulativeNetRecipientThresholdCents, 1) ||
    !isSafeInteger(grossSuccessRequirementCents, cumulativeNetRecipientThresholdCents) ||
    !isSafeInteger(premiumRateBps, 0, 10_000) ||
    !isSafeInteger(successPremiumCents, 0) ||
    grossSuccessRequirementCents !==
      cumulativeNetRecipientThresholdCents + successPremiumCents
  ) {
    return null;
  }
  return {
    thresholdIndex,
    thresholdId,
    cumulativeNetRecipientThresholdCents,
    grossSuccessRequirementCents,
    premiumRateBps,
    successPremiumCents,
  };
}

export function parsePledgeImpactLivePoolState(value: unknown): PledgeImpactLivePoolState | null {
  if (!isRecord(value)) return null;
  const thresholdsRaw = value.thresholds;
  if (!Array.isArray(thresholdsRaw) || thresholdsRaw.length < 1 || thresholdsRaw.length > 10) {
    return null;
  }
  const thresholds: PledgeImpactLiveThreshold[] = [];
  let previousThreshold = 0;
  for (let index = 0; index < thresholdsRaw.length; index += 1) {
    const threshold = parseLiveThreshold(thresholdsRaw[index], index + 1);
    if (!threshold || threshold.cumulativeNetRecipientThresholdCents <= previousThreshold) return null;
    thresholds.push(threshold);
    previousThreshold = threshold.cumulativeNetRecipientThresholdCents;
  }

  const failureBonus = value.failureBonus;
  if (!isRecord(failureBonus)) return null;
  const enabled = failureBonus.enabled;
  const scheduleStatus = failureBonus.scheduleStatus;
  const rateBps = failureBonus.rateBps;
  const maxParticipants = failureBonus.maxParticipants;
  const maxPerParticipantCents = failureBonus.maxPerParticipantCents;
  if (
    typeof enabled !== "boolean" ||
    !(scheduleStatus === null || scheduleStatus === "approved") ||
    !(rateBps === null || isSafeInteger(rateBps, 1, 10_000)) ||
    !(maxParticipants === null || isSafeInteger(maxParticipants, 1)) ||
    !(maxPerParticipantCents === null || isSafeInteger(maxPerParticipantCents, 1)) ||
    (enabled &&
      (scheduleStatus !== "approved" ||
        rateBps === null ||
        maxParticipants === null ||
        maxPerParticipantCents === null)) ||
    (!enabled &&
      (scheduleStatus !== null ||
        rateBps !== null ||
        maxParticipants !== null ||
        maxPerParticipantCents !== null))
  ) {
    return null;
  }

  if (
    value.schemaVersion !== MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION ||
    typeof value.poolPublicKey !== "string" ||
    !POOL_PUBLIC_KEY_PATTERN.test(value.poolPublicKey) ||
    typeof value.poolProposalId !== "string" ||
    !UUID_PATTERN.test(value.poolProposalId) ||
    typeof value.title !== "string" ||
    value.title.trim().length < 3 ||
    typeof value.causeArea !== "string" ||
    value.causeArea.trim().length < 2 ||
    value.currency !== "USD" ||
    !isSafeInteger(value.fundedCents, 0) ||
    !isSafeInteger(value.contributorCount, 0) ||
    !isIsoTimestamp(value.deadlineAt) ||
    !isSafeInteger(value.thresholdSupporters, 1) ||
    value.thresholdVisibility !== "public_exact" ||
    value.progressVisibility !== "exact_amount" ||
    !["external_charity", "fiscal_host", "signed_sponsor_route"].includes(
      String(value.destinationType),
    )
  ) {
    return null;
  }

  return {
    schemaVersion: MPGF_PLEDGE_IMPACT_POOL_STATE_SCHEMA_VERSION,
    poolPublicKey: value.poolPublicKey,
    poolProposalId: value.poolProposalId,
    title: value.title,
    causeArea: value.causeArea,
    currency: "USD",
    thresholds,
    fundedCents: value.fundedCents,
    contributorCount: value.contributorCount,
    deadlineAt: value.deadlineAt,
    thresholdSupporters: value.thresholdSupporters,
    thresholdVisibility: "public_exact",
    progressVisibility: "exact_amount",
    destinationType: value.destinationType as PledgeImpactLivePoolState["destinationType"],
    failureBonus: {
      enabled,
      scheduleStatus,
      rateBps,
      maxParticipants,
      maxPerParticipantCents,
    },
  };
}

function parseThresholdEstimate(
  value: unknown,
  liveThreshold: PledgeImpactLiveThreshold,
): PledgeImpactThresholdEstimate | null {
  if (!isRecord(value)) return null;
  const {
    thresholdIndex,
    thresholdCents,
    probabilityWithoutPledgeBps,
    probabilityWithPledgeBps,
    lower90ChangeBps,
    upper90ChangeBps,
  } = value;
  if (
    thresholdIndex !== liveThreshold.thresholdIndex ||
    thresholdCents !== liveThreshold.cumulativeNetRecipientThresholdCents ||
    !isSafeInteger(probabilityWithoutPledgeBps, 0, 10_000) ||
    !isSafeInteger(probabilityWithPledgeBps, 0, 10_000) ||
    !isSafeInteger(lower90ChangeBps, -10_000, 10_000) ||
    !isSafeInteger(upper90ChangeBps, -10_000, 10_000) ||
    lower90ChangeBps > upper90ChangeBps
  ) {
    return null;
  }
  return {
    thresholdIndex,
    thresholdCents,
    probabilityWithoutPledgeBps,
    probabilityWithPledgeBps,
    lower90ChangeBps,
    upper90ChangeBps,
  };
}

function parseForecastPoint(
  value: unknown,
  liveThresholds: PledgeImpactLiveThreshold[],
): PledgeImpactForecastPoint | null {
  if (!isRecord(value) || !isSafeInteger(value.pledgeCents, 0, 100_000_000)) return null;
  const additionalFundingFromOthers = parseInterval(value.additionalFundingFromOthers);
  const allocatedFundingCredit = parseInterval(value.allocatedFundingCredit);
  const failureBonusConditionalOnFailure = parseFailureBonus(
    value.failureBonusConditionalOnFailure,
  );
  if (
    !additionalFundingFromOthers ||
    !allocatedFundingCredit ||
    failureBonusConditionalOnFailure === undefined ||
    !Array.isArray(value.thresholds) ||
    value.thresholds.length !== liveThresholds.length ||
    !isRecord(value.decomposition)
  ) {
    return null;
  }
  const thresholds: PledgeImpactThresholdEstimate[] = [];
  for (let index = 0; index < liveThresholds.length; index += 1) {
    const threshold = parseThresholdEstimate(value.thresholds[index], liveThresholds[index]);
    if (!threshold) return null;
    thresholds.push(threshold);
  }
  const decomposition = value.decomposition;
  if (
    !isSafeInteger(decomposition.directThresholdEffectCents) ||
    !isSafeInteger(decomposition.followOnContributionEffectCents) ||
    !isSafeInteger(decomposition.settlementAdjustmentCents) ||
    !isSafeInteger(decomposition.timingEffectCents) ||
    decomposition.directThresholdEffectCents +
        decomposition.followOnContributionEffectCents +
        decomposition.settlementAdjustmentCents +
        decomposition.timingEffectCents !==
      additionalFundingFromOthers.estimateCents
  ) {
    return null;
  }
  return {
    pledgeCents: value.pledgeCents,
    additionalFundingFromOthers,
    allocatedFundingCredit,
    thresholds,
    failureBonusConditionalOnFailure,
    decomposition: {
      directThresholdEffectCents: decomposition.directThresholdEffectCents,
      followOnContributionEffectCents: decomposition.followOnContributionEffectCents,
      settlementAdjustmentCents: decomposition.settlementAdjustmentCents,
      timingEffectCents: decomposition.timingEffectCents,
    },
  };
}

export function parsePledgeImpactForecastPayload(
  value: unknown,
  poolState: PledgeImpactLivePoolState,
): PledgeImpactForecastPayload | null {
  if (!isRecord(value) || hasViewerPersonalization(value)) return null;
  const followOnEffect = value.followOnEffect;
  const modelPerformance = value.modelPerformance;
  if (!isRecord(followOnEffect) || !isRecord(modelPerformance)) return null;
  if (
    value.schemaVersion !== MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION ||
    value.audience !== "pool_state" ||
    value.experimental !== true ||
    value.currency !== "USD" ||
    !isSafeInteger(value.forecastErrorFloorBps, 0, 10_000) ||
    typeof followOnEffect.included !== "boolean" ||
    !["randomized", "quasi_experimental", "none"].includes(
      String(followOnEffect.evidenceType),
    ) ||
    !(
      followOnEffect.evidenceReference === null ||
      (typeof followOnEffect.evidenceReference === "string" &&
        followOnEffect.evidenceReference.trim().length > 0)
    ) ||
    (followOnEffect.included &&
      (followOnEffect.evidenceType === "none" || followOnEffect.evidenceReference === null)) ||
    (!followOnEffect.included &&
      (followOnEffect.evidenceType !== "none" || followOnEffect.evidenceReference !== null)) ||
    !Array.isArray(value.points) ||
    value.points.length < 2 ||
    value.points.length > 256 ||
    !isSafeInteger(modelPerformance.sampleSize, 0) ||
    !isIsoTimestamp(modelPerformance.evaluationWindowStart) ||
    !isIsoTimestamp(modelPerformance.evaluationWindowEnd) ||
    Date.parse(modelPerformance.evaluationWindowStart as string) >=
      Date.parse(modelPerformance.evaluationWindowEnd as string) ||
    !isFiniteNumber(modelPerformance.brierScore, 0, 1) ||
    !isSafeInteger(modelPerformance.calibrationErrorBps, 0, 10_000) ||
    typeof modelPerformance.notes !== "string" ||
    modelPerformance.notes.trim().length === 0
  ) {
    return null;
  }

  const points: PledgeImpactForecastPoint[] = [];
  let previousPledge = -1;
  for (const rawPoint of value.points) {
    const point = parseForecastPoint(rawPoint, poolState.thresholds);
    if (!point || point.pledgeCents <= previousPledge) return null;
    if (!followOnEffect.included && point.decomposition.followOnContributionEffectCents !== 0) {
      return null;
    }
    points.push(point);
    previousPledge = point.pledgeCents;
  }
  if (points[0].pledgeCents !== 0) return null;

  return {
    schemaVersion: MPGF_PLEDGE_IMPACT_FORECAST_SCHEMA_VERSION,
    audience: "pool_state",
    experimental: true,
    currency: "USD",
    forecastErrorFloorBps: value.forecastErrorFloorBps,
    followOnEffect: {
      included: followOnEffect.included,
      evidenceType: followOnEffect.evidenceType as PledgeImpactForecastPayload["followOnEffect"]["evidenceType"],
      evidenceReference: followOnEffect.evidenceReference as string | null,
    },
    points,
    modelPerformance: {
      sampleSize: modelPerformance.sampleSize,
      evaluationWindowStart: modelPerformance.evaluationWindowStart as string,
      evaluationWindowEnd: modelPerformance.evaluationWindowEnd as string,
      brierScore: modelPerformance.brierScore,
      calibrationErrorBps: modelPerformance.calibrationErrorBps,
      notes: modelPerformance.notes,
    },
  };
}

function parseForecastRelease(
  value: unknown,
  poolState: PledgeImpactLivePoolState,
): PledgeImpactForecastRelease | null {
  if (!isRecord(value)) return null;
  const forecast = parsePledgeImpactForecastPayload(value.forecast, poolState);
  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.forecastVersion !== "string" ||
    value.forecastVersion.trim().length === 0 ||
    typeof value.modelVersion !== "string" ||
    value.modelVersion.trim().length === 0 ||
    !isIsoTimestamp(value.releasedAt) ||
    !isIsoTimestamp(value.expiresAt) ||
    Date.parse(value.releasedAt as string) >= Date.parse(value.expiresAt as string) ||
    typeof value.poolStateSha256 !== "string" ||
    !SHA256_PATTERN.test(value.poolStateSha256) ||
    !forecast
  ) {
    return null;
  }
  return {
    id: value.id,
    forecastVersion: value.forecastVersion,
    modelVersion: value.modelVersion,
    releasedAt: value.releasedAt as string,
    expiresAt: value.expiresAt as string,
    poolStateSha256: value.poolStateSha256,
    forecast,
  };
}

export function parsePledgeImpactLiveBundle(value: unknown): PledgeImpactLiveBundle | null {
  if (!isRecord(value)) return null;
  const status = value.status;
  if (
    !["pool_not_live", "forecast_not_released", "forecast_stale", "pool_state_mismatch", "available"].includes(
      String(status),
    ) ||
    typeof value.poolPublicKey !== "string" ||
    !POOL_PUBLIC_KEY_PATTERN.test(value.poolPublicKey) ||
    !isIsoTimestamp(value.checkedAt)
  ) {
    return null;
  }
  const poolState = value.poolState === null ? null : parsePledgeImpactLivePoolState(value.poolState);
  const poolStateSha256 = value.poolStateSha256;
  if (
    (status === "pool_not_live" && (poolState !== null || poolStateSha256 !== null)) ||
    (status !== "pool_not_live" &&
      (!poolState || typeof poolStateSha256 !== "string" || !SHA256_PATTERN.test(poolStateSha256)))
  ) {
    return null;
  }
  const forecastRelease =
    value.forecastRelease === null || !poolState
      ? null
      : parseForecastRelease(value.forecastRelease, poolState);
  if (status === "available" && !forecastRelease) return null;
  return {
    status: status as PledgeImpactLiveBundleStatus,
    checkedAt: value.checkedAt as string,
    poolPublicKey: value.poolPublicKey,
    poolState,
    poolStateSha256: poolStateSha256 as string | null,
    forecastRelease,
  };
}

export function calculatePledgeImpactMechanicalEffect(
  poolState: PledgeImpactLivePoolState,
  pledgeCents: number,
): PledgeImpactMechanicalEffect {
  const safePledge = Number.isSafeInteger(pledgeCents) && pledgeCents > 0 ? pledgeCents : 0;
  const currentThreshold =
    poolState.thresholds.find(
      (threshold) => threshold.cumulativeNetRecipientThresholdCents > poolState.fundedCents,
    ) ?? poolState.thresholds.at(-1)!;
  const currentGapCents = Math.max(
    0,
    currentThreshold.cumulativeNetRecipientThresholdCents - poolState.fundedCents,
  );
  const remainingAfterPledgeCents = Math.max(0, currentGapCents - safePledge);
  const shareOfCurrentGapBps =
    currentGapCents === 0
      ? 10_000
      : Math.min(10_000, Math.round((safePledge / currentGapCents) * 10_000));
  return {
    currentThresholdCents: currentThreshold.cumulativeNetRecipientThresholdCents,
    currentGapCents,
    remainingAfterPledgeCents,
    shareOfCurrentGapBps,
  };
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
  if (!left || !right) return left === right ? left : null;
  return {
    projectedCents: interpolateInteger(left.projectedCents, right.projectedCents, ratio),
    lower90Cents: interpolateInteger(left.lower90Cents, right.lower90Cents, ratio),
    upper90Cents: interpolateInteger(left.upper90Cents, right.upper90Cents, ratio),
    guaranteedMinimumCents:
      left.guaranteedMinimumCents === null || right.guaranteedMinimumCents === null
        ? null
        : interpolateInteger(
            left.guaranteedMinimumCents,
            right.guaranteedMinimumCents,
            ratio,
          ),
  };
}

function interpolatePoint(
  left: PledgeImpactForecastPoint,
  right: PledgeImpactForecastPoint,
  pledgeCents: number,
): PledgeImpactForecastPoint {
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
    const threshold = point.thresholds.find(
      (candidate) => candidate.lower90ChangeBps > forecast.forecastErrorFloorBps,
    );
    if (threshold) {
      return {
        pledgeCents: point.pledgeCents,
        thresholdIndex: threshold.thresholdIndex,
        lower90ChangeBps: threshold.lower90ChangeBps,
        forecastErrorFloorBps: forecast.forecastErrorFloorBps,
      };
    }
  }
  return null;
}

const unavailableMessages: Record<PledgeImpactUnavailableReason, string> = {
  pool_not_live:
    "This pool is not mapped to an approved, active, publicly exact MPGF proposal. No forecast or contribution route is available.",
  forecast_not_released:
    "No approved experimental forecast has been released for this live pool. Only the mechanical gap change is available.",
  forecast_stale:
    "The latest experimental forecast has expired. Only the mechanical gap change is available until a calibrated refresh is released.",
  pool_state_mismatch:
    "The pool changed after the latest forecast was released. The estimate is withheld until the forecast is refreshed against the current ledger state.",
  forecast_invalid:
    "The released forecast failed validation and has been withheld.",
  amount_out_of_range:
    "The proposed pledge is outside the released forecast range. Only the mechanical gap change is available.",
  service_unavailable:
    "The live pledge-impact service is temporarily unavailable.",
  available: "The estimate is available.",
};

function unavailableEstimate({
  bundle,
  pledgeCents,
  reason,
}: {
  bundle: PledgeImpactLiveBundle | null;
  pledgeCents: number;
  reason: PledgeImpactUnavailableReason;
}): PledgeImpactUnavailableEstimate {
  const poolState = bundle?.poolState ?? null;
  return {
    status: "unavailable",
    experimental: true,
    poolPublicKey: bundle?.poolPublicKey ?? "pool-unavailable",
    pledgeCents,
    reason,
    message: unavailableMessages[reason],
    poolState,
    poolStateSha256: bundle?.poolStateSha256 ?? null,
    mechanicalEffect: poolState
      ? calculatePledgeImpactMechanicalEffect(poolState, pledgeCents)
      : null,
  };
}

export function evaluatePledgeImpactLiveBundle({
  bundle: rawBundle,
  pledgeCents,
  now = new Date(),
}: {
  bundle: unknown;
  pledgeCents: number;
  now?: Date;
}): PledgeImpactApiResponse {
  const bundle = parsePledgeImpactLiveBundle(rawBundle);
  if (!bundle) {
    return unavailableEstimate({ bundle: null, pledgeCents, reason: "forecast_invalid" });
  }
  if (!Number.isSafeInteger(pledgeCents) || pledgeCents < 0) {
    return unavailableEstimate({ bundle, pledgeCents, reason: "amount_out_of_range" });
  }
  if (bundle.status !== "available") {
    return unavailableEstimate({ bundle, pledgeCents, reason: bundle.status });
  }
  const { poolState, poolStateSha256, forecastRelease } = bundle;
  if (!poolState || !poolStateSha256 || !forecastRelease) {
    return unavailableEstimate({ bundle, pledgeCents, reason: "forecast_invalid" });
  }
  if (
    forecastRelease.poolStateSha256 !== poolStateSha256 ||
    Date.parse(forecastRelease.expiresAt) <= now.getTime() ||
    Date.parse(forecastRelease.releasedAt) > now.getTime() + 5 * 60_000
  ) {
    return unavailableEstimate({
      bundle,
      pledgeCents,
      reason:
        forecastRelease.poolStateSha256 !== poolStateSha256
          ? "pool_state_mismatch"
          : "forecast_stale",
    });
  }
  const minimum = forecastRelease.forecast.points[0]?.pledgeCents ?? 0;
  const maximum = forecastRelease.forecast.points.at(-1)?.pledgeCents ?? 0;
  if (pledgeCents < minimum || pledgeCents > maximum) {
    return unavailableEstimate({ bundle, pledgeCents, reason: "amount_out_of_range" });
  }
  const point = resolveForecastPoint(forecastRelease.forecast.points, pledgeCents);
  if (!point) {
    return unavailableEstimate({ bundle, pledgeCents, reason: "amount_out_of_range" });
  }
  return {
    status: "available",
    experimental: true,
    poolPublicKey: bundle.poolPublicKey,
    poolProposalId: poolState.poolProposalId,
    pledgeCents,
    currency: "USD",
    poolState,
    poolStateSha256,
    additionalFundingFromOthers: point.additionalFundingFromOthers,
    fundingMultiplier:
      pledgeCents === 0
        ? 0
        : Number((point.additionalFundingFromOthers.estimateCents / pledgeCents).toFixed(2)),
    allocatedFundingCredit: point.allocatedFundingCredit,
    thresholds: point.thresholds,
    failureBonusConditionalOnFailure: point.failureBonusConditionalOnFailure,
    decomposition: point.decomposition,
    mechanicalEffect: calculatePledgeImpactMechanicalEffect(poolState, pledgeCents),
    recommendation: getPledgeImpactRecommendation(forecastRelease.forecast),
    followOnEffect: forecastRelease.forecast.followOnEffect,
    modelPerformance: forecastRelease.forecast.modelPerformance,
    forecastVersion: forecastRelease.forecastVersion,
    modelVersion: forecastRelease.modelVersion,
    releasedAt: forecastRelease.releasedAt,
    expiresAt: forecastRelease.expiresAt,
    explanation: {
      causalEstimatesMayOverlap: true,
      allocatedCreditIsNotCausal: true,
      failureBonusIsConditionalOnFailure: true,
      viewerPersonalizationUsed: false,
    },
  };
}

export function isPledgeImpactPoolPublicKey(value: string) {
  return POOL_PUBLIC_KEY_PATTERN.test(value);
}
