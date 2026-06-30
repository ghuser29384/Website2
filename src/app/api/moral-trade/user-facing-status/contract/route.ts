import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeUserFacingStatusContract,
  validateMoralTradeUserFacingStatusContract,
} from "@/lib/moral-trade/user-facing-status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no user-facing status payload until the window resets.",
    );
  }

  const contract = getMoralTradeUserFacingStatusContract();
  const validation = validateMoralTradeUserFacingStatusContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      allowedStatuses: contract.allowedStatuses,
      appealCorrectionRule: contract.appealCorrectionRule,
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      forbiddenPrimaryCopyTerms: contract.forbiddenPrimaryCopyTerms,
      materialDisclosureRule: contract.materialDisclosureRule,
      migrationNames: contract.migrationNames,
      moneyEffects: contract.moneyEffects,
      obligationEffects: contract.obligationEffects,
      plainLanguageRule: contract.plainLanguageRule,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      privacyBoundary: contract.privacyBoundary,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}`,
          {
            blockedRecordCount: sample.blockedRecordCount,
            recordCount: sample.recordCount,
            status: sample.status,
            userFacingBlockerCategories: sample.userFacingBlockerCategories,
          },
        ]),
      ),
      subjectTypes: contract.subjectTypes,
    },
    purpose: contract.purpose,
    validation,
  });
}
