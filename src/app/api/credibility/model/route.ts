import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { getActiveCredibilityModel } from "@/lib/credibility-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited credibility model read returns no model payload until the window resets.",
    );
  }

  const model = await getActiveCredibilityModel();

  return buildMoralTradeApiJsonResponse(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      modelVersion: model.version,
      status: "provisional_not_yet_calibrated",
      predictionTarget:
        "Acceptable completion of a specific commitment under its registered role, category, terms, evidence plan, and settlement structure.",
      publicModel: {
        prior: {
          success: model.priorSuccess,
          failure: model.priorFailure,
        },
        publicQuantile: model.lowerQuantile,
        minimumEffectiveObservations: model.minimumEffectiveObservations,
        recencyHalfLifeDays: model.recencyHalfLifeDays,
        dimensionWeights: model.dimensionWeights,
        contextWeights: model.contextWeights,
        levels: ["Unproven", "Developing", "Established", "Strong"],
        excludedInputs: [
          "moral worldview",
          "cause popularity",
          "followers or likes",
          "wealth or total donations",
          "protected demographic characteristics",
          "private communications without explicit consent",
        ],
        safetySeparation: {
          nonCompensatoryEvents: [
            "fraud",
            "forged evidence",
            "coercion",
            "threats",
            "identity duplication",
            "account compromise",
          ],
          effect:
            "These events enter a separate eligibility system and cannot be washed out by positive micro-transactions.",
        },
      },
      documentation: "/credibility",
    },
    "public_contract_static",
  );
}
