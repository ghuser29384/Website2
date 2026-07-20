import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  buildLiveNowRecentChanges,
  rankLiveNowOffers,
  uniqueProfileCauses,
  type LiveNowOfferCandidate,
} from "@/lib/live-now-recommendations";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OFFER_BATCH_SIZE = 1_000;
const OFFER_SELECT =
  "id,owner_id,owner_alias,mode,offered_cause,requested_cause,compromise_cause,offer_action,request_action,verification,duration,trust_level,created_at,updated_at";

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function text(value: string | null | undefined, maximum = 240) {
  return (value ?? "").trim().slice(0, maximum);
}

function emptyPayload(
  status: "profile_incomplete" | "signed_out" | "unavailable",
  authenticated: boolean,
) {
  return {
    authenticated,
    generatedAt: new Date().toISOString(),
    matchingOfferCount: 0,
    profile: {
      causes: [] as string[],
      openToPayment: null,
      openToPledges: null,
      signalSources: [] as string[],
    },
    recentChanges: [],
    recommendations: [],
    status,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookie(cookieStore)) {
    return privateJson(emptyPayload("signed_out", false));
  }

  const viewer = await getViewer();
  if (!viewer) {
    return privateJson(emptyPayload("signed_out", false));
  }

  const supabase = await createClient();
  const userId = viewer.authUser.id;
  const [wishProfileResult, savedSearchesResult] = await Promise.all([
    supabase
      .from("wish_profiles")
      .select("causes,openness_to_payment,openness_to_pledges")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("saved_searches")
      .select("causes")
      .eq("profile_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  if (wishProfileResult.error) {
    console.error("[live-now] Failed to load profile priorities", {
      message: wishProfileResult.error.message,
      userId,
    });
    return privateJson(emptyPayload("unavailable", true));
  }

  if (savedSearchesResult.error) {
    console.error("[live-now] Failed to load saved-search causes", {
      message: savedSearchesResult.error.message,
      userId,
    });
  }

  const wishProfile = wishProfileResult.data;
  const savedSearchCauses = savedSearchesResult.error
    ? []
    : (savedSearchesResult.data ?? []).flatMap((search) => search.causes ?? []);
  const causes = uniqueProfileCauses(wishProfile?.causes, savedSearchCauses);
  const signalSources = [
    wishProfile?.causes?.length ? "Profile priorities" : null,
    savedSearchCauses.length ? "Saved searches" : null,
  ].filter((source): source is string => Boolean(source));

  if (!causes.length) {
    return privateJson({
      ...emptyPayload("profile_incomplete", true),
      profile: {
        causes,
        openToPayment: wishProfile?.openness_to_payment ?? null,
        openToPledges: wishProfile?.openness_to_pledges ?? null,
        signalSources,
      },
    });
  }

  const candidates: LiveNowOfferCandidate[] = [];
  for (let offset = 0; ; offset += OFFER_BATCH_SIZE) {
    const offersResult = await supabase
      .from("offers")
      .select(OFFER_SELECT)
      .eq("status", "open")
      .neq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + OFFER_BATCH_SIZE - 1);

    if (offersResult.error) {
      console.error("[live-now] Failed to load open proposal inventory", {
        message: offersResult.error.message,
        userId,
      });
      return privateJson(emptyPayload("unavailable", true));
    }

    const batch = offersResult.data ?? [];
    candidates.push(
      ...batch.map((offer) => ({
        id: offer.id,
        ownerId: offer.owner_id,
        ownerAlias: text(offer.owner_alias, 100) || "Participant",
        mode: offer.mode,
        offeredCause: text(offer.offered_cause, 120),
        requestedCause: text(offer.requested_cause, 120),
        compromiseCause: text(offer.compromise_cause, 120),
        offerAction: text(offer.offer_action, 320),
        requestAction: text(offer.request_action, 320),
        verification: text(offer.verification, 320),
        duration: text(offer.duration, 160),
        trustLevel: offer.trust_level,
        createdAt: offer.created_at,
        updatedAt: offer.updated_at,
      })),
    );

    if (batch.length < OFFER_BATCH_SIZE) break;
  }

  const profile = {
    causes,
    openToPayment: wishProfile?.openness_to_payment ?? null,
    openToPledges: wishProfile?.openness_to_pledges ?? null,
    signalSources,
  };
  const ranked = rankLiveNowOffers(candidates, profile);
  const recommendations = ranked.slice(0, 12);

  return privateJson({
    authenticated: true,
    generatedAt: new Date().toISOString(),
    matchingOfferCount: ranked.length,
    profile,
    recentChanges: buildLiveNowRecentChanges(ranked),
    recommendations,
    status: recommendations.length ? "ready" : "no_matches",
  });
}
