import { NextResponse } from "next/server";

import { persistMpgfPublicGoodsAllocationResults } from "@/lib/mpgf/public-goods-allocation-results";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function allocationSecret() {
  return process.env.MPGF_ALLOCATION_SECRET ?? process.env.CRON_SECRET ?? process.env.MPGF_RECONCILIATION_SECRET;
}

function isAuthorized(request: Request) {
  const secret = allocationSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

async function readDryRun(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true") {
    return true;
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return false;
  }

  const payload = await request.json().catch(() => null);

  return Boolean(payload && typeof payload === "object" && (payload as Record<string, unknown>).dryRun === true);
}

export async function POST(request: Request) {
  if (!allocationSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods allocation finalization is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods allocation request." }, { status: 401 });
  }

  try {
    const result = await persistMpgfPublicGoodsAllocationResults({
      dryRun: await readDryRun(request),
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      roundId: result.allocation.roundId,
      matchPoolId: result.allocation.matchPoolId,
      rowCount: result.rows.length,
      persistedCount: result.persistedCount,
      baseMatchAllocatedCents: result.allocation.baseMatchAllocatedCents,
      qfBonusAllocatedCents: result.allocation.qfBonusAllocatedCents,
      totalPayoutCents: result.allocation.totalPayoutCents,
      proofPageRequired: result.allocation.proofPageRequired,
      warnings: result.warnings,
      rows: result.rows.map((row) => ({
        campaignId: row.campaign_id,
        status: row.status,
        directEligibleCents: row.direct_eligible_cents,
        verifiedSupporterCount: row.verified_supporter_count,
        baseMatchCents: row.base_match_cents,
        qfBonusCents: row.qf_bonus_cents,
        qfBonusCapCents: row.qf_bonus_cap_cents,
        totalPayoutCents: row.total_payout_cents,
        proofRequired: row.proof_required,
        custodyMode: row.custody_mode,
      })),
    }, { status: result.status === "not_configured" ? 503 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not finalize MPGF public-goods allocation results.",
      },
      { status: 400 },
    );
  }
}
