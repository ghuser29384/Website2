import { createHash } from "node:crypto";

export type ConditionalPaymentsMode = "disabled" | "test" | "live";
export type ConditionalPaymentPurpose = "donation_offset" | "public_goods_pool";
export type ConditionalPaymentSubjectType =
  | "donation_offset_match"
  | "donation_offset_pool"
  | "mpgf_campaign";
export type ConditionalPaymentParticipantRole = "owner" | "counterparty" | "pledger";

export interface ConditionalPaymentsEnvironment {
  enabled: boolean;
  livemode: boolean;
  mode: ConditionalPaymentsMode;
  reason: string;
}

export interface DonationOffsetConditionSnapshot {
  schemaVersion: "donation-offset-payment-condition-v1";
  matchId: string;
  offerId: string;
  ownerProfileId: string;
  counterpartyProfileId: string;
  matchedBaselineCents: number;
  matchedCounterpartyCents: number;
  compromiseTotalCents: number;
  unmatchedBaselineCents: number;
  unmatchedCounterpartyCents: number;
  currency: "usd";
  compromiseCharityId: string;
  compromiseCharityName: string;
  destinationId: string;
  destinationDisplayName: string;
  destinationConnectedAccountId: string;
  destinationLivemode: boolean;
  baselineAmountCents: number;
  requestedMatchingAmountCents: number;
  baselineOpposedCause: string;
  requestedOpposedCause: string;
  offsetRatio: string;
  timeHorizon: string;
  participationMode: string;
  poolId: string | null;
  poolSide: string | null;
  verificationMethod: string;
  moderationStatus: string;
  unmatchedSurplusRule: string;
  assuranceMinimumCents: number;
  assuranceDeadlineAt: string | null;
  matchStatus: string;
  offerStatus: string;
}

function normalizeForCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForCanonicalJson(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(input)
        .sort()
        .map((key) => [key, normalizeForCanonicalJson(input[key])]),
    );
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Condition snapshots cannot contain non-finite numbers.");
    }
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  throw new Error(`Condition snapshots cannot contain ${typeof value} values.`);
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(normalizeForCanonicalJson(value));
}

export function hashConditionSnapshot(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function hashWebhookPayload(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function compactStripeMetadataValue(value: string, maximumLength = 480) {
  const normalized = value.trim();
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength - 13)}:${createHash("sha256")
        .update(normalized)
        .digest("hex")
        .slice(0, 12)}`;
}

export function makeConditionalIdempotencyKey(parts: Array<string | number | boolean>) {
  const raw = parts.map((part) => String(part)).join(":");
  const digest = createHash("sha256").update(raw).digest("hex");
  return `mtcp:${digest}`;
}

export function getConditionalPaymentsEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ConditionalPaymentsEnvironment {
  const secretKey = environment.STRIPE_SECRET_KEY?.trim() ?? "";
  const configuredMode = environment.CONDITIONAL_PAYMENTS_MODE?.trim().toLowerCase();

  let mode: ConditionalPaymentsMode = "disabled";

  if (configuredMode === "test" || configuredMode === "live" || configuredMode === "disabled") {
    mode = configuredMode;
  } else if (!configuredMode && secretKey.startsWith("sk_test_")) {
    // A Stripe test key cannot move live money. Inferring test mode here keeps every
    // deployment operable in a clearly labelled sandbox without weakening the live gate.
    mode = "test";
  }

  if (mode === "disabled") {
    return {
      enabled: false,
      livemode: false,
      mode,
      reason:
        "Conditional payments are disabled. Set CONDITIONAL_PAYMENTS_MODE to test or live after the relevant gates pass.",
    };
  }

  if (mode === "test" && !secretKey.startsWith("sk_test_")) {
    return {
      enabled: false,
      livemode: false,
      mode,
      reason: "Test mode requires a Stripe test secret key.",
    };
  }

  if (mode === "live" && !secretKey.startsWith("sk_live_")) {
    return {
      enabled: false,
      livemode: true,
      mode,
      reason: "Live mode requires a Stripe live secret key.",
    };
  }

  return {
    enabled: true,
    livemode: mode === "live",
    mode,
    reason: mode === "test" ? "Stripe test mode is enabled." : "Stripe live mode is enabled.",
  };
}

export function assertPositiveCurrencyAmount(amountCents: number, currency: string) {
  if (!Number.isInteger(amountCents) || amountCents < 50) {
    throw new Error("Conditional payment amounts must be whole minor units and at least 50 cents.");
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error("Conditional payment currency must be a lowercase three-letter code.");
  }
}

export function participantAmountForDonationOffset(
  snapshot: DonationOffsetConditionSnapshot,
  role: Extract<ConditionalPaymentParticipantRole, "owner" | "counterparty">,
) {
  return role === "owner" ? snapshot.matchedBaselineCents : snapshot.matchedCounterpartyCents;
}

export function donationOffsetSnapshotIsInternallyConsistent(
  snapshot: DonationOffsetConditionSnapshot,
) {
  return (
    snapshot.schemaVersion === "donation-offset-payment-condition-v1" &&
    snapshot.ownerProfileId !== snapshot.counterpartyProfileId &&
    Number.isInteger(snapshot.matchedBaselineCents) &&
    Number.isInteger(snapshot.matchedCounterpartyCents) &&
    snapshot.matchedBaselineCents >= 50 &&
    snapshot.matchedCounterpartyCents >= 50 &&
    snapshot.compromiseTotalCents ===
      snapshot.matchedBaselineCents + snapshot.matchedCounterpartyCents &&
    snapshot.destinationConnectedAccountId.startsWith("acct_") &&
    snapshot.moderationStatus === "clear" &&
    snapshot.matchStatus === "matched" &&
    (snapshot.offerStatus === "open" || snapshot.offerStatus === "matched")
  );
}

export function isFinalSettlementStatus(status: string) {
  return ["transferred", "refunded", "cancelled", "disputed"].includes(status);
}
