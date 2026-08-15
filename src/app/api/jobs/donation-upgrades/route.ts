import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { getDirectDonationUpgradeConfig } from "@/lib/direct-donation-upgrade";
import { getDirectSpendingUpgradeConfig } from "@/lib/direct-spending-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function processDonationUpgrades(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getDirectDonationUpgradeConfig();
  const spendingConfig = getDirectSpendingUpgradeConfig();
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
    { p_now: now, p_expected_environment: config.environment },
  );
  if (error) {
    console.error("[donation-upgrade-lifecycle] lifecycle transaction failed", {
      message: error.message,
      environment: config.environment,
    });
    return NextResponse.json({ error: "Lifecycle processing failed." }, { status: 500 });
  }

  let spendingResult: unknown = null;
  if (spendingConfig.readyForCheckout) {
    const { data: spendingData, error: spendingError } = await (
      createServiceClient() as any
    ).rpc("run_direct_spending_upgrade_lifecycle", {
      p_now: now,
      p_expected_environment: config.environment,
    });
    if (spendingError) {
      console.error("[direct-spending-upgrade-lifecycle] transaction failed", {
        message: spendingError.message,
        environment: config.environment,
      });
      return NextResponse.json(
        { error: "Spending Upgrade lifecycle processing failed." },
        { status: 500 },
      );
    }
    spendingResult = spendingData;
  }

  const response = {
    processed: true,
    environment: config.environment,
    result: data,
  };
  return NextResponse.json(
    spendingConfig.requestedEnabled
      ? { ...response, spendingUpgrade: spendingResult }
      : response,
  );
}

export async function GET(request: Request) {
  return processDonationUpgrades(request);
}

export async function POST(request: Request) {
  return processDonationUpgrades(request);
}
