import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getBackgroundRlsAuditContract,
  validateBackgroundRlsAuditContract,
} from "@/lib/background-rls-audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited background RLS audit contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getBackgroundRlsAuditContract();
  const validation = validateBackgroundRlsAuditContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      invariants: contract.invariants,
      tableRequirements: contract.tableRequirements.map((requirement) => ({
        table: requirement.table,
        category: requirement.category,
        minimumPolicyCount: requirement.minimumPolicyCount,
        requiredPolicies: requirement.requiredPolicies,
        requiredFragments: requirement.requiredFragments,
        disallowAnonPolicies: requirement.disallowAnonPolicies,
        rationale: requirement.rationale,
      })),
      sensitiveStorageRequirements: contract.sensitiveStorageRequirements,
      schemaAuditMode: "repository_test",
      schemaAuditTest: "background_rls_audit_schema_smoke",
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
