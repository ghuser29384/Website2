import {
  FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS,
  FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
  PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY,
  assertPermittedProvisionalFailureBonusPricingPolicy,
  buildFailureBonusEligibilityPolicy,
  isCurrentFailureBonusEligibilityPolicy,
  quoteFailureBonusSuccessPremiumSchedule,
  type FailureBonusEligibilityPolicy,
  type FailureBonusSuccessPremiumPricingAssumptions,
  type FailureBonusSuccessPremiumScheduleQuote,
} from "./failure-bonus-success-premium";

export const FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS = 10;

export interface FailureBonusThresholdDraft {
  thresholdId: string;
  cumulativeNetRecipientDollars: string;
  successProbabilityPercent: string;
  expectedEligibleFailureFillPercent: string;
}

export interface FailureBonusThresholdEditorQuote {
  schedule: FailureBonusSuccessPremiumScheduleQuote;
  eligibilityPolicy: FailureBonusEligibilityPolicy;
  failureBonusRateBps: number;
  firstThresholdCents: number;
  firstPremiumRateBps: number;
  firstSuccessPremiumCents: number;
  firstGrossSuccessRequirementCents: number;
}

export type FailureBonusScheduleStatus = "pending_review" | "approved";

export type FailureBonusThresholdEditorResult =
  | { ok: true; quote: FailureBonusThresholdEditorQuote; errors: [] }
  | { ok: false; quote: null; errors: string[] };

function parseFixedDecimal(value: string, decimalPlaces: number, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);

  const match = normalized.match(new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimalPlaces}}))?$`));
  if (!match) {
    throw new Error(`${label} must be a non-negative number with at most ${decimalPlaces} decimal places.`);
  }

  const scale = BigInt(10 ** decimalPlaces);
  const whole = BigInt(match[1]);
  const fractional = BigInt((match[2] ?? "").padEnd(decimalPlaces, "0"));
  const scaled = whole * scale + fractional;
  if (scaled > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds exact integer limits.`);
  }
  return Number(scaled);
}

export function parseUsdInputToCents(value: string, label = "Amount") {
  return parseFixedDecimal(value, 2, label);
}

export function parsePercentInputToBasisPoints(value: string, label = "Percentage") {
  return parseFixedDecimal(value, 2, label);
}

