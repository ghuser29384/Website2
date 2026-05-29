import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeAiGovernanceProfile();
  const validation = validateMoralTradeAiGovernanceProfile(profile);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    decisioningMode: profile.decisioningMode,
    mlEnabledForMatching: profile.mlEnabledForMatching,
    mlEnabledForStateChanges: profile.mlEnabledForStateChanges,
    validation,
    publicContract: {
      requiredDocumentationBeforeMl: profile.requiredDocumentationBeforeMl.map(
        (entry) => entry.key,
      ),
      documentationTemplates: profile.documentationTemplates.map((template) => ({
        key: template.key,
        requiredFields: template.requiredFields,
        publicSummaryFields: template.publicSummaryFields,
        redactedFields: template.redactedFields,
        reviewRule: template.reviewRule,
      })),
      permittedAutomation: profile.permittedAutomation.map((entry) => entry.key),
      prohibitedUses: profile.prohibitedUses.map((entry) => entry.key),
      fairnessDocumentation: profile.fairnessDocumentation,
      explanationControls: profile.explanationControls.map((entry) => entry.key),
      externalStandards: profile.externalStandards.map((entry) => entry.key),
      humanControlledDecisions: profile.humanControlledDecisions,
      governanceTests: profile.governanceTests,
    },
    blockers: validation.blockers,
  });
}
