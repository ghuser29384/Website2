import { NextResponse } from "next/server";

import { GET as getReciprocalLiveNow } from "@/app/api/live-now/route";
import { getViewer } from "@/lib/app-data";
import {
  applyParetoLearningToLiveNowPayload,
  type ParetoRuntimePayload,
} from "@/lib/pareto-feed-runtime";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function safeCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

async function attachExternalCandidateDiagnostics(
  payload: ParetoRuntimePayload,
  profileId: string,
) {
  const service = createServiceClient() as any;
  const now = new Date().toISOString();
  const count = async (query: any) => {
    try {
      const result = await query;
      return result.error ? 0 : safeCount(result.count);
    } catch {
      return 0;
    }
  };

  const [
    offerTotal,
    offerOwned,
    redirectPoolTotal,
    redirectPoolOwned,
    donationUpgradeTotal,
    donationUpgradeOwned,
    publicGoodsTotal,
    publicGoodsOwned,
  ] = await Promise.all([
    count(
      service
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("workflow_status", "published")
        .not("published_at", "is", null)
        .is("closed_at", null)
        .is("deleted_at", null),
    ),
    count(
      service
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", profileId)
        .eq("status", "open")
        .eq("workflow_status", "published")
        .not("published_at", "is", null)
        .is("closed_at", null)
        .is("deleted_at", null),
    ),
    count(
      service
        .from("donation_offset_pools")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "assurance_pending"])
        .eq("moderation_status", "clear")
        .or(`assurance_deadline_at.is.null,assurance_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("donation_offset_pools")
        .select("id", { count: "exact", head: true })
        .eq("created_by", profileId)
        .in("status", ["open", "assurance_pending"])
        .eq("moderation_status", "clear")
        .or(`assurance_deadline_at.is.null,assurance_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("conditional_redirect_offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("livemode", true)
        .gt("deadline_at", now),
    ),
    count(
      service
        .from("conditional_redirect_offers")
        .select("id", { count: "exact", head: true })
        .eq("creator_profile_id", profileId)
        .eq("status", "open")
        .eq("livemode", true)
        .gt("deadline_at", now),
    ),
    count(
      service
        .from("mpgf_pool_proposals")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved_as_candidate")
        .not("public_goods_threshold_amount_cents", "is", null)
        .or(`public_goods_deadline_at.is.null,public_goods_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("mpgf_pool_proposals")
        .select("id", { count: "exact", head: true })
        .eq("proposer_id", profileId)
        .eq("status", "approved_as_candidate")
        .not("public_goods_threshold_amount_cents", "is", null)
        .or(`public_goods_deadline_at.is.null,public_goods_deadline_at.gt.${now}`),
    ),
  ]);

  const mechanismInventory = {
    bilateral_and_redirect_offers: offerTotal,
    donation_redirect_pools: redirectPoolTotal,
    donation_upgrades: donationUpgradeTotal,
    moral_public_goods_pools: publicGoodsTotal,
  };
  const platformInventoryCount = Object.values(mechanismInventory).reduce(
    (sum, value) => sum + value,
    0,
  );
  const viewerOwnedExcludedCount =
    offerOwned + redirectPoolOwned + donationUpgradeOwned + publicGoodsOwned;
  const externalInventoryCount = Math.max(
    0,
    platformInventoryCount - viewerOwnedExcludedCount,
  );
  const existingDiagnostics =
    payload.feedDiagnostics && typeof payload.feedDiagnostics === "object"
      ? (payload.feedDiagnostics as Record<string, unknown>)
      : {};

  return {
    ...payload,
    feedDiagnostics: {
      ...existingDiagnostics,
      platformInventoryCount,
      viewerOwnedExcludedCount,
      externalInventoryCount,
      evaluatedCandidateCount: safeCount(existingDiagnostics.checkedInventoryCount),
      mechanismInventory,
      inventorySemanticsVersion: "external-candidate-funnel-v1",
    },
  } satisfies ParetoRuntimePayload;
}

export async function GET() {
  const baseResponse = await getReciprocalLiveNow();
  if (!baseResponse.ok) return baseResponse;

  let payload: ParetoRuntimePayload;
  try {
    payload = (await baseResponse.json()) as ParetoRuntimePayload;
  } catch {
    return baseResponse;
  }

  if (payload.authenticated !== true || !Array.isArray(payload.recommendations)) {
    return privateJson(payload);
  }

  const viewer = await getViewer();
  if (!viewer) return privateJson(payload);

  const diagnosed = await attachExternalCandidateDiagnostics(
    payload,
    viewer.authUser.id,
  );

  try {
    const enriched = await applyParetoLearningToLiveNowPayload({
      payload: diagnosed,
      profileId: viewer.authUser.id,
    });
    return privateJson(enriched);
  } catch (error) {
    console.error("[pareto-feed] Runtime enrichment failed safely", {
      message: error instanceof Error ? error.message : String(error),
    });
    return privateJson({
      ...diagnosed,
      learningDiagnostics: {
        activeModelKey: "pareto-heuristic-v1",
        candidateModelKey: null,
        coldStart: true,
        directMatchesRandomized: false,
        exposureWriteStatus: "failed",
        experiment: {
          affectedCandidateKey: null,
          arm: "not_assigned",
          assignmentProbability: 0.05,
          enabled: false,
          jointPropensity: 0,
          stableBucket: 0,
          stoppedByGuardrail: false,
        },
        guardrailReasons: ["runtime_enrichment_unavailable"],
        mode: "heuristic",
        objective: "pareto_safe_additionality",
        privateProfileProseProcessed: false,
        requestId: "",
        sensitiveAttributesUsed: false,
      },
    });
  }
}
