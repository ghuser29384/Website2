import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeReviewerConsoleContract,
  validateMoralTradeReviewerConsoleContract,
} from "@/lib/moral-trade/reviewer-console";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no reviewer-console payload until the window resets.",
    );
  }

  const contract = getMoralTradeReviewerConsoleContract();
  const validation = validateMoralTradeReviewerConsoleContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      assignmentStates: contract.assignmentStates,
      checkStatuses: contract.checkStatuses,
      conflictStates: contract.conflictStates,
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      finalDecisionAuditRule: contract.finalDecisionAuditRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      privacyBoundary: contract.privacyBoundary,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      requiredPublicReceiptPublicationChecks:
        contract.requiredPublicReceiptPublicationChecks,
      requiredSurfaces: contract.requiredSurfaces,
      requiredUiReviewChecks: contract.requiredUiReviewChecks,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}_${sample.surface}`,
          {
            checkedRequirementCount: sample.checkedRequirementCount,
            status: sample.status,
            userFacingBlockerCategories: sample.userFacingBlockerCategories,
          },
        ]),
      ),
    },
    purpose: contract.purpose,
    validation,
  });
}
