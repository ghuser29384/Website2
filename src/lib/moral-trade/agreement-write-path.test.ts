import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgreementProtocolProposalRecord,
  mapAgreementReviewStatusToProtocolStatus,
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
  });

  assert.equal(validCompletion.status, "pass");
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
