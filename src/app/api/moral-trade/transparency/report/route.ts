import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeTransparencyReportContract,
  loadMoralTradeTransparencyReportSnapshot,
  validateMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportSnapshot,
} from "@/lib/moral-trade/transparency-report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited transparency report read returns no aggregate payload until the window resets.",
    );
  }

  const contract = getMoralTradeTransparencyReportContract();
  const contractValidation = validateMoralTradeTransparencyReportContract(contract);
  const report = await loadMoralTradeTransparencyReportSnapshot();
  const reportValidation = validateMoralTradeTransparencyReportSnapshot(report);
  const blockers = [...contractValidation.blockers, ...reportValidation.blockers];

  return buildMoralTradeApiJsonResponse({
    ok: blockers.length === 0,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation: {
      contract: contractValidation,
      report: reportValidation,
    },
    publicContract: {
      publicationCadence: contract.publicationCadence,
      minimumPublicCount: contract.minimumPublicCount,
      metricDefinitions: contract.metricDefinitions,
      privacyRules: contract.privacyRules,
      contractTests: contract.contractTests,
    },
    report,
    blockers,
  });
}
