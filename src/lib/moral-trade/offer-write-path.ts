import type { DonationOffsetModerationStatus } from "@/lib/donation-offsets";
import {
  buildMoralTradeStateTransitionEventRecord,
  summarizeMoralTradeStateTransitionEventRecord,
  validateMoralTradeProposalStateTransition,
  type MoralTradeStateTransitionEventRecord,
  type MoralTradeProposalStateTransitionValidation,
} from "@/lib/moral-trade/protocol";
import type {
  MoralTradeProtocolDraftInput,
  MoralTradeProtocolDraftReview,
} from "@/lib/proposal-review";

export type MoralTradeOfferPersistenceStatus = "open" | "paused";

export function buildMoralTradeProtocolProposalRecord(
  draft: MoralTradeProtocolDraftInput,
): Record<string, unknown> {
  return {
    format: draft.format,
    cause_areas: [draft.offeredCause, draft.requestedCause]
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean),
    offered_action: draft.offeredAction,
    requested_action: draft.requestedAction,
    baseline_statement: draft.baselineStatement,
    duration: draft.duration,
    exit_conditions: draft.exitConditions,
    verification_method: draft.verificationMethod,
    public_description: draft.publicDescription,
  };
}

export function validateMoralTradeOfferCreateTransition({
  draft,
  protocolReview,
  actorAgentId = "operator:protocol-validator",
  actorAgentKind = "operator",
  idempotencyKey,
  previousEventHash = null,
  provenanceActivityRecorded = true,
  recordedAt,
  subjectKind = "proposal_record",
  subjectId = "proposal_record:new_offer",
  transitionEventRecord,
}: {
  draft: MoralTradeProtocolDraftInput;
  protocolReview: Pick<MoralTradeProtocolDraftReview, "policyConflicts">;
  actorAgentId?: string;
  actorAgentKind?: string;
  idempotencyKey?: string;
  previousEventHash?: string | null;
  provenanceActivityRecorded?: boolean;
  recordedAt?: string;
  subjectKind?: "proposal_record" | "agreement" | "offer";
  subjectId?: string;
  transitionEventRecord?: MoralTradeStateTransitionEventRecord;
}): MoralTradeProposalStateTransitionValidation {
  const to = protocolReview.policyConflicts.length ? "blocked" : "submitted";
  const transitionRecordedAt = recordedAt ?? new Date().toISOString();

  return validateMoralTradeProposalStateTransition({
    from: "draft",
    to,
    proposal: buildMoralTradeProtocolProposalRecord(draft),
    policyConflictCodes: protocolReview.policyConflicts,
    provenanceActivityRecorded,
    transitionEventRecord:
      transitionEventRecord ??
      (provenanceActivityRecorded
        ? buildMoralTradeStateTransitionEventRecord({
            actorAgentId,
            actorAgentKind,
            from: "draft",
            idempotencyKey:
              idempotencyKey ?? `offer-create:${actorAgentId}:${transitionRecordedAt}`,
            previousEventHash,
            recordedAt: transitionRecordedAt,
            subjectKind,
            subjectId,
            to,
          })
        : undefined),
  });
}

export function buildMoralTradeOfferCreateProvenanceAgentRow({
  actorAgentId,
  actorLabel,
  ownerProfileId,
}: {
  actorAgentId: string;
  actorLabel: string;
  ownerProfileId: string;
}) {
  return {
    agent_key: `participant:${actorAgentId}`,
    kind: "participant",
    label: actorLabel || "Offer creator",
    metadata: {
      authUserId: actorAgentId,
      source: "offer_create_protocol_transition",
    },
    owner_profile_id: ownerProfileId,
    redaction_level: "participant_private",
  } as const;
}

