import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePublicPageSimplificationContract,
  validateMoralTradePublicPageSimplificationContract,
} from "@/lib/moral-trade/public-page-simplification";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no public-page-simplification payload until the window resets.",
    );
  }

  const contract = getMoralTradePublicPageSimplificationContract();
  const validation = validateMoralTradePublicPageSimplificationContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      firstClassRecordTables: contract.firstClassRecordTables,
      requiredRouteKeys: contract.requiredRouteKeys,
      requiredQaContexts: contract.requiredQaContexts,
      approvedStatusLabels: contract.approvedStatusLabels,
      bannedPrimaryCopyPatterns: contract.bannedPrimaryCopyPatterns,
      fallbackCopy: contract.fallbackCopy,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      routeAuditRecords: contract.routeAuditRecords.map((record) => ({
        routeKey: record.routeKey,
        routePath: record.routePath,
        sourcePath: record.sourcePath,
        oneSentenceHero: record.oneSentenceHero,
        primaryCta: record.primaryCta,
        secondaryCta: record.secondaryCta,
        statusStrip: record.statusStrip,
        qaContextCount: record.qaContexts.length,
        evidenceArtifactCount: record.evidenceArtifactRefs.length,
        userFacingNextAction: record.userFacingNextAction,
        correctionPath: record.correctionPath,
        detailsDrawerLabel: record.detailsDrawerLabel,
        advancedDetailsCollapsedByDefault: record.advancedDetailsCollapsedByDefault,
        noCompetingPrimaryCtas: record.noCompetingPrimaryCtas,
      })),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
