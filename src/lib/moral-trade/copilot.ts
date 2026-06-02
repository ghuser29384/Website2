import copilotContractJson from "../../../config/moral-trade/copilot-contract.json";

import {
  evaluateMoralTradeProtocolDraft,
  type MoralTradeProtocolDraftInput,
  type MoralTradeProtocolDraftReview,
  type MoralTradeVerificationStepStatus,
  type ProtocolReviewStatus,
  type ProtocolTrustRating,
} from "@/lib/proposal-review";

export const MORAL_TRADE_COPILOT_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-copilot-contract-validator-v0.3";

type CopilotRole = {
  key: string;
  label: string;
  description: string;
};

type CopilotGuardrail = {
  code: string;
  label: string;
  rule: string;
};

type CopilotPromptTemplate = {
  key: string;
  label: string;
  purpose: string;
  instructionSummary: string[];
  safetyCodes: string[];
  outputRequirements: string[];
};

type CopilotVerificationStep = {
  key: string;
  label: string;
  blocksMatchable: boolean;
};

type CopilotRolloutStage = {
  key: string;
  label: string;
  rule: string;
};

type CopilotRolloutReadinessSignal = {
  key: string;
  label: string;
  stages: string[];
  rule: string;
};

export type MoralTradeCopilotContract = {
  version: string;
  purpose: string;
  permittedRoles: CopilotRole[];
  promptTemplates: CopilotPromptTemplate[];
  strictInputBundle: string[];
  approvedOutputSections: string[];
  statusValues: string[];
  completenessFields: string[];
  trustAxes: string[];
  guardrails: CopilotGuardrail[];
  verificationLoop: CopilotVerificationStep[];
  redactionsAppliedByDefault: string[];
  rolloutStages: CopilotRolloutStage[];
  rolloutReadinessSignals: CopilotRolloutReadinessSignal[];
  humanControlledDecisions: string[];
  fallbackRule: string;
};

export interface MoralTradeCopilotContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeCopilotContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-copilot-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeCopilotContractCheck[];
  blockers: string[];
}

export interface MoralTradeCopilotImplementationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-copilot-review-route-implementation";
  validatorVersion: string;
  checks: MoralTradeCopilotContractCheck[];
  blockers: string[];
}

export type MoralTradeCopilotRolloutStageKey =
  | "shadow_mode"
  | "assist_mode"
  | "guarded_automation";

export interface MoralTradeCopilotRolloutReadinessInput {
  targetStage: MoralTradeCopilotRolloutStageKey;
  contract?: MoralTradeCopilotContract;
  observedRuns?: number;
  validatedOutputRate?: number;
  privacyIncidentCount?: number;
  stateMutationDisabled?: boolean;
  fallbackTested?: boolean;
  humanApprovalRequiredForStatusChanges?: boolean;
  evaluationAuditsPassing?: boolean;
  enabledTasks?: string[];
}

export interface MoralTradeCopilotRolloutReadiness {
  status: "pass" | "blocked";
  targetStage: MoralTradeCopilotRolloutStageKey;
  requiredSignals: string[];
  allowedTasks: string[];
  blockers: string[];
}

export interface MoralTradeCopilotOutput {
  status: ProtocolReviewStatus;
  completeness: {
    missing_required_fields: string[];
    underspecified_fields: string[];
    policy_conflicts: string[];
  };
  trade_structure: {
    format: string;
    offered_action: string;
    requested_action: string;
    duration: string;
    exit_conditions: string;
    verification_method: string;
  };
  trust_assessment: {
    factual_trust: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    counterfactual_baseline: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    externality_review: {
      required: boolean;
      flags: string[];
    };
    party_relative_benefit: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    privacy_redaction: {
      rating: ProtocolTrustRating;
      flags: string[];
      reasons: string[];
    };
  };
  match_explanation: {
    factor_codes: string[];
    confidence_band: ProtocolTrustRating;
    redactions_applied: string[];
  };
  verification_loop: Array<{
    key: string;
    label: string;
    status: MoralTradeVerificationStepStatus;
    detail: string;
    blocks_matchable: boolean;
  }>;
  clarification_questions: Array<{
    field: string;
    question: string;
  }>;
  uncertainty_flags: string[];
  next_step_checklist: string[];
  cited_evidence_table: Array<{
    claim: string;
    evidence_type: string;
    citation: string;
    status: string;
    reviewer_note: string;
  }>;
  review_instructions: {
    artifacts_to_request: string[];
    review_scope: string[];
    appeal_triggers: string[];
  };
  reviewer_summary: string;
  citations: string[];
}

export interface MoralTradeCopilotEvidenceMetadata {
  id: string;
  claim: string;
  evidence_type: string;
  citation: string;
  status:
    | "submitted"
    | "pending_review"
    | "reviewed"
    | "stale"
    | "wrong_scope"
    | "duplicate_challenged"
    | "rejected";
  scope:
    | "factual_action"
    | "counterfactual_baseline"
    | "externality_review"
    | "destination_review"
    | "privacy_review"
    | "other";
  redaction_level: "public" | "reviewer_only" | "participant_private";
  submitted_at: string | null;
}

export interface MoralTradeCopilotEvidenceMetadataNormalization {
  evidenceMetadata: MoralTradeCopilotEvidenceMetadata[];
  acceptedCount: number;
  rejectedCount: number;
  ignoredFieldCount: number;
  blockers: string[];
}

export interface MoralTradeCopilotEvidenceMetadataSummary {
  acceptedCount: number;
  rejectedCount: number;
  ignoredFieldCount: number;
  redactionsApplied: string[];
}

export interface MoralTradeCopilotStrictInputBundleAuditEntry {
  key: string;
  origin:
    | "request"
    | "system_contract"
    | "optional_for_draft_review"
    | "not_supplied";
  status: "present" | "provided_by_system" | "optional" | "missing";
}

export interface MoralTradeCopilotStrictInputBundleAudit {
  requiredSources: string[];
  acceptedTopLevelKeys: string[];
  rejectedTopLevelKeys: string[];
  ignoredTopLevelKeys: string[];
  sourceCoverage: MoralTradeCopilotStrictInputBundleAuditEntry[];
  blockers: string[];
}

