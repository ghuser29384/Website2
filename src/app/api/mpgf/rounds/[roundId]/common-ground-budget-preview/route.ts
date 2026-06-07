import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { loadMpgfPublicGoodsAllocationContext } from "@/lib/mpgf/public-goods-allocation-results";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfCommonGroundBudgetPreview,
  type MpgfCommonGroundBudgetBaselineConfidence,
  type MpgfCommonGroundBudgetFallbackRule,
  type MpgfCommonGroundBudgetPeriod,
  type MpgfCommonGroundBudgetStance,
  type MpgfCommonGroundBudgetUnroutablePolicy,
} from "@/lib/mpgf/public-goods-common-ground-budget";
import {
  buildMpgfPublicGoodsCoalitionRoutingReport,
  getMpgfPublicGoodsCoalitionRoutingReportApi,
} from "@/lib/mpgf/public-goods-coalition-routing";
import { loadMpgfPublicGoodsSupportSignalsForRound } from "@/lib/mpgf/public-goods-support-signal-persistence";
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

type CommonGroundBudgetPreview = ReturnType<typeof buildMpgfCommonGroundBudgetPreview>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);

  return Number.isFinite(value) ? Math.floor(value) : null;
}

function booleanField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return value === true || value === "true" || value === "on";
}

function summarizeDbError(error: DbErrorLike) {
  return [error.code, error.message || error.details].filter(Boolean).join(": ") || "unknown database error";
}

