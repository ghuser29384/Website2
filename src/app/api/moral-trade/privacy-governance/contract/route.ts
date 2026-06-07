import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePrivacyGovernanceContract,
  validateMoralTradePrivacyGovernanceContract,
} from "@/lib/moral-trade/privacy-governance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no privacy-governance payload until the window resets.",
    );
  }

  const contract = getMoralTradePrivacyGovernanceContract();
  const validation = validateMoralTradePrivacyGovernanceContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      existingRecordTables: contract.existingRecordTables,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      surfaces: contract.surfaces,
      audienceStages: contract.audienceStages,
      accessLevels: contract.accessLevels,
      failClosedStatuses: contract.failClosedStatuses,
      surfaceDefinitions: contract.surfaceDefinitions.map((surface) => ({
        key: surface.key,
        protectedData: surface.protectedData,
        requiredControls: surface.requiredControls,
        blocksTransitions: surface.blocksTransitions,
      })),
      privacyGovernanceSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.surface,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
