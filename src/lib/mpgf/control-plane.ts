import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import { mpgfAdminSections } from "./data";
import {
  approveInternalPayoutAuthorization,
  createMpgfDryRunCycle,
  createMpgfGovernanceJudgment,
  generateMpgfDemoAllocationCertificate,
  preflightMpgfSolverSupport,
  recordExternalPaymentEvidence,
  runMpgfDryRunCycle,
  selectMpgfLiveSolver,
  verifyExternalPaymentEvidence,
  verifyMpgfOptimalityCertificate,
} from "./mechanism";
import { loadMpgfRealMoneyReadiness } from "./real-money";
import {
  canonicalMpgfHash,
  runMpgfProductionDirectWorkingLaunch,
  runMpgfSolverBenchmarks,
  runMpgfWwwAuthSessionVerification,
  runMpgfWwwDirectWorkingVerification,
  runMpgfWwwExactPilotDryRunVerification,
  runMpgfWwwParticipantJourneyVerification,
  runMpgfWwwPostLaunchMonitor,
  runMpgfWwwProductionHealthCheck,
  runMpgfWwwPublicExperienceVerification,
  validateCompletionProfileEvidence,
  validateMpgfAdminApprovalSet,
  validateMpgfDeploymentEnvironment,
  validateMpgfLegalReadinessArtifacts,
  validateMpgfPayoutProviderProfile,
  validateMpgfProductionDeploymentPrerequisites,
  validateMpgfProductionDeploymentTarget,
  validateMpgfRbacPermissionMatrix,
  validateMpgfSchemaContractCoverage,
  validateMpgfSolverBenchmarkFixtures,
  validateMpgfSolverSupportProfile,
  validateMpgfStateMachineCoverage,
  validateMpgfStatusValueRegistry,
  validateSolverSupportProfileAgainstBenchmarks,
} from "./validators";
import type { MpgfValidationResult } from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

interface MpgfAdminApprovalRow {
  decision: string;
  status: string;
  approverUserId: string;
  approverRole: string;
  targetVersion?: string;
  conflicted?: boolean;
}

export type MpgfProductionGateStatus = "passed" | "blocked" | "pending_review" | "failed";

export type MpgfProductionGateArea =
  | "exact_pilot"
  | "real_money"
  | "payout_compliance"
  | "solver"
  | "governance"
  | "production_verification";

export interface MpgfProductionGate {
  key: string;
  area: MpgfProductionGateArea;
  label: string;
  status: MpgfProductionGateStatus;
  summary: string;
  blockers: string[];
  evidencePaths: string[];
  acceptanceCriteria: string[];
}

export interface MpgfProductionControlPlaneSummary {
  status: MpgfProductionGateStatus;
  generatedAt: string;
  instructionArtifactPath: string;
  instructionArtifactHash: string | null;
  completionProfiles: {
    demoComplete: MpgfProductionGateStatus;
    exactPilotComplete: MpgfProductionGateStatus;
    realMoneyComplete: MpgfProductionGateStatus;
  };
  gates: MpgfProductionGate[];
}

function rootPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function readTextIfExists(filePath: string) {
  const absolutePath = rootPath(filePath);

  if (!existsSync(absolutePath)) {
    return null;
  }

  return readFileSync(absolutePath, "utf8");
}

function readJsonIfExists<T>(filePath: string): T | null {
  const text = readTextIfExists(filePath);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function validationBlockers(validation: MpgfValidationResult) {
  return validation.errors.map((error) => error.message);
}

function evidencePassed(filePath: string) {
  const text = readTextIfExists(filePath);

  if (!text) {
    return {
      passed: false,
      blocker: `Missing evidence artifact ${filePath}.`,
    };
  }

  if (!/^Status:\s*passed\b/im.test(text)) {
    return {
      passed: false,
      blocker: `${filePath} has not recorded Status: passed.`,
    };
  }

  if (/template ready|production browser run not recorded|blocked until|pending|not yet|blockers:\s*(?!none\b)/im.test(text)) {
    return {
      passed: false,
      blocker: `${filePath} still records placeholder, pending, or blocker language.`,
    };
  }

  return { passed: true, blocker: null };
}

function gate(input: MpgfProductionGate) {
  return input;
}

function combineStatuses(statuses: MpgfProductionGateStatus[]): MpgfProductionGateStatus {
  if (statuses.includes("failed")) {
    return "failed";
  }

  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("pending_review")) {
    return "pending_review";
  }

  return "passed";
}

