import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { getDirectDonationUpgradeConfig } from "@/lib/direct-donation-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function processDonationUpgrades(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getDirectDonationUpgradeConfig();
  if (!config.readyForCommitments || !config.environment) {
    return NextResponse.json({
      processed: false,
      mode: config.mode,
      blocker: config.blockers[0] ?? "Direct Donation Upgrades are disabled.",
    });
  }

  const now = new Date().toISOString();
  const { data, error } = await (createServiceClient() as any).rpc(
    "run_direct_donation_upgrade_lifecycle",
    { p_now: now },
  );
  if (error) {
    console.error("[donation-upgrade-lifecycle] lifecycle transaction failed", {
      message: error.message,
      environment: config.environment,
    });
    return NextResponse.json({ error: "Lifecycle processing failed." }, { status: 500 });
  }

  return NextResponse.json({ processed: true, environment: config.environment, result: data });
}

export async function GET(request: Request) {
  return processDonationUpgrades(request);
}

export async function POST(request: Request) {
  return processDonationUpgrades(request);
}
