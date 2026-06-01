import { createHash } from "node:crypto";

import { normalizeEvidenceLocator } from "@/lib/validation";

export const MORAL_TRADE_PROVENANCE_SCHEMA_VERSION = "moral-trade-provenance-v0.3";

export type MoralTradeEvidenceClaimType =
  | "receipt"
  | "public_log"
  | "attestation"
  | "payment_event"
  | "prior_intent";

export type MoralTradeEvidenceClaimScope =
  | "factual_action"
  | "counterfactual_baseline"
  | "externality_review"
  | "payment_or_donation_record"
  | "identity_or_authority";

export type MoralTradeRedactionLevel = "public" | "participant_private" | "reviewer_only";
export type MoralTradeReviewerConfidence = "low" | "medium" | "high";

export interface MoralTradeAuditQuestionAnswers {
  whatHappened: string;
  whoTouchedIt: string[];
  whenRecorded: string;
}

export type MoralTradeProvenanceEntityKind =
  | "proposal_record"
  | "evidence_artifact"
  | "external_entity_reference"
  | "review_decision"
  | "match_explanation"
  | "match_signal"
  | "traceability_event";

export type MoralTradeProvenanceActivityKind =
  | "draft_created"
  | "draft_updated"
  | "evidence_submitted"
  | "traceability_event_recorded"
  | "risk_screened"
  | "challenge_window_opened"
  | "review_completed";

export type MoralTradeProvenanceAgentKind =
  | "participant"
  | "counterparty"
  | "operator"
  | "external_reviewer"
  | "payment_or_evidence_provider";

export interface MoralTradeProvenanceAgent {
  id: string;
  kind: MoralTradeProvenanceAgentKind;
  label: string;
}

export interface MoralTradeEvidenceArtifactInput {
  id: string;
  kind: MoralTradeEvidenceClaimType;
  locator: string;
  mediaType: string;
  claimScopes: MoralTradeEvidenceClaimScope[];
  submittedAt: string;
  submittedByAgentId: string;
  redactionLevel: MoralTradeRedactionLevel;
  contentDigest?: string;
}

export interface MoralTradeEvidenceArtifact {
  id: string;
  entityKind: "evidence_artifact";
  kind: MoralTradeEvidenceClaimType;
  locator: string;
  normalizedLocator: string;
  mediaType: string;
  claimScopes: MoralTradeEvidenceClaimScope[];
  submittedAt: string;
  submittedByAgentId: string;
  redactionLevel: MoralTradeRedactionLevel;
  sha256: string;
}

export interface MoralTradeEvidenceClaim {
  id: string;
  proposalId: string;
  claimType: MoralTradeEvidenceClaimType;
  artifactIds: string[];
  claimScope: MoralTradeEvidenceClaimScope;
  reviewerConfidence: MoralTradeReviewerConfidence;
  uniquenessChecked: boolean;
  createdAt: string;
  reuseJustification?: string;
}

export interface MoralTradeReviewDecision {
  id: string;
  proposalId: string;
  outcome: "pass" | "needs_more" | "challenge" | "block";
  reasonCodes: string[];
  summary: string;
  reviewerId: string;
  idempotencyKey: string;
  decisionHash: string;
  createdAt: string;
}

export interface MoralTradeProvenanceActivity {
  id: string;
  kind: MoralTradeProvenanceActivityKind;
  at: string;
  usedEntityIds: string[];
  generatedEntityIds: string[];
  agentIds: string[];
}

export type MoralTradeTraceabilityAction = "ADD" | "OBSERVE" | "DELETE";
export type MoralTradeTraceabilityBusinessStep =
  | "proposal_submitted"
  | "evidence_uploaded"
  | "donation_initiated"
  | "payment_recorded"
  | "receipt_verified"
  | "review_decision_recorded"
  | "challenge_opened"
  | "completion_reviewed";
export type MoralTradeTraceabilityDisposition =
  | "draft"
  | "in_review"
  | "verified"
  | "disputed"
  | "blocked"
  | "completed";
export type MoralTradeTraceabilityLocationType =
  | "platform"
  | "external_provider"
  | "charity"
  | "public_log";

export type MoralTradeExternalEntityType =
  | "charity"
  | "payment_provider"
  | "supplier"
  | "public_registry"
  | "platform";

export type MoralTradeExternalIdentifierSystem =
  | "domain"
  | "ein"
  | "every_org_slug"
  | "gs1_gln"
  | "open_supply_hub_id"
  | "platform_internal_id"
  | "unknown_review_required";

export type MoralTradeExternalEntityVerificationStatus =
  | "unverified"
  | "reviewer_confirmed"
  | "external_registry_matched";

export interface MoralTradeExternalEntityReferenceInput {
  id: string;
  entityType: MoralTradeExternalEntityType;
  label: string;
  identifierSystem: MoralTradeExternalIdentifierSystem;
  identifier: string;
  sourceLocator?: string | null;
  verificationStatus: MoralTradeExternalEntityVerificationStatus;
  redactionLevel: MoralTradeRedactionLevel;
}

export interface MoralTradeExternalEntityReference
  extends MoralTradeExternalEntityReferenceInput {
  entityKind: "external_entity_reference";
  normalizedIdentifier: string;
  normalizedSourceLocator: string | null;
  dedupeKey: string;
  sha256: string;
}

export interface MoralTradeTraceabilityEventInput {
  id: string;
  eventTime: string;
  recordedAt: string;
  action: MoralTradeTraceabilityAction;
  businessStep: MoralTradeTraceabilityBusinessStep;
  disposition: MoralTradeTraceabilityDisposition;
  what: {
    proposalId: string;
    artifactIds?: string[];
    claimIds?: string[];
    amountCents?: number;
    currency?: string;
  };
  where: {
    locationType: MoralTradeTraceabilityLocationType;
    locator?: string;
    provider?: string;
    externalEntityId?: string;
  };
  why: {
    reasonCodes: string[];
    sourceActivityId?: string;
    relatedReviewDecisionId?: string;
  };
  agentIds: string[];
  redactionLevel: MoralTradeRedactionLevel;
}

export interface MoralTradeTraceabilityEvent extends MoralTradeTraceabilityEventInput {
  entityKind: "traceability_event";
  normalizedLocator: string | null;
  auditQuestionAnswers: MoralTradeAuditQuestionAnswers;
  sha256: string;
}

