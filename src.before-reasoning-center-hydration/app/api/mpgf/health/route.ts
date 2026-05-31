import { NextResponse } from "next/server";

import { buildPublicSummary, runMpgfPublicRuntimeReadinessCheck } from "@/lib/mpgf/mechanism";
import { runMpgfProductionHealthCheck } from "@/lib/mpgf/production-verification";
import {
  validateMpgfDeploymentEnvironment,
  validateMpgfPublicExperienceProfile,
  validateMpgfWwwProductionHealthChecks,
} from "@/lib/mpgf/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtimeReadiness = runMpgfPublicRuntimeReadinessCheck();
  const healthProfile = validateMpgfWwwProductionHealthChecks();
  const publicExperience = validateMpgfPublicExperienceProfile();
  const preLaunch = validateMpgfDeploymentEnvironment("pre_launch");
  const productionHealth =
    process.env.VERCEL_ENV === "production"
      ? await runMpgfProductionHealthCheck()
      : null;
  const publicSummary = buildPublicSummary();
  const blockers = [
    ...runtimeReadiness.blockers,
    ...healthProfile.blockers,
    ...publicExperience.blockers,
    ...preLaunch.blockers,
    ...(productionHealth?.blockers ?? []),
  ];

  return NextResponse.json({
    ok: blockers.length === 0,
    checkedAt: new Date().toISOString(),
    mode: publicSummary.mode,
    realMoneyEnabled: false,
    releasedInternalCents: publicSummary.releasedInternalCents,
    payoutAuthorizedCents: publicSummary.payoutAuthorizedCents,
    externallyPaidCents: publicSummary.externallyPaidCents,
    runtimeReadiness,
    healthProfile,
    publicExperience,
    preLaunch,
    productionHealth,
    blockers,
  });
}
