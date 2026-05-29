import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS,
  auditMoralTradeRouteRecoveryManifest,
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradePerformanceProfile();
  const validation = validateMoralTradePerformanceProfile(profile);
  const routeRecoveryAudit = auditMoralTradeRouteRecoveryManifest({ profile });

  return buildMoralTradeApiJsonResponse({
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
      routeRecoveryAudit: {
        status: routeRecoveryAudit.status,
        routeCount: routeRecoveryAudit.routeCount,
        coveredRouteCount: routeRecoveryAudit.coveredRouteCount,
        coverageRatio: routeRecoveryAudit.coverageRatio,
        blockers: routeRecoveryAudit.blockers,
        reasoningCenterRecovery: routeRecoveryAudit.entries
          .find((entry) => entry.path === "/reasoning-center")
          ?.recoverySurfaces ?? [],
      },
      releaseGates: profile.releaseGates.map((gate) => gate.key),
      publicNonClaims: profile.publicNonClaims,
      performanceTests: profile.performanceTests,
    },
    blockers: validation.blockers,
  });
}
