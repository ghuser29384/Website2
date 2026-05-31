import {
  type BackgroundSourcePermissionField,
  formatBackgroundSourcePermissionFieldLabel,
  normalizeBackgroundSourcePermissionFields,
} from "@/lib/background-source-permissions";

export const BACKGROUND_AI_SHADOW_EVALUATION_VERSION = "background-ai-shadow-v1";
export const BACKGROUND_AI_SHADOW_CONTRACT_VERSION =
  "background-ai-shadow-contract-v0.1-2026-05";
export const BACKGROUND_AI_SHADOW_CONTRACT_VALIDATOR_VERSION =
  "background-ai-shadow-contract-validator-v0.1";
export const BACKGROUND_AI_SHADOW_MAX_SUMMARY_CHARACTERS = 900;
export const BACKGROUND_AI_SHADOW_ALLOWED_USE = "shadow_only_no_matching_or_disclosure";

export type BackgroundAiShadowStatus = "not_allowed" | "ready_for_shadow";

export interface BackgroundAiShadowSourceConnection {
  access_status?: string | null;
  ai_shadow_mode_allowed?: boolean | null;
  allowed_field_keys?: string[] | null;
  label?: string | null;
  last_sync_summary?: string | null;
  raw_ingestion_allowed?: boolean | null;
  retention_expires_at?: string | null;
}

export interface BackgroundAiShadowEvaluation {
  allowedUse: typeof BACKGROUND_AI_SHADOW_ALLOWED_USE;
  approvedFieldKeys: BackgroundSourcePermissionField[];
  approvedFieldLabels: string[];
  blockedReasons: string[];
  evaluationVersion: typeof BACKGROUND_AI_SHADOW_EVALUATION_VERSION;
  redactedApprovedSummary: string;
  sourceLabel: string;
  status: BackgroundAiShadowStatus;
  summaryCharacterCount: number;
}

export interface BackgroundAiShadowReadinessSummary {
  blocked: number;
  expired: number;
  ready: number;
  shadowEnabled: number;
  total: number;
}

export interface BackgroundAiShadowContract {
  allowedUse: typeof BACKGROUND_AI_SHADOW_ALLOWED_USE;
  contractTests: string[];
  decisioningMode: "approved_summary_shadow_evaluation_only";
  invariants: string[];
  prohibitedEffects: string[];
  purpose: string;
  requiredSourceFields: Array<keyof BackgroundAiShadowSourceConnection>;
  sampleBlockedEvaluation: BackgroundAiShadowEvaluation;
  sampleReadyEvaluation: BackgroundAiShadowEvaluation;
  stateMutation: false;
  version: typeof BACKGROUND_AI_SHADOW_CONTRACT_VERSION;
}

export interface BackgroundAiShadowContractCheck {
  evidence: string;
  id: string;
  label: string;
  status: "pass" | "fail";
}

export interface BackgroundAiShadowContractValidation {
  blockers: string[];
  checks: BackgroundAiShadowContractCheck[];
  contractVersion: typeof BACKGROUND_AI_SHADOW_CONTRACT_VERSION;
  status: "pass" | "fail";
  validatorName: "background-ai-shadow-contract";
  validatorVersion: typeof BACKGROUND_AI_SHADOW_CONTRACT_VALIDATOR_VERSION;
}

