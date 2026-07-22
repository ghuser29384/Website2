import "server-only";

import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferMode = OfferRow["mode"];
export type ModeFilter = "all" | OfferMode;

interface LiveOffersResult {
  items: OfferRow[];
  error: string | null;
}

export const MODE_OPTIONS: ReadonlyArray<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "Any proposal type" },
  { value: "pledge", label: "Pledge or reciprocal action" },
  { value: "payment", label: "Payment-supported action" },
  { value: "offset", label: "Donation offset" },
];

const LIVE_OFFERS_CHUNK_SIZE = 1_000;

export const WORKED_EXAMPLE =
  CANONICAL_WORKED_CASE_OFFERS.find((offer) => offer.id === "seed-victoria") ??
  CANONICAL_WORKED_CASE_OFFERS[0];

export function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parseMode(value: string): ModeFilter {
  return MODE_OPTIONS.some((option) => option.value === value)
    ? (value as ModeFilter)
    : "all";
}

export function normalizeSearch(value: string) {
  return value
    .trim()
    .slice(0, 120)
    .replace(/[,%()'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildLiveHref({
  mode,
  page,
  search,
}: {
  mode?: ModeFilter;
  page?: number;
  search?: string;
}) {
  const params = new URLSearchParams({ view: "live" });

  if (search) params.set("search", search);
  if (mode && mode !== "all") params.set("mode", mode);
  if (page && page > 1) params.set("page", String(page));

  return `/offers?${params.toString()}`;
}

export async function listLiveOffers({
  mode,
  search,
}: {
  mode: ModeFilter;
  search: string;
}): Promise<LiveOffersResult> {
  if (!hasSupabaseEnv()) {
    return { items: [], error: null };
  }

  const supabase = await createClient();
  const items: OfferRow[] = [];
  let offset = 0;
  let expectedTotal: number | null = null;

  while (expectedTotal === null || offset < expectedTotal) {
    let query = supabase
      .from("offers")
      .select("*", { count: "exact" })
      .eq("status", "open");

    if (mode !== "all") query = query.eq("mode", mode);

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        [
          `offered_cause.ilike.${pattern}`,
          `requested_cause.ilike.${pattern}`,
          `offer_action.ilike.${pattern}`,
          `request_action.ilike.${pattern}`,
          `verification.ilike.${pattern}`,
          `duration.ilike.${pattern}`,
          `owner_alias.ilike.${pattern}`,
        ].join(","),
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + LIVE_OFFERS_CHUNK_SIZE - 1);

    if (error) {
      console.error("[offers] Failed to load participant offer menus", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
        mode,
        offset,
        searchPresent: Boolean(search),
      });

      return {
        items: [],
        error:
          "The live marketplace could not be loaded. Please refresh or try again shortly.",
      };
    }

    const rows = (data ?? []) as OfferRow[];
    items.push(...rows);
    expectedTotal = count ?? items.length;
    offset += rows.length;

    if (rows.length < LIVE_OFFERS_CHUNK_SIZE) break;
  }

  return { items, error: null };
}

export async function listSavedOfferIds(userId: string | undefined) {
  if (!userId || !hasSupabaseEnv()) return [] as string[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_carts")
    .select("offer_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2_000);

  if (error) {
    console.error("[offers] Failed to load saved offers", {
      code: error.code,
      message: error.message,
      userId,
    });
    return [] as string[];
  }

  return (data ?? []).map((row) => row.offer_id);
}
