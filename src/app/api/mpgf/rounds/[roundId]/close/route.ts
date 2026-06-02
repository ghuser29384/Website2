import { NextResponse } from "next/server";

import { persistMpgfPublicGoodsAllocationResults } from "@/lib/mpgf/public-goods-allocation-results";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function closeSecret() {
  return process.env.MPGF_PUBLIC_GOODS_ROUND_CLOSE_SECRET ?? process.env.MPGF_ALLOCATION_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = closeSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function dryRunFrom(request: Request, payload: unknown) {
  const url = new URL(request.url);

  return (
    url.searchParams.get("dryRun") === "1" ||
    url.searchParams.get("dryRun") === "true" ||
    Boolean(payload && typeof payload === "object" && (payload as Record<string, unknown>).dryRun === true)
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  if (!closeSecret()) {
    return NextResponse.json({ ok: false, error: "MPGF public-goods round close is not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods round close request." }, { status: 401 });
  }

  try {
    const payload = request.headers.get("content-type")?.includes("application/json")
      ? await request.json().catch(() => null)
      : null;
    const { roundId } = await params;
    const result = await persistMpgfPublicGoodsAllocationResults({
      dryRun: dryRunFrom(request, payload),
      roundId,
    });

    if (result.allocation.roundId !== roundId) {
      return NextResponse.json({ ok: false, error: "MPGF public-goods round not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        roundId,
        finalizedAllocationRows: result.rows.length,
        persistedCount: result.persistedCount,
        contributionSource: result.contributionSource,
        loadedContributionRecordCount: result.loadedContributionRecordCount,
        eligibleContributionRecordCount: result.eligibleContributionRecordCount,
        rawPaymentObjectCount: result.rawPaymentObjectCount,
        baseMatchAllocatedCents: result.allocation.baseMatchAllocatedCents,
        qfBonusAllocatedCents: result.allocation.qfBonusAllocatedCents,
        totalPayoutCents: result.allocation.totalPayoutCents,
        finalPayoutAuthorized: false,
        warnings: result.warnings,
      },
      { status: result.status === "not_configured" ? 503 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not close MPGF public-goods round." },
      { status: 400 },
    );
  }
}
