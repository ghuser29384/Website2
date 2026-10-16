import type { Database } from "@/lib/supabase/database.types";

// Keep all fields used by directory ranking, participant grouping and exact terms.
// Full offer details are loaded separately by the offer detail route.
export const SMART_OFFER_COLUMNS = "id,owner_id,owner_alias,mode,created_at,offered_cause,requested_cause,compromise_cause,offer_action,request_action,verification,discount_note,notes,duration,trust_level";

export type DirectoryOffer = Pick<
  Database["public"]["Tables"]["offers"]["Row"],
  | "id"
  | "owner_id"
  | "owner_alias"
  | "mode"
  | "created_at"
  | "offered_cause"
  | "requested_cause"
  | "compromise_cause"
  | "offer_action"
  | "request_action"
  | "verification"
  | "discount_note"
  | "notes"
  | "duration"
  | "trust_level"
>;
