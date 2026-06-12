import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeCauseBucketTaxonomyContract,
  validateMoralTradeCauseBucketTaxonomyContract,
} from "@/lib/moral-trade/cause-bucket-taxonomy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no cause-bucket taxonomy payload until the window resets.",
    );
  }

  const contract = getMoralTradeCauseBucketTaxonomyContract();
  const validation = validateMoralTradeCauseBucketTaxonomyContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      privacyBoundary: contract.privacyBoundary,
      nonRankingRule: contract.nonRankingRule,
      materialChangeRule: contract.materialChangeRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      taxonomyTypes: contract.taxonomyTypes,
      subjectTypes: contract.subjectTypes,
      reviewStates: contract.reviewStates,
      taxonomyStates: contract.taxonomyStates,
      assignmentConfidenceStates: contract.assignmentConfidenceStates,
      assignmentVisibilityStates: contract.assignmentVisibilityStates,
      assignmentStates: contract.assignmentStates,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresActiveTaxonomy: transition.requiresActiveTaxonomy,
        requiresReviewedAssignmentsWhenEffectBearing:
          transition.requiresReviewedAssignmentsWhenEffectBearing,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      causeBucketSampleEvaluationStatuses: Object.fromEntries(
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
