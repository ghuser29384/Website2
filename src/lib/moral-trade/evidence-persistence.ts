import { createHash, randomUUID } from "node:crypto";

import {
  canonicalizeForEvidenceHash,
  createMoralTradeEvidenceArtifact,
  createMoralTradeTraceabilityEvent,
  type MoralTradeEvidenceClaimScope,
  type MoralTradeEvidenceClaimType,
  type MoralTradeProvenanceActivityKind,
  type MoralTradeProvenanceAgentKind,
  type MoralTradeRedactionLevel,
  type MoralTradeTraceabilityBusinessStep,
  type MoralTradeTraceabilityDisposition,
  type MoralTradeTraceabilityLocationType,
} from "@/lib/moral-trade/provenance";

export interface MoralTradeEvidenceSubmissionPersistenceInput {
  actorAgentId: string;
  actorAgentKind: MoralTradeProvenanceAgentKind;
  actorLabel: string;
  claimScope: MoralTradeEvidenceClaimScope;
  evidenceKind: MoralTradeEvidenceClaimType;
  evidenceUrl: string;
  idempotencyKey: string;
  mediaType?: string;
  offerId?: string | null;
  agreementId?: string | null;
  ownerProfileId: string;
  reasonCodes: string[];
  recordedAt?: string;
  redactionLevel?: MoralTradeRedactionLevel;
  subjectId: string;
  subjectKind: "proposal_record" | "agreement" | "offer";
  supabase: unknown;
  traceabilityLocationType?: MoralTradeTraceabilityLocationType;
  idFactory?: () => string;
}

export interface MoralTradeEvidenceSubmissionPersistenceResult {
  error: Error | null;
  ids: {
    activityId: string;
    agentId: string;
    artifactId: string;
    claimId: string;
    traceabilityEventId: string;
  } | null;
}

function hashEvidencePersistencePayload(value: unknown) {
  return createHash("sha256").update(canonicalizeForEvidenceHash(value)).digest("hex");
}

async function getOrCreateEvidenceSubmissionAgent({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  ownerProfileId,
  supabase,
}: Pick<
  MoralTradeEvidenceSubmissionPersistenceInput,
  "actorAgentId" | "actorAgentKind" | "actorLabel" | "ownerProfileId" | "supabase"
>) {
  const client = supabase as any;
  const agentKey = `evidence-submission:${actorAgentKind}:${actorAgentId}`;
  const { data: existingAgent, error: existingAgentError } = await client
    .from("moral_trade_provenance_agents")
    .select("id")
    .eq("owner_profile_id", ownerProfileId)
    .eq("agent_key", agentKey)
    .maybeSingle();

  if (existingAgentError) {
    return { error: existingAgentError as Error, id: null };
  }

  if (existingAgent?.id) {
    return { error: null, id: String(existingAgent.id) };
  }

  const { data: insertedAgent, error: insertedAgentError } = await client
    .from("moral_trade_provenance_agents")
    .insert({
      agent_key: agentKey,
      kind: actorAgentKind,
      label: actorLabel || "Evidence submitting participant",
      metadata: {
        actorAgentId,
        source: "moral_trade_evidence_submission",
      },
      owner_profile_id: ownerProfileId,
      redaction_level: "participant_private",
    })
    .select("id")
    .single();

  if (!insertedAgentError && insertedAgent?.id) {
    return { error: null, id: String(insertedAgent.id) };
  }

  if (insertedAgentError?.code === "23505") {
    const { data: racedAgent, error: racedAgentError } = await client
      .from("moral_trade_provenance_agents")
      .select("id")
      .eq("owner_profile_id", ownerProfileId)
      .eq("agent_key", agentKey)
      .maybeSingle();

    if (racedAgent?.id && !racedAgentError) {
      return { error: null, id: String(racedAgent.id) };
    }

    return { error: (racedAgentError ?? insertedAgentError) as Error, id: null };
  }

  return { error: insertedAgentError as Error, id: null };
}

function buildActivityHash({
  activityAt,
  agentIds,
  generatedEntityIds,
  idempotencyKey,
  kind,
  subjectId,
  subjectKind,
  usedEntityIds,
}: {
  activityAt: string;
  agentIds: string[];
  generatedEntityIds: string[];
  idempotencyKey: string;
  kind: MoralTradeProvenanceActivityKind;
  subjectId: string;
  subjectKind: MoralTradeEvidenceSubmissionPersistenceInput["subjectKind"];
  usedEntityIds: string[];
}) {
  return hashEvidencePersistencePayload({
    activityAt,
    agentIds: [...agentIds].sort(),
    generatedEntityIds: [...generatedEntityIds].sort(),
    idempotencyKey,
    kind,
    subjectId,
    subjectKind,
    usedEntityIds: [...usedEntityIds].sort(),
  });
}

