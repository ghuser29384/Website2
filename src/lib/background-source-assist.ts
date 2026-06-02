import {
  type BackgroundSourcePermissionField,
  normalizeBackgroundSourcePermissionFields,
} from "@/lib/background-source-permissions";
import { getBackgroundTokens, truncateBackgroundText } from "@/lib/background-networking";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_SOURCE_ASSIST_VERSION = "background-source-assist-v1";
export const BACKGROUND_SOURCE_ASSIST_MODEL_NAME = "deterministic-redaction-v1";
export const BACKGROUND_SOURCE_ASSIST_ALLOWED_USE =
  "review_first_source_summary_no_raw_persistence";
export const BACKGROUND_SOURCE_ASSIST_ALLOWED_SOURCE_KINDS = [
  "url",
  "public_url",
  "manual_note",
  "manual_paste",
  "email_export",
  "calendar_export",
  "chat_export",
  "linkedin_export",
  "substack_post",
  "other",
] as const;

type BackgroundProfileSignalInsert =
  Database["public"]["Tables"]["background_profile_signals"]["Insert"];

export interface BackgroundSourceAssistRedactionReport {
  removedDirectQuotes: number;
  removedEmails: number;
  removedPhones: number;
  removedPreciseLocations: number;
  removedUrls: number;
}

export interface BackgroundSourceAssistSignal {
  allowedFieldKey: BackgroundSourcePermissionField;
  confidenceBand: "low" | "medium" | "high";
  sensitivity: "broad" | "specific";
  signalKey: string;
  value: string;
}

export interface BackgroundSourceAssistDraftSummary {
  allowedFieldKeys: BackgroundSourcePermissionField[];
  allowedUse: typeof BACKGROUND_SOURCE_ASSIST_ALLOWED_USE;
  assistVersion: typeof BACKGROUND_SOURCE_ASSIST_VERSION;
  extractedSignals: BackgroundSourceAssistSignal[];
  redactionReport: BackgroundSourceAssistRedactionReport;
  summaryText: string;
}

export interface BackgroundSourceAssistLaneValidationInput {
  allowedFieldKeys?: string[];
  consentNote?: string;
  continuousSyncRequested?: boolean;
  rawIngestionAllowed?: boolean;
  retentionDays?: number;
  sourceKind?: string;
}

export interface BackgroundSourceAssistLaneValidationResult {
  allowedFieldKeys: BackgroundSourcePermissionField[];
  errors: string[];
  rawIngestionAllowed: false;
  sourceKind: (typeof BACKGROUND_SOURCE_ASSIST_ALLOWED_SOURCE_KINDS)[number];
}

const REDACTION_PATTERNS: Array<{
  key: keyof BackgroundSourceAssistRedactionReport;
  pattern: RegExp;
  replacement: string;
}> = [
  {
    key: "removedEmails",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[redacted-email]",
  },
  {
    key: "removedUrls",
    pattern: /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi,
    replacement: "[redacted-url]",
  },
  {
    key: "removedPhones",
    pattern: /\+?\d[\d\s().-]{7,}\d/g,
    replacement: "[redacted-phone]",
  },
  {
    key: "removedPreciseLocations",
    pattern: /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?)\b/g,
    replacement: "[redacted-location]",
  },
  {
    key: "removedDirectQuotes",
    pattern: /"[^"\n]{12,}"|'[^'\n]{12,}'/g,
    replacement: "[redacted-direct-quote]",
  },
];

const FIELD_SIGNAL_KEY: Record<BackgroundSourcePermissionField, string> = {
  availability_context: "availability_context",
  capability_tags: "capability_tag",
  cause_priorities: "cause_priority",
  offer_ask_terms: "offer_ask_term",
  safety_constraints: "safety_constraint",
  verification_preferences: "verification_preference",
};

const FIELD_KEYWORDS: Record<BackgroundSourcePermissionField, string[]> = {
  availability_context: [
    "availability",
    "calendar",
    "capacity",
    "monthly",
    "remote",
    "schedule",
    "weekly",
  ],
  capability_tags: [
    "advise",
    "analysis",
    "engineering",
    "funding",
    "grantmaking",
    "organizing",
    "research",
    "review",
  ],
  cause_priorities: [
    "animal",
    "climate",
    "coordination",
    "governance",
    "health",
    "poverty",
    "safety",
    "welfare",
  ],
  offer_ask_terms: [
    "ask",
    "donate",
    "exchange",
    "fund",
    "introduce",
    "offer",
    "pledge",
    "trade",
  ],
  safety_constraints: [
    "anonymous",
    "constraint",
    "legal",
    "private",
    "risk",
    "safety",
    "sensitive",
  ],
  verification_preferences: [
    "attestation",
    "evidence",
    "proof",
    "receipt",
    "review",
    "verification",
  ],
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function incrementReport(
  report: BackgroundSourceAssistRedactionReport,
  key: keyof BackgroundSourceAssistRedactionReport,
  count: number,
) {
  report[key] += count;
}

function matchCount(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern)).length;
}

export function normalizeBackgroundSourceAssistSourceKind(value?: string | null) {
  if (
    BACKGROUND_SOURCE_ASSIST_ALLOWED_SOURCE_KINDS.includes(
      value as (typeof BACKGROUND_SOURCE_ASSIST_ALLOWED_SOURCE_KINDS)[number],
    )
  ) {
    return value as (typeof BACKGROUND_SOURCE_ASSIST_ALLOWED_SOURCE_KINDS)[number];
  }

  return "other";
}

