import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeNoncompensableBlockerContract,
  validateMoralTradeNoncompensableBlockerContract,
} from "@/lib/moral-trade/noncompensable-blockers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no noncompensable-blocker payload until the window resets.",
    );
  }

  const contract = getMoralTradeNoncompensableBlockerContract();
  const validation = validateMoralTradeNoncompensableBlockerContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      personalWaiverRule: contract.personalWaiverRule,
      compensationAttemptRule: contract.compensationAttemptRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      protectedInterestTypes: contract.protectedInterestTypes,
      attemptedCompensationOrWaiverStates:
        contract.attemptedCompensationOrWaiverStates,
      personalWaiverAllowedStates: contract.personalWaiverAllowedStates,
      reviewStates: contract.reviewStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresAssessment: transition.requiresAssessment,
        requiresNonBlockingReview: transition.requiresNonBlockingReview,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      noncompensableBlockerSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      compensationAttemptBlockerCounts: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.compensationAttemptBlockerCount,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