export interface MoralTradeProvenanceBundle {
  proposalId: string;
  artifacts: MoralTradeEvidenceArtifact[];
  claims: MoralTradeEvidenceClaim[];
  reviewDecisions: MoralTradeReviewDecision[];
  activities: MoralTradeProvenanceActivity[];
  agents: MoralTradeProvenanceAgent[];
  externalEntityReferences?: MoralTradeExternalEntityReference[];
  traceabilityEvents?: MoralTradeTraceabilityEvent[];
}

export interface MoralTradeProvenanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeProvenanceValidation {
  status: "pass" | "fail";
  schemaVersion: string;
  checks: MoralTradeProvenanceCheck[];
  blockers: string[];
}

export interface MoralTradeProvenanceValidationRule {
  key: string;
  label: string;
  rule: string;
}

export interface MoralTradeProvenancePersistenceTable {
  table: string;
  objectSchemaKey: string;
  accessModel: string;
  requiredColumns: readonly string[];
}

export interface MoralTradeProvenanceContract {
  schemaVersion: string;
  purpose: string;
  objectSchemas: readonly {
    key: string;
    label: string;
    required: readonly string[];
  }[];
  validationRules: readonly MoralTradeProvenanceValidationRule[];
  sampleBundleSummary: {
    artifactCount: number;
    claimCount: number;
    reviewDecisionCount: number;
    activityCount: number;
    agentCount: number;
    externalEntityReferenceCount: number;
    traceabilityEventCount: number;
    validationStatus: MoralTradeProvenanceValidation["status"];
  };
  persistenceTables: readonly MoralTradeProvenancePersistenceTable[];
  contractTests: string[];
}

export interface MoralTradeProvenanceContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-provenance-contract";
  validatorVersion: string;
  schemaVersion: string;
  checks: MoralTradeProvenanceCheck[];
  blockers: string[];
}

export interface MoralTradeProvenancePersistenceSqlValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-provenance-persistence-sql";
  validatorVersion: string;
  schemaVersion: string;
  checks: MoralTradeProvenanceCheck[];
  blockers: string[];
}

export const MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS = [
  {
    key: "evidence_artifact",
    label: "Evidence artifact entity",
    required: [
      "id",
      "kind",
      "normalizedLocator",
      "mediaType",
      "claimScopes",
      "submittedAt",
      "submittedByAgentId",
      "redactionLevel",
      "sha256",
    ],
  },
  {
    key: "evidence_claim",
    label: "Evidence claim",
    required: [
      "id",
      "proposalId",
      "claimType",
      "artifactIds",
      "claimScope",
      "reviewerConfidence",
      "uniquenessChecked",
    ],
  },
  {
    key: "external_entity_reference",
    label: "External entity reference",
    required: [
      "id",
      "entityType",
      "label",
      "identifierSystem",
      "normalizedIdentifier",
      "dedupeKey",
      "verificationStatus",
      "redactionLevel",
      "sha256",
    ],
  },
  {
    key: "review_decision",
    label: "Reviewer decision",
    required: [
      "id",
      "proposalId",
      "outcome",
      "reasonCodes",
      "summary",
      "reviewerId",
      "idempotencyKey",
      "decisionHash",
      "createdAt",
    ],
  },
  {
    key: "match_signal",
    label: "Privacy-safe match signal",
    required: [
      "id",
      "leftProfileId",
      "rightProfileId",
      "privacyPolicyId",
      "status",
      "factorCodes",
      "confidenceBand",
      "redactedFields",
      "disclosureStage",
      "humanReviewRequired",
      "createdAt",
    ],
  },
  {
    key: "traceability_event",
    label: "Interoperable traceability event",
    required: [
      "id",
      "eventTime",
      "recordedAt",
      "action",
      "businessStep",
      "disposition",
      "what",
      "where",
      "why",
      "agentIds",
      "redactionLevel",
      "auditQuestionAnswers",
      "sha256",
    ],
  },
  {
    key: "provenance_activity",
    label: "Provenance activity",
    required: ["id", "kind", "at", "usedEntityIds", "generatedEntityIds", "agentIds"],
  },
  {
    key: "provenance_agent",
    label: "Provenance agent",
    required: ["id", "kind", "label"],
  },
  {
    key: "state_transition_event_record",
    label: "Immutable state transition event record",
    required: [
      "id",
      "schemaVersion",
      "subjectId",
      "subjectKind",
      "from",
      "to",
      "provenanceActivity",
      "recordedAt",
      "actorAgentId",
      "actorAgentKind",
      "usedEntityIds",
      "generatedEntityIds",
      "idempotencyKey",
      "previousEventHash",
      "auditQuestionAnswers",
      "eventHash",
    ],
  },
] as const;

export const MORAL_TRADE_PROVENANCE_VALIDATION_RULES: MoralTradeProvenanceValidationRule[] = [
  {
    key: "artifact-hashes",
    label: "Artifacts are content-addressed",
    rule: "Evidence artifacts and traceability events must carry stable sha256 digests.",
  },
  {
    key: "claim-artifact-links",
    label: "Claims link to existing artifacts",
    rule: "Every evidence claim must link to existing artifacts.",
  },
  {
    key: "scope-alignment",
    label: "Artifact scopes match claims",
    rule: "Artifact claim scopes must match the claim being reviewed.",
  },
  {
    key: "one-proof-one-claim",
    label: "Duplicate proof is explicit",
    rule: "Duplicate proof reuse must be explicit, not silent.",
  },
  {
    key: "freshness-window",
    label: "Artifact timestamps are reviewable",
    rule: "Evidence timestamps must be fresh enough for the review context or flagged.",
  },
  {
    key: "agent-links",
    label: "Artifacts, decisions, and activities name agents",
    rule: "Artifacts, reviewer decisions, traceability events, and activities must name provenance agents.",
  },
  {
    key: "traceability-events",
    label: "Traceability records link what, where, and why",
    rule: "External payment or charity-routing events must link what happened, where it was recorded, why it matters, and which agents touched it.",
  },
  {
    key: "audit-question-answers",
    label: "Event records answer audit questions",
    rule: "Traceability and state-transition events must expose explicit answers for what happened, who touched it, and when it was recorded.",
  },
  {
    key: "external-entity-references",
    label: "External entities have stable identifiers",
    rule: "External charities, providers, and supplier-like entities need stable identifier references, dedupe keys, and verified registry or reviewer status before traceability reliance.",
  },
  {
    key: "prov-triplets",
    label: "Bundle has entity/activity/agent structure",
    rule: "Every reviewed evidence bundle must keep W3C PROV-style entities, activities, and agents distinct.",
  },
];

