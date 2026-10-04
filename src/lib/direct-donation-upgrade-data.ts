import { createServiceClient } from "@/lib/supabase/server";
import { qaFixtureIdentities } from "@/lib/direct-donation-upgrade";
import type {
  DirectDonationUpgradeCandidateRow,
  DirectDonationUpgradeEnvironment,
} from "@/lib/direct-donation-upgrade";
import type {
  DirectDonationUpgradeProposalRow,
  PartialDirectDonationUpgradeObligationRow,
  PartialDirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade-negotiation";
import { calculateDirectDonationUpgradeSplit } from "@/lib/direct-donation-upgrade-split";

export const DIRECT_DONATION_UPGRADE_RENDERED_QA_PROPOSER_OFFER_ID =
  "d2000000-0000-4000-8000-000000000002";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_CREATOR_OFFER_ID =
  "d3000000-0000-4000-8000-000000000003";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_EXPIRED_OFFER_ID =
  "d4000000-0000-4000-8000-000000000004";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_REVISION_OFFER_ID =
  "d5000000-0000-4000-8000-000000000005";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_ACCEPTED_REVISION_ID =
  "d5100000-0000-4000-8000-000000000051";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_FULL_REDIRECT_OFFER_ID =
  "d6000000-0000-4000-8000-000000000006";
export const DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID =
  "d1000000-0000-4000-8000-000000000001";

export function directDonationUpgradeRenderedQaNoServiceDataEnabled(input: {
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment | null;
}) {
  return (
    process.env.DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE === "true" &&
    process.env.DIRECT_DONATION_UPGRADE_QA_FIXTURES === "true" &&
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_TARGET_ENV !== "production" &&
    input.environment === "staging" &&
    input.viewerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID
  );
}

function renderedQaFixtureEnabled(input: {
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  return directDonationUpgradeRenderedQaNoServiceDataEnabled(input);
}

function renderedQaOffer(input: {
  creatorProfileId: string;
  id: string;
  termsHash: string;
  matchDeadlineAt?: string;
  redirectBasisPoints?: number;
  status?: PartialDirectDonationUpgradeOfferRow["status"];
  supersededByOfferId?: string | null;
}): PartialDirectDonationUpgradeOfferRow {
  const [originalRecipient, upgradedRecipient] = qaFixtureIdentities();
  const creatorAmountCents = 1_000;
  const split = calculateDirectDonationUpgradeSplit(
    creatorAmountCents,
    input.redirectBasisPoints ?? 2_000,
  );
  return {
    id: input.id,
    creator_profile_id: input.creatorProfileId,
    environment: "staging",
    status: input.status ?? "open",
    selected_branch: null,
    privacy_mode: "public",
    creator_amount_cents: creatorAmountCents,
    redirect_basis_points: split.redirectBasisPoints,
    redirected_amount_cents: split.redirectedAmountCents,
    retained_amount_cents: split.retainedAmountCents,
    matcher_amount_cents: 1_500,
    currency: "USD",
    match_deadline_at:
      input.matchDeadlineAt ?? "2099-08-20T12:00:00.000Z",
    fulfillment_deadline_at: null,
    webhook_grace_ends_at: null,
    original_recipient: originalRecipient,
    upgraded_recipient: upgradedRecipient,
    original_recipient_hash: originalRecipient.identityHash,
    upgraded_recipient_hash: upgradedRecipient.identityHash,
    baseline_version: "direct-donation-upgrade-baseline-v1-2026-08-01",
    baseline_attestation:
      "Rendered QA only: this in-memory fixture records a pre-existing planned donation.",
    baseline_attested_at: "2026-08-13T12:00:00.000Z",
    terms_hash: input.termsHash,
    winning_candidate_id: null,
    match_locked_at: null,
    completed_at: null,
    defaulted_at: null,
    cancellation_reason: "",
    failure_code: "",
    failure_message: "",
    supersedes_offer_id: null,
    superseded_by_offer_id: input.supersededByOfferId ?? null,
    created_at: "2026-08-13T12:00:00.000Z",
    updated_at: "2026-08-13T12:00:00.000Z",
  };
}

function renderedQaPublicOffer(
  offer: PartialDirectDonationUpgradeOfferRow,
  creatorDisplayName: string,
  proposalCount: number,
): PublicDirectDonationUpgradeRow {
  return {
    id: offer.id,
    environment: offer.environment,
    status: offer.status,
    selected_branch: offer.selected_branch,
    privacy_mode: offer.privacy_mode,
    creator_amount_cents: offer.creator_amount_cents,
    redirect_basis_points: offer.redirect_basis_points,
    redirected_amount_cents: offer.redirected_amount_cents,
    retained_amount_cents: offer.retained_amount_cents,
    matcher_amount_cents: offer.matcher_amount_cents,
    currency: offer.currency,
    match_deadline_at: offer.match_deadline_at,
    fulfillment_deadline_at: offer.fulfillment_deadline_at,
    webhook_grace_ends_at: offer.webhook_grace_ends_at,
    original_recipient: offer.original_recipient,
    upgraded_recipient: offer.upgraded_recipient,
    terms_hash: offer.terms_hash,
    created_at: offer.created_at,
    completed_at: offer.completed_at,
    creator_display_name: creatorDisplayName,
    matcher_display_name: null,
    matcher_count: 0,
    proposal_count: proposalCount,
    verified_obligation_count: 0,
    verified_gross_amount_cents: 0,
    verified_net_amount_cents: 0,
    incremental_net_amount_cents: 0,
    redirected_net_amount_cents: 0,
  };
}

function renderedQaDetailFixture(input: {
  offerId: string;
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  if (!renderedQaFixtureEnabled(input)) return null;

  if (input.offerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_PROPOSER_OFFER_ID) {
    const offer = renderedQaOffer({
      creatorProfileId: "d2000000-0000-4000-8000-000000000020",
      id: input.offerId,
      termsHash: "a".repeat(64),
    });
    return {
      publicOffer: renderedQaPublicOffer(offer, "QA Fixture Creator", 0),
      offer: null,
      candidates: [],
      obligations: [],
      impactCredits: [],
      proposals: [],
      isParticipant: false,
    };
  }

  if (input.offerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_CREATOR_OFFER_ID) {
    const offer = renderedQaOffer({
      creatorProfileId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
      id: input.offerId,
      termsHash: "b".repeat(64),
    });
    const proposals: DirectDonationUpgradeProposalRow[] = [
      {
        id: "d3100000-0000-4000-8000-000000000031",
        offer_id: offer.id,
        proposer_profile_id: "d2100000-0000-4000-8000-000000000021",
        status: "pending",
        base_terms_hash: offer.terms_hash,
        proposed_redirect_basis_points: 4_000,
        proposed_redirected_amount_cents: 400,
        proposed_retained_amount_cents: 600,
        proposed_matcher_amount_cents: 2_000,
        currency: "USD",
        message: "I can add more if forty percent is redirected.",
        response_message: "",
        commitment_version: "direct-donation-upgrade-proposal-v1-2026-08-12",
        commitment_accepted_at: "2026-08-13T13:00:00.000Z",
        responded_at: null,
        accepted_offer_id: null,
        created_at: "2026-08-13T13:00:00.000Z",
        updated_at: "2026-08-13T13:00:00.000Z",
        profile: { id: "d2100000-0000-4000-8000-000000000021", display_name: "QA Pending Proposer" },
      },
      {
        id: "d3200000-0000-4000-8000-000000000032",
        offer_id: offer.id,
        proposer_profile_id: "d2200000-0000-4000-8000-000000000022",
        status: "rejected",
        base_terms_hash: offer.terms_hash,
        proposed_redirect_basis_points: 5_000,
        proposed_redirected_amount_cents: 500,
        proposed_retained_amount_cents: 500,
        proposed_matcher_amount_cents: 1_000,
        currency: "USD",
        message: "An earlier alternative for the audit trail.",
        response_message: "The creator kept the current split.",
        commitment_version: "direct-donation-upgrade-proposal-v1-2026-08-12",
        commitment_accepted_at: "2026-08-13T12:30:00.000Z",
        responded_at: "2026-08-13T12:45:00.000Z",
        accepted_offer_id: null,
        created_at: "2026-08-13T12:30:00.000Z",
        updated_at: "2026-08-13T12:45:00.000Z",
        profile: { id: "d2200000-0000-4000-8000-000000000022", display_name: "QA Rejected Proposer" },
      },
    ];
    return {
      publicOffer: renderedQaPublicOffer(offer, "QA Direct Upgrade Creator", 2),
      offer,
      candidates: [],
      obligations: [],
      impactCredits: [],
      proposals,
      isParticipant: true,
    };
  }

  if (input.offerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_EXPIRED_OFFER_ID) {
    const offer = renderedQaOffer({
      creatorProfileId: "d4000000-0000-4000-8000-000000000040",
      id: input.offerId,
      matchDeadlineAt: "2020-08-20T12:00:00.000Z",
      termsHash: "c".repeat(64),
    });
    return {
      publicOffer: renderedQaPublicOffer(offer, "QA Expired Fixture Creator", 0),
      offer: null,
      candidates: [],
      obligations: [],
      impactCredits: [],
      proposals: [],
      isParticipant: false,
    };
  }

  if (input.offerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_REVISION_OFFER_ID) {
    const offer = renderedQaOffer({
      creatorProfileId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
      id: input.offerId,
      redirectBasisPoints: 2_000,
      status: "cancelled",
      supersededByOfferId:
        DIRECT_DONATION_UPGRADE_RENDERED_QA_ACCEPTED_REVISION_ID,
      termsHash: "d".repeat(64),
    });
    const acceptedProposal: DirectDonationUpgradeProposalRow = {
      id: "d5200000-0000-4000-8000-000000000052",
      offer_id: offer.id,
      proposer_profile_id: "d5200000-0000-4000-8000-000000000020",
      status: "accepted",
      base_terms_hash: offer.terms_hash,
      proposed_redirect_basis_points: 10_000,
      proposed_redirected_amount_cents: 1_000,
      proposed_retained_amount_cents: 0,
      proposed_matcher_amount_cents: 2_500,
      currency: "USD",
      message: "I can add more if the creator redirects the complete baseline.",
      response_message: "Accepted as the matched revision.",
      commitment_version: "direct-donation-upgrade-proposal-v1-2026-08-12",
      commitment_accepted_at: "2026-08-13T14:00:00.000Z",
      responded_at: "2026-08-13T14:15:00.000Z",
      accepted_offer_id:
        DIRECT_DONATION_UPGRADE_RENDERED_QA_ACCEPTED_REVISION_ID,
      created_at: "2026-08-13T14:00:00.000Z",
      updated_at: "2026-08-13T14:15:00.000Z",
      profile: {
        id: "d5200000-0000-4000-8000-000000000020",
        display_name: "QA Accepted Proposer",
      },
    };
    return {
      publicOffer: renderedQaPublicOffer(offer, "QA Direct Upgrade Creator", 1),
      offer,
      candidates: [],
      obligations: [],
      impactCredits: [],
      proposals: [acceptedProposal],
      isParticipant: true,
    };
  }

  return null;
}

export interface PublicDirectDonationUpgradeRow {
  id: string;
  environment: DirectDonationUpgradeEnvironment;
  status: string;
  selected_branch: "fallback" | "matched" | null;
  privacy_mode: "public" | "private_until_completed";
  creator_amount_cents: number;
  redirect_basis_points: number;
  redirected_amount_cents: number;
  retained_amount_cents: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  original_recipient: PartialDirectDonationUpgradeOfferRow["original_recipient"];
  upgraded_recipient: PartialDirectDonationUpgradeOfferRow["upgraded_recipient"];
  terms_hash: string;
  created_at: string;
  completed_at: string | null;
  creator_display_name: string | null;
  matcher_display_name: string | null;
  matcher_count: number;
  proposal_count: number;
  verified_obligation_count: number;
  verified_gross_amount_cents: number;
  verified_net_amount_cents: number;
  incremental_net_amount_cents: number;
  redirected_net_amount_cents: number;
}

export interface DirectDonationUpgradeViewerData {
  publicOffers: PublicDirectDonationUpgradeRow[];
  creatorOffers: PartialDirectDonationUpgradeOfferRow[];
  viewerCandidates: DirectDonationUpgradeCandidateRow[];
  viewerObligations: PartialDirectDonationUpgradeObligationRow[];
  viewerProposals: DirectDonationUpgradeProposalRow[];
}

export function directDonationUpgradeRenderedQaViewerFixture(input: {
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}): DirectDonationUpgradeViewerData | null {
  if (!renderedQaFixtureEnabled(input)) return null;
  const fullRedirectOffer = renderedQaOffer({
    creatorProfileId: "d6000000-0000-4000-8000-000000000060",
    id: DIRECT_DONATION_UPGRADE_RENDERED_QA_FULL_REDIRECT_OFFER_ID,
    redirectBasisPoints: 10_000,
    termsHash: "f".repeat(64),
  });
  return {
    publicOffers: [
      renderedQaPublicOffer(fullRedirectOffer, "QA Full Redirect Creator", 0),
    ],
    creatorOffers: [],
    viewerCandidates: [],
    viewerObligations: [],
    viewerProposals: [],
  };
}

export async function loadPublicDirectDonationUpgrades(input: {
  environment: DirectDonationUpgradeEnvironment;
  limit?: number;
  offerId?: string;
}) {
  const supabase = createServiceClient() as any;
  let query = supabase
    .from("direct_donation_upgrade_public_offers")
    .select("*")
    .eq("environment", input.environment)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit ?? 50, 100)));
  if (input.offerId) query = query.eq("id", input.offerId);
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as PublicDirectDonationUpgradeRow[];
}

