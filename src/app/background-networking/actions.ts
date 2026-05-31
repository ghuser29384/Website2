"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import {
  type BackgroundMfaActionState,
  normalizeBackgroundTotpCode,
} from "@/lib/background-account-security";
import { validateBackgroundConciergeAppealRequest } from "@/lib/background-concierge-appeals";
import { prepareRecordSensitiveTextFields } from "@/lib/background-field-encryption";
import {
  type BackgroundLocalDraftSyncResult,
  normalizeBackgroundLocalDraftBody,
} from "@/lib/background-local-drafts";
import { getBackgroundTokens } from "@/lib/background-networking";
import {
  buildBackgroundNotificationPreferenceRows,
  getDataRightRequestDueAt,
  validateBackgroundSelfServeDeletion,
  validateProfileDataRightRequest,
} from "@/lib/background-privacy-controls";
import { validateBackgroundSourcePermission } from "@/lib/background-source-permissions";
import { requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];
type SourceConnectionUpdate = Database["public"]["Tables"]["source_connections"]["Update"];
type ProfileSourceInsert = Database["public"]["Tables"]["profile_sources"]["Insert"];
type MatchConciergeRequestRow =
  Database["public"]["Tables"]["match_concierge_requests"]["Row"];

const DATA_RIGHT_REQUEST_STATUSES = [
  "open",
  "in_review",
  "fulfilled",
  "denied",
  "cancelled",
] as const;
type DataRightRequestStatus = (typeof DATA_RIGHT_REQUEST_STATUSES)[number];

function isDataRightRequestStatus(value: string): value is DataRightRequestStatus {
  return (DATA_RIGHT_REQUEST_STATUSES as readonly string[]).includes(value);
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readBoolean(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

function readRepeatedStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);

  redirect(`${target.pathname}${target.search}${target.hash}`);
}

async function collectMutationResult(
  failures: string[],
  label: string,
  mutation: PromiseLike<{ error: { message?: string } | null }>,
) {
  const result = await mutation;

  if (result.error) {
    failures.push(`${label}: ${result.error.message ?? "database error"}`);
  }
}

