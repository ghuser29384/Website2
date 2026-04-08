import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { type Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type InterestRow = Database["public"]["Tables"]["interests"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface Viewer {
  authUser: User;
  profile: ProfileRow;
  displayName: string;
  profileStatus: "loaded" | "created" | "fallback";
  profileSyncError: string | null;
}

export interface OfferRecord extends OfferRow {}

export interface InterestRecord extends InterestRow {
  offer?: OfferRow | null;
}

export interface DashboardDataResult {
  offers: OfferRecord[];
  interests: InterestRecord[];
  errors: {
    offers: string | null;
    interests: string | null;
    relatedOffers: string | null;
  };
}

interface LoggedErrorLike {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message: string;
}

function logSupabaseError(
  context: string,
  error: LoggedErrorLike,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.error(`[supabase] ${context}`, {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message,
    ...metadata,
  });
}

function buildFallbackProfile(user: User, profile?: Partial<ProfileRow> | null) {
  const timestamp = new Date().toISOString();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? `${user.id}@members.moraltrade.local`,
    display_name:
      profile?.display_name ??
      deriveDisplayName(
        user,
        profile ? { display_name: profile.display_name ?? null } : null,
      ),
    created_at: profile?.created_at ?? timestamp,
  } satisfies ProfileRow;
}

async function ensureUserProfile(
  supabase: SupabaseServerClient,
  user: User,
): Promise<{
  profile: ProfileRow;
  profileStatus: Viewer["profileStatus"];
  profileSyncError: string | null;
}> {
  const seedProfile = buildFallbackProfile(user);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logSupabaseError("Failed to read public.profiles row", profileError, {
      userId: user.id,
    });
  }

  if (profile) {
    return {
      profile: profile as ProfileRow,
      profileStatus: "loaded",
      profileSyncError: null,
    };
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: seedProfile.id,
        email: seedProfile.email,
        display_name: seedProfile.display_name,
      },
      {
        onConflict: "id",
      },
    )
    .select("*")
    .maybeSingle();

  if (insertError) {
    logSupabaseError("Failed to create missing public.profiles row", insertError, {
      userId: user.id,
    });

    return {
      profile: seedProfile,
      profileStatus: "fallback",
      profileSyncError:
        insertError.message ||
        profileError?.message ||
        "Unable to synchronize your account profile to Supabase.",
    };
  }

  if (!insertedProfile) {
    console.error("[supabase] public.profiles upsert returned no profile row", {
      userId: user.id,
    });

    return {
      profile: seedProfile,
      profileStatus: "fallback",
      profileSyncError:
        profileError?.message ?? "Unable to confirm your account profile in Supabase.",
    };
  }

  return {
    profile: insertedProfile as ProfileRow,
    profileStatus: "created",
    profileSyncError: null,
  };
}

export async function ensureProfileForUser(
  user: User,
  supabaseClient?: SupabaseServerClient,
) {
  const supabase = supabaseClient ?? (await createClient());
  return ensureUserProfile(supabase, user);
}

export async function ensureAccountRowsForUser(
  user: User,
  supabaseClient?: SupabaseServerClient,
) {
  const supabase = supabaseClient ?? (await createClient());
  const profileResult = await ensureUserProfile(supabase, user);

  return {
    profileResult,
    profile: profileResult.profile,
  };
}

export async function getViewer() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logSupabaseError("Failed to resolve authenticated user", authError);
    return null;
  }

  if (!user) {
    return null;
  }

  const { profileResult, profile: resolvedProfile } = await ensureAccountRowsForUser(user, supabase);
  const fallbackDisplayName = deriveDisplayName(user, resolvedProfile);

  return {
    authUser: user,
    profile: resolvedProfile,
    displayName: fallbackDisplayName,
    profileStatus: profileResult.profileStatus,
    profileSyncError: profileResult.profileSyncError,
  } satisfies Viewer;
}

export async function requireViewer(nextPath?: string) {
  const viewer = await getViewer();

  if (!viewer) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }

  return viewer;
}

export async function listOpenOffers() {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OfferRecord[];
}

export async function getOfferById(offerId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as OfferRecord | null;
}

export async function getInterestForOffer(offerId: string, userId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interests")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as InterestRecord | null;
}

export async function listOfferInterests(offerId: string) {
  if (!hasSupabaseEnv()) {
    return [] as InterestRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interests")
    .select("*")
    .eq("offer_id", offerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InterestRecord[];
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  if (!hasSupabaseEnv()) {
    return {
      offers: [] as OfferRecord[],
      interests: [] as InterestRecord[],
      errors: {
        offers: null,
        interests: null,
        relatedOffers: null,
      },
    };
  }

  const supabase = await createClient();
  const errors: DashboardDataResult["errors"] = {
    offers: null,
    interests: null,
    relatedOffers: null,
  };

  const [{ data: offers, error: offersError }, { data: interests, error: interestsError }] =
    await Promise.all([
      supabase
        .from("offers")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("interests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (offersError) {
    errors.offers = offersError.message;
    logSupabaseError("Failed to load dashboard offers", offersError, { userId });
  }

  if (interestsError) {
    errors.interests = interestsError.message;
    logSupabaseError("Failed to load dashboard interests", interestsError, { userId });
  }

  const offerIds = [...new Set((interests ?? []).map((interest) => interest.offer_id))];

  let offersById = new Map<string, OfferRow>();

  if (offerIds.length) {
    const { data: relatedOffers, error: relatedOffersError } = await supabase
      .from("offers")
      .select("*")
      .in("id", offerIds);

    if (relatedOffersError) {
      errors.relatedOffers = relatedOffersError.message;
      logSupabaseError("Failed to load related offers for dashboard interests", relatedOffersError, {
        userId,
      });
    } else {
      offersById = new Map((relatedOffers ?? []).map((offer) => [offer.id, offer as OfferRow]));
    }
  }

  return {
    offers: (offers ?? []) as OfferRecord[],
    interests: ((interests ?? []).map((interest) => ({
      ...(interest as InterestRow),
      offer: offersById.get(interest.offer_id) ?? null,
    })) ?? []) as InterestRecord[],
    errors,
  };
}

export function deriveDisplayName(
  user: Pick<User, "email" | "user_metadata">,
  profile?: Pick<ProfileRow, "display_name"> | null,
) {
  return (
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "") ||
    user.email?.split("@")[0] ||
    "Member"
  );
}
