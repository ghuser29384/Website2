export const COMPACT_OUTFLOW_LEDGER_VERSION =
  "compact-authoritative-outflow-ledger/v1" as const;

export type CompactOutflowAuthorityStatus =
  | "unavailable"
  | "incomplete"
  | "provisional"
  | "complete"
  | "superseded"
  | "invalidated";

export type CompactOutflowPublicCoverage =
  | "unavailable"
  | "partial"
  | "complete";

export interface CompactOutflowEventValue {
  direction: "outgoing" | "incoming" | "internal" | "self";
  paymentKind:
    | "moral_trade_payment"
    | "compact_contribution"
    | "wallet_funding"
    | "deposit"
    | "escrow";
  settlementStatus: "settled" | "pending" | "failed";
  grossSettledCents: number;
  refundedCents: number;
  reversedCents: number;
  chargebackCents: number;
  currency: string;
  environment: "qa" | "preview" | "staging" | "production";
  synthetic: boolean;
  occurredAt: string;
  settledAt: string | null;
}

const CYCLE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function safeMinorUnits(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

export function priorCompleteUtcMonthBounds(cycleKey: string) {
  const match = CYCLE_PATTERN.exec(cycleKey);
  if (!match) throw new Error("A YYYY-MM Compact cycle key is required.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const periodEndExclusive = new Date(Date.UTC(year, monthIndex, 1));
  const periodStart = new Date(Date.UTC(year, monthIndex - 1, 1));
  return {
    periodStart: periodStart.toISOString(),
    periodEndExclusive: periodEndExclusive.toISOString(),
  };
}

export function publicCoverageForAuthority(
  status: CompactOutflowAuthorityStatus,
): CompactOutflowPublicCoverage {
  if (status === "complete") return "complete";
  if (status === "incomplete" || status === "provisional") return "partial";
  return "unavailable";
}

export function eligibleNetSettledOutflowCents(
  events: readonly CompactOutflowEventValue[],
  options: {
    cycleKey: string;
    environment: CompactOutflowEventValue["environment"];
    currency?: "USD";
  },
) {
  const { periodStart, periodEndExclusive } = priorCompleteUtcMonthBounds(
    options.cycleKey,
  );
  const start = Date.parse(periodStart);
  const end = Date.parse(periodEndExclusive);

  return events.reduce((total, event) => {
    const gross = safeMinorUnits(event.grossSettledCents, "grossSettledCents");
    const refunded = safeMinorUnits(event.refundedCents, "refundedCents");
    const reversed = safeMinorUnits(event.reversedCents, "reversedCents");
    const chargedBack = safeMinorUnits(event.chargebackCents, "chargebackCents");
    if (refunded + reversed + chargedBack > gross) {
      throw new Error("Adjustments cannot exceed gross settled cents.");
    }
    const occurred = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurred)) throw new Error("occurredAt must be valid.");

    const eligible =
      event.direction === "outgoing" &&
      event.paymentKind === "moral_trade_payment" &&
      event.settlementStatus === "settled" &&
      event.settledAt !== null &&
      event.currency === (options.currency ?? "USD") &&
      event.environment === options.environment &&
      !(options.environment === "production" && event.synthetic) &&
      occurred >= start &&
      occurred < end;

    return eligible
      ? total + Math.max(0, gross - refunded - reversed - chargedBack)
      : total;
  }, 0);
}

export function compactShadowAmountCents(eligibleOutflowCents: number) {
  return Math.floor(safeMinorUnits(eligibleOutflowCents, "eligibleOutflowCents") / 10);
}
