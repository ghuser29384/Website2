import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePilotEvidenceContract,
  validateMoralTradePilotEvidenceContract,
} from "@/lib/moral-trade/pilot-evidence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no pilot-evidence payload until the window resets.",
    );
  }

  const contract = getMoralTradePilotEvidenceContract();
  const validation = validateMoralTradePilotEvidenceContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      simulationRule: contract.simulationRule,
      redTeamRule: contract.redTeamRule,
      exitCriteriaRule: contract.exitCriteriaRule,
      matchedVolumeRule: contract.matchedVolumeRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      pilotTracks: contract.pilotTracks,
      evidenceTypes: contract.evidenceTypes,
      successMetrics: contract.successMetrics,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresEvidence: transition.requiresEvidence,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      pilotEvidenceSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      pilotEvidenceSampleBlockerCounts: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.blockerCount,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
