import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAuthorityObligationContract,
  validateMoralTradeAuthorityObligationContract,
} from "@/lib/moral-trade/authority-obligations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no authority/obligation payload until the window resets.",
    );
  }

  const contract = getMoralTradeAuthorityObligationContract();
  const validation = validateMoralTradeAuthorityObligationContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      assessmentTypes: contract.assessmentTypes,
      authorityObligationSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      contractTests: contract.contractTests,
      disclosureRule: contract.disclosureRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      representativeAuthorityRule: contract.representativeAuthorityRule,
      thirdPartyObligationRule: contract.thirdPartyObligationRule,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
