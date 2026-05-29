import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
} from "@/lib/moral-trade/schema-registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const registry = getMoralTradeSchemaRegistry();
  const validation = validateMoralTradeSchemaRegistry(registry);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    registryVersion: registry.version,
    purpose: registry.purpose,
    validation,
    publicContract: {
      schemaDocuments: registry.schemaDocuments,
      schemaCount: registry.schemaDocuments.length,
      registryTests: registry.registryTests,
    },
    schemaDocuments: registry.schemaDocuments,
    blockers: validation.blockers,
  });
}
