import {
  buildMoralTradeStateTransitionEventRecord,
  validateMoralTradeProposalStateTransition,
  type MoralTradeStateTransitionEventRecord,
  type MoralTradeProposalStateTransitionValidation,
} from "@/lib/moral-trade/protocol";

export type AgreementCompletionState =
  | "pending_evidence"
  | "under_review"
  | "challenge_window_open"
  | "reviewed_complete"
  | "disputed_unresolved";

export type AgreementReviewCaseStatus =
  | "open"
  | "under_review"
  | "challenge_window_open"
  | "reviewed_complete"
  | "disputed_unresolved"
  | "appealed"
  | "closed";

export interface AgreementProtocolTerms {
  source: string | null;
  notes: string | null;
  structuredTerms: string | null;
  noTradeBaseline: string | null;
  counterfactualDeclaration: string | null;
  durationTerms: string | null;
  exitConditions: string | null;
  evidenceRule: string | null;
  privacyScope: string | null;
  disclosureScope: string | null;
}

export interface AgreementEvidenceReviewReadinessInput {
  hasEvidenceItem: boolean;
  reviewerConfidence: number | null;
  artifactLinked?: boolean;
  claimScopeAligned?: boolean;
  proofUniquenessChecked?: boolean;
  freshnessReviewed?: boolean;
  agentLinksRecorded?: boolean;
}

export interface AgreementEvidenceReviewReadiness {
  evidenceReviewed: boolean;
  requiredChecks: string[];
  blockers: string[];
}

type AgreementReviewProvenanceAgentKind = "operator" | "external_reviewer";

const AGREEMENT_EVIDENCE_REVIEW_CHECKS = [
  {
    key: "evidence_item_linked",
    blocker: "evidence_item_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.hasEvidenceItem,
  },
  {
    key: "reviewer_confidence_recorded",
    blocker: "reviewer_confidence_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) =>
      Number(input.reviewerConfidence ?? 0) > 0,
  },
  {
    key: "evidence_artifact_linked",
    blocker: "evidence_artifact_link_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.artifactLinked === true,
  },
  {
    key: "claim_scope_aligned",
    blocker: "evidence_scope_alignment_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.claimScopeAligned === true,
  },
  {
    key: "proof_uniqueness_checked",
    blocker: "proof_uniqueness_check_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) =>
      input.proofUniquenessChecked === true,
  },
  {
    key: "evidence_freshness_reviewed",
    blocker: "evidence_freshness_review_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.freshnessReviewed === true,
  },
  {
    key: "evidence_agent_links_recorded",
    blocker: "evidence_agent_links_required_before:completion_reviewed",
    isReady: (input: AgreementEvidenceReviewReadinessInput) => input.agentLinksRecorded === true,
  },
] as const;

export function mapAgreementReviewStatusToProtocolStatus(
  status: AgreementReviewCaseStatus,
): string {
  if (status === "challenge_window_open") {
    return "challenge_window";
  }

  if (status === "reviewed_complete") {
    return "completion_reviewed";
  }

  if (status === "disputed_unresolved" || status === "appealed") {
    return "disputed_unresolved";
  }

  if (status === "closed") {
    return "blocked";
  }

  return "needs_human_review";
}

export function mapAgreementCompletionStateToProtocolStatus(
  completionState: AgreementCompletionState,
) {
  if (completionState === "pending_evidence") {
    return "needs_evidence";
  }

  if (completionState === "challenge_window_open") {
    return "challenge_window";
  }

  if (completionState === "reviewed_complete") {
    return "completion_reviewed";
  }

  if (completionState === "disputed_unresolved") {
    return "disputed_unresolved";
  }

  return "needs_human_review";
}

