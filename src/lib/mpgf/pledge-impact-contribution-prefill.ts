import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import {
  getPledgeImpactCampaignId,
  isPledgeImpactPoolPublicKey,
  type PledgeImpactPoolPublicKey,
} from "@/lib/mpgf/pledge-impact";

export type PledgeImpactContributionSource = "threshold-radar" | "discover-threshold";

export interface PledgeImpactContributionPrefill {
  campaignId: string;
  amountDollars: number;
  poolPublicKey: PledgeImpactPoolPublicKey;
  source: PledgeImpactContributionSource;
  notice: string;
}

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isContributionSource(value: string): value is PledgeImpactContributionSource {
  return value === "threshold-radar" || value === "discover-threshold";
}

export function resolvePledgeImpactContributionPrefill(
  searchParams: Record<string, string | string[] | undefined>,
): PledgeImpactContributionPrefill | null {
  const pool = readParam(searchParams, "pool");
  const campaignId = readParam(searchParams, "campaign");
  const amount = readParam(searchParams, "amount");
  const source = readParam(searchParams, "source");

  if (!isPledgeImpactPoolPublicKey(pool) || !isContributionSource(source)) return null;
  if (getPledgeImpactCampaignId(pool) !== campaignId) return null;
  if (!demoMpgfPublicGoodsCampaigns.some((campaign) => campaign.id === campaignId)) return null;
  if (!/^\d+$/.test(amount)) return null;
  const amountDollars = Number(amount);
  if (!Number.isSafeInteger(amountDollars) || amountDollars < 1 || amountDollars > 1_000_000) {
    return null;
  }

  const sourceLabel = source === "threshold-radar" ? "Threshold Radar" : "Discover Threshold";
  return {
    campaignId,
    amountDollars,
    poolPublicKey: pool,
    source,
    notice: `Opened from ${sourceLabel}. The campaign and amount are prefilled only. No pledge has been saved and no payment has been authorized.`,
  };
}
