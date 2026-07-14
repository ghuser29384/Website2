import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePrivateExchangeRateContract,
  validateMoralTradePrivateExchangeRateContract,
} from "@/lib/moral-trade/private-exchange-rate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no private exchange-rate payload until the window resets.",
    );
  }

  const contract = getMoralTradePrivateExchangeRateContract();
  const validation = validateMoralTradePrivateExchangeRateContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      publicNonPriceRule: contract.publicNonPriceRule,
      privacyBoundary: contract.privacyBoundary,
      affectedParticipantCoverageRule: contract.affectedParticipantCoverageRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      quoteTypes: contract.quoteTypes,
      disclosureScopes: contract.disclosureScopes,
      quoteStates: contract.quoteStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresQuoteRecord: transition.requiresQuoteRecord,
        requiresActiveQuote: transition.requiresActiveQuote,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      privateExchangeRateSampleEvaluationStatuses: Object.fromEntries(
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