export const MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES: readonly MoralTradeProvenancePersistenceTable[] =
  [
    {
      table: "moral_trade_provenance_agents",
      objectSchemaKey: "provenance_agent",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "agent_key",
        "kind",
        "label",
        "redaction_level",
        "created_at",
      ],
    },
    {
      table: "moral_trade_evidence_artifacts",
      objectSchemaKey: "evidence_artifact",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "subject_kind",
        "subject_id",
        "kind",
        "normalized_locator",
        "claim_scopes",
        "submitted_by_agent_id",
        "redaction_level",
        "sha256",
      ],
    },
    {
      table: "moral_trade_evidence_claims",
      objectSchemaKey: "evidence_claim",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "subject_kind",
        "subject_id",
        "claim_type",
        "claim_scope",
        "reviewer_confidence",
        "uniqueness_checked",
        "redaction_level",
      ],
    },
    {
      table: "moral_trade_evidence_claim_artifacts",
      objectSchemaKey: "evidence_claim",
      accessModel: "owner_insert_public_pair_read",
      requiredColumns: ["claim_id", "artifact_id", "owner_profile_id", "created_at"],
    },
    {
      table: "moral_trade_external_entity_references",
      objectSchemaKey: "external_entity_reference",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "entity_type",
        "identifier_system",
        "normalized_identifier",
        "dedupe_key",
        "verification_status",
        "redaction_level",
        "sha256",
      ],
    },
    {
      table: "moral_trade_review_decisions",
      objectSchemaKey: "review_decision",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "subject_kind",
        "subject_id",
        "outcome",
        "reason_codes",
        "summary",
        "reviewer_agent_id",
        "idempotency_key",
        "decision_hash",
        "redaction_level",
      ],
    },
    {
      table: "moral_trade_provenance_activities",
      objectSchemaKey: "provenance_activity",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "subject_kind",
        "subject_id",
        "kind",
        "activity_at",
        "used_entity_ids",
        "generated_entity_ids",
        "agent_ids",
        "activity_hash",
      ],
    },
    {
      table: "moral_trade_traceability_events",
      objectSchemaKey: "traceability_event",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "event_time",
        "recorded_at",
        "action",
        "business_step",
        "disposition",
        "what",
        "where_recorded",
        "why",
        "agent_ids",
        "redaction_level",
        "audit_question_answers",
        "sha256",
      ],
    },
    {
      table: "moral_trade_state_transition_events",
      objectSchemaKey: "state_transition_event_record",
      accessModel: "owner_insert_public_or_owner_read",
      requiredColumns: [
        "id",
        "owner_profile_id",
        "subject_kind",
        "subject_id",
        "from_status",
        "to_status",
        "provenance_activity",
        "recorded_at",
        "actor_agent_id",
        "idempotency_key",
        "audit_question_answers",
        "event_hash",
      ],
    },
  ];

export const MORAL_TRADE_PROVENANCE_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-provenance-contract-validator-v0.2";

export const MORAL_TRADE_PROVENANCE_PERSISTENCE_SQL_VALIDATOR_VERSION =
  "moral-trade-provenance-persistence-sql-validator-v0.2";

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortObjectKeys(entry)]),
    );
  }

  return value;
}

export function canonicalizeForEvidenceHash(value: unknown) {
  return JSON.stringify(sortObjectKeys(value));
}

function sha256(value: unknown) {
  return createHash("sha256").update(canonicalizeForEvidenceHash(value)).digest("hex");
}

