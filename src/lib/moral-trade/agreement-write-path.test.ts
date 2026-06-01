import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgreementReviewDecisionConflictSelector,
  buildAgreementReviewDecisionRow,
  buildAgreementReviewProvenanceAgentRow,
  buildAgreementReviewProvenanceConflictSelectors,
  buildAgreementReviewProvenanceRows,
  buildAgreementProtocolProposalRecord,
  mapAgreementReviewStatusToProtocolStatus,
  validateAgreementEvidenceReviewReadiness,
  validateAgreementReviewProtocolTransition,
} from "./agreement-write-path";

const completeTerms = {
  source: "offer",
  notes: "A reviewed agreement room for a pledge swap.",
  structuredTerms:
    "The proposer will keep a public monthly pledge while the counterparty makes a bounded donation.",
  noTradeBaseline:
    "Without this trade the proposer would not make the public pledge and the counterparty would keep the original giving plan.",
  counterfactualDeclaration:
    "The requested action is contingent on the logged pledge and remains participant-relative.",
  durationTerms: "90 days",
  exitConditions: "If evidence is missing by the review date, the room remains unresolved.",
  evidenceRule: "Public pledge log, donation receipt, and reviewer attestation.",
  privacyScope: "broad public summary",
  disclosureScope: "mutual consent detail release",
};

const completeEvidenceReviewReadiness = {
  hasEvidenceItem: true,
  reviewerConfidence: 80,
  artifactLinked: true,
  claimScopeAligned: true,
  proofUniquenessChecked: true,
  freshnessReviewed: true,
  agentLinksRecorded: true,
};

test("agreement review mapping uses protocol states for completion and disputes", () => {
  assert.equal(mapAgreementReviewStatusToProtocolStatus("under_review"), "needs_human_review");
  assert.equal(mapAgreementReviewStatusToProtocolStatus("challenge_window_open"), "challenge_window");
  assert.equal(mapAgreementReviewStatusToProtocolStatus("reviewed_complete"), "completion_reviewed");
  assert.equal(mapAgreementReviewStatusToProtocolStatus("appealed"), "disputed_unresolved");
  assert.equal(mapAgreementReviewStatusToProtocolStatus("closed"), "blocked");
  assert.equal(buildAgreementProtocolProposalRecord(completeTerms).baseline_statement, completeTerms.noTradeBaseline);
});

test("agreement review cannot jump directly from under review to reviewed complete", () => {
  const validation = validateAgreementReviewProtocolTransition({
    currentCompletionState: "under_review",
    currentReviewCaseStatus: "under_review",
    nextReviewCaseStatus: "reviewed_complete",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 80,
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("invalid_transition:needs_human_review->completion_reviewed"));
});

test("agreement review completion requires challenge window, evidence review, and confidence", () => {
  const missingEvidenceReview = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "reviewed_complete",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 0,
  });

  assert.equal(missingEvidenceReview.status, "fail");
  assert.ok(
    missingEvidenceReview.blockers.includes(
      "evidence_review_required_before:completion_reviewed",
    ),
  );

  const validCompletion = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "reviewed_complete",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 80,
    evidenceReviewReadiness: completeEvidenceReviewReadiness,
  });

  assert.equal(validCompletion.status, "pass");
  assert.equal(validCompletion.transitionEventRecord?.subjectKind, "review_decision");
  assert.equal(validCompletion.transitionEventRecord?.provenanceActivity, "challenge_window_opened");
  assert.equal(validCompletion.transitionEventRecord?.eventHash.length, 64);
});

test("agreement review protocol transition requires a structured event record", () => {
  const validation = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "reviewed_complete",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 80,
    evidenceReviewReadiness: completeEvidenceReviewReadiness,
    provenanceActivityRecorded: false,
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("transition_event_record_required"));
  assert.equal(validation.transitionEventRecord, null);
});

test("agreement review completion requires scoped evidence readiness checks", () => {
  const readiness = validateAgreementEvidenceReviewReadiness({
    ...completeEvidenceReviewReadiness,
    claimScopeAligned: false,
    proofUniquenessChecked: false,
  });
  const validation = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "reviewed_complete",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 80,
    evidenceReviewReadiness: {
      ...completeEvidenceReviewReadiness,
      claimScopeAligned: false,
      proofUniquenessChecked: false,
    },
  });

  assert.equal(readiness.evidenceReviewed, false);
  assert.ok(
    readiness.blockers.includes("evidence_scope_alignment_required_before:completion_reviewed"),
  );
  assert.ok(
    readiness.blockers.includes("proof_uniqueness_check_required_before:completion_reviewed"),
  );
  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.includes("evidence_scope_alignment_required_before:completion_reviewed"),
  );
  assert.ok(
    validation.blockers.includes("proof_uniqueness_check_required_before:completion_reviewed"),
  );
  assert.ok(validation.requiredChecks.includes("claim_scope_aligned"));
  assert.ok(validation.requiredChecks.includes("proof_uniqueness_checked"));
});

test("agreement review disputes require a dispute record", () => {
  const missingDisputeRecord = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "disputed_unresolved",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 70,
  });

  assert.equal(missingDisputeRecord.status, "fail");
  assert.ok(
    missingDisputeRecord.blockers.includes(
      "dispute_record_required_before:disputed_unresolved",
    ),
  );

  const validDispute = validateAgreementReviewProtocolTransition({
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    nextReviewCaseStatus: "disputed_unresolved",
    terms: completeTerms,
    hasEvidenceItem: true,
    reviewerConfidence: 70,
    disputeRecordCreated: true,
  });

  assert.equal(validDispute.status, "pass");
});

