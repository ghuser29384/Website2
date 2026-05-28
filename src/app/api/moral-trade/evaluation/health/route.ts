import { NextResponse } from "next/server";

import {
  MORAL_TRADE_SURFACING_PARITY_DEFAULTS,
  MORAL_TRADE_UX_READINESS_DEFAULTS,
  getMoralTradeEvaluationProfile,
  validateMoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeEvaluationProfile();
  const validation = validateMoralTradeEvaluationProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    cadence: profile.cadence,
    validation,
    publicContract: {
      metrics: profile.metrics.map((metric) => ({
        key: metric.key,
        direction: metric.direction,
        target: metric.target,
        publicReporting: metric.publicReporting,
      })),
      cohortSlices: profile.cohortSlices,
      surfacingParityAuditDefaults: MORAL_TRADE_SURFACING_PARITY_DEFAULTS,
      uxReadinessAuditDefaults: MORAL_TRADE_UX_READINESS_DEFAULTS,
      privacyBoundaries: profile.privacyBoundaries,
      promotionGates: profile.promotionGates.map((gate) => gate.stage),
      evaluationTests: profile.evaluationTests,
    },
    blockers: validation.blockers,
  });
}
