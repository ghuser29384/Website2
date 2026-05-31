import { NextResponse } from "next/server";

import { serializeOpportunityBriefCard } from "@/lib/background-opportunity-briefs";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_opportunity_brief_read",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited opportunity brief reads return no private brief data until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data, error } = await supabase
    .from("background_opportunity_briefs")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return privateJson({ error: error.message }, 500);
  }

  return privateJson({
    briefs: (data ?? []).map((brief) => serializeOpportunityBriefCard(brief)),
    privacyNotice:
      "Opportunity briefs are broad-preview records. Exact wishes, private asks, source notes, constraints, and contact details remain outside this API response.",
  });
}
