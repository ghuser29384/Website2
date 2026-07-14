import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradeDataModelProfile,
  validateMoralTradeDataModelProfile,
  type MoralTradeDataModelProfile,
} from "./data-model";

test("data model profile covers the audit-named core Moral Trade entities", () => {
  const profile = getMoralTradeDataModelProfile();
  const validation = validateMoralTradeDataModelProfile(profile);
  const entityKeys = profile.entities.map((entity) => entity.key);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(entityKeys.includes("participant"));
  assert.ok(entityKeys.includes("public_profile"));
  assert.ok(entityKeys.includes("private_wish_profile"));
  assert.ok(entityKeys.includes("offer"));
  assert.ok(entityKeys.includes("trade_format"));
  assert.ok(entityKeys.includes("baseline_statement"));
  assert.ok(entityKeys.includes("evidence_claim"));
  assert.ok(entityKeys.includes("evidence_artifact"));
  assert.ok(entityKeys.includes("external_entity_reference"));
  assert.ok(entityKeys.includes("traceability_event"));
  assert.ok(entityKeys.includes("provenance_activity"));
  assert.ok(entityKeys.includes("provenance_agent"));
  assert.ok(entityKeys.includes("state_transition_event_record"));
  assert.ok(entityKeys.includes("review_decision"));
  assert.equal(entityKeys.includes("reviewer_decision"), false);
  assert.ok(entityKeys.includes("challenge"));
  assert.ok(entityKeys.includes("appeal"));
  assert.ok(entityKeys.includes("privacy_grant"));
  assert.ok(entityKeys.includes("match_suggestion"));
  assert.ok(entityKeys.includes("notification"));
  assert.ok(entityKeys.includes("payment_record"));
  assert.ok(entityKeys.includes("agreement_event"));
  assert.ok(entityKeys.includes("source_note"));
  assert.ok(entityKeys.includes("background_wish_interview_session"));
  assert.ok(entityKeys.includes("background_wish_interview_answer"));
  assert.ok(entityKeys.includes("background_source_summary"));
  assert.ok(entityKeys.includes("background_profile_signal"));
  assert.ok(entityKeys.includes("background_opportunity_brief"));
  assert.ok(entityKeys.includes("background_match_feedback"));
  assert.ok(entityKeys.includes("background_intro_packet"));
  assert.ok(entityKeys.includes("match_concierge_request"));
  assert.ok(entityKeys.includes("saved_search"));
  assert.ok(entityKeys.includes("profile_visibility_control"));
  assert.ok(entityKeys.includes("dispute"));
  assert.ok(entityKeys.includes("payment_update"));
});

