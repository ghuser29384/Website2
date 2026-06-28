import { NextResponse } from "next/server";

import {
  buildBackgroundOpportunityFeedbackRow,
  getOpportunityBriefStatusForFeedback,
  isBackgroundOpportunityFeedbackPairAllowed,
  normalizeBackgroundOpportunityFeedbackOutcome,
  normalizeBackgroundOpportunityFeedbackReason,
} from "@/lib/background-opportunity-feedback";
import { getOpportunityBriefDeliveryStateForFeedback } from "@/lib/background-opportunity-briefs";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_opportunity_feedback_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited opportunity feedback creates no state change until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  const reason =
    normalizeBackgroundOpportunityFeedbackReason(stringField(body.reason)) ??
    normalizeBackgroundOpportunityFeedbackReason(stringField(body.reasonCode));
  const requestedOutcome = normalizeBackgroundOpportunityFeedbackOutcome(stringField(body.outcome));
  const outcome =
    requestedOutcome ??
    (reason === "interested" ? "interested" : reason === "maybe_later" ? "maybe_later" : "dismissed");

  if (!reason) {
    return privateJson({ error: "Choose a supported opportunity feedback reason." }, 400);
  }

  if (
    !isBackgroundOpportunityFeedbackPairAllowed({
      outcome,
      reasonCode: reason,
    })
  ) {
    return privateJson({ error: "Choose a supported opportunity feedback reason." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: brief, error: briefError } = await supabase
    .from("background_opportunity_briefs")
    .select("id, delivery_state, expires_at, match_id, purpose_code, purpose_policy_version, review_status, status")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (briefError || !brief) {
    return privateJson({ error: briefError?.message ?? "Opportunity brief was not found." }, 404);
  }

  if (
    brief.review_status === "blocked" ||
    brief.delivery_state === "expired" ||
    (brief.expires_at && Date.parse(brief.expires_at) <= Date.now()) ||
    ["dismissed", "expired", "muted"].includes(brief.status ?? "")
  ) {
    return privateJson({ error: "This opportunity brief is stale or no longer actionable." }, 409);
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.opportunity_feedback.record",
    actorRole: "participant",
    idempotencyKey: `${user.id}:${brief.id}:${outcome}:${reason}`,
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-feedback-response-v1",
    purposeCode: brief.purpose_code ?? "moral_trade_offer",
    purposePolicyVersion: brief.purpose_policy_version ?? BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const feedback = buildBackgroundOpportunityFeedbackRow({
    matchId: brief.match_id,
    opportunityBriefId: brief.id,
    outcome,
    profileId: user.id,
    reasonCode: reason,
  });
  const now = new Date().toISOString();
  const { error: feedbackError } = await supabase
    .from("background_match_feedback")
    .upsert({ ...feedback, updated_at: now }, { onConflict: "profile_id,opportunity_brief_id" });

  if (feedbackError) {
    return privateJson({ error: feedbackError.message }, 500);
  }

  const { error: updateError } = await supabase
    .from("background_opportunity_briefs")
    .update({
      delivery_state: getOpportunityBriefDeliveryStateForFeedback(outcome),
      feedback_reason: reason,
      seen_at: now,
      status: getOpportunityBriefStatusForFeedback(outcome),
    })
    .eq("id", brief.id)
    .eq("profile_id", user.id);

  if (updateError) {
    return privateJson({ error: updateError.message }, 500);
  }

  return privateJson({
    ok: true,
    outreachSent: false,
    policyDecisionId: policyDecision.policyDecisionId,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_opportunity_briefs_enabled"),
    stateMutation: "opportunity_feedback_recorded",
  });
}
