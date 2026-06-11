import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePostClearAuditContract,
  validateMoralTradePostClearAuditContract,
} from "@/lib/moral-trade/post-clear-audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no post-clear audit payload until the window resets.",
    );
  }

  const contract = getMoralTradePostClearAuditContract();
  const validation = validateMoralTradePostClearAuditContract(contract);
  const postClearAuditSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        postClearAuditRequired: evaluation.postClearAuditRequired,
        nonBlockingAuditRecordCount:
          evaluation.nonBlockingAuditRecordCount,
        reviewerDecisionCount: evaluation.reviewerDecisionCount,
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
      subjectTypes: contract.subjectTypes,
      auditTypes: contract.auditTypes,
      matchStates: contract.matchStates,
      auditStates: contract.auditStates,
      policyStatuses: contract.policyStatuses,
      correctionBoundaries: contract.correctionBoundaries,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresImmutablePolicyWhenRequired:
          transition.requiresImmutablePolicyWhenRequired,
        requiresAuditRecordWhenRequired:
          transition.requiresAuditRecordWhenRequired,
        requiresNonBlockingAuditForPublicSurface:
          transition.requiresNonBlockingAuditForPublicSurface,
        requiresReviewerDecision: transition.requiresReviewerDecision,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      postClearAuditSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
