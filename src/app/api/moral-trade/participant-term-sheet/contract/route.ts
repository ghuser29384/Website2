import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeParticipantTermSheetContract,
  validateMoralTradeParticipantTermSheetContract,
} from "@/lib/moral-trade/participant-term-sheet";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no participant-term-sheet payload until the window resets.",
    );
  }

  const contract = getMoralTradeParticipantTermSheetContract();
  const validation = validateMoralTradeParticipantTermSheetContract(contract);
  const participantTermSheetSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        immutablePolicyCount: evaluation.immutablePolicyCount,
        passingTermSheetCount: evaluation.passingTermSheetCount,
        stagedDisclosureCount: evaluation.stagedDisclosureCount,
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
      termSheetStates: contract.termSheetStates,
      disclosureStates: contract.disclosureStates,
      visibleDisclosureStatuses: contract.visibleDisclosureStatuses,
      disclosureStages: contract.disclosureStages,
      policyStatuses: contract.policyStatuses,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresBlindingPolicy: transition.requiresBlindingPolicy,
        requiresParticipantTermSheet: transition.requiresParticipantTermSheet,
        requiresStagedDisclosure: transition.requiresStagedDisclosure,
        requiresMutualConfirmation: transition.requiresMutualConfirmation,
        requiresMutualDisclosureConsent:
          transition.requiresMutualDisclosureConsent,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      participantTermSheetSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