function statusFromBlockers(blockers: string[], fallback: MpgfProductionGateStatus = "blocked") {
  return blockers.length === 0 ? "passed" : fallback;
}

function supportProfileSupportsExactPilotComplete() {
  const profile = readJsonIfExists<{ supportsExactPilotComplete?: boolean; status?: string }>(
    "config/mpgf/solver-support-profile.json",
  );

  return profile?.supportsExactPilotComplete === true;
}

function canReadProductionGateDatabase() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function loadMpgfAdminApprovalRows(input: {
  action: string;
  targetType: string;
  targetVersion?: string;
}): Promise<MpgfAdminApprovalRow[]> {
  if (!canReadProductionGateDatabase()) {
    return [];
  }

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const query = supabase
      .from("mpgf_admin_approval_records")
      .select("decision, status, approver_user_id, approver_role, target_version, conflicted")
      .eq("action", input.action)
      .eq("target_type", input.targetType)
      .eq("decision", "approve")
      .eq("status", "approved")
      .eq("conflicted", false);
    const { data, error } = input.targetVersion
      ? await query.eq("target_version", input.targetVersion)
      : await query;

    if (error) {
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      decision: String(row.decision ?? ""),
      status: String(row.status ?? ""),
      approverUserId: String(row.approver_user_id ?? ""),
      approverRole: String(row.approver_role ?? ""),
      targetVersion: typeof row.target_version === "string" ? row.target_version : undefined,
      conflicted: row.conflicted === true,
    }));
  } catch {
    return [];
  }
}

async function loadMpgfGateStatuses(gateKeys: string[]) {
  if (!canReadProductionGateDatabase()) {
    return new Map<string, string>();
  }

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const { data, error } = await supabase
      .from("mpgf_real_money_gate_status")
      .select("gate_key, status")
      .in("gate_key", gateKeys);

    if (error) {
      return new Map<string, string>();
    }

    return new Map((data ?? []).map((row: Record<string, unknown>) => [
      String(row.gate_key ?? ""),
      String(row.status ?? ""),
    ]));
  } catch {
    return new Map<string, string>();
  }
}

async function loadLatestMpgfProductionVerificationStatuses(kinds: string[]) {
  if (!canReadProductionGateDatabase()) {
    return new Map<string, string>();
  }

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const { data, error } = await supabase
      .from("mpgf_production_verification_runs")
      .select("verification_kind, status, evaluated_at")
      .in("verification_kind", kinds)
      .order("evaluated_at", { ascending: false });

    if (error) {
      return new Map<string, string>();
    }

    const latest = new Map<string, string>();
    for (const row of data ?? []) {
      const kind = String((row as Record<string, unknown>).verification_kind ?? "");
      if (!latest.has(kind)) {
        latest.set(kind, String((row as Record<string, unknown>).status ?? ""));
      }
    }

    return latest;
  } catch {
    return new Map<string, string>();
  }
}

