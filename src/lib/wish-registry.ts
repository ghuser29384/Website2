import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];

export interface WishRegistrySearchOptions {
  cause?: string;
  limit?: number;
  opennessToPayment?: boolean;
  opennessToPledges?: boolean;
  query?: string;
}

export interface WishRegistrySearchResult {
  causes: string[];
  collectiveName: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  opennessToPayment: boolean;
  opennessToPledges: boolean;
  participantKind: string;
  privacyStage: string;
  profileId: string;
  publicPreview: string | null;
  score: number;
  sharedTokens: string[];
}

export function normalizeWishRegistryText(value: string) {
  return value.trim().toLowerCase();
}

export function getWishRegistryTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/\W+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3),
  );
}

function toCauses(preview: WishProfilePreviewRow) {
  return Array.isArray(preview.causes) ? preview.causes.filter(Boolean) : [];
}

function toSearchResult(
  preview: WishProfilePreviewRow,
  score: number,
  sharedTokens: string[],
): WishRegistrySearchResult {
  return {
    profileId: preview.profile_id,
    participantKind: preview.participant_kind,
    collectiveName: preview.collective_name,
    causes: toCauses(preview),
    publicPreview: preview.public_preview,
    locationCity: preview.location_city,
    locationRegion: preview.location_region,
    opennessToPayment: Boolean(preview.openness_to_payment),
    opennessToPledges: Boolean(preview.openness_to_pledges),
    privacyStage: preview.privacy_stage,
    score,
    sharedTokens,
  };
}

export async function searchWishRegistryPreviews({
  cause = "",
  limit = 20,
  opennessToPayment = false,
  opennessToPledges = false,
  query = "",
}: WishRegistrySearchOptions = {}) {
  const normalizedCause = normalizeWishRegistryText(cause);
  const normalizedQuery = normalizeWishRegistryText(query);
  const queryTokens = getWishRegistryTokens(normalizedQuery);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wish_profile_previews")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WishProfilePreviewRow[])
    .map((preview) => {
      const causes = toCauses(preview);
      const previewText = normalizeWishRegistryText(
        `${preview.public_preview ?? ""} ${causes.join(" ")}`,
      );
      const causeMatch = normalizedCause
        ? causes.some((entry) => normalizeWishRegistryText(entry).includes(normalizedCause))
        : true;
      const sharedTokens = [...queryTokens].filter((token) => previewText.includes(token));
      const score =
        (normalizedCause && causeMatch ? 50 : 0) +
        Math.min(40, sharedTokens.length * 10) +
        (preview.openness_to_payment ? 5 : 0) +
        (preview.openness_to_pledges ? 5 : 0);

      return { preview, score, sharedTokens };
    })
    .filter(({ preview, score }) => {
      if (opennessToPayment && !preview.openness_to_payment) {
        return false;
      }

      if (opennessToPledges && !preview.openness_to_pledges) {
        return false;
      }

      return !normalizedCause && !normalizedQuery ? true : score > 0;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, safeLimit)
    .map(({ preview, score, sharedTokens }) => toSearchResult(preview, score, sharedTokens));
}
