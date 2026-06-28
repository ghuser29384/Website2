import { NextResponse } from "next/server";

import {
  bucketBackgroundPrivateOverlapCount,
  buildBackgroundPrivateOverlapReceiptPayload,
  evaluateBackgroundPrivateOverlapPilotGate,
  validateBackgroundPrivateOverlapCheckInput,
} from "@/lib/background-private-overlap";
import {
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
} from "@/lib/background-phase-gates";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import { buildTransparencyReceiptEntry } from "@/lib/background-transparency-receipts";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

function currentEnvironment(): "development" | "preview" | "production" | "test" {
  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

function envEnabled(name: string) {
  return process.env[name] === "true";
}

async function appendOverlapReceipt({
  actorScope,
  eventType = "background_private_overlap_check",
  redactedPayload,
  supabase,
}: {
  actorScope: string;
  eventType?: string;
  redactedPayload: Record<string, unknown>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: previous } = await supabase
    .from("transparency_receipts")
    .select("entry_hash")
    .eq("actor_scope", actorScope)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const receipt = buildTransparencyReceiptEntry({
    actorScope,
    eventType,
    previousEntryHash: previous?.entry_hash ?? null,
    redactedPayload,
  });
  const { data, error } = await supabase
    .from("transparency_receipts")
    .insert(receipt)
    .select("id, seq")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to append transparency receipt.");
  }

  return data;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_private_overlap_check",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited private-overlap checks create no receipt or overlap result until the window resets.",
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

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.private_overlap.check",
    actorRole: "participant",
    idempotencyKey: `${user.id}:private-overlap-check`,
    laneKey: "private_overlap_crypto",
    outputSchemaVersion: "background-disabled-lane-response-v1",
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const validation = validateBackgroundPrivateOverlapCheckInput({
    counterpartyId: stringField(body.counterpartyId ?? body.counterparty_id),
    freeText: body.freeText ?? body.free_text,
    namespace: stringField(body.namespace),
    rawTags: body.rawTags ?? body.raw_tags ?? body.tags,
    stage: stringField(body.stage),
  });
  const gate = evaluateBackgroundPrivateOverlapPilotGate({
    adminFeatureFlagEnabled: envEnabled("BACKGROUND_PRIVATE_OVERLAP_PILOT_ENABLED"),
    cryptographicReviewApproved: envEnabled("BACKGROUND_PRIVATE_OVERLAP_CRYPTO_REVIEW_APPROVED"),
    dpiaApproved: envEnabled("BACKGROUND_PRIVATE_OVERLAP_DPIA_APPROVED"),
    environment: currentEnvironment(),
    externalReviewApproved: envEnabled("BACKGROUND_PRIVATE_OVERLAP_EXTERNAL_REVIEW_APPROVED"),
    namespace: validation.namespace ?? undefined,
    requestedTags: validation.blockers.includes("raw_tag_input_rejected")
      ? []
      : ["stored_blinded_token"],
    threatModelApproved: envEnabled("BACKGROUND_PRIVATE_OVERLAP_THREAT_MODEL_APPROVED"),
  });
  const blockers = [...validation.blockers, ...gate.blockers];
  const actorScope = `profile:${user.id}`;

  if (blockers.length || !validation.namespace) {
    const receipt = await appendOverlapReceipt({
      actorScope,
      redactedPayload: buildBackgroundPrivateOverlapReceiptPayload({
        blockers,
        namespace: validation.namespace,
        stage: validation.stage,
      }),
      supabase,
    });

    return privateJson(
      {
        blockers,
        receiptId: receipt.id,
        resultBucket: "blocked",
        rollout: serializeBackgroundNetworkingRolloutSurface("background_opportunity_briefs_enabled"),
        stateMutation: "private_overlap_check_blocked_receipted",
      },
      403,
    );
  }

  let service;

  try {
    service = createServiceClient();
  } catch {
    const receipt = await appendOverlapReceipt({
      actorScope,
      redactedPayload: buildBackgroundPrivateOverlapReceiptPayload({
        blockers: ["service_role_required_for_blinded_overlap"],
        namespace: validation.namespace,
        stage: validation.stage,
      }),
      supabase,
    });

    return privateJson(
      {
        blockers: ["service_role_required_for_blinded_overlap"],
        receiptId: receipt.id,
        resultBucket: "blocked",
        stateMutation: "private_overlap_check_blocked_receipted",
      },
      503,
    );
  }

  const now = new Date().toISOString();
  const [requesterResult, counterpartyResult] = await Promise.all([
    service
      .from("background_private_overlap_tags")
      .select("blinded_token")
      .eq("profile_id", user.id)
      .eq("tag_namespace", validation.namespace)
      .gt("expiry_at", now),
    service
      .from("background_private_overlap_tags")
      .select("blinded_token")
      .eq("profile_id", validation.counterpartyId)
      .eq("tag_namespace", validation.namespace)
      .gt("expiry_at", now),
  ]);

  if (requesterResult.error || counterpartyResult.error) {
    return privateJson(
      {
        error:
          requesterResult.error?.message ??
          counterpartyResult.error?.message ??
          "Unable to evaluate overlap.",
      },
      500,
    );
  }

  const requesterTokens = new Set((requesterResult.data ?? []).map((row) => String(row.blinded_token)));
  const overlapCount = (counterpartyResult.data ?? []).filter((row) =>
    requesterTokens.has(String(row.blinded_token)),
  ).length;
  const resultBucket = bucketBackgroundPrivateOverlapCount(overlapCount);
  const receipt = await appendOverlapReceipt({
    actorScope,
    redactedPayload: buildBackgroundPrivateOverlapReceiptPayload({
      namespace: validation.namespace,
      resultBucket,
      stage: validation.stage,
    }),
    supabase,
  });
  const { data: checkRow, error: checkError } = await supabase
    .from("background_private_overlap_checks")
    .insert({
      counterparty_id: validation.counterpartyId,
      receipt_id: receipt.id,
      requester_id: user.id,
      result_bucket: resultBucket,
      stage: validation.stage,
      tag_namespace: validation.namespace,
    })
    .select("id")
    .maybeSingle();

  if (checkError || !checkRow) {
    return privateJson({ error: checkError?.message ?? "Unable to record overlap check." }, 500);
  }

  return privateJson({
    checkId: checkRow.id,
    receiptId: receipt.id,
    resultBucket,
    rawTagsRevealed: false,
    stateMutation: "private_overlap_check_receipted",
  });
}