export async function loadDirectDonationUpgradeViewerData(input: {
  viewerId: string;
  environment: DirectDonationUpgradeEnvironment;
}): Promise<DirectDonationUpgradeViewerData> {
  const supabase = createServiceClient() as any;
  const [
    publicResult,
    creatorResult,
    candidateResult,
    obligationResult,
    proposalResult,
  ] = await Promise.all([
    supabase
      .from("direct_donation_upgrade_public_offers")
      .select("*")
      .eq("environment", input.environment)
      .in("status", ["open", "matched", "fallback_selected"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("direct_donation_upgrade_offers")
      .select("*")
      .eq("environment", input.environment)
      .eq("creator_profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("direct_donation_upgrade_candidates")
      .select(
        "*, offer_scope:direct_donation_upgrade_offers!offer_id!inner()",
      )
      .eq("offer_scope.environment", input.environment)
      .eq("profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("direct_donation_upgrade_obligations")
      .select("*")
      .eq("environment", input.environment)
      .eq("participant_profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("direct_donation_upgrade_proposals")
      .select(
        "*, offer_scope:direct_donation_upgrade_offers!offer_id!inner()",
      )
      .eq("offer_scope.environment", input.environment)
      .eq("proposer_profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = [
    publicResult,
    creatorResult,
    candidateResult,
    obligationResult,
    proposalResult,
  ]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    publicOffers: (publicResult.data ?? []) as PublicDirectDonationUpgradeRow[],
    creatorOffers: (creatorResult.data ?? []) as PartialDirectDonationUpgradeOfferRow[],
    viewerCandidates: (candidateResult.data ?? []) as DirectDonationUpgradeCandidateRow[],
    viewerObligations: (obligationResult.data ?? []) as PartialDirectDonationUpgradeObligationRow[],
    viewerProposals: (proposalResult.data ?? []) as DirectDonationUpgradeProposalRow[],
  };
}

export async function loadDirectDonationUpgradePrivateDetail(input: {
  offerId: string;
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  const fixture = renderedQaDetailFixture(input);
  if (fixture) return fixture;

  const supabase = createServiceClient() as any;
  const [publicRows, offerResult] = await Promise.all([
    loadPublicDirectDonationUpgrades({
      environment: input.environment,
      offerId: input.offerId,
      limit: 1,
    }),
    supabase
      .from("direct_donation_upgrade_offers")
      .select("*")
      .eq("id", input.offerId)
      .eq("environment", input.environment)
      .maybeSingle(),
  ]);

  if (offerResult.error) {
    throw new Error(offerResult.error.message);
  }
  const offer = (offerResult.data ?? null) as PartialDirectDonationUpgradeOfferRow | null;

  let proposals: DirectDonationUpgradeProposalRow[] = [];
  if (offer && input.viewerId) {
    let proposalQuery = supabase
      .from("direct_donation_upgrade_proposals")
      .select("*, profile:profiles!proposer_profile_id(id,display_name)")
      .eq("offer_id", input.offerId)
      .order("created_at", { ascending: false });
    if (offer.creator_profile_id !== input.viewerId) {
      proposalQuery = proposalQuery.eq("proposer_profile_id", input.viewerId);
    }
    const proposalResult = await proposalQuery;
    if (proposalResult.error) {
      throw new Error(proposalResult.error.message);
    }
    proposals = (proposalResult.data ?? []) as DirectDonationUpgradeProposalRow[];
  }

  let isParticipant = Boolean(
    offer && input.viewerId && offer.creator_profile_id === input.viewerId,
  );

  if (offer && input.viewerId && !isParticipant) {
    const membershipResult = await supabase
      .from("direct_donation_upgrade_candidates")
      .select("id")
      .eq("offer_id", input.offerId)
      .eq("profile_id", input.viewerId)
      .in("status", ["primary", "backup", "promoted", "fulfilled"])
      .limit(1)
      .maybeSingle();
    if (membershipResult.error) {
      throw new Error(membershipResult.error.message);
    }
    isParticipant = Boolean(membershipResult.data);
  }

  if (!isParticipant || !offer) {
    return {
      publicOffer: publicRows[0] ?? null,
      offer: null,
      candidates: [],
      obligations: [],
      impactCredits: [],
      proposals,
      isParticipant: false,
    };
  }

  const [candidatesResult, obligationsResult, creditsResult] = await Promise.all([
    supabase
      .from("direct_donation_upgrade_candidates")
      .select("*, profile:profiles!profile_id(id,display_name)")
      .eq("offer_id", input.offerId)
      .order("rank", { ascending: true }),
    supabase
      .from("direct_donation_upgrade_obligations")
      .select("*")
      .eq("offer_id", input.offerId)
      .order("created_at", { ascending: true }),
    supabase
      .from("direct_donation_upgrade_impact_credits")
      .select("*")
      .eq("offer_id", input.offerId)
      .order("verified_at", { ascending: true }),
  ]);
  const firstError = [candidatesResult, obligationsResult, creditsResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    publicOffer: publicRows[0] ?? null,
    offer,
    candidates: candidatesResult.data ?? [],
    obligations: obligationsResult.data ?? [],
    impactCredits: creditsResult.data ?? [],
    proposals,
    isParticipant: true,
  };
}
