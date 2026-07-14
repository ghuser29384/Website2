import { NextResponse } from "next/server";

import {
  BACKGROUND_SOURCE_ASSIST_FIELD_SIGNAL_KEYS,
  buildBackgroundProfileSignalRows,
  parseBackgroundSourceAssistSignals,
  type BackgroundSourceAssistSignal,
} from "@/lib/background-source-assist";
import { normalizeBackgroundSourcePermissionFields } from "@/lib/background-source-permissions";
import {
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
} from "@/lib/background-phase-gates";
import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  normalizeBackgroundPurposeBinding,
} from "@/lib/background-purpose-registry";
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

type SourceSummaryRow =
  Database["public"]["Tables"]["background_source_summaries"]["Row"];
type ProfileSignalInsert =
  Database["public"]["Tables"]["background_profile_signals"]["Insert"];

const CONTACT_OR_EXACT_DETAIL_PATTERN =
  /\b(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d|https?:\/\/|www\.|exact private|contact detail|source note)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function signalKeyAllowed(signal: BackgroundSourceAssistSignal) {
  return BACKGROUND_SOURCE_ASSIST_FIELD_SIGNAL_KEYS[signal.allowedFieldKey] === signal.signalKey;
}

function normalizeConfirmationSignals({
  allowedFieldKeys,
  candidateSignals,
}: {
  allowedFieldKeys: string[];
  candidateSignals: unknown;
}) {
  const allowedFields = new Set(normalizeBackgroundSourcePermissionFields(allowedFieldKeys));

  return parseBackgroundSourceAssistSignals(candidateSignals)
    .filter((signal) => allowedFields.has(signal.allowedFieldKey))
    .filter((signal) => signal.sensitivity === "broad")
    .filter(signalKeyAllowed)
    .filter((signal) => !CONTACT_OR_EXACT_DETAIL_PATTERN.test(signal.value))
    .slice(0, 12);
}

function signalIdentity(signal: Pick<BackgroundSourceAssistSignal, "allowedFieldKey" | "signalKey" | "value">) {
  return `${signal.allowedFieldKey}:${signal.signalKey}:${signal.value.trim().toLowerCase()}`;
}

function sourceSummaryIsConfirmable(summary: SourceSummaryRow, now = new Date()) {
  if (!["active", "reviewed"].includes(summary.status)) {
    return false;
  }

  const expiresAt = Date.parse(summary.retention_expires_at);

  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

function rowFingerprint(row: ProfileSignalInsert) {
  return typeof row.signal_fingerprint === "string" ? row.signal_fingerprint : "";
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
      "Rate-limited source-summary tag confirmations create no match inputs until the window resets.",
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

  const privateThirdPartyDataReviewed = body.privateThirdPartyDataReviewed === true;
  const containsPrivateThirdPartyData = body.containsPrivateThirdPartyData === true;

  if (!privateThirdPartyDataReviewed) {
    return privateJson(
      { error: "Review third-party data before confirming source-summary tags." },
      400,
    );
  }

  if (containsPrivateThirdPartyData) {
    return privateJson(
      {
        error:
          "Tags from private third-party data cannot become background-networking match inputs.",
      },
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: sourceSummary, error: summaryError } = await supabase
    .from("background_source_summaries")
    .select(
      "id, profile_id, source_connection_id, allowed_field_keys, retention_expires_at, status, summary_version",
    )
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (summaryError || !sourceSummary) {
    return privateJson({ error: summaryError?.message ?? "Source summary was not found." }, 404);
  }

  if (!sourceSummaryIsConfirmable(sourceSummary as SourceSummaryRow)) {
    return privateJson(
      { error: "Only active, unexpired source summaries can confirm broad tags." },
      409,
    );
  }

  const { data: shadowRuns, error: shadowError } = await supabase
    .from("background_shadow_runs")
    .select("output_json")
    .eq("source_summary_id", sourceSummary.id)
    .eq("profile_id", user.id)
    .eq("purpose", "signal_extraction");

  if (shadowError) {
    return privateJson({ error: shadowError.message }, 500);
  }

  const proposedSignals = shadowRuns?.flatMap((run) =>
    isRecord(run.output_json) ? parseBackgroundSourceAssistSignals(run.output_json.extractedSignals) : [],
  ) ?? [];
  const proposedIdentities = new Set(proposedSignals.map(signalIdentity));
  const requestedSignals = normalizeConfirmationSignals({
    allowedFieldKeys: sourceSummary.allowed_field_keys ?? [],
    candidateSignals: body.tags ?? body.signals,
  });
  const participantEntered = body.participantEnteredBroadTags === true;
  const unproposedSignals = requestedSignals.filter(
    (signal) => !proposedIdentities.has(signalIdentity(signal)),
  );

  if (!requestedSignals.length) {
    return privateJson(
      {
        error:
          "Choose at least one broad, allowed-field tag to confirm for matching.",
      },
      400,
    );
  }

  if (unproposedSignals.length && !participantEntered) {
    return privateJson(
      {
        error:
          "Unlisted tags require explicit participant-entered confirmation before they can become match inputs.",
      },
      400,
    );
  }

  const purposeBinding = normalizeBackgroundPurposeBinding({
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const draft = { extractedSignals: requestedSignals };
  const candidateRows = buildBackgroundProfileSignalRows({
    confirmationActorProfileId: user.id,
    draft,
    expiresAt: sourceSummary.retention_expires_at,
    profileId: user.id,
    purposeCode: purposeBinding.purposeCode,
    purposePolicyVersion: purposeBinding.purposePolicyVersion,
    sourceConnectionId: sourceSummary.source_connection_id,
    sourceSummaryId: sourceSummary.id,
    sourceSummaryVersion: sourceSummary.summary_version,
  });

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.source_summary.confirm_tags",
    actorRole: "participant",
    idempotencyKey: `${user.id}:${sourceSummary.id}:${sourceSummary.summary_version}:${candidateRows
      .map(rowFingerprint)
      .sort()
      .join(",")}`,
    laneKey: "manual_source_summaries",
    outputSchemaVersion: "background-source-summary-tag-confirmation-response-v1",
    purposeCode: purposeBinding.purposeCode,
    purposePolicyVersion: purposeBinding.purposePolicyVersion,
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("background_profile_signals")
    .select("signal_fingerprint")
    .eq("profile_id", user.id)
    .eq("source_summary_id", sourceSummary.id)
    .eq("status", "active");

  if (existingError) {
    return privateJson({ error: existingError.message }, 500);
  }

  const existingFingerprints = new Set(
    (existingRows ?? []).map((row) => row.signal_fingerprint).filter(Boolean),
  );
  const rowsToInsert = candidateRows.filter(
    (row) => !existingFingerprints.has(rowFingerprint(row)),
  );

  if (rowsToInsert.length) {
    const { error: insertError } = await supabase
      .from("background_profile_signals")
      .insert(rowsToInsert);

    if (insertError) {
      return privateJson({ error: insertError.message }, 500);
    }
  }

  return privateJson({
    confirmedTagCount: candidateRows.length,
    insertedTagCount: rowsToInsert.length,
    policyDecisionId: policyDecision.policyDecisionId,
    privateThirdPartyDataUsed: false,
    profileSignalsCreated: rowsToInsert.length,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_source_summary_enabled"),
    sourceSummaryId: sourceSummary.id,
    stateMutation: rowsToInsert.length
      ? "source_summary_tags_confirmed"
      : "source_summary_tags_already_confirmed",
  });
}
