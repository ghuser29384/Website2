import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeParticipantEligibilityContract,
  validateMoralTradeParticipantEligibilityContract,
} from "@/lib/moral-trade/participant-eligibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no participant-eligibility payload until the window resets.",
    );
  }

  const contract = getMoralTradeParticipantEligibilityContract();
  const validation = validateMoralTradeParticipantEligibilityContract(contract);

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
      reviewDimensions: contract.reviewDimensions,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiredDimensions: transition.requiredDimensions,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      participantEligibilitySampleEvaluationStatuses: Object.fromEntries(
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
