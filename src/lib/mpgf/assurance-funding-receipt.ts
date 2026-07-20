export const ASSURANCE_FUNDING_SCENARIO_TARGET_CENTS = 100_000;

export const ASSURANCE_FUNDING_RECEIPT_BOUNDARY =
  "Exact-fill educational scenario. You supplied the decisive-chance estimate. This does not use live round progress, predict whether you are decisive, create or change a pledge, or count a failure-participation bonus as pool funding.";

const DOLLAR_INPUT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const PERCENT_INPUT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export interface AssuranceFundingReceiptInput {
  pledgeCents: number;
  decisiveProbabilityBasisPoints: number;
  scenarioPoolTargetCents?: number;
}

export type AssuranceFundingReceiptResult =
  | {
      ok: true;
      pledgeCents: number;
      decisiveProbabilityBasisPoints: number;
      scenarioPoolTargetCents: number;
      otherFundingIfDecisiveCents: number;
      expectedOtherFundingMicroUsd: number;
      expectedOtherFundingPerPledgeDollarUsd: number;
    }
  | {
      ok: false;
      error: string;
    };

function isPositiveSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export function parseAssurancePledgeDollars(value: string) {
  if (!DOLLAR_INPUT_PATTERN.test(value)) return null;

  const [wholePart, fractionPart = ""] = value.split(".");
  const cents = Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

export function parseAssuranceProbabilityPercent(value: string) {
  if (!PERCENT_INPUT_PATTERN.test(value)) return null;

  const [wholePart, fractionPart = ""] = value.split(".");
  const basisPoints = Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0"));

  return Number.isSafeInteger(basisPoints) && basisPoints <= 10_000 ? basisPoints : null;
}

export function calculateAssuranceFundingReceipt({
  pledgeCents,
  decisiveProbabilityBasisPoints,
  scenarioPoolTargetCents = ASSURANCE_FUNDING_SCENARIO_TARGET_CENTS,
}: AssuranceFundingReceiptInput): AssuranceFundingReceiptResult {
  if (
    !isPositiveSafeInteger(scenarioPoolTargetCents) ||
    !Number.isSafeInteger(pledgeCents) ||
    pledgeCents < 100 ||
    pledgeCents > scenarioPoolTargetCents ||
    !Number.isSafeInteger(decisiveProbabilityBasisPoints) ||
    decisiveProbabilityBasisPoints < 0 ||
    decisiveProbabilityBasisPoints > 10_000
  ) {
    return {
      ok: false,
      error: "Enter a pledge from $1 to $1,000 with no more than two decimal places, and a decisive probability from 0% to 100%.",
    };
  }

  const otherFundingIfDecisiveCents = scenarioPoolTargetCents - pledgeCents;
  // One cent times one probability basis point equals one micro-dollar.
  const expectedOtherFundingMicroUsd =
    otherFundingIfDecisiveCents * decisiveProbabilityBasisPoints;

  if (!Number.isSafeInteger(expectedOtherFundingMicroUsd)) {
    return {
      ok: false,
      error: "This scenario is too large to calculate safely.",
    };
  }

  return {
    ok: true,
    pledgeCents,
    decisiveProbabilityBasisPoints,
    scenarioPoolTargetCents,
    otherFundingIfDecisiveCents,
    expectedOtherFundingMicroUsd,
    expectedOtherFundingPerPledgeDollarUsd:
      expectedOtherFundingMicroUsd / (10_000 * pledgeCents),
  };
}
