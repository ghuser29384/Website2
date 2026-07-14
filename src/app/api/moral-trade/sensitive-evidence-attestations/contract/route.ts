import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeSensitiveEvidenceAttestationContract,
  validateMoralTradeSensitiveEvidenceAttestationContract,
} from "@/lib/moral-trade/sensitive-evidence-attestations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no sensitive-evidence attestation payload until the window resets.",
    );
  }

  const contract = getMoralTradeSensitiveEvidenceAttestationContract();
  const validation =
    validateMoralTradeSensitiveEvidenceAttestationContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      attestationResultRule: contract.attestationResultRule,
      rawArtifactDisclosureRule: contract.rawArtifactDisclosureRule,
      challengeRule: contract.challengeRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      evidencePathTypes: contract.evidencePathTypes,
      claimTypes: contract.claimTypes,
      disclosureModes: contract.disclosureModes,
      privacyGrantStatuses: contract.privacyGrantStatuses,
      confidentialityReviewStatuses: contract.confidentialityReviewStatuses,
      resultStates: contract.resultStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresAttestation: transition.requiresAttestation,
        requiresPrivacyPreservingCounterpartyResult:
          transition.requiresPrivacyPreservingCounterpartyResult,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      sensitiveEvidenceAttestationSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      rawArtifactDisclosureBlockerCounts: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.rawArtifactDisclosureBlockerCount,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
