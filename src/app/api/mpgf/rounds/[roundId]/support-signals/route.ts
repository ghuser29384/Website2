import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { recordMpgfPublicGoodsAnalyticsEvent } from "@/lib/mpgf/public-goods-analytics";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  createMpgfPublicGoodsSupportSignal,
  defaultMpgfPublicGoodsSupportStrengthBps,
  getMpgfPublicGoodsSupportSignalContractApi,
  isMpgfPublicGoodsMoralCluster,
  isMpgfPublicGoodsSupportSignalType,
  type MpgfPublicGoodsSupportSignal,
} from "@/lib/mpgf/public-goods-cg-vqaf";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseAny = Awaited<ReturnType<typeof createClient>> & {
  from: (table: string) => any;
};

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hashScopedValue(scope: string, value: string) {
  return `sha256:${createHash("sha256").update(JSON.stringify([scope, value])).digest("hex")}`;
}

function summarizeDbError(error: DbErrorLike) {
  return [error.code, error.message || error.details].filter(Boolean).join(": ") || "unknown database error";
}

function isMissingRelationError(error: DbErrorLike) {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

function isUniqueViolationError(error: DbErrorLike) {
  return error.code === "23505";
}

function strengthBpsField(
  record: Record<string, unknown>,
  signalType: MpgfPublicGoodsSupportSignal["signalType"],
) {
  const value = Number(record.strengthBps);

  if (Number.isFinite(value)) {
    return Math.max(0, Math.min(10_000, Math.floor(value)));
  }

  return defaultMpgfPublicGoodsSupportStrengthBps(signalType);
}

async function persistSupportSignal(signal: MpgfPublicGoodsSupportSignal, profileId: string) {
  if (!hasSupabaseEnv()) {
    return {
      status: "not_configured" as const,
      message: "Supabase is not configured; support signal was validated but not persisted.",
    };
  }

  const supabase = (await createClient()) as SupabaseAny;
  const row = {
    id: signal.id,
    round_id: signal.roundId,
    campaign_id: signal.campaignId,
    profile_id: profileId,
    user_ref_hash: signal.userRefHash,
    moral_cluster_hash: hashScopedValue("mpgf-cg-vqaf-moral-cluster", signal.moralCluster),
    signal_type: signal.signalType,
    strength_bps: signal.strengthBps,
    private_by_default: true,
    counts_for_common_ground: signal.countsForCommonGround,
    no_global_moral_ranking: true,
    calc_hash: signal.calcHash,
    created_at: signal.createdAt,
  };
  const inserted = await supabase
    .from("mpgf_support_signals")
    .insert(row)
    .select("id, created_at")
    .single();

  if (!inserted.error) {
    return {
      status: "inserted" as const,
      id: String(inserted.data.id),
      createdAt: String(inserted.data.created_at),
    };
  }

  if (isUniqueViolationError(inserted.error)) {
    const existing = await supabase
      .from("mpgf_support_signals")
      .select("id, created_at")
      .eq("round_id", signal.roundId)
      .eq("campaign_id", signal.campaignId)
      .eq("user_ref_hash", signal.userRefHash)
      .single();

    if (existing.error) {
      throw new Error(`Could not replay MPGF support signal: ${summarizeDbError(existing.error)}`);
    }

    return {
      status: "already_recorded" as const,
      id: String(existing.data.id),
      createdAt: String(existing.data.created_at),
    };
  }

  if (isMissingRelationError(inserted.error)) {
    throw new Error(
      `MPGF support-signal table is unavailable: ${summarizeDbError(inserted.error)}. Apply 20260601_mpgf_cg_vqaf_core.sql.`,
    );
  }

  throw new Error(`Could not persist MPGF support signal: ${summarizeDbError(inserted.error)}`);
}

async function recordSupportSignalAnalytics(signal: MpgfPublicGoodsSupportSignal, userId: string) {
  try {
    const result = await recordMpgfPublicGoodsAnalyticsEvent({
      eventType: "support_signal_recorded",
      userId,
      campaignId: signal.campaignId,
      eventJson: {
        surface: "mpgf_participant_action",
        supportSignalMode: signal.countsForCommonGround ? "common_ground_support" : "dissent_review_requested",
        supportSignalState: "signal_only",
        privateByDefault: true,
        publicAggregationOnly: true,
      },
    });

    return {
      status: result.status,
      warning: result.warning,
    };
  } catch (error) {
    return {
      status: "not_configured" as const,
      warning: error instanceof Error ? error.message : "Could not record privacy-safe support-signal analytics.",
    };
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const contract = getMpgfPublicGoodsSupportSignalContractApi(roundId);

  if (!contract) {
    return NextResponse.json(
      { ok: false, error: "MPGF support-signal contract not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(contract, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to record an MPGF support signal." }, { status: 401 });
  }

  try {
    const { roundId } = await params;
    const contract = getMpgfPublicGoodsSupportSignalContractApi(roundId);

    if (!contract) {
      return NextResponse.json(
        { ok: false, error: "MPGF support-signal contract not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF support signals expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const signalType = stringField(record, "signalType");
    const moralCluster = stringField(record, "moralCluster");

    if (!isMpgfPublicGoodsSupportSignalType(signalType)) {
      throw new Error("MPGF support signal type is not supported.");
    }

    if (!isMpgfPublicGoodsMoralCluster(moralCluster)) {
      throw new Error("MPGF support signal moral cluster is not supported.");
    }

    const supportSignal = createMpgfPublicGoodsSupportSignal({
      campaignId: stringField(record, "campaignId"),
      userRef: viewer.authUser.id,
      moralCluster,
      signalType,
      strengthBps: strengthBpsField(record, signalType),
      createdAt: new Date().toISOString(),
    });
    const persistence = await persistSupportSignal(supportSignal, viewer.authUser.id);
    const analytics = await recordSupportSignalAnalytics(supportSignal, viewer.authUser.id);

    return NextResponse.json(
      {
        ok: true,
        supportSignal,
        persistence,
        analytics,
        currentState: "signal_only",
        nextStates: contract.collectiveActionStates,
        privacyPolicy: contract.privacyPolicy,
        privateByDefault: true,
        publicAggregationOnly: true,
        rawSupportReasonsExcluded: true,
        noGlobalMoralRanking: true,
        cgVqafReportPath: contract.cgVqafReportPath,
        pledgeIntentPath: `/api/mpgf/rounds/${roundId}/pledge-intents`,
      },
      { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not record MPGF support signal." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
