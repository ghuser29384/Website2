import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  buildMoralTradeReasoningPacketRoutePayload,
} from "@/lib/moral-trade/reasoning-packets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const payload = buildMoralTradeReasoningPacketRoutePayload({
    status: new URL(request.url).searchParams.get("status"),
    onRecovery(error) {
      console.warn(
        "[moral-trade/reasoning/packets] Returning recovery payload after packet generation failed.",
        error,
      );
    },
  });

  return buildMoralTradeApiJsonResponse(payload);
}
