import { createServiceClient } from "@/lib/supabase/server";

export interface ConditionalRedirectPageData {
  available: boolean;
  destinations: Array<Record<string, any>>;
  offers: Array<Record<string, any>>;
  creatorOffers: Array<Record<string, any>>;
  viewerCandidates: Array<Record<string, any>>;
  settlementLegs: Array<Record<string, any>>;
}

interface ConditionalRedirectPageDataDependencies {
  createClient?: typeof createServiceClient;
  warn?: (message: string, details: { message: string }) => void;
}

function unavailablePageData(): ConditionalRedirectPageData {
  return {
    available: false,
    destinations: [],
    offers: [],
    creatorOffers: [],
    viewerCandidates: [],
    settlementLegs: [],
  };
}

export async function loadConditionalRedirectPageData(
  input: {
    livemode: boolean;
    nowIso: string;
    viewerId: string;
  },
  dependencies: ConditionalRedirectPageDataDependencies = {},
): Promise<ConditionalRedirectPageData> {
  try {
    const supabase = (dependencies.createClient ?? createServiceClient)() as any;
    const [
      destinationResult,
      offerResult,
      creatorOfferResult,
      viewerCandidateResult,
      settlementLegResult,
    ] = await Promise.all([
      supabase
        .from("conditional_payment_destinations")
        .select("id, display_name, registered_charity_id")
        .eq("livemode", input.livemode)
        .eq("status", "active")
        .order("display_name"),
      supabase
        .from("conditional_redirect_offers")
        .select("*, fallback:conditional_payment_destinations!fallback_destination_id(display_name), matched:conditional_payment_destinations!matched_destination_id(display_name)")
        .in("status", ["open", "arbitrating"])
        .gt("deadline_at", input.nowIso)
        .order("created_at", { ascending: false }),
      supabase
        .from("conditional_redirect_offers")
        .select("*, fallback:conditional_payment_destinations!fallback_destination_id(display_name), matched:conditional_payment_destinations!matched_destination_id(display_name)")
        .eq("creator_profile_id", input.viewerId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("conditional_redirect_candidates")
        .select("*, offer:conditional_redirect_offers!offer_id(*, fallback:conditional_payment_destinations!fallback_destination_id(display_name), matched:conditional_payment_destinations!matched_destination_id(display_name))")
        .eq("matcher_profile_id", input.viewerId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("conditional_redirect_settlement_legs")
        .select("offer_id, participant_role, status, receipt_url, amount_cents")
        .eq("profile_id", input.viewerId)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    const results = [
      destinationResult,
      offerResult,
      creatorOfferResult,
      viewerCandidateResult,
      settlementLegResult,
    ];
    const queryError = results.find((result) => result.error)?.error;
    if (queryError) {
      throw new Error(`Conditional-donation data could not be read: ${queryError.message}`);
    }

    return {
      available: true,
      destinations: destinationResult.data ?? [],
      offers: offerResult.data ?? [],
      creatorOffers: creatorOfferResult.data ?? [],
      viewerCandidates: viewerCandidateResult.data ?? [],
      settlementLegs: settlementLegResult.data ?? [],
    };
  } catch (error) {
    (dependencies.warn ?? console.warn)(
      "[conditional-redirect] rendering unavailable state",
      {
        message: error instanceof Error ? error.message : "unknown data-access error",
      },
    );
    return unavailablePageData();
  }
}
