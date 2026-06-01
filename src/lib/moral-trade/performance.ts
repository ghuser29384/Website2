import { existsSync } from "node:fs";
import path from "node:path";

import performanceProfileJson from "../../../config/moral-trade/performance-profile.json";

export const MORAL_TRADE_PERFORMANCE_VALIDATOR_VERSION =
  "moral-trade-performance-validator-v0.4";

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

export interface MoralTradeRouteRecoveryManifestEntry {
  routeFamilyKey: string;
  path: string;
  serverRenderable: boolean;
  recoverySurfaces: string[];
  stateMutationOnFallback: boolean;
  evidenceFile?: string;
}

export interface MoralTradeRouteRecoveryManifestAudit {
  status: "pass" | "fail";
  routeCount: number;
  coveredRouteCount: number;
  coverageRatio: number;
  entries: MoralTradeRouteRecoveryManifestEntry[];
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
  "route_recovery_manifest_audit",
  "loading_error_boundary_smoke",
  "route_manifest_coverage_smoke",
  "performance_health_route_contract_smoke",
  "technical_spec_performance_smoke",
  "privacy_safe_telemetry_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function routeRecoveryEvidenceExists(evidenceFile: string) {
  return existsSync(path.resolve(process.cwd(), evidenceFile));
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

function roundRatio(value: number) {
  return Number(value.toFixed(4));
}

const SAMPLE_ROUTE_RECOVERY_MANIFEST = [
  {
    routeFamilyKey: "core_protocol_contract",
    path: "/moral-trade/technical-spec",
    serverRenderable: true,
    recoverySurfaces: ["global_error_boundary", "safe_navigation", "contract_links"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "core_protocol_contract",
    path: "/api/moral-trade/health",
    serverRenderable: true,
    recoverySurfaces: ["validator_blockers", "no_store_dynamic"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "core_protocol_contract",
    path: "/api/moral-trade/api-contract",
    serverRenderable: true,
    recoverySurfaces: ["validator_blockers", "no_store_dynamic"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "offer_marketplace",
    path: "/offers",
    serverRenderable: true,
    recoverySurfaces: ["global_error_boundary", "worked_examples", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "offer_marketplace",
    path: "/offers/new",
    serverRenderable: true,
    recoverySurfaces: ["global_error_boundary", "client_validation_preview", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "offer_marketplace",
    path: "/offers/examples/[exampleId]",
    serverRenderable: true,
    recoverySurfaces: ["static_worked_examples", "global_error_boundary", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "background_networking",
    path: "/background-networking",
    serverRenderable: true,
    recoverySurfaces: ["global_error_boundary", "broad_privacy_preview", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "background_networking",
    path: "/wish-registry",
    serverRenderable: true,
    recoverySurfaces: ["global_error_boundary", "example_previews", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "background_networking",
    path: "/api/wish-registry/search",
    serverRenderable: true,
    recoverySurfaces: ["sparse_result_suppression", "broad_previews", "rate_limit_surface"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "reasoning_and_review",
    path: "/reasoning-center",
    serverRenderable: true,
    recoverySurfaces: [
      "route_segment_error_boundary",
      "route_specific_viewer_fallback",
      "packet_generation_recovery_notice",
      "global_error_boundary",
      "packet_json_fallback",
      "safe_navigation",
    ],
    stateMutationOnFallback: false,
    evidenceFile: "src/app/reasoning-center/error.tsx",
  },
  {
    routeFamilyKey: "reasoning_and_review",
    path: "/api/moral-trade/reasoning/packets",
    serverRenderable: true,
    recoverySurfaces: ["validator_blockers", "packet_generation_failed_contract", "no_store_dynamic"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "reasoning_and_review",
    path: "/validation",
    serverRenderable: true,
    recoverySurfaces: ["static_review_rulebook", "global_error_boundary", "safe_navigation"],
    stateMutationOnFallback: false,
  },
  {
    routeFamilyKey: "reasoning_and_review",
    path: "/trust",
    serverRenderable: true,
    recoverySurfaces: ["static_trust_contract", "global_error_boundary", "safe_navigation"],
    stateMutationOnFallback: false,
  },
] as const satisfies readonly MoralTradeRouteRecoveryManifestEntry[];

export function getMoralTradePerformanceProfile() {
  return performanceProfile;
}

export function auditMoralTradeRouteRecoveryManifest({
  manifest = SAMPLE_ROUTE_RECOVERY_MANIFEST,
  profile = performanceProfile,
}: {
  manifest?: readonly MoralTradeRouteRecoveryManifestEntry[];
  profile?: MoralTradePerformanceProfile;
} = {}): MoralTradeRouteRecoveryManifestAudit {
  const expectedRoutes = profile.routeFamilies.flatMap((family) =>
    family.paths.map((path) => ({ path, routeFamilyKey: family.key })),
  );
  const manifestByPath = new Map(manifest.map((entry) => [entry.path, entry]));
  const blockers: string[] = [];
  let coveredRouteCount = 0;

  for (const expectedRoute of expectedRoutes) {
    const entry = manifestByPath.get(expectedRoute.path);

    if (!entry) {
      blockers.push(`route_recovery_missing:${expectedRoute.path}`);
      continue;
    }

    if (entry.routeFamilyKey !== expectedRoute.routeFamilyKey) {
      blockers.push(`route_recovery_family_mismatch:${entry.path}`);
    }

    if (!entry.serverRenderable && !entry.recoverySurfaces.includes("validator_blockers")) {
      blockers.push(`route_recovery_not_server_renderable:${entry.path}`);
    }

    if (entry.recoverySurfaces.length < 2) {
      blockers.push(`route_recovery_surface_too_thin:${entry.path}`);
    }

    if (entry.stateMutationOnFallback) {
      blockers.push(`route_recovery_mutates_state:${entry.path}`);
    }

    const evidenceFilePresent =
      !entry.evidenceFile || routeRecoveryEvidenceExists(entry.evidenceFile);

    if (!evidenceFilePresent) {
      blockers.push(`route_recovery_evidence_missing:${entry.path}:${entry.evidenceFile}`);
    }

    if (
      entry.routeFamilyKey === expectedRoute.routeFamilyKey &&
      (entry.serverRenderable || entry.recoverySurfaces.includes("validator_blockers")) &&
      entry.recoverySurfaces.length >= 2 &&
      !entry.stateMutationOnFallback &&
      evidenceFilePresent
    ) {
      coveredRouteCount += 1;
    }
  }

  const coverageRatio = expectedRoutes.length
    ? roundRatio(coveredRouteCount / expectedRoutes.length)
    : 0;

  return {
    status: blockers.length ? "fail" : "pass",
    routeCount: expectedRoutes.length,
    coveredRouteCount,
    coverageRatio,
    entries: [...manifest],
    blockers,
  };
}

export function validateMoralTradePerformanceProfile(
  profile: MoralTradePerformanceProfile = performanceProfile,
): MoralTradePerformanceValidation {
  const metricKeys = profile.metricTargets.map((metric) => metric.key);
  const instrumentationKeys = profile.instrumentationControls.map((control) => control.key);
  const routeFamilyKeys = profile.routeFamilies.map((family) => family.key);
  const releaseGateKeys = profile.releaseGates.map((gate) => gate.key);
  const releaseGateRequirements = profile.releaseGates.flatMap((gate) => gate.requires);
  const routeRecoveryAudit = auditMoralTradeRouteRecoveryManifest({ profile });
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
      "route-recovery-manifest",
      "Route recovery manifest covers public Moral Trade route families",
      routeRecoveryAudit.status === "pass" &&
        routeRecoveryAudit.coverageRatio >= MORAL_TRADE_PERFORMANCE_AUDIT_DEFAULTS.minSpecificLoadingRecoveryRatio,
      `${routeRecoveryAudit.coveredRouteCount}/${routeRecoveryAudit.routeCount} route(s), blockers ${routeRecoveryAudit.blockers.length}.`,
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
