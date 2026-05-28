import performanceProfileJson from "../../../config/moral-trade/performance-profile.json";

export const MORAL_TRADE_PERFORMANCE_VALIDATOR_VERSION =
  "moral-trade-performance-validator-v0.1";

export type MoralTradePerformanceThreshold = {
  operator: "lte" | "gte" | "eq";
  value: number;
  unit: string;
};

export type MoralTradePerformanceMetricTarget = {
  key: string;
  label: string;
  source: string;
  target: string;
  threshold: MoralTradePerformanceThreshold;
  publicReporting: string;
  dataBoundary: string;
};

export type MoralTradePerformanceProfile = {
  version: string;
  purpose: string;
  measurementCadence: string;
  observedFriction: Array<{
    key: string;
    label: string;
    risk: string;
    mitigation: string;
  }>;
  metricTargets: MoralTradePerformanceMetricTarget[];
  instrumentationControls: Array<{ key: string; label: string; rule: string }>;
  routeFamilies: Array<{ key: string; paths: string[]; recoveryExpectation: string }>;
  releaseGates: Array<{ key: string; label: string; requires: string[]; rule: string }>;
  publicNonClaims: string[];
  performanceTests: string[];
};

export interface MoralTradePerformanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePerformanceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-performance-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradePerformanceCheck[];
  blockers: string[];
}

export interface MoralTradePerformanceSnapshot {
  period: string;
  sampleCount: number;
  routeErrorRate: number | null;
  apiLatencyP95Ms: number | null;
  lcpP75Ms: number | null;
  inpP75Ms: number | null;
  clsP75: number | null;
  specificLoadingRecoveryRatio: number | null;
  buildRouteManifestCoverage: boolean;
}

export interface MoralTradePerformanceSnapshotAudit {
  status: "pass" | "fail" | "insufficient_data";
  period: string;
  checks: MoralTradePerformanceCheck[];
  blockers: string[];
}

const performanceProfile = performanceProfileJson as MoralTradePerformanceProfile;

export const MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS = {
  minSampleCount: 50,
  maxRouteErrorRate: 0.01,
  maxApiLatencyP95Ms: 800,
  maxLcpP75Ms: 2500,
  maxInpP75Ms: 200,
  maxClsP75: 0.1,
  minSpecificLoadingRecoveryRatio: 0.9,
} as const;

const REQUIRED_METRICS = [
  "route_error_rate",
  "api_latency_p95_ms",
  "web_vitals_lcp_p75_ms",
  "web_vitals_inp_p75_ms",
  "web_vitals_cls_p75",
  "specific_loading_recovery_ratio",
  "build_route_manifest_coverage",
] as const;

const REQUIRED_INSTRUMENTATION = [
  "web_vitals_capture",
  "api_server_timing",
  "route_error_boundary",
  "loading_state_inventory",
  "production_route_manifest_smoke",
] as const;

const REQUIRED_ROUTE_FAMILIES = [
  "core_protocol_contract",
  "offer_marketplace",
  "background_networking",
  "reasoning_and_review",
] as const;

const REQUIRED_RELEASE_GATES = [
  "instrument_before_optimize",
  "public_route_resilience",
  "privacy_safe_telemetry",
] as const;

const REQUIRED_PUBLIC_NON_CLAIMS = [
  /Core Web Vitals/i,
  /loading states/i,
  /API latency/i,
  /raw private wishes|source notes|contact details|query strings/i,
] as const;

const REQUIRED_TESTS = [
  "performance_profile_validator",
  "performance_snapshot_audit",
  "loading_error_boundary_smoke",
  "route_manifest_coverage_smoke",
  "performance_health_route_contract_smoke",
  "technical_spec_performance_smoke",
  "privacy_safe_telemetry_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePerformanceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function finiteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getMoralTradePerformanceProfile() {
  return performanceProfile;
}