export function formatCentsForUsdInput(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("USD input formatting requires non-negative safe integer cents.");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function createFailureBonusThresholdDraft({
  thresholdId,
  cumulativeNetRecipientDollars,
  successProbabilityPercent = "75.00",
  expectedEligibleFailureFillPercent = "40.00",
}: {
  thresholdId: string;
  cumulativeNetRecipientDollars: string;
  successProbabilityPercent?: string;
  expectedEligibleFailureFillPercent?: string;
}): FailureBonusThresholdDraft {
  return {
    thresholdId,
    cumulativeNetRecipientDollars,
    successProbabilityPercent,
    expectedEligibleFailureFillPercent,
  };
}

export function addFailureBonusThresholdDraft(
  drafts: readonly FailureBonusThresholdDraft[],
  thresholdId: string,
): FailureBonusThresholdDraft[] {
  if (drafts.length >= FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS) {
    throw new Error("A pool can contain at most ten cumulative thresholds.");
  }
  const trimmedId = thresholdId.trim();
  if (!trimmedId || drafts.some((draft) => draft.thresholdId === trimmedId)) {
    throw new Error("Each threshold requires a unique stable identifier.");
  }

  const previousCents = drafts.length
    ? parseUsdInputToCents(
        drafts[drafts.length - 1]!.cumulativeNetRecipientDollars,
        "Previous cumulative threshold",
      )
    : 0;
  return [
    ...drafts,
    createFailureBonusThresholdDraft({
      thresholdId: trimmedId,
      cumulativeNetRecipientDollars: formatCentsForUsdInput(previousCents + 100),
    }),
  ];
}

export function removeFailureBonusThresholdDraft(
  drafts: readonly FailureBonusThresholdDraft[],
  thresholdId: string,
) {
  if (drafts.length <= 1) {
    throw new Error("A failure-bonus pool must retain at least one threshold.");
  }
  const next = drafts.filter((draft) => draft.thresholdId !== thresholdId);
  if (next.length === drafts.length) throw new Error("Threshold to remove was not found.");
  return next;
}

export function moveFailureBonusThresholdDraft(
  drafts: readonly FailureBonusThresholdDraft[],
  thresholdId: string,
  direction: "up" | "down",
) {
  const index = drafts.findIndex((draft) => draft.thresholdId === thresholdId);
  if (index < 0) throw new Error("Threshold to move was not found.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= drafts.length) return [...drafts];

  const next = [...drafts];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

function buildThresholdRationale(thresholdIndex: number) {
  return `Provisional threshold ${thresholdIndex} experience-rated quote; operator approval remains required.`;
}

function buildAssumptions({
  failureBonusRateBps,
  draft,
}: {
  failureBonusRateBps: number;
  draft: FailureBonusThresholdDraft;
}): FailureBonusSuccessPremiumPricingAssumptions {
  const assumptions = {
    successProbabilityBps: parsePercentInputToBasisPoints(
      draft.successProbabilityPercent,
      "Estimated threshold success probability",
    ),
    failureBonusRateBps,
    expectedEligibleFailureFillBps: parsePercentInputToBasisPoints(
      draft.expectedEligibleFailureFillPercent,
      "Expected eligible balance at failure",
    ),
    expenseLoadBps: PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.expenseLoadBps,
    reserveRiskMarginBps: PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY.reserveRiskMarginBps,
  };
  assertPermittedProvisionalFailureBonusPricingPolicy(assumptions);
  return assumptions;
}

export function buildFailureBonusThresholdEditorQuote({
  drafts,
  failureBonusRatePercent,
  maxParticipants,
  maxBonusPerParticipantDollars,
  requestedMaximumFundingDollars,
  verifiedSupporterMinimum,
}: {
  drafts: readonly FailureBonusThresholdDraft[];
  failureBonusRatePercent: string;
  maxParticipants: string;
  maxBonusPerParticipantDollars: string;
  requestedMaximumFundingDollars: string;
  verifiedSupporterMinimum: number;
}): FailureBonusThresholdEditorResult {
  const errors: string[] = [];

  try {
    if (drafts.length < 1 || drafts.length > FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS) {
      throw new Error("Provide between one and ten cumulative thresholds.");
    }

    const failureBonusRateBps = parsePercentInputToBasisPoints(
      failureBonusRatePercent,
      "Failure-bonus rate",
    );
    if (failureBonusRateBps < 1 || failureBonusRateBps > 10_000) {
      throw new Error("Failure-bonus rate must be between 0.01% and 100%.");
    }

    const parsedMaxParticipants = Number(maxParticipants.trim());
    if (!Number.isSafeInteger(parsedMaxParticipants) || parsedMaxParticipants < 1) {
      throw new Error("Maximum eligible participants must be a positive whole number.");
    }
    if (
      Number.isSafeInteger(verifiedSupporterMinimum) &&
      verifiedSupporterMinimum > parsedMaxParticipants
    ) {
      throw new Error("Maximum eligible participants cannot be below the verified supporter minimum.");
    }

    const maxBonusPerParticipantCents = parseUsdInputToCents(
      maxBonusPerParticipantDollars,
      "Maximum failure bonus per participant",
    );
    const requestedMaximumFundingCents = parseUsdInputToCents(
      requestedMaximumFundingDollars,
      "Requested maximum funding",
    );
    const eligibilityPolicy = buildFailureBonusEligibilityPolicy({
      maxParticipants: parsedMaxParticipants,
      maxBonusPerParticipantCents,
    });

    const seenIds = new Set<string>();
    const thresholdInputs = drafts.map((draft, position) => {
      const thresholdId = draft.thresholdId.trim();
      if (!thresholdId || seenIds.has(thresholdId)) {
        throw new Error("Each threshold requires a unique stable identifier.");
      }
      seenIds.add(thresholdId);
      const cumulativeNetRecipientThresholdCents = parseUsdInputToCents(
        draft.cumulativeNetRecipientDollars,
        `Threshold ${position + 1} cumulative net amount`,
      );
      const assumptions = buildAssumptions({ failureBonusRateBps, draft });
      return {
        thresholdId,
        thresholdIndex: position + 1,
        cumulativeNetRecipientThresholdCents,
        pricing: {
          mode: "experience_rated" as const,
          assumptions,
          provisional: true,
          rationale: buildThresholdRationale(position + 1),
        },
      };
    });

    const schedule = quoteFailureBonusSuccessPremiumSchedule({
      premiumPayer: "pool_creator_or_sponsor",
      eligibilityPolicy,
      defaultPricing: thresholdInputs[0]!.pricing,
      thresholds: thresholdInputs,
    });
    const finalThreshold = schedule.thresholds.at(-1)!;
    if (finalThreshold.cumulativeNetRecipientThresholdCents > requestedMaximumFundingCents) {
      throw new Error("The highest cumulative threshold cannot exceed requested maximum funding.");
    }

    const first = schedule.thresholds[0]!;
    return {
      ok: true,
      errors: [],
      quote: {
        schedule,
        eligibilityPolicy,
        failureBonusRateBps,
        firstThresholdCents: first.cumulativeNetRecipientThresholdCents,
        firstPremiumRateBps: first.premiumRateBps,
        firstSuccessPremiumCents: first.successPremiumCents,
        firstGrossSuccessRequirementCents: first.grossSuccessRequirementCents,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Failure-bonus threshold schedule is invalid.");
    return { ok: false, quote: null, errors };
  }
}

function assertThresholdQuoteEqual(
  submitted: FailureBonusSuccessPremiumScheduleQuote["thresholds"][number],
  expected: FailureBonusSuccessPremiumScheduleQuote["thresholds"][number],
  scheduleStatus: FailureBonusScheduleStatus,
) {
  const scalarKeys = [
    "thresholdId",
    "thresholdIndex",
    "cumulativeNetRecipientThresholdCents",
    "incrementalNetRecipientCents",
    "premiumRateBps",
    "successPremiumCents",
    "cumulativeSuccessPremiumCents",
    "grossSuccessRequirementCents",
    "premiumPayer",
    "premiumIncludedInNetRecipientThreshold",
    "pricingMode",
    "incrementalFailureBonusExposureCents",
    "maximumFailureBonusExposureCents",
  ] as const;
  for (const key of scalarKeys) {
    if (submitted[key] !== expected[key]) {
      throw new Error(`Submitted threshold ${expected.thresholdIndex} ${key} does not match server pricing.`);
    }
  }
  if (JSON.stringify(submitted.assumptions) !== JSON.stringify(expected.assumptions)) {
    throw new Error(`Submitted threshold ${expected.thresholdIndex} assumptions do not match server pricing.`);
  }
  if (scheduleStatus === "pending_review") {
    if (submitted.provisional !== true || submitted.rationale !== expected.rationale) {
      throw new Error("Pool creators cannot self-approve or rewrite tranche underwriting rationale.");
    }
  } else if (submitted.provisional !== false || !submitted.rationale.trim()) {
    throw new Error("An approved threshold requires a non-empty operator rationale and provisional=false.");
  }
}

function validateFailureBonusSchedule({
  submittedSchedule,
  separateEligibilityPolicy,
  failureBonusRateBps,
  requestedMaximumFundingCents,
  verifiedSupporterMinimum,
  scheduleStatus,
}: {
  submittedSchedule: FailureBonusSuccessPremiumScheduleQuote;
  separateEligibilityPolicy: FailureBonusEligibilityPolicy;
  failureBonusRateBps: number;
  requestedMaximumFundingCents: number;
  verifiedSupporterMinimum: number;
  scheduleStatus: FailureBonusScheduleStatus;
}) {
  if (submittedSchedule.policyVersion !== FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION) {
    throw new Error("The success-premium policy version is missing or stale.");
  }
  if (
    submittedSchedule.premiumPayer !== "pool_creator_or_sponsor" ||
    submittedSchedule.premiumIncludedInNetRecipientThreshold !== false
  ) {
    throw new Error("The v0.1 schedule requires a creator-or-sponsor premium outside recipient thresholds.");
  }
  if (
    !isCurrentFailureBonusEligibilityPolicy(separateEligibilityPolicy) ||
    JSON.stringify(submittedSchedule.eligibilityPolicy) !== JSON.stringify(separateEligibilityPolicy)
  ) {
    throw new Error("The submitted pool-wide eligibility policy is missing, stale, or inconsistent.");
  }
  if (verifiedSupporterMinimum > separateEligibilityPolicy.maxParticipants) {
    throw new Error("Maximum eligible participants cannot be below the verified supporter minimum.");
  }

  const thresholdInputs = submittedSchedule.thresholds.map((threshold, position) => {
    if (threshold.thresholdIndex !== position + 1) {
      throw new Error("Threshold indexes must be contiguous and begin at 1.");
    }
    if (threshold.pricingMode !== "experience_rated" || !threshold.assumptions) {
      throw new Error("Every creator-authored threshold requires experience-rated assumptions.");
    }
    if (threshold.assumptions.failureBonusRateBps !== failureBonusRateBps) {
      throw new Error("Every threshold must use the one pool-wide failure-bonus formula.");
    }
    assertPermittedProvisionalFailureBonusPricingPolicy(threshold.assumptions);
    if (scheduleStatus === "pending_review") {
      if (threshold.provisional !== true || threshold.rationale !== buildThresholdRationale(position + 1)) {
        throw new Error("Pool creators cannot self-approve or rewrite tranche underwriting rationale.");
      }
    } else if (threshold.provisional !== false || !threshold.rationale.trim()) {
      throw new Error("Approved threshold schedules require operator rationale and provisional=false.");
    }
    return {
      thresholdId: threshold.thresholdId,
      thresholdIndex: threshold.thresholdIndex,
      cumulativeNetRecipientThresholdCents: threshold.cumulativeNetRecipientThresholdCents,
      pricing: {
        mode: "experience_rated" as const,
        assumptions: threshold.assumptions,
        provisional: true,
        rationale: buildThresholdRationale(position + 1),
      },
    };
  });

  const expected = quoteFailureBonusSuccessPremiumSchedule({
    premiumPayer: "pool_creator_or_sponsor",
    eligibilityPolicy: separateEligibilityPolicy,
    defaultPricing: thresholdInputs[0]!.pricing,
    thresholds: thresholdInputs,
  });
  if (expected.thresholds.at(-1)!.cumulativeNetRecipientThresholdCents > requestedMaximumFundingCents) {
    throw new Error("The highest cumulative threshold cannot exceed requested maximum funding.");
  }
  if (submittedSchedule.thresholds.length !== expected.thresholds.length) {
    throw new Error("Submitted threshold count does not match the server schedule.");
  }
  submittedSchedule.thresholds.forEach((threshold, index) => {
    assertThresholdQuoteEqual(threshold, expected.thresholds[index]!, scheduleStatus);
  });
  return scheduleStatus === "pending_review" ? expected : structuredClone(submittedSchedule);
}

export function validateSubmittedFailureBonusSchedule({
  submittedSchedule,
  separateEligibilityPolicy,
  failureBonusRateBps,
  requestedMaximumFundingCents,
  verifiedSupporterMinimum,
}: {
  submittedSchedule: FailureBonusSuccessPremiumScheduleQuote;
  separateEligibilityPolicy: FailureBonusEligibilityPolicy;
  failureBonusRateBps: number;
  requestedMaximumFundingCents: number;
  verifiedSupporterMinimum: number;
}) {
  return validateFailureBonusSchedule({
    submittedSchedule,
    separateEligibilityPolicy,
    failureBonusRateBps,
    requestedMaximumFundingCents,
    verifiedSupporterMinimum,
    scheduleStatus: "pending_review",
  });
}

export function validateStoredFailureBonusSchedule({
  submittedSchedule,
  separateEligibilityPolicy,
  failureBonusRateBps,
  requestedMaximumFundingCents,
  verifiedSupporterMinimum,
  scheduleStatus,
}: {
  submittedSchedule: FailureBonusSuccessPremiumScheduleQuote;
  separateEligibilityPolicy: FailureBonusEligibilityPolicy;
  failureBonusRateBps: number;
  requestedMaximumFundingCents: number;
  verifiedSupporterMinimum: number;
  scheduleStatus: FailureBonusScheduleStatus;
}) {
  return validateFailureBonusSchedule({
    submittedSchedule,
    separateEligibilityPolicy,
    failureBonusRateBps,
    requestedMaximumFundingCents,
    verifiedSupporterMinimum,
    scheduleStatus,
  });
}

export const FAILURE_BONUS_THRESHOLD_EDITOR_COPY = {
  poolWidePolicy:
    "All thresholds share one percentage formula and one eligibility policy. Eligible contributions must be captured before the deadline by verified unique people; creator-controlled, related-party, duplicate, reversed, disputed, and fraudulent contributions are excluded.",
  underwritingBounds: `Creator estimates may be more conservative than Moral Trade's provisional baseline: success probability at most ${
    FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS.maximumSuccessProbabilityBps / 100
  }% and expected eligible failure fill at least ${
    FAILURE_BONUS_PROVISIONAL_UNDERWRITING_BOUNDS.minimumExpectedEligibleFailureFillBps / 100
  }%.`,
} as const;