export function evaluateMpgfSolverCertificationGate(): MpgfProductionGate {
  const supportProfile = validateMpgfSolverSupportProfile();
  const fixtureCoverage = validateMpgfSolverBenchmarkFixtures();
  const benchmarkSupport = validateSolverSupportProfileAgainstBenchmarks();
  const benchmarkRun = runMpgfSolverBenchmarks();
  const preflight = preflightMpgfSolverSupport();
  const liveSolver = selectMpgfLiveSolver();
  const certificateVerification = verifyMpgfOptimalityCertificate(
    undefined,
    generateMpgfDemoAllocationCertificate(),
  );
  const blockers = [
    ...validationBlockers(supportProfile),
    ...validationBlockers(fixtureCoverage),
    ...validationBlockers(benchmarkSupport),
    ...validationBlockers(benchmarkRun),
    supportProfileSupportsExactPilotComplete()
      ? null
      : "Active solver support profile does not support exact_pilot_complete.",
    preflight.liveOrdinaryAllocationAllowed
      ? null
      : `Solver preflight does not allow live ordinary allocation: ${preflight.reason}`,
    liveSolver.liveOrdinaryAllocationAllowed
      ? null
      : `No certified live solver selected: ${liveSolver.reason}`,
    certificateVerification.verifiedOptimal
      ? null
      : `Optimality certificate verification failed: ${certificateVerification.errors.join(", ")}`,
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "solver-certification",
    area: "solver",
    label: "Solver certification",
    status: statusFromBlockers(blockers),
    summary:
      "Exact-pilot allocation requires benchmark-supported limits, a selected certified solver, and a verified optimality certificate.",
    blockers,
    evidencePaths: [
      "config/mpgf/solver-support-profile.json",
      "docs/mpgf/solver-benchmark-report.md",
      "tests/fixtures/mpgf/solver-benchmarks",
    ],
    acceptanceCriteria: ["AC-SOLVER-010", "AC-COMPLETION-008"],
  });
}

export function evaluateMpgfExactPilotGate(): MpgfProductionGate {
  const solverGate = evaluateMpgfSolverCertificationGate();
  const dryRun = runMpgfDryRunCycle();
  const productionDryRun = runMpgfWwwExactPilotDryRunVerification();
  const phaseC = evidencePassed("docs/mpgf/phase-c-gate-report.md");
  const exactPilotEvidence = evidencePassed("docs/mpgf/www-exact-pilot-dry-run-verification.md");
  const completionEvidence = validateCompletionProfileEvidence("exact_pilot_complete");
  const blockers = [
    ...solverGate.blockers.map((blocker) => `Solver gate: ${blocker}`),
    dryRun.passed ? null : "Local exact-pilot dry-run did not pass.",
    ...validationBlockers(productionDryRun),
    phaseC.blocker,
    exactPilotEvidence.blocker,
    ...validationBlockers(completionEvidence),
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "exact-pilot-completion",
    area: "exact_pilot",
    label: "Exact-pilot completion",
    status: statusFromBlockers(blockers),
    summary:
      "exact_pilot_complete requires the certified solver gate plus a final production-equivalent dry-run and Phase C evidence.",
    blockers,
    evidencePaths: [
      "docs/mpgf/phase-c-gate-report.md",
      "docs/mpgf/solver-benchmark-report.md",
      "docs/mpgf/www-exact-pilot-dry-run-verification.md",
    ],
    acceptanceCriteria: ["AC-COMPLETION-008", "AC-DEPLOY-010"],
  });
}

