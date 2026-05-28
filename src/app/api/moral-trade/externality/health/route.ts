import { NextResponse } from "next/server";

import {
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeExternalityProfile();
  const validation = validateMoralTradeExternalityProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      dueDiligenceSteps: profile.dueDiligenceSteps.map((step) => step.key),
      triggerCodes: profile.triggerCodes.map((trigger) => trigger.key),
      reviewStandards: profile.reviewStandards.map((standard) => standard.key),
      remedyControls: profile.remedyControls.map((control) => control.key),
      allowedOutcomes: profile.allowedOutcomes,
      externalityTests: profile.externalityTests,
    },
    blockers: validation.blockers,
  });
}
