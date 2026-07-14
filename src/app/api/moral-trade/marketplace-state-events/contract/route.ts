import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeMarketplaceStateEventContract,
  validateMoralTradeMarketplaceStateEventContract,
} from "@/lib/moral-trade/marketplace-state-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no marketplace state-event payload until the window resets.",
    );
  }

  const contract = getMoralTradeMarketplaceStateEventContract();
  const validation = validateMoralTradeMarketplaceStateEventContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      appendOnlyRule: contract.appendOnlyRule,
      contractTests: contract.contractTests,
      eventDomainRule: contract.eventDomainRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      migrationNames: contract.migrationNames,
      privacyBoundary: contract.privacyBoundary,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      requiredSubjectTypes: contract.requiredSubjectTypes,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}`,
          {
            blockedEventCount: sample.blockedEventCount,
            coveredSubjectTypes: sample.coveredSubjectTypes,
            status: sample.status,
          },
        ]),
      ),
      terminalStateRule: contract.terminalStateRule,
      terminalStates: contract.terminalStates,
      transitionMap: contract.transitionMap,
    },
    purpose: contract.purpose,
    validation,
  });
}
