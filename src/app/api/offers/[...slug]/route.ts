import { getOfferById } from "@/lib/app-data";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  buildPublicOfferDetailPayload,
  getPublicOfferSlugFromSegments,
  validatePublicOfferDetailPayload,
} from "@/lib/public-offers";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

interface PublicOfferDetailRouteContext {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function GET(request: Request, context: PublicOfferDetailRouteContext) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "offer_detail_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited offer detail reads return no listing payload until the window resets.",
    );
  }

  const { slug: segments = [] } = await context.params;
  const slug = getPublicOfferSlugFromSegments(segments);
  let payload = buildPublicOfferDetailPayload({
    liveOffers: [],
    slug,
  });

  if (!payload.item && hasSupabaseEnv() && slug && !slug.startsWith("examples/")) {
    const liveOffer = await getOfferById(slug);
    payload = buildPublicOfferDetailPayload({
      liveOffers: liveOffer?.status === "open" ? [liveOffer] : [],
      slug,
    });
  }

  const validation = validatePublicOfferDetailPayload(payload);
  const status = payload.item ? 200 : 404;

  return buildMoralTradeApiJsonResponse(
    {
      ok: validation.status === "pass",
      checkedAt: new Date().toISOString(),
      ...payload,
      validation,
      blockers: validation.blockers,
    },
    "no_store_dynamic",
    {
      status,
    },
  );
}
