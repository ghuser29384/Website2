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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
      stances: stancesField(body.stances),
    });

    return NextResponse.json(
      {
        ...preview,
        stateMutation: preview.stateMutation,
        paymentCaptureAllowed: preview.paymentCaptureAllowed,
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
        stances: stancesField(body.stances),
      });

      return NextResponse.json(
        {
          ...preview,
          stateMutation: preview.stateMutation,
          paymentCaptureAllowed: preview.paymentCaptureAllowed,
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
