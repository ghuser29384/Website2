import { cache } from "react";

import {
  buildDonationOffsetAggregationCompatibilityKey,
  DONATION_OFFSET_AGGREGATION_KEY_VERSION,
  DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION,
  EFFECTIVE_LIFE_YEAR_MICRO_SCALE,
} from "@/lib/donation-offset-impact";
import { createServiceClient } from "@/lib/supabase/server";

const RECEIPT_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JsonRecord = Record<string, unknown>;

export type PublicDonationRedirectReceiptStatus =
  | "completed"
  | "reversed"
  | "disputed";

export interface PublicDonationRedirectImpact {
  comparableMetric: {
    aggregationKey: string;
    unit: string;
    value: number;
  } | null;
  effectiveLifeYears: number | null;
  primaryOutput: string | null;
  status: "modeled" | "unavailable";
}

export interface PublicDonationRedirectParty {
  amountCents: number;
  charityName: string;
  impact: PublicDonationRedirectImpact;
}

export interface PublicDonationRedirectReceipt {
  completedAtIso: string;
  currency: "usd";
  owner: PublicDonationRedirectParty;
  counterparty: PublicDonationRedirectParty;
  status: PublicDonationRedirectReceiptStatus;
  totalAmountCents: number;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredBoundedText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

function finiteNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function parseImpact(
  value: unknown,
  expectedAmountCents: number,
  expectedDestinationId: string,
  expectedPartyId: string,
  expectedRole: "owner" | "counterparty",
): PublicDonationRedirectImpact | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== DONATION_OFFSET_IMPACT_SNAPSHOT_VERSION) return null;
  if (value.amountCents !== expectedAmountCents) return null;
  if (value.destinationId !== expectedDestinationId) return null;

  const attribution = value.attribution;
  if (!isRecord(attribution) || attribution.partyRole !== expectedRole) return null;
  if (attribution.partyId !== expectedPartyId) return null;

  if (value.status !== "available" && value.status !== "unavailable") return null;

  if (value.status === "unavailable") {
    return {
      comparableMetric: null,
      effectiveLifeYears: null,
      primaryOutput: null,
      status: "unavailable",
    };
  }

  const programOutput = value.programOutput;
  const effectiveLifeYears = value.effectiveLifeYears;
  const aggregationCompatibility = value.aggregationCompatibility;
  const model = value.model;
  if (
    !isRecord(programOutput) ||
    !isRecord(effectiveLifeYears) ||
    !isRecord(aggregationCompatibility) ||
    !isRecord(model)
  ) {
    return null;
  }

  const expectedCount = finiteNonNegativeNumber(programOutput.expectedCount);
  const singularLabel = requiredBoundedText(programOutput.unitLabelSingular, 100);
  const pluralLabel = requiredBoundedText(programOutput.unitLabelPlural, 100);
  const lifeYearEstimate = finiteNonNegativeNumber(effectiveLifeYears.estimate);
  const microLifeYearEstimate = finiteNonNegativeNumber(
    effectiveLifeYears.estimateMicroEffectiveLifeYears,
  );
  const compatibilityKey = requiredBoundedText(
    aggregationCompatibility.compatibilityKey,
    512,
  );
  const outcomeMetricId = requiredBoundedText(
    aggregationCompatibility.outcomeMetricId,
    120,
  );
  const outcomeUnit = requiredBoundedText(aggregationCompatibility.outcomeUnit, 80);
  const aggregationModelId = requiredBoundedText(
    aggregationCompatibility.aggregationModelId,
    160,
  );
  const aggregationModelVersion = requiredBoundedText(
    aggregationCompatibility.aggregationModelVersion,
    120,
  );
  const counterfactualDefinitionId = requiredBoundedText(
    aggregationCompatibility.counterfactualDefinitionId,
    160,
  );
  const sourceDatasetVersion = requiredBoundedText(
    aggregationCompatibility.sourceDatasetVersion,
    160,
  );
  const scenarioVersion = requiredBoundedText(effectiveLifeYears.scenarioVersion, 80);
  if (
    expectedCount === null ||
    !singularLabel ||
    !pluralLabel ||
    lifeYearEstimate === null ||
    microLifeYearEstimate === null ||
    !Number.isSafeInteger(microLifeYearEstimate) ||
    lifeYearEstimate !== microLifeYearEstimate / EFFECTIVE_LIFE_YEAR_MICRO_SCALE ||
    effectiveLifeYears.unit !== "effective_life_year" ||
    !compatibilityKey ||
    aggregationCompatibility.keyVersion !== DONATION_OFFSET_AGGREGATION_KEY_VERSION ||
    !outcomeMetricId ||
    !outcomeUnit ||
    !aggregationModelId ||
    !aggregationModelVersion ||
    !counterfactualDefinitionId ||
    !sourceDatasetVersion ||
    !scenarioVersion ||
    outcomeUnit !== effectiveLifeYears.unit ||
    aggregationModelVersion !== `moral-trade-derived-scenario-${scenarioVersion}` ||
    model.sourceDatasetVersion !== sourceDatasetVersion
  ) {
    return null;
  }

  const rebuiltCompatibilityKey = buildDonationOffsetAggregationCompatibilityKey({
    aggregationModelId,
    aggregationModelVersion,
    counterfactualDefinitionId,
    outcomeMetricId,
    outcomeUnit,
    sourceDatasetVersion,
  });
  if (rebuiltCompatibilityKey !== compatibilityKey) return null;

  const outputLabel = expectedCount === 1 ? singularLabel : pluralLabel;

  return {
    comparableMetric: {
      aggregationKey: compatibilityKey,
      unit: "effective life-years saved",
      value: lifeYearEstimate,
    },
    effectiveLifeYears: microLifeYearEstimate / EFFECTIVE_LIFE_YEAR_MICRO_SCALE,
    primaryOutput: `${formatPublicReceiptImpact(expectedCount)} ${outputLabel}`,
    status: "modeled",
  };
}

