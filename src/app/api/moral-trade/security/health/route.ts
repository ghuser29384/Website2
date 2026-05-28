import { NextResponse } from "next/server";

import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeSecurityProfile();
  const validation = validateMoralTradeSecurityProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      controls: profile.controls.map((control) => ({
        key: control.key,
        status: control.status,
      })),
      scaleGates: profile.scaleGates.map((gate) => ({
        key: gate.key,
        requires: gate.requires,
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
