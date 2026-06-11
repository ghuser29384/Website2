import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeRecipientAcceptanceContract,
  validateMoralTradeRecipientAcceptanceContract,
} from "@/lib/moral-trade/recipient-acceptance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no recipient-acceptance payload until the window resets.",
    );
  }

  const contract = getMoralTradeRecipientAcceptanceContract();
  const validation = validateMoralTradeRecipientAcceptanceContract(contract);
  const recipientAcceptanceSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        immutablePolicyCount: evaluation.immutablePolicyCount,
        acceptedRecipientCount: evaluation.acceptedRecipientCount,
        clearedAdverseAssociationCount:
          evaluation.clearedAdverseAssociationCount,
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
      acceptanceStatuses: contract.acceptanceStatuses,
      adverseAssociationStatuses: contract.adverseAssociationStatuses,
      visibleRecipientStatuses: contract.visibleRecipientStatuses,
      riskClasses: contract.riskClasses,
      policyStatuses: contract.policyStatuses,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresAcceptancePolicy: transition.requiresAcceptancePolicy,
        requiresAcceptanceRecord: transition.requiresAcceptanceRecord,
        requiresRecipientConsent: transition.requiresRecipientConsent,
        requiresAdverseAssociationReview:
          transition.requiresAdverseAssociationReview,
        allowsMitigatedAssociation: transition.allowsMitigatedAssociation,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      recipientAcceptanceSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