export function validateBackgroundSourceAssistLane({
  allowedFieldKeys = [],
  consentNote = "",
  continuousSyncRequested = false,
  rawIngestionAllowed = false,
  retentionDays = 90,
  sourceKind = "other",
}: BackgroundSourceAssistLaneValidationInput): BackgroundSourceAssistLaneValidationResult {
  const normalizedFields = normalizeBackgroundSourcePermissionFields(allowedFieldKeys);
  const errors: string[] = [];

  if (rawIngestionAllowed) {
    errors.push("Raw source ingestion is not available for source-assisted background networking.");
  }

  if (continuousSyncRequested) {
    errors.push("Continuous source crawling is not available; submit a reviewed source summary instead.");
  }

  if (!normalizedFields.length) {
    errors.push("Choose at least one broad field this reviewed source may influence.");
  }

  if (consentNote.trim().length < 12) {
    errors.push("Add a consent note before using a source-assisted summary.");
  }

  if (![30, 90, 180, 365].includes(retentionDays)) {
    errors.push("Choose a supported source-summary retention window.");
  }

  return {
    allowedFieldKeys: normalizedFields,
    errors,
    rawIngestionAllowed: false,
    sourceKind: normalizeBackgroundSourceAssistSourceKind(sourceKind),
  };
}

export function redactBackgroundSourceAssistRawText(rawText: string): {
  redactedText: string;
  redactionReport: BackgroundSourceAssistRedactionReport;
} {
  const redactionReport: BackgroundSourceAssistRedactionReport = {
    removedDirectQuotes: 0,
    removedEmails: 0,
    removedPhones: 0,
    removedPreciseLocations: 0,
    removedUrls: 0,
  };
  let redactedText = compactText(rawText);

  for (const { key, pattern, replacement } of REDACTION_PATTERNS) {
    const count = matchCount(redactedText, pattern);
    incrementReport(redactionReport, key, count);
    redactedText = redactedText.replace(pattern, replacement);
  }

  return {
    redactedText: truncateBackgroundText(redactedText, 1_200),
    redactionReport,
  };
}

function buildSignalsForField({
  allowedFieldKey,
  redactedText,
  tokens,
}: {
  allowedFieldKey: BackgroundSourcePermissionField;
  redactedText: string;
  tokens: string[];
}) {
  const keywords = FIELD_KEYWORDS[allowedFieldKey];
  const keywordSignals = tokens.filter((token) =>
    keywords.some((keyword) => token.includes(keyword) || keyword.includes(token)),
  );
  const fallbackSignals = tokens.slice(0, 4);
  const values = (keywordSignals.length ? keywordSignals : fallbackSignals).slice(0, 6);
  const hasDirectKeyword = keywordSignals.length > 0;

  return values.map((value): BackgroundSourceAssistSignal => ({
    allowedFieldKey,
    confidenceBand: hasDirectKeyword ? "medium" : "low",
    sensitivity: allowedFieldKey === "safety_constraints" ? "specific" : "broad",
    signalKey: FIELD_SIGNAL_KEY[allowedFieldKey],
    value,
  }));
}

export function buildReviewedSourceDraftSummary({
  allowedFieldKeys,
  rawText,
}: {
  allowedFieldKeys: string[];
  rawText: string;
}): BackgroundSourceAssistDraftSummary {
  const normalizedFieldKeys = normalizeBackgroundSourcePermissionFields(allowedFieldKeys);
  const { redactedText, redactionReport } = redactBackgroundSourceAssistRawText(rawText);
  const tokens = getBackgroundTokens(redactedText, 32).filter(
    (token) => !token.startsWith("redacted"),
  );
  const extractedSignals = normalizedFieldKeys.flatMap((allowedFieldKey) =>
    buildSignalsForField({ allowedFieldKey, redactedText, tokens }),
  );

  return {
    allowedFieldKeys: normalizedFieldKeys,
    allowedUse: BACKGROUND_SOURCE_ASSIST_ALLOWED_USE,
    assistVersion: BACKGROUND_SOURCE_ASSIST_VERSION,
    extractedSignals,
    redactionReport,
    summaryText: truncateBackgroundText(
      redactedText || "No approved summary text remained after redaction.",
      900,
    ),
  };
}

export function buildBackgroundProfileSignalRows({
  draft,
  expiresAt,
  profileId,
  sourceConnectionId,
  sourceSummaryId,
}: {
  draft: Pick<BackgroundSourceAssistDraftSummary, "extractedSignals">;
  expiresAt?: string | null;
  profileId: string;
  sourceConnectionId?: string | null;
  sourceSummaryId?: string | null;
}): BackgroundProfileSignalInsert[] {
  return draft.extractedSignals.map((signal) => ({
    allowed_field_key: signal.allowedFieldKey,
    confidence_band: signal.confidenceBand,
    expires_at: expiresAt ?? null,
    profile_id: profileId,
    sensitivity: signal.sensitivity,
    signal_key: signal.signalKey,
    signal_value: signal.value,
    source: "approved_source_summary",
    source_connection_id: sourceConnectionId ?? null,
    source_summary_id: sourceSummaryId ?? null,
    status: "active",
  }));
}
