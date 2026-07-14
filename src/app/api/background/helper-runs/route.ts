import { NextResponse } from "next/server";

import {
  buildBackgroundHelperRunRow,
  normalizeBackgroundHelperRunTriggerKind,
} from "@/lib/background-helper-runs";
import {
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_helper_run_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited helper-run requests enqueue no background scan until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  const triggerKind = normalizeBackgroundHelperRunTriggerKind(
    stringField(body.triggerKind ?? body.trigger_kind) || "manual_scan",
  );

  if (!triggerKind) {
    return privateJson({ error: "Choose a supported helper-run trigger kind." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const row = buildBackgroundHelperRunRow({
    profileId: user.id,
    query: isRecord(body.query) ? body.query : {},
    triggerKind,
    windowKey: stringField(body.windowKey ?? body.window_key) || new Date().toISOString().slice(0, 10),
  });
  const purposeCode = stringField(body.purposeCode ?? body.purpose_code) || "moral_trade_offer";
  const purposePolicyVersion =
    stringField(body.purposePolicyVersion ?? body.purpose_policy_version) ||
    BACKGROUND_PURPOSE_POLICY_VERSION;
  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.helper_run.enqueue",
    actorRole: "participant",
    idempotencyKey: row.query_fingerprint,
    laneKey: "helper_runs",
    outputSchemaVersion: "background-helper-run-response-v1",
    purposeCode,
    purposePolicyVersion,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const { data, error } = await supabase
    .from("background_helper_runs")
    .upsert(row, { onConflict: "profile_id,trigger_kind,query_fingerprint,state" })
    .select("id, state, next_run_at, query_fingerprint")
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to queue helper run." }, 500);
  }

  return privateJson(
    {
      runId: data.id,
      state: data.state,
      nextRunAt: data.next_run_at,
      queryFingerprint: data.query_fingerprint,
      rawQueryPersisted: false,
      autonomousOutreach: false,
      policyDecisionId: policyDecision.policyDecisionId,
      rollout: serializeBackgroundNetworkingRolloutSurface("background_opportunity_briefs_enabled"),
      stateMutation: "helper_run_queued",
    },
    202,
  );
}
