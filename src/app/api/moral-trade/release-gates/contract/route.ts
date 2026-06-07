import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
} from "@/lib/moral-trade/release-gates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no release-gate payload until the window resets.",
    );
  }

  const contract = getMoralTradeReleaseGateContract();
  const validation = validateMoralTradeReleaseGateContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      stages: contract.stages.map((stage) => ({
        key: stage.key,
        featureFlagKey: stage.featureFlagKey,
        payable: stage.payable,
        relianceBearing: stage.relianceBearing,
        publicMetricsMayPublish: stage.publicMetricsMayPublish,
        requiredRequirementKeys: stage.requiredRequirementKeys,
        inactiveRequirementKeys: stage.inactiveRequirementKeys,
      })),
      requirementKeys: contract.requirementDefinitions.map((requirement) => requirement.key),
      firstClassRecordTables: contract.firstClassRecordTables,
      immutablePolicySnapshotSubjects: contract.immutablePolicySnapshotSubjects,
      privilegedActionKeys: contract.privilegedActionKeys,
      stateInterpretationRule: contract.stateInterpretationRule,
      policySnapshotRule: contract.policySnapshotRule,
      sampleEvaluations: contract.sampleEvaluations.map((evaluation) => ({
        stage: evaluation.stage,
        status: evaluation.status,
        payable: evaluation.payable,
        relianceBearing: evaluation.relianceBearing,
        blockers: evaluation.blockers,
      })),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