export function buildMoralTradeOfferCreateProvenanceRows({
  actorProvenanceAgentId,
  offerId,
  ownerProfileId,
  transitionEventRecord,
}: {
  actorProvenanceAgentId: string;
  offerId: string;
  ownerProfileId: string;
  transitionEventRecord: MoralTradeStateTransitionEventRecord;
}) {
  const generatedEntityIds = transitionEventRecord.generatedEntityIds.includes(offerId)
    ? transitionEventRecord.generatedEntityIds
    : [offerId, ...transitionEventRecord.generatedEntityIds];
  const usedEntityIds = transitionEventRecord.usedEntityIds.includes(offerId)
    ? transitionEventRecord.usedEntityIds
    : [offerId, ...transitionEventRecord.usedEntityIds];

  return {
    provenanceActivity: {
      activity_at: transitionEventRecord.recordedAt,
      activity_hash: transitionEventRecord.eventHash,
      agent_ids: [actorProvenanceAgentId],
      generated_entity_ids: generatedEntityIds,
      idempotency_key: `${transitionEventRecord.idempotencyKey}:activity`,
      kind: transitionEventRecord.provenanceActivity,
      owner_profile_id: ownerProfileId,
      previous_activity_hash: transitionEventRecord.previousEventHash,
      redaction_level: "participant_private",
      subject_id: offerId,
      subject_kind: "offer",
      used_entity_ids: usedEntityIds,
    },
    stateTransitionEvent: {
      actor_agent_id: actorProvenanceAgentId,
      actor_agent_kind: transitionEventRecord.actorAgentKind,
      event_hash: transitionEventRecord.eventHash,
      from_status: transitionEventRecord.from,
      generated_entity_ids: generatedEntityIds,
      idempotency_key: transitionEventRecord.idempotencyKey,
      owner_profile_id: ownerProfileId,
      previous_event_hash: transitionEventRecord.previousEventHash,
      provenance_activity: transitionEventRecord.provenanceActivity,
      recorded_at: transitionEventRecord.recordedAt,
      redaction_level: "participant_private",
      subject_id: offerId,
      subject_kind: "offer",
      to_status: transitionEventRecord.to,
      used_entity_ids: usedEntityIds,
    },
  } as const;
}

export function getMoralTradeOfferPersistenceStatus({
  donationOffsetModerationStatus,
  protocolReviewStatus,
}: {
  donationOffsetModerationStatus?: DonationOffsetModerationStatus | null;
  protocolReviewStatus: MoralTradeProtocolDraftReview["status"];
}): MoralTradeOfferPersistenceStatus {
  if (
    donationOffsetModerationStatus === "flagged" ||
    protocolReviewStatus === "needs_evidence" ||
    protocolReviewStatus === "needs_human_review" ||
    protocolReviewStatus === "challenge_window" ||
    protocolReviewStatus === "needs_clarification" ||
    protocolReviewStatus === "draft" ||
    protocolReviewStatus === "blocked"
  ) {
    return "paused";
  }

  return "open";
}

export function buildMoralTradeOfferProtocolNotes(
  protocolReview: Pick<
    MoralTradeProtocolDraftReview,
    "factorCodes" | "policyConflicts" | "status" | "summary"
  >,
  transition: Pick<
    MoralTradeProposalStateTransitionValidation,
    "blockers" | "from" | "status" | "to" | "transitionEventRecord"
  >,
) {
  return [
    `Protocol review status: ${protocolReview.status}.`,
    `Protocol review summary: ${protocolReview.summary}`,
    protocolReview.factorCodes.length
      ? `Protocol factor codes: ${protocolReview.factorCodes.join(", ")}.`
      : "",
    protocolReview.policyConflicts.length
      ? `Protocol policy conflicts: ${protocolReview.policyConflicts.join(", ")}.`
      : "",
    transition.status === "pass"
      ? `Protocol transition accepted: ${transition.from}->${transition.to}.`
      : `Protocol transition blocked: ${transition.blockers.join(", ")}.`,
    summarizeMoralTradeStateTransitionEventRecord(transition.transitionEventRecord),
  ]
    .filter(Boolean)
    .join("\n");
}
