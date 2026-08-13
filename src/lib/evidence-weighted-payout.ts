export const EVIDENCE_CONFIDENCE_BANDS = [0, 25, 50, 75, 100] as const;

export type EvidenceConfidenceBand = (typeof EVIDENCE_CONFIDENCE_BANDS)[number];
export type MilestoneMeasurementKind = "indivisible" | "units";

export const EVIDENCE_REPLACEMENT_WINDOW_DAYS = 7;
export const EVIDENCE_APPEAL_WINDOW_DAYS = 7;
export const EVIDENCE_MAX_REPLACEMENTS = 1;
export const EVIDENCE_MAX_APPEALS = 1;

export const EVIDENCE_PAYOUT_RULE =
  "maximum payout × completed units ÷ target units × evidence confidence; round down to the nearest cent";

export interface EvidencePayoutInput {
  maximumPayoutCents: number;
  measurementKind: MilestoneMeasurementKind;
  completedUnits: number;
  targetUnits: number;
  confidenceBand: EvidenceConfidenceBand;
}

export interface EvidencePayoutResult {
  amountDueCents: number;
  completionFractionBps: number;
  payoutPercentageBps: number;
}

function requireSafeNonNegativeInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer.`);
  }
}

export function isEvidenceConfidenceBand(value: number): value is EvidenceConfidenceBand {
  return EVIDENCE_CONFIDENCE_BANDS.includes(value as EvidenceConfidenceBand);
}

export function calculateEvidenceWeightedPayout(
  input: EvidencePayoutInput,
): EvidencePayoutResult {
  requireSafeNonNegativeInteger(input.maximumPayoutCents, "Maximum payout");
  requireSafeNonNegativeInteger(input.completedUnits, "Completed units");
  requireSafeNonNegativeInteger(input.targetUnits, "Target units");

  if (input.targetUnits < 1) {
    throw new Error("Target units must be at least one.");
  }
  if (input.completedUnits > input.targetUnits) {
    throw new Error("Completed units cannot exceed the pre-agreed target.");
  }
  if (!isEvidenceConfidenceBand(input.confidenceBand)) {
    throw new Error("Evidence confidence must use an approved fixed band.");
  }
  if (
    input.measurementKind === "indivisible" &&
    input.completedUnits !== 0 &&
    input.completedUnits !== input.targetUnits
  ) {
    throw new Error("Indivisible milestones can only be incomplete or complete.");
  }

  const completionFractionBps = Math.floor(
    (input.completedUnits * 10_000) / input.targetUnits,
  );
  const payoutPercentageBps = Math.floor(
    (completionFractionBps * input.confidenceBand) / 100,
  );
  const amountDueCents = Math.floor(
    (input.maximumPayoutCents * input.completedUnits * input.confidenceBand) /
      (input.targetUnits * 100),
  );

  return {
    amountDueCents,
    completionFractionBps,
    payoutPercentageBps,
  };
}

export function formatBasisPointsAsPercent(value: number) {
  requireSafeNonNegativeInteger(value, "Basis points");
  const whole = Math.floor(value / 100);
  const decimal = value % 100;
  return decimal === 0 ? `${whole}%` : `${whole}.${String(decimal).padStart(2, "0")}%`;
}

export function formatPrivateAmount(cents: number, currency: string) {
  requireSafeNonNegativeInteger(cents, "Amount");
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error("Currency must be a three-letter code.");
  }
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(cents / 100);
}