function isMissingRelationError(error: DbErrorLike) {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

function budgetPeriodField(record: Record<string, unknown>): MpgfCommonGroundBudgetPeriod {
  return stringField(record, "budgetPeriod") === "round_limited" ? "round_limited" : "monthly";
}

function baselineConfidenceField(record: Record<string, unknown>): MpgfCommonGroundBudgetBaselineConfidence {
  const value = stringField(record, "baselineConfidenceLevel");

  return value === "low" || value === "high" ? value : "medium";
}

function fallbackRuleField(record: Record<string, unknown>): MpgfCommonGroundBudgetFallbackRule {
  const value = stringField(record, "fallbackRule");

  return value === "reroute" || value === "release_hold" ? value : "carry_forward";
}

function unroutablePolicyField(record: Record<string, unknown>): MpgfCommonGroundBudgetUnroutablePolicy {
  const value = stringField(record, "unroutableBudgetPolicy");

  return value === "release_hold" || value === "manual_review" ? value : "carry_forward";
}

function stanceField(value: unknown): MpgfCommonGroundBudgetStance {
  return value === "strong" || value === "dissent" || value === "abstain" ? value : "weak";
}

function stancesField(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((record, index) => ({
    campaignId: stringField(record, "campaignId"),
    stance: stanceField(record.stance),
    maxAllocCents: numberField(record, "maxAllocCents"),
    maxAllocPctBps: numberField(record, "maxAllocPctBps"),
    rankOrder: numberField(record, "rankOrder") ?? index + 1,
    redactedNote: stringField(record, "redactedNote"),
  }));
}

function redactedNoteHashesByCampaign(stances: ReturnType<typeof stancesField>) {
  return new Map(
    stances
      .filter((stance) => stance.campaignId && stance.redactedNote)
      .map((stance) => [
        stance.campaignId,
        hashValue(["mpgf-common-ground-redacted-note", stance.redactedNote]),
      ]),
  );
}

async function persistCommonGroundBudgetPreview({
  preview,
  profileId,
  roundId,
  stances,
}: {
  preview: CommonGroundBudgetPreview;
  profileId: string;
  roundId: string;
  stances: ReturnType<typeof stancesField>;
}) {
  if (!preview.participantConfirmationHash || preview.activationState !== "ready_for_confirmation") {
    return {
      status: "not_saved_confirmation_required" as const,
      stateMutation: "none_preview_only" as const,
      message:
        "Budget preview was not saved because participant surplus confirmation or a non-blocking eligible project set is still required.",
      savedBudgetId: null,
      savedStanceCount: 0,
      paymentCaptureAllowed: false as const,
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      status: "not_configured" as const,
      stateMutation: "none_preview_only" as const,
      message: "Supabase is not configured; Common Ground Budget preview was validated but not saved.",
      savedBudgetId: null,
      savedStanceCount: 0,
      paymentCaptureAllowed: false as const,
    };
  }

  const supabase = await createClient() as SupabaseAny;
  const userRefHash = hashValue(["mpgf-common-ground-budget-user-ref", profileId]);
  const budgetId = `mpgf-cg-budget-${hashValue(["mpgf-common-ground-budget", roundId, userRefHash]).slice(7, 19)}`;
  const redactedNoteHashes = redactedNoteHashesByCampaign(stances);
  const now = new Date().toISOString();
  const fallbackRule = {
    onProjectFailure: preview.fallbackRule,
    onAuthorizationExpiry: "reauthorize_near_capture",
    unroutableBudgetPolicy: preview.unroutableBudgetPolicy,
    fallbackEligibleProjectSetHash: preview.fallbackEligibleProjectSetHash,
    carryForwardAllowed: preview.unroutableBudgetPolicy === "carry_forward",
    paymentCaptureAllowed: false,
  };
  const budgetWrite = await supabase
    .from("mpgf_user_budgets")
    .upsert(
      {
        id: budgetId,
        round_id: roundId,
        profile_id: profileId,
        user_ref_hash: userRefHash,
        budget_period: preview.budgetPeriod,
        monthly_budget_cents: preview.budgetPeriod === "monthly" ? preview.maximumBudgetCents : null,
        round_budget_cents: preview.budgetPeriod === "round_limited" ? preview.maximumBudgetCents : null,
        total_budget_cents: preview.maximumBudgetCents,
        settlement_currency: preview.settlementCurrency,
        currency: preview.settlementCurrency,
        recurrence_rule: preview.budgetPeriod === "monthly" ? "FREQ=MONTHLY;INTERVAL=1" : null,
        external_payment_evidence_mode: "reviewed_manual_evidence_only",
        default_visibility: "private_aggregate_only",
        default_allocation_baseline: preview.defaultAllocationBaseline,
        baseline_confidence_level: preview.baselineConfidenceLevel,
        baseline_confidence_rationale: preview.baselineConfidenceRationale,
        participant_surplus_confirmation_required: true,
        participant_surplus_confirmed_at: now,
        eligible_project_set_hash: preview.eligibleProjectSetHash,
        eligible_pool_set_hash: preview.eligiblePoolSetHash,
        project_set_change_policy: preview.projectSetChangePolicy,
        fallback_reroute_policy_ref: preview.fallbackPolicy,
        fallback_eligible_project_set_hash: preview.fallbackEligibleProjectSetHash,
        unroutable_budget_policy: preview.unroutableBudgetPolicy,
        fallback_rule: fallbackRule,
        round_lock_confirmation_required: true,
        cancel_until: preview.cancelUntil,
        terms_snapshot_hash: preview.termsSnapshotHash,
        participant_confirmation_hash: preview.participantConfirmationHash,
        status: "active",
        no_global_moral_ranking: true,
        updated_at: now,
      },
      { onConflict: "round_id,user_ref_hash" },
    )
    .select("id")
    .single();

  if (budgetWrite.error) {
    const message = summarizeDbError(budgetWrite.error);

    if (isMissingRelationError(budgetWrite.error)) {
      throw new Error(`Common Ground Budget tables are unavailable: ${message}. Apply 20260604_mpgf_coalition_routing.sql.`);
    }

    throw new Error(`Could not save Common Ground Budget preview: ${message}`);
  }

  const stanceRows = preview.rows.map((row) => ({
    id: `mpgf-cg-stance-${hashValue([budgetWrite.data.id, row.campaignId]).slice(7, 19)}`,
    budget_id: String(budgetWrite.data.id),
    round_id: roundId,
    campaign_id: row.campaignId,
    bucket_id: null,
    profile_id: profileId,
    user_ref_hash: userRefHash,
    stance: row.stance,
    max_alloc_amount_cents: row.maxAllocCents,
    max_alloc_pct_bps: row.maxAllocPctBps,
    rank_order: row.rankOrder,
    redacted_note_hash: redactedNoteHashes.get(row.campaignId) ?? null,
    acceptable_counter_buckets: [],
    private_by_default: true,
    counts_for_common_ground: row.stance === "strong" || row.stance === "weak",
    no_global_moral_ranking: true,
  }));
  const stanceWrite = await supabase
    .from("mpgf_support_stances")
    .upsert(stanceRows, { onConflict: "id" });

  if (stanceWrite.error) {
    const message = summarizeDbError(stanceWrite.error);

    if (isMissingRelationError(stanceWrite.error)) {
      throw new Error(`Common Ground Budget stance table is unavailable: ${message}. Apply 20260604_mpgf_coalition_routing.sql.`);
    }

    throw new Error(`Could not save Common Ground Budget stances: ${message}`);
  }

  return {
    status: "saved_no_capture" as const,
    stateMutation: "common_ground_budget_preview_saved" as const,
    message: "Saved the no-capture Common Ground Budget preview and private project stances.",
    savedBudgetId: String(budgetWrite.data.id),
    savedStanceCount: stanceRows.length,
    paymentCaptureAllowed: false as const,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json(
      { ok: false, error: "Sign in to preview a Common Ground Budget." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Common Ground Budget preview expects a JSON object." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "Common Ground Budget preview expects a JSON object." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  const { roundId } = await params;
  const fallbackReport = getMpgfPublicGoodsCoalitionRoutingReportApi(roundId);
  const stances = stancesField(body.stances);
  const savePreview = booleanField(body, "savePreview");

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackReport) {
      return NextResponse.json(
        { ok: false, error: "MPGF round was not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const supportSignalState = await loadMpgfPublicGoodsSupportSignalsForRound(roundId);
    const coalitionRouting = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsCoalitionRoutingReport({
          campaigns: contextLoad.campaigns,
          round: contextLoad.round,
          matchPool: contextLoad.matchPool,
          supportSignals: supportSignalState.supportSignals ?? [],
        })
      : fallbackReport;

    if (!coalitionRouting) {
      return NextResponse.json(
        { ok: false, error: "MPGF coalition-routing report was not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const preview = buildMpgfCommonGroundBudgetPreview({
      roundId,
      roundLockTime: contextLoad.source === "database_round_context"
        ? contextLoad.round.endsAt
        : new Date(Date.now() + 7 * 86_400_000).toISOString(),
      projects: contextLoad.campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        thresholdAmountCents: campaign.thresholdAmountCents,
        thresholdSupporters: campaign.thresholdSupporters,
      })),
      coalitionRouting,
      budgetPeriod: budgetPeriodField(body),
      monthlyBudgetCents: numberField(body, "monthlyBudgetCents"),
      roundBudgetCents: numberField(body, "roundBudgetCents"),
      settlementCurrency: stringField(body, "settlementCurrency", "usd"),
      defaultAllocationBaseline: stringField(body, "defaultAllocationBaseline"),
      baselineConfidenceLevel: baselineConfidenceField(body),
      baselineConfidenceRationale: stringField(body, "baselineConfidenceRationale"),
      participantSurplusConfirmed: booleanField(body, "participantSurplusConfirmed"),
      fallbackRule: fallbackRuleField(body),
      unroutableBudgetPolicy: unroutablePolicyField(body),
      stances,
    });
    let persistence: Awaited<ReturnType<typeof persistCommonGroundBudgetPreview>> | {
      status: "preview_only";
      stateMutation: "none_preview_only";
      message: string;
      savedBudgetId: null;
      savedStanceCount: 0;
      paymentCaptureAllowed: false;
    };

    try {
      persistence = savePreview
        ? await persistCommonGroundBudgetPreview({
            preview,
            profileId: viewer.authUser.id,
            roundId,
            stances,
          })
        : {
            status: "preview_only" as const,
            stateMutation: "none_preview_only" as const,
            message: "Preview returned without saving. Set savePreview to true after explicit participant confirmation to save.",
            savedBudgetId: null,
            savedStanceCount: 0,
            paymentCaptureAllowed: false as const,
          };
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Could not save Common Ground Budget preview.",
          preview,
          stateMutation: "none_preview_only",
          paymentCaptureAllowed: false,
          persistence: {
            status: "failed_closed",
            stateMutation: "none_preview_only",
            savedBudgetId: null,
            savedStanceCount: 0,
            paymentCaptureAllowed: false,
          },
          roundSource: contextLoad.source,
          supportSignalSource: supportSignalState.source,
          warnings: [...contextLoad.warnings, ...supportSignalState.warnings],
        },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ...preview,
        stateMutation: preview.stateMutation,
        paymentCaptureAllowed: preview.paymentCaptureAllowed,
        persistence,
        releaseGateRequirementBundle: preview.releaseGateRequirementBundle,
        releaseGateRequirementBundleHash: preview.releaseGateRequirementBundleHash,
        policySnapshotBundleHash: preview.policySnapshotBundleHash,
        roundSource: contextLoad.source,
        supportSignalSource: supportSignalState.source,
        warnings: [...contextLoad.warnings, ...supportSignalState.warnings],
      },
      { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    if (fallbackReport) {
      const preview = buildMpgfCommonGroundBudgetPreview({
        roundId,
        roundLockTime: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        projects: fallbackReport.rows.map((row) => ({
          id: row.campaignId,
          title: row.campaignId.replaceAll("-", " "),
          thresholdAmountCents: row.thresholdAmountCents,
          thresholdSupporters: row.thresholdSupporters,
        })),
        coalitionRouting: fallbackReport,
        budgetPeriod: budgetPeriodField(body),
        monthlyBudgetCents: numberField(body, "monthlyBudgetCents"),
        roundBudgetCents: numberField(body, "roundBudgetCents"),
        settlementCurrency: stringField(body, "settlementCurrency", "usd"),
        defaultAllocationBaseline: stringField(body, "defaultAllocationBaseline"),
        baselineConfidenceLevel: baselineConfidenceField(body),
        baselineConfidenceRationale: stringField(body, "baselineConfidenceRationale"),
        participantSurplusConfirmed: booleanField(body, "participantSurplusConfirmed"),
        fallbackRule: fallbackRuleField(body),
        unroutableBudgetPolicy: unroutablePolicyField(body),
        stances,
      });

      return NextResponse.json(
        {
          ...preview,
          stateMutation: preview.stateMutation,
          paymentCaptureAllowed: preview.paymentCaptureAllowed,
          persistence: {
            status: "preview_only" as const,
            stateMutation: "none_preview_only" as const,
            message: "Preview fallback returned without saving because persisted round state could not be loaded.",
            savedBudgetId: null,
            savedStanceCount: 0,
            paymentCaptureAllowed: false as const,
          },
          releaseGateRequirementBundle: preview.releaseGateRequirementBundle,
          releaseGateRequirementBundleHash: preview.releaseGateRequirementBundleHash,
          policySnapshotBundleHash: preview.policySnapshotBundleHash,
          roundSource: "demo_fixture",
          supportSignalSource: "demo_fixture",
          warnings: [
            error instanceof Error
              ? `Could not load persisted Common Ground Budget state: ${error.message}`
              : "Could not load persisted Common Ground Budget state.",
          ],
        },
        { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not preview Common Ground Budget.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
