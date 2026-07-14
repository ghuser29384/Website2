import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePaymentEventContract,
  validateMoralTradePaymentEventContract,
} from "@/lib/moral-trade/payment-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no payment-event replay-safety payload until the window resets.",
    );
  }

  const contract = getMoralTradePaymentEventContract();
  const validation = validateMoralTradePaymentEventContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      idempotencyRule: contract.idempotencyRule,
      lockedSnapshotRule: contract.lockedSnapshotRule,
      manualReviewRule: contract.manualReviewRule,
      nonEscrowClaim: contract.nonEscrowClaim,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      providerAuthenticationRule: contract.providerAuthenticationRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample, index) => [
          `sample_${index + 1}_${sample.transition}`,
          {
            applicableEventCount: sample.applicableEventCount,
            ignoredDuplicateCount: sample.ignoredDuplicateCount,
            stateMutationAllowed: sample.stateMutationAllowed,
            status: sample.status,
          },
        ]),
      ),
      storageBeforeApplyRule: contract.storageBeforeApplyRule,
      terminalAgreementStates: contract.terminalAgreementStates,
      transactionRule: contract.transactionRule,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