const CONTACT_DETAIL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]"],
  [/\bhttps?:\/\/[^\s<>"')]+/gi, "[redacted-url]"],
  [/\bwww\.[^\s<>"')]+/gi, "[redacted-url]"],
  [/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]"],
];

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseExpiry(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const expiresAt = new Date(value);

  return Number.isNaN(expiresAt.getTime()) ? null : expiresAt;
}

export function redactBackgroundAiShadowSummary(
  value: string | null | undefined,
  maxCharacters = BACKGROUND_AI_SHADOW_MAX_SUMMARY_CHARACTERS,
) {
  let redacted = compactText(value ?? "");

  for (const [pattern, replacement] of CONTACT_DETAIL_REPLACEMENTS) {
    redacted = redacted.replace(pattern, replacement);
  }

  if (redacted.length <= maxCharacters) {
    return redacted;
  }

  return `${redacted.slice(0, Math.max(0, maxCharacters - 1)).trim()}...`;
}

export function getBackgroundAiShadowBlockers(
  sourceConnection: BackgroundAiShadowSourceConnection,
  now = new Date(),
) {
  const blockers: string[] = [];
  const allowedFields = normalizeBackgroundSourcePermissionFields(
    sourceConnection.allowed_field_keys ?? [],
  );
  const approvedSummary = compactText(sourceConnection.last_sync_summary ?? "");
  const expiresAt = parseExpiry(sourceConnection.retention_expires_at);

  if (!sourceConnection.ai_shadow_mode_allowed) {
    blockers.push("AI shadow-mode consent is not enabled for this source.");
  }

  if (sourceConnection.raw_ingestion_allowed) {
    blockers.push("Raw ingestion is disabled; shadow evaluation may use approved summaries only.");
  }

  if (sourceConnection.access_status !== "connected") {
    blockers.push("Source must be connected before shadow evaluation.");
  }

  if (!allowedFields.length) {
    blockers.push("Choose at least one broad field this source may influence.");
  }

  if (!approvedSummary) {
    blockers.push("Add an approved manual summary before shadow evaluation.");
  }

  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    blockers.push("The source retention window has expired.");
  }

  return blockers;
}

export function buildBackgroundAiShadowEvaluation({
  now = new Date(),
  sourceConnection,
}: {
  now?: Date;
  sourceConnection: BackgroundAiShadowSourceConnection;
}): BackgroundAiShadowEvaluation {
  const approvedFieldKeys = normalizeBackgroundSourcePermissionFields(
    sourceConnection.allowed_field_keys ?? [],
  );
  const blockedReasons = getBackgroundAiShadowBlockers(sourceConnection, now);
  const redactedApprovedSummary = blockedReasons.length
    ? ""
    : redactBackgroundAiShadowSummary(sourceConnection.last_sync_summary);

  return {
    allowedUse: BACKGROUND_AI_SHADOW_ALLOWED_USE,
    approvedFieldKeys,
    approvedFieldLabels: approvedFieldKeys.map(formatBackgroundSourcePermissionFieldLabel),
    blockedReasons,
    evaluationVersion: BACKGROUND_AI_SHADOW_EVALUATION_VERSION,
    redactedApprovedSummary,
    sourceLabel: compactText(sourceConnection.label ?? "Source connection"),
    status: blockedReasons.length ? "not_allowed" : "ready_for_shadow",
    summaryCharacterCount: redactedApprovedSummary.length,
  };
}

export function summarizeBackgroundAiShadowReadiness(
  sourceConnections: BackgroundAiShadowSourceConnection[],
  now = new Date(),
): BackgroundAiShadowReadinessSummary {
  return sourceConnections.reduce<BackgroundAiShadowReadinessSummary>(
    (summary, sourceConnection) => {
      const blockers = getBackgroundAiShadowBlockers(sourceConnection, now);
      const expiresAt = parseExpiry(sourceConnection.retention_expires_at);

      return {
        blocked: summary.blocked + (blockers.length ? 1 : 0),
        expired:
          summary.expired + (expiresAt && expiresAt.getTime() <= now.getTime() ? 1 : 0),
        ready: summary.ready + (blockers.length ? 0 : 1),
        shadowEnabled:
          summary.shadowEnabled + (sourceConnection.ai_shadow_mode_allowed ? 1 : 0),
        total: summary.total + 1,
      };
    },
    {
      blocked: 0,
      expired: 0,
      ready: 0,
      shadowEnabled: 0,
      total: 0,
    },
  );
}

const BACKGROUND_AI_SHADOW_REQUIRED_SOURCE_FIELDS = [
  "access_status",
  "ai_shadow_mode_allowed",
  "allowed_field_keys",
  "last_sync_summary",
  "raw_ingestion_allowed",
  "retention_expires_at",
] as const satisfies ReadonlyArray<keyof BackgroundAiShadowSourceConnection>;

const BACKGROUND_AI_SHADOW_CONTRACT_TESTS = [
  "background_ai_shadow_contract_validator",
  "background_ai_shadow_redaction_smoke",
  "background_ai_shadow_readiness_dashboard_smoke",
  "background_ai_shadow_public_contract_route_smoke",
] as const;

const BACKGROUND_AI_SHADOW_SAMPLE_READY_SOURCE: BackgroundAiShadowSourceConnection = {
  access_status: "connected",
  ai_shadow_mode_allowed: true,
  allowed_field_keys: ["cause_priorities", "capability_tags"],
  label: "Approved public essay summary",
  last_sync_summary:
    "Approved summary: this source mentions climate adaptation and institutional grantmaking capacity. Contact alex@example.org for raw details.",
  raw_ingestion_allowed: false,
  retention_expires_at: "2099-01-01T00:00:00.000Z",
};

const BACKGROUND_AI_SHADOW_SAMPLE_BLOCKED_SOURCE: BackgroundAiShadowSourceConnection = {
  access_status: "revoked",
  ai_shadow_mode_allowed: true,
  allowed_field_keys: ["offer_ask_terms"],
  label: "Revoked source",
  last_sync_summary: "Approved summary from a revoked source.",
  raw_ingestion_allowed: true,
  retention_expires_at: "2000-01-01T00:00:00.000Z",
};

function backgroundAiShadowContractCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundAiShadowContractCheck {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

function hasAll(values: readonly string[], requiredValues: readonly string[]) {
  return requiredValues.every((value) => values.includes(value));
}

export function getBackgroundAiShadowContract(): BackgroundAiShadowContract {
  return {
    allowedUse: BACKGROUND_AI_SHADOW_ALLOWED_USE,
    contractTests: [...BACKGROUND_AI_SHADOW_CONTRACT_TESTS],
    decisioningMode: "approved_summary_shadow_evaluation_only",
    invariants: [
      "Shadow evaluation may use only approved manual summaries from source connections with explicit AI shadow consent.",
      "Raw connector ingestion, continuous source search, contact scraping, autonomous outreach, live matching, disclosure, and ranking changes are prohibited.",
      "Retention expiry, revoked access, missing field permissions, missing approved summaries, and raw-ingestion flags must block evaluation.",
      "Shadow packets redact contact details before any evaluation artifact is shown or logged.",
      "Shadow output is evidence for human review only and cannot publish matches, disclose private details, or mutate product state.",
      "Analytics may record only aggregate readiness counts, not raw source content or approved summary text.",
    ],
    prohibitedEffects: [
      "live_match_suggestion",
      "participant_disclosure",
      "counterparty_contact",
      "ranking_change",
      "state_mutation",
      "raw_source_storage",
      "analytics_copy_of_raw_content",
    ],
    purpose:
      "Public contract for optional AI shadow-mode source evaluation: test approved, redacted source summaries without changing matching, disclosure, outreach, ranking, or product state.",
    requiredSourceFields: [...BACKGROUND_AI_SHADOW_REQUIRED_SOURCE_FIELDS],
    sampleBlockedEvaluation: buildBackgroundAiShadowEvaluation({
      now: new Date("2026-05-31T00:00:00.000Z"),
      sourceConnection: BACKGROUND_AI_SHADOW_SAMPLE_BLOCKED_SOURCE,
    }),
    sampleReadyEvaluation: buildBackgroundAiShadowEvaluation({
      now: new Date("2026-05-31T00:00:00.000Z"),
      sourceConnection: BACKGROUND_AI_SHADOW_SAMPLE_READY_SOURCE,
    }),
    stateMutation: false,
    version: BACKGROUND_AI_SHADOW_CONTRACT_VERSION,
  };
}

export function validateBackgroundAiShadowContract(
  contract: BackgroundAiShadowContract = getBackgroundAiShadowContract(),
): BackgroundAiShadowContractValidation {
  const sourceFields = contract.requiredSourceFields.map(String);
  const readyEvaluation = contract.sampleReadyEvaluation;
  const blockedEvaluation = contract.sampleBlockedEvaluation;
  const checks = [
    backgroundAiShadowContractCheck(
      "source-field-boundary",
      "Contract requires explicit consent, field permissions, summary, retention, status, and raw-ingestion fields",
      hasAll(sourceFields, BACKGROUND_AI_SHADOW_REQUIRED_SOURCE_FIELDS),
      sourceFields.join(", "),
    ),
    backgroundAiShadowContractCheck(
      "approved-summary-only",
      "Ready sample uses approved summaries only and redacts contact details",
      readyEvaluation.status === "ready_for_shadow" &&
        readyEvaluation.allowedUse === BACKGROUND_AI_SHADOW_ALLOWED_USE &&
        readyEvaluation.redactedApprovedSummary.includes("[redacted-email]") &&
        !readyEvaluation.redactedApprovedSummary.includes("alex@example.org"),
      `${readyEvaluation.status}; ${readyEvaluation.summaryCharacterCount} character(s)`,
    ),
    backgroundAiShadowContractCheck(
      "blocked-source-boundary",
      "Revoked, expired, or raw-ingestion sources are blocked",
      blockedEvaluation.status === "not_allowed" &&
        blockedEvaluation.blockedReasons.some((reason) => /Raw ingestion/i.test(reason)) &&
        blockedEvaluation.blockedReasons.some((reason) => /connected/i.test(reason)) &&
        blockedEvaluation.blockedReasons.some((reason) => /expired/i.test(reason)),
      blockedEvaluation.blockedReasons.join("; "),
    ),
    backgroundAiShadowContractCheck(
      "nonmutating-shadow-only",
      "Shadow mode cannot mutate state or affect matching, disclosure, outreach, or ranking",
      contract.stateMutation === false &&
        contract.decisioningMode === "approved_summary_shadow_evaluation_only" &&
        contract.prohibitedEffects.includes("state_mutation") &&
        contract.prohibitedEffects.includes("live_match_suggestion") &&
        contract.prohibitedEffects.includes("participant_disclosure") &&
        contract.prohibitedEffects.includes("ranking_change"),
      `${contract.decisioningMode}; stateMutation ${contract.stateMutation}`,
    ),
    backgroundAiShadowContractCheck(
      "raw-content-analytics-boundary",
      "Contract forbids raw source storage and analytics copies of raw content",
      contract.prohibitedEffects.includes("raw_source_storage") &&
        contract.prohibitedEffects.includes("analytics_copy_of_raw_content") &&
        contract.invariants.some((invariant) => /analytics/i.test(invariant)) &&
        contract.invariants.some((invariant) => /Raw connector ingestion/i.test(invariant)),
      contract.prohibitedEffects.join(", "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-ai-shadow-contract",
    validatorVersion: BACKGROUND_AI_SHADOW_CONTRACT_VALIDATOR_VERSION,
  };
}