test("data model profile publishes offer fields and privacy boundaries from the report", () => {
  const profile = getMoralTradeDataModelProfile();
  const offer = profile.entities.find((entity) => entity.key === "offer");
  const sourceBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "source_note_boundary",
  );
  const matchBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "match_disclosure_boundary",
  );
  const reviewDecision = profile.entities.find((entity) => entity.key === "review_decision");
  const matchSuggestion = profile.entities.find((entity) => entity.key === "match_suggestion");
  const traceabilityEvent = profile.entities.find((entity) => entity.key === "traceability_event");
  const stateTransitionEvent = profile.entities.find(
    (entity) => entity.key === "state_transition_event_record",
  );
  const wishInterviewSession = profile.entities.find(
    (entity) => entity.key === "background_wish_interview_session",
  );
  const sourceSummary = profile.entities.find(
    (entity) => entity.key === "background_source_summary",
  );
  const profileSignal = profile.entities.find(
    (entity) => entity.key === "background_profile_signal",
  );
  const opportunityBrief = profile.entities.find(
    (entity) => entity.key === "background_opportunity_brief",
  );
  const introPacket = profile.entities.find((entity) => entity.key === "background_intro_packet");
  const conciergeRequest = profile.entities.find(
    (entity) => entity.key === "match_concierge_request",
  );

  assert.ok(offer);
  assert.ok(reviewDecision);
  assert.ok(matchSuggestion);
  assert.ok(traceabilityEvent);
  assert.ok(stateTransitionEvent);
  assert.ok(wishInterviewSession);
  assert.ok(sourceSummary);
  assert.ok(profileSignal);
  assert.ok(opportunityBrief);
  assert.ok(introPacket);
  assert.ok(conciergeRequest);
  assert.ok(offer.requiredFields.includes("cause_areas"));
  assert.ok(offer.requiredFields.includes("offered_action"));
  assert.ok(offer.requiredFields.includes("requested_action"));
  assert.ok(offer.requiredFields.includes("expected_impact"));
  assert.ok(offer.requiredFields.includes("verification_method"));
  assert.ok(offer.requiredFields.includes("duration"));
  assert.ok(offer.requiredFields.includes("exit_conditions"));
  assert.ok(offer.requiredFields.includes("baseline_statement"));
  assert.ok(offer.relationships.includes("review_decision"));
  assert.ok(reviewDecision.requiredFields.includes("outcome"));
  assert.ok(reviewDecision.requiredFields.includes("reason_codes"));
  assert.ok(reviewDecision.requiredFields.includes("reviewer_id"));
  assert.ok(matchSuggestion.requiredFields.includes("disclosure_stage"));
  assert.ok(matchSuggestion.requiredFields.includes("privacy_policy_id"));
  assert.ok(matchSuggestion.requiredFields.includes("human_review_required"));
  assert.match(matchSuggestion.publicExposure, /privacy policy ids/);
  assert.ok(wishInterviewSession.requiredFields.includes("ai_shadow_mode_allowed"));
  assert.ok(sourceSummary.requiredFields.includes("raw_ingestion_allowed"));
  assert.ok(sourceSummary.requiredFields.includes("retention_expires_at"));
  assert.ok(profileSignal.requiredFields.includes("allowed_field_key"));
  assert.ok(opportunityBrief.requiredFields.includes("human_review_required"));
  assert.ok(introPacket.requiredFields.includes("requested_field_keys"));
  assert.ok(conciergeRequest.requiredFields.includes("sla_due_at"));
  assert.match(sourceSummary.publicExposure, /raw ingestion disabled/);
  assert.match(opportunityBrief.publicExposure, /exact wishes/);
  assert.match(introPacket.publicExposure, /never sends autonomous outreach/);
  assert.ok(traceabilityEvent.requiredFields.includes("where_recorded"));
  assert.ok(traceabilityEvent.requiredFields.includes("why"));
  assert.ok(traceabilityEvent.requiredFields.includes("audit_question_answers"));
  assert.ok(traceabilityEvent.relationships.includes("external_entity_reference"));
  assert.ok(stateTransitionEvent.requiredFields.includes("event_hash"));
  assert.ok(stateTransitionEvent.requiredFields.includes("audit_question_answers"));
  assert.ok(stateTransitionEvent.relationships.includes("provenance_activity"));
  assert.match(sourceBoundary?.rule ?? "", /manual summaries/);
  assert.match(sourceBoundary?.rule ?? "", /raw private feeds/);
  assert.match(matchBoundary?.rule ?? "", /exact wishes/);
  assert.match(matchBoundary?.rule ?? "", /staged disclosure grants/);
});

test("data model validation fails when entity coverage or source-note privacy weakens", () => {
  const profile = getMoralTradeDataModelProfile();
  const weakened: MoralTradeDataModelProfile = {
    ...profile,
    entities: profile.entities
      .filter((entity) => entity.key !== "source_note" && entity.key !== "review_decision")
      .map((entity) =>
        entity.key === "private_wish_profile"
          ? {
              ...entity,
              privacyClass: "public_preview",
              publicExposure: "Publish all exact wishes and source notes.",
            }
          : entity,
      ),
    relationshipBoundaries: profile.relationshipBoundaries.map((boundary) =>
      boundary.key === "source_note_boundary"
        ? { ...boundary, rule: "Import raw private feeds and expose source notes." }
        : boundary,
    ),
    nonClaims: profile.nonClaims.filter((nonClaim) => !/raw private feeds/i.test(nonClaim)),
    contractTests: profile.contractTests.filter(
      (hook) => hook !== "source_note_privacy_boundary",
    ),
  };
  const validation = validateMoralTradeDataModelProfile(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("entity-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("private-entity-boundaries")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("relationship-boundaries")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("non-claims")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});

test("data model validation rejects the legacy reviewer_decision alias", () => {
  const profile = getMoralTradeDataModelProfile();
  const reviewDecision = profile.entities.find((entity) => entity.key === "review_decision");
  assert.ok(reviewDecision);

  const aliased: MoralTradeDataModelProfile = {
    ...profile,
    entities: profile.entities.map((entity) =>
      entity.key === "review_decision" ? { ...entity, key: "reviewer_decision" } : entity,
    ),
  };
  const validation = validateMoralTradeDataModelProfile(aliased);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("entity-coverage")));
  assert.match(
    validation.checks.find((check) => check.id === "entity-coverage")?.evidence ?? "",
    /deprecated: reviewer_decision/,
  );
});
