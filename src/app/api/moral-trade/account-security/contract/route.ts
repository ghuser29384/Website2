import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAccountSecurityContract,
  validateMoralTradeAccountSecurityContract,
} from "@/lib/moral-trade/account-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no account-security payload until the window resets.",
    );
  }

  const contract = getMoralTradeAccountSecurityContract();
  const validation = validateMoralTradeAccountSecurityContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      highRiskActions: contract.highRiskActions,
      eventTypes: contract.eventTypes,
      failClosedStatuses: contract.failClosedStatuses,
      actions: contract.actionDefinitions.map((action) => ({
        key: action.key,
        blocksRiskClasses: action.blocksRiskClasses,
        userFacingBlockerCategory: action.userFacingBlockerCategory,
      })),
      accountSecuritySampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.action,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
