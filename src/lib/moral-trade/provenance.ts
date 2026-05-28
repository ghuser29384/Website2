import { createHash } from "node:crypto";

import { normalizeEvidenceLocator } from "@/lib/validation";

export const MORAL_TRADE_PROVENANCE_SCHEMA_VERSION = "moral-trade-provenance-v0.1";

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
    required: ["id", "proposalId", "outcome", "reasonCodes", "summary", "reviewerId", "createdAt"],
  },
  {
    key: "match_signal",
    label: "Privacy-safe match signal",
    required: [
      "id",
      "leftProfileId",
      "rightProfileId",
      "status",
      "factorCodes",
      "confidenceBand",
      "redactedFields",
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
] as const;

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

export function createMoralTradeTraceabilityEvent(
  input: MoralTradeTraceabilityEventInput,
): MoralTradeTraceabilityEvent {
  const normalizedLocator = input.where.locator ? normalizeEvidenceLocator(input.where.locator) : null;
  const eventPayload = {
    action: input.action,
    agentIds: [...new Set(input.agentIds)].sort(),
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
    (event) => !/^[a-f0-9]{64}$/.test(event.sha256),
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

    return !(
      hasKnownEvidenceLinks &&
      hasReviewLink &&
      hasActivityLink &&
      hasReviewableTime &&
      hasWhat &&
      hasWhere &&
      hasWhy
    );
  });
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
        bundle.artifacts.length > 0,
      `${bundle.artifacts.length} artifact(s), ${invalidHashes.length} invalid artifact hash(es), ${invalidTraceabilityHashes.length} invalid traceability hash(es).`,
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
