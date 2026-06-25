import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeBehavioralMicroPledgeContract,
  validateMoralTradeBehavioralMicroPledgeContract,
} from "@/lib/moral-trade/behavioral-micro-pledges";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no behavioral-micro-pledge payload until the window resets.",
    );
  }

  const contract = getMoralTradeBehavioralMicroPledgeContract();
  const validation = validateMoralTradeBehavioralMicroPledgeContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      defaultCaps: contract.defaultCaps,
      defaultGranularityRule: contract.defaultGranularityRule,
      defaultUnitGranularities: contract.defaultUnitGranularities,
      evidenceLadderRule: contract.evidenceLadderRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      healthSafetyRule: contract.healthSafetyRule,
      manualReviewOnlyGranularities: contract.manualReviewOnlyGranularities,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      prePerformanceLockRule: contract.prePerformanceLockRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          {
            blockers: sample.blockers,
            defaultSafeUnitCount: sample.defaultSafeUnitCount,
            prePerformanceLockedUnitCount: sample.prePerformanceLockedUnitCount,
            status: sample.status,
            unitCount: sample.unitCount,
          },
        ]),
      ),
      sequenceCapRule: contract.sequenceCapRule,
      settlementDisclosureRule: contract.settlementDisclosureRule,
      transitions: contract.transitions,
      unitBaselineRule: contract.unitBaselineRule,
    },
    purpose: contract.purpose,
    validation,
  });
}
