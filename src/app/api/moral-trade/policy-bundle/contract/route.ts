import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePolicyBundleContract,
  validateMoralTradePolicyBundleContract,
} from "@/lib/moral-trade/policy-bundle";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralTradePolicyBundleContract();
  const validation = validateMoralTradePolicyBundleContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      strictInputBundle: contract.strictInputBundle,
      policyCodes: contract.policyRegistry.map((entry) => entry.key),
      prohibitedPatternCodes: contract.prohibitedPatternRegistry.map((entry) => entry.code),
      factorCodeCount: contract.factorCodeDictionary.length,
      verificationMethodKeys: contract.verificationMethodTaxonomy.map((entry) => entry.key),
      redactionKeys: contract.redactionPolicy.map((entry) => entry.key),
      verificationLoop: contract.verificationLoop.map((entry) => entry.key),
      antiThreatRules: contract.antiThreatRules,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
