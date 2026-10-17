import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type OffsetRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];

// The portfolio needs offer terms, not marketplace card/profile hydration.
// Keep these reads on the session client so the existing RLS still applies.
export type CommitmentOffer = Pick<
  OfferRow,
  | "id"
  | "created_at"
  | "offered_cause"
  | "requested_cause"
  | "offer_action"
  | "request_action"
  | "notes"
  | "discount_note"
  | "compromise_cause"
  | "mode"
>;

export interface CommitmentCartItem {
  addedAt: string;
  offer: (CommitmentOffer & {
    donationOffset: Pick<OffsetRow, "requested_matching_amount_cents"> | null;
  }) | null;
}

const OFFER_COLUMNS = "id,created_at,offered_cause,requested_cause,offer_action,request_action,notes,discount_note,compromise_cause,mode";

export async function listCommitmentOpenOffers(userId: string): Promise<CommitmentOffer[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_COLUMNS)
    .eq("owner_id", userId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCommitmentCartItems(userId: string): Promise<CommitmentCartItem[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data: cartRows, error: cartError } = await supabase
    .from("offer_carts")
    .select("offer_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (cartError) throw new Error(cartError.message);
  const rows = cartRows ?? [];
  const offerIds = [...new Set(rows.map((row) => row.offer_id))];
  if (!offerIds.length) return [];

  // Both reads depend only on the cart IDs, not on one another. The projection
  // uses the saved offset amount; do not replace it with parsed offer text.
  const [offersResult, offsetsResult] = await Promise.all([
    supabase.from("offers").select(OFFER_COLUMNS).in("id", offerIds),
    supabase
      .from("donation_offset_offers")
      .select("offer_id,requested_matching_amount_cents")
      .in("offer_id", offerIds),
  ]);
  if (offersResult.error) throw new Error(offersResult.error.message);
  if (offsetsResult.error) throw new Error(offsetsResult.error.message);

  const offersById = new Map((offersResult.data ?? []).map((offer) => [offer.id, offer]));
  const offsetsByOfferId = new Map((offsetsResult.data ?? []).map((offset) => [offset.offer_id, offset]));
  return rows.map((row) => {
    const offer = offersById.get(row.offer_id);
    return {
      addedAt: row.created_at,
      // Preserve missing/inaccessible offers as null, not as invented records.
      offer: offer ? { ...offer, donationOffset: offsetsByOfferId.get(offer.id) ?? null } : null,
    };
  });
}
