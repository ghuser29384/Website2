import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMoralTradeStateTransitionEventRecord,
  getMissingMoralTradeRequiredProposalFields,
  getMoralTradeProtocolProfile,
  validateMoralTradeStateTransitionEventRecord,
  validateMoralTradeProposalStateTransition,
  validateMoralTradeProtocolProfile,
} from "./protocol";

test("core moral trade protocol profile publishes validator-backed contracts", () => {
  const profile = getMoralTradeProtocolProfile();
  const validation = validateMoralTradeProtocolProfile();

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(profile.requiredProposalFields.some((field) => field.key === "baseline_statement"));
  assert.ok(profile.guardrails.some((guardrail) => guardrail.code === "anti_threat_baseline"));
  assert.ok(profile.factorCodes.some((factor) => factor.code === "privacy_safe_preview"));
  assert.ok(profile.factorCodes.some((factor) => factor.code === "baseline_credibility"));
  assert.ok(
    profile.factorCodes.some((factor) => factor.code === "baseline_challenge_recommended"),
  );
  assert.ok(profile.factorCodes.some((factor) => factor.code === "cause_area_overlap"));
  assert.ok(profile.factorCodes.some((factor) => factor.code === "cause_area_complementarity"));
  assert.ok(profile.factorCodes.some((factor) => factor.code === "party_relative_benefit"));
  assert.ok(profile.factorCodes.some((factor) => factor.code === "trade_mode_compatible"));
  assert.ok(profile.evidenceSchemas.some((schema) => schema.key === "donation_offset_v1"));
  assert.ok(profile.provenanceModel.entities.includes("evidence_artifact"));
  assert.ok(profile.provenanceModel.entities.includes("external_entity_reference"));
  assert.ok(profile.provenanceModel.entities.includes("match_signal"));
  assert.ok(profile.provenanceModel.entities.includes("traceability_event"));
  assert.ok(profile.provenanceModel.activities.includes("traceability_event_recorded"));
  assert.ok(profile.provenanceObjectSchemas.some((schema) => schema.key === "evidence_claim"));
  assert.ok(profile.provenanceObjectSchemas.some((schema) => schema.key === "external_entity_reference"));
  assert.ok(profile.provenanceObjectSchemas.some((schema) => schema.key === "match_signal"));
  assert.ok(profile.provenanceObjectSchemas.some((schema) => schema.key === "traceability_event"));
  assert.ok(
    profile.provenanceObjectSchemas.some(
      (schema) => schema.key === "state_transition_event_record",
    ),
  );
  assert.ok(profile.qualityMetrics.includes("privacy_leakage_incidents"));
  assert.ok(profile.statusValues.includes("completion_reviewed"));
  assert.ok(profile.statusValues.includes("disputed_unresolved"));
  assert.ok(profile.stateTransitionRules.some((rule) => rule.from === "draft"));
  assert.ok(
    profile.stateTransitionRules
      .filter((rule) => rule.allowedTo.includes("matchable"))
      .every(
        (rule) =>
          rule.requires.includes("policy_screen_before_matchable") &&
          rule.requires.includes("baseline_credibility_before_matchable") &&
          rule.requires.includes("evidence_sufficiency_before_matchable") &&
          rule.requires.includes("externality_trigger_before_matchable") &&
          rule.requires.includes("privacy_redaction_before_matchable") &&
          rule.requires.includes("match_explanation_before_matchable") &&
          rule.requires.includes("human_review_before_matchable"),
      ),
  );
});

const completeProposal = {
  format: "pledge_swap",
  cause_areas: ["Animal welfare", "Global poverty"],
  offered_action: "Keep a public monthly pledge to reduce factory-farmed animal consumption.",
  requested_action: "Make a bounded donation to a global health fund after the pledge is logged.",
  baseline_statement:
    "Without this trade I would keep my current donation plan and would not make the public pledge.",
  duration: "90 days",
  exit_conditions: "If evidence is missing after 90 days, the proposal remains unresolved.",
  verification_method: "Public pledge log and reviewer attestation",
  public_description: "A voluntary pledge swap with explicit exit conditions and no custody claim.",
};

function transitionEvent(from: string, to: string) {
  return buildMoralTradeStateTransitionEventRecord({
    actorAgentId: "operator:protocol-test",
    actorAgentKind: "operator",
    from,
    idempotencyKey: `protocol-test:${from}:${to}`,
    recordedAt: "2026-05-29T00:00:00.000Z",
    subjectId: "proposal_record:protocol-test",
    to,
  });
}

