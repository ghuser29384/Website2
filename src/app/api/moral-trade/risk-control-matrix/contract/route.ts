import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeRiskControlMatrixContract,
  validateMoralTradeRiskControlMatrixContract,
} from "@/lib/moral-trade/risk-control-matrix";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no risk-control matrix payload until the window resets.",
    );
  }

  const contract = getMoralTradeRiskControlMatrixContract();
  const validation = validateMoralTradeRiskControlMatrixContract(contract);

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
      transitions: contract.transitions,
      subjectTypes: contract.subjectTypes,
      tradeTypes: contract.tradeTypes,
      releaseStages: contract.releaseStages,
      knownControlCodes: contract.knownControlCodes,
      nonBlockingStatuses: contract.nonBlockingStatuses,
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