const copilotContract = copilotContractJson as MoralTradeCopilotContract;

const REQUIRED_INPUT_BUNDLE = [
  "structured_draft",
  "policy_registry",
  "prohibited_pattern_registry",
  "factor_code_dictionary",
  "verification_method_taxonomy",
  "redaction_policy",
  "evidence_metadata",
  "redacted_profile_pair",
  "match_constraint_set",
  "stated_exclusions",
] as const;

const REQUIRED_OUTPUT_SECTIONS = [
  "status",
  "completeness",
  "trade_structure",
  "trust_assessment",
  "match_explanation",
  "verification_loop",
  "clarification_questions",
  "uncertainty_flags",
  "next_step_checklist",
  "cited_evidence_table",
  "review_instructions",
  "reviewer_summary",
  "citations",
] as const;

const REQUIRED_GUARDRAILS = [
  "approved_json_only",
  "no_chain_of_thought",
  "no_global_moral_ranking",
  "no_autonomous_outreach",
  "no_private_feed_ingestion",
  "separate_trust_axes",
  "anti_threat_escalation",
  "no_false_certainty",
  "no_escrow_legal_tax_claims",
  "verification_loop_matchability_gate",
] as const;

const REQUIRED_PROMPT_TEMPLATES = [
  "system_prompt",
  "draft_repair_prompt",
  "matching_prompt",
  "reviewer_summary_prompt",
] as const;

const REQUIRED_PROMPT_SAFETY_CODES = [
  "no_global_moral_ranking",
  "no_autonomous_outreach",
  "no_chain_of_thought",
  "human_review_required",
] as const;

const REQUIRED_VERIFICATION_STEPS = [
  "schema_completeness",
  "anti_threat",
  "baseline_credibility",
  "evidence_sufficiency",
  "externality_trigger",
  "privacy_redaction",
  "match_explanation",
  "human_review_routing",
] as const;

const REQUIRED_ROLLOUT_STAGES = ["shadow_mode", "assist_mode", "guarded_automation"] as const;
const REQUIRED_ROLLOUT_READINESS_SIGNALS = [
  "state_mutation_disabled",
  "fallback_path_tested",
  "zero_privacy_incidents",
  "human_approval_for_status_changes",
  "minimum_observed_runs",
  "validated_output_rate",
  "sample_evaluation_audits_passing",
  "low_risk_task_scope",
] as const;

const REQUIRED_HUMAN_CONTROLLED_DECISIONS = [
  "safety_blocking",
  "matching_disclosure",
  "reviewed_completion",
  "dispute_resolution",
] as const;

const MAX_EVIDENCE_METADATA_ENTRIES = 8;
const EVIDENCE_METADATA_ALLOWED_KEYS = [
  "id",
  "claim",
  "evidenceType",
  "evidence_type",
  "citation",
  "status",
  "scope",
  "redactionLevel",
  "redaction_level",
  "submittedAt",
  "submitted_at",
] as const;
const EVIDENCE_METADATA_FORBIDDEN_KEY_PATTERN =
  /(raw|body|private|contact|exact.*wish|source.*note|artifact.*content|free.*text)/i;
const COPILOT_REQUEST_ALLOWED_TOP_LEVEL_KEYS = [
  "draft",
  "structuredDraft",
  "structured_draft",
  "citations",
  "evidenceMetadata",
  "evidence_metadata",
] as const;
const COPILOT_SYSTEM_PROVIDED_INPUT_SOURCES = [
  "policy_registry",
  "prohibited_pattern_registry",
  "factor_code_dictionary",
  "verification_method_taxonomy",
  "redaction_policy",
  "match_constraint_set",
  "stated_exclusions",
] as const;
const COPILOT_OPTIONAL_DRAFT_REVIEW_INPUT_SOURCES = ["redacted_profile_pair"] as const;
const COPILOT_FORBIDDEN_TOP_LEVEL_KEY_PATTERN =
  /(raw|conversation|message|thread|browser|session|cookie|token|secret|private|contact|exact.*wish|source.*note|chain.*thought|hidden.*reasoning|internal.*reasoning|profile.*dump|app.*context)/i;
const COPILOT_FORBIDDEN_CITATION_PATTERN =
  /(raw|private|contact|exact.*wish|source.*note|chain.*thought|hidden.*reasoning|internal.*reasoning|scratchpad|message|thread|cookie|token|secret)/i;
const COPILOT_REQUIRED_REVIEWER_SUMMARY_SECTIONS = [
  "What is being offered",
  "What is being requested",
  "Baseline claim",
  "What evidence would count",
  "Main policy flags",
  "What remains unverified",
] as const;
const EVIDENCE_METADATA_STATUS_VALUES = [
  "submitted",
  "pending_review",
  "reviewed",
  "stale",
  "wrong_scope",
  "duplicate_challenged",
  "rejected",
] as const;
const EVIDENCE_METADATA_SCOPE_VALUES = [
  "factual_action",
  "counterfactual_baseline",
  "externality_review",
  "destination_review",
  "privacy_review",
  "other",
] as const;
const EVIDENCE_METADATA_REDACTION_LEVELS = [
  "public",
  "reviewer_only",
  "participant_private",
] as const;
const HIDDEN_REASONING_DISCLOSURE_PATTERN =
  /\b(chain[- ]of[- ]thought|hidden reasoning|internal reasoning|private reasoning|step[- ]by[- ]step reasoning|scratchpad|let me think|my reasoning is)\b/i;
const INCOMPLETE_RECORD_CERTAINTY_PATTERN =
  /\b(guaranteed|definitive(?:ly)?|certain(?:ly)?|conclusive(?:ly)?|unquestionably|no uncertainty|proven beyond doubt|fully verified|safe to rely on without review|can be relied on without review)\b/i;
const PROHIBITED_RELIANCE_CLAIM_PATTERN =
  /\b(escrow-backed|escrow protected|legally enforceable|tax deductible|tax treatment guaranteed|investment advice|custody service|custody-backed|platform moral endorsement|morally endorsed by the platform|completion guaranteed)\b/i;
