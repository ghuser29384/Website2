import { NextResponse } from "next/server";

import {
  BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
  buildBackgroundPairwiseSafetyPreferenceRow,
  evaluateBackgroundPairwiseSafetyPreference,
} from "@/lib/background-claim-safety";
import {
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PairwiseSafetyRow =
  Database["public"]["Tables"]["background_pairwise_safety_preferences"]["Row"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickBodyField(body: Record<string, unknown>, camelKey: string, snakeKey: string) {
  return body[camelKey] ?? body[snakeKey];
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function bucketCount(count: number | null | undefined) {
  if (!count) {
    return "none";
  }

  if (count === 1) {
    return "one";
  }

  return count <= 3 ? "two_to_three" : "four_plus";
}

async function staleDependentArtifacts({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const now = new Date().toISOString();
  const [briefResult, introResult, receiptResult, emailResult] = await Promise.all([
    supabase
      .from("background_opportunity_briefs")
      .update({
        delivery_state: "expired",
        generic_dependency_label: "stale_or_unavailable",
        review_status: "blocked",
        status: "expired",
        updated_at: now,
      })
      .eq("profile_id", userId)
      .in("status", ["open", "opened", "interested", "maybe_later", "packet_requested"])
      .select("id"),
    supabase
      .from("background_intro_packets")
      .update({
        contact_approval_status: "withdrawn",
        review_state: "changes_requested",
        reviewer_notes:
          "A participant safety preference changed. Re-run review from current consent records.",
        updated_at: now,
      })
      .eq("requester_profile_id", userId)
      .in("review_state", ["draft", "requested", "under_review", "approved"])
      .select("id"),
    supabase
      .from("background_delegate_receipts")
      .update({ status: "expired", updated_at: now })
      .eq("profile_id", userId)
      .eq("status", "active")
      .select("id"),
    supabase
      .from("email_outbox")
      .delete()
      .eq("profile_id", userId)
      .eq("provider", "background-networking")
      .select("id"),
  ]);

  const errors = [briefResult.error, introResult.error, receiptResult.error, emailResult.error]
    .filter(Boolean)
    .map((error) => error?.message ?? "Unknown safety preference invalidation error.");

  if (errors.length) {
    return {
      cacheState: "must_recompute",
      errors,
      introRequests: "unknown",
      opportunityBriefs: "unknown",
      queuedNotifications: "unknown",
      receipts: "unknown",
    };
  }

  return {
    cacheState: "must_recompute",
    introRequests: bucketCount(introResult.data?.length),
    opportunityBriefs: bucketCount(briefResult.data?.length),
    queuedNotifications: bucketCount(emailResult.data?.length),
    receipts: bucketCount(receiptResult.data?.length),
  };
}

function serializePairwiseSafetyResponse({
  dependentArtifactInvalidation,
  policyDecisionId,
  row,
  stateMutation,
}: {
  dependentArtifactInvalidation: Awaited<ReturnType<typeof staleDependentArtifacts>>;
  policyDecisionId: string;
  row: Pick<
    PairwiseSafetyRow,
    | "expires_at"
    | "id"
    | "preference_kind"
    | "purpose_code"
    | "safety_preference_version"
    | "scope_kind"
    | "scope_value_internal"
    | "state"
  >;
  stateMutation:
    | "pairwise_safety_preference_created"
    | "pairwise_safety_preference_updated";
}) {
  const safetyDecision = evaluateBackgroundPairwiseSafetyPreference({
    preference: row,
    purposeCode: row.purpose_code,
    scopeKind: row.scope_kind,
    scopeValueInternal: row.scope_value_internal,
  });

  return {
    dependentArtifactInvalidation,
    policyDecisionId,
    preferenceId: row.id,
    preferenceVersion: row.safety_preference_version,
    requesterSafeState: safetyDecision.requesterSafeState,
    schemaVersion: BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
    stateMutation,
  };
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_pairwise_safety_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited pairwise-safety writes do not update background matching suppression until the window resets.",
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const buildResult = buildBackgroundPairwiseSafetyPreferenceRow({
    createdFromEventKind: pickBodyField(
      body,
      "createdFromEventKind",
      "created_from_event_kind",
    ) as string | null | undefined,
    expiresAt: pickBodyField(body, "expiresAt", "expires_at") as
      | string
      | null
      | undefined,
    participantId: user.id,
    preferenceKind:
      stringField(pickBodyField(body, "preferenceKind", "preference_kind")) ||
      "do_not_match",
    purposeCode: pickBodyField(body, "purposeCode", "purpose_code") as
      | string
      | null
      | undefined,
    reasonCode: pickBodyField(body, "reasonCode", "reason_code") as
      | string
      | null
      | undefined,
    scopeKind: pickBodyField(body, "scopeKind", "scope_kind") as
      | string
      | null
      | undefined,
    scopeValueInternal:
      (pickBodyField(body, "scopeValueInternal", "scope_value_internal") as
        | string
        | null
        | undefined) ??
      (pickBodyField(body, "scopeValue", "scope_value") as string | null | undefined),
    state: pickBodyField(body, "state", "state") as string | null | undefined,
  });

  if (buildResult.errors.length || !buildResult.row) {
    return privateJson({ error: buildResult.errors.join(" ") }, 400);
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.pairwise_safety_preference.write",
    actorRole: "participant",
    idempotencyKey: `${user.id}:pairwise-safety:${buildResult.row.safety_preference_version}`,
    laneKey: "pairwise_safety_preferences",
    outputSchemaVersion: BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
    purposeCode: buildResult.row.purpose_code ?? "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  let existingQuery = supabase
    .from("background_pairwise_safety_preferences")
    .select("id")
    .eq("participant_id", user.id)
    .eq("preference_kind", buildResult.row.preference_kind)
    .eq("scope_kind", buildResult.row.scope_kind)
    .eq("scope_value_internal", buildResult.row.scope_value_internal);

  existingQuery = buildResult.row.purpose_code
    ? existingQuery.eq("purpose_code", buildResult.row.purpose_code)
    : existingQuery.is("purpose_code", null);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    return privateJson({ error: existingError.message }, 500);
  }

  const { data, error } = await supabase
    .from("background_pairwise_safety_preferences")
    .upsert(buildResult.row, {
      onConflict:
        "participant_id,preference_kind,scope_kind,scope_value_internal,purpose_code_scope",
    })
    .select(
      "id, preference_kind, purpose_code, safety_preference_version, scope_kind, scope_value_internal, state, expires_at",
    )
    .maybeSingle();

  if (error || !data) {
    return privateJson(
      { error: error?.message ?? "Unable to record pairwise safety preference." },
      500,
    );
  }

  const dependentArtifactInvalidation = await staleDependentArtifacts({
    supabase,
    userId: user.id,
  });

  if ("errors" in dependentArtifactInvalidation) {
    return privateJson(
      {
        error:
          "Pairwise safety preference was updated, but dependent artifact invalidation was incomplete.",
        dependentArtifactInvalidation,
      },
      500,
    );
  }

  return privateJson(
    serializePairwiseSafetyResponse({
      dependentArtifactInvalidation,
      policyDecisionId: policyDecision.policyDecisionId,
      row: data,
      stateMutation: existing
        ? "pairwise_safety_preference_updated"
        : "pairwise_safety_preference_created",
    }),
    existing ? 200 : 201,
  );
}
