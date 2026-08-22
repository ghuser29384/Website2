import {
  DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
  DIRECT_DONATION_UPGRADE_FULFILLMENT_DAYS,
  DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
  DIRECT_DONATION_UPGRADE_WEBHOOK_GRACE_HOURS,
  hashDirectDonationUpgradeText,
  hashDirectDonationUpgradeValue,
  type DirectDonationUpgradeEnvironment,
  type DirectDonationUpgradeObligationRow,
  type DirectDonationUpgradeOfferRow,
  type DirectDonationUpgradePrivacyMode,
  type EveryOrgNonprofitIdentity,
} from "@/lib/direct-donation-upgrade";
import {
  calculateDirectDonationUpgradeSplit,
  type DirectDonationUpgradeSplit,
} from "@/lib/direct-donation-upgrade-split";

export const DIRECT_DONATION_UPGRADE_TERMS_VERSION_V2 =
  "direct-donation-upgrade-terms-v2" as const;
export const DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION =
  "direct-donation-upgrade-proposal-v1-2026-08-12" as const;

export type DirectDonationUpgradeObligationKind =
  | "creator_fallback"
  | "creator_redirected"
  | "creator_retained"
  | "matcher_incremental";

export type DirectDonationUpgradeProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "expired";

export interface PartialDirectDonationUpgradeOfferRow
  extends DirectDonationUpgradeOfferRow {
  redirect_basis_points: number;
  redirected_amount_cents: number;
  retained_amount_cents: number;
  supersedes_offer_id: string | null;
  superseded_by_offer_id: string | null;
}

export interface PartialDirectDonationUpgradeObligationRow
  extends DirectDonationUpgradeObligationRow {
  obligation_kind: DirectDonationUpgradeObligationKind;
}

export interface DirectDonationUpgradeProposalRow {
  id: string;
  offer_id: string;
  proposer_profile_id: string;
  status: DirectDonationUpgradeProposalStatus;
  base_terms_hash: string;
  proposed_redirect_basis_points: number;
  proposed_redirected_amount_cents: number;
  proposed_retained_amount_cents: number;
  proposed_matcher_amount_cents: number;
  currency: "USD";
  message: string;
  response_message: string;
  commitment_version: string;
  commitment_accepted_at: string;
  responded_at: string | null;
  accepted_offer_id: string | null;
  created_at: string;
  updated_at: string;
  profile?:
    | { id?: string; display_name?: string | null }
    | Array<{ id?: string; display_name?: string | null }>
    | null;
}

function futureTimestamp(value: string | null | undefined, nowMs: number) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > nowMs;
}

export function directDonationUpgradeCounterofferWindowOpen(
  offer: Pick<
    PartialDirectDonationUpgradeOfferRow,
    "match_deadline_at"
  > & { status: string },
  nowMs: number,
) {
  return (
    offer.status === "open" && futureTimestamp(offer.match_deadline_at, nowMs)
  );
}

export function directDonationUpgradeJoinWindowOpen(
  offer: Pick<
    PartialDirectDonationUpgradeOfferRow,
    "match_deadline_at" | "webhook_grace_ends_at"
  > & { status: string },
  nowMs: number,
) {
  if (offer.status === "open") {
    return futureTimestamp(offer.match_deadline_at, nowMs);
  }
  if (offer.status === "matched") {
    return futureTimestamp(offer.webhook_grace_ends_at, nowMs);
  }
  return false;
}

export function buildDirectDonationUpgradeTermsHashV2(input: {
  creatorProfileId: string;
  creatorAmountCents: number;
  redirectBasisPoints: number;
  matcherAmountCents: number;
  originalRecipient: EveryOrgNonprofitIdentity;
  upgradedRecipient: EveryOrgNonprofitIdentity;
  matchDeadlineAt: string;
  privacyMode: DirectDonationUpgradePrivacyMode;
  environment: DirectDonationUpgradeEnvironment;
  baselineAttestation: string;
}) {
  const split = calculateDirectDonationUpgradeSplit(
    input.creatorAmountCents,
    input.redirectBasisPoints,
  );
  return hashDirectDonationUpgradeValue({
    schemaVersion: DIRECT_DONATION_UPGRADE_TERMS_VERSION_V2,
    creatorProfileId: input.creatorProfileId,
    creatorAmountCents: input.creatorAmountCents,
    redirectBasisPoints: split.redirectBasisPoints,
    redirectedAmountCents: split.redirectedAmountCents,
    retainedAmountCents: split.retainedAmountCents,
    matcherAmountCents: input.matcherAmountCents,
    currency: "USD",
    originalRecipientHash: input.originalRecipient.identityHash,
    upgradedRecipientHash: input.upgradedRecipient.identityHash,
    matchDeadlineAt: new Date(input.matchDeadlineAt).toISOString(),
    privacyMode: input.privacyMode,
    environment: input.environment,
    baselineVersion: DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
    baselineAttestationHash: hashDirectDonationUpgradeText(
      input.baselineAttestation.trim(),
    ),
    matcherCommitmentVersion: DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
    proposalCommitmentVersion:
      DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
    fulfillmentDays: DIRECT_DONATION_UPGRADE_FULFILLMENT_DAYS,
    webhookGraceHours: DIRECT_DONATION_UPGRADE_WEBHOOK_GRACE_HOURS,
  });
}

export function splitFromDirectDonationUpgradeOffer(
  offer: Pick<
    PartialDirectDonationUpgradeOfferRow,
    | "creator_amount_cents"
    | "redirect_basis_points"
    | "redirected_amount_cents"
    | "retained_amount_cents"
  >,
): DirectDonationUpgradeSplit {
  const calculated = calculateDirectDonationUpgradeSplit(
    offer.creator_amount_cents,
    offer.redirect_basis_points,
  );
  if (
    calculated.redirectedAmountCents !== offer.redirected_amount_cents ||
    calculated.retainedAmountCents !== offer.retained_amount_cents
  ) {
    throw new Error("The stored Donation Upgrade split does not match its frozen percentage.");
  }
  return calculated;
}
