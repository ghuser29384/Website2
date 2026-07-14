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
      stableTermMap: contract.stableTermMap,
      safeTemplateDefaultFacts: contract.safeTemplateDefaultFacts,
      requiredLockSafeTemplateDefaultFacts: contract.requiredLockSafeTemplateDefaultFacts,
      requiredReceiptSafeTemplateDefaultFacts: contract.requiredReceiptSafeTemplateDefaultFacts,
      requiredReceiptPreviewQuestions: contract.requiredReceiptPreviewQuestions,
      maxKeyFactsPerScreen: contract.maxKeyFactsPerScreen,
      bannedPrimaryCopyTerms: contract.bannedPrimaryCopyTerms,
      sampleScreens: contract.sampleScreens.map((screen) => ({
        surface: screen.surface,
        routePath: screen.routePath,
        plainLanguageCopyPolicyRef: screen.plainLanguageCopyPolicyRef,
        taskCardStatusLabel: screen.taskCardStatusLabel,
        oneSentenceSummary: screen.oneSentenceSummary,
        keyFacts: screen.keyFacts,
        nextAction: screen.nextAction,
        primaryAction: screen.primaryAction,
        secondaryActions: screen.secondaryActions,
        optionalDetailsDrawer: screen.optionalDetailsDrawer,
        stableTermKeys: screen.stableTermKeys,
        materialDisclosures: screen.materialDisclosures,
        safeTemplateDefaultDisclosure: screen.safeTemplateDefaultDisclosure,
        safeTemplateDefaultFactsShown: screen.safeTemplateDefaultFactsShown,
        publicReceiptPreviewQuestionsAnswered: screen.publicReceiptPreviewQuestionsAnswered ?? [],
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
