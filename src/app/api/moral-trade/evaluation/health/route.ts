import { NextResponse } from "next/server";

import {
  MORAL_TRADE_SURFACING_PARITY_DEFAULTS,
  MORAL_TRADE_UX_READINESS_DEFAULTS,
  getMoralTradeEvaluationSampleAudits,
  getMoralTradeEvaluationProfile,
  validateMoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeEvaluationProfile();
  const validation = validateMoralTradeEvaluationProfile(profile);
  const sampleAudits = getMoralTradeEvaluationSampleAudits();

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
      sampleAudits: {
        surfacingParity: {
          status: sampleAudits.surfacingParityAudit.status,
          eligibleCount: sampleAudits.surfacingParityAudit.eligibleCount,
          surfacedCount: sampleAudits.surfacingParityAudit.surfacedCount,
          overallSurfacingRate: sampleAudits.surfacingParityAudit.overallSurfacingRate,
          reviewedDeviationCount: sampleAudits.surfacingParityAudit.reviewedDeviationCount,
          unreviewedDeviationCount: sampleAudits.surfacingParityAudit.unreviewedDeviationCount,
          deviationReviews: sampleAudits.surfacingParityAudit.deviationReviews.map((review) => ({
            cellKey: review.cellKey,
            reviewerRole: review.reviewerRole,
            reviewedAt: review.reviewedAt,
            outcome: review.outcome,
            reasonCode: review.reasonCode,
          })),
          blockers: sampleAudits.surfacingParityAudit.blockers,
        },
        uxReadiness: {
          status: sampleAudits.uxReadinessAudit.status,
          currentPeriod: sampleAudits.uxReadinessAudit.currentPeriod,
          previousPeriod: sampleAudits.uxReadinessAudit.previousPeriod,
          blockers: sampleAudits.uxReadinessAudit.blockers,
        },
      },
      privacyBoundaries: profile.privacyBoundaries,
      promotionGates: profile.promotionGates.map((gate) => gate.stage),
      evaluationTests: profile.evaluationTests,
    },
    blockers: validation.blockers,
  });
}
