import {
  buildMoralTradeStateTransitionEventRecord,
  type MoralTradeStateTransitionEventRecord,
} from "@/lib/moral-trade/protocol";
import type { BaselineBondStatus } from "@/lib/baseline-bonds";

type BaselineBondActorKind = "participant" | "counterparty" | "operator" | "external_reviewer";

export interface BaselineBondTransitionInput {
  actorAgentId: string;
  actorAgentKind: BaselineBondActorKind;
  actorLabel: string;
  fromStatus: BaselineBondStatus;
  idempotencyKey: string;
  offerId: string;
  ownerProfileId: string;
  provenanceActivity: "risk_screened" | "challenge_window_opened" | "evidence_submitted" | "review_completed";
  recordedAt?: string;
  supabase: unknown;
  toStatus: BaselineBondStatus;
}

async function getOrCreateBaselineBondTransitionAgent({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  ownerProfileId,
  supabase,
}: Pick<
  BaselineBondTransitionInput,
  "actorAgentId" | "actorAgentKind" | "actorLabel" | "ownerProfileId" | "supabase"
>) {
  const client = supabase as any;
  const agentKey = `baseline-bond:${actorAgentKind}:${actorAgentId}`;
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
      label: actorLabel || "Baseline credibility bond actor",
      metadata: {
        actorAgentId,
        source: "baseline_credibility_bond_transition",
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

function buildBaselineBondStateTransitionRow({
  ownerProfileId,
  transition,
}: {
  ownerProfileId: string;
  transition: MoralTradeStateTransitionEventRecord;
}) {
  return {
    actor_agent_id: transition.actorAgentId,
    actor_agent_kind: transition.actorAgentKind,
    audit_question_answers: transition.auditQuestionAnswers,
    event_hash: transition.eventHash,
    from_status: transition.from,
    generated_entity_ids: transition.generatedEntityIds,
    idempotency_key: transition.idempotencyKey,
    owner_profile_id: ownerProfileId,
    previous_event_hash: transition.previousEventHash,
    provenance_activity: transition.provenanceActivity,
    recorded_at: transition.recordedAt,
    redaction_level: "participant_private",
    subject_id: transition.subjectId,
    subject_kind: transition.subjectKind,
    to_status: transition.to,
    used_entity_ids: transition.usedEntityIds,
  };
}

export async function persistBaselineBondStatusTransition({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  fromStatus,
  idempotencyKey,
  offerId,
  ownerProfileId,
  provenanceActivity,
  recordedAt = new Date().toISOString(),
  supabase,
  toStatus,
}: BaselineBondTransitionInput) {
  if (fromStatus === toStatus) {
    return { error: null, transition: null };
  }

  const agent = await getOrCreateBaselineBondTransitionAgent({
    actorAgentId,
    actorAgentKind,
    actorLabel,
    ownerProfileId,
    supabase,
  });

  if (agent.error || !agent.id) {
    return { error: agent.error ?? new Error("Baseline credibility bond transition agent missing."), transition: null };
  }

  const transition = buildMoralTradeStateTransitionEventRecord({
    actorAgentId: agent.id,
    actorAgentKind,
    from: fromStatus,
    generatedEntityIds: [`${offerId}:baseline-bond:${toStatus}`],
    idempotencyKey,
    provenanceActivity,
    recordedAt,
    subjectId: offerId,
    subjectKind: "offer",
    to: toStatus,
    usedEntityIds: [offerId, `${offerId}:baseline-bond`],
  });
  const client = supabase as any;
  const row = buildBaselineBondStateTransitionRow({ ownerProfileId, transition });
  const { error } = await client.from("moral_trade_state_transition_events").insert(row);

  if (!error || error.code === "23505") {
    return { error: null, transition };
  }

  return { error: error as Error, transition };
}
