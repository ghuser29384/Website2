import { createServiceClient } from "@/lib/supabase/server";
import type {
  DirectDonationUpgradeCandidateRow,
  DirectDonationUpgradeEnvironment,
  DirectDonationUpgradeObligationRow,
  DirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade";

export interface PublicDirectDonationUpgradeRow {
  id: string;
  environment: DirectDonationUpgradeEnvironment;
  status: string;
  selected_branch: "fallback" | "matched" | null;
  privacy_mode: "public" | "private_until_completed";
  creator_amount_cents: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  original_recipient: DirectDonationUpgradeOfferRow["original_recipient"];
  upgraded_recipient: DirectDonationUpgradeOfferRow["upgraded_recipient"];
  terms_hash: string;
  created_at: string;
  completed_at: string | null;
  creator_display_name: string | null;
  matcher_display_name: string | null;
  matcher_count: number;
  verified_obligation_count: number;
  verified_gross_amount_cents: number;
  verified_net_amount_cents: number;
  incremental_net_amount_cents: number;
  redirected_net_amount_cents: number;
}

export interface DirectDonationUpgradeViewerData {
  publicOffers: PublicDirectDonationUpgradeRow[];
  creatorOffers: DirectDonationUpgradeOfferRow[];
  viewerCandidates: DirectDonationUpgradeCandidateRow[];
  viewerObligations: DirectDonationUpgradeObligationRow[];
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
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(error.message);
  }
  return (data ?? []) as PublicDirectDonationUpgradeRow[];
}

export async function loadDirectDonationUpgradeViewerData(input: {
  viewerId: string;
  environment: DirectDonationUpgradeEnvironment;
}) : Promise<DirectDonationUpgradeViewerData> {
  const supabase = createServiceClient() as any;
  const [publicResult, creatorResult, candidateResult, obligationResult] = await Promise.all([
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
      .select("*")
      .eq("profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("direct_donation_upgrade_obligations")
      .select("*")
      .eq("environment", input.environment)
      .eq("participant_profile_id", input.viewerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = [publicResult, creatorResult, candidateResult, obligationResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError && firstError.code !== "42P01" && firstError.code !== "42703") {
    throw new Error(firstError.message);
  }

  return {
    publicOffers: (publicResult.data ?? []) as PublicDirectDonationUpgradeRow[],
    creatorOffers: (creatorResult.data ?? []) as DirectDonationUpgradeOfferRow[],
    viewerCandidates: (candidateResult.data ?? []) as DirectDonationUpgradeCandidateRow[],
    viewerObligations: (obligationResult.data ?? []) as DirectDonationUpgradeObligationRow[],
  };
}

export async function loadDirectDonationUpgradePrivateDetail(input: {
  offerId: string;
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
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

  if (offerResult.error && offerResult.error.code !== "42P01") {
    throw new Error(offerResult.error.message);
  }
  const offer = (offerResult.data ?? null) as DirectDonationUpgradeOfferRow | null;
  let isParticipant = Boolean(
    offer && input.viewerId && offer.creator_profile_id === input.viewerId,
  );

  if (offer && input.viewerId && !isParticipant) {
    const membershipResult = await supabase
      .from("direct_donation_upgrade_candidates")
      .select("id")
      .eq("offer_id", input.offerId)
      .eq("profile_id", input.viewerId)
      .limit(1)
      .maybeSingle();
    if (membershipResult.error && membershipResult.error.code !== "42P01") {
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
  if (firstError && firstError.code !== "42P01") {
    throw new Error(firstError.message);
  }

  return {
    publicOffer: publicRows[0] ?? null,
    offer,
    candidates: candidatesResult.data ?? [],
    obligations: obligationsResult.data ?? [],
    impactCredits: creditsResult.data ?? [],
    isParticipant: true,
  };
}
