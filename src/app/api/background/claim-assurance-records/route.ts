import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import {
  BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
  buildBackgroundClaimAssuranceRecord,
  evaluateBackgroundClaimAssurance,
  findBackgroundClaimAssuranceTaxonomyEntry,
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

type ClaimAssuranceRow =
  Database["public"]["Tables"]["background_claim_assurance_records"]["Row"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArrayField(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : undefined;
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

function defaultExpiry(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function claimInfluenceState(decision: ReturnType<typeof evaluateBackgroundClaimAssurance>) {
  if (decision.allowed) {
    return "current_broad_assurance_only";
  }

  return decision.blockerCodes.includes("claim_assurance_taxonomy_disabled")
    ? "non_actionable_taxonomy_disabled"
    : "blocked_until_current_assurance";
}

function taxonomySnapshotState({
  decision,
  row,
}: {
  decision: ReturnType<typeof evaluateBackgroundClaimAssurance>;
  row: Pick<
    ClaimAssuranceRow,
    "claim_assurance_taxonomy_hash_snapshot" | "claim_assurance_taxonomy_version_snapshot"
  >;
}) {
  return decision.blockerCodes.includes("claim_assurance_taxonomy_snapshot_stale")
    ? "stale"
    : row.claim_assurance_taxonomy_hash_snapshot &&
        row.claim_assurance_taxonomy_version_snapshot
      ? "current"
      : "missing";
}

function serializeClaimAssuranceResponse({
  assuranceDecision,
  policyDecisionId,
  row,
  stateMutation,
}: {
  assuranceDecision: ReturnType<typeof evaluateBackgroundClaimAssurance>;
  policyDecisionId: string;
  row: Pick<
    ClaimAssuranceRow,
    | "assurance_version"
    | "claim_assurance_taxonomy_hash_snapshot"
    | "claim_assurance_taxonomy_version_snapshot"
    | "id"
  >;
  stateMutation: "claim_assurance_created" | "claim_assurance_updated";
}) {
  return {
    assuranceRecordId: row.id,
    assuranceVersion: row.assurance_version,
    claimInfluenceState: claimInfluenceState(assuranceDecision),
    policyDecisionId,
    safeLabel: assuranceDecision.safeLabel,
    schemaVersion: BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
    stateMutation,
    taxonomySnapshotState: taxonomySnapshotState({ decision: assuranceDecision, row }),
  };
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_claim_assurance_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited claim-assurance writes do not update background matching influence until the window resets.",
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

  const admin = isAdminEmail(user.email);
  const assuranceLevel =
    stringField(pickBodyField(body, "assuranceLevel", "assurance_level")) ||
    "self_attested";
  const reviewState =
    stringField(pickBodyField(body, "reviewState", "review_state")) || "pending";

  if (
    !admin &&
    (["operator_reviewed", "externally_verified"].includes(assuranceLevel) ||
      reviewState === "approved")
  ) {
    return privateJson(
      {
        error:
          "Operator review is required before a high-impact claim can be marked approved or externally verified.",
      },
      403,
    );
  }

  const buildResult = buildBackgroundClaimAssuranceRecord({
    allowedPurposeCodes:
      stringArrayField(pickBodyField(body, "allowedPurposeCodes", "allowed_purpose_codes")) ??
      ["moral_trade_offer"],
    allowedSurfaceKeys:
      stringArrayField(pickBodyField(body, "allowedSurfaceKeys", "allowed_surface_keys")) ??
      ["broad_profile"],
    assuranceLevel,
    broadClaimKey: pickBodyField(body, "broadClaimKey", "broad_claim_key") as
      | string
      | null
      | undefined,
    claimKind: pickBodyField(body, "claimKind", "claim_kind") as
      | string
      | null
      | undefined,
    evidenceState:
      stringField(pickBodyField(body, "evidenceState", "evidence_state")) || "none",
    expiresAt:
      stringField(pickBodyField(body, "expiresAt", "expires_at")) || defaultExpiry(180),
    participantId: user.id,
    redactedEvidenceSummary: pickBodyField(
      body,
      "redactedEvidenceSummary",
      "redacted_evidence_summary",
    ) as string | null | undefined,
    reviewState,
  });

  if (buildResult.errors.length || !buildResult.row) {
    return privateJson({ error: buildResult.errors.join(" ") }, 400);
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.claim_assurance.record",
    actorRole: admin ? "admin" : "participant",
    idempotencyKey: `${user.id}:claim-assurance:${buildResult.row.assurance_version}`,
    laneKey: "claim_assurance_records",
    outputSchemaVersion: BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const { data: existing, error: existingError } = await supabase
    .from("background_claim_assurance_records")
    .select("id")
    .eq("participant_id", user.id)
    .eq("claim_kind", buildResult.row.claim_kind)
    .eq("broad_claim_key", buildResult.row.broad_claim_key)
    .eq("assurance_version", buildResult.row.assurance_version)
    .maybeSingle();

  if (existingError) {
    return privateJson({ error: existingError.message }, 500);
  }

  const { data, error } = await supabase
    .from("background_claim_assurance_records")
    .upsert(buildResult.row, {
      onConflict: "participant_id,claim_kind,broad_claim_key,assurance_version",
    })
    .select(
      "id, allowed_purpose_bindings, allowed_surface_keys, assurance_level, assurance_version, broad_claim_key, claim_assurance_taxonomy_hash_snapshot, claim_assurance_taxonomy_version_snapshot, claim_kind, evidence_state, expires_at, review_state",
    )
    .maybeSingle();

  if (error || !data) {
    return privateJson(
      { error: error?.message ?? "Unable to record claim assurance." },
      500,
    );
  }

  const taxonomyEntry = findBackgroundClaimAssuranceTaxonomyEntry({
    broadClaimKey: data.broad_claim_key,
    claimKind: data.claim_kind,
  });
  const assuranceDecision = evaluateBackgroundClaimAssurance({
    purposeCode: "moral_trade_offer",
    record: data,
    surface: data.allowed_surface_keys[0] ?? "broad_profile",
    taxonomyEntry,
  });

  return privateJson(
    serializeClaimAssuranceResponse({
      assuranceDecision,
      policyDecisionId: policyDecision.policyDecisionId,
      row: data,
      stateMutation: existing ? "claim_assurance_updated" : "claim_assurance_created",
    }),
    existing ? 200 : 201,
  );
}
