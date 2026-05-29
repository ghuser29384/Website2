import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMoralTradeProtocolDraft } from "@/lib/proposal-review";

import {
  buildMoralTradeOfferCreateProvenanceAgentRow,
  buildMoralTradeOfferCreateProvenanceRows,
  buildMoralTradeOfferProtocolNotes,
  buildMoralTradeProtocolProposalRecord,
  getMoralTradeOfferPersistenceStatus,
  validateMoralTradeOfferCreateTransition,
} from "./offer-write-path";

const completeDraft = {
  format: "pledge",
  offeredCause: "Animal welfare",
  requestedCause: "Global poverty",
  offeredAction: "Keep a public monthly pledge to reduce factory-farmed animal consumption.",
  requestedAction: "Make a bounded donation to a global health fund after the pledge is logged.",
  baselineStatement:
    "Without this trade I would keep my current donation plan and would not make the public pledge.",
  duration: "90 days",
  exitConditions: "If evidence is missing after 90 days, the proposal remains unresolved.",
  verificationMethod: "Third-party audit",
  publicDescription:
    "A voluntary pledge swap where each side is better off than the no-trade baseline, with explicit exit conditions and no custody claim.",
  evidenceUrl: "https://example.com/audit",
  participantImportance: 7,
  counterpartyThreshold: 6,
};

test("offer create write path validates draft-to-submitted protocol transition", () => {
  const protocolReview = evaluateMoralTradeProtocolDraft(completeDraft);
  const transition = validateMoralTradeOfferCreateTransition({
    draft: completeDraft,
    protocolReview,
  });

  assert.equal(transition.status, "pass");
  assert.equal(transition.from, "draft");
  assert.equal(transition.to, "submitted");
  assert.equal(transition.transitionEventRecord?.provenanceActivity, "draft_created");
  assert.equal(transition.transitionEventRecord?.eventHash.length, 64);
  assert.equal(getMoralTradeOfferPersistenceStatus({ protocolReviewStatus: protocolReview.status }), "open");
  assert.deepEqual(buildMoralTradeProtocolProposalRecord(completeDraft).cause_areas, [
    "Animal welfare",
    "Global poverty",
  ]);
});

test("offer create write path blocks missing required fields before write", () => {
  const incompleteDraft = {
    ...completeDraft,
    baselineStatement: "",
  };
  const protocolReview = evaluateMoralTradeProtocolDraft(incompleteDraft);
  const transition = validateMoralTradeOfferCreateTransition({
    draft: incompleteDraft,
    protocolReview,
  });

  assert.equal(transition.status, "fail");
  assert.ok(transition.blockers.some((blocker) => blocker.includes("missing_required_fields")));
  assert.equal(
    getMoralTradeOfferPersistenceStatus({ protocolReviewStatus: protocolReview.status }),
    "paused",
  );
});

test("offer create write path requires an immutable transition event record", () => {
  const protocolReview = evaluateMoralTradeProtocolDraft(completeDraft);
  const transition = validateMoralTradeOfferCreateTransition({
    draft: completeDraft,
    protocolReview,
    provenanceActivityRecorded: false,
  });

  assert.equal(transition.status, "fail");
  assert.ok(transition.blockers.includes("transition_event_record_required"));
  assert.equal(transition.transitionEventRecord, null);
});

test("offer create write path pauses challenge-window drafts and records protocol notes", () => {
  const externalityDraft = {
    ...completeDraft,
    format: "offset",
    offeredCause: "Political reform",
    requestedCause: "Public health",
    offeredAction:
      "Redirect a planned advocacy contribution into a neutral public health charity.",
    requestedAction:
      "Redirect a matching public-policy contribution into the same neutral public health charity.",
  };
  const protocolReview = evaluateMoralTradeProtocolDraft(externalityDraft);
  const transition = validateMoralTradeOfferCreateTransition({
    draft: externalityDraft,
    protocolReview,
  });
  const notes = buildMoralTradeOfferProtocolNotes(protocolReview, transition);

  assert.equal(transition.status, "pass");
  assert.equal(protocolReview.status, "challenge_window");
  assert.equal(
    getMoralTradeOfferPersistenceStatus({ protocolReviewStatus: protocolReview.status }),
    "paused",
  );
  assert.match(notes, /Protocol review status: challenge_window/);
  assert.match(notes, /Protocol transition accepted: draft->submitted/);
  assert.match(notes, /Transition event record:/);
});

test("offer create write path maps accepted transitions to append-only provenance rows", () => {
  const protocolReview = evaluateMoralTradeProtocolDraft(completeDraft);
  const transition = validateMoralTradeOfferCreateTransition({
    actorAgentId: "00000000-0000-4000-8000-000000000123",
    actorAgentKind: "participant",
    draft: completeDraft,
    idempotencyKey: "offer-create:offer-123:draft-to-submitted",
    protocolReview,
    recordedAt: "2026-05-29T12:00:00.000Z",
    subjectId: "offer-123",
    subjectKind: "offer",
  });
  const agentRow = buildMoralTradeOfferCreateProvenanceAgentRow({
    actorAgentId: "00000000-0000-4000-8000-000000000123",
    actorLabel: "Pilot participant",
    ownerProfileId: "00000000-0000-4000-8000-000000000123",
  });
  const rows = buildMoralTradeOfferCreateProvenanceRows({
    actorProvenanceAgentId: "11111111-1111-4111-8111-111111111111",
    offerId: "offer-123",
    ownerProfileId: "00000000-0000-4000-8000-000000000123",
    transitionEventRecord: transition.transitionEventRecord!,
  });

  assert.equal(transition.status, "pass");
  assert.equal(transition.transitionEventRecord?.subjectKind, "offer");
  assert.equal(agentRow.agent_key, "participant:00000000-0000-4000-8000-000000000123");
  assert.equal(agentRow.kind, "participant");
  assert.equal(rows.provenanceActivity.subject_kind, "offer");
  assert.equal(rows.provenanceActivity.kind, "draft_created");
  assert.equal(rows.provenanceActivity.activity_hash, transition.transitionEventRecord?.eventHash);
  assert.deepEqual(rows.provenanceActivity.agent_ids, [
    "11111111-1111-4111-8111-111111111111",
  ]);
  assert.equal(rows.stateTransitionEvent.actor_agent_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(rows.stateTransitionEvent.from_status, "draft");
  assert.equal(rows.stateTransitionEvent.to_status, "submitted");
  assert.equal(rows.stateTransitionEvent.subject_id, "offer-123");
  assert.equal(rows.stateTransitionEvent.event_hash.length, 64);
});
