import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAgreementAmendmentContract,
  validateMoralTradeAgreementAmendmentContract,
} from "@/lib/moral-trade/agreement-amendments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no agreement-amendment payload until the window resets.",
    );
  }

  const contract = getMoralTradeAgreementAmendmentContract();
  const validation = validateMoralTradeAgreementAmendmentContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      enforcementRule: contract.enforcementRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      enforcementRecordTables: contract.enforcementRecordTables,
      enforcementRoute: contract.enforcementRoute,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      transitions: contract.transitions,
      subjectTypes: contract.subjectTypes,
      amendmentTypes: contract.amendmentTypes,
      amendmentStates: contract.amendmentStates,
      confirmationStates: contract.confirmationStates,
      failClosedStatuses: contract.failClosedStatuses,
      transitionDefinitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        protectedBoundary: transition.protectedBoundary,
        requiredRecords: transition.requiredRecords,
        blocksTransitions: transition.blocksTransitions,
      })),
      agreementAmendmentSampleEvaluationStatuses: Object.fromEntries(
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
