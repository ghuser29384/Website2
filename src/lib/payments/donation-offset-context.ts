import { createServiceClient } from "@/lib/supabase/server";
import {
  donationOffsetSnapshotIsInternallyConsistent,
  getConditionalPaymentsEnvironment,
  hashConditionSnapshot,
  type ConditionalPaymentParticipantRole,
  type DonationOffsetConditionSnapshot,
} from "@/lib/payments/conditional-state";

export interface DonationOffsetPaymentContext {
  match: Record<string, any>;
  offer: Record<string, any>;
  offset: Record<string, any>;
  charity: Record<string, any>;
  destination: Record<string, any>;
  snapshot: DonationOffsetConditionSnapshot;
  conditionHash: string;
}

const BLOCKED_MATCH_STATUSES = new Set([
  "blocked",
  "cancelled",
  "completed",
  "failed",
  "refunded",
  "disputed",
]);
const BLOCKED_OFFER_STATUSES = new Set([
  "blocked",
  "cancelled",
  "withdrawn",
  "expired",
  "paused",
  "closed",
]);

function requireInteger(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer.`);
  }
  return parsed;
}

function requireText(value: unknown, label: string) {
  const parsed = typeof value === "string" ? value.trim() : "";
  if (!parsed) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

export async function loadDonationOffsetPaymentContext(
  matchId: string,
): Promise<DonationOffsetPaymentContext> {
  const normalizedMatchId = matchId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(normalizedMatchId)) {
    throw new Error("A valid donation-offset match ID is required.");
  }

  const environment = getConditionalPaymentsEnvironment();
  const supabase = createServiceClient() as any;
  const { data: match, error: matchError } = await supabase
    .from("donation_offset_matches")
    .select("*")
    .eq("id", normalizedMatchId)
    .maybeSingle();

  if (matchError) {
    throw new Error(`Unable to read the donation-offset match: ${matchError.message}`);
  }
  if (!match) {
    throw new Error("Donation-offset match not found.");
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", match.offer_id)
    .maybeSingle();
  const { data: offset, error: offsetError } = await supabase
    .from("donation_offset_offers")
    .select("*")
    .eq("offer_id", match.offer_id)
    .maybeSingle();

  if (offerError || offsetError) {
    throw new Error(
      `Unable to read the offset terms: ${offerError?.message ?? offsetError?.message ?? "unknown error"}`,
    );
  }
  if (!offer || !offset || offer.mode !== "offset") {
    throw new Error("The match is not attached to a donation-offset offer.");
  }

  const { data: charity, error: charityError } = await supabase
    .from("registered_charities")
    .select("*")
    .eq("id", offset.compromise_charity_id)
    .maybeSingle();
  const { data: destination, error: destinationError } = await supabase
    .from("conditional_payment_destinations")
    .select("*")
    .eq("registered_charity_id", offset.compromise_charity_id)
    .eq("livemode", environment.livemode)
    .eq("status", "active")
    .maybeSingle();

  if (charityError || destinationError) {
    throw new Error(
      `Unable to verify the settlement destination: ${
        charityError?.message ?? destinationError?.message ?? "unknown error"
      }`,
    );
  }
  if (!charity || !charity.is_active || !charity.selectable || charity.is_political_campaign) {
    throw new Error("The compromise destination is not eligible for automated settlement.");
  }
  if (!destination) {
    throw new Error(
      environment.livemode
        ? "The compromise charity does not have an approved live payment destination."
        : "The compromise charity does not have an active Stripe test destination.",
    );
  }
  if (Boolean(destination.livemode) !== environment.livemode) {
    throw new Error("The payment destination environment does not match the Stripe key environment.");
  }
  if (environment.livemode && destination.test_only) {
    throw new Error("A test-only payment destination cannot receive live settlement.");
  }

  const ownerProfileId = requireText(match.owner_profile_id, "Owner profile");
  const counterpartyProfileId = requireText(match.counterparty_profile_id, "Counterparty profile");
  if (ownerProfileId === counterpartyProfileId) {
    throw new Error("A donation offset requires two distinct participants.");
  }
  if (offer.owner_id !== ownerProfileId) {
    throw new Error("The match owner does not match the offer owner.");
  }
  if (offset.moderation_status !== "clear") {
    throw new Error("The donation offset must be review-cleared before payment authorization.");
  }
  if (BLOCKED_MATCH_STATUSES.has(String(match.status))) {
    throw new Error(`The donation-offset match is ${match.status} and cannot settle.`);
  }
  if (BLOCKED_OFFER_STATUSES.has(String(offer.status))) {
    throw new Error(`The donation-offset offer is ${offer.status} and cannot settle.`);
  }
  if (
    offset.assurance_deadline_at &&
    Date.parse(offset.assurance_deadline_at) <= Date.now()
  ) {
    throw new Error("The donation-offset assurance deadline has passed.");
  }

  const matchedBaselineCents = requireInteger(match.matched_baseline_cents, "Owner amount");
  const matchedCounterpartyCents = requireInteger(
    match.matched_counterparty_cents,
    "Counterparty amount",
  );
  const compromiseTotalCents = requireInteger(match.compromise_total_cents, "Compromise total");
  if (matchedBaselineCents < 50 || matchedCounterpartyCents < 50) {
    throw new Error("Each side of a card-funded offset must be at least 50 cents.");
  }
  if (matchedBaselineCents + matchedCounterpartyCents !== compromiseTotalCents) {
    throw new Error("The compromise total does not equal the two participant charges.");
  }

  const snapshot: DonationOffsetConditionSnapshot = {
    schemaVersion: "donation-offset-payment-condition-v1",
    matchId: String(match.id),
    offerId: String(match.offer_id),
    ownerProfileId,
    counterpartyProfileId,
    matchedBaselineCents,
    matchedCounterpartyCents,
    compromiseTotalCents,
    unmatchedBaselineCents: requireInteger(match.unmatched_baseline_cents ?? 0, "Unmatched owner amount"),
    unmatchedCounterpartyCents: requireInteger(
      match.unmatched_counterparty_cents ?? 0,
      "Unmatched counterparty amount",
    ),
    currency: "usd",
    compromiseCharityId: requireText(charity.id, "Compromise charity ID"),
    compromiseCharityName: requireText(charity.name, "Compromise charity name"),
    destinationId: requireText(destination.id, "Settlement destination ID"),
    destinationDisplayName: requireText(destination.display_name, "Settlement destination name"),
    destinationConnectedAccountId: requireText(
      destination.stripe_connected_account_id,
      "Stripe connected account",
    ),
    destinationLivemode: Boolean(destination.livemode),
    baselineAmountCents: requireInteger(offset.baseline_amount_cents, "Baseline amount"),
    requestedMatchingAmountCents: requireInteger(
      offset.requested_matching_amount_cents,
      "Requested matching amount",
    ),
    baselineOpposedCause: requireText(offset.baseline_opposed_cause, "Baseline opposed cause"),
    requestedOpposedCause: requireText(offset.requested_opposed_cause, "Requested opposed cause"),
    offsetRatio: String(offset.offset_ratio),
    timeHorizon: requireText(offset.time_horizon, "Time horizon"),
    participationMode: requireText(offset.participation_mode, "Participation mode"),
    poolId: offset.pool_id ? String(offset.pool_id) : null,
    poolSide: offset.pool_side ? String(offset.pool_side) : null,
    verificationMethod: requireText(offset.verification_method, "Verification method"),
    moderationStatus: requireText(offset.moderation_status, "Moderation status"),
    unmatchedSurplusRule: requireText(offset.unmatched_surplus_rule, "Unmatched surplus rule"),
    assuranceMinimumCents: requireInteger(
      offset.assurance_minimum_cents ?? 0,
      "Assurance minimum",
    ),
    assuranceDeadlineAt: offset.assurance_deadline_at
      ? new Date(offset.assurance_deadline_at).toISOString()
      : null,
    matchStatus: requireText(match.status, "Match status"),
    offerStatus: requireText(offer.status, "Offer status"),
  };

  if (!donationOffsetSnapshotIsInternallyConsistent(snapshot)) {
    throw new Error("The frozen donation-offset payment condition is internally inconsistent.");
  }

  return {
    match,
    offer,
    offset,
    charity,
    destination,
    snapshot,
    conditionHash: hashConditionSnapshot(snapshot),
  };
}

export function getDonationOffsetParticipantRole(
  context: DonationOffsetPaymentContext,
  profileId: string,
): Extract<ConditionalPaymentParticipantRole, "owner" | "counterparty"> {
  if (profileId === context.snapshot.ownerProfileId) {
    return "owner";
  }
  if (profileId === context.snapshot.counterpartyProfileId) {
    return "counterparty";
  }
  throw new Error("Only a participant in this donation-offset match can authorize payment.");
}
