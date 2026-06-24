import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  evaluateParticipantUiContract,
  getMoralTradeParticipantUiContract,
  validateMoralTradeParticipantUiContract,
} from "@/lib/moral-trade/participant-ui";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no participant-ui payload until the window resets.",
    );
  }

  const contract = getMoralTradeParticipantUiContract();
  const validation = validateMoralTradeParticipantUiContract(contract);
  const evaluation = evaluateParticipantUiContract(contract.sampleScreens);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass" && evaluation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      firstClassRecordTables: contract.firstClassRecordTables,
      requiredSurfaces: contract.requiredSurfaces,
      requiredRenderSnapshotSurfaces: contract.requiredRenderSnapshotSurfaces,
      requiredRelianceDisclosures: contract.requiredRelianceDisclosures,
      requiredReceiptDisclosures: contract.requiredReceiptDisclosures,
      maxKeyFactsPerScreen: contract.maxKeyFactsPerScreen,
      bannedPrimaryCopyTerms: contract.bannedPrimaryCopyTerms,
      sampleScreens: contract.sampleScreens.map((screen) => ({
        surface: screen.surface,
        routePath: screen.routePath,
        oneSentenceSummary: screen.oneSentenceSummary,
        keyFacts: screen.keyFacts,
        primaryAction: screen.primaryAction,
        secondaryActions: screen.secondaryActions,
        optionalDetailsDrawer: screen.optionalDetailsDrawer,
        materialDisclosures: screen.materialDisclosures,
        hasRenderSnapshot: Boolean(screen.renderSnapshot),
        renderSnapshotHash: screen.renderSnapshot?.snapshotHash ?? null,
        publicReceiptPolicy: screen.publicReceiptPolicy ?? null,
      })),
      evaluation,
      contractTests: contract.contractTests,
    },
    blockers: [...validation.blockers, ...evaluation.blockers],
  });
}
