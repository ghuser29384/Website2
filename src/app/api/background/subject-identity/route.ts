import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import {
  BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
  bucketBackgroundSubjectIdentityInvalidationCount,
  buildBackgroundSubjectIdentityProfileRow,
  isBackgroundNonIndividualSubject,
} from "@/lib/background-subject-identity";
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

type SubjectIdentityRow =
  Database["public"]["Tables"]["background_subject_identity_profiles"]["Row"];

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

function pickBodyField(body: Record<string, unknown>, camelKey: string, snakeKey: string) {
  return body[camelKey] ?? body[snakeKey];
}

async function hasCollectiveAdminAuthority({
  collectiveId,
  supabase,
  userId,
}: {
  collectiveId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  if (!collectiveId) {
    return false;
  }

  const { data, error } = await supabase
    .from("collective_members")
    .select("role, status, permissions")
    .eq("collective_id", collectiveId)
    .eq("profile_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return (
    data.role === "owner" ||
    data.role === "admin" ||
    data.permissions.includes("approve_source_summary") ||
    data.permissions.includes("edit_broad_preview")
  );
}

async function staleDependentArtifacts({
  changed,
  supabase,
  userId,
}: {
  changed: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  if (!changed) {
    return {
      cacheState: "unchanged",
      introRequests: "unchanged",
      opportunityBriefs: "unchanged",
      partnerOutputs: "unchanged",
      policyDecisions: "unchanged",
      queuedNotifications: "unchanged",
      receipts: "unchanged",
    };
  }

  const now = new Date().toISOString();
  const [
    briefResult,
    introResult,
    receiptResult,
    emailResult,
  ] = await Promise.all([
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
          "Subject identity changed. Re-run review from current authority and consent records.",
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
    .map((error) => error?.message ?? "Unknown subject-identity invalidation error.");

  if (errors.length) {
    return {
      cacheState: "must_recompute",
      errors,
      introRequests: "unknown",
      opportunityBriefs: "unknown",
      partnerOutputs: "must_recompute",
      policyDecisions: "must_recompute",
      queuedNotifications: "unknown",
      receipts: "unknown",
    };
  }

  return {
    cacheState: "must_recompute",
    introRequests: bucketBackgroundSubjectIdentityInvalidationCount(
      introResult.data?.length ?? null,
    ),
    opportunityBriefs: bucketBackgroundSubjectIdentityInvalidationCount(
      briefResult.data?.length ?? null,
    ),
    partnerOutputs: "must_recompute",
    policyDecisions: "must_recompute",
    queuedNotifications: bucketBackgroundSubjectIdentityInvalidationCount(
      emailResult.data?.length ?? null,
    ),
    receipts: bucketBackgroundSubjectIdentityInvalidationCount(
      receiptResult.data?.length ?? null,
    ),
  };
}

function serializeSubjectIdentityResponse({
  dependentArtifactInvalidation,
  policyDecisionId,
  row,
  stateMutation,
}: {
  dependentArtifactInvalidation: Awaited<ReturnType<typeof staleDependentArtifacts>>;
  policyDecisionId: string;
  row: Pick<
    SubjectIdentityRow,
    | "authority_expires_at"
    | "automation_disclosure_state"
    | "id"
    | "representative_authority_state"
    | "sanitized_subject_label"
    | "subject_identity_version"
    | "subject_kind"
  >;
  stateMutation: "subject_identity_created" | "subject_identity_updated" | "subject_identity_unchanged";
}) {
  return {
    authorityExpiresAt: row.authority_expires_at,
    automationDisclosureRequired:
      row.subject_kind === "automated_agent" || row.subject_kind === "service_account",
    automationDisclosureState: row.automation_disclosure_state,
    dependentArtifactInvalidation,
    identityDetailDisclosure: "withheld_until_field_grant",
    policyDecisionId,
    representativeAuthorityState: row.representative_authority_state,
    sanitizedSubjectLabel: row.sanitized_subject_label,
    schemaVersion: BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
    stateMutation,
    subjectIdentityId: row.id,
    subjectIdentityVersion: row.subject_identity_version,
    subjectKind: row.subject_kind,
  };
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_subject_identity_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited subject-identity writes do not update matching authority until the window resets.",
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

  const subjectKind = stringField(pickBodyField(body, "subjectKind", "subject_kind"));
  const humanAccountableOwnerId =
    stringField(
      pickBodyField(body, "humanAccountableOwnerId", "human_accountable_owner_id"),
    ) || (subjectKind && subjectKind !== "individual" ? user.id : null);
  const buildResult = buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: pickBodyField(body, "authorityExpiresAt", "authority_expires_at") as
      | string
      | null
      | undefined,
    automationDisclosureState: pickBodyField(
      body,
      "automationDisclosureState",
      "automation_disclosure_state",
    ) as string | null | undefined,
    humanAccountableOwnerId,
    participantId: user.id,
    representativeAuthorityScope:
      pickBodyField(
        body,
        "representativeAuthorityScope",
        "representative_authority_scope",
      ) ?? pickBodyField(body, "authorityScope", "authority_scope"),
    representativeAuthorityState: pickBodyField(
      body,
      "representativeAuthorityState",
      "representative_authority_state",
    ) as string | null | undefined,
    sanitizedSubjectLabel: pickBodyField(
      body,
      "sanitizedSubjectLabel",
      "sanitized_subject_label",
    ) as string | null | undefined,
    subjectKind,
  });

  if (buildResult.errors.length || !buildResult.row) {
    return privateJson({ error: buildResult.errors.join(" ") }, 400);
  }

  if (isBackgroundNonIndividualSubject(buildResult.row.subject_kind)) {
    const collectiveId = stringField(pickBodyField(body, "collectiveId", "collective_id"));
    const collectiveAdminAuthorized =
      buildResult.row.subject_kind === "collective"
        ? await hasCollectiveAdminAuthority({ collectiveId, supabase, userId: user.id })
        : false;

    if (!isAdminEmail(user.email) && !collectiveAdminAuthorized) {
      return privateJson(
        {
          error:
            "Operator or collective-admin authorization is required for non-individual subject identity records.",
        },
        403,
      );
    }
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.subject_identity.update",
    actorRole: isAdminEmail(user.email) ? "admin" : "participant",
    idempotencyKey: `${user.id}:subject-identity:${buildResult.row.subject_identity_version}`,
    laneKey: "subject_identity",
    outputSchemaVersion: BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const { data: existing, error: existingError } = await supabase
    .from("background_subject_identity_profiles")
    .select("id, subject_identity_version")
    .eq("participant_id", user.id)
    .maybeSingle();

  if (existingError) {
    return privateJson({ error: existingError.message }, 500);
  }

  const changed = existing?.subject_identity_version !== buildResult.row.subject_identity_version;

  const { data, error } = await supabase
    .from("background_subject_identity_profiles")
    .upsert(buildResult.row, { onConflict: "participant_id" })
    .select(
      "id, subject_kind, sanitized_subject_label, representative_authority_state, automation_disclosure_state, authority_expires_at, subject_identity_version",
    )
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to update subject identity." }, 500);
  }

  const dependentArtifactInvalidation = await staleDependentArtifacts({
    changed,
    supabase,
    userId: user.id,
  });

  if ("errors" in dependentArtifactInvalidation) {
    return privateJson(
      {
        error:
          "Subject identity was updated, but dependent artifact invalidation was incomplete.",
        dependentArtifactInvalidation,
      },
      500,
    );
  }

  return privateJson(
    serializeSubjectIdentityResponse({
      dependentArtifactInvalidation,
      policyDecisionId: policyDecision.policyDecisionId,
      row: data,
      stateMutation: !existing
        ? "subject_identity_created"
        : changed
          ? "subject_identity_updated"
          : "subject_identity_unchanged",
    }),
    !existing ? 201 : 200,
  );
}