export function validateMoralTradePerformanceProfile(
  profile: MoralTradePerformanceProfile = performanceProfile,
): MoralTradePerformanceValidation {
  const metricKeys = profile.metricTargets.map((metric) => metric.key);
  const instrumentationKeys = profile.instrumentationControls.map((control) => control.key);
  const routeFamilyKeys = profile.routeFamilies.map((family) => family.key);
  const releaseGateKeys = profile.releaseGates.map((gate) => gate.key);
  const releaseGateRequirements = profile.releaseGates.flatMap((gate) => gate.requires);
  const checks = [
    check(
      "metric-targets",
      "Performance targets for route errors, API latency, Web Vitals, loading recovery, and build coverage",
      hasAll(metricKeys, REQUIRED_METRICS) &&
        profile.metricTargets.every(
          (metric) =>
            metric.source &&
            metric.target &&
            metric.publicReporting &&
            metric.dataBoundary &&
            Number.isFinite(metric.threshold.value),
        ),
      metricKeys.join(", "),
    ),
    check(
      "instrumentation-controls",
      "Instrumentation controls",
      hasAll(instrumentationKeys, REQUIRED_INSTRUMENTATION),
      instrumentationKeys.join(", "),
    ),
    check(
      "route-families",
      "Public route resilience families",
      hasAll(routeFamilyKeys, REQUIRED_ROUTE_FAMILIES) &&
        profile.routeFamilies.every((family) => family.paths.length > 0 && family.recoveryExpectation),
      routeFamilyKeys.join(", "),
    ),
    check(
      "release-gates",
      "Performance release gates reference known instrumentation",
      hasAll(releaseGateKeys, REQUIRED_RELEASE_GATES) &&
        releaseGateRequirements.every((key) => instrumentationKeys.includes(key)),
      profile.releaseGates.map((gate) => `${gate.key}->${gate.requires.join("+")}`).join(", "),
    ),
    check(
      "privacy-safe-telemetry",
      "Telemetry boundaries reject private text and unredacted query data",
      profile.metricTargets.every((metric) => /raw|query|body|private|contact|route|count|bucket/i.test(metric.dataBoundary)) &&
        profile.publicNonClaims.some((entry) => /raw private wishes/i.test(entry)) &&
        profile.publicNonClaims.some((entry) => /query strings/i.test(entry)),
      profile.metricTargets.map((metric) => `${metric.key}:${metric.dataBoundary}`).join(" | "),
    ),
    check(
      "public-nonclaims",
      "Public non-claims for unverified performance readiness",
      REQUIRED_PUBLIC_NON_CLAIMS.every((pattern) =>
        profile.publicNonClaims.some((entry) => pattern.test(entry)),
      ),
      profile.publicNonClaims.join(" | "),
    ),
    check(
      "performance-tests",
      "Performance test hooks",
      hasAll(profile.performanceTests, REQUIRED_TESTS),
      profile.performanceTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-performance-profile",
    validatorVersion: MORAL_TRADE_PERFORMANCE_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}

export function auditMoralTradePerformanceSnapshot({
  snapshot,
  defaults = MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS,
}: {
  snapshot: MoralTradePerformanceSnapshot;
  defaults?: typeof MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS;
}): MoralTradePerformanceSnapshotAudit {
  const checks = [
    check(
      "sample-count",
      "Enough route-level samples before claiming performance readiness",
      snapshot.sampleCount >= defaults.minSampleCount,
      `${snapshot.sampleCount} sample(s), minimum ${defaults.minSampleCount}.`,
    ),
    check(
      "route-error-rate",
      "Route error rate is within target",
      finiteNumber(snapshot.routeErrorRate) && snapshot.routeErrorRate <= defaults.maxRouteErrorRate,
      `routeErrorRate=${snapshot.routeErrorRate ?? "missing"}, max=${defaults.maxRouteErrorRate}.`,
    ),
    check(
      "api-latency-p95",
      "Core API p95 latency is within target",
      finiteNumber(snapshot.apiLatencyP95Ms) && snapshot.apiLatencyP95Ms <= defaults.maxApiLatencyP95Ms,
      `apiLatencyP95Ms=${snapshot.apiLatencyP95Ms ?? "missing"}, max=${defaults.maxApiLatencyP95Ms}.`,
    ),
    check(
      "web-vitals-lcp",
      "LCP p75 is within target",
      finiteNumber(snapshot.lcpP75Ms) && snapshot.lcpP75Ms <= defaults.maxLcpP75Ms,
      `lcpP75Ms=${snapshot.lcpP75Ms ?? "missing"}, max=${defaults.maxLcpP75Ms}.`,
    ),
    check(
      "web-vitals-inp",
      "INP p75 is within target",
      finiteNumber(snapshot.inpP75Ms) && snapshot.inpP75Ms <= defaults.maxInpP75Ms,
      `inpP75Ms=${snapshot.inpP75Ms ?? "missing"}, max=${defaults.maxInpP75Ms}.`,
    ),
    check(
      "web-vitals-cls",
      "CLS p75 is within target",
      finiteNumber(snapshot.clsP75) && snapshot.clsP75 <= defaults.maxClsP75,
      `clsP75=${snapshot.clsP75 ?? "missing"}, max=${defaults.maxClsP75}.`,
    ),
    check(
      "loading-recovery-coverage",
      "Specific loading or recovery coverage is within target",
      finiteNumber(snapshot.specificLoadingRecoveryRatio) &&
        snapshot.specificLoadingRecoveryRatio >= defaults.minSpecificLoadingRecoveryRatio,
      `specificLoadingRecoveryRatio=${snapshot.specificLoadingRecoveryRatio ?? "missing"}, min=${defaults.minSpecificLoadingRecoveryRatio}.`,
    ),
    check(
      "build-route-manifest",
      "Production build manifest includes public Moral Trade routes",
      snapshot.buildRouteManifestCoverage,
      `buildRouteManifestCoverage=${snapshot.buildRouteManifestCoverage}.`,
    ),
  ];
  const failedChecks = checks.filter((entry) => entry.status === "fail");
  const missingMeasurement = [
    snapshot.routeErrorRate,
    snapshot.apiLatencyP95Ms,
    snapshot.lcpP75Ms,
    snapshot.inpP75Ms,
    snapshot.clsP75,
    snapshot.specificLoadingRecoveryRatio,
  ].some((value) => !finiteNumber(value));
  const blockers = failedChecks.map((entry) => entry.id);

  return {
    status:
      snapshot.sampleCount < defaults.minSampleCount || missingMeasurement
        ? "insufficient_data"
        : failedChecks.length
          ? "fail"
          : "pass",
    period: snapshot.period,
    checks,
    blockers,
  };
}
