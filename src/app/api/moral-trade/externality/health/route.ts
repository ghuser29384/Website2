import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeExternalityProfile();
  const validation = validateMoralTradeExternalityProfile(profile);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      dueDiligenceSteps: profile.dueDiligenceSteps.map((step) => step.key),
      triggerCodes: profile.triggerCodes.map((trigger) => trigger.key),
      reviewStandards: profile.reviewStandards.map((standard) => standard.key),
      triggerStandardMatrix: profile.triggerStandardMatrix.map((entry) => ({
        triggerCode: entry.triggerCode,
        requiredStandards: entry.requiredStandards,
        evidenceExpectations: entry.evidenceExpectations,
      })),
      remedyControls: profile.remedyControls.map((control) => control.key),
      allowedOutcomes: profile.allowedOutcomes,
      externalityTests: profile.externalityTests,
    },
    blockers: validation.blockers,
  });
}
