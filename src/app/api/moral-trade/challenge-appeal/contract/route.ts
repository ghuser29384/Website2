import { NextResponse } from "next/server";

import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getMoralTradeChallengeAppealContract();
  const validation = validateMoralTradeChallengeAppealContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      subjects: contract.subjects,
      standingCategories: contract.standingCategories,
      appealTriggers: contract.appealTriggers,
      allowedOutcomes: contract.allowedOutcomes,
      approvedFactorCodes: contract.approvedFactorCodes,
      invariants: contract.invariants,
      sampleDecision: contract.sampleDecision,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