export async function evaluateMpgfRealMoneyProviderGate(): Promise<MpgfProductionGate> {
  const readiness = await loadMpgfRealMoneyReadiness();
  const deploymentPrerequisites = validateMpgfProductionDeploymentPrerequisites();
  const legalReadiness = validateMpgfLegalReadinessArtifacts();
  const exactPilotGate = evaluateMpgfExactPilotGate();
  const blockers = [
    ...readiness.blockers,
    ...readiness.requiredGates
      .filter((entry) => entry.status !== "passed")
      .map((entry) => `Required real-money gate is ${entry.status}: ${entry.gateKey}.`),
    ...validationBlockers(deploymentPrerequisites),
    ...validationBlockers(legalReadiness),
    exactPilotGate.status === "passed" ? null : "Real-money mode cannot pass before exact_pilot_complete gates pass.",
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "real-money-provider-operations",
    area: "real_money",
    label: "Production real-money provider operations",
    status: statusFromBlockers(blockers),
    summary:
      "Real-money provider operations require production secrets, Stripe Checkout/Billing/webhook configuration, approved terms/refund gates, and exact-pilot completion.",
    blockers,
    evidencePaths: [
      "supabase/migrations/20260515_mpgf_real_money_checkout.sql",
      "supabase/migrations/20260516_mpgf_manual_external_payment_evidence.sql",
      "docs/mpgf/payment-production-readiness.md",
      "docs/mpgf/legal-configuration-manifest.md",
    ],
    acceptanceCriteria: ["AC-COMPLETION-012", "AC-COMPLETION-013", "AC-DEPLOY-006"],
  });
}

export async function evaluateMpgfPayoutComplianceGate(): Promise<MpgfProductionGate> {
  const payoutProfile = validateMpgfPayoutProviderProfile();
  const gateStatuses = await loadMpgfGateStatuses([
    "recipient_compliance_policy_approved",
    "payout_profile_approved",
    "manual_external_payment_evidence_policy_approved",
    "external_payment_destination_approved",
  ]);
  const approvals = await loadMpgfAdminApprovalRows({
    action: "mpgf.payout_authorization.approve",
    targetType: "payout_authorization",
    targetVersion: "mpgf-payout-provider-profile-v1",
  });
  const payoutApproval = validateMpgfAdminApprovalSet({
    action: "mpgf.payout_authorization.approve",
    targetType: "payout_authorization",
    targetVersion: "mpgf-payout-provider-profile-v1",
    approvals,
  });
  const internalAuthorization = approveInternalPayoutAuthorization("control-plane-payout-authorization");
  const externalEvidence = recordExternalPaymentEvidence("control-plane-payout-authorization", {
    evidenceHash: "control-plane",
    amountCents: 1,
  });
  const evidenceVerification = verifyExternalPaymentEvidence("control-plane-external-payment-evidence");
  const blockers = [
    ...validationBlockers(payoutProfile),
    ...validationBlockers(payoutApproval),
    ...[
      "recipient_compliance_policy_approved",
      "payout_profile_approved",
      "manual_external_payment_evidence_policy_approved",
      "external_payment_destination_approved",
    ]
      .filter((gateKey) => gateStatuses.get(gateKey) !== "passed")
      .map((gateKey) => `Required payout/compliance gate is not passed: ${gateKey}.`),
    internalAuthorization.status === "blocked" ? internalAuthorization.reason : null,
    externalEvidence.status === "blocked" ? externalEvidence.reason : null,
    evidenceVerification.verified ? null : evidenceVerification.reason,
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "payout-compliance-approval",
    area: "payout_compliance",
    label: "Payout and compliance approval workflow",
    status: statusFromBlockers(blockers, "pending_review"),
    summary:
      "Payout completion requires recipient accreditation, compliance review, independent approval, verified external-payment evidence, and no automated payout unless an automated profile is approved.",
    blockers,
    evidencePaths: [
      "config/mpgf/payout-provider-profile.json",
      "docs/mpgf/rbac-permission-matrix.md",
      "supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql",
    ],
    acceptanceCriteria: ["AC-DISBURSEMENT-015", "AC-DISBURSEMENT-016", "AC-RBAC-001"],
  });
}

