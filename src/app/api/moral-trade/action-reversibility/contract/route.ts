import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeActionReversibilityContract,
  validateMoralTradeActionReversibilityContract,
} from "@/lib/moral-trade/action-reversibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no action-reversibility payload until the window resets.",
    );
  }

  const contract = getMoralTradeActionReversibilityContract();
  const validation = validateMoralTradeActionReversibilityContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      actionReversibilitySampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      highStakesRule: contract.highStakesRule,
      noIrreversibleBeforeLockRule: contract.noIrreversibleBeforeLockRule,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