function normalizeExternalIdentifier(
  system: MoralTradeExternalIdentifierSystem,
  identifier: string,
) {
  const cleaned = identifier.trim();

  if (system === "ein" || system === "gs1_gln") {
    return cleaned.replace(/\D+/g, "");
  }

  if (system === "domain") {
    return cleaned
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }

  return cleaned.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasSqlPattern(sql: string, pattern: string) {
  return new RegExp(pattern, "is").test(sql);
}

function getSqlTableBody(sql: string, escapedTableName: string) {
  return (
    new RegExp(
      `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${escapedTableName}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "i",
    ).exec(sql)?.[1] ?? ""
  );
}

function createPersistenceSqlCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProvenanceCheck {
  return check(id, label, passed, evidence);
}

export function validateMoralTradeProvenancePersistenceSql({
  migrationSql,
  schemaSql,
}: {
  schemaSql: string;
  migrationSql?: string;
}): MoralTradeProvenancePersistenceSqlValidation {
  const tableNames = MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES.map(
    (entry) => entry.table,
  );
  const tablePatterns = tableNames.map((table) => ({
    table,
    escaped: escapeRegExp(table),
  }));
  const missingCreateTables = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(schemaSql, `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${escaped}\\b`),
    )
    .map(({ table }) => table);
  const missingMigrationTables = migrationSql
    ? tablePatterns
        .filter(
          ({ escaped }) =>
            !hasSqlPattern(
              migrationSql,
              `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${escaped}\\b`,
            ),
        )
        .map(({ table }) => table)
    : [];
  const missingSchemaColumns = tablePatterns.flatMap(({ escaped, table }) => {
    const body = getSqlTableBody(schemaSql, escaped);
    const requiredColumns =
      MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES.find((entry) => entry.table === table)
        ?.requiredColumns ?? [];

    return requiredColumns
      .filter((column) => !new RegExp(`\\b${escapeRegExp(column)}\\b`, "i").test(body))
      .map((column) => `${table}.${column}`);
  });
  const missingMigrationColumns = migrationSql
    ? tablePatterns.flatMap(({ escaped, table }) => {
        const body = getSqlTableBody(migrationSql, escaped);
        const requiredColumns =
          MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES.find((entry) => entry.table === table)
            ?.requiredColumns ?? [];

        return requiredColumns
          .filter((column) => !new RegExp(`\\b${escapeRegExp(column)}\\b`, "i").test(body))
          .map((column) => `${table}.${column}`);
      })
    : [];
  const missingRls = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(schemaSql, `alter\\s+table\\s+public\\.${escaped}\\s+enable\\s+row\\s+level\\s+security`),
    )
    .map(({ table }) => table);
  const missingSelectPolicies = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(
          schemaSql,
          `create\\s+policy\\s+"${escaped}_select_visible"\\s+on\\s+public\\.${escaped}\\s+for\\s+select`,
        ),
    )
    .map(({ table }) => table);
  const missingInsertPolicies = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(
          schemaSql,
          `create\\s+policy\\s+"${escaped}_insert_owner"\\s+on\\s+public\\.${escaped}\\s+for\\s+insert`,
        ),
    )
    .map(({ table }) => table);
  const missingOwnerChecks = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(
          schemaSql,
          `create\\s+policy\\s+"${escaped}_insert_owner"[\\s\\S]*?owner_profile_id\\s*=\\s*\\(select\\s+auth\\.uid\\(\\)\\)`,
        ),
    )
    .map(({ table }) => table);
  const missingPublicReadChecks = tablePatterns
    .filter(
      ({ escaped }) =>
        !hasSqlPattern(
          schemaSql,
          `create\\s+policy\\s+"${escaped}_select_visible"[\\s\\S]*?redaction_level\\s*=\\s*'public'`,
        ),
    )
    .map(({ table }) => table);
  const updateOrDeletePolicies = tablePatterns
    .filter(({ escaped }) =>
      hasSqlPattern(
        schemaSql,
        `create\\s+policy\\s+"${escaped}_[^"]*(?:update|delete)[^"]*"\\s+on\\s+public\\.${escaped}`,
      ),
    )
    .map(({ table }) => table);
  const missingAppendOnlyComment = !/Provenance tables are append-only by policy/i.test(
    schemaSql,
  );
  const checks = [
    createPersistenceSqlCheck(
      "persistence-tables-created",
      "Persistence tables exist in schema",
      missingCreateTables.length === 0,
      missingCreateTables.length
        ? `Missing: ${missingCreateTables.join(", ")}`
        : `${tableNames.length} table(s) created.`,
    ),
    createPersistenceSqlCheck(
      "persistence-migration-created",
      "Persistence migration creates every table",
      !migrationSql || missingMigrationTables.length === 0,
      !migrationSql
        ? "Migration SQL not supplied."
        : missingMigrationTables.length
          ? `Missing: ${missingMigrationTables.join(", ")}`
          : `${tableNames.length} migration table(s) created.`,
    ),
    createPersistenceSqlCheck(
      "persistence-required-columns",
      "Persistence tables expose every contracted column",
      missingSchemaColumns.length === 0 && missingMigrationColumns.length === 0,
      [...missingSchemaColumns, ...missingMigrationColumns].length
        ? [...missingSchemaColumns, ...missingMigrationColumns].join(", ")
        : `${tableNames.length} table contract(s) include required columns.`,
    ),
    createPersistenceSqlCheck(
      "persistence-rls-enabled",
      "Persistence tables have RLS enabled",
      missingRls.length === 0,
      missingRls.length ? `Missing: ${missingRls.join(", ")}` : `${tableNames.length} RLS statement(s).`,
    ),
    createPersistenceSqlCheck(
      "persistence-visible-select-policies",
      "Persistence tables have public-or-owner select policies",
      missingSelectPolicies.length === 0 && missingPublicReadChecks.length === 0,
      [...new Set([...missingSelectPolicies, ...missingPublicReadChecks])].length
        ? `Missing or incomplete: ${[...new Set([...missingSelectPolicies, ...missingPublicReadChecks])].join(", ")}`
        : `${tableNames.length} select-visible policy/policies.`,
    ),
    createPersistenceSqlCheck(
      "persistence-owner-insert-policies",
      "Persistence tables require owner-scoped inserts",
      missingInsertPolicies.length === 0 && missingOwnerChecks.length === 0,
      [...new Set([...missingInsertPolicies, ...missingOwnerChecks])].length
        ? `Missing or incomplete: ${[...new Set([...missingInsertPolicies, ...missingOwnerChecks])].join(", ")}`
        : `${tableNames.length} owner-insert policy/policies.`,
    ),
    createPersistenceSqlCheck(
      "persistence-append-only-policies",
      "Persistence tables are append-only by policy",
      updateOrDeletePolicies.length === 0 && !missingAppendOnlyComment,
      updateOrDeletePolicies.length
        ? `Unexpected update/delete policy/policies: ${updateOrDeletePolicies.join(", ")}`
        : missingAppendOnlyComment
          ? "Missing append-only policy comment."
          : "No update/delete policies detected.",
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-provenance-persistence-sql",
    validatorVersion: MORAL_TRADE_PROVENANCE_PERSISTENCE_SQL_VALIDATOR_VERSION,
    schemaVersion: MORAL_TRADE_PROVENANCE_SCHEMA_VERSION,
    checks,
    blockers,
  };
}

export function createMoralTradeExternalEntityReference(
  input: MoralTradeExternalEntityReferenceInput,
): MoralTradeExternalEntityReference {
  const normalizedIdentifier = normalizeExternalIdentifier(
    input.identifierSystem,
    input.identifier,
  );
  const normalizedSourceLocator = input.sourceLocator
    ? normalizeEvidenceLocator(input.sourceLocator)
    : null;
  const dedupeKey = `${input.entityType}:${input.identifierSystem}:${normalizedIdentifier}`;
  const digestPayload = {
    dedupeKey,
    entityType: input.entityType,
    identifierSystem: input.identifierSystem,
    label: input.label.trim(),
    normalizedIdentifier,
    normalizedSourceLocator,
    redactionLevel: input.redactionLevel,
    verificationStatus: input.verificationStatus,
  };

  return {
    ...input,
    entityKind: "external_entity_reference",
    label: input.label.trim(),
    normalizedIdentifier,
    normalizedSourceLocator,
    dedupeKey,
    sha256: sha256(digestPayload),
  };
}

export function createMoralTradeEvidenceArtifact(
  input: MoralTradeEvidenceArtifactInput,
): MoralTradeEvidenceArtifact {
  const normalizedLocator = normalizeEvidenceLocator(input.locator);
  const claimScopes = [...new Set(input.claimScopes)].sort();
  const digestPayload = {
    claimScopes,
    contentDigest: input.contentDigest ?? null,
    kind: input.kind,
    locator: normalizedLocator,
    mediaType: input.mediaType,
    redactionLevel: input.redactionLevel,
    submittedAt: input.submittedAt,
  };

  return {
    id: input.id,
    entityKind: "evidence_artifact",
    kind: input.kind,
    locator: input.locator,
    normalizedLocator,
    mediaType: input.mediaType,
    claimScopes,
    submittedAt: input.submittedAt,
    submittedByAgentId: input.submittedByAgentId,
    redactionLevel: input.redactionLevel,
    sha256: sha256(digestPayload),
  };
}

function buildMoralTradeTraceabilityAuditQuestionAnswers(
  input: MoralTradeTraceabilityEventInput,
): MoralTradeAuditQuestionAnswers {
  return {
    whatHappened: `${input.action}:${input.businessStep}:${input.disposition}:${input.what.proposalId}`,
    whoTouchedIt: [...new Set(input.agentIds)].sort(),
    whenRecorded: input.recordedAt,
  };
}

export function createMoralTradeTraceabilityEvent(
  input: MoralTradeTraceabilityEventInput,
): MoralTradeTraceabilityEvent {
  const normalizedLocator = input.where.locator ? normalizeEvidenceLocator(input.where.locator) : null;
  const auditQuestionAnswers = buildMoralTradeTraceabilityAuditQuestionAnswers(input);
  const eventPayload = {
    action: input.action,
    agentIds: [...new Set(input.agentIds)].sort(),
    auditQuestionAnswers,
    businessStep: input.businessStep,
    disposition: input.disposition,
    eventTime: input.eventTime,
    recordedAt: input.recordedAt,
    redactionLevel: input.redactionLevel,
    what: {
      ...input.what,
      artifactIds: [...new Set(input.what.artifactIds ?? [])].sort(),
      claimIds: [...new Set(input.what.claimIds ?? [])].sort(),
    },
    where: {
      ...input.where,
      locator: normalizedLocator,
    },
    why: {
      ...input.why,
      reasonCodes: [...new Set(input.why.reasonCodes)].sort(),
    },
  };

  return {
    ...input,
    agentIds: [...new Set(input.agentIds)].sort(),
    auditQuestionAnswers,
    entityKind: "traceability_event",
    normalizedLocator,
    what: {
      ...input.what,
      artifactIds: [...new Set(input.what.artifactIds ?? [])].sort(),
      claimIds: [...new Set(input.what.claimIds ?? [])].sort(),
    },
    where: {
      ...input.where,
      locator: input.where.locator,
    },
    why: {
      ...input.why,
      reasonCodes: [...new Set(input.why.reasonCodes)].sort(),
    },
    sha256: sha256(eventPayload),
  };
}

function traceabilityEventExpectedHash(event: MoralTradeTraceabilityEvent) {
  return sha256({
    action: event.action,
    agentIds: [...new Set(event.agentIds)].sort(),
    auditQuestionAnswers: event.auditQuestionAnswers,
    businessStep: event.businessStep,
    disposition: event.disposition,
    eventTime: event.eventTime,
    recordedAt: event.recordedAt,
    redactionLevel: event.redactionLevel,
    what: {
      ...event.what,
      artifactIds: [...new Set(event.what.artifactIds ?? [])].sort(),
      claimIds: [...new Set(event.what.claimIds ?? [])].sort(),
    },
    where: {
      ...event.where,
      locator: event.normalizedLocator,
    },
    why: {
      ...event.why,
      reasonCodes: [...new Set(event.why.reasonCodes)].sort(),
    },
  });
}

export function getMoralTradeProvenanceSampleBundle(): MoralTradeProvenanceBundle {
  const submittedAt = "2026-05-01T12:00:00.000Z";
  const participant: MoralTradeProvenanceAgent = {
    id: "agent-participant-sample",
    kind: "participant",
    label: "Sample submitting participant",
  };
  const reviewer: MoralTradeProvenanceAgent = {
    id: "agent-reviewer-sample",
    kind: "external_reviewer",
    label: "Sample evidence reviewer",
  };
  const provider: MoralTradeProvenanceAgent = {
    id: "agent-provider-sample",
    kind: "payment_or_evidence_provider",
    label: "Sample receipt provider",
  };
  const externalEntity = createMoralTradeExternalEntityReference({
    id: "entity-charity-sample",
    entityType: "charity",
    label: "Sample Global Health Charity",
    identifierSystem: "every_org_slug",
    identifier: "sample-global-health",
    sourceLocator: "https://www.every.org/sample-global-health",
    verificationStatus: "external_registry_matched",
    redactionLevel: "public",
  });
  const artifact = createMoralTradeEvidenceArtifact({
    id: "artifact-receipt-sample",
    kind: "receipt",
    locator: "https://evidence.example.org/receipts/sample-donation",
    mediaType: "text/html",
    claimScopes: ["payment_or_donation_record", "factual_action"],
    submittedAt,
    submittedByAgentId: participant.id,
    redactionLevel: "reviewer_only",
  });
  const claim: MoralTradeEvidenceClaim = {
    id: "claim-donation-sample",
    proposalId: "proposal-sample",
    claimType: "receipt",
    artifactIds: [artifact.id],
    claimScope: "payment_or_donation_record",
    reviewerConfidence: "medium",
    uniquenessChecked: true,
    createdAt: submittedAt,
  };
  const uploadActivity: MoralTradeProvenanceActivity = {
    id: "activity-upload-sample",
    kind: "evidence_submitted",
    at: submittedAt,
    usedEntityIds: [],
    generatedEntityIds: [artifact.id, claim.id],
    agentIds: [participant.id, provider.id],
  };
  const reviewDecisionIdempotencyKey =
    "agreement-review-decision:review-case-sample:owner-sample:needs_evidence:needs_human_review";
  const reviewDecisionReasonCodes = ["evidence_sufficiency", "payment_or_donation_record"];
  const reviewDecisionSummary =
    "Sample receipt locator is present; scope, freshness, and uniqueness remain reviewer-scoped before reliance.";
  const reviewDecisionHash = sha256({
    idempotencyKey: reviewDecisionIdempotencyKey,
    outcome: "needs_more",
    proposalId: "proposal-sample",
    reasonCodes: reviewDecisionReasonCodes,
    reviewerId: reviewer.id,
    summary: reviewDecisionSummary,
  });
  const reviewDecision: MoralTradeReviewDecision = {
    id: "review-decision-sample",
    proposalId: "proposal-sample",
    outcome: "needs_more",
    reasonCodes: reviewDecisionReasonCodes,
    summary: reviewDecisionSummary,
    reviewerId: reviewer.id,
    idempotencyKey: reviewDecisionIdempotencyKey,
    decisionHash: reviewDecisionHash,
    createdAt: submittedAt,
  };
  const reviewActivity: MoralTradeProvenanceActivity = {
    id: "activity-review-sample",
    kind: "review_completed",
    at: submittedAt,
    usedEntityIds: [artifact.id, claim.id],
    generatedEntityIds: [reviewDecision.id],
    agentIds: [reviewer.id],
  };
  const traceabilityEvent = createMoralTradeTraceabilityEvent({
    id: "trace-event-sample",
    eventTime: submittedAt,
    recordedAt: submittedAt,
    action: "OBSERVE",
    businessStep: "payment_recorded",
    disposition: "in_review",
    what: {
      proposalId: "proposal-sample",
      artifactIds: [artifact.id],
      claimIds: [claim.id],
      amountCents: 2500,
      currency: "USD",
    },
    where: {
      locationType: "charity",
      locator: "https://payments.example.org/receipts/sample-donation",
      provider: "sample payment provider",
      externalEntityId: externalEntity.id,
    },
    why: {
      reasonCodes: ["payment_or_donation_record"],
      sourceActivityId: uploadActivity.id,
      relatedReviewDecisionId: reviewDecision.id,
    },
    agentIds: [participant.id, provider.id],
    redactionLevel: "reviewer_only",
  });

  return {
    proposalId: "proposal-sample",
    artifacts: [artifact],
    claims: [claim],
    reviewDecisions: [reviewDecision],
    activities: [uploadActivity, reviewActivity],
    agents: [participant, reviewer, provider],
    externalEntityReferences: [externalEntity],
    traceabilityEvents: [traceabilityEvent],
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProvenanceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function parseTime(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function auditQuestionAnswersAreComplete({
  answers,
  expectedAgentIds,
  expectedRecordedAt,
}: {
  answers: MoralTradeAuditQuestionAnswers | undefined;
  expectedAgentIds: string[];
  expectedRecordedAt: string;
}) {
  return Boolean(
    answers &&
      answers.whatHappened.trim().length > 0 &&
      answers.whenRecorded === expectedRecordedAt &&
      expectedAgentIds.every((agentId) => answers.whoTouchedIt.includes(agentId)),
  );
}

export function validateMoralTradeProvenanceBundle(
  bundle: MoralTradeProvenanceBundle,
  {
    maxArtifactAgeDays = 548,
    now = new Date(),
  }: {
    maxArtifactAgeDays?: number;
    now?: Date;
  } = {},
): MoralTradeProvenanceValidation {
  const artifactsById = new Map(bundle.artifacts.map((artifact) => [artifact.id, artifact]));
  const claimsById = new Map(bundle.claims.map((claim) => [claim.id, claim]));
  const activitiesById = new Map(bundle.activities.map((activity) => [activity.id, activity]));
  const reviewDecisionsById = new Map(
    bundle.reviewDecisions.map((decision) => [decision.id, decision]),
  );
  const agentsById = new Map(bundle.agents.map((agent) => [agent.id, agent]));
  const externalEntityReferences = bundle.externalEntityReferences ?? [];
  const externalEntitiesById = new Map(
    externalEntityReferences.map((entity) => [entity.id, entity]),
  );
  const traceabilityEvents = bundle.traceabilityEvents ?? [];
  const nowMs = now.getTime();
  const maxAgeMs = maxArtifactAgeDays * 24 * 60 * 60 * 1000;
  const missingArtifactLinks = bundle.claims.flatMap((claim) =>
    claim.artifactIds.filter((artifactId) => !artifactsById.has(artifactId)).map((artifactId) => `${claim.id}:${artifactId}`),
  );
  const wrongScopeLinks = bundle.claims.flatMap((claim) =>
    claim.artifactIds
      .map((artifactId) => artifactsById.get(artifactId))
      .filter((artifact): artifact is MoralTradeEvidenceArtifact => Boolean(artifact))
      .filter((artifact) => !artifact.claimScopes.includes(claim.claimScope))
      .map((artifact) => `${claim.id}:${artifact.id}`),
  );
  const staleArtifacts = bundle.artifacts.filter((artifact) => {
    const submittedAt = parseTime(artifact.submittedAt);
    return submittedAt === null || nowMs - submittedAt > maxAgeMs;
  });
  const invalidHashes = bundle.artifacts.filter((artifact) => !/^[a-f0-9]{64}$/.test(artifact.sha256));
  const invalidTraceabilityHashes = traceabilityEvents.filter(
    (event) =>
      !/^[a-f0-9]{64}$/.test(event.sha256) ||
      event.sha256 !== traceabilityEventExpectedHash(event),
  );
  const invalidReviewDecisionHashes = bundle.reviewDecisions.filter(
    (decision) => !decision.idempotencyKey || !/^[a-f0-9]{64}$/.test(decision.decisionHash),
  );
  const invalidExternalEntityReferences = externalEntityReferences.filter(
    (entity) =>
      !entity.normalizedIdentifier ||
      !entity.dedupeKey ||
      !/^[a-f0-9]{64}$/.test(entity.sha256),
  );
  const externalEntityDedupeCounts = new Map<string, number>();

  for (const entity of externalEntityReferences) {
    externalEntityDedupeCounts.set(
      entity.dedupeKey,
      (externalEntityDedupeCounts.get(entity.dedupeKey) ?? 0) + 1,
    );
  }

  const duplicateExternalEntityDedupeKeys = [...externalEntityDedupeCounts]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const missingTraceabilityExternalEntities = traceabilityEvents
    .filter((event) => event.where.externalEntityId && !externalEntitiesById.has(event.where.externalEntityId))
    .map((event) => `${event.id}:${event.where.externalEntityId}`);
  const charityTraceabilityWithoutEntity = traceabilityEvents
    .filter((event) => event.where.locationType === "charity" && !event.where.externalEntityId)
    .map((event) => event.id);
  const unverifiedTraceabilityExternalEntities = traceabilityEvents
    .map((event) => ({
      event,
      entity: event.where.externalEntityId ? externalEntitiesById.get(event.where.externalEntityId) : null,
    }))
    .filter(({ entity }) => entity?.verificationStatus === "unverified")
    .map(({ event, entity }) => `${event.id}:${entity?.id}`);
  const missingAgents = [
    ...bundle.artifacts
      .filter((artifact) => !agentsById.has(artifact.submittedByAgentId))
      .map((artifact) => `${artifact.id}:${artifact.submittedByAgentId}`),
    ...bundle.reviewDecisions
      .filter((decision) => !agentsById.has(decision.reviewerId))
      .map((decision) => `${decision.id}:${decision.reviewerId}`),
    ...bundle.activities.flatMap((activity) =>
      activity.agentIds.filter((agentId) => !agentsById.has(agentId)).map((agentId) => `${activity.id}:${agentId}`),
    ),
    ...traceabilityEvents.flatMap((event) =>
      event.agentIds.filter((agentId) => !agentsById.has(agentId)).map((agentId) => `${event.id}:${agentId}`),
    ),
  ];
  const malformedTraceabilityEvents = traceabilityEvents.filter((event) => {
    const hasKnownEvidenceLinks =
      (event.what.artifactIds ?? []).every((artifactId) => artifactsById.has(artifactId)) &&
      (event.what.claimIds ?? []).every((claimId) => claimsById.has(claimId));
    const hasReviewLink = event.why.relatedReviewDecisionId
      ? reviewDecisionsById.has(event.why.relatedReviewDecisionId)
      : true;
    const hasActivityLink = event.why.sourceActivityId
      ? activitiesById.has(event.why.sourceActivityId)
      : true;
    const hasReviewableTime = parseTime(event.eventTime) !== null && parseTime(event.recordedAt) !== null;
    const hasWhat = event.what.proposalId === bundle.proposalId;
    const hasWhere =
      event.where.locationType === "platform" ||
      Boolean(event.where.provider || event.normalizedLocator || event.where.externalEntityId);
    const hasWhy = event.why.reasonCodes.length > 0 || Boolean(event.why.sourceActivityId);
    const hasAuditQuestionAnswers = auditQuestionAnswersAreComplete({
      answers: event.auditQuestionAnswers,
      expectedAgentIds: event.agentIds,
      expectedRecordedAt: event.recordedAt,
    });

    return !(
      hasKnownEvidenceLinks &&
      hasReviewLink &&
      hasActivityLink &&
      hasReviewableTime &&
      hasWhat &&
      hasWhere &&
      hasWhy &&
      hasAuditQuestionAnswers
    );
  });
  const traceabilityEventsMissingAuditAnswers = traceabilityEvents.filter(
    (event) =>
      !auditQuestionAnswersAreComplete({
        answers: event.auditQuestionAnswers,
        expectedAgentIds: event.agentIds,
        expectedRecordedAt: event.recordedAt,
      }),
  );
  const claimUseCounts = new Map<string, number>();

  for (const claim of bundle.claims) {
    for (const artifactId of claim.artifactIds) {
      claimUseCounts.set(artifactId, (claimUseCounts.get(artifactId) ?? 0) + 1);
    }
  }

  const duplicateClaimLinks = bundle.claims
    .filter((claim) => !claim.reuseJustification)
    .flatMap((claim) => claim.artifactIds.filter((artifactId) => (claimUseCounts.get(artifactId) ?? 0) > 1))
    .map((artifactId) => artifactId);

  const checks = [
    check(
      "artifact-hashes",
      "Artifacts are content-addressed",
      invalidHashes.length === 0 &&
        invalidTraceabilityHashes.length === 0 &&
        invalidReviewDecisionHashes.length === 0 &&
        bundle.artifacts.length > 0,
      `${bundle.artifacts.length} artifact(s), ${invalidHashes.length} invalid artifact hash(es), ${invalidTraceabilityHashes.length} invalid traceability hash(es), ${invalidReviewDecisionHashes.length} invalid review decision hash(es).`,
    ),
    check(
      "claim-artifact-links",
      "Claims link to existing artifacts",
      missingArtifactLinks.length === 0,
      missingArtifactLinks.length ? missingArtifactLinks.join(", ") : "All claim artifact links resolve.",
    ),
    check(
      "scope-alignment",
      "Artifact scopes match claims",
      wrongScopeLinks.length === 0,
      wrongScopeLinks.length ? wrongScopeLinks.join(", ") : "No wrong-scope artifact links.",
    ),
    check(
      "one-proof-one-claim",
      "Duplicate proof is explicit",
      duplicateClaimLinks.length === 0,
      duplicateClaimLinks.length
        ? [...new Set(duplicateClaimLinks)].join(", ")
        : "No unacknowledged duplicate proof reuse.",
    ),
    check(
      "freshness-window",
      "Artifact timestamps are reviewable",
      staleArtifacts.length === 0,
      staleArtifacts.length ? staleArtifacts.map((artifact) => artifact.id).join(", ") : "No stale or unparsable evidence timestamps.",
    ),
    check(
      "agent-links",
      "Activities and artifacts name agents",
      missingAgents.length === 0 && bundle.agents.length > 0,
      missingAgents.length ? missingAgents.join(", ") : `${bundle.agents.length} agent(s) named.`,
    ),
    check(
      "traceability-events",
      "Interoperable event records are linked and reviewable",
      malformedTraceabilityEvents.length === 0,
      malformedTraceabilityEvents.length
        ? malformedTraceabilityEvents.map((event) => event.id).join(", ")
        : `${traceabilityEvents.length} optional traceability event(s) checked.`,
    ),
    check(
      "audit-question-answers",
      "Event records answer what happened, who touched it, and when",
      traceabilityEventsMissingAuditAnswers.length === 0,
      traceabilityEventsMissingAuditAnswers.length
        ? traceabilityEventsMissingAuditAnswers.map((event) => event.id).join(", ")
        : `${traceabilityEvents.length} traceability event(s) expose audit-question answers.`,
    ),
    check(
      "external-entity-references",
      "External providers and charities have stable identifiers",
      invalidExternalEntityReferences.length === 0 &&
        duplicateExternalEntityDedupeKeys.length === 0 &&
        missingTraceabilityExternalEntities.length === 0 &&
        charityTraceabilityWithoutEntity.length === 0 &&
        unverifiedTraceabilityExternalEntities.length === 0,
      [
        `${externalEntityReferences.length} external entity reference(s)`,
        `${invalidExternalEntityReferences.length} invalid`,
        `${duplicateExternalEntityDedupeKeys.length} duplicate dedupe key(s)`,
        `${missingTraceabilityExternalEntities.length} missing traceability link(s)`,
        `${charityTraceabilityWithoutEntity.length} charity event(s) without entity reference`,
        `${unverifiedTraceabilityExternalEntities.length} unverified linked entity/entities`,
      ].join(", "),
    ),
    check(
      "prov-triplets",
      "Bundle has entity/activity/agent structure",
      bundle.artifacts.length > 0 && bundle.activities.length > 0 && bundle.agents.length > 0,
      `${bundle.artifacts.length} artifact entity/entities, ${bundle.activities.length} activity/activities, ${bundle.agents.length} agent(s).`,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    schemaVersion: MORAL_TRADE_PROVENANCE_SCHEMA_VERSION,
    checks,
    blockers,
  };
}

export function getMoralTradeProvenanceContract(): MoralTradeProvenanceContract {
  const sampleBundle = getMoralTradeProvenanceSampleBundle();
  const sampleValidation = validateMoralTradeProvenanceBundle(sampleBundle, {
    now: new Date("2026-05-28T12:00:00.000Z"),
  });

  return {
    schemaVersion: MORAL_TRADE_PROVENANCE_SCHEMA_VERSION,
    purpose:
      "Public validator contract for provenance-first Moral Trade evidence objects, review decisions, external entity references, traceability events, activities, and agents.",
    objectSchemas: MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS,
    validationRules: MORAL_TRADE_PROVENANCE_VALIDATION_RULES,
    sampleBundleSummary: {
      artifactCount: sampleBundle.artifacts.length,
      claimCount: sampleBundle.claims.length,
      reviewDecisionCount: sampleBundle.reviewDecisions.length,
      activityCount: sampleBundle.activities.length,
      agentCount: sampleBundle.agents.length,
      externalEntityReferenceCount: sampleBundle.externalEntityReferences?.length ?? 0,
      traceabilityEventCount: sampleBundle.traceabilityEvents?.length ?? 0,
      validationStatus: sampleValidation.status,
    },
    persistenceTables: MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES,
    contractTests: [
      "provenance_contract_validator",
      "provenance_sample_bundle_smoke",
      "traceability_event_contract_smoke",
      "provenance_persistence_schema_smoke",
      "technical_spec_provenance_contract_smoke",
    ],
  };
}

export function validateMoralTradeProvenanceContract(
  contract: MoralTradeProvenanceContract = getMoralTradeProvenanceContract(),
): MoralTradeProvenanceContractValidation {
  const schemaKeys = contract.objectSchemas.map((schema) => schema.key);
  const ruleKeys = contract.validationRules.map((rule) => rule.key);
  const sampleBundle = getMoralTradeProvenanceSampleBundle();
  const sampleValidation = validateMoralTradeProvenanceBundle(sampleBundle, {
    now: new Date("2026-05-28T12:00:00.000Z"),
  });
  const requiredSchemaKeys = [
    "evidence_artifact",
    "evidence_claim",
    "external_entity_reference",
    "review_decision",
    "match_signal",
    "traceability_event",
    "provenance_activity",
    "provenance_agent",
    "state_transition_event_record",
  ];
  const requiredRuleKeys = MORAL_TRADE_PROVENANCE_VALIDATION_RULES.map((rule) => rule.key);
  const requiredPersistenceTables = MORAL_TRADE_PROVENANCE_PERSISTENCE_TABLES.map(
    (table) => table.table,
  );
  const checks = [
    check(
      "object-schema-coverage",
      "Evidence, decision, traceability, activity, and agent schemas are public",
      requiredSchemaKeys.every((key) => schemaKeys.includes(key)) &&
        contract.objectSchemas.every((schema) => schema.required.length >= 3),
      schemaKeys.join(", "),
    ),
    check(
      "validation-rule-coverage",
      "Published provenance rules match the bundle validator checks",
      requiredRuleKeys.every((key) => ruleKeys.includes(key)),
      ruleKeys.join(", "),
    ),
    check(
      "sample-bundle-validation",
      "Synthetic evidence bundle proves the contract is executable",
      sampleValidation.status === "pass" &&
        contract.sampleBundleSummary.validationStatus === "pass" &&
        contract.sampleBundleSummary.artifactCount > 0 &&
        contract.sampleBundleSummary.claimCount > 0 &&
        contract.sampleBundleSummary.reviewDecisionCount > 0 &&
        contract.sampleBundleSummary.traceabilityEventCount > 0,
      `${contract.sampleBundleSummary.artifactCount} artifact(s), ${contract.sampleBundleSummary.claimCount} claim(s), ${contract.sampleBundleSummary.traceabilityEventCount} traceability event(s), ${sampleValidation.blockers.length} blocker(s).`,
    ),
    check(
      "agent-reviewed-decisions",
      "Reviewer decisions name provenance agents",
      sampleBundle.reviewDecisions.every((decision) =>
        sampleBundle.agents.some((agent) => agent.id === decision.reviewerId),
      ),
      sampleBundle.reviewDecisions.map((decision) => `${decision.id}:${decision.reviewerId}`).join(", "),
    ),
    check(
      "persistence-table-coverage",
      "Append-only provenance objects have owner-scoped storage tables",
      requiredPersistenceTables.every((table) =>
        contract.persistenceTables.some((entry) => entry.table === table),
      ) &&
        contract.persistenceTables.every(
          (entry) =>
            schemaKeys.includes(entry.objectSchemaKey) &&
            entry.requiredColumns.includes("owner_profile_id") &&
            /owner_insert/.test(entry.accessModel),
        ),
      contract.persistenceTables
        .map((entry) => `${entry.table}:${entry.objectSchemaKey}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Provenance contract test hooks are named",
      [
        "provenance_contract_validator",
        "provenance_sample_bundle_smoke",
        "traceability_event_contract_smoke",
        "provenance_persistence_schema_smoke",
        "technical_spec_provenance_contract_smoke",
      ].every((hook) => contract.contractTests.includes(hook)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-provenance-contract",
    validatorVersion: MORAL_TRADE_PROVENANCE_CONTRACT_VALIDATOR_VERSION,
    schemaVersion: contract.schemaVersion,
    checks,
    blockers,
  };
}
