export const MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY =
  "mpgf_advanced_pivotality_calculator_v1";

export const MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE =
  "This is a simplified model. It does not use live sealed-round data, does not estimate whether you are actually pivotal, and does not affect your pledge or the round clearing.";

export const MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS = [
  "roundId",
  "projectId",
  "participantId",
  "commonGroundBudgetId",
  "conditionalTradeIntentId",
  "liveThresholdCents",
  "liveCounterpartyGapCents",
  "liveSupporterCount",
  "liveActiveClusterCount",
  "liveSuccessWithoutMe",
] as const;

const DECIMAL_SCALE = BigInt(1_000_000);
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

export interface MpgfPivotalityCalculatorInput {
  contributionCents: number;
  thresholdCents: number;
  valueRatio: string;
  pSuccessWithoutMe: string;
  userEstimatedPDecisive: string;
  signerOnlyRewardValue?: string;
  nonDecisiveExtraFundingValueFraction?: string;
}

export type MpgfPivotalityResultCode =
  | "invalid"
  | "impossible_under_model"
  | "impossible_under_probability_inputs"
  | "beats_alternative"
  | "does_not_beat_alternative";

export interface MpgfPivotalityCalculatorResult {
  ok: boolean;
  policy: typeof MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY;
  blockers: string[];
  requiredPDecisiveScaled: string | null;
  requiredPDecisivePercent: string | null;
  userEstimatedPDecisivePercent: string | null;
  resultCode: MpgfPivotalityResultCode;
  interpretation: string;
  isolationNotice: typeof MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE;
  usesLiveRoundData: false;
  writesFundingRecords: false;
}

type ParsedDecimal = {
  ok: boolean;
  scaled: bigint;
  blocker: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseFixedDecimal(value: unknown, field: string): ParsedDecimal {
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) {
    return { ok: false, scaled: BigInt(0), blocker: `${field}_decimal_invalid` };
  }

  const [wholePart, fractionPart = ""] = value.split(".");
  const paddedFraction = fractionPart.padEnd(6, "0");
  const scaled = BigInt(wholePart) * DECIMAL_SCALE + BigInt(paddedFraction);

  return { ok: true, scaled, blocker: null };
}

