import { NextResponse } from "next/server";

import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getMoralTradeDisclosureContract();
  const validation = validateMoralTradeDisclosureContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      accessLevels: contract.accessLevels,
      audienceStages: contract.audienceStages,
      grantStatuses: contract.grantStatuses,
      disclosureFields: contract.disclosureFields,
      redactedFields: contract.redactedFields,
      approvedFactorCodes: contract.approvedFactorCodes,
      invariants: contract.invariants,
      sampleDecision: contract.sampleDecision,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
