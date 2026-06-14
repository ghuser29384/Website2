import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeDonorOfRecordTaxContract,
  validateMoralTradeDonorOfRecordTaxContract,
} from "@/lib/moral-trade/donor-of-record-tax";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no donor-of-record tax payload until the window resets.",
    );
  }

  const contract = getMoralTradeDonorOfRecordTaxContract();
  const validation = validateMoralTradeDonorOfRecordTaxContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      donorOfRecordTaxSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      impactSeparationRule: contract.impactSeparationRule,
      noTaxClaimRule: contract.noTaxClaimRule,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      receiptRule: contract.receiptRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
