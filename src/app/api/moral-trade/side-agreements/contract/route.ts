import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeSideAgreementContract,
  validateMoralTradeSideAgreementContract,
} from "@/lib/moral-trade/side-agreements";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no side-agreement payload until the window resets.",
    );
  }

  const contract = getMoralTradeSideAgreementContract();
  const validation = validateMoralTradeSideAgreementContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      reviewDimensions: contract.reviewDimensions,
      failClosedStatuses: contract.failClosedStatuses,
      forbiddenPublicSummaryTerms: contract.forbiddenPublicSummaryTerms,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresDisclosureRecord: transition.requiresDisclosureRecord,
        requiresNonBlockingReviews: transition.requiresNonBlockingReviews,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      sideAgreementSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
