import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMarketplaceIntakeTriageContract,
  validateMarketplaceIntakeTriageContract,
} from "@/lib/moral-trade/marketplace-intake-triage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no marketplace-intake-triage payload until the window resets.",
    );
  }

  const contract = getMarketplaceIntakeTriageContract();
  const validation = validateMarketplaceIntakeTriageContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      firstClassRecordTables: contract.firstClassRecordTables,
      privacyBoundary: contract.privacyBoundary,
      initialRoutes: contract.initialRoutes,
      routeAwayInitialRoutes: contract.routeAwayInitialRoutes,
      prohibitedReviewStates: contract.prohibitedReviewStates,
      correctionStates: contract.correctionStates,
      visibilityStates: contract.visibilityStates,
      triageStates: contract.triageStates,
      inferenceProhibitions: contract.inferenceProhibitions,
      requiredRecordFields: contract.requiredRecordFields,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.recordId,
          {
            status: evaluation.status,
            initialRoute: evaluation.initialRoute,
            mappedRouteKey: evaluation.mappedRouteKey,
            blockers: evaluation.blockers,
          },
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
