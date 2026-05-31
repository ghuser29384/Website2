import { NextResponse } from "next/server";

import { loadMpgfPublicGoodsOperationsDashboard } from "@/lib/mpgf/public-goods-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function operationsSecret() {
  return (
    process.env.MPGF_PUBLIC_GOODS_OPERATIONS_SECRET ??
    process.env.MPGF_PUBLIC_GOODS_KPI_SECRET ??
    process.env.MPGF_ADMIN_INTEGRITY_SECRET ??
    process.env.CRON_SECRET
  );
}

function isAuthorized(request: Request) {
  const secret = operationsSecret();

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
  if (!operationsSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods operations alerts are not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods operations request." }, { status: 401 });
  }

  try {
    const result = await loadMpgfPublicGoodsOperationsDashboard({
      dryRun: readDryRun(request),
    });

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        warnings: result.warnings,
        privacyPolicy: "private_admin_operations_no_raw_webhook_payloads",
        dashboard: result.dashboard,
      },
      { status: result.status === "not_configured" ? 503 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not build MPGF public-goods operations dashboard.",
      },
      { status: 400 },
    );
  }
}
