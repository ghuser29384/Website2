import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import { demoMpgfAssurancePledges } from "./data";
import { allocateMpgfAssuranceRound } from "./mechanism";
import type { MpgfPublicGoodsPledge, MpgfPublicGoodsRoundAllocation } from "./types";

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
  source_contribution_digest: string;
  eligible_contribution_record_count: number;
  raw_payment_object_count: number;
  unique_counted_identity_count: number;
  regenerated_from_contribution_records: true;
  finalized_at: string;
}

export interface MpgfPublicGoodsAllocationSourceProof {
  campaignId: string;
  sourceContributionDigest: string;
  eligibleContributionRecordCount: number;
  rawPaymentObjectCount: number;
  uniqueCountedIdentityCount: number;
  regeneratedFromContributionRecords: true;
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

function hashPublicSource(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function isActiveContributionRecord(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isEligibleCountedContributionRecord(pledge: MpgfPublicGoodsPledge) {
  return isActiveContributionRecord(pledge) && pledge.eligibilityState === "eligible" && pledge.amountCents > 0;
}

function normalizedAllocationSourceRecords(campaignId: string, pledges: MpgfPublicGoodsPledge[]) {
  return pledges
    .filter((pledge) => pledge.campaignId === campaignId && isActiveContributionRecord(pledge))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((pledge) => ({
      campaignId: pledge.campaignId,
      contributionRefHash: hashPublicSource(["mpgf-public-goods-contribution", pledge.id]),
      donorRefHash: hashPublicSource(["mpgf-public-goods-counted-identity", pledge.userId]),
      amountCents: Math.max(0, Math.floor(pledge.amountCents)),
      captureMode: pledge.captureMode,
      eligibilityState: pledge.eligibilityState,
      status: pledge.status,
      isRecurring: pledge.isRecurring,
      paymentIntentPresent: Boolean(pledge.paymentIntentRef),
    }));
}

export function buildMpgfPublicGoodsAllocationSourceProofMap({
  allocation = allocateMpgfAssuranceRound(),
  pledges = demoMpgfAssurancePledges,
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
} = {}) {
  return new Map(
    allocation.lines.map((line) => {
      const activeRecords = pledges.filter(
        (pledge) => pledge.campaignId === line.campaignId && isActiveContributionRecord(pledge),
      );
      const eligibleRecords = activeRecords.filter(isEligibleCountedContributionRecord);
      const uniqueCountedIdentities = new Set(eligibleRecords.map((pledge) => pledge.userId));
      const sourceProof: MpgfPublicGoodsAllocationSourceProof = {
        campaignId: line.campaignId,
        sourceContributionDigest: hashPublicSource(normalizedAllocationSourceRecords(line.campaignId, pledges)),
        eligibleContributionRecordCount: eligibleRecords.length,
        rawPaymentObjectCount: activeRecords.length,
        uniqueCountedIdentityCount: uniqueCountedIdentities.size,
        regeneratedFromContributionRecords: true,
      };

      return [line.campaignId, sourceProof] as const;
    }),
  );
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

    if (!row.source_contribution_digest.startsWith("sha256:")) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must include a source digest.`);
    }

    if (!row.regenerated_from_contribution_records) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must regenerate from contribution records.`);
    }

    if (row.unique_counted_identity_count > row.eligible_contribution_record_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} over-counts unique identities.`);
    }

    if (row.eligible_contribution_record_count > row.raw_payment_object_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} has more eligible records than raw records.`);
    }

    if (row.verified_supporter_count !== row.unique_counted_identity_count) {
      throw new Error(`MPGF public-goods allocation row ${row.campaign_id} must publish unique counted identities.`);
    }

    if (
      row.direct_eligible_cents < 0 ||
      row.verified_supporter_count < 0 ||
      row.base_match_cents < 0 ||
      row.qf_bonus_cents < 0 ||
      row.total_payout_cents < 0 ||
      row.eligible_contribution_record_count < 0 ||
      row.raw_payment_object_count < 0 ||
      row.unique_counted_identity_count < 0
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
  pledges = demoMpgfAssurancePledges,
  finalizedAt = new Date("2026-05-29T12:00:00.000Z").toISOString(),
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  finalizedAt?: string;
} = {}) {
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({ allocation, pledges });
  const rows = allocation.lines.map((line) => {
    const sourceProof = sourceProofByCampaignId.get(line.campaignId);

    if (!sourceProof) {
      throw new Error(`MPGF public-goods allocation source proof missing for ${line.campaignId}.`);
    }

    return {
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
      source_contribution_digest: sourceProof.sourceContributionDigest,
      eligible_contribution_record_count: sourceProof.eligibleContributionRecordCount,
      raw_payment_object_count: sourceProof.rawPaymentObjectCount,
      unique_counted_identity_count: sourceProof.uniqueCountedIdentityCount,
      regenerated_from_contribution_records: sourceProof.regeneratedFromContributionRecords,
      finalized_at: finalizedAt,
    };
  }) satisfies MpgfPublicGoodsAllocationResultRow[];

  assertAllocationRowsAreSafe({ allocation, rows });

  return rows;
}

export async function persistMpgfPublicGoodsAllocationResults({
  allocation = allocateMpgfAssuranceRound(),
  pledges = demoMpgfAssurancePledges,
  dryRun = false,
  finalizedAt = new Date().toISOString(),
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  pledges?: MpgfPublicGoodsPledge[];
  dryRun?: boolean;
  finalizedAt?: string;
} = {}): Promise<PersistMpgfPublicGoodsAllocationResultsResult> {
  const rows = buildMpgfPublicGoodsAllocationResultRows({ allocation, pledges, finalizedAt });

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