export function evaluateMpgfGovernanceMachineryGate(): MpgfProductionGate {
  const rbac = validateMpgfRbacPermissionMatrix();
  const states = validateMpgfStateMachineCoverage();
  const statusRegistry = validateMpgfStatusValueRegistry();
  const schema = validateMpgfSchemaContractCoverage();
  const adminSections = [
    "genesis",
    "cycles",
    "registry",
    "round",
    "safety",
    "sybil-collusion",
    "sponsor-governance",
    "payouts",
    "allocations",
    "audits",
    "launch",
    "legal",
    "incidents",
    "conformance",
    "rbac",
    "state-machines",
    "settings",
  ];
  const missingSections = adminSections.filter(
    (section) => !mpgfAdminSections.includes(section as (typeof mpgfAdminSections)[number]),
  );
  const governanceJudgment = createMpgfGovernanceJudgment({
    subject: "control-plane-governance-surface",
    approved: true,
  });
  const blockers = [
    ...validationBlockers(rbac),
    ...validationBlockers(states),
    ...validationBlockers(statusRegistry),
    ...validationBlockers(schema),
    ...missingSections.map((section) => `Missing admin section ${section}.`),
    governanceJudgment.createsLiveAuthority ? "Governance judgment unexpectedly creates live authority." : null,
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "governance-admin-machinery",
    area: "governance",
    label: "Admin and governance machinery",
    status: statusFromBlockers(blockers),
    summary:
      "Admin and governance machinery requires RBAC, state machines, approval records, governance judgments, audit logs, and mapped admin sections.",
    blockers,
    evidencePaths: [
      "config/mpgf/rbac-permission-matrix.json",
      "config/mpgf/state-machines.json",
      "supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql",
    ],
    acceptanceCriteria: ["AC-RBAC-001", "AC-STATE-001", "AC-GOVERNANCE-013"],
  });
}

export async function evaluateMpgfProductionVerificationGate(): Promise<MpgfProductionGate> {
  const preLaunch = validateMpgfDeploymentEnvironment("pre_launch");
  const completionGate = validateMpgfDeploymentEnvironment("completion_gate");
  const deploymentTarget = validateMpgfProductionDeploymentTarget();
  const verificationStatuses = await loadLatestMpgfProductionVerificationStatuses([
    "production_deployment_prerequisites",
    "www_direct_working",
    "www_auth_session",
    "www_participant_journey",
    "www_public_experience",
    "www_production_health_check",
    "www_post_launch_monitor",
  ]);
  const productionLaunch =
    verificationStatuses.get("production_deployment_prerequisites") === "passed"
      ? null
      : runMpgfProductionDirectWorkingLaunch();
  const directWorking =
    verificationStatuses.get("www_direct_working") === "passed" ? null : runMpgfWwwDirectWorkingVerification();
  const authSession =
    verificationStatuses.get("www_auth_session") === "passed" ? null : runMpgfWwwAuthSessionVerification();
  const participantJourney =
    verificationStatuses.get("www_participant_journey") === "passed"
      ? null
      : runMpgfWwwParticipantJourneyVerification();
  const publicExperience =
    verificationStatuses.get("www_public_experience") === "passed"
      ? null
      : runMpgfWwwPublicExperienceVerification();
  const healthCheck =
    verificationStatuses.get("www_production_health_check") === "passed"
      ? null
      : runMpgfWwwProductionHealthCheck();
  const postLaunchMonitor =
    verificationStatuses.get("www_post_launch_monitor") === "passed" ? null : runMpgfWwwPostLaunchMonitor();
  const dryRunCycle = createMpgfDryRunCycle();
  const blockers = [
    ...validationBlockers(preLaunch),
    ...validationBlockers(completionGate),
    ...validationBlockers(deploymentTarget),
    ...(productionLaunch ? validationBlockers(productionLaunch) : []),
    ...(directWorking ? validationBlockers(directWorking) : []),
    ...(authSession ? validationBlockers(authSession) : []),
    ...(participantJourney ? validationBlockers(participantJourney) : []),
    ...(publicExperience ? validationBlockers(publicExperience) : []),
    ...(healthCheck ? validationBlockers(healthCheck) : []),
    ...(postLaunchMonitor ? validationBlockers(postLaunchMonitor) : []),
    dryRunCycle.mode === "non_real_money_demo" ? null : "Production verification dry-run cycle is not non-real-money.",
  ].filter((entry): entry is string => Boolean(entry));

  return gate({
    key: "end-to-end-production-verification",
    area: "production_verification",
    label: "End-to-end production verification",
    status: statusFromBlockers(blockers),
    summary:
      "Production completion requires www.moraltrade.org browser evidence, auth/session evidence, participant journey evidence, health checks, deployment metadata, and a monitor window.",
    blockers,
    evidencePaths: [
      "docs/mpgf/production-deployment-prerequisites.md",
      "docs/mpgf/www-direct-working-verification.md",
      "docs/mpgf/www-auth-session-verification.md",
      "docs/mpgf/www-public-experience-verification.md",
      "docs/mpgf/www-participant-journey-verification.md",
      "docs/mpgf/www-production-health-monitor.md",
    ],
    acceptanceCriteria: ["AC-DEPLOY-005", "AC-DEPLOY-010", "AC-UI-009", "AC-COMPLETION-019"],
  });
}