function normalizeSourceConnectionProvider(value: string): SourceConnectionInsert["provider"] {
  if (
    value === "social" ||
    value === "blog" ||
    value === "email" ||
    value === "calendar" ||
    value === "chat_history" ||
    value === "search_profile" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeSourceImportMode(value: string): SourceConnectionInsert["import_mode"] {
  if (value === "manual_paste" || value === "rss_pull" || value === "forwarded_note") {
    return value;
  }

  return "manual_review";
}

function normalizeSourceSyncFrequency(value: string): SourceConnectionInsert["sync_frequency"] {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "manual";
}

function normalizeSourceAccessStatus(value: string): SourceConnectionInsert["access_status"] {
  if (value === "connected" || value === "revoked" || value === "needs_review") {
    return value;
  }

  return "not_connected";
}

function parseOptionalTimestamp(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function saveBackgroundNotificationPreferencesAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const enabledKeys = new Set(readRepeatedStrings(formData, "enabled_preferences"));
  const rows = buildBackgroundNotificationPreferenceRows({
    enabledKeys,
    profileId: viewer.authUser.id,
  }).map((preference) => ({
    channel: preference.channel,
    digest_cadence: preference.digestCadence,
    enabled: preference.enabled,
    event_kind: preference.eventKind,
    profile_id: preference.profileId,
    updated_at: new Date().toISOString(),
  }));
  const supabase = await createClient();
  const { error } = await supabase.from("background_notification_preferences").upsert(rows, {
    onConflict: "profile_id,event_kind,channel",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not save notification preferences.");
  }

  const emailEnabled = rows.some((row) => row.channel === "email_digest" && row.enabled);
  const dashboardEnabled = rows.some((row) => row.channel === "in_app" && row.enabled);
  const { error: wishProfileError } = await supabase
    .from("wish_profiles")
    .update({
      notification_dashboard_enabled: dashboardEnabled,
      notification_email_enabled: emailEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", viewer.authUser.id);

  if (wishProfileError) {
    redirectWithMessage(returnTo, "error", "Notification preferences were saved, but the profile toggle was not updated.");
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Notification preferences saved.");
}

export async function createProfileDataRightRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const validation = validateProfileDataRightRequest({
    requestDetails: readOptional(formData, "request_details"),
    requestType: readOptional(formData, "request_type"),
    scope: readOptional(formData, "scope"),
  });

  if (validation.errors.length) {
    redirectWithMessage(returnTo, "error", validation.errors.join(" "));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profile_data_right_requests").insert({
    due_at: getDataRightRequestDueAt(),
    profile_id: viewer.authUser.id,
    request_details: validation.requestDetails,
    request_type: validation.requestType,
    scope: validation.scope,
  });

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not record the data-right request.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Data-right request recorded.");
}

export async function saveBackgroundSourceConnectionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const label = readOptional(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Connection label is required.");
  }

  const provider = normalizeSourceConnectionProvider(readOptional(formData, "provider"));
  const accessStatus = normalizeSourceAccessStatus(readOptional(formData, "access_status"));
  const accessScope = readOptional(formData, "access_scope");
  const consentNotes = readOptional(formData, "consent_notes");
  const permission = validateBackgroundSourcePermission({
    accessScope,
    accessStatus,
    aiShadowModeAllowed: readBoolean(formData, "ai_shadow_mode_allowed"),
    allowedFieldKeys: readRepeatedStrings(formData, "allowed_field_keys"),
    consentNotes,
    provider,
    rawIngestionAllowed: readBoolean(formData, "raw_ingestion_allowed"),
    retentionDays: readOptional(formData, "retention_days"),
  });

  if (permission.errors.length) {
    redirectWithMessage(returnTo, "error", permission.errors.join(" "));
  }

  let encryptedSourceConnectionFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedSourceConnectionFields = prepareRecordSensitiveTextFields({
      access_scope: accessScope,
      consent_notes: consentNotes,
      last_sync_summary: readOptional(formData, "last_sync_summary"),
    });
  } catch {
    redirectWithMessage(
      returnTo,
      "error",
      "Source connection notes cannot be saved until background field encryption is configured.",
    );
  }

  const payload: SourceConnectionInsert = {
    access_scope: encryptedSourceConnectionFields.plaintextFields.access_scope,
    access_status: accessStatus,
    ai_shadow_mode_allowed: permission.aiShadowModeAllowed,
    allowed_field_keys: permission.allowedFieldKeys,
    consent_notes: encryptedSourceConnectionFields.plaintextFields.consent_notes,
    import_mode: normalizeSourceImportMode(readOptional(formData, "import_mode")),
    label,
    last_import_item_count: Math.max(
      0,
      Math.min(10000, Number(readOptional(formData, "last_import_item_count")) || 0),
    ),
    last_imported_at: parseOptionalTimestamp(readOptional(formData, "last_imported_at")),
    last_sync_summary: encryptedSourceConnectionFields.plaintextFields.last_sync_summary,
    profile_id: viewer.authUser.id,
    provider,
    raw_ingestion_allowed: permission.rawIngestionAllowed,
    retention_expires_at: permission.retentionExpiresAt,
    sensitive_ciphertexts: encryptedSourceConnectionFields.ciphertexts,
    sensitive_encryption_version: encryptedSourceConnectionFields.version,
    sync_frequency: normalizeSourceSyncFrequency(readOptional(formData, "sync_frequency")),
    url: readOptional(formData, "url"),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("source_connections").insert(payload);

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    "Source connection permission recorded. Raw ingestion remains disabled.",
  );
}

export async function revokeBackgroundSourceConnectionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const connectionId = readOptional(formData, "source_connection_id");

  if (!connectionId) {
    redirectWithMessage(returnTo, "error", "Choose a source connection to revoke.");
  }

  const now = new Date().toISOString();
  const payload: SourceConnectionUpdate = {
    access_status: "revoked",
    ai_shadow_mode_allowed: false,
    allowed_field_keys: [],
    raw_ingestion_allowed: false,
    retention_expires_at: now,
    sync_frequency: "manual",
    updated_at: now,
  };
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("source_connections")
    .update(payload, { count: "exact" })
    .eq("id", connectionId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  if (!count) {
    redirectWithMessage(returnTo, "error", "Source connection was not found.");
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Source permission revoked for future matching.");
}

export async function syncBackgroundLocalDraftAction(
  formData: FormData,
): Promise<BackgroundLocalDraftSyncResult> {
  const draftId = readOptional(formData, "draft_id") || "local-draft";

  if (!hasSupabaseEnv()) {
    return {
      draftId,
      message: "Supabase is not configured yet.",
      ok: false,
    };
  }

  const body = normalizeBackgroundLocalDraftBody(readOptional(formData, "draft_body"));

  if (!body) {
    return {
      draftId,
      message: "Draft is empty.",
      ok: false,
    };
  }

  const viewer = await requireViewer("/dashboard");
  const sourceLabel =
    normalizeBackgroundLocalDraftBody(readOptional(formData, "draft_label")).slice(0, 120) ||
    "Local background draft";
  const draftTag = `local_draft_${draftId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
  const snapshotExcerpt = body.slice(0, 420);
  let encryptedProfileSourceFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedProfileSourceFields = prepareRecordSensitiveTextFields({
      notes: body,
      snapshot_excerpt: snapshotExcerpt,
    });
  } catch {
    return {
      draftId,
      message: "Draft cannot sync until background field encryption is configured.",
      ok: false,
    };
  }

  const syncedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data: existingDraftSource, error: existingDraftError } = await supabase
    .from("profile_sources")
    .select("id")
    .eq("profile_id", viewer.authUser.id)
    .contains("captured_tags", [draftTag])
    .limit(1)
    .maybeSingle();

  if (existingDraftError) {
    return {
      draftId,
      message: existingDraftError.message,
      ok: false,
    };
  }

  if (existingDraftSource) {
    return {
      draftId,
      message: "Draft already synced to manual source review.",
      ok: true,
      syncedAt,
    };
  }

  const payload: ProfileSourceInsert = {
    access_level: "manual_summary",
    captured_tags: [draftTag, ...getBackgroundTokens(`${sourceLabel} ${body}`, 11)],
    content_kind: "manual_summary",
    imported_at: syncedAt,
    is_active: true,
    label: sourceLabel,
    needs_review: true,
    notes: encryptedProfileSourceFields.plaintextFields.notes,
    profile_id: viewer.authUser.id,
    sensitive_ciphertexts: encryptedProfileSourceFields.ciphertexts,
    sensitive_encryption_version: encryptedProfileSourceFields.version,
    snapshot_excerpt: encryptedProfileSourceFields.plaintextFields.snapshot_excerpt,
    source_type: "manual",
    url: "",
  };
  const { error } = await supabase.from("profile_sources").insert(payload);

  if (error) {
    return {
      draftId,
      message: error.message,
      ok: false,
    };
  }

  revalidatePath("/dashboard");

  return {
    draftId,
    message: "Draft synced to manual source review.",
    ok: true,
    syncedAt,
  };
}

export async function requestMatchConciergeAppealAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestId = readOptional(formData, "request_id");

  if (!requestId) {
    redirectWithMessage(returnTo, "error", "Concierge request ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  let supabase: ReturnType<typeof createServiceClient>;

  try {
    supabase = createServiceClient();
  } catch {
    redirectWithMessage(
      returnTo,
      "error",
      "Concierge appeals require service-role configuration for operator review routing.",
    );
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("match_concierge_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    redirectWithMessage(
      returnTo,
      "error",
      requestError?.message ?? "Concierge request was not found.",
    );
  }

  const conciergeRequest = requestRow as MatchConciergeRequestRow;
  const isParticipant =
    conciergeRequest.requester_profile_id === viewer.authUser.id ||
    conciergeRequest.target_profile_id === viewer.authUser.id;

  if (!isParticipant) {
    redirectWithMessage(returnTo, "error", "You can only appeal your own concierge requests.");
  }

  const validation = validateBackgroundConciergeAppealRequest({
    appealStatus: conciergeRequest.appeal_status,
    reason: readOptional(formData, "appeal_reason"),
    requestStatus: conciergeRequest.status,
  });

  if (validation.errors.length) {
    redirectWithMessage(returnTo, "error", validation.errors.join(" "));
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("match_concierge_requests")
    .update({
      appeal_reason: validation.reason,
      appeal_resolution_note: "",
      appeal_resolved_at: null,
      appeal_resolved_by: null,
      appeal_status: "requested",
      appealed_at: now,
      updated_at: now,
    })
    .eq("id", requestId);

  if (updateError) {
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const { error: eventError } = await supabase.from("match_concierge_events").insert({
    actor_profile_id: viewer.authUser.id,
    event_type: "appeal_requested",
    metadata: {
      appealStatus: "requested",
      requestStatus: conciergeRequest.status,
    },
    request_id: requestId,
    summary: "Participant requested a second review of a concierge decision.",
  });

  if (eventError) {
    console.error("[supabase] Failed to record concierge appeal event", {
      message: eventError.message,
      requestId,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Concierge appeal requested for operator review.");
}

export async function deleteBackgroundNetworkingDataAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const validation = validateBackgroundSelfServeDeletion({
    confirmation: readOptional(formData, "delete_confirmation"),
  });

  if (validation.errors.length) {
    redirectWithMessage(returnTo, "error", validation.errors.join(" "));
  }

  let supabase: ReturnType<typeof createServiceClient>;

  try {
    supabase = createServiceClient();
  } catch {
    redirectWithMessage(
      returnTo,
      "error",
      "Self-serve deletion requires service-role configuration. Record a deletion request for operator review.",
    );
  }

  const profileId = viewer.authUser.id;
  const now = new Date().toISOString();
  const failures: string[] = [];

  await collectMutationResult(
    failures,
    "counterparty concierge requests",
    supabase
      .from("match_concierge_requests")
      .update({
        appeal_reason: "",
        appeal_resolution_note: "Counterparty deleted their background-networking profile.",
        appeal_resolved_at: now,
        appeal_resolved_by: null,
        appeal_status: "dismissed",
        match_id: null,
        operator_notes: "Counterparty deleted their background-networking profile.",
        reviewed_at: now,
        risk_notes: "",
        status: "closed",
        target_preview: "",
        target_profile_id: null,
        updated_at: now,
      })
      .eq("target_profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "risk signals",
    supabase
      .from("risk_signals")
      .update({
        metadata: { profile_deleted: true, profile_deleted_at: now },
        profile_id: null,
        summary: "Background-networking profile deleted; retained for aggregate safety review.",
      })
      .eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "background query events",
    supabase.from("background_query_events").update({ profile_id: null }).eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "match audit events",
    supabase
      .from("match_audit_events")
      .update({ actor_profile_id: null })
      .eq("actor_profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "background email queue",
    supabase.from("email_outbox").delete().eq("profile_id", profileId).eq("provider", "background-networking"),
  );
  await collectMutationResult(
    failures,
    "privacy grants",
    supabase
      .from("privacy_grants")
      .delete()
      .or(`profile_id.eq.${profileId},counterparty_id.eq.${profileId}`),
  );
  await collectMutationResult(
    failures,
    "privacy access requests",
    supabase
      .from("privacy_access_requests")
      .delete()
      .or(`owner_profile_id.eq.${profileId},requester_profile_id.eq.${profileId}`),
  );
  await collectMutationResult(
    failures,
    "match reports",
    supabase.from("match_reports").delete().eq("reporter_profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "match consents",
    supabase.from("match_consents").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "match explanation snapshots",
    supabase.from("match_explanation_snapshots").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "introduction plans",
    supabase
      .from("match_introduction_plans")
      .delete()
      .or(`profile_id.eq.${profileId},counterparty_id.eq.${profileId}`),
  );
  await collectMutationResult(
    failures,
    "owned concierge requests",
    supabase.from("match_concierge_requests").delete().eq("requester_profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "match suggestions",
    supabase
      .from("match_suggestions")
      .delete()
      .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`),
  );
  await collectMutationResult(
    failures,
    "wish notifications",
    supabase.from("wish_notifications").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "notification preferences",
    supabase.from("background_notification_preferences").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "saved searches",
    supabase.from("saved_searches").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "network invites",
    supabase.from("network_invites").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "brokerage bounties",
    supabase.from("brokerage_bounties").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "collective decision responses",
    supabase.from("collective_decision_responses").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "collective memberships",
    supabase.from("collective_members").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "created collective decisions",
    supabase.from("collective_decisions").delete().eq("created_by", profileId),
  );
  await collectMutationResult(
    failures,
    "owned collectives",
    supabase.from("collectives").delete().eq("owner_id", profileId),
  );
  await collectMutationResult(
    failures,
    "helper runs",
    supabase.from("helper_runs").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "helper strategies",
    supabase.from("helper_strategies").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "personal delegate",
    supabase.from("personal_delegates").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "profile sources",
    supabase.from("profile_sources").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "source connections",
    supabase.from("source_connections").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "profile synthesis",
    supabase.from("profile_syntheses").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "clarification questions",
    supabase.from("clarification_questions").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "background match runs",
    supabase.from("background_match_runs").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "wish entries",
    supabase.from("wish_entries").delete().eq("profile_id", profileId),
  );
  await collectMutationResult(
    failures,
    "wish profile",
    supabase.from("wish_profiles").delete().eq("profile_id", profileId),
  );

  const deletionStatus = failures.length ? "in_review" : "fulfilled";
  const { error: dataRightError } = await supabase.from("profile_data_right_requests").insert({
    due_at: now,
    operator_note: failures.length
      ? `Self-serve deletion needs operator follow-up: ${failures.slice(0, 6).join("; ")}`
      : "Fulfilled automatically by signed-in self-service deletion.",
    profile_id: profileId,
    request_details: failures.length
      ? "Self-serve background-networking deletion was attempted but one or more records need operator follow-up."
      : "Self-serve background-networking deletion completed.",
    request_type: "deletion",
    resolved_at: failures.length ? null : now,
    reviewed_by: failures.length ? null : profileId,
    scope: "background_networking",
    status: deletionStatus,
    updated_at: now,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  if (failures.length) {
    redirectWithMessage(
      returnTo,
      "error",
      dataRightError
        ? "Some background-networking records could not be deleted, and the operator review item could not be recorded."
        : "Some background-networking records could not be deleted. An operator review item was recorded.",
    );
  }

  if (dataRightError) {
    redirectWithMessage(
      returnTo,
      "error",
      "Background-networking data was deleted, but the fulfillment record could not be saved.",
    );
  }

  redirectWithMessage(
    returnTo,
    "message",
    "Background-networking data deleted. Safety and abuse-prevention audit records were retained only as redacted or anonymized records.",
  );
}

export async function updateProfileDataRightRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const viewer = await requireViewer(returnTo);

  if (!isAdminEmail(viewer.authUser.email)) {
    redirectWithMessage(returnTo, "error", "Admin access is required.");
  }

  const requestId = readOptional(formData, "request_id");
  const status = readOptional(formData, "status");
  const operatorNote = readOptional(formData, "operator_note").slice(0, 2000);

  if (!requestId || !isDataRightRequestStatus(status)) {
    redirectWithMessage(returnTo, "error", "Choose a valid data-right request and status.");
  }

  const resolvedAt = ["fulfilled", "denied", "cancelled"].includes(status)
    ? new Date().toISOString()
    : null;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profile_data_right_requests")
    .update({
      operator_note: operatorNote,
      reviewed_by: viewer.authUser.id,
      resolved_at: resolvedAt,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not update the data-right request.");
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Data-right request updated.");
}

export async function enrollBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const friendlyName = readOptional(formData, "friendly_name").slice(0, 80) || "Moral Trade";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer: "Moral Trade",
  });

  if (error) {
    return {
      error: error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    factorId: data.id,
    message: "Authenticator setup created. Verify the code before relying on this factor.",
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    status: "enrolled",
  };
}

export async function verifyBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const factorId = readOptional(formData, "factor_id");
  const normalizedCode = normalizeBackgroundTotpCode(readOptional(formData, "code"));

  if (!factorId) {
    return {
      error: "Choose an authenticator factor to verify.",
      status: "error",
    };
  }

  if (normalizedCode.error) {
    return {
      error: normalizedCode.error,
      status: "error",
    };
  }

  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });

  if (challenge.error || !challenge.data) {
    return {
      error: challenge.error?.message ?? "Could not start MFA verification.",
      status: "error",
    };
  }

  const verification = await supabase.auth.mfa.verify({
    challengeId: challenge.data.id,
    code: normalizedCode.code,
    factorId,
  });

  if (verification.error) {
    return {
      error: verification.error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    message: "MFA verified for this session.",
    status: "verified",
  };
}

export async function removeBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const factorId = readOptional(formData, "factor_id");

  if (!factorId) {
    return {
      error: "Choose an authenticator factor to remove.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return {
      error: error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    message: "Authenticator factor removed.",
    status: "removed",
  };
}