export async function persistMoralTradeEvidenceSubmission({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  agreementId = null,
  claimScope,
  evidenceKind,
  evidenceUrl,
  idempotencyKey,
  mediaType = "text/uri-list",
  offerId = null,
  ownerProfileId,
  reasonCodes,
  recordedAt = new Date().toISOString(),
  redactionLevel = "reviewer_only",
  subjectId,
  subjectKind,
  supabase,
  traceabilityLocationType = "public_log",
  idFactory = randomUUID,
}: MoralTradeEvidenceSubmissionPersistenceInput): Promise<MoralTradeEvidenceSubmissionPersistenceResult> {
  const client = supabase as any;
  const agent = await getOrCreateEvidenceSubmissionAgent({
    actorAgentId,
    actorAgentKind,
    actorLabel,
    ownerProfileId,
    supabase,
  });

  if (agent.error || !agent.id) {
    return {
      error: agent.error ?? new Error("Evidence submission provenance agent missing."),
      ids: null,
    };
  }

  const artifactId = idFactory();
  const claimId = idFactory();
  const traceabilityEventId = idFactory();
  const activityId = idFactory();
  const artifact = createMoralTradeEvidenceArtifact({
    id: artifactId,
    kind: evidenceKind,
    locator: evidenceUrl,
    mediaType,
    claimScopes: [claimScope],
    submittedAt: recordedAt,
    submittedByAgentId: agent.id,
    redactionLevel,
  });
  const traceabilityEvent = createMoralTradeTraceabilityEvent({
    id: traceabilityEventId,
    action: "OBSERVE",
    agentIds: [agent.id],
    businessStep: "evidence_uploaded" satisfies MoralTradeTraceabilityBusinessStep,
    disposition: "in_review" satisfies MoralTradeTraceabilityDisposition,
    eventTime: recordedAt,
    recordedAt,
    redactionLevel,
    what: {
      artifactIds: [artifactId],
      claimIds: [claimId],
      proposalId: subjectId,
    },
    where: {
      locationType: traceabilityLocationType,
      locator: evidenceUrl,
    },
    why: {
      reasonCodes,
      sourceActivityId: activityId,
    },
  });
  const activityHash = buildActivityHash({
    activityAt: recordedAt,
    agentIds: [agent.id],
    generatedEntityIds: [artifactId, claimId, traceabilityEventId],
    idempotencyKey,
    kind: "evidence_submitted",
    subjectId,
    subjectKind,
    usedEntityIds: [subjectId],
  });
  const commonSubject = {
    agreement_id: agreementId,
    offer_id: offerId,
    owner_profile_id: ownerProfileId,
    subject_id: subjectId,
    subject_kind: subjectKind,
  };

  const { error: artifactError } = await client.from("moral_trade_evidence_artifacts").insert({
    ...commonSubject,
    id: artifactId,
    claim_scopes: artifact.claimScopes,
    kind: artifact.kind,
    media_type: artifact.mediaType,
    metadata: {
      entityKind: artifact.entityKind,
      source: "moral_trade_evidence_submission",
    },
    normalized_locator: artifact.normalizedLocator,
    redaction_level: artifact.redactionLevel,
    sha256: artifact.sha256,
    submitted_at: artifact.submittedAt,
    submitted_by_agent_id: agent.id,
  });

  if (artifactError) {
    return { error: artifactError as Error, ids: null };
  }

  const { error: claimError } = await client.from("moral_trade_evidence_claims").insert({
    ...commonSubject,
    claim_scope: claimScope,
    claim_type: evidenceKind,
    id: claimId,
    redaction_level: redactionLevel,
    reuse_justification: "",
    reviewer_confidence: "low",
    uniqueness_checked: false,
  });

  if (claimError) {
    return { error: claimError as Error, ids: null };
  }

  const { error: claimArtifactError } = await client
    .from("moral_trade_evidence_claim_artifacts")
    .insert({
      artifact_id: artifactId,
      claim_id: claimId,
      owner_profile_id: ownerProfileId,
    });

  if (claimArtifactError) {
    return { error: claimArtifactError as Error, ids: null };
  }

  const { error: traceabilityError } = await client.from("moral_trade_traceability_events").insert({
    ...commonSubject,
    action: traceabilityEvent.action,
    agent_ids: traceabilityEvent.agentIds,
    business_step: traceabilityEvent.businessStep,
    disposition: traceabilityEvent.disposition,
    event_time: traceabilityEvent.eventTime,
    id: traceabilityEventId,
    recorded_at: traceabilityEvent.recordedAt,
    redaction_level: traceabilityEvent.redactionLevel,
    sha256: traceabilityEvent.sha256,
    what: traceabilityEvent.what,
    where_recorded: {
      ...traceabilityEvent.where,
      locator: traceabilityEvent.normalizedLocator,
    },
    why: traceabilityEvent.why,
  });

  if (traceabilityError) {
    return { error: traceabilityError as Error, ids: null };
  }

  const { error: activityError } = await client.from("moral_trade_provenance_activities").insert({
    ...commonSubject,
    activity_at: recordedAt,
    activity_hash: activityHash,
    agent_ids: [agent.id],
    generated_entity_ids: [artifactId, claimId, traceabilityEventId],
    id: activityId,
    idempotency_key: idempotencyKey,
    kind: "evidence_submitted",
    previous_activity_hash: null,
    redaction_level: redactionLevel,
    used_entity_ids: [subjectId],
  });

  if (activityError && activityError.code !== "23505") {
    return { error: activityError as Error, ids: null };
  }

  return {
    error: null,
    ids: {
      activityId,
      agentId: agent.id,
      artifactId,
      claimId,
      traceabilityEventId,
    },
  };
}