export function buildAgreementProtocolProposalRecord(
  terms: AgreementProtocolTerms,
): Record<string, unknown> {
  return {
    format: terms.source,
    cause_areas: [terms.privacyScope, terms.disclosureScope]
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean),
    offered_action: terms.structuredTerms,
    requested_action: terms.counterfactualDeclaration || terms.notes,
    baseline_statement: terms.noTradeBaseline,
    duration: terms.durationTerms,
    exit_conditions: terms.exitConditions,
    verification_method: terms.evidenceRule,
    public_description: terms.disclosureScope || terms.privacyScope || terms.notes,
  };
}

export function validateAgreementEvidenceReviewReadiness(
  input: AgreementEvidenceReviewReadinessInput,
): AgreementEvidenceReviewReadiness {
  const blockers = AGREEMENT_EVIDENCE_REVIEW_CHECKS.filter((check) => !check.isReady(input)).map(
    (check) => check.blocker,
  );

  return {
    evidenceReviewed: blockers.length === 0,
    requiredChecks: AGREEMENT_EVIDENCE_REVIEW_CHECKS.map((check) => check.key),
    blockers,
  };
}

export function validateAgreementReviewProtocolTransition({
  currentCompletionState,
  currentReviewCaseStatus,
  nextReviewCaseStatus,
  terms,
  hasEvidenceItem,
  reviewerConfidence,
  evidenceReviewReadiness,
  disputeRecordCreated = false,
  humanReviewApproved = true,
  actorAgentId = "operator:protocol-validator",
  actorAgentKind = "operator",
  idempotencyKey,
  previousEventHash = null,
  provenanceActivityRecorded = true,
  recordedAt,
  subjectId = "review_decision:pending",
  subjectKind = "review_decision",
  transitionEventRecord,
  usedEntityIds,
  generatedEntityIds,
}: {
  currentCompletionState: AgreementCompletionState;
  currentReviewCaseStatus: AgreementReviewCaseStatus;
  nextReviewCaseStatus: AgreementReviewCaseStatus;
  terms: AgreementProtocolTerms;
  hasEvidenceItem: boolean;
  reviewerConfidence: number | null;
  evidenceReviewReadiness?: AgreementEvidenceReviewReadinessInput;
  disputeRecordCreated?: boolean;
  humanReviewApproved?: boolean;
  actorAgentId?: string;
  actorAgentKind?: string;
  idempotencyKey?: string;
  previousEventHash?: string | null;
  provenanceActivityRecorded?: boolean;
  recordedAt?: string;
  subjectId?: string;
  subjectKind?: string;
  transitionEventRecord?: MoralTradeStateTransitionEventRecord;
  usedEntityIds?: string[];
  generatedEntityIds?: string[];
}): MoralTradeProposalStateTransitionValidation {
  const from =
    currentReviewCaseStatus === "open" || currentReviewCaseStatus === "under_review"
      ? mapAgreementCompletionStateToProtocolStatus(currentCompletionState)
      : mapAgreementReviewStatusToProtocolStatus(currentReviewCaseStatus);
  const to = mapAgreementReviewStatusToProtocolStatus(nextReviewCaseStatus);
  const evidenceReviewed =
    to === "completion_reviewed" && hasEvidenceItem && Number(reviewerConfidence ?? 0) > 0;

  if (from === to) {
    return {
      status: "pass",
      from,
      to,
      allowed: true,
      missingRequiredFields: [],
      appliedRule: null,
      requiredChecks: ["no_state_change"],
      transitionEventRecord: null,
      blockers: [],
    };
  }

  const readiness =
    to === "completion_reviewed"
      ? validateAgreementEvidenceReviewReadiness(
          evidenceReviewReadiness ?? {
            hasEvidenceItem,
            reviewerConfidence,
          },
        )
      : null;
  const transitionRecordedAt = recordedAt ?? new Date().toISOString();

  const transition = validateMoralTradeProposalStateTransition({
    from,
    to,
    proposal: buildAgreementProtocolProposalRecord(terms),
    humanReviewApproved,
    evidenceReviewed: readiness ? readiness.evidenceReviewed : evidenceReviewed,
    disputeRecordCreated,
    provenanceActivityRecorded,
    policyConflictCodes: to === "blocked" ? ["human_review_block"] : [],
    transitionEventRecord:
      transitionEventRecord ??
      (provenanceActivityRecorded
        ? buildMoralTradeStateTransitionEventRecord({
            actorAgentId,
            actorAgentKind,
            from,
            idempotencyKey:
              idempotencyKey ??
              `agreement-review:${subjectId}:${from}:${to}:${transitionRecordedAt}`,
            previousEventHash,
            recordedAt: transitionRecordedAt,
            subjectId,
            subjectKind,
            to,
            usedEntityIds,
            generatedEntityIds,
          })
        : undefined),
  });

  if (!readiness || readiness.blockers.length === 0) {
    return transition;
  }

  return {
    ...transition,
    status: "fail",
    allowed: false,
    requiredChecks: [...new Set([...transition.requiredChecks, ...readiness.requiredChecks])],
    blockers: [...new Set([...transition.blockers, ...readiness.blockers])],
  };
}

