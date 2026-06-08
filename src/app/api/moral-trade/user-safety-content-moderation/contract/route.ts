import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeUserSafetyContentModerationContract,
  validateMoralTradeUserSafetyContentModerationContract,
} from "@/lib/moral-trade/user-safety-content-moderation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no user-safety or content-moderation payload until the window resets.",
    );
  }

  const contract = getMoralTradeUserSafetyContentModerationContract();
  const validation =
    validateMoralTradeUserSafetyContentModerationContract(contract);

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
      transitionKeys: contract.transitionDefinitions.map(
        (transition) => transition.key,
      ),
      contentTypes: contract.contentTypes,
      moderationDimensions: contract.moderationDimensions,
      userSafetyDimensions: contract.userSafetyDimensions,
      moderationFailClosedStatuses: contract.moderationFailClosedStatuses,
      userSafetyFailClosedStatuses: contract.userSafetyFailClosedStatuses,
      nonClaims: contract.contractNonClaims,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiredContentTypes: transition.requiredContentTypes,
        requiredUserSafetyDimensions: transition.requiredUserSafetyDimensions,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      sampleEvaluationStatuses: Object.fromEntries(
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
