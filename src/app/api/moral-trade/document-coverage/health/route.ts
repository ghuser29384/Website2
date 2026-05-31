import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeDocumentCoverageProfile,
  validateMoralTradeDocumentCoverageProfile,
} from "@/lib/moral-trade/document-coverage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited document coverage reads return no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeDocumentCoverageProfile();
  const validation = validateMoralTradeDocumentCoverageProfile(profile);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      sourceDocuments: profile.sourceDocuments.map((source) => ({
        key: source.key,
        label: source.label,
        path: source.path,
        required: source.required,
        requiredPhraseCount: source.requiredPhrases.length,
      })),
      requirements: profile.requirements.map((requirement) => ({
        key: requirement.key,
        label: requirement.label,
        recommendation: requirement.recommendation,
        sourceDocumentKeys: requirement.sourceDocumentKeys,
        evidenceFiles: requirement.evidenceFiles,
        testFiles: requirement.testFiles,
        routeEvidence: requirement.routeEvidence,
      })),
      nonClaims: profile.nonClaims,
    },
    blockers: validation.blockers,
  });
}
