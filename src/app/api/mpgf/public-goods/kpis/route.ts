import { NextResponse } from "next/server";

import { loadMpgfPublicGoodsKpiSnapshot } from "@/lib/mpgf/public-goods-kpis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function kpiSecret() {
  return process.env.MPGF_PUBLIC_GOODS_KPI_SECRET ?? process.env.MPGF_ANALYTICS_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = kpiSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function readDryRun(request: Request) {
  const url = new URL(request.url);

  return url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true";
}

export async function GET(request: Request) {
  if (!kpiSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods KPI snapshots are not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods KPI request." }, { status: 401 });
  }

  try {
    const result = await loadMpgfPublicGoodsKpiSnapshot({
      dryRun: readDryRun(request),
    });

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        warnings: result.warnings,
        snapshot: result.snapshot,
      },
      { status: result.status === "not_configured" ? 503 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not build MPGF public-goods KPI snapshot.",
      },
      { status: 400 },
    );
  }
}
