import { NextResponse } from "next/server";

import {
  runMpgfPublicRuntimeReadinessCheck,
  summarizeMpgfPublicGoodsReviewConsole,
} from "@/lib/mpgf/mechanism";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { loadMpgfProductionControlPlaneSummary } from "@/lib/mpgf/control-plane";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function integritySecret() {
  return process.env.MPGF_ADMIN_INTEGRITY_SECRET ?? process.env.MPGF_ADMIN_BOOTSTRAP_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = integritySecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!integritySecret()) {
    return NextResponse.json({ ok: false, error: "MPGF admin integrity checks are not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF admin integrity request." }, { status: 401 });
  }

  const [runtimeReadiness, reviewConsole, realMoneyReadiness, controlPlane] = await Promise.all([
    Promise.resolve(runMpgfPublicRuntimeReadinessCheck()),
    Promise.resolve(summarizeMpgfPublicGoodsReviewConsole()),
    loadMpgfRealMoneyReadiness(),
    loadMpgfProductionControlPlaneSummary(),
  ]);

  return NextResponse.json({
    ok: runtimeReadiness.status === "passed",
    privacyPolicy: "private_admin_no_raw_wish_text_public_output",
    sybilPolicy: "identity_attestation_flags_only_no_hidden_moral_scores",
    webhookCanAuthorizeFinalPayout: false,
    runtimeReadiness,
    reviewConsole,
    realMoneyReadiness,
    controlPlane,
  });
}
