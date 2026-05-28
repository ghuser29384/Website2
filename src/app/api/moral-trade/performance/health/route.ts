import { NextResponse } from "next/server";

import {
  MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS,
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradePerformanceProfile();
  const validation = validateMoralTradePerformanceProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    measurementCadence: profile.measurementCadence,
    validation,
    publicContract: {
      observedFriction: profile.observedFriction.map((entry) => entry.key),
      metricTargets: profile.metricTargets.map((metric) => ({
        key: metric.key,
        target: metric.target,
        source: metric.source,
        publicReporting: metric.publicReporting,
      })),
      auditDefaults: MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS,
      instrumentationControls: profile.instrumentationControls.map((control) => control.key),
      routeFamilies: profile.routeFamilies.map((family) => ({
        key: family.key,
        paths: family.paths,
      })),
      releaseGates: profile.releaseGates.map((gate) => gate.key),
      publicNonClaims: profile.publicNonClaims,
      performanceTests: profile.performanceTests,
    },
    blockers: validation.blockers,
  });
}
