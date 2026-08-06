import type { SupabaseClient } from "@supabase/supabase-js";

export type HarmfulOfferRateLimitScope = "live_draft" | "publication" | "appeal";

interface RateLimitRow {
  allowed: boolean;
}

export async function claimHarmfulOfferAssessmentRateLimit(input: {
  supabase: SupabaseClient;
  actorId: string;
  scope: HarmfulOfferRateLimitScope;
}) {
  const { data, error } = await input.supabase.rpc(
    "moral_trade_claim_harm_assessment_rate_limit_service" as never,
    {
      p_actor_id: input.actorId,
      p_scope: input.scope,
    } as never,
  );
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("The harmful-offer assessment rate-limit receipt was invalid.");
  }
  return row.allowed;
}
