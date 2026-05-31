import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeSecurityProfile();
  const validation = validateMoralTradeSecurityProfile(profile);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      controls: profile.controls.map((control) => ({
        key: control.key,
        label: control.label,
        status: control.status,
        publicClaim: control.publicClaim,
        evidence: control.evidence,
      })),
      scaleGates: profile.scaleGates.map((gate) => ({
        key: gate.key,
        label: gate.label,
        requires: gate.requires,
        rule: gate.rule,
        readiness: auditMoralTradeSecurityScaleReadiness({
          gateKey: gate.key,
          profile,
        }),
      })),
      publicNonClaims: profile.publicNonClaims,
      securityTests: profile.securityTests,
    },
    blockers: validation.blockers,
  });
}
