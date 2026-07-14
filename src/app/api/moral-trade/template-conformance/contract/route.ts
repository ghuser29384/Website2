import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeTemplateConformanceContract,
  validateMoralTradeTemplateConformanceContract,
} from "@/lib/moral-trade/template-conformance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no template-conformance payload until the window resets.",
    );
  }

  const contract = getMoralTradeTemplateConformanceContract();
  const validation = validateMoralTradeTemplateConformanceContract(contract);
  const templateConformanceSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        conformingInstanceCount: evaluation.conformingInstanceCount,
        offTemplateExceptionCount: evaluation.offTemplateExceptionCount,
      },
    ]),
  );

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
      tradeTypes: contract.tradeTypes,
      subjectTypes: contract.subjectTypes,
      templateStates: contract.templateStates,
      conformanceStates: contract.conformanceStates,
      offTemplateBehaviors: contract.offTemplateBehaviors,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresTemplateInstance: transition.requiresTemplateInstance,
        requiresActiveTemplate: transition.requiresActiveTemplate,
        allowsOffTemplateException: transition.allowsOffTemplateException,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      templateConformanceSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
