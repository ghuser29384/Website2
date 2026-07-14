import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeNonPublicGoodsTierContract,
  validateMoralTradeNonPublicGoodsTierContract,
} from "@/lib/moral-trade/non-public-goods-tier";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no non-public-goods tier payload until the window resets.",
    );
  }

  const contract = getMoralTradeNonPublicGoodsTierContract();
  const validation = validateMoralTradeNonPublicGoodsTierContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      privacyBoundary: contract.privacyBoundary,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      tiers: contract.tiers,
      transitions: contract.transitions,
      subjectTypes: contract.subjectTypes,
      counterfactualTrustClasses: contract.counterfactualTrustClasses,
      counterpartyModes: contract.counterpartyModes,
      failClosedStatuses: contract.failClosedStatuses,
      sampleEvaluationStatuses: Object.fromEntries(
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