const AUTONOMOUS_OUTREACH_SAFE_NEGATION_PATTERN =
  /\b(do not|don't|never|must not|cannot|should not|no autonomous outreach|only after explicit consent)\b/i;
const AUTONOMOUS_OUTREACH_PATTERNS = [
  /\b(automatically|autonomously|without explicit consent|without consent|before consent|prior to consent|before approval)\b[^.\n]{0,120}\b(contact|email|message|notify|introduce|disclose|reveal|send)\b/i,
  /\b(contact|email|message|notify|introduce|disclose|reveal|send)\b[^.\n]{0,120}\b(counterpart(?:y|ies)|matched part(?:y|ies)|other participant|participants?|private wish(?:es)?|private contact|contact details|email address|phone number)\b[^.\n]{0,120}\b(without explicit consent|without consent|before consent|prior to consent|before approval|automatically|autonomously|now|immediately)\b/i,
  /\b(send|disclose|reveal|share)\b[^.\n]{0,120}\b(private wish(?:es)?|contact details|email address|phone number)\b/i,
] as const;

export const MORAL_TRADE_COPILOT_EVIDENCE_METADATA_REDACTIONS = [
  "raw_artifact_body",
  "private_notes",
  "contact_details",
  "exact_private_wishes",
] as const;

const COPILOT_ROLLOUT_ALLOWED_TASKS: Record<MoralTradeCopilotRolloutStageKey, string[]> = {
  shadow_mode: ["draft_critique", "reviewer_summary_second_screen"],
  assist_mode: ["structured_field_prefill", "factor_code_prefill", "evidence_checklist_prefill"],
  guarded_automation: [
    "missing_field_detection",
    "explanation_generation",
    "evidence_checklist_drafting",
  ],
};

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function containsHiddenReasoningDisclosure(value: string) {
  return HIDDEN_REASONING_DISCLOSURE_PATTERN.test(value);
}

function containsIncompleteRecordCertaintyClaim(value: string) {
  return INCOMPLETE_RECORD_CERTAINTY_PATTERN.test(value);
}

function containsProhibitedRelianceClaim(value: string) {
  return PROHIBITED_RELIANCE_CLAIM_PATTERN.test(value);
}

function containsAutonomousOutreachClaim(value: string) {
  return value.split(/[.!?\n]+/).some((sentence) => {
    const trimmed = sentence.trim();

    return (
      Boolean(trimmed) &&
      !AUTONOMOUS_OUTREACH_SAFE_NEGATION_PATTERN.test(trimmed) &&
      AUTONOMOUS_OUTREACH_PATTERNS.some((pattern) => pattern.test(trimmed))
    );
  });
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeCopilotContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function validateMoralTradeCopilotReviewRouteImplementation({
  routeSource,
}: {
  routeSource: string;
}): MoralTradeCopilotImplementationValidation {
  const forbiddenMutationPatterns = [
    /\bcreateClient\b/,
    /\bcreateServiceClient\b/,
    /\bsupabase\b/i,
    /\.from\s*\(/,
    /\.insert\s*\(/,
    /\.upsert\s*\(/,
    /\.update\s*\(/,
    /\.delete\s*\(/,
    /\brevalidatePath\b/,
    /\bredirect\b/,
    /\bqueueEmailOutbox\b/,
    /\bfetch\s*\(/,
  ];
  const matchedForbiddenPatterns = forbiddenMutationPatterns
    .filter((pattern) => pattern.test(routeSource))
    .map((pattern) => pattern.source);
  const checks = [
    check(
      "copilot-review-private-no-store",
      "Copilot review responses are private no-store",
      /Cache-Control/.test(routeSource) && /private,\s*no-store/.test(routeSource),
      "Review route should set Cache-Control private, no-store on every JSON response.",
    ),
    check(
      "copilot-review-deterministic-mode",
      "Copilot review route declares deterministic advisory mode",
      /decisioningMode:\s*"deterministic_draft_review_only"/.test(routeSource) &&
        /stateMutation:\s*false/.test(routeSource) &&
        !/stateMutation:\s*true/.test(routeSource),
      "Review route should return deterministic_draft_review_only and stateMutation=false.",
    ),
    check(
      "copilot-review-no-live-mutations",
      "Copilot review route does not import or call live mutation surfaces",
      matchedForbiddenPatterns.length === 0,
      matchedForbiddenPatterns.length
        ? `Forbidden mutation pattern(s): ${matchedForbiddenPatterns.join(", ")}`
        : "No Supabase writes, revalidation, redirects, email, outreach, or fetch calls detected.",
    ),
    check(
      "copilot-review-strict-input-normalization",
      "Copilot review route normalizes only the strict input bundle",
      /normalizeDraftInput/.test(routeSource) &&
        /auditMoralTradeCopilotStrictInputBundle/.test(routeSource) &&
        /inputBundleAudit\.blockers/.test(routeSource) &&
        /normalizeMoralTradeCopilotEvidenceMetadata/.test(routeSource) &&
        /normalizeCitations/.test(routeSource) &&
        /MAX_TEXT_FIELD_LENGTH/.test(routeSource) &&
        /contract\.strictInputBundle/.test(routeSource),
      "Review route should normalize structured draft, citations, and redacted evidence metadata only.",
    ),
    check(
      "copilot-review-output-validation",
      "Copilot review route validates output before success",
      /validateMoralTradeCopilotOutput/.test(routeSource) &&
        /contractValidation\.blockers/.test(routeSource) &&
        /outputValidation\.blockers/.test(routeSource) &&
        /evidenceMetadataNormalization\.blockers/.test(routeSource) &&
        /blockers\.length\s*\?\s*422\s*:\s*200/.test(routeSource),
      "Review route should combine contract, output, and metadata blockers before returning success.",
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-copilot-review-route-implementation",
    validatorVersion: MORAL_TRADE_COPILOT_CONTRACT_VALIDATOR_VERSION,
    checks,
    blockers,
  };
}

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function cleanBounded(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEvidenceMetadataToken(value: unknown) {
  return cleanBounded(value, 80).toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
}

function containsContactLikeText(value: string) {
  return /@/.test(value) || /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(value);
}

function isHttpEvidenceLocator(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isApprovedCopilotCitation(value: string, evidenceType?: string) {
  const citation = value.trim();

  if (
    !citation ||
    citation.length > 240 ||
    containsContactLikeText(citation) ||
    containsHiddenReasoningDisclosure(citation) ||
    COPILOT_FORBIDDEN_CITATION_PATTERN.test(citation)
  ) {
    return false;
  }

  if (evidenceType === "draft_field") {
    return /^draft\.[a-z0-9_]+$/i.test(citation);
  }

  if (evidenceType === "policy_registry") {
    return /^policy_registry\.[a-z0-9_:-]+$/i.test(citation);
  }

  if (evidenceType === "artifact_request") {
    return /^review_instructions\.[a-z0-9_]+$/i.test(citation);
  }

  if (evidenceType === "evidence_locator") {
    return /^evidence:[A-Za-z0-9._:-]+$/.test(citation) || isHttpEvidenceLocator(citation);
  }

  return /^(proposal|evidence|policy|protocol|contract|review):[A-Za-z0-9._:-]+$/.test(
    citation,
  );
}

function isValidIsoDate(value: string) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function getEnumValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
): T[number] | null {
  const normalized = normalizeEvidenceMetadataToken(value);

  return allowedValues.includes(normalized as T[number]) ? (normalized as T[number]) : null;
}

function getEvidenceMetadataRawValue(
  entry: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) {
  return entry[camelKey] ?? entry[snakeKey];
}

function buildEvidenceMetadataReviewerNote(metadata: MoralTradeCopilotEvidenceMetadata) {
  return `Already-submitted ${metadata.scope.replaceAll("_", " ")} metadata only; raw artifacts and private notes stay outside the copilot bundle.`;
}

export function auditMoralTradeCopilotStrictInputBundle(
  value: unknown,
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotStrictInputBundleAudit {
  const allowedRequestKeys = new Set<string>(COPILOT_REQUEST_ALLOWED_TOP_LEVEL_KEYS);
  const systemProvidedSources = new Set<string>(COPILOT_SYSTEM_PROVIDED_INPUT_SOURCES);
  const optionalDraftReviewSources = new Set<string>(
    COPILOT_OPTIONAL_DRAFT_REVIEW_INPUT_SOURCES,
  );
  const requestRecord = isRecord(value) ? value : {};
  const topLevelKeys = Object.keys(requestRecord);
  const acceptedTopLevelKeys = topLevelKeys.filter((key) => allowedRequestKeys.has(key));
  const ignoredTopLevelKeys = topLevelKeys.filter((key) => !allowedRequestKeys.has(key));
  const rejectedTopLevelKeys = ignoredTopLevelKeys.filter((key) =>
    COPILOT_FORBIDDEN_TOP_LEVEL_KEY_PATTERN.test(key),
  );
  const hasStructuredDraft = acceptedTopLevelKeys.some((key) =>
    ["draft", "structuredDraft", "structured_draft"].includes(key),
  );
  const hasEvidenceMetadata = acceptedTopLevelKeys.some((key) =>
    ["evidenceMetadata", "evidence_metadata"].includes(key),
  );
  const blockers = rejectedTopLevelKeys.map(
    (key) => `strict_input_bundle:top_level_field_not_allowed:${key}`,
  );

  if (!hasStructuredDraft) {
    blockers.push("strict_input_bundle:structured_draft_missing");
  }

  const sourceCoverage = contract.strictInputBundle.map((key) => {
    if (key === "structured_draft") {
      return {
        key,
        origin: hasStructuredDraft ? "request" : "not_supplied",
        status: hasStructuredDraft ? "present" : "missing",
      } satisfies MoralTradeCopilotStrictInputBundleAuditEntry;
    }

    if (key === "evidence_metadata") {
      return {
        key,
        origin: hasEvidenceMetadata ? "request" : "optional_for_draft_review",
        status: hasEvidenceMetadata ? "present" : "optional",
      } satisfies MoralTradeCopilotStrictInputBundleAuditEntry;
    }

    if (systemProvidedSources.has(key)) {
      return {
        key,
        origin: "system_contract",
        status: "provided_by_system",
      } satisfies MoralTradeCopilotStrictInputBundleAuditEntry;
    }

    if (optionalDraftReviewSources.has(key)) {
      return {
        key,
        origin: "optional_for_draft_review",
        status: "optional",
      } satisfies MoralTradeCopilotStrictInputBundleAuditEntry;
    }

    return {
      key,
      origin: "not_supplied",
      status: "missing",
    } satisfies MoralTradeCopilotStrictInputBundleAuditEntry;
  });

  return {
    requiredSources: [...contract.strictInputBundle],
    acceptedTopLevelKeys,
    rejectedTopLevelKeys,
    ignoredTopLevelKeys,
    sourceCoverage,
    blockers,
  };
}

export function normalizeMoralTradeCopilotEvidenceMetadata(
  value: unknown,
): MoralTradeCopilotEvidenceMetadataNormalization {
  const blockers: string[] = [];
  let ignoredFieldCount = 0;
  let rejectedCount = 0;

  if (value == null) {
    return {
      evidenceMetadata: [],
      acceptedCount: 0,
      rejectedCount: 0,
      ignoredFieldCount: 0,
      blockers: [],
    };
  }

  if (!Array.isArray(value)) {
    return {
      evidenceMetadata: [],
      acceptedCount: 0,
      rejectedCount: 1,
      ignoredFieldCount: 0,
      blockers: ["evidence_metadata: expected an array of already-submitted metadata objects"],
    };
  }

  if (value.length > MAX_EVIDENCE_METADATA_ENTRIES) {
    blockers.push(`evidence_metadata: at most ${MAX_EVIDENCE_METADATA_ENTRIES} entries are allowed`);
  }

  const allowedKeys = new Set<string>(EVIDENCE_METADATA_ALLOWED_KEYS);
  const evidenceMetadata = value.slice(0, MAX_EVIDENCE_METADATA_ENTRIES).flatMap((entry, index) => {
    const entryBlockers: string[] = [];

    if (!isRecord(entry)) {
      rejectedCount += 1;
      blockers.push(`evidence_metadata:${index}: metadata entry must be an object`);
      return [];
    }

    const unknownKeys = Object.keys(entry).filter((key) => !allowedKeys.has(key));
    const forbiddenKeys = unknownKeys.filter((key) =>
      EVIDENCE_METADATA_FORBIDDEN_KEY_PATTERN.test(key),
    );
    ignoredFieldCount += unknownKeys.length;

    if (forbiddenKeys.length) {
      entryBlockers.push(
        `raw_or_private_fields_not_allowed:${forbiddenKeys.sort().join(",")}`,
      );
    }

    const id = cleanBounded(entry.id, 80);
    const claim = cleanBounded(entry.claim, 180);
    const evidenceType = normalizeEvidenceMetadataToken(
      getEvidenceMetadataRawValue(entry, "evidenceType", "evidence_type"),
    );
    const citation = cleanBounded(entry.citation, 180);
    const status = getEnumValue(entry.status, EVIDENCE_METADATA_STATUS_VALUES);
    const scope = getEnumValue(entry.scope, EVIDENCE_METADATA_SCOPE_VALUES);
    const redactionLevel = getEnumValue(
      getEvidenceMetadataRawValue(entry, "redactionLevel", "redaction_level"),
      EVIDENCE_METADATA_REDACTION_LEVELS,
    );
    const submittedAt = cleanBounded(
      getEvidenceMetadataRawValue(entry, "submittedAt", "submitted_at"),
      40,
    );

    if (!id) {
      entryBlockers.push("id_required");
    }

    if (!claim || containsContactLikeText(claim)) {
      entryBlockers.push("redacted_claim_required");
    }

    if (!evidenceType) {
      entryBlockers.push("evidence_type_required");
    }

    if (!isApprovedCopilotCitation(citation, "evidence_locator")) {
      entryBlockers.push("redacted_citation_required");
    }

    if (!status) {
      entryBlockers.push("status_invalid");
    }

    if (!scope) {
      entryBlockers.push("scope_invalid");
    }

    if (!redactionLevel) {
      entryBlockers.push("redaction_level_invalid");
    }

    if (submittedAt && !isValidIsoDate(submittedAt)) {
      entryBlockers.push("submitted_at_invalid");
    }

    if (entryBlockers.length || !status || !scope || !redactionLevel) {
      rejectedCount += 1;
      blockers.push(
        ...entryBlockers.map((blocker) => `evidence_metadata:${index}:${blocker}`),
      );
      return [];
    }

    return [
      {
        id,
        claim,
        evidence_type: evidenceType,
        citation,
        status,
        scope,
        redaction_level: redactionLevel,
        submitted_at: submittedAt || null,
      } satisfies MoralTradeCopilotEvidenceMetadata,
    ];
  });

  return {
    evidenceMetadata,
    acceptedCount: evidenceMetadata.length,
    rejectedCount,
    ignoredFieldCount,
    blockers,
  };
}

export function summarizeMoralTradeCopilotEvidenceMetadata(
  normalization: MoralTradeCopilotEvidenceMetadataNormalization,
): MoralTradeCopilotEvidenceMetadataSummary {
  return {
    acceptedCount: normalization.acceptedCount,
    rejectedCount: normalization.rejectedCount,
    ignoredFieldCount: normalization.ignoredFieldCount,
    redactionsApplied: [...MORAL_TRADE_COPILOT_EVIDENCE_METADATA_REDACTIONS],
  };
}

function getConfidenceBand(review: MoralTradeProtocolDraftReview): ProtocolTrustRating {
  if (review.status === "blocked" || review.status === "draft" || review.status === "needs_clarification") {
    return "low";
  }

  if (
    review.trustAssessment.factualTrust.rating === "high" &&
    review.trustAssessment.counterfactualBaseline.rating === "high" &&
    review.trustAssessment.partyRelativeBenefit.rating === "high" &&
    review.trustAssessment.privacyRedaction.rating === "high" &&
    !review.trustAssessment.externalityReview.required
  ) {
    return "high";
  }

  if (
    review.trustAssessment.factualTrust.rating === "low" ||
    review.trustAssessment.partyRelativeBenefit.rating === "low" ||
    review.trustAssessment.privacyRedaction.rating === "low"
  ) {
    return "low";
  }

  return "medium";
}

export function getMoralTradeCopilotContract() {
  return copilotContract;
}

function rolloutSignalKeysForStage(
  contract: MoralTradeCopilotContract,
  targetStage: MoralTradeCopilotRolloutStageKey,
) {
  return contract.rolloutReadinessSignals
    .filter((signal) => signal.stages.includes(targetStage))
    .map((signal) => signal.key);
}

function getObservedRunMinimum(targetStage: MoralTradeCopilotRolloutStageKey) {
  if (targetStage === "guarded_automation") {
    return 100;
  }

  if (targetStage === "assist_mode") {
    return 20;
  }

  return 0;
}

function getValidatedOutputRateMinimum(targetStage: MoralTradeCopilotRolloutStageKey) {
  if (targetStage === "guarded_automation") {
    return 0.98;
  }

  if (targetStage === "assist_mode") {
    return 0.95;
  }

  return 0;
}

export function auditMoralTradeCopilotRolloutReadiness({
  targetStage,
  contract = copilotContract,
  observedRuns = 0,
  validatedOutputRate = 0,
  privacyIncidentCount = 0,
  stateMutationDisabled = false,
  fallbackTested = false,
  humanApprovalRequiredForStatusChanges = false,
  evaluationAuditsPassing = false,
  enabledTasks = [],
}: MoralTradeCopilotRolloutReadinessInput): MoralTradeCopilotRolloutReadiness {
  const blockers: string[] = [];
  const stageKnown = contract.rolloutStages.some((stage) => stage.key === targetStage);
  const requiredSignals = stageKnown ? rolloutSignalKeysForStage(contract, targetStage) : [];
  const allowedTasks = COPILOT_ROLLOUT_ALLOWED_TASKS[targetStage] ?? [];
  const minimumObservedRuns = getObservedRunMinimum(targetStage);
  const minimumValidatedOutputRate = getValidatedOutputRateMinimum(targetStage);

  if (!stageKnown) {
    blockers.push(`unknown_rollout_stage:${targetStage}`);
  }

  if (!stateMutationDisabled) {
    blockers.push(`state_mutation_must_remain_disabled:${targetStage}`);
  }

  if (!fallbackTested) {
    blockers.push(`fallback_path_not_tested:${targetStage}`);
  }

  if (privacyIncidentCount > 0) {
    blockers.push(`privacy_incidents_must_be_zero:${privacyIncidentCount}`);
  }

  if (!humanApprovalRequiredForStatusChanges) {
    blockers.push(`human_status_approval_required:${targetStage}`);
  }

  if (observedRuns < minimumObservedRuns) {
    blockers.push(`minimum_observed_runs_required:${minimumObservedRuns}`);
  }

  if (validatedOutputRate < minimumValidatedOutputRate) {
    blockers.push(`validated_output_rate_required:${minimumValidatedOutputRate}`);
  }

  if ((targetStage === "assist_mode" || targetStage === "guarded_automation") && !evaluationAuditsPassing) {
    blockers.push(`sample_evaluation_audits_required:${targetStage}`);
  }

  for (const task of enabledTasks) {
    if (!allowedTasks.includes(task)) {
      blockers.push(`task_not_allowed_for_${targetStage}:${task}`);
    }
  }

  if (
    targetStage === "guarded_automation" &&
    !hasAll(contract.humanControlledDecisions, REQUIRED_HUMAN_CONTROLLED_DECISIONS)
  ) {
    blockers.push("human_controlled_decisions_missing_for_guarded_automation");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    targetStage,
    requiredSignals,
    allowedTasks,
    blockers: Array.from(new Set(blockers)),
  };
}

export function getMoralTradeCopilotRolloutReadinessAudits(
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotRolloutReadiness[] {
  return [
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "shadow_mode",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: ["draft_critique", "reviewer_summary_second_screen"],
    }),
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "assist_mode",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: ["structured_field_prefill", "factor_code_prefill"],
    }),
    auditMoralTradeCopilotRolloutReadiness({
      targetStage: "guarded_automation",
      contract,
      stateMutationDisabled: true,
      fallbackTested: true,
      humanApprovalRequiredForStatusChanges: true,
      privacyIncidentCount: 0,
      enabledTasks: [
        "missing_field_detection",
        "explanation_generation",
        "evidence_checklist_drafting",
      ],
    }),
  ];
}

export function validateMoralTradeCopilotContract(
  contract: MoralTradeCopilotContract = copilotContract,
): MoralTradeCopilotContractValidation {
  const readinessAudits = getMoralTradeCopilotRolloutReadinessAudits(contract);
  const checks = [
    check(
      "strict-input-bundle",
      "Strict input bundle",
      hasAll(contract.strictInputBundle, REQUIRED_INPUT_BUNDLE),
      contract.strictInputBundle.join(", "),
    ),
    check(
      "approved-output-sections",
      "Approved output sections",
      hasAll(contract.approvedOutputSections, REQUIRED_OUTPUT_SECTIONS),
      contract.approvedOutputSections.join(", "),
    ),
    check(
      "status-values",
      "Status values",
      hasAll(contract.statusValues, [
        "draft",
        "needs_clarification",
        "needs_evidence",
        "needs_human_review",
        "challenge_window",
        "blocked",
        "matchable",
      ]),
      contract.statusValues.join(", "),
    ),
    check(
      "trust-axes",
      "Trust axes stay separate",
      hasAll(contract.trustAxes, [
        "factual_trust",
        "counterfactual_baseline",
        "externality_review",
        "party_relative_benefit",
        "privacy_redaction",
      ]),
      contract.trustAxes.join(", "),
    ),
    check(
      "guardrails",
      "Copilot guardrails",
      hasAll(
        contract.guardrails.map((guardrail) => guardrail.code),
        REQUIRED_GUARDRAILS,
      ),
      `${contract.guardrails.length} guardrail(s), including no outreach and no global ranking.`,
    ),
    check(
      "prompt-templates",
      "Approved prompt template registry",
      hasAll(
        contract.promptTemplates.map((template) => template.key),
        REQUIRED_PROMPT_TEMPLATES,
      ) &&
        contract.promptTemplates.every(
          (template) =>
            template.instructionSummary.length > 0 &&
            template.safetyCodes.length > 0 &&
            template.outputRequirements.length > 0,
        ),
      contract.promptTemplates.map((template) => template.key).join(", "),
    ),
    check(
      "prompt-template-safety",
      "Prompt templates preserve copilot guardrails",
      hasAll(
        Array.from(
          new Set(contract.promptTemplates.flatMap((template) => template.safetyCodes)),
        ),
        REQUIRED_PROMPT_SAFETY_CODES,
      ) &&
        contract.promptTemplates.some(
          (template) =>
            template.key === "reviewer_summary_prompt" &&
            template.safetyCodes.includes("no_escrow_legal_tax_claims"),
        ) &&
        contract.promptTemplates.some(
          (template) =>
            template.key === "matching_prompt" &&
            template.safetyCodes.includes("no_private_inference"),
        ),
      contract.promptTemplates
        .map((template) => `${template.key}:${template.safetyCodes.join("+")}`)
        .join(", "),
    ),
    check(
      "verification-loop",
      "Fixed verification loop",
      hasAll(
        contract.verificationLoop.map((step) => step.key),
        REQUIRED_VERIFICATION_STEPS,
      ),
      contract.verificationLoop.map((step) => step.key).join(", "),
    ),
    check(
      "rollout-stages",
      "Constrained rollout stages",
      hasAll(
        contract.rolloutStages.map((stage) => stage.key),
        REQUIRED_ROLLOUT_STAGES,
      ) &&
        contract.humanControlledDecisions.includes("safety_blocking") &&
        contract.humanControlledDecisions.includes("dispute_resolution"),
      contract.rolloutStages.map((stage) => stage.key).join(", "),
    ),
    check(
      "rollout-readiness-signals",
      "Rollout readiness signals",
      hasAll(
        contract.rolloutReadinessSignals.map((signal) => signal.key),
        REQUIRED_ROLLOUT_READINESS_SIGNALS,
      ) &&
        contract.rolloutReadinessSignals.every((signal) =>
          signal.stages.every((stage) => contract.rolloutStages.some((entry) => entry.key === stage)),
        ),
      contract.rolloutReadinessSignals.map((signal) => signal.key).join(", "),
    ),
    check(
      "rollout-readiness-audit",
      "Default rollout audit starts in shadow mode and blocks higher automation until evidence exists",
      readinessAudits.find((audit) => audit.targetStage === "shadow_mode")?.status === "pass" &&
        readinessAudits
          .filter((audit) => audit.targetStage !== "shadow_mode")
          .every((audit) => audit.status === "blocked"),
      readinessAudits.map((audit) => `${audit.targetStage}:${audit.status}`).join(", "),
    ),
    check(
      "safe-fallback",
      "Safe fallback",
      /deterministic|manual/i.test(contract.fallbackRule) && /without changing proposal state/i.test(contract.fallbackRule),
      contract.fallbackRule,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-copilot-contract",
    validatorVersion: MORAL_TRADE_COPILOT_CONTRACT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

export function buildMoralTradeCopilotOutput(
  input: MoralTradeProtocolDraftInput,
  citations: string[] = [],
  evidenceMetadata: MoralTradeCopilotEvidenceMetadata[] = [],
): MoralTradeCopilotOutput {
  const review = evaluateMoralTradeProtocolDraft(input);

  return {
    status: review.status,
    completeness: {
      missing_required_fields: review.missingRequiredFields,
      underspecified_fields: review.underspecifiedFields,
      policy_conflicts: review.policyConflicts,
    },
    trade_structure: {
      format: clean(input.format),
      offered_action: clean(input.offeredAction),
      requested_action: clean(input.requestedAction),
      duration: clean(input.duration),
      exit_conditions: clean(input.exitConditions),
      verification_method: clean(input.verificationMethod),
    },
    trust_assessment: {
      factual_trust: review.trustAssessment.factualTrust,
      counterfactual_baseline: review.trustAssessment.counterfactualBaseline,
      externality_review: review.trustAssessment.externalityReview,
      party_relative_benefit: review.trustAssessment.partyRelativeBenefit,
      privacy_redaction: review.trustAssessment.privacyRedaction,
    },
    match_explanation: {
      factor_codes: review.factorCodes,
      confidence_band: getConfidenceBand(review),
      redactions_applied: copilotContract.redactionsAppliedByDefault,
    },
    verification_loop: review.verificationLoop.map((step) => ({
      key: step.key,
      label: step.label,
      status: step.status,
      detail: step.detail,
      blocks_matchable: step.blocksMatchable,
    })),
    clarification_questions: review.clarificationQuestions,
    uncertainty_flags: review.uncertaintyFlags,
    next_step_checklist: review.nextStepChecklist,
    cited_evidence_table: [
      ...review.citedEvidenceTable.map((row) => ({
        claim: row.claim,
        evidence_type: row.evidenceType,
        citation: row.citation,
        status: row.status,
        reviewer_note: row.reviewerNote,
      })),
      ...evidenceMetadata.map((metadata) => ({
        claim: metadata.claim,
        evidence_type: metadata.evidence_type,
        citation: metadata.citation,
        status: metadata.status,
        reviewer_note: buildEvidenceMetadataReviewerNote(metadata),
      })),
    ],
    review_instructions: {
      artifacts_to_request: review.reviewInstructions.artifactsToRequest,
      review_scope: review.reviewInstructions.reviewScope,
      appeal_triggers: review.reviewInstructions.appealTriggers,
    },
    reviewer_summary: review.reviewerSummary,
    citations,
  };
}

export function validateMoralTradeCopilotOutput(output: MoralTradeCopilotOutput) {
  const blockers: string[] = [];
  const verificationContractByKey = new Map(
    copilotContract.verificationLoop.map((step) => [step.key, step]),
  );

  if (!copilotContract.statusValues.includes(output.status)) {
    blockers.push("status: unrecognized copilot status");
  }

  if (output.status === "matchable" && output.completeness.policy_conflicts.length > 0) {
    blockers.push("policy_conflicts: blocked proposals cannot be matchable");
  }

  if (output.status === "matchable" && output.completeness.missing_required_fields.length > 0) {
    blockers.push("missing_required_fields: incomplete drafts cannot be matchable");
  }

  if (
    output.status === "challenge_window" &&
    (!output.trust_assessment.externality_review.required ||
      output.completeness.missing_required_fields.length > 0)
  ) {
    blockers.push(
      "challenge_window: only complete drafts with material externality review triggers can enter challenge window",
    );
  }

  if (!output.match_explanation.redactions_applied.length) {
    blockers.push("redactions_applied: privacy-safe outputs must name default redactions");
  }

  if (
    !hasAll(
      output.verification_loop.map((step) => step.key),
      copilotContract.verificationLoop.map((step) => step.key),
    ) ||
    output.verification_loop.some(
      (step) => !step.label || !step.status || !step.detail || typeof step.blocks_matchable !== "boolean",
    )
  ) {
    blockers.push("verification_loop: every fixed verification step needs status and detail");
  }

  const verificationContractMismatches = output.verification_loop
    .filter(
      (step) =>
        verificationContractByKey.get(step.key)?.blocksMatchable !== step.blocks_matchable,
    )
    .map((step) => step.key);

  if (verificationContractMismatches.length) {
    blockers.push(
      `verification_loop_contract_mismatch: ${verificationContractMismatches.join(", ")}`,
    );
  }

  const blockingVerificationFailures = output.verification_loop
    .filter(
      (step) =>
        verificationContractByKey.get(step.key)?.blocksMatchable && step.status !== "pass",
    )
    .map((step) => `${step.key}:${step.status}`);
  const incompleteRecord =
    output.status !== "matchable" ||
    output.completeness.missing_required_fields.length > 0 ||
    output.completeness.underspecified_fields.length > 0 ||
    output.completeness.policy_conflicts.length > 0 ||
    blockingVerificationFailures.length > 0;

  if (output.status === "matchable" && blockingVerificationFailures.length) {
    blockers.push(
      `matchable_verification_loop: blocking steps must pass before matchable status: ${blockingVerificationFailures.join(", ")}`,
    );
  }

  if (output.clarification_questions.length > 5) {
    blockers.push("clarification_questions: at most five field-tied questions are allowed");
  }

  if (
    (output.completeness.missing_required_fields.length > 0 ||
      output.completeness.underspecified_fields.length > 0) &&
    output.clarification_questions.length === 0
  ) {
    blockers.push("clarification_questions: incomplete drafts need field-tied questions");
  }

  if (!output.next_step_checklist.length) {
    blockers.push("next_step_checklist: required next steps are missing");
  }

  if (
    containsHiddenReasoningDisclosure(output.reviewer_summary) ||
    output.verification_loop.some((step) => containsHiddenReasoningDisclosure(step.detail)) ||
    output.cited_evidence_table.some((row) =>
      containsHiddenReasoningDisclosure(`${row.claim} ${row.reviewer_note}`),
    ) ||
    output.next_step_checklist.some((step) => containsHiddenReasoningDisclosure(step))
  ) {
    blockers.push(
      "no_chain_of_thought: outputs must expose summaries, citations, uncertainty flags, and next steps instead of hidden reasoning transcripts",
    );
  }

  if (
    incompleteRecord &&
    (containsIncompleteRecordCertaintyClaim(output.reviewer_summary) ||
      output.verification_loop.some((step) => containsIncompleteRecordCertaintyClaim(step.detail)) ||
      output.cited_evidence_table.some((row) =>
        containsIncompleteRecordCertaintyClaim(`${row.claim} ${row.reviewer_note}`),
      ) ||
      output.next_step_checklist.some((step) => containsIncompleteRecordCertaintyClaim(step)) ||
      output.review_instructions.artifacts_to_request.some(containsIncompleteRecordCertaintyClaim) ||
      output.review_instructions.review_scope.some(containsIncompleteRecordCertaintyClaim) ||
      output.review_instructions.appeal_triggers.some(containsIncompleteRecordCertaintyClaim))
  ) {
    blockers.push(
      "no_false_certainty: incomplete outputs must preserve uncertainty instead of claiming definitive reliance",
    );
  }

  if (
    containsProhibitedRelianceClaim(output.reviewer_summary) ||
    output.verification_loop.some((step) => containsProhibitedRelianceClaim(step.detail)) ||
    output.cited_evidence_table.some((row) =>
      containsProhibitedRelianceClaim(`${row.claim} ${row.reviewer_note}`),
    ) ||
    output.next_step_checklist.some((step) => containsProhibitedRelianceClaim(step)) ||
    output.review_instructions.artifacts_to_request.some(containsProhibitedRelianceClaim) ||
    output.review_instructions.review_scope.some(containsProhibitedRelianceClaim) ||
    output.review_instructions.appeal_triggers.some(containsProhibitedRelianceClaim)
  ) {
    blockers.push(
      "no_escrow_legal_tax_claims: copilot outputs cannot imply escrow, custody, legal enforceability, tax treatment, investment advice, guarantees, or objective moral endorsement",
    );
  }

  if (
    containsAutonomousOutreachClaim(output.reviewer_summary) ||
    output.verification_loop.some((step) => containsAutonomousOutreachClaim(step.detail)) ||
    output.cited_evidence_table.some((row) =>
      containsAutonomousOutreachClaim(`${row.claim} ${row.reviewer_note}`),
    ) ||
    output.next_step_checklist.some((step) => containsAutonomousOutreachClaim(step)) ||
    output.review_instructions.artifacts_to_request.some(containsAutonomousOutreachClaim) ||
    output.review_instructions.review_scope.some(containsAutonomousOutreachClaim) ||
    output.review_instructions.appeal_triggers.some(containsAutonomousOutreachClaim)
  ) {
    blockers.push(
      "no_autonomous_outreach: copilot outputs cannot instruct contact, introduction, or private disclosure before explicit consent",
    );
  }

  if (
    !output.cited_evidence_table.length ||
    output.cited_evidence_table.some(
      (row) => !row.claim || !row.citation || !row.status || !row.reviewer_note,
    )
  ) {
    blockers.push("cited_evidence_table: structured claim evidence rows with citations are required");
  }

  const invalidEvidenceCitations = output.cited_evidence_table
    .filter((row) => !isApprovedCopilotCitation(row.citation, row.evidence_type))
    .map((row) => row.citation);
  const invalidOutputCitations = output.citations.filter(
    (citation) => !isApprovedCopilotCitation(citation),
  );

  if (invalidEvidenceCitations.length || invalidOutputCitations.length) {
    blockers.push(
      `citations: unsupported or private citation namespace: ${[
        ...invalidEvidenceCitations,
        ...invalidOutputCitations,
      ].join(", ")}`,
    );
  }

  const reviewerSummaryWordCount = output.reviewer_summary.split(/\s+/).filter(Boolean).length;
  const missingReviewerSummarySections = COPILOT_REQUIRED_REVIEWER_SUMMARY_SECTIONS.filter(
    (section) => !new RegExp(`${section}:`, "i").test(output.reviewer_summary),
  );

  if (!output.reviewer_summary || reviewerSummaryWordCount > 180) {
    blockers.push("reviewer_summary: bounded reviewer summary is missing or over 180 words");
  }

  if (missingReviewerSummarySections.length) {
    blockers.push(
      `reviewer_summary: missing required reviewer sections: ${missingReviewerSummarySections.join(", ")}`,
    );
  }

  if (
    !output.trust_assessment.factual_trust ||
    !output.trust_assessment.counterfactual_baseline ||
    !output.trust_assessment.externality_review ||
    !output.trust_assessment.party_relative_benefit ||
    !output.trust_assessment.privacy_redaction
  ) {
    blockers.push(
      "trust_assessment: factual, baseline, externality, party-relative, and privacy-redaction axes are required",
    );
  }

  return {
    status: blockers.length ? "fail" : "pass",
    blockers,
  };
}