function parseParty(
  value: unknown,
  expectedRole: "owner" | "counterparty",
): PublicDonationRedirectParty | null {
  if (!isRecord(value)) return null;

  const amountCents = finiteNonNegativeNumber(value.amountCents);
  const charityName = requiredBoundedText(value.charityName, 140);
  const charityId = requiredBoundedText(value.charityId, 140);
  const profileId = requiredBoundedText(value.profileId, 140);
  if (
    amountCents === null ||
    !Number.isSafeInteger(amountCents) ||
    amountCents < 50 ||
    !charityName ||
    !charityId ||
    !profileId ||
    value.participantRole !== expectedRole
  ) {
    return null;
  }

  const impact = parseImpact(
    value.impact,
    amountCents,
    charityId,
    profileId,
    expectedRole,
  );
  if (!impact) return null;

  return { amountCents, charityName, impact };
}

function parseCompletedAt(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function parsePublicStatus(value: unknown): PublicDonationRedirectReceiptStatus | null {
  if (value === "transferred") return "completed";
  if (value === "refunded") return "reversed";
  if (value === "disputed") return "disputed";
  return null;
}

export function parsePublicDonationRedirectReceipt(
  row: unknown,
): PublicDonationRedirectReceipt | null {
  if (!isRecord(row)) return null;

  const publicStatus = parsePublicStatus(row.status);
  const completedAtIso = parseCompletedAt(row.completed_at);
  const totalAmountCents = finiteNonNegativeNumber(row.total_amount_cents);
  if (
    !publicStatus ||
    !completedAtIso ||
    row.currency !== "usd" ||
    totalAmountCents === null ||
    !Number.isSafeInteger(totalAmountCents)
  ) {
    return null;
  }

  const snapshot = row.condition_snapshot;
  if (!isRecord(snapshot)) return null;
  if (snapshot.schemaVersion !== "donation-offset-payment-condition-v2") return null;

  const redirects = snapshot.redirects;
  if (!isRecord(redirects)) return null;

  const owner = parseParty(redirects.owner, "owner");
  const counterparty = parseParty(redirects.counterparty, "counterparty");
  if (!owner || !counterparty) return null;
  if (owner.amountCents + counterparty.amountCents !== totalAmountCents) return null;

  return {
    completedAtIso,
    counterparty,
    currency: "usd",
    owner,
    status: publicStatus,
    totalAmountCents,
  };
}

/**
 * Reads a deliberately narrow projection. The parser below whitelists the only
 * frozen snapshot fields that may cross the public receipt boundary.
 */
export const getPublicDonationRedirectReceipt = cache(async (receiptToken: string) => {
  const normalizedToken = receiptToken.trim().toLowerCase();
  if (!RECEIPT_TOKEN_PATTERN.test(normalizedToken)) return null;

  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("conditional_settlement_batches")
      .select("status, currency, total_amount_cents, completed_at, condition_snapshot")
      .eq("public_receipt_token", normalizedToken)
      .eq("public_receipt_enabled", true)
      .eq("livemode", true)
      .eq("purpose", "donation_offset")
      .eq("subject_type", "donation_offset_match")
      .maybeSingle();

    if (error || !data) return null;
    return parsePublicDonationRedirectReceipt(data);
  } catch {
    return null;
  }
});

export function combinedEffectiveLifeYears(receipt: PublicDonationRedirectReceipt) {
  const ownerMetric = receipt.owner.impact.comparableMetric;
  const counterpartyMetric = receipt.counterparty.impact.comparableMetric;
  if (!ownerMetric || !counterpartyMetric) return null;
  if (ownerMetric.aggregationKey !== counterpartyMetric.aggregationKey) return null;
  if (ownerMetric.unit.toLowerCase() !== "effective life-years saved") return null;
  if (counterpartyMetric.unit.toLowerCase() !== "effective life-years saved") return null;

  return ownerMetric.value + counterpartyMetric.value;
}

export function formatPublicReceiptMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountCents / 100);
}

export function formatPublicReceiptImpact(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  if (magnitude >= 0.1) return value.toFixed(2);
  if (magnitude >= 0.01) return value.toFixed(3);
  return value.toFixed(5);
}
