import { NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/\W+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3),
  );
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const cause = normalize(url.searchParams.get("cause") ?? "");
  const query = normalize(url.searchParams.get("q") ?? "");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const queryTokens = tokens(query);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wish_profile_previews")
    .select("*")
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const previews = ((data ?? []) as WishProfilePreviewRow[])
    .map((preview) => {
      const previewText = normalize(`${preview.public_preview} ${preview.causes.join(" ")}`);
      const causeMatch = cause
        ? preview.causes.some((entry) => normalize(entry).includes(cause))
        : true;
      const sharedTokens = [...queryTokens].filter((token) => previewText.includes(token));
      const score =
        (cause && causeMatch ? 50 : 0) +
        Math.min(40, sharedTokens.length * 10) +
        (preview.openness_to_payment ? 5 : 0) +
        (preview.openness_to_pledges ? 5 : 0);

      return { preview, score, sharedTokens };
    })
    .filter(({ score }) => (!cause && !query ? true : score > 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return NextResponse.json({
    results: previews.map(({ preview, score, sharedTokens }) => ({
      profileId: preview.profile_id,
      participantKind: preview.participant_kind,
      collectiveName: preview.collective_name,
      causes: preview.causes,
      publicPreview: preview.public_preview,
      locationCity: preview.location_city,
      locationRegion: preview.location_region,
      opennessToPayment: preview.openness_to_payment,
      opennessToPledges: preview.openness_to_pledges,
      privacyStage: preview.privacy_stage,
      score,
      sharedTokens,
    })),
    privacyNotice:
      "Only broad preview fields are returned. Exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint.",
  });
}