function isPositiveSafeIntegerCents(value: unknown) {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function decimalLteOne(parsed: ParsedDecimal) {
  return parsed.ok && parsed.scaled <= DECIMAL_SCALE;
}

function decimalGteZero(parsed: ParsedDecimal) {
  return parsed.ok && parsed.scaled >= BigInt(0);
}

function scaledPercent(scaled: bigint) {
  const hundredths = (scaled * BigInt(10_000)) / DECIMAL_SCALE;
  const whole = hundredths / BigInt(100);
  const fraction = hundredths % BigInt(100);

  if (fraction === BigInt(0)) {
    return `${whole.toString()}%`;
  }

  const fractionText = fraction.toString().padStart(2, "0").replace(/0$/, "");
  return `${whole.toString()}.${fractionText}%`;
}

function invalidResult(blockers: string[]): MpgfPivotalityCalculatorResult {
  return {
    ok: false,
    policy: MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY,
    blockers,
    requiredPDecisiveScaled: null,
    requiredPDecisivePercent: null,
    userEstimatedPDecisivePercent: null,
    resultCode: "invalid",
    interpretation: "The calculator inputs are invalid under the fixed-point validation rules.",
    isolationNotice: MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
    usesLiveRoundData: false,
    writesFundingRecords: false,
  };
}

export function evaluateMpgfPivotalityCalculator(
  input: unknown,
): MpgfPivotalityCalculatorResult {
  const blockers: string[] = [];

  if (!isRecord(input)) {
    return invalidResult(["pivotality_input_not_object"]);
  }

  for (const key of MPGF_PUBLIC_GOODS_PIVOTALITY_FORBIDDEN_LIVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      blockers.push(`pivotality_forbidden_live_key_${key}`);
    }
  }

  const contributionCents = input.contributionCents;
  const thresholdCents = input.thresholdCents;
  const valueRatio = parseFixedDecimal(input.valueRatio, "value_ratio");
  const pSuccessWithoutMe = parseFixedDecimal(input.pSuccessWithoutMe, "p_success_without_me");
  const userEstimatedPDecisive = parseFixedDecimal(input.userEstimatedPDecisive, "user_estimated_p_decisive");
  const signerOnlyRewardValue = parseFixedDecimal(
    input.signerOnlyRewardValue ?? "0",
    "signer_only_reward_value",
  );
  const nonDecisiveExtraFundingValueFraction = parseFixedDecimal(
    input.nonDecisiveExtraFundingValueFraction ?? "0",
    "non_decisive_extra_funding_value_fraction",
  );

  if (!isPositiveSafeIntegerCents(contributionCents)) {
    blockers.push("contribution_cents_invalid");
  }
  if (!isPositiveSafeIntegerCents(thresholdCents)) {
    blockers.push("threshold_cents_invalid");
  }

  for (const parsed of [
    valueRatio,
    pSuccessWithoutMe,
    userEstimatedPDecisive,
    signerOnlyRewardValue,
    nonDecisiveExtraFundingValueFraction,
  ]) {
    if (!parsed.ok && parsed.blocker) {
      blockers.push(parsed.blocker);
    }
  }

  if (!decimalGteZero(valueRatio)) {
    blockers.push("value_ratio_negative_or_invalid");
  }
  if (!decimalLteOne(pSuccessWithoutMe)) {
    blockers.push("p_success_without_me_out_of_range");
  }
  if (!decimalLteOne(userEstimatedPDecisive)) {
    blockers.push("user_estimated_p_decisive_out_of_range");
  }
  if (!decimalGteZero(signerOnlyRewardValue)) {
    blockers.push("signer_only_reward_value_negative_or_invalid");
  }
  if (!decimalGteZero(nonDecisiveExtraFundingValueFraction)) {
    blockers.push("non_decisive_extra_funding_value_fraction_negative_or_invalid");
  }
  if (
    pSuccessWithoutMe.ok &&
    userEstimatedPDecisive.ok &&
    pSuccessWithoutMe.scaled + userEstimatedPDecisive.scaled > DECIMAL_SCALE
  ) {
    blockers.push("probability_mass_exceeds_one");
  }

  if (blockers.length > 0) {
    return invalidResult(blockers);
  }

  const x = BigInt(contributionCents as number);
  const threshold = BigInt(thresholdCents as number);
  const rTimesThresholdOverX = (valueRatio.scaled * threshold) / x;
  const hTimesR = (nonDecisiveExtraFundingValueFraction.scaled * valueRatio.scaled) / DECIMAL_SCALE;
  const numeratorInner = DECIMAL_SCALE - signerOnlyRewardValue.scaled - hTimesR;
  const numerator = (pSuccessWithoutMe.scaled * numeratorInner) / DECIMAL_SCALE;
  const denominator = rTimesThresholdOverX + signerOnlyRewardValue.scaled - DECIMAL_SCALE;

  let requiredPDecisive: bigint;
  let resultCode: MpgfPivotalityResultCode;
  let interpretation: string;

  if (numerator <= BigInt(0)) {
    requiredPDecisive = BigInt(0);
  } else if (denominator <= BigInt(0)) {
    return {
      ok: true,
      policy: MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY,
      blockers: [],
      requiredPDecisiveScaled: null,
      requiredPDecisivePercent: null,
      userEstimatedPDecisivePercent: scaledPercent(userEstimatedPDecisive.scaled),
      resultCode: "impossible_under_model",
      interpretation:
        "Under these inputs, being decisive is not enough to make the pledge best by this simplified model.",
      isolationNotice: MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
      usesLiveRoundData: false,
      writesFundingRecords: false,
    };
  } else {
    requiredPDecisive = (numerator * DECIMAL_SCALE) / denominator;
  }

  if (requiredPDecisive > DECIMAL_SCALE - pSuccessWithoutMe.scaled) {
    resultCode = "impossible_under_probability_inputs";
    interpretation = "The required decisive probability is impossible under your probability inputs.";
  } else if (requiredPDecisive <= userEstimatedPDecisive.scaled) {
    resultCode = "beats_alternative";
    interpretation =
      "By your stated values under this simplified model, the pledge beats your alternative use of the money.";
  } else {
    resultCode = "does_not_beat_alternative";
    interpretation =
      "By your stated values under this simplified model, the pledge does not beat your alternative use of the money.";
  }

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_PIVOTALITY_POLICY,
    blockers: [],
    requiredPDecisiveScaled: requiredPDecisive.toString(),
    requiredPDecisivePercent: scaledPercent(requiredPDecisive),
    userEstimatedPDecisivePercent: scaledPercent(userEstimatedPDecisive.scaled),
    resultCode,
    interpretation,
    isolationNotice: MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
    usesLiveRoundData: false,
    writesFundingRecords: false,
  };
}
