import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

import {
  type MpgfPublicGoodsStoredSupportSignal,
  type MpgfPublicGoodsSupportSignal,
  supportSignalFromMpgfPublicGoodsStorageRow,
} from "./public-goods-cg-vqaf";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type MpgfSupportSignalRow = Pick<
  Database["public"]["Tables"]["mpgf_support_signals"]["Row"],
  | "id"
  | "round_id"
  | "campaign_id"
  | "user_ref_hash"
  | "moral_cluster_hash"
  | "signal_type"
  | "strength_bps"
  | "counts_for_common_ground"
  | "calc_hash"
  | "created_at"
>;

export interface MpgfPublicGoodsSupportSignalLoadResult {
  source: "database" | "demo_fixture";
  supportSignals: MpgfPublicGoodsSupportSignal[] | null;
  persistedSupportSignalCount: number;
  skippedSupportSignalCount: number;
  warnings: string[];
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function serviceClient() {
  return createServiceClient() as SupabaseServiceAny;
}

function storedSupportSignalFromRow(row: MpgfSupportSignalRow): MpgfPublicGoodsStoredSupportSignal {
  return {
    id: row.id,
    roundId: row.round_id,
    campaignId: row.campaign_id,
    userRefHash: row.user_ref_hash,
    moralClusterHash: row.moral_cluster_hash,
    signalType: row.signal_type,
    strengthBps: Number(row.strength_bps),
    countsForCommonGround: row.counts_for_common_ground,
    calcHash: row.calc_hash,
    createdAt: row.created_at,
  };
}

export async function loadMpgfPublicGoodsSupportSignalsForRound(
  roundId: string,
): Promise<MpgfPublicGoodsSupportSignalLoadResult> {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      source: "demo_fixture",
      supportSignals: null,
      persistedSupportSignalCount: 0,
      skippedSupportSignalCount: 0,
      warnings: [
        "Supabase service-role persistence is required before MPGF common-ground discovery can use recorded support signals.",
      ],
    };
  }

  const result = await serviceClient()
    .from("mpgf_support_signals")
    .select(
      "id, round_id, campaign_id, user_ref_hash, moral_cluster_hash, signal_type, strength_bps, counts_for_common_ground, calc_hash, created_at",
    )
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(`Could not load MPGF support signals for common-ground discovery: ${result.error.message}`);
  }

  const storedRows = (result.data ?? []) as MpgfSupportSignalRow[];
  const supportSignals = storedRows
    .map((row) => supportSignalFromMpgfPublicGoodsStorageRow(storedSupportSignalFromRow(row)))
    .filter((signal): signal is MpgfPublicGoodsSupportSignal => Boolean(signal));

  return {
    source: "database",
    supportSignals,
    persistedSupportSignalCount: storedRows.length,
    skippedSupportSignalCount: storedRows.length - supportSignals.length,
    warnings: [],
  };
}
