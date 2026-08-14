export const FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION =
  "mpgf_failure_bonus_success_premium_v0_1" as const;

export const FAILURE_BONUS_ELIGIBILITY_POLICY_VERSION =
  "mpgf_failure_bonus_eligibility_v0_1" as const;

export const PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY = {
  successProbabilityBps: 7_500,
  expectedEligibleFailureFillBps: 4_000,
  expenseLoadBps: 25,
  reserveRiskMarginBps: 42,
} as const;

const BASIS_POINTS = 10_000;
const BASIS_POINTS_BIGINT = BigInt(BASIS_POINTS);
const MAX_SUPPORTED_BASIS_POINTS = 1_000_000;
const MAX_SAFE_CENTS = Number.MAX_SAFE_INTEGER;

export const FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS = {
  maximumSuccessProbabilityBps:
    PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.successProbabilityBps,
  minimumExpectedEligibleFailureFillBps:
    PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.expectedEligibleFailureFillBps,
  maximumExpectedEligibleFailureFillBps: BASIS_POINTS,
} as const;

export type FailureBonusSuccessPremiumPayer =
  | "pool_creator_or_sponsor"
  | "contributors_pro_rata";

export interface FailureBonusEligibilityPolicy {
  policyVersion: typeof FAILURE_BONUS_ELIGIBILITY_POLICY_VERSION;
  contributorIdentityRule: "verified_unique_person";
  contributionTimingRule: "captured_before_deadline";
  relatedPartyRule: "exclude_creator_and_related_parties";
  paymentIntegrityRule: "exclude_duplicate_reversed_disputed_or_fraudulent";
  bonusBasis: "eligible_contribution";
  maxParticipants: number;
  maxBonusPerParticipantCents: number;
}

export interface FailureBonusSuccessPremiumPricingAssumptions {
  successProbabilityBps: number;
  failureBonusRateBps: number;
  expectedEligibleFailureFillBps: number;
  expenseLoadBps: number;
  reserveRiskMarginBps: number;
}

export type FailureBonusSuccessPremiumPricing =
  | {
      mode: "operator_override";
      premiumRateBps: number;
      provisional: boolean;
      rationale: string;
    }
  | {
      mode: "experience_rated";
      assumptions: FailureBonusSuccessPremiumPricingAssumptions;
      provisional: boolean;
      rationale: string;
    };

export interface FailureBonusThresholdPremiumInput {
  thresholdId: string;
  thresholdIndex: number;
  cumulativeNetRecipientThresholdCents: number;
  pricing?: FailureBonusSuccessPremiumPricing;
}

export interface FailureBonusThresholdPremiumQuote {
  thresholdId: string;
  thresholdIndex: number;
  cumulativeNetRecipientThresholdCents: number;
  incrementalNetRecipientCents: number;
  premiumRateBps: number;
  successPremiumCents: number;
  cumulativeSuccessPremiumCents: number;
  grossSuccessRequirementCents: number;
  premiumPayer: FailureBonusSuccessPremiumPayer;
  premiumIncludedInNetRecipientThreshold: false;
  pricingMode: FailureBonusSuccessPremiumPricing["mode"];
  provisional: boolean;
  rationale: string;
  assumptions?: FailureBonusSuccessPremiumPricingAssumptions;
  incrementalFailureBonusExposureCents?: number;
  maximumFailureBonusExposureCents?: number;
}

export interface FailureBonusSuccessPremiumScheduleQuote {
  policyVersion: typeof FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION;
  premiumPayer: FailureBonusSuccessPremiumPayer;
  premiumIncludedInNetRecipientThreshold: false;
  thresholds: FailureBonusThresholdPremiumQuote[];
  eligibilityPolicy?: FailureBonusEligibilityPolicy;
}

