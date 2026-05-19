import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import { loadMpgfWwwProductionHealthChecks } from "./validators";
import type { WwwProductionHealthCheckResult } from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type Fetcher = typeof fetch;

interface HealthCheckConfig {
  checkId?: string;
  id?: string;
  route?: string;
  severity?: "critical" | "warning";
  timeoutSeconds?: number;
  expected?: string;
}

export type MpgfProductionVerificationKind =
  | "production_deployment_prerequisites"
  | "www_direct_working"
  | "www_auth_session"
  | "www_public_experience"
  | "www_participant_journey"
  | "www_exact_pilot_dry_run"
  | "www_production_health_check"
  | "www_post_launch_monitor"
  | "end_to_end";

export function getMpgfDeployedCommitShaOrBuildId() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "local-unverified-build"
  );
}

function canWriteProductionVerificationDatabase() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getCheckUrl(baseUrl: string, route: string) {
  return new URL(route, baseUrl).toString();
}

function isSuccessfulHtml(status: number, text: string) {
  return status >= 200 && status < 300 && !/Application error|Internal Server Error|Hydration failed/i.test(text);
}

async function fetchWithTimeout(fetcher: Fetcher, url: string, timeoutSeconds: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    return await fetcher(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runMpgfProductionHealthCheck(input: {
  baseUrl?: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId?: string;
  fetcher?: Fetcher;
} = {}): Promise<WwwProductionHealthCheckResult> {
  const baseUrl = input.baseUrl ?? "https://www.moraltrade.org";
  const deployedCommitShaOrBuildId = input.deployedCommitShaOrBuildId ?? getMpgfDeployedCommitShaOrBuildId();
  const profile = loadMpgfWwwProductionHealthChecks();
  const fetcher = input.fetcher ?? fetch;
  const checks = Array.isArray(profile.checks) ? (profile.checks as HealthCheckConfig[]) : [];
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    checks.map(async (check) => {
      const id = check.checkId ?? check.id ?? "unknown-check";
      const route = check.route ?? "/mpgf";
      const timeoutSeconds = typeof check.timeoutSeconds === "number" ? check.timeoutSeconds : 10;
      const url = getCheckUrl(baseUrl, route);

      try {
        const response = await fetchWithTimeout(fetcher, url, timeoutSeconds);
        const text = await response.text();
        const passed = isSuccessfulHtml(response.status, text);

        return {
          id,
          check: route,
          severity: check.severity ?? "critical",
          passed,
          evidence: passed
            ? `${url} returned ${response.status} without known fatal render markers.`
            : `${url} returned ${response.status} or fatal render markers.`,
        };
      } catch (error) {
        return {
          id,
          check: route,
          severity: check.severity ?? "critical",
          passed: false,
          evidence: error instanceof Error ? `${url} failed: ${error.message}` : `${url} failed.`,
        };
      }
    }),
  );
  const blockers = results
    .filter((entry) => !entry.passed && entry.severity === "critical")
    .map((entry) => `${entry.id}: ${entry.evidence}`);

  return {
    passed: blockers.length === 0,
    baseUrl,
    deployedCommitShaOrBuildId,
    checkedAt,
    checks: results,
    blockers,
  };
}

export async function persistMpgfProductionVerificationRun(input: {
  verificationKind: MpgfProductionVerificationKind;
  status: "passed" | "blocked" | "pending_review" | "failed";
  result: unknown;
  blockers: string[];
  browserEvidencePath?: string | null;
  evaluatedBaseUrl?: string;
  deployedCommitShaOrBuildId?: string;
  evaluatedBy?: string | null;
}) {
  if (!canWriteProductionVerificationDatabase()) {
    return {
      persisted: false,
      warning: "Supabase service-role configuration is unavailable; production verification run was not persisted.",
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { error } = await supabase.from("mpgf_production_verification_runs").insert({
    verification_kind: input.verificationKind,
    evaluated_base_url: input.evaluatedBaseUrl ?? "https://www.moraltrade.org",
    deployed_commit_sha_or_build_id: input.deployedCommitShaOrBuildId ?? getMpgfDeployedCommitShaOrBuildId(),
    browser_evidence_path: input.browserEvidencePath ?? null,
    status: input.status,
    blockers_json: input.blockers,
  });

  if (error) {
    return {
      persisted: false,
      warning: error.message,
    };
  }

  if (input.evaluatedBy) {
    await supabase.from("mpgf_admin_audit_logs").insert({
      action: `mpgf.production_verification.${input.verificationKind}`,
      target_type: "mpgf_production_verification_runs",
      actor_user_id: input.evaluatedBy,
      audit_json: {
        status: input.status,
        blockers: input.blockers,
        result: input.result,
      },
    });
  }

  return {
    persisted: true,
    warning: null,
  };
}

export async function runAndPersistMpgfProductionHealthCheck(input: {
  evaluatedBy?: string | null;
  fetcher?: Fetcher;
} = {}) {
  const result = await runMpgfProductionHealthCheck({ fetcher: input.fetcher });
  const status = result.passed ? "passed" : "failed";
  const persistence = await persistMpgfProductionVerificationRun({
    verificationKind: "www_production_health_check",
    status,
    result,
    blockers: result.blockers,
    deployedCommitShaOrBuildId: result.deployedCommitShaOrBuildId,
    evaluatedBy: input.evaluatedBy,
    browserEvidencePath: "supabase:mpgf_production_verification_runs/www_production_health_check",
  });

  return {
    result,
    persistence,
  };
}
