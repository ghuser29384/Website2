import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeOfferValidityContract,
  validateMoralTradeOfferValidityContract,
} from "@/lib/moral-trade/offer-validity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no offer-validity payload until the window resets.",
    );
  }

  const contract = getMoralTradeOfferValidityContract();
  const validation = validateMoralTradeOfferValidityContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      validityWindowRule: contract.validityWindowRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      validityStates: contract.validityStates,
      policyStatuses: contract.policyStatuses,
      staleReasonCodes: contract.staleReasonCodes,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresValidityRecord: transition.requiresValidityRecord,
        requiresActiveValidity: transition.requiresActiveValidity,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      offerValiditySampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