function requireSafeInteger(value: number, label: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a safe integer between ${minimum} and ${maximum}.`);
  }
}

function requireStableText(value: string, label: string) {
  if (!value.trim() || value !== value.trim()) {
    throw new Error(`${label} must be non-empty and trimmed.`);
  }
}

export function buildProvisionalFailureBonusSuccessPremiumAssumptions(
  failureBonusRateBps: number,
): FailureBonusSuccessPremiumPricingAssumptions {
  requireSafeInteger(failureBonusRateBps, "Failure-bonus rate", 1, MAX_SUPPORTED_BASIS_POINTS);

  return {
    ...PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY,
    failureBonusRateBps,
  };
}


export function buildFailureBonusEligibilityPolicy({
  maxParticipants,
  maxBonusPerParticipantCents,
}: {
  maxParticipants: number;
  maxBonusPerParticipantCents: number;
}): FailureBonusEligibilityPolicy {
  requireSafeInteger(maxParticipants, "Maximum eligible participants", 1);
  requireSafeInteger(
    maxBonusPerParticipantCents,
    "Maximum failure bonus per participant",
    1,
    MAX_SAFE_CENTS,
  );

  const aggregateCap = BigInt(maxParticipants) * BigInt(maxBonusPerParticipantCents);
  if (aggregateCap > BigInt(MAX_SAFE_CENTS)) {
    throw new Error("The participant cap multiplied by the per-person cap exceeds exact-cent limits.");
  }

  return {
    policyVersion: FAILURE_BONUS_ELIGIBILITY_POLICY_VERSION,
    contributorIdentityRule: "verified_unique_person",
    contributionTimingRule: "captured_before_deadline",
    relatedPartyRule: "exclude_creator_and_related_parties",
    paymentIntegrityRule: "exclude_duplicate_reversed_disputed_or_fraudulent",
    bonusBasis: "eligible_contribution",
    maxParticipants,
    maxBonusPerParticipantCents,
  };
}

export function isCurrentFailureBonusEligibilityPolicy(
  value: unknown,
): value is FailureBonusEligibilityPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<FailureBonusEligibilityPolicy>;

  try {
    const expected = buildFailureBonusEligibilityPolicy({
      maxParticipants: Number(candidate.maxParticipants),
      maxBonusPerParticipantCents: Number(candidate.maxBonusPerParticipantCents),
    });
    return Object.entries(expected).every(
      ([key, expectedValue]) => candidate[key as keyof FailureBonusEligibilityPolicy] === expectedValue,
    );
  } catch {
    return false;
  }
}

export function usesPermittedProvisionalFailureBonusPricingPolicy(
  assumptions: FailureBonusSuccessPremiumPricingAssumptions,
): boolean {
  return (
    Number.isSafeInteger(assumptions.successProbabilityBps) &&
    assumptions.successProbabilityBps >= 1 &&
    assumptions.successProbabilityBps <=
      FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS.maximumSuccessProbabilityBps &&
    Number.isSafeInteger(assumptions.failureBonusRateBps) &&
    assumptions.failureBonusRateBps >= 1 &&
    assumptions.failureBonusRateBps <= BASIS_POINTS &&
    Number.isSafeInteger(assumptions.expectedEligibleFailureFillBps) &&
    assumptions.expectedEligibleFailureFillBps >=
      FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS.minimumExpectedEligibleFailureFillBps &&
    assumptions.expectedEligibleFailureFillBps <=
      FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS.maximumExpectedEligibleFailureFillBps &&
    assumptions.expenseLoadBps ===
      PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.expenseLoadBps &&
    assumptions.reserveRiskMarginBps ===
      PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.reserveRiskMarginBps
  );
}

export function assertPermittedProvisionalFailureBonusPricingPolicy(
  assumptions: FailureBonusSuccessPremiumPricingAssumptions,
) {
  if (!usesPermittedProvisionalFailureBonusPricingPolicy(assumptions)) {
    throw new Error(
      "Each provisional tranche must use platform loads, a success estimate no higher than 75%, and an eligible failure-fill estimate no lower than 40%.",
    );
  }
}

export function usesCurrentProvisionalFailureBonusPricingPolicy(
  assumptions: FailureBonusSuccessPremiumPricingAssumptions,
) {
  return (
    assumptions.successProbabilityBps ===
      PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.successProbabilityBps &&
    assumptions.expectedEligibleFailureFillBps ===
      PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.expectedEligibleFailureFillBps &&
    assumptions.expenseLoadBps === PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.expenseLoadBps &&
    assumptions.reserveRiskMarginBps ===
      PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.reserveRiskMarginBps
  );
}

function ceilDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0)) {
    throw new Error("Success-premium division requires a positive denominator.");
  }
  return (numerator + denominator - BigInt(1)) / denominator;
}

function toSafeNumber(value: bigint, label: string) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds Number.MAX_SAFE_INTEGER.`);
  }
  return Number(value);
}

export function calculateSuccessPremiumCents(netRecipientCents: number, premiumRateBps: number) {
  requireSafeInteger(netRecipientCents, "Net recipient amount", 0);
  requireSafeInteger(premiumRateBps, "Success-premium rate", 0, MAX_SUPPORTED_BASIS_POINTS);

  return toSafeNumber(
    ceilDivide(BigInt(netRecipientCents) * BigInt(premiumRateBps), BASIS_POINTS_BIGINT),
    "Success premium",
  );
}

