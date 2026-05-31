import { NextResponse } from "next/server";

import { evaluateMpgfSolverCertificationGate } from "@/lib/mpgf/control-plane";
import {
  generateMpgfDemoAllocationCertificate,
  runMpgfDryRunCycle,
  solveMpgfByCompleteRegionEnumeration,
  verifyMpgfOptimalityCertificate,
} from "@/lib/mpgf/mechanism";
import { getMpgfDeployedCommitShaOrBuildId } from "@/lib/mpgf/production-verification";
import {
  runMpgfSolverBenchmarks,
  validateMpgfSolverSupportProfile,
  validateSolverSupportProfileAgainstBenchmarks,
} from "@/lib/mpgf/validators";

export const dynamic = "force-dynamic";

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => jsonSafe(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, jsonSafe(entry)]),
    );
  }

  return value;
}

export async function GET() {
  const certificate = generateMpgfDemoAllocationCertificate();
  const certificateVerification = verifyMpgfOptimalityCertificate(undefined, certificate);
  const certifiedSolverResult = solveMpgfByCompleteRegionEnumeration();
  const solverGate = evaluateMpgfSolverCertificationGate();
  const dryRun = runMpgfDryRunCycle();
  const supportProfile = validateMpgfSolverSupportProfile();
  const benchmarkRun = runMpgfSolverBenchmarks();
  const benchmarkSupport = validateSolverSupportProfileAgainstBenchmarks();
  const blockers = [
    ...solverGate.blockers,
    dryRun.passed ? null : "Local exact-pilot dry run did not pass.",
    certifiedSolverResult.status === "verified_optimal" ? null : certifiedSolverResult.reason,
    certificateVerification.verifiedOptimal ? null : certificateVerification.errors.join(", "),
    supportProfile.passed ? null : supportProfile.blockers.join("; "),
    benchmarkRun.passed ? null : benchmarkRun.blockers.join("; "),
    benchmarkSupport.passed ? null : benchmarkSupport.blockers.join("; "),
  ].filter((entry): entry is string => Boolean(entry));

  return NextResponse.json(jsonSafe({
    ok: blockers.length === 0,
    checkedAt: new Date().toISOString(),
    evaluatedBaseUrl: "https://www.moraltrade.org",
    deployedCommitShaOrBuildId: getMpgfDeployedCommitShaOrBuildId(),
    mutationPolicy: "read_only_no_payment_no_payout_no_live_disbursement_mutation",
    solverGate,
    dryRun,
    certifiedSolverResult,
    certificateVerification,
    supportProfile,
    benchmarkRun,
    benchmarkSupport,
    blockers,
  }));
}
