import { listOpenOffersPreview } from "@/lib/app-data";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  buildPublicOffersCollectionPayload,
  getPublicOffersLiveModeFromSearchParams,
  validatePublicOffersCollectionPayload,
} from "@/lib/public-offers";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "offer_collection_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited offer collection reads return no listing payload until the window resets.",
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const liveMode = getPublicOffersLiveModeFromSearchParams(searchParams);
  const liveOffers = hasSupabaseEnv() ? await listOpenOffersPreview(120, liveMode) : [];
  const payload = buildPublicOffersCollectionPayload({
    liveOffers,
    searchParams,
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  return buildMoralTradeApiJsonResponse(
    {
      ok: validation.status === "pass",
      checkedAt: new Date().toISOString(),
      ...payload,
      validation,
      blockers: validation.blockers,
    },
  );
}
