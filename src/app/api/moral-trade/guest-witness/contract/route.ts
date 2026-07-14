import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getGuestWitnessTestimonyContract,
  validateGuestWitnessTestimonyContract,
} from "@/lib/moral-trade/guest-witness-testimony";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited guest-witness contract reads return no contract payload until the window resets.",
    );
  }

  const contract = getGuestWitnessTestimonyContract();
  const validation = validateGuestWitnessTestimonyContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      acceptedConcernFlags: contract.acceptedConcernFlags,
      acceptedRelationshipTypes: contract.acceptedRelationshipTypes,
      contractTests: contract.contractTests,
      duplicateResistanceRules: contract.duplicateResistanceRules,
      firstClassRecordTables: contract.firstClassRecordTables,
      frozenPolicyRule: contract.frozenPolicyRule,
      participantVisibilityRule: contract.participantVisibilityRule,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      privacyRules: contract.privacyRules,
      providerAbstraction: contract.providerAbstraction.map((provider) => ({
        configured: provider.configured,
        dataReturned: provider.dataReturned,
        failureBehavior: provider.failureBehavior,
        privacyDisclosureText: provider.privacyDisclosureText,
        provider: provider.provider,
        providerReviewStatus: provider.providerReviewStatus,
        requiredScopes: provider.requiredScopes,
        supportedEnvironment: provider.supportedEnvironment,
        tokenRetentionPolicy: provider.tokenRetentionPolicy,
        unavailableReason: provider.unavailableReason,
      })),
      publicFunderRule: contract.publicFunderRule,
      reviewerAuditRule: contract.reviewerAuditRule,
    },
    purpose: contract.purpose,
    validation,
  });
}
