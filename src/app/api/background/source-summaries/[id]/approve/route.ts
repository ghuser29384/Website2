import { NextResponse } from "next/server";

import {
  type BackgroundSourceAssistDraftSummary,
  parseBackgroundSourceAssistSignals,
} from "@/lib/background-source-assist";
import { prepareRecordSensitiveTextFields } from "@/lib/background-field-encryption";
import {
  normalizeBackgroundSourcePermissionFields,
  validateBackgroundSourceSummaryRetentionScope,
} from "@/lib/background-source-permissions";
import { buildSourceSummaryRows } from "@/lib/background-opportunity-briefs";
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
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type SourceSummaryInsert = Database["public"]["Tables"]["background_source_summaries"]["Insert"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sourceSummaryType(value: SourceConnectionRow["provider"]): SourceSummaryInsert["source_type"] {
  return value === "search_profile" ? "search_profile" : value;
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
    "background_source_summary_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited source summary approvals create no state change until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { id } = await params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
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

  const { data: shadowRun, error: shadowError } = await supabase
    .from("background_shadow_runs")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .eq("purpose", "signal_extraction")
    .eq("was_promoted", false)
    .maybeSingle();

  if (shadowError || !shadowRun) {
    return privateJson({ error: shadowError?.message ?? "Draft summary was not found." }, 404);
  }

  if (!shadowRun.source_connection_id || !isRecord(shadowRun.output_json)) {
    return privateJson({ error: "Draft summary is missing source connection context." }, 400);
  }

  const { data: sourceConnection, error: sourceConnectionError } = await supabase
    .from("source_connections")
    .select("*")
    .eq("id", shadowRun.source_connection_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (sourceConnectionError || !sourceConnection) {
    return privateJson(
      { error: sourceConnectionError?.message ?? "Source connection was not found." },
      404,
    );
  }

  const summaryText = stringField(shadowRun.output_json.summaryText);
  const allowedFieldKeys = normalizeBackgroundSourcePermissionFields(
    Array.isArray(shadowRun.output_json.allowedFieldKeys)
      ? shadowRun.output_json.allowedFieldKeys.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
  );
  const draft: Pick<BackgroundSourceAssistDraftSummary, "extractedSignals"> = {
    extractedSignals: parseBackgroundSourceAssistSignals(shadowRun.output_json.extractedSignals),
  };
  const { receipt, sourceSummary, validationErrors } = buildSourceSummaryRows({
    allowedFieldKeys,
    label: stringField(body.label) || sourceConnection.label || "Approved source summary",
    profileId: user.id,
    purpose:
      stringField(body.purpose) ||
      "Approved source-assisted summary for explicit background-networking profile signals.",
    retentionDays: stringField(body.retentionDays ?? body.retention_days) || 90,
    sourceConnectionId: sourceConnection.id,
    sourceType: sourceSummaryType(sourceConnection.provider),
  });

  validationErrors.push(
    ...validateBackgroundSourceSummaryRetentionScope({
      sourceConnection,
      summaryRetentionExpiresAt: sourceSummary.retention_expires_at,
    }),
  );

  if (!summaryText) {
    validationErrors.push("Draft summary text is empty.");
  }

  if (!allowedFieldKeys.length) {
    validationErrors.push("Draft summary has no approved field scope.");
  }

  if (validationErrors.length) {
    return privateJson({ error: validationErrors.join(" ") }, 400);
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.source_summary.approve",
    actorRole: "participant",
    idempotencyKey: `${user.id}:${shadowRun.id}:approve-source-summary`,
    laneKey: "manual_source_summaries",
    outputSchemaVersion: "background-source-summary-response-v1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  let encryptedSummaryFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedSummaryFields = prepareRecordSensitiveTextFields({
      purpose: sourceSummary.purpose ?? "",
      summary_text: summaryText,
    });
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before approving source summaries." },
      503,
    );
  }

  const now = new Date().toISOString();
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
      approved_at: now,
      consent_receipt_id: receiptRow.id,
      purpose: encryptedSummaryFields.plaintextFields.purpose,
      redaction_report: isRecord(shadowRun.output_json.redactionReport)
        ? shadowRun.output_json.redactionReport
        : {},
      sensitive_ciphertexts: encryptedSummaryFields.ciphertexts,
      sensitive_encryption_version: encryptedSummaryFields.version,
      summary_text: encryptedSummaryFields.plaintextFields.summary_text,
      summary_version: 1,
    })
    .select("id")
    .maybeSingle();

  if (summaryError || !summaryRow) {
    return privateJson({ error: summaryError?.message ?? "Unable to approve source summary." }, 500);
  }

  await supabase
    .from("background_shadow_runs")
    .update({ source_summary_id: summaryRow.id, was_promoted: true })
    .eq("id", shadowRun.id)
    .eq("profile_id", user.id);

  return privateJson({
    policyDecisionId: policyDecision.policyDecisionId,
    profileSignalsCreated: 0,
    proposedTagCount: draft.extractedSignals.length,
    rawTextPersisted: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_source_summary_enabled"),
    sourceSummaryId: summaryRow.id,
    stateMutation: "source_summary_approved_without_match_inputs",
  });
}
