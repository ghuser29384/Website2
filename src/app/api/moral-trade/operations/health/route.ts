import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_RESILIENCE_FALLBACK_TESTS,
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeOperationsProfile();
  const validation = validateMoralTradeOperationsProfile(profile);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      securityHeaders: profile.securityHeaders.map((header) => header.code),
      rateLimitSurfaces: profile.rateLimitSurfaces.map((surface) => surface.key),
      privacyAndSessionControls: profile.privacyAndSessionControls.map((control) => control.key),
      observabilityMetrics: profile.observabilityMetrics,
      fallbackControls: profile.fallbackControls.map((control) => control.key),
      resilienceFallbackTests: MORAL_TRADE_RESILIENCE_FALLBACK_TESTS,
      rolloutGates: profile.rolloutGates.map((gate) => gate.key),
      operationalTests: profile.operationalTests,
    },
    blockers: validation.blockers,
  });
}
