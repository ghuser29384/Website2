import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { getMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeProtocolProfile();
  const contract = getMoralTradeProvenanceContract();
  const validation = validateMoralTradeProvenanceContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    schemaVersion: contract.schemaVersion,
    profileVersion: profile.version,
    purpose: contract.purpose,
    validation,
    publicContract: contract,
    objectSchemas: contract.objectSchemas,
    persistenceTables: contract.persistenceTables,
    validationRules: contract.validationRules.map((rule) => rule.rule),
    validationRuleCodes: contract.validationRules.map((rule) => rule.key),
    sampleBundleSummary: contract.sampleBundleSummary,
    blockers: validation.blockers,
  });
}
