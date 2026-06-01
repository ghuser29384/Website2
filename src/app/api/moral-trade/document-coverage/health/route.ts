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
  const canonicalInstruction = {
    path: profile.canonicalInstruction.path,
    requiredPhraseCount: profile.canonicalInstruction.requiredPhrases.length,
    verificationCommands: profile.canonicalInstruction.verificationCommands,
    routeEvidence: profile.canonicalInstruction.routeEvidence,
    artifactHash: validation.canonicalInstructionHash,
  };

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    sourceDocumentArtifacts: validation.sourceDocumentArtifacts,
    sourceStackReferences: profile.sourceStackReferences.map((source) => ({
      key: source.key,
      priority: source.priority,
      source: source.source,
      guidance: source.guidance,
      evidenceFiles: source.evidenceFiles,
      routeEvidence: source.routeEvidence,
    })),
    testingPlanCoverage: profile.testingPlanCoverage.map((layer) => ({
      key: layer.key,
      label: layer.label,
      passCondition: layer.passCondition,
      evidenceFiles: layer.evidenceFiles,
      testFiles: layer.testFiles,
      routeEvidence: layer.routeEvidence,
    })),
    canonicalInstruction,
    publicContract: {
      sourceDocuments: profile.sourceDocuments.map((source) => ({
        artifactHash:
          validation.sourceDocumentArtifacts.find((artifact) => artifact.key === source.key)
            ?.artifactHash ?? null,
        expectedHash: source.expectedSha256,
        key: source.key,
        label: source.label,
        path: source.path,
        required: source.required,
        requiredPhraseCount: source.requiredPhrases.length,
      })),
      canonicalInstruction,
      sourceStackReferences: profile.sourceStackReferences.map((source) => ({
        key: source.key,
        priority: source.priority,
        source: source.source,
        guidance: source.guidance,
        evidenceFiles: source.evidenceFiles,
        routeEvidence: source.routeEvidence,
      })),
      testingPlanCoverage: profile.testingPlanCoverage.map((layer) => ({
        key: layer.key,
        label: layer.label,
        passCondition: layer.passCondition,
        evidenceFiles: layer.evidenceFiles,
        testFiles: layer.testFiles,
        routeEvidence: layer.routeEvidence,
      })),
      requirements: profile.requirements.map((requirement) => ({
        key: requirement.key,
        label: requirement.label,
        recommendation: requirement.recommendation,
        sourceDocumentKeys: requirement.sourceDocumentKeys,
        evidenceFiles: requirement.evidenceFiles,
        requiredEvidencePhrases: requirement.requiredEvidencePhrases,
        testFiles: requirement.testFiles,
        routeEvidence: requirement.routeEvidence,
      })),
      nonClaims: profile.nonClaims,
    },
    blockers: validation.blockers,
  });
}
