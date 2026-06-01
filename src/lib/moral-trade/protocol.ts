import { createHash } from "node:crypto";

import protocolProfileJson from "../../../config/moral-trade/protocol-profile.json";

export const MORAL_TRADE_PROTOCOL_VALIDATOR_VERSION = "moral-trade-core-validator-v0.2";
export const MORAL_TRADE_TRANSITION_EVENT_SCHEMA_VERSION =
  "moral-trade-transition-event-v0.1";

export type MoralTradeProtocolProfile = {
  version: string;
  purpose: string;
  requiredProposalFields: Array<{ key: string; label: string }>;
  statusValues: string[];
  stateTransitionRules: MoralTradeStateTransitionRule[];
  decisionPipeline: MoralTradeDecisionPipelineStep[];
  guardrails: Array<{ code: string; label: string; rule: string }>;
  factorCodes: Array<{ code: string; label: string; description: string }>;
  evidenceSchemas: Array<{ key: string; label: string; required: string[] }>;
  provenanceModel: {
    entities: string[];
    activities: string[];
    agents: string[];
  };
  provenanceObjectSchemas: Array<{ key: string; label: string; required: string[] }>;
  provenancePersistence: {
    strategy: string;
    tables: Array<{
      table: string;
      objectSchemaKey: string;
      accessModel: string;
      requiredColumns: string[];
    }>;
    accessRules: string[];
  };
  qualityMetrics: string[];
};

export interface MoralTradeStateTransitionRule {
  key: string;
  from: string;
  allowedTo: string[];
  requires: string[];
  provenanceActivity: string;
}

export interface MoralTradeDecisionPipelineStep {
  key: string;
  label: string;
  sourceDocumentStep: string;
  requiredSignals: string[];
  passCondition: string;
  failureStatus: string;
  blocksMatchable: boolean;
}

export interface MoralTradeProposalStateTransitionInput {
  from: string;
  to: string;
  proposal: Record<string, unknown>;
  baselineCredibilityReviewed?: boolean;
  externalityTriggerReviewed?: boolean;
  humanReviewApproved?: boolean;
  evidenceReviewed?: boolean;
  matchExplanationGenerated?: boolean;
  disputeRecordCreated?: boolean;
  policyScreenReviewed?: boolean;
  privacyRedactionReviewed?: boolean;
  provenanceActivityRecorded?: boolean;
  transitionEventRecord?: MoralTradeStateTransitionEventRecord;
  policyConflictCodes?: string[];
}

export interface MoralTradeProposalStateTransitionValidation {
  status: "pass" | "fail";
  from: string;
  to: string;
  allowed: boolean;
  missingRequiredFields: string[];
  appliedRule: MoralTradeStateTransitionRule | null;
  requiredChecks: string[];
  transitionEventRecord: MoralTradeStateTransitionEventRecord | null;
  blockers: string[];
}

export interface MoralTradeStateTransitionEventRecordInput {
  from: string;
  to: string;
  subjectId: string;
  subjectKind?: string;
  provenanceActivity?: string;
  actorAgentId: string;
  actorAgentKind?: string;
  recordedAt?: string;
  usedEntityIds?: string[];
  generatedEntityIds?: string[];
  idempotencyKey: string;
  previousEventHash?: string | null;
}

export interface MoralTradeStateTransitionEventRecord {
  schemaVersion: typeof MORAL_TRADE_TRANSITION_EVENT_SCHEMA_VERSION;
  id: string;
  subjectId: string;
  subjectKind: string;
  from: string;
  to: string;
  provenanceActivity: string;
  recordedAt: string;
  actorAgentId: string;
  actorAgentKind: string;
  usedEntityIds: string[];
  generatedEntityIds: string[];
  idempotencyKey: string;
  previousEventHash: string | null;
  eventHash: string;
}

export interface MoralTradeProtocolValidatorCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeProtocolValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-core-protocol-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeProtocolValidatorCheck[];
  blockers: string[];
}

const protocolProfile = protocolProfileJson as MoralTradeProtocolProfile;

const REQUIRED_STATUSES = [
  "draft",
  "submitted",
  "needs_clarification",
  "needs_evidence",
  "needs_human_review",
  "challenge_window",
  "completion_reviewed",
  "disputed_unresolved",
  "blocked",
  "matchable",
] as const;

const REQUIRED_GUARDRAILS = [
  "anti_threat_baseline",
  "no_autonomous_outreach",
  "no_global_moral_ranking",
  "privacy_redaction_required",
  "separate_trust_axes",
] as const;

