import { NextResponse } from "next/server";

import { prepareRecordSensitiveTextFields } from "@/lib/background-field-encryption";
import { validateBackgroundSourcePermission } from "@/lib/background-source-permissions";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];

const PROVIDER_ALIASES: Record<string, SourceConnectionInsert["provider"]> = {
  calendar_export: "calendar",
  chat_export: "chat_history",
  email_export: "email",
  webpage: "blog",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function boolField(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function normalizeProvider(value: unknown): SourceConnectionInsert["provider"] {
  const normalized = stringField(value);
  const alias = PROVIDER_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  if (
    [
      "manual",
      "social",
      "blog",
      "email",
      "calendar",
      "chat_history",
      "search_profile",
      "other",
    ].includes(normalized)
  ) {
    return normalized as SourceConnectionInsert["provider"];
  }

  return "manual";
}

function normalizeAccessStatus(value: unknown): SourceConnectionInsert["access_status"] {
  const normalized = stringField(value);

  if (normalized === "draft") {
    return "needs_review";
  }

  if (normalized === "expired") {
    return "revoked";
  }

  if (["connected", "revoked", "needs_review", "not_connected"].includes(normalized)) {
    return normalized as SourceConnectionInsert["access_status"];
  }

  return "needs_review";
}

function normalizeImportMode(value: unknown): SourceConnectionInsert["import_mode"] {
  const normalized = stringField(value);

  if (normalized === "manual_summary_only") {
    return "manual_review";
  }

  if (normalized === "shadow_summary") {
    return "manual_paste";
  }

  if (["manual_review", "manual_paste", "rss_pull", "forwarded_note"].includes(normalized)) {
    return normalized as SourceConnectionInsert["import_mode"];
  }

  return "manual_review";
}

function normalizeSyncFrequency(value: unknown): SourceConnectionInsert["sync_frequency"] {
  const normalized = stringField(value);

  if (["manual", "weekly", "monthly"].includes(normalized)) {
    return normalized as SourceConnectionInsert["sync_frequency"];
  }

  return "manual";
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
    "background_source_summary_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited source connection writes create no consent record until the window resets.",
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

  const label = stringField(body.label);
  const provider = normalizeProvider(body.provider);
  const accessStatus = normalizeAccessStatus(body.accessStatus ?? body.access_status);
  const accessScope = stringField(body.accessScope ?? body.access_scope);
  const consentNotes = stringField(body.consentNotes ?? body.consent_notes);
  const lastSyncSummary = stringField(body.lastSyncSummary ?? body.last_sync_summary);
  const permission = validateBackgroundSourcePermission({
    accessScope,
    accessStatus,
    aiShadowModeAllowed: boolField(body.aiShadowModeAllowed ?? body.ai_shadow_mode_allowed),
    allowedFieldKeys: stringList(body.allowedFieldKeys ?? body.allowed_field_keys),
    consentNotes,
    provider,
    rawIngestionAllowed: boolField(body.rawIngestionAllowed ?? body.raw_ingestion_allowed),
    retentionDays: stringField(body.retentionDays ?? body.retention_days),
  });

  if (!label) {
    return privateJson({ error: "Connection label is required." }, 400);
  }

  if (permission.errors.length) {
    return privateJson({ error: permission.errors.join(" ") }, 400);
  }

  let encryptedFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedFields = prepareRecordSensitiveTextFields({
      access_scope: accessScope,
      consent_notes: consentNotes,
      last_sync_summary: lastSyncSummary,
    });
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before saving source connections." },
      503,
    );
  }

  const { data, error } = await supabase
    .from("source_connections")
    .insert({
      access_scope: encryptedFields.plaintextFields.access_scope,
      access_status: accessStatus,
      ai_shadow_mode_allowed: permission.aiShadowModeAllowed,
      allowed_field_keys: permission.allowedFieldKeys,
      consent_notes: encryptedFields.plaintextFields.consent_notes,
      import_mode: normalizeImportMode(body.importMode ?? body.import_mode),
      label,
      last_import_item_count: 0,
      last_sync_summary: encryptedFields.plaintextFields.last_sync_summary,
      profile_id: user.id,
      provider,
      raw_ingestion_allowed: false,
      retention_expires_at: permission.retentionExpiresAt,
      sensitive_ciphertexts: encryptedFields.ciphertexts,
      sensitive_encryption_version: encryptedFields.version,
      sync_frequency: normalizeSyncFrequency(body.syncFrequency ?? body.sync_frequency),
      url: stringField(body.url),
    })
    .select("id, access_status, retention_expires_at")
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to save source connection." }, 500);
  }

  return privateJson({
    accessStatus: data.access_status,
    id: data.id,
    rawIngestionAllowed: false,
    retentionExpiresAt: data.retention_expires_at,
    stateMutation: "source_connection_recorded",
  });
}