test("agreement review transitions map to append-only provenance rows", () => {
  const validation = validateAgreementReviewProtocolTransition({
    actorAgentId: "11111111-1111-4111-8111-111111111111",
    actorAgentKind: "operator",
    currentCompletionState: "challenge_window_open",
    currentReviewCaseStatus: "challenge_window_open",
    evidenceReviewReadiness: completeEvidenceReviewReadiness,
    generatedEntityIds: ["review_decision:review-case-123"],
    hasEvidenceItem: true,
    idempotencyKey: "agreement-review:agreement-123:owner-1:challenge_window_open:reviewed_complete",
    nextReviewCaseStatus: "reviewed_complete",
    recordedAt: "2026-05-29T14:00:00.000Z",
    reviewerConfidence: 80,
    subjectId: "agreement-123",
    subjectKind: "agreement",
    terms: completeTerms,
    usedEntityIds: ["agreement-123", "review_case:review-case-123"],
  });
  const agentRow = buildAgreementReviewProvenanceAgentRow({
    actorAgentId: "00000000-0000-4000-8000-000000000123",
    actorAgentKind: "operator",
    actorLabel: "Protocol reviewer",
    ownerProfileId: "00000000-0000-4000-8000-000000000456",
  });
  const rows = buildAgreementReviewProvenanceRows({
    actorProvenanceAgentId: "11111111-1111-4111-8111-111111111111",
    agreementId: "agreement-123",
    ownerProfileId: "00000000-0000-4000-8000-000000000456",
    reviewCaseId: "review-case-123",
    transitionEventRecord: validation.transitionEventRecord!,
  });
  const reviewDecision = buildAgreementReviewDecisionRow({
    agreementId: "agreement-123",
    evidenceReviewReadiness: completeEvidenceReviewReadiness,
    nextReviewCaseStatus: "reviewed_complete",
    ownerProfileId: "00000000-0000-4000-8000-000000000456",
    publicReasoningSummary: "The evidence supports reviewed completion.",
    reviewCaseId: "review-case-123",
    reviewerAgentId: "11111111-1111-4111-8111-111111111111",
    reviewerNotes: "",
    reviewScope: "Pledge and donation evidence",
    transitionEventRecord: validation.transitionEventRecord!,
  });
  const selectors = buildAgreementReviewProvenanceConflictSelectors(rows);
  const reviewDecisionSelector = buildAgreementReviewDecisionConflictSelector(reviewDecision);

  assert.equal(validation.status, "pass");
  assert.equal(validation.transitionEventRecord?.subjectKind, "agreement");
  assert.equal(agentRow.agent_key, "operator:00000000-0000-4000-8000-000000000123");
  assert.equal(agentRow.kind, "operator");
  assert.equal(rows.provenanceActivity.subject_kind, "agreement");
  assert.equal(rows.provenanceActivity.kind, "challenge_window_opened");
  assert.equal(rows.provenanceActivity.activity_hash, validation.transitionEventRecord?.eventHash);
  assert.deepEqual(rows.provenanceActivity.agent_ids, [
    "11111111-1111-4111-8111-111111111111",
  ]);
  assert.equal(rows.stateTransitionEvent.subject_kind, "agreement");
  assert.equal(rows.stateTransitionEvent.subject_id, "agreement-123");
  assert.equal(rows.stateTransitionEvent.to_status, "completion_reviewed");
  assert.equal(
    rows.stateTransitionEvent.audit_question_answers.whatHappened,
    "agreement:agreement-123 moved challenge_window->completion_reviewed via challenge_window_opened.",
  );
  assert.deepEqual(rows.stateTransitionEvent.audit_question_answers.whoTouchedIt, [
    "11111111-1111-4111-8111-111111111111",
  ]);
  assert.equal(
    rows.stateTransitionEvent.audit_question_answers.whenRecorded,
    "2026-05-29T14:00:00.000Z",
  );
  assert.equal(rows.stateTransitionEvent.event_hash.length, 64);
  assert.equal(reviewDecision.subject_kind, "agreement");
  assert.equal(reviewDecision.subject_id, "agreement-123");
  assert.equal(reviewDecision.outcome, "pass");
  assert.equal(reviewDecision.reason_codes.includes("review_status_reviewed_complete"), true);
  assert.equal(reviewDecision.decision_hash.length, 64);
  assert.equal(reviewDecision.idempotency_key, "agreement-review-decision:review-case-123:00000000-0000-4000-8000-000000000456:challenge_window:completion_reviewed");
  assert.equal(reviewDecisionSelector.tableName, "moral_trade_review_decisions");
  assert.equal(reviewDecisionSelector.hashColumn, "decision_hash");
  assert.equal(reviewDecisionSelector.hashValue, reviewDecision.decision_hash);
  assert.equal(selectors.provenanceActivity.tableName, "moral_trade_provenance_activities");
  assert.equal(selectors.provenanceActivity.hashColumn, "activity_hash");
  assert.equal(selectors.provenanceActivity.hashValue, rows.provenanceActivity.activity_hash);
  assert.equal(selectors.stateTransitionEvent.tableName, "moral_trade_state_transition_events");
  assert.equal(selectors.stateTransitionEvent.hashColumn, "event_hash");
  assert.equal(selectors.stateTransitionEvent.hashValue, rows.stateTransitionEvent.event_hash);
});
