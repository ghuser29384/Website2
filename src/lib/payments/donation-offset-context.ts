import { createServiceClient } from "@/lib/supabase/server";
import { calculateDonationOffsetImpactSnapshot } from "@/lib/donation-offset-impact";
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
  charities: {
    owner: Record<string, any>;
    counterparty: Record<string, any>;
  };
  destinations: {
    owner: Record<string, any>;
    counterparty: Record<string, any>;
  };
  redirectPlans: {
    owner: Record<string, any>;
    counterparty: Record<string, any>;
  };
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

  const ownerProfileId = requireText(match.owner_profile_id, "Owner profile");
  const counterpartyProfileId = requireText(match.counterparty_profile_id, "Counterparty profile");
  if (ownerProfileId === counterpartyProfileId) {
    throw new Error("A donation offset requires two distinct participants.");
  }
  if (offer.owner_id !== ownerProfileId) {
    throw new Error("The match owner does not match the offer owner.");
  }

  const { data: redirectPlanRows, error: redirectPlansError } = await supabase
    .from("donation_offset_redirect_plans")
    .select("*")
    .eq("match_id", normalizedMatchId);
  if (redirectPlansError) {
    throw new Error(`Unable to read the participant redirect plans: ${redirectPlansError.message}`);
  }
  const redirectPlansByRole = new Map(
    ((redirectPlanRows ?? []) as Array<Record<string, any>>).map((plan) => [
      String(plan.participant_role),
      plan,
    ]),
  );
  const ownerPlan = redirectPlansByRole.get("owner");
  const counterpartyPlan = redirectPlansByRole.get("counterparty");
  if (!ownerPlan || !counterpartyPlan) {
    throw new Error("Both participants must choose a redirect destination before authorization.");
  }
  if (
    String(ownerPlan.participant_profile_id) !== ownerProfileId ||
    String(counterpartyPlan.participant_profile_id) !== counterpartyProfileId
  ) {
    throw new Error("A participant redirect plan belongs to the wrong matched profile.");
  }

  const charityIds = [
    String(ownerPlan.registered_charity_id),
    String(counterpartyPlan.registered_charity_id),
  ];
  const [{ data: charityRows, error: charitiesError }, { data: destinationRows, error: destinationsError }] =
    await Promise.all([
      supabase.from("registered_charities").select("*").in("id", charityIds),
      supabase
        .from("conditional_payment_destinations")
        .select("*")
        .in("registered_charity_id", charityIds)
        .eq("livemode", environment.livemode)
        .eq("status", "active"),
    ]);
  if (charitiesError || destinationsError) {
    throw new Error(
      `Unable to verify the participant destinations: ${
        charitiesError?.message ?? destinationsError?.message ?? "unknown error"
      }`,
    );
  }
  const charitiesById = new Map(
    ((charityRows ?? []) as Array<Record<string, any>>).map((charityRow) => [
      String(charityRow.id),
      charityRow,
    ]),
  );
  const destinationsByCharityId = new Map(
    ((destinationRows ?? []) as Array<Record<string, any>>).map((destinationRow) => [
      String(destinationRow.registered_charity_id),
      destinationRow,
    ]),
  );
  const ownerCharity = charitiesById.get(charityIds[0]);
  const counterpartyCharity = charitiesById.get(charityIds[1]);
  const ownerDestination = destinationsByCharityId.get(charityIds[0]);
  const counterpartyDestination = destinationsByCharityId.get(charityIds[1]);

  for (const [role, charityRow, destinationRow] of [
    ["owner", ownerCharity, ownerDestination],
    ["counterparty", counterpartyCharity, counterpartyDestination],
  ] as const) {
    if (
      !charityRow ||
      !charityRow.is_active ||
      !charityRow.selectable ||
      charityRow.is_political_campaign
    ) {
      throw new Error(`The ${role} redirect is not eligible for automated settlement.`);
    }
    if (!destinationRow) {
      throw new Error(
        environment.livemode
          ? `${charityRow.name} does not yet have an approved live payment destination.`
          : `${charityRow.name} does not yet have an active Stripe test destination.`,
      );
    }
    if (Boolean(destinationRow.livemode) !== environment.livemode) {
      throw new Error("A payment destination does not match the Stripe key environment.");
    }
    if (environment.livemode && destinationRow.test_only) {
      throw new Error("A test-only payment destination cannot receive live settlement.");
    }
  }
  if (
    !ownerCharity ||
    !counterpartyCharity ||
    !ownerDestination ||
    !counterpartyDestination
  ) {
    throw new Error("Both participant destinations must be approved before authorization.");
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

  const ownerImpact = calculateDonationOffsetImpactSnapshot({
    partyId: ownerProfileId,
    partyRole: "owner",
    destinationId: String(ownerCharity.id),
    amountCents: matchedBaselineCents,
  });
  const counterpartyImpact = calculateDonationOffsetImpactSnapshot({
    partyId: counterpartyProfileId,
    partyRole: "counterparty",
    destinationId: String(counterpartyCharity.id),
    amountCents: matchedCounterpartyCents,
  });

  const snapshot: DonationOffsetConditionSnapshot = {
    schemaVersion: "donation-offset-payment-condition-v2",
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
    compromiseCharityId: requireText(ownerCharity.id, "Owner redirect charity ID"),
    compromiseCharityName: requireText(ownerCharity.name, "Owner redirect charity name"),
    destinationId: requireText(ownerDestination.id, "Owner settlement destination ID"),
    destinationDisplayName: requireText(
      ownerDestination.display_name,
      "Owner settlement destination name",
    ),
    destinationConnectedAccountId: requireText(
      ownerDestination.stripe_connected_account_id,
      "Owner Stripe connected account",
    ),
    destinationLivemode: Boolean(ownerDestination.livemode),
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
    redirects: {
      owner: {
        participantRole: "owner",
        profileId: ownerProfileId,
        amountCents: matchedBaselineCents,
        charityId: requireText(ownerCharity.id, "Owner redirect charity ID"),
        charityName: requireText(ownerCharity.name, "Owner redirect charity name"),
        causeArea: requireText(ownerCharity.cause_area, "Owner redirect cause area"),
        planVersion: requireInteger(ownerPlan.plan_version, "Owner redirect plan version"),
        destinationId: requireText(ownerDestination.id, "Owner settlement destination ID"),
        destinationDisplayName: requireText(
          ownerDestination.display_name,
          "Owner settlement destination name",
        ),
        destinationConnectedAccountId: requireText(
          ownerDestination.stripe_connected_account_id,
          "Owner Stripe connected account",
        ),
        destinationLivemode: Boolean(ownerDestination.livemode),
        impact: ownerImpact as unknown as Record<string, unknown>,
      },
      counterparty: {
        participantRole: "counterparty",
        profileId: counterpartyProfileId,
        amountCents: matchedCounterpartyCents,
        charityId: requireText(counterpartyCharity.id, "Counterparty redirect charity ID"),
        charityName: requireText(counterpartyCharity.name, "Counterparty redirect charity name"),
        causeArea: requireText(counterpartyCharity.cause_area, "Counterparty redirect cause area"),
        planVersion: requireInteger(
          counterpartyPlan.plan_version,
          "Counterparty redirect plan version",
        ),
        destinationId: requireText(
          counterpartyDestination.id,
          "Counterparty settlement destination ID",
        ),
        destinationDisplayName: requireText(
          counterpartyDestination.display_name,
          "Counterparty settlement destination name",
        ),
        destinationConnectedAccountId: requireText(
          counterpartyDestination.stripe_connected_account_id,
          "Counterparty Stripe connected account",
        ),
        destinationLivemode: Boolean(counterpartyDestination.livemode),
        impact: counterpartyImpact as unknown as Record<string, unknown>,
      },
    },
  };

  if (!donationOffsetSnapshotIsInternallyConsistent(snapshot)) {
    throw new Error("The frozen donation-offset payment condition is internally inconsistent.");
  }

  return {
    match,
    offer,
    offset,
    charity: ownerCharity,
    destination: ownerDestination,
    charities: {
      owner: ownerCharity,
      counterparty: counterpartyCharity,
    },
    destinations: {
      owner: ownerDestination,
      counterparty: counterpartyDestination,
    },
    redirectPlans: {
      owner: ownerPlan,
      counterparty: counterpartyPlan,
    },
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