test("proposal state transitions reject illegal jumps and incomplete reliance states", () => {
  const validation = validateMoralTradeProposalStateTransition({
    from: "draft",
    to: "completion_reviewed",
    proposal: completeProposal,
    humanReviewApproved: true,
    evidenceReviewed: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("draft", "completion_reviewed"),
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("invalid_transition:draft->completion_reviewed"));

  const missingFields = getMissingMoralTradeRequiredProposalFields({
    ...completeProposal,
    baseline_statement: "",
  });

  assert.deepEqual(missingFields, ["baseline_statement"]);

  const incompleteTransition = validateMoralTradeProposalStateTransition({
    from: "draft",
    to: "submitted",
    proposal: {
      ...completeProposal,
      baseline_statement: "",
    },
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("draft", "submitted"),
  });

  assert.equal(incompleteTransition.status, "fail");
  assert.ok(incompleteTransition.blockers.some((blocker) => blocker.includes("missing_required_fields")));
});

test("proposal state transitions require human review, evidence review, and event provenance", () => {
  const validSubmission = validateMoralTradeProposalStateTransition({
    from: "draft",
    to: "submitted",
    proposal: completeProposal,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("draft", "submitted"),
  });

  assert.equal(validSubmission.status, "pass");
  assert.equal(validSubmission.missingRequiredFields.length, 0);

  const missingHumanReview = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("submitted", "matchable"),
  });

  assert.equal(missingHumanReview.status, "fail");
  assert.ok(missingHumanReview.blockers.includes("human_review_required_before:matchable"));

  const missingMatchableEvidence = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    humanReviewApproved: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("submitted", "matchable"),
  });

  assert.equal(missingMatchableEvidence.status, "fail");
  assert.ok(
    missingMatchableEvidence.blockers.includes("evidence_review_required_before:matchable"),
  );

  const incompleteMatchableVerificationLoop = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    humanReviewApproved: true,
    evidenceReviewed: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("submitted", "matchable"),
  });

  assert.equal(incompleteMatchableVerificationLoop.status, "fail");
  assert.ok(
    incompleteMatchableVerificationLoop.blockers.includes(
      "policy_screen_required_before:matchable",
    ),
  );
  assert.ok(
    incompleteMatchableVerificationLoop.blockers.includes(
      "baseline_credibility_required_before:matchable",
    ),
  );
  assert.ok(
    incompleteMatchableVerificationLoop.blockers.includes(
      "externality_trigger_required_before:matchable",
    ),
  );
  assert.ok(
    incompleteMatchableVerificationLoop.blockers.includes(
      "privacy_redaction_required_before:matchable",
    ),
  );
  assert.ok(
    incompleteMatchableVerificationLoop.blockers.includes(
      "match_explanation_required_before:matchable",
    ),
  );

  const policyConflictMatchable = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    baselineCredibilityReviewed: true,
    evidenceReviewed: true,
    externalityTriggerReviewed: true,
    humanReviewApproved: true,
    matchExplanationGenerated: true,
    policyConflictCodes: ["anti_threat_baseline"],
    policyScreenReviewed: true,
    privacyRedactionReviewed: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("submitted", "matchable"),
  });

  assert.equal(policyConflictMatchable.status, "fail");
  assert.ok(
    policyConflictMatchable.blockers.includes(
      "policy_conflicts_block_matchable:anti_threat_baseline",
    ),
  );

  const validMatchable = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    baselineCredibilityReviewed: true,
    humanReviewApproved: true,
    evidenceReviewed: true,
    externalityTriggerReviewed: true,
    matchExplanationGenerated: true,
    policyScreenReviewed: true,
    privacyRedactionReviewed: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("submitted", "matchable"),
  });

  assert.equal(validMatchable.status, "pass");

  const missingEvidence = validateMoralTradeProposalStateTransition({
    from: "challenge_window",
    to: "completion_reviewed",
    proposal: completeProposal,
    humanReviewApproved: true,
    provenanceActivityRecorded: true,
    transitionEventRecord: transitionEvent("challenge_window", "completion_reviewed"),
  });

  assert.equal(missingEvidence.status, "fail");
  assert.ok(missingEvidence.blockers.includes("evidence_review_required_before:completion_reviewed"));

  const missingEvent = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "needs_evidence",
    proposal: completeProposal,
  });

  assert.equal(missingEvent.status, "fail");
  assert.ok(missingEvent.blockers.includes("transition_event_record_required"));
});

test("state transition event records are immutable and bound to the expected edge", () => {
  const event = transitionEvent("submitted", "matchable");

  assert.equal(
    validateMoralTradeStateTransitionEventRecord({
      expectedFrom: "submitted",
      expectedTo: "matchable",
      expectedProvenanceActivity: "risk_screened",
      record: event,
    }).length,
    0,
  );
  assert.equal(event.eventHash.length, 64);
  assert.match(event.id, /^moral-trade-transition-event:/);

  const mismatchedEdge = validateMoralTradeProposalStateTransition({
    from: "submitted",
    to: "matchable",
    proposal: completeProposal,
    baselineCredibilityReviewed: true,
    evidenceReviewed: true,
    externalityTriggerReviewed: true,
    humanReviewApproved: true,
    matchExplanationGenerated: true,
    policyScreenReviewed: true,
    privacyRedactionReviewed: true,
    transitionEventRecord: transitionEvent("submitted", "needs_evidence"),
  });

  assert.equal(mismatchedEdge.status, "fail");
  assert.ok(
    mismatchedEdge.blockers.includes("transition_event_record_to_mismatch:needs_evidence"),
  );

  const tamperedEvent = {
    ...event,
    eventHash: "a".repeat(64),
  };
  const tamperedValidation = validateMoralTradeStateTransitionEventRecord({
    expectedFrom: "submitted",
    expectedTo: "matchable",
    expectedProvenanceActivity: "risk_screened",
    record: tamperedEvent,
  });

  assert.ok(tamperedValidation.includes("transition_event_record_hash_mismatch"));
});
