import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSiteUrl, getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/config";

export const SITE_NAME = "Moral Trade";
export const SITE_DESCRIPTION =
  "A public-interest platform for moral trade, structured commitments, public offers, and careful reasoning between people with different moral priorities.";
export const SITE_URL = getSiteUrl().replace(/\/$/, "");
export const SITE_LOCALE = "en_US";

export function getAbsoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function truncateDescription(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}\u2026`;
}

export function formatLocation(city?: string | null, region?: string | null) {
  return [city, region].filter(Boolean).join(", ");
}

export function createPublicMetadataClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getPublicSitemapEntries() {
  if (!hasSupabaseEnv()) {
    return {
      offers: [] as Array<{ id: string; updated_at: string; created_at: string }>,
      profiles: [] as Array<{ id: string; created_at: string }>,
    };
  }

  const supabase = createPublicMetadataClient();
  const [{ data: offers, error: offersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("offers")
        .select("id, created_at, updated_at")
        .eq("status", "open")
        .order("updated_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (offersError) {
    throw new Error(offersError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return {
    offers: (offers ?? []) as Array<{ id: string; updated_at: string; created_at: string }>,
    profiles: (profiles ?? []) as Array<{ id: string; created_at: string }>,
  };
}