export async function loadMpgfProductionControlPlaneSummary(): Promise<MpgfProductionControlPlaneSummary> {
  const instructionArtifactPath = "docs/mpgf/codex-build-instruction-final.md";
  const instructionArtifact = readTextIfExists(instructionArtifactPath);
  const gates = [
    evaluateMpgfSolverCertificationGate(),
    evaluateMpgfExactPilotGate(),
    await evaluateMpgfRealMoneyProviderGate(),
    await evaluateMpgfPayoutComplianceGate(),
    evaluateMpgfGovernanceMachineryGate(),
    await evaluateMpgfProductionVerificationGate(),
  ];
  const exactPilotComplete = gates.find((entry) => entry.key === "exact-pilot-completion")?.status ?? "blocked";
  const realMoneyComplete = gates.find((entry) => entry.key === "real-money-provider-operations")?.status ?? "blocked";
  const productionVerification =
    gates.find((entry) => entry.key === "end-to-end-production-verification")?.status ?? "blocked";

  return {
    status: combineStatuses(gates.map((entry) => entry.status)),
    generatedAt: new Date().toISOString(),
    instructionArtifactPath,
    instructionArtifactHash: instructionArtifact ? canonicalMpgfHash(instructionArtifact) : null,
    completionProfiles: {
      demoComplete: productionVerification,
      exactPilotComplete,
      realMoneyComplete: combineStatuses([exactPilotComplete, realMoneyComplete]),
    },
    gates,
  };
}

export function mpgfGatesForAdminSection(section: string, gates: MpgfProductionGate[]) {
  const areaBySection: Record<string, MpgfProductionGateArea[]> = {
    genesis: ["governance", "production_verification"],
    cycles: ["exact_pilot", "governance"],
    pools: ["governance", "solver"],
    "failure-bonus": ["governance", "exact_pilot", "real_money", "payout_compliance"],
    registry: ["payout_compliance", "governance"],
    round: ["exact_pilot", "solver", "governance"],
    safety: ["governance", "exact_pilot"],
    "sybil-collusion": ["governance", "exact_pilot"],
    "sponsor-governance": ["governance", "real_money"],
    recipients: ["payout_compliance"],
    payments: ["real_money"],
    refunds: ["real_money"],
    payouts: ["payout_compliance", "real_money"],
    allocations: ["solver", "exact_pilot"],
    audits: ["governance", "production_verification"],
    launch: ["production_verification", "real_money", "exact_pilot"],
    legal: ["real_money", "payout_compliance"],
    incidents: ["production_verification", "governance"],
    conformance: ["governance", "solver", "exact_pilot"],
    rbac: ["governance", "payout_compliance"],
    "state-machines": ["governance"],
    settings: ["real_money", "production_verification"],
  };
  const areas = areaBySection[section] ?? ["governance"];

  return gates.filter((entry) => areas.includes(entry.area));
}
