import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeRecipientDestinationContract,
  validateMoralTradeRecipientDestinationContract,
} from "@/lib/moral-trade/recipient-destination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no recipient-destination payload until the window resets.",
    );
  }

  const contract = getMoralTradeRecipientDestinationContract();
  const validation = validateMoralTradeRecipientDestinationContract(contract);

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
      reviewDimensions: contract.reviewDimensions,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresVerifiedRegistry: transition.requiresVerifiedRegistry,
        requiresVerifiedDestination: transition.requiresVerifiedDestination,
        requiresPrivilegedAction: transition.requiresPrivilegedAction,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      recipientDestinationSampleEvaluationStatuses: Object.fromEntries(
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