export function calculateMaximumFailureBonusExposureCents({
  netRecipientAmountCents,
  failureBonusRateBps,
  eligibilityPolicy,
}: {
  netRecipientAmountCents: number;
  failureBonusRateBps: number;
  eligibilityPolicy?: FailureBonusEligibilityPolicy;
}) {
  const uncappedExposureCents = calculateSuccessPremiumCents(
    netRecipientAmountCents,
    failureBonusRateBps,
  );

  if (!eligibilityPolicy) {
    return uncappedExposureCents;
  }
  if (!isCurrentFailureBonusEligibilityPolicy(eligibilityPolicy)) {
    throw new Error("Failure-bonus eligibility policy is missing, stale, or malformed.");
  }

  const aggregateCapCents = toSafeNumber(
    BigInt(eligibilityPolicy.maxParticipants) *
      BigInt(eligibilityPolicy.maxBonusPerParticipantCents),
    "Aggregate failure-bonus cap",
  );
  return Math.min(uncappedExposureCents, aggregateCapCents);
}

export function calculateExperienceRatedSuccessPremiumBps(
  assumptions: FailureBonusSuccessPremiumPricingAssumptions,
) {
  const {
    successProbabilityBps,
    failureBonusRateBps,
    expectedEligibleFailureFillBps,
    expenseLoadBps,
    reserveRiskMarginBps,
  } = assumptions;

  requireSafeInteger(successProbabilityBps, "Success probability", 1, BASIS_POINTS);
  requireSafeInteger(failureBonusRateBps, "Failure-bonus rate", 0, MAX_SUPPORTED_BASIS_POINTS);
  requireSafeInteger(expectedEligibleFailureFillBps, "Expected eligible failure fill", 0, BASIS_POINTS);
  requireSafeInteger(expenseLoadBps, "Expense load", 0, MAX_SUPPORTED_BASIS_POINTS);
  requireSafeInteger(reserveRiskMarginBps, "Reserve risk margin", 0, MAX_SUPPORTED_BASIS_POINTS);

  const failureProbabilityBps = BASIS_POINTS - successProbabilityBps;
  const expectedClaimsRateBps = toSafeNumber(
    ceilDivide(
      BigInt(failureProbabilityBps) *
        BigInt(failureBonusRateBps) *
        BigInt(expectedEligibleFailureFillBps),
      BigInt(successProbabilityBps) * BASIS_POINTS_BIGINT,
    ),
    "Expected failure claims rate",
  );
  const recommendedRateBps = expectedClaimsRateBps + expenseLoadBps + reserveRiskMarginBps;

  requireSafeInteger(recommendedRateBps, "Recommended success-premium rate", 0, MAX_SUPPORTED_BASIS_POINTS);

  return {
    expectedClaimsRateBps,
    expenseLoadBps,
    reserveRiskMarginBps,
    recommendedRateBps,
  };
}

function resolvePricing(pricing: FailureBonusSuccessPremiumPricing) {
  requireStableText(pricing.rationale, "Success-premium pricing rationale");

  if (pricing.mode === "operator_override") {
    requireSafeInteger(pricing.premiumRateBps, "Success-premium rate", 0, MAX_SUPPORTED_BASIS_POINTS);
    return {
      premiumRateBps: pricing.premiumRateBps,
      pricingMode: pricing.mode,
      provisional: pricing.provisional,
      rationale: pricing.rationale,
    } as const;
  }

  const calculatedPricing = calculateExperienceRatedSuccessPremiumBps(pricing.assumptions);

  return {
    ...calculatedPricing,
    premiumRateBps: calculatedPricing.recommendedRateBps,
    pricingMode: pricing.mode,
    provisional: pricing.provisional,
    rationale: pricing.rationale,
    assumptions: pricing.assumptions,
  } as const;
}