const REQUIRED_DECISION_PIPELINE_STEPS = [
  "schema_completeness",
  "anti_threat_policy",
  "factual_evidence_readiness",
  "counterfactual_baseline",
  "externality_review",
  "privacy_redaction",
  "match_explanation",
  "human_review_routing",
] as const;

const REQUIRED_FACTOR_CODES = [
  "cause_area_complementarity",
  "baseline_challenge_recommended",
  "baseline_credibility",
  "baseline_stated",
  "cause_area_overlap",
  "evidence_rule_named",
  "externality_review_required",
  "human_review_required",
  "party_relative_benefit",
  "location_constraint_satisfied",
  "privacy_safe_preview",
  "privacy_stage_compatible",
  "stated_exclusions_clear",
  "terms_complete",
  "trade_mode_compatible",
  "verification_preference_compatible",
] as const;

const REQUIRED_EVIDENCE_SCHEMAS = [
  "pledge_swap_v1",
  "donation_offset_v1",
  "paid_action_v1",
  "public_good_commitment_v1",
] as const;

const REQUIRED_PROVENANCE_OBJECT_SCHEMAS = [
  "evidence_artifact",
  "evidence_claim",
  "external_entity_reference",
  "match_signal",
  "traceability_event",
  "review_decision",
  "provenance_activity",
  "provenance_agent",
  "state_transition_event_record",
] as const;

const REQUIRED_PROVENANCE_PERSISTENCE_TABLES = [
  "moral_trade_provenance_agents",
  "moral_trade_evidence_artifacts",
  "moral_trade_evidence_claims",
  "moral_trade_evidence_claim_artifacts",
  "moral_trade_external_entity_references",
  "moral_trade_review_decisions",
  "moral_trade_provenance_activities",
  "moral_trade_traceability_events",
  "moral_trade_state_transition_events",
] as const;

const COMPLETE_PROPOSAL_REQUIRED_STATUSES = [
  "submitted",
  "needs_evidence",
  "needs_human_review",
  "challenge_window",
  "matchable",
  "completion_reviewed",
] as const;

const HUMAN_REVIEW_REQUIRED_STATUSES = ["matchable", "completion_reviewed"] as const;
const MATCHABLE_REVIEW_SOURCE_STATUSES = ["submitted", "needs_human_review"] as const;
const MATCHABLE_PROFILE_REQUIREMENTS = [
  "policy_screen_before_matchable",
  "baseline_credibility_before_matchable",
  "evidence_sufficiency_before_matchable",
  "externality_trigger_before_matchable",
  "privacy_redaction_before_matchable",
  "match_explanation_before_matchable",
  "human_review_before_matchable",
] as const;
const MATCHABLE_REVIEW_CHECKS = [
  {
    inputKey: "policyScreenReviewed",
    blocker: "policy_screen_required_before:matchable",
  },
  {
    inputKey: "baselineCredibilityReviewed",
    blocker: "baseline_credibility_required_before:matchable",
  },
  {
    inputKey: "evidenceReviewed",
    blocker: "evidence_review_required_before:matchable",
  },
  {
    inputKey: "externalityTriggerReviewed",
    blocker: "externality_trigger_required_before:matchable",
  },
  {
    inputKey: "privacyRedactionReviewed",
    blocker: "privacy_redaction_required_before:matchable",
  },
  {
    inputKey: "matchExplanationGenerated",
    blocker: "match_explanation_required_before:matchable",
  },
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProtocolValidatorCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeProtocolProfile() {
  return protocolProfile;
}

function protocolFieldIsPresent(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry ?? "").trim().length > 0);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  return String(value ?? "").trim().length > 0;
}

export function getMissingMoralTradeRequiredProposalFields(
  proposal: Record<string, unknown>,
  profile: MoralTradeProtocolProfile = protocolProfile,
) {
  return profile.requiredProposalFields
    .map((field) => field.key)
    .filter((key) => !protocolFieldIsPresent(proposal[key]));
}

function getStateTransitionRule(from: string, profile: MoralTradeProtocolProfile = protocolProfile) {
  return profile.stateTransitionRules.find((rule) => rule.from === from) ?? null;
}

