import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeProviderSourceAuthenticationContract,
  validateMoralTradeProviderSourceAuthenticationContract,
} from "@/lib/moral-trade/provider-source-authentication";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no provider source-authentication payload until the window resets.",
    );
  }

  const contract = getMoralTradeProviderSourceAuthenticationContract();
  const validation = validateMoralTradeProviderSourceAuthenticationContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      manualReviewRule: contract.manualReviewRule,
      migrationNames: contract.migrationNames,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      privacyBoundary: contract.privacyBoundary,
      providerAuthenticationRule: contract.providerAuthenticationRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      replayRule: contract.replayRule,
      requiredSubjectTypes: contract.requiredSubjectTypes,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}`,
          {
            applicableRecordCount: sample.applicableRecordCount,
            ignoredDuplicateCount: sample.ignoredDuplicateCount,
            stateMutationAllowed: sample.stateMutationAllowed,
            status: sample.status,
          },
        ]),
      ),
      stateChangeSurfaces: contract.stateChangeSurfaces,
      storageBeforeApplyRule: contract.storageBeforeApplyRule,
    },
    purpose: contract.purpose,
    validation,
  });
}
