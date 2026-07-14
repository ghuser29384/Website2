import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeNegativeCommitmentScopeContract,
  validateMoralTradeNegativeCommitmentScopeContract,
} from "@/lib/moral-trade/negative-commitment-scopes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no negative-commitment scope payload until the window resets.",
    );
  }

  const contract = getMoralTradeNegativeCommitmentScopeContract();
  const validation = validateMoralTradeNegativeCommitmentScopeContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      evidenceSeparationRule: contract.evidenceSeparationRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      negativeCommitmentScopeSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      policySnapshotSubjects: contract.policySnapshotSubjects,
      privacyRule: contract.privacyRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      substitutionRule: contract.substitutionRule,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
