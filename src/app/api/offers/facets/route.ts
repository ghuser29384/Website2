import { listOpenOffersPreview } from "@/lib/app-data";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  buildPublicOffersFacetsPayload,
  getPublicOffersLiveModeFromSearchParams,
  validatePublicOffersFacetsPayload,
} from "@/lib/public-offers";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "offer_facets_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited offer facet reads return no facet payload until the window resets.",
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const liveMode = getPublicOffersLiveModeFromSearchParams(searchParams);
  const liveOffers = hasSupabaseEnv() ? await listOpenOffersPreview(120, liveMode) : [];
  const payload = buildPublicOffersFacetsPayload({
    liveOffers,
    searchParams,
  });
  const validation = validatePublicOffersFacetsPayload(payload);

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
