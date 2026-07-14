import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
} from "@/lib/moral-trade/reviewer-quality";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no reviewer-quality payload until the window resets.",
    );
  }

  const contract = getMoralTradeReviewerQualityContract();
  const validation = validateMoralTradeReviewerQualityContract(contract);

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
      reviewTypes: contract.reviewTypes,
      failClosedStatuses: contract.failClosedStatuses,
      reviews: contract.reviewDefinitions.map((review) => ({
        key: review.key,
        blocksTransitions: review.blocksTransitions,
        userFacingBlockerCategory: review.userFacingBlockerCategory,
      })),
      reviewerQualitySampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.reviewType,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
