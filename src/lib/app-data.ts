import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { type Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type InterestRow = Database["public"]["Tables"]["interests"]["Row"];

export interface Viewer {
  authUser: User;
  profile: UserRow;
  displayName: string;
}

export interface OfferRecord extends OfferRow {}

export interface InterestRecord extends InterestRow {
  offer?: OfferRow | null;
}

export async function getViewer() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackDisplayName = deriveDisplayName(user, profile);

  return {
    authUser: user,
    profile: {
      id: user.id,
      email: user.email ?? "",
      display_name: profile?.display_name ?? fallbackDisplayName,
      bio: profile?.bio ?? null,
      created_at: profile?.created_at ?? new Date().toISOString(),
      updated_at: profile?.updated_at ?? new Date().toISOString(),
    },
    displayName: fallbackDisplayName,
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

export async function getDashboardData(userId: string) {
  if (!hasSupabaseEnv()) {
    return {
      offers: [] as OfferRecord[],
      interests: [] as InterestRecord[],
    };
  }

  const supabase = await createClient();

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
    throw new Error(offersError.message);
  }

  if (interestsError) {
    throw new Error(interestsError.message);
  }

  const offerIds = [...new Set((interests ?? []).map((interest) => interest.offer_id))];

  let offersById = new Map<string, OfferRow>();

  if (offerIds.length) {
    const { data: relatedOffers, error: relatedOffersError } = await supabase
      .from("offers")
      .select("*")
      .in("id", offerIds);

    if (relatedOffersError) {
      throw new Error(relatedOffersError.message);
    }

    offersById = new Map((relatedOffers ?? []).map((offer) => [offer.id, offer as OfferRow]));
  }

  return {
    offers: (offers ?? []) as OfferRecord[],
    interests: ((interests ?? []).map((interest) => ({
      ...(interest as InterestRow),
      offer: offersById.get(interest.offer_id) ?? null,
    })) ?? []) as InterestRecord[],
  };
}

export function deriveDisplayName(user: Pick<User, "email" | "user_metadata">, profile?: Pick<UserRow, "display_name"> | null) {
  return (
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "") ||
    user.email?.split("@")[0] ||
    "Member"
  );
}
