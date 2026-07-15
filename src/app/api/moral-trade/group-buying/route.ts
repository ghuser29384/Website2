import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { getPrivateProposalIntakeFields } from "@/lib/moral-trade/group-buying";
import { loadLiveGroupBuyingSnapshot } from "@/lib/moral-trade/group-buying-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited group-buying reads return no inventory or financial state until the window resets.",
    );
  }

  const snapshot = await loadLiveGroupBuyingSnapshot();

  return buildMoralTradeApiJsonResponse({
    checkedAt: snapshot.checkedAt,
    featureName: "Moral Goods Group Buying",
    ok: snapshot.sourceStatus === "live",
    sourceStatus: snapshot.sourceStatus,
    inventory: {
      liveRouteCount: snapshot.routes.length,
      openCycleCount: snapshot.openCycleCount,
      routes: snapshot.routes,
      exclusionRule:
        "Demo, test, sandbox, simulated, and approved-demo records are not returned as live inventory.",
    },
    financialState: snapshot.financial,
    paymentReadiness: snapshot.paymentReadiness,
    privateProposalIntakeFields: getPrivateProposalIntakeFields(),
    stateRules: [
      "Pledge-only intent is not included in live financial totals.",
      "Conditional exposure, charge, refund, transfer, and recurring commitment are separate states.",
      "Missing production data is returned as unavailable rather than replaced with seed data.",
      "No participant identities, provider identifiers, receipts, or row-level payment records are public.",
    ],
  });
}