export function quoteFailureBonusSuccessPremiumSchedule({
  thresholds,
  defaultPricing,
  premiumPayer,
  eligibilityPolicy,
}: {
  thresholds: readonly FailureBonusThresholdPremiumInput[];
  defaultPricing: FailureBonusSuccessPremiumPricing;
  premiumPayer: FailureBonusSuccessPremiumPayer;
  eligibilityPolicy?: FailureBonusEligibilityPolicy;
}): FailureBonusSuccessPremiumScheduleQuote {
  if (eligibilityPolicy && !isCurrentFailureBonusEligibilityPolicy(eligibilityPolicy)) {
    throw new Error("Failure-bonus eligibility policy is missing, stale, or malformed.");
  }
  if (thresholds.length === 0 || thresholds.length > 10) {
    throw new Error("A success-premium schedule must contain between 1 and 10 thresholds.");
  }

  const ordered = [...thresholds].sort((left, right) => left.thresholdIndex - right.thresholdIndex);
  let previousThresholdCents = 0;
  let cumulativeSuccessPremiumCents = 0;
  let cumulativeFailureBonusExposureCents = 0;

  const quotes = ordered.map((threshold, position) => {
    requireStableText(threshold.thresholdId, "Threshold id");
    requireSafeInteger(threshold.thresholdIndex, "Threshold index", 1, 10);
    requireSafeInteger(
      threshold.cumulativeNetRecipientThresholdCents,
      "Cumulative net recipient threshold",
      1,
    );

    if (threshold.thresholdIndex !== position + 1) {
      throw new Error("Threshold indexes must be contiguous and begin at 1.");
    }
    if (threshold.cumulativeNetRecipientThresholdCents <= previousThresholdCents) {
      throw new Error("Net recipient thresholds must increase strictly.");
    }

    const incrementalNetRecipientCents =
      threshold.cumulativeNetRecipientThresholdCents - previousThresholdCents;
    const pricing = resolvePricing(threshold.pricing ?? defaultPricing);
    const successPremiumCents = calculateSuccessPremiumCents(
      incrementalNetRecipientCents,
      pricing.premiumRateBps,
    );
    cumulativeSuccessPremiumCents += successPremiumCents;
    const maximumFailureBonusExposureCents =
      pricing.pricingMode === "experience_rated"
        ? calculateMaximumFailureBonusExposureCents({
            netRecipientAmountCents: threshold.cumulativeNetRecipientThresholdCents,
            failureBonusRateBps: pricing.assumptions.failureBonusRateBps,
            eligibilityPolicy,
          })
        : undefined;
    const incrementalFailureBonusExposureCents =
      maximumFailureBonusExposureCents == null
        ? undefined
        : maximumFailureBonusExposureCents - cumulativeFailureBonusExposureCents;
    if (incrementalFailureBonusExposureCents != null && incrementalFailureBonusExposureCents < 0) {
      throw new Error("Cumulative failure-bonus exposure cannot decrease across thresholds.");
    }
    cumulativeFailureBonusExposureCents =
      maximumFailureBonusExposureCents ?? cumulativeFailureBonusExposureCents;
    previousThresholdCents = threshold.cumulativeNetRecipientThresholdCents;

    return {
      thresholdId: threshold.thresholdId,
      thresholdIndex: threshold.thresholdIndex,
      cumulativeNetRecipientThresholdCents: threshold.cumulativeNetRecipientThresholdCents,
      incrementalNetRecipientCents,
      premiumRateBps: pricing.premiumRateBps,
      successPremiumCents,
      cumulativeSuccessPremiumCents,
      grossSuccessRequirementCents:
        threshold.cumulativeNetRecipientThresholdCents + cumulativeSuccessPremiumCents,
      premiumPayer,
      premiumIncludedInNetRecipientThreshold: false as const,
      pricingMode: pricing.pricingMode,
      provisional: pricing.provisional,
      rationale: pricing.rationale,
      ...(pricing.pricingMode === "experience_rated"
        ? {
            assumptions: pricing.assumptions,
            incrementalFailureBonusExposureCents,
            maximumFailureBonusExposureCents,
          }
        : {}),
    };
  });

  return {
    policyVersion: FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
    premiumPayer,
    premiumIncludedInNetRecipientThreshold: false,
    thresholds: quotes,
    ...(eligibilityPolicy ? { eligibilityPolicy } : {}),
  };
}

export function getHighestClearedThresholdIndex(
  schedule: FailureBonusSuccessPremiumScheduleQuote,
  netRecipientCents: number,
) {
  requireSafeInteger(netRecipientCents, "Net recipient amount", 0);

  let clearedThresholdIndex = 0;
  for (const threshold of schedule.thresholds) {
    if (threshold.cumulativeNetRecipientThresholdCents > netRecipientCents) break;
    clearedThresholdIndex = threshold.thresholdIndex;
  }
  return clearedThresholdIndex;
}

export function getSuccessPremiumDueForClearedThreshold(
  schedule: FailureBonusSuccessPremiumScheduleQuote,
  clearedThresholdIndex: number,
) {
  requireSafeInteger(clearedThresholdIndex, "Cleared threshold index", 0, schedule.thresholds.length);

  if (clearedThresholdIndex === 0) {
    return {
      clearedThresholdIndex: 0,
      netRecipientThresholdCents: 0,
      successPremiumCents: 0,
      grossSuccessRequirementCents: 0,
    };
  }

  const threshold = schedule.thresholds[clearedThresholdIndex - 1];
  if (!threshold) {
    throw new Error("Cleared threshold is outside the premium schedule.");
  }

  return {
    clearedThresholdIndex,
    netRecipientThresholdCents: threshold.cumulativeNetRecipientThresholdCents,
    successPremiumCents: threshold.cumulativeSuccessPremiumCents,
    grossSuccessRequirementCents: threshold.grossSuccessRequirementCents,
  };
}
