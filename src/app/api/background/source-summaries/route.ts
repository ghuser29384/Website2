import { NextResponse } from "next/server";

import {
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import { getBackgroundTokens } from "@/lib/background-networking";
import { buildSourceSummaryRows } from "@/lib/background-opportunity-briefs";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import {
  resolveBackgroundSourceSummaryFieldScope,
  validateBackgroundSourceSummaryRetentionScope,
  type BackgroundSourceSummaryFieldScopeConnection,
} from "@/lib/background-source-permissions";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BackgroundSourceSummaryType =
  NonNullable<Database["public"]["Tables"]["background_source_summaries"]["Insert"]["source_type"]>;
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];

const SOURCE_TYPES = new Set<BackgroundSourceSummaryType>([
  "manual",
  "social",
  "blog",
  "email",
  "calendar",
  "chat_history",
  "search_profile",
  "other",
] as const);

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

function sourceType(value: unknown): BackgroundSourceSummaryType {
  const normalized = stringField(value);

  return SOURCE_TYPES.has(normalized as BackgroundSourceSummaryType)
    ? (normalized as BackgroundSourceSummaryType)
    : "manual";
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
      "Rate-limited source summary writes return no storage result until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
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

  const summaryText = stringField(body.summaryText);
  const label = stringField(body.label);
  const normalizedSourceType = sourceType(body.sourceType);
  const sourceConnectionId = stringField(body.sourceConnectionId) || null;
  let sourceConnection: BackgroundSourceSummaryFieldScopeConnection | null = null;

  if (sourceConnectionId) {
    const { data, error } = await supabase
      .from("source_connections")
      .select("id, access_status, allowed_field_keys, retention_expires_at")
      .eq("id", sourceConnectionId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return privateJson(
        { error: "Selected source connection was not found for this profile." },
        404,
      );
    }

    sourceConnection = data as Pick<
      SourceConnectionRow,
      "id" | "access_status" | "allowed_field_keys" | "retention_expires_at"
    >;
  }

  const fieldScope = resolveBackgroundSourceSummaryFieldScope({
    requestedFieldKeys: stringList(body.allowedFieldKeys),
    sourceConnection,
  });
  const { receipt, sourceSummary, validationErrors } = buildSourceSummaryRows({
    allowedFieldKeys: fieldScope.allowedFieldKeys,
    label,
    profileId: user.id,
    purpose: stringField(body.purpose),
    retentionDays: stringField(body.retentionDays) || 90,
    sourceConnectionId,
    sourceType: normalizedSourceType,
  });

  validationErrors.push(...fieldScope.errors);
  validationErrors.push(
    ...validateBackgroundSourceSummaryRetentionScope({
      sourceConnection,
      summaryRetentionExpiresAt: sourceSummary.retention_expires_at,
    }),
  );

  if (!summaryText) {
    validationErrors.push("Source summary text is required.");
  }

  if (validationErrors.length) {
    return privateJson({ error: validationErrors.join(" ") }, 400);
  }

  let encryptedSummaryFields: ReturnType<typeof prepareRecordSensitiveTextFields>;
  let encryptedProfileSourceFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedSummaryFields = prepareRecordSensitiveTextFields({
      purpose: sourceSummary.purpose ?? "",
      summary_text: summaryText,
    });
    encryptedProfileSourceFields = prepareRecordSensitiveTextFields({
      notes: summaryText,
      snapshot_excerpt: summaryText.slice(0, 420),
    });
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before saving source summaries." },
      503,
    );
  }

  const { data: receiptRow, error: receiptError } = await supabase
    .from("background_grant_receipts")
    .insert(receipt)
    .select("id")
    .maybeSingle();

  if (receiptError || !receiptRow) {
    return privateJson({ error: receiptError?.message ?? "Unable to record consent receipt." }, 500);
  }

  const { data: summaryRow, error: summaryError } = await supabase
    .from("background_source_summaries")
    .insert({
      ...sourceSummary,
      approved_at: new Date().toISOString(),
      consent_receipt_id: receiptRow.id,
      purpose: encryptedSummaryFields.plaintextFields.purpose,
      redaction_report: {
        removedDirectQuotes: 0,
        removedEmails: 0,
        removedPhones: 0,
        removedPreciseLocations: 0,
        removedUrls: 0,
      },
      sensitive_ciphertexts: encryptedSummaryFields.ciphertexts,
      sensitive_encryption_version: encryptedSummaryFields.version,
      summary_text: encryptedSummaryFields.plaintextFields.summary_text,
      summary_version: 1,
    })
    .select("id")
    .maybeSingle();

  if (summaryError || !summaryRow) {
    return privateJson({ error: summaryError?.message ?? "Unable to save source summary." }, 500);
  }

  const profileSourceType = normalizedSourceType === "search_profile" ? "other" : normalizedSourceType;
  const { error: profileSourceError } = await supabase.from("profile_sources").insert({
    access_level: "manual_summary",
    captured_tags: getBackgroundTokens(`${label} ${summaryText}`, 12),
    content_kind: "manual_summary",
    imported_at: new Date().toISOString(),
    retention_expires_at: sourceSummary.retention_expires_at,
    is_active: true,
    label,
    needs_review: true,
    notes: encryptedProfileSourceFields.plaintextFields.notes,
    profile_id: user.id,
    sensitive_ciphertexts: encryptedProfileSourceFields.ciphertexts,
    sensitive_encryption_version: encryptedProfileSourceFields.version,
    snapshot_excerpt: encryptedProfileSourceFields.plaintextFields.snapshot_excerpt,
    source_type: profileSourceType,
    url: stringField(body.sourceUrl),
  });

  if (profileSourceError) {
    return privateJson(
      {
        error:
          "Source summary was saved, but the matching source note could not be recorded.",
        sourceSummaryId: summaryRow.id,
      },
      500,
    );
  }

  return privateJson({
    consentReceiptId: receiptRow.id,
    rawIngestionAllowed: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_source_summary_enabled"),
    sourceSummaryId: summaryRow.id,
    stateMutation: "reviewed_source_summary_saved",
  });
}