function canonicalizeForProtocolHash(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeForProtocolHash(entry ?? null)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeForProtocolHash(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashProtocolPayload(value: unknown) {
  return createHash("sha256").update(canonicalizeForProtocolHash(value)).digest("hex");
}

function transitionEventHashPayload(record: Omit<MoralTradeStateTransitionEventRecord, "eventHash" | "id">) {
  return {
    actorAgentId: record.actorAgentId,
    actorAgentKind: record.actorAgentKind,
    from: record.from,
    generatedEntityIds: record.generatedEntityIds,
    idempotencyKey: record.idempotencyKey,
    previousEventHash: record.previousEventHash,
    provenanceActivity: record.provenanceActivity,
    recordedAt: record.recordedAt,
    schemaVersion: record.schemaVersion,
    subjectId: record.subjectId,
    subjectKind: record.subjectKind,
    to: record.to,
    usedEntityIds: record.usedEntityIds,
  };
}

function transitionEventIdFromHash(eventHash: string) {
  return `moral-trade-transition-event:${eventHash.slice(0, 20)}`;
}

function tokenIsPrivacySafe(value: string) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    value.length <= 240 &&
    /^[A-Za-z0-9._:@/-]+$/.test(value) &&
    !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(value)
  );
}

function isIsoInstant(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isSha256(value: string | null | undefined) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function buildMoralTradeStateTransitionEventRecord(
  input: MoralTradeStateTransitionEventRecordInput,
  profile: MoralTradeProtocolProfile = protocolProfile,
): MoralTradeStateTransitionEventRecord {
  const appliedRule = getStateTransitionRule(input.from, profile);
  const provenanceActivity =
    input.provenanceActivity ?? appliedRule?.provenanceActivity ?? "state_transition_recorded";
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const subjectKind = input.subjectKind ?? "proposal_record";
  const actorAgentKind = input.actorAgentKind ?? "operator";
  const usedEntityIds = input.usedEntityIds?.length ? input.usedEntityIds : [input.subjectId];
  const generatedEntityIds = input.generatedEntityIds?.length
    ? input.generatedEntityIds
    : [`${input.subjectId}:${input.to}`];
  const payload = {
    actorAgentId: input.actorAgentId,
    actorAgentKind,
    from: input.from,
    generatedEntityIds,
    idempotencyKey: input.idempotencyKey,
    previousEventHash: input.previousEventHash ?? null,
    provenanceActivity,
    recordedAt,
    schemaVersion: MORAL_TRADE_TRANSITION_EVENT_SCHEMA_VERSION,
    subjectId: input.subjectId,
    subjectKind,
    to: input.to,
    usedEntityIds,
  } satisfies Omit<MoralTradeStateTransitionEventRecord, "eventHash" | "id">;
  const eventHash = hashProtocolPayload(transitionEventHashPayload(payload));

  return {
    ...payload,
    id: transitionEventIdFromHash(eventHash),
    eventHash,
  };
}

export function validateMoralTradeStateTransitionEventRecord({
  expectedFrom,
  expectedTo,
  expectedProvenanceActivity,
  record,
  profile = protocolProfile,
}: {
  expectedFrom: string;
  expectedTo: string;
  expectedProvenanceActivity?: string;
  record: MoralTradeStateTransitionEventRecord | null | undefined;
  profile?: MoralTradeProtocolProfile;
}) {
  const blockers: string[] = [];

  if (!record) {
    return ["transition_event_record_required"];
  }

  if (record.schemaVersion !== MORAL_TRADE_TRANSITION_EVENT_SCHEMA_VERSION) {
    blockers.push("transition_event_record_schema_version_mismatch");
  }

  if (record.from !== expectedFrom) {
    blockers.push(`transition_event_record_from_mismatch:${record.from}`);
  }

  if (record.to !== expectedTo) {
    blockers.push(`transition_event_record_to_mismatch:${record.to}`);
  }

  if (
    expectedProvenanceActivity &&
    record.provenanceActivity !== expectedProvenanceActivity
  ) {
    blockers.push(
      `transition_event_record_activity_mismatch:${record.provenanceActivity}`,
    );
  }

  if (!profile.provenanceModel.activities.includes(record.provenanceActivity)) {
    blockers.push(`transition_event_record_unknown_activity:${record.provenanceActivity}`);
  }

  if (!profile.provenanceModel.entities.includes(record.subjectKind)) {
    blockers.push(`transition_event_record_unknown_subject_kind:${record.subjectKind}`);
  }

  if (!profile.provenanceModel.agents.includes(record.actorAgentKind)) {
    blockers.push(`transition_event_record_unknown_actor_kind:${record.actorAgentKind}`);
  }

  for (const [field, value] of [
    ["id", record.id],
    ["subjectId", record.subjectId],
    ["actorAgentId", record.actorAgentId],
    ["idempotencyKey", record.idempotencyKey],
  ] as const) {
    if (!tokenIsPrivacySafe(value)) {
      blockers.push(`transition_event_record_unsafe_${field}`);
    }
  }

  const unsafeUsedEntityIds = record.usedEntityIds.filter((id) => !tokenIsPrivacySafe(id));
  const unsafeGeneratedEntityIds = record.generatedEntityIds.filter(
    (id) => !tokenIsPrivacySafe(id),
  );

  if (!record.usedEntityIds.length || unsafeUsedEntityIds.length) {
    blockers.push("transition_event_record_used_entities_invalid");
  }

  if (!record.generatedEntityIds.length || unsafeGeneratedEntityIds.length) {
    blockers.push("transition_event_record_generated_entities_invalid");
  }

  if (!isIsoInstant(record.recordedAt)) {
    blockers.push("transition_event_record_recorded_at_invalid");
  }

  if (record.previousEventHash !== null && !isSha256(record.previousEventHash)) {
    blockers.push("transition_event_record_previous_hash_invalid");
  }

  if (!isSha256(record.eventHash)) {
    blockers.push("transition_event_record_hash_invalid");
  } else {
    const { eventHash: _eventHash, id: _id, ...payload } = record;
    const expectedHash = hashProtocolPayload(transitionEventHashPayload(payload));
    if (record.eventHash !== expectedHash) {
      blockers.push("transition_event_record_hash_mismatch");
    }

    if (record.id !== transitionEventIdFromHash(expectedHash)) {
      blockers.push("transition_event_record_id_mismatch");
    }
  }

  return blockers;
}

export function summarizeMoralTradeStateTransitionEventRecord(
  record: MoralTradeStateTransitionEventRecord | null | undefined,
) {
  if (!record) {
    return "";
  }

  return [
    "Transition event record:",
    `id=${record.id};`,
    `schema=${record.schemaVersion};`,
    `activity=${record.provenanceActivity};`,
    `from=${record.from};`,
    `to=${record.to};`,
    `recorded_at=${record.recordedAt};`,
    `hash=${record.eventHash}.`,
  ].join(" ");
}

export function validateMoralTradeProposalStateTransition(
  input: MoralTradeProposalStateTransitionInput,
  profile: MoralTradeProtocolProfile = protocolProfile,
): MoralTradeProposalStateTransitionValidation {
  const statusValues = new Set(profile.statusValues);
  const blockers: string[] = [];
  const appliedRule = getStateTransitionRule(input.from, profile);
  const requiredChecks = appliedRule?.requires ?? [];
  const missingRequiredFields = getMissingMoralTradeRequiredProposalFields(input.proposal, profile);

  if (!statusValues.has(input.from)) {
    blockers.push(`unknown_from_status:${input.from}`);
  }

  if (!statusValues.has(input.to)) {
    blockers.push(`unknown_to_status:${input.to}`);
  }

  if (!appliedRule) {
    blockers.push(`missing_transition_rule:${input.from}`);
  } else if (!appliedRule.allowedTo.includes(input.to)) {
    blockers.push(`invalid_transition:${input.from}->${input.to}`);
  }

  if (
    COMPLETE_PROPOSAL_REQUIRED_STATUSES.includes(
      input.to as (typeof COMPLETE_PROPOSAL_REQUIRED_STATUSES)[number],
    ) &&
    missingRequiredFields.length
  ) {
    blockers.push(`missing_required_fields:${missingRequiredFields.join(",")}`);
  }

  if (
    HUMAN_REVIEW_REQUIRED_STATUSES.includes(
      input.to as (typeof HUMAN_REVIEW_REQUIRED_STATUSES)[number],
    ) &&
    !input.humanReviewApproved
  ) {
    blockers.push(`human_review_required_before:${input.to}`);
  }

  if (input.to === "matchable") {
    if (input.policyConflictCodes?.length) {
      blockers.push(`policy_conflicts_block_matchable:${input.policyConflictCodes.join(",")}`);
    }

    if (
      MATCHABLE_REVIEW_SOURCE_STATUSES.includes(
        input.from as (typeof MATCHABLE_REVIEW_SOURCE_STATUSES)[number],
      )
    ) {
      for (const reviewCheck of MATCHABLE_REVIEW_CHECKS) {
        if (!input[reviewCheck.inputKey]) {
          blockers.push(reviewCheck.blocker);
        }
      }
    }
  }

  if (input.to === "completion_reviewed" && !input.evidenceReviewed) {
    blockers.push("evidence_review_required_before:completion_reviewed");
  }

  if (input.to === "disputed_unresolved" && !input.disputeRecordCreated) {
    blockers.push("dispute_record_required_before:disputed_unresolved");
  }

  if (
    input.to === "blocked" &&
    !input.humanReviewApproved &&
    !(input.policyConflictCodes && input.policyConflictCodes.length > 0)
  ) {
    blockers.push("policy_or_human_review_required_before:blocked");
  }

  if (input.provenanceActivityRecorded === false) {
    blockers.push("transition_event_record_required");
  }

  blockers.push(
    ...validateMoralTradeStateTransitionEventRecord({
      expectedFrom: input.from,
      expectedTo: input.to,
      expectedProvenanceActivity: appliedRule?.provenanceActivity,
      record: input.transitionEventRecord,
      profile,
    }),
  );

  const uniqueBlockers = [...new Set(blockers)];

  return {
    status: uniqueBlockers.length ? "fail" : "pass",
    from: input.from,
    to: input.to,
    allowed: uniqueBlockers.length === 0,
    missingRequiredFields,
    appliedRule,
    requiredChecks,
    transitionEventRecord: input.transitionEventRecord ?? null,
    blockers: uniqueBlockers,
  };
}

export function validateMoralTradeProtocolProfile(
  profile: MoralTradeProtocolProfile = protocolProfile,
): MoralTradeProtocolValidation {
  const transitionStatusValues = profile.stateTransitionRules.flatMap((rule) => [
    rule.from,
    ...rule.allowedTo,
  ]);
  const provenancePersistence = profile.provenancePersistence ?? {
    accessRules: [],
    strategy: "",
    tables: [],
  };
  const decisionPipelineKeys = profile.decisionPipeline.map((step) => step.key);
  const duplicateDecisionPipelineKeys = decisionPipelineKeys.filter(
    (key, index) => decisionPipelineKeys.indexOf(key) !== index,
  );
  const transitionRequirementKeys = new Set(
    profile.stateTransitionRules.flatMap((rule) => rule.requires),
  );
  const knownDecisionSignals = new Set([
    ...transitionRequirementKeys,
    ...profile.guardrails.map((guardrail) => guardrail.code),
    ...profile.factorCodes.map((factor) => factor.code),
    "getMissingMoralTradeRequiredProposalFields",
    "policy_conflicts_block_matchable",
    "requiredProposalFields",
  ]);
  const unknownDecisionSignals = profile.decisionPipeline.flatMap((step) =>
    step.requiredSignals
      .filter((signal) => !knownDecisionSignals.has(signal))
      .map((signal) => `${step.key}:${signal}`),
  );
  const checks = [
    check(
      "required-proposal-fields",
      "Required proposal fields",
      profile.requiredProposalFields.length >= 9 &&
        hasAll(
          profile.requiredProposalFields.map((field) => field.key),
          [
            "format",
            "cause_areas",
            "offered_action",
            "requested_action",
            "baseline_statement",
            "duration",
            "exit_conditions",
            "verification_method",
            "public_description",
          ],
        ),
      `${profile.requiredProposalFields.length} required field(s) published.`,
    ),
    check(
      "status-values",
      "Review status values",
      hasAll(profile.statusValues, REQUIRED_STATUSES),
      profile.statusValues.join(", "),
    ),
    check(
      "state-transition-rules",
      "Proposal state transition rules",
      profile.stateTransitionRules.length >= 6 &&
        hasAll(
          profile.stateTransitionRules.map((rule) => rule.from),
          [
            "draft",
            "submitted",
            "needs_evidence",
            "needs_human_review",
            "challenge_window",
            "disputed_unresolved",
            "matchable",
            "completion_reviewed",
          ],
        ) &&
        transitionStatusValues.every((status) => profile.statusValues.includes(status)) &&
        profile.stateTransitionRules.every(
          (rule) =>
            rule.requires.includes("transition_event_recorded") &&
            profile.provenanceModel.activities.includes(rule.provenanceActivity),
        ) &&
        profile.stateTransitionRules
          .filter((rule) => rule.allowedTo.includes("matchable"))
          .every((rule) => hasAll(rule.requires, MATCHABLE_PROFILE_REQUIREMENTS)),
      `${profile.stateTransitionRules.length} state transition rule(s) publish allowed edges, required checks, and provenance activities.`,
    ),
    check(
      "decision-pipeline",
      "Proposed decision logic is public and signal-bound",
      hasAll(decisionPipelineKeys, REQUIRED_DECISION_PIPELINE_STEPS) &&
        duplicateDecisionPipelineKeys.length === 0 &&
        unknownDecisionSignals.length === 0 &&
        profile.decisionPipeline.every(
          (step) =>
            step.sourceDocumentStep.length >= 30 &&
            step.passCondition.length >= 30 &&
            step.requiredSignals.length > 0 &&
            profile.statusValues.includes(step.failureStatus),
        ) &&
        profile.decisionPipeline
          .filter((step) =>
            [
              "schema_completeness",
              "anti_threat_policy",
              "factual_evidence_readiness",
              "counterfactual_baseline",
              "privacy_redaction",
              "human_review_routing",
            ].includes(step.key),
          )
          .every((step) => step.blocksMatchable),
      unknownDecisionSignals.length
        ? `unknownSignals=${unknownDecisionSignals.join(", ")}`
        : profile.decisionPipeline.map((step) => `${step.key}->${step.failureStatus}`).join(", "),
    ),
    check(
      "guardrails",
      "Safety and privacy guardrails",
      hasAll(
        profile.guardrails.map((guardrail) => guardrail.code),
        REQUIRED_GUARDRAILS,
      ),
      `${profile.guardrails.length} guardrail(s), including anti-threat and redaction rules.`,
    ),
    check(
      "factor-codes",
      "Public factor-code explanations",
      hasAll(
        profile.factorCodes.map((factor) => factor.code),
        REQUIRED_FACTOR_CODES,
      ),
      `${profile.factorCodes.length} factor code(s) available for match and review explanations.`,
    ),
    check(
      "evidence-schemas",
      "Evidence schemas by trade format",
      hasAll(
        profile.evidenceSchemas.map((schema) => schema.key),
        REQUIRED_EVIDENCE_SCHEMAS,
      ),
      profile.evidenceSchemas.map((schema) => schema.key).join(", "),
    ),
    check(
      "provenance-model",
      "Provenance objects",
      profile.provenanceModel.entities.length >= 3 &&
        profile.provenanceModel.activities.length >= 3 &&
        profile.provenanceModel.agents.length >= 3,
      `${profile.provenanceModel.entities.length} entities, ${profile.provenanceModel.activities.length} activities, ${profile.provenanceModel.agents.length} agents.`,
    ),
    check(
      "provenance-object-schemas",
      "Provenance object schemas",
      hasAll(
        profile.provenanceObjectSchemas.map((schema) => schema.key),
        REQUIRED_PROVENANCE_OBJECT_SCHEMAS,
      ) &&
        profile.provenanceObjectSchemas.every((schema) => schema.required.length >= 3),
      `${profile.provenanceObjectSchemas.length} object schema(s) published for evidence and review provenance.`,
    ),
    check(
      "provenance-persistence",
      "Provenance persistence tables",
      hasAll(
        provenancePersistence.tables.map((table) => table.table),
        REQUIRED_PROVENANCE_PERSISTENCE_TABLES,
      ) &&
        provenancePersistence.tables.every(
          (table) =>
            profile.provenanceObjectSchemas.some(
              (schema) => schema.key === table.objectSchemaKey,
            ) &&
            table.requiredColumns.includes("owner_profile_id") &&
            table.requiredColumns.length >= 4,
        ) &&
        provenancePersistence.accessRules.some((rule) => /No anonymous writes/i.test(rule)) &&
        provenancePersistence.accessRules.some((rule) => /No update or delete policies/i.test(rule)),
      `${provenancePersistence.tables.length} append-only persistence table(s) map provenance object schemas to owner-scoped storage.`,
    ),
    check(
      "quality-metrics",
      "Quality and safety metrics",
      profile.qualityMetrics.length >= 7 &&
        profile.qualityMetrics.includes("privacy_leakage_incidents") &&
        profile.qualityMetrics.includes("human_overrule_rate"),
      `${profile.qualityMetrics.length} metric(s) published.`,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-core-protocol-profile",
    validatorVersion: MORAL_TRADE_PROTOCOL_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
