import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePaymentAuthorizationContract,
  validateMoralTradePaymentAuthorizationContract,
} from "@/lib/moral-trade/payment-authorizations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no payment-authorization payload until the window resets.",
    );
  }

  const contract = getMoralTradePaymentAuthorizationContract();
  const validation = validateMoralTradePaymentAuthorizationContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      authorizationModes: contract.authorizationModes,
      captureRule: contract.captureRule,
      conditionalProviderRule: contract.conditionalProviderRule,
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      manualStubRule: contract.manualStubRule,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      privacyBoundary: contract.privacyBoundary,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      requiredProviderAuthorizationGates: contract.requiredProviderAuthorizationGates,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}_${sample.transition}`,
          {
            providerAuthorizationCount: sample.providerAuthorizationCount,
            status: sample.status,
            stubRecordCount: sample.stubRecordCount,
          },
        ]),
      ),
      subjectTypes: contract.subjectTypes,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
