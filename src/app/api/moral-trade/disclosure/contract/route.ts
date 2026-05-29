import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

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
      searchPrivacyControls: contract.searchPrivacyControls,
      approvedFactorCodes: contract.approvedFactorCodes,
      invariants: contract.invariants,
      sampleDecision: contract.sampleDecision,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
