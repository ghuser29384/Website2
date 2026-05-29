import assert from "node:assert/strict";
import test from "node:test";

import {
  MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS,
  auditMoralTradePerformanceSnapshot,
  auditMoralTradeRouteRecoveryManifest,
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
  type MoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";

test("performance profile publishes route resilience, Web Vitals, latency, and non-claim controls", () => {
  const profile = getMoralTradePerformanceProfile();
  const validation = validateMoralTradePerformanceProfile(profile);

  assert.equal(validation.status, "pass");
  assert.ok(profile.metricTargets.some((metric) => metric.key === "route_error_rate"));
  assert.ok(profile.metricTargets.some((metric) => metric.key === "api_latency_p95_ms"));
  assert.ok(profile.metricTargets.some((metric) => metric.key === "web_vitals_lcp_p75_ms"));
  assert.ok(profile.metricTargets.some((metric) => metric.key === "web_vitals_inp_p75_ms"));
  assert.ok(profile.metricTargets.some((metric) => metric.key === "web_vitals_cls_p75"));
  assert.ok(profile.instrumentationControls.some((control) => control.key === "route_error_boundary"));
  assert.ok(profile.routeFamilies.some((family) => family.key === "reasoning_and_review"));
  assert.ok(profile.releaseGates.some((gate) => gate.key === "instrument_before_optimize"));
  assert.ok(profile.publicNonClaims.some((entry) => /Core Web Vitals/i.test(entry)));
  assert.ok(profile.performanceTests.includes("performance_snapshot_audit"));
  assert.ok(profile.performanceTests.includes("route_recovery_manifest_audit"));
  assert.ok(validation.checks.some((check) => check.id === "route-recovery-manifest"));
});

test("route recovery manifest covers Reasoning Center and public route families", () => {
  const audit = auditMoralTradeRouteRecoveryManifest();
  const reasoningEntry = audit.entries.find((entry) => entry.path === "/reasoning-center");

  assert.equal(audit.status, "pass");
  assert.equal(audit.coveredRouteCount, audit.routeCount);
  assert.equal(audit.coverageRatio, 1);
  assert.equal(reasoningEntry?.stateMutationOnFallback, false);
  assert.ok(reasoningEntry?.recoverySurfaces.includes("route_specific_viewer_fallback"));
  assert.ok(reasoningEntry?.recoverySurfaces.includes("packet_json_fallback"));
});

test("route recovery manifest fails missing routes, thin fallbacks, or mutating recovery", () => {
  const profile = getMoralTradePerformanceProfile();
  const audit = auditMoralTradeRouteRecoveryManifest({
    profile,
    manifest: [
      {
        routeFamilyKey: "core_protocol_contract",
        path: "/moral-trade/technical-spec",
        serverRenderable: true,
        recoverySurfaces: ["global_error_boundary"],
        stateMutationOnFallback: false,
      },
      {
        routeFamilyKey: "reasoning_and_review",
        path: "/reasoning-center",
        serverRenderable: true,
        recoverySurfaces: ["global_error_boundary", "safe_navigation"],
        stateMutationOnFallback: true,
      },
    ],
  });

  assert.equal(audit.status, "fail");
  assert.ok(audit.blockers.includes("route_recovery_surface_too_thin:/moral-trade/technical-spec"));
  assert.ok(audit.blockers.includes("route_recovery_mutates_state:/reasoning-center"));
  assert.ok(audit.blockers.includes("route_recovery_missing:/api/moral-trade/health"));
});

test("performance validation fails when measurement or privacy controls are missing", () => {
  const profile = getMoralTradePerformanceProfile();
  const weakenedProfile: MoralTradePerformanceProfile = {
    ...profile,
    metricTargets: profile.metricTargets.filter((metric) => metric.key !== "web_vitals_cls_p75"),
    instrumentationControls: profile.instrumentationControls.filter(
      (control) => control.key !== "web_vitals_capture",
    ),
    publicNonClaims: profile.publicNonClaims.filter((entry) => !/raw private wishes/i.test(entry)),
  };
  const validation = validateMoralTradePerformanceProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("metric-targets")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("instrumentation-controls")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-safe-telemetry")));
});

test("performance snapshot audit passes measured periods inside thresholds", () => {
  const audit = auditMoralTradePerformanceSnapshot({
    snapshot: {
      period: "2026-05",
      sampleCount: 120,
      routeErrorRate: 0.004,
      apiLatencyP95Ms: 420,
      lcpP75Ms: 1800,
      inpP75Ms: 120,
      clsP75: 0.04,
      specificLoadingRecoveryRatio: 0.95,
      buildRouteManifestCoverage: true,
    },
  });

  assert.equal(audit.status, "pass");
  assert.deepEqual(audit.blockers, []);
  assert.ok(audit.checks.every((check) => check.status === "pass"));
  assert.equal(MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS.maxLcpP75Ms, 2500);
});

test("performance snapshot audit fails when measured period breaches route or vitals targets", () => {
  const audit = auditMoralTradePerformanceSnapshot({
    snapshot: {
      period: "2026-05",
      sampleCount: 100,
      routeErrorRate: 0.04,
      apiLatencyP95Ms: 1200,
      lcpP75Ms: 3200,
      inpP75Ms: 260,
      clsP75: 0.2,
      specificLoadingRecoveryRatio: 0.5,
      buildRouteManifestCoverage: false,
    },
  });

  assert.equal(audit.status, "fail");
  assert.ok(audit.blockers.includes("route-error-rate"));
  assert.ok(audit.blockers.includes("api-latency-p95"));
  assert.ok(audit.blockers.includes("web-vitals-lcp"));
  assert.ok(audit.blockers.includes("loading-recovery-coverage"));
  assert.ok(audit.blockers.includes("build-route-manifest"));
});

test("performance snapshot audit reports insufficient data before making readiness claims", () => {
  const audit = auditMoralTradePerformanceSnapshot({
    snapshot: {
      period: "2026-05",
      sampleCount: 3,
      routeErrorRate: null,
      apiLatencyP95Ms: null,
      lcpP75Ms: null,
      inpP75Ms: null,
      clsP75: null,
      specificLoadingRecoveryRatio: null,
      buildRouteManifestCoverage: true,
    },
  });

  assert.equal(audit.status, "insufficient_data");
  assert.ok(audit.blockers.includes("sample-count"));
  assert.ok(audit.blockers.includes("route-error-rate"));
  assert.ok(audit.blockers.includes("web-vitals-cls"));
});
