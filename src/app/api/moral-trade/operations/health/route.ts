import { NextResponse } from "next/server";

import {
  MORAL_TRADE_RESILIENCE_FALLBACK_TESTS,
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeOperationsProfile();
  const validation = validateMoralTradeOperationsProfile(profile);

  return NextResponse.json({
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
