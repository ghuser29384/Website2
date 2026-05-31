import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import { allocateMpgfAssuranceRound } from "./mechanism";
import type { MpgfPublicGoodsRoundAllocation } from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export interface MpgfPublicGoodsAllocationResultRow {
  round_id: string;
  campaign_id: string;
  direct_eligible_cents: number;
  verified_supporter_count: number;
  base_match_cents: number;
  qf_score: number;
  qf_bonus_cents: number;
  qf_bonus_cap_cents: number;
  total_payout_cents: number;
  status: string;
  proof_required: string;
  custody_mode: string;
  finalized_at: string;
}

export interface PersistMpgfPublicGoodsAllocationResultsResult {
  ok: boolean;
  status: "persisted" | "dry_run" | "not_configured";
  allocation: MpgfPublicGoodsRoundAllocation;
  rows: MpgfPublicGoodsAllocationResultRow[];
  persistedCount: number;
  warnings: string[];
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function assertAllocationRowsAreSafe(input: {
  allocation: MpgfPublicGoodsRoundAllocation;
  rows: MpgfPublicGoodsAllocationResultRow[];
}) {
  const rowCampaignIds = new Set(input.rows.map((row) => row.campaign_id));

  if (rowCampaignIds.size !== input.rows.length) {
    throw new Error("MPGF public-goods allocation rows must have one row per campaign.");
  }

  for (const row of input.rows) {
    if (row.qf_bonus_cents > row.qf_bonus_cap_cents) {
      throw new Error(`MPGF public-goods QF cap violated for ${row.campaign_id}.`);
    }

    if (row.status !== "payable" && row.total_payout_cents !== 0) {
      throw new Error(`MPGF public-goods non-payable campaign ${row.campaign_id} cannot persist payout.`);
    }

    if (
      row.direct_eligible_cents < 0 ||
      row.verified_supporter_count < 0 ||
      row.base_match_cents < 0 ||
      row.qf_bonus_cents < 0 ||
      row.total_payout_cents < 0
    ) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has a negative amount.`);
    }
  }

  const baseMatchAllocated = input.rows.reduce((sum, row) => sum + row.base_match_cents, 0);
  const qfAllocated = input.rows.reduce((sum, row) => sum + row.qf_bonus_cents, 0);

  if (baseMatchAllocated > input.allocation.baseMatchBudgetCents) {
    throw new Error("MPGF public-goods base match allocation exceeds the sponsor budget.");
  }

  if (qfAllocated > input.allocation.qfBonusBudgetCents) {
    throw new Error("MPGF public-goods QF allocation exceeds the QF bonus budget.");
  }
}

export function buildMpgfPublicGoodsAllocationResultRows({
  allocation = allocateMpgfAssuranceRound(),
  finalizedAt = new Date("2026-05-29T12:00:00.000Z").toISOString(),
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  finalizedAt?: string;
} = {}) {
  const rows = allocation.lines.map((line) => ({
    round_id: allocation.roundId,
    campaign_id: line.campaignId,
    direct_eligible_cents: line.directEligibleCents,
    verified_supporter_count: line.verifiedSupporterCount,
    base_match_cents: line.baseMatchCents,
    qf_score: line.qfScore,
    qf_bonus_cents: line.qfBonusCents,
    qf_bonus_cap_cents: line.qfBonusCapCents,
    total_payout_cents: line.status === "payable" ? line.totalPayoutCents : 0,
    status: line.status,
    proof_required: line.proofRequired,
    custody_mode: line.custodyMode,
    finalized_at: finalizedAt,
  })) satisfies MpgfPublicGoodsAllocationResultRow[];

  assertAllocationRowsAreSafe({ allocation, rows });

  return rows;
}

export async function persistMpgfPublicGoodsAllocationResults({
  allocation = allocateMpgfAssuranceRound(),
  dryRun = false,
  finalizedAt = new Date().toISOString(),
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  dryRun?: boolean;
  finalizedAt?: string;
} = {}): Promise<PersistMpgfPublicGoodsAllocationResultsResult> {
  const rows = buildMpgfPublicGoodsAllocationResultRows({ allocation, finalizedAt });

  if (dryRun) {
    return {
      ok: true,
      status: "dry_run",
      allocation,
      rows,
      persistedCount: 0,
      warnings: [],
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      allocation,
      rows,
      persistedCount: 0,
      warnings: ["Supabase service-role configuration is required to persist MPGF public-goods allocation results."],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase
    .from("mpgf_public_goods_allocation_results")
    .upsert(rows, { onConflict: "round_id,campaign_id" })
    .select("campaign_id");

  if (result.error) {
    throw new Error(`Could not persist MPGF public-goods allocation results: ${result.error.message}`);
  }

  return {
    ok: true,
    status: "persisted",
    allocation,
    rows,
    persistedCount: (result.data ?? []).length,
    warnings: [],
  };
}
