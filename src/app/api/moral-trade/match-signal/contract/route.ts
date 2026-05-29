import { NextResponse } from "next/server";

import {
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignalContract,
} from "@/lib/moral-trade/match-signal";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getMoralTradeMatchSignalContract();
  const validation = validateMoralTradeMatchSignalContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      requiredInputFields: contract.requiredInputFields,
      optionalInputFields: contract.optionalInputFields,
      approvedFactorCodes: contract.approvedFactorCodes,
      redactedFields: contract.redactedFields,
      participantExplanationTemplate: contract.participantExplanationTemplate,
      invariants: contract.invariants,
      sampleSignal: contract.sampleSignal,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
