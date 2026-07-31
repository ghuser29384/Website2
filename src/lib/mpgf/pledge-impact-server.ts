import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  PledgeImpactCampaignId,
  PledgeImpactForecastRelease,
  PledgeImpactPoolPublicKey,
  PledgeImpactPoolState,
} from "./pledge-impact";

type ForecastSnapshotRow = {
  id: string;
  pool_public_key: string;
  campaign_id: string;
  forecast_version: string;
  model_version: string;
  released_at: string;
  expires_at: string;
  pool_state_json: unknown;
  forecast_json: unknown;
  content_sha256: string;
};

function mapForecastSnapshotRow(row: ForecastSnapshotRow): PledgeImpactForecastRelease {
  return {
    id: row.id,
    poolPublicKey: row.pool_public_key as PledgeImpactPoolPublicKey,
    campaignId: row.campaign_id as PledgeImpactCampaignId,
    forecastVersion: row.forecast_version,
    modelVersion: row.model_version,
    releasedAt: row.released_at,
    expiresAt: row.expires_at,
    poolState: row.pool_state_json as PledgeImpactPoolState,
    forecast: row.forecast_json as PledgeImpactForecastRelease["forecast"],
    contentSha256: row.content_sha256,
  };
}

export async function loadLatestPledgeImpactForecastRelease(
  poolPublicKey: PledgeImpactPoolPublicKey,
): Promise<PledgeImpactForecastRelease | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mpgf_pledge_impact_forecast_snapshots")
    .select(
      "id,pool_public_key,campaign_id,forecast_version,model_version,released_at,expires_at,pool_state_json,forecast_json,content_sha256",
    )
    .eq("pool_public_key", poolPublicKey)
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Pledge-impact forecast query failed.");
  }
  return data ? mapForecastSnapshotRow(data as ForecastSnapshotRow) : null;
}