function uniqueAgreementProtocolEntityIds(entityIds: string[]) {
  return entityIds.filter((entityId, index, entries) => entries.indexOf(entityId) === index);
}

export function buildAgreementReviewProvenanceAgentRow({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  ownerProfileId,
}: {
  actorAgentId: string;
  actorAgentKind: AgreementReviewProvenanceAgentKind;
  actorLabel: string;
  ownerProfileId: string;
}) {
  return {
    agent_key: `${actorAgentKind}:${actorAgentId}`,
    kind: actorAgentKind,
    label: actorLabel || "Agreement reviewer",
    metadata: {
      authUserId: actorAgentId,
      source: "agreement_review_protocol_transition",
    },
    owner_profile_id: ownerProfileId,
    redaction_level: "participant_private",
  } as const;
}

export function buildAgreementReviewProvenanceRows({
  actorProvenanceAgentId,
  agreementId,
  ownerProfileId,
  reviewCaseId,
  transitionEventRecord,
}: {
  actorProvenanceAgentId: string;
  agreementId: string;
  ownerProfileId: string;
  reviewCaseId: string;
  transitionEventRecord: MoralTradeStateTransitionEventRecord;
}) {
  const subjectKind = "agreement";
  const subjectId =
    transitionEventRecord.subjectKind === "agreement" ? transitionEventRecord.subjectId : agreementId;
  const usedEntityIds = uniqueAgreementProtocolEntityIds([
    agreementId,
    `review_case:${reviewCaseId}`,
    ...transitionEventRecord.usedEntityIds,
  ]);
  const generatedEntityIds = uniqueAgreementProtocolEntityIds([
    `review_decision:${reviewCaseId}`,
    ...transitionEventRecord.generatedEntityIds,
  ]);

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
      subject_id: subjectId,
      subject_kind: subjectKind,
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
      subject_id: subjectId,
      subject_kind: subjectKind,
      to_status: transitionEventRecord.to,
      used_entity_ids: usedEntityIds,
    },
  } as const;
}

export function buildAgreementReviewProvenanceConflictSelectors(
  rows: ReturnType<typeof buildAgreementReviewProvenanceRows>,
) {
  return {
    provenanceActivity: {
      hashColumn: "activity_hash",
      hashValue: rows.provenanceActivity.activity_hash,
      idempotency_key: rows.provenanceActivity.idempotency_key,
      owner_profile_id: rows.provenanceActivity.owner_profile_id,
      tableName: "moral_trade_provenance_activities",
    },
    stateTransitionEvent: {
      hashColumn: "event_hash",
      hashValue: rows.stateTransitionEvent.event_hash,
      idempotency_key: rows.stateTransitionEvent.idempotency_key,
      owner_profile_id: rows.stateTransitionEvent.owner_profile_id,
      tableName: "moral_trade_state_transition_events",
    },
  } as const;
}
