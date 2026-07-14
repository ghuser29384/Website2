import assert from "node:assert/strict";
import test from "node:test";

import { buildBackgroundRefinementItems } from "@/lib/background-refinement";
import {
  buildBackgroundWishInterviewAnswerDraft,
  buildBackgroundWishInterviewSessionState,
  buildBackgroundWishInterviewSignalRows,
  getCurrentBackgroundWishInterviewQuestion,
  markBackgroundWishInterviewApplied,
  validateBackgroundWishInterviewApply,
} from "@/lib/background-wish-interview";

test("wish interview sessions expose schema-bound questions without raw transcript state", () => {
  const items = buildBackgroundRefinementItems({
    causeAreas: [],
    exclusions: [],
    offeredCapabilities: [],
    requestedCounterpartyKinds: [],
    verificationPreferences: [],
  });
  const state = buildBackgroundWishInterviewSessionState({
    items,
    privateProfileId: "profile-1",
    sessionId: "session-1",
  });
  const firstQuestion = getCurrentBackgroundWishInterviewQuestion(state);

  assert.equal(state.rawTranscriptStored, false);
  assert.equal(state.liveAiMutation, false);
  assert.equal(state.hiddenInferenceCreated, false);
  assert.equal(state.profileMutationApplied, false);
  assert.equal(state.publicPreviewMutationRequiresApproval, true);
  assert.equal(state.analytics.answerTextIncluded, false);
  assert.ok(firstQuestion);
  assert.equal(firstQuestion?.fieldKey, "cause_priorities");
  assert.ok(firstQuestion?.whyAsked.includes("deterministic matching"));
});

test("wish interview answer drafts keep raw answer text out of session metadata", () => {
  const [question] = buildBackgroundWishInterviewSessionState({
    items: buildBackgroundRefinementItems({
      causeAreas: [],
      exclusions: [],
      offeredCapabilities: ["Donation advice"],
      requestedCounterpartyKinds: ["Reviewed intro"],
      verificationPreferences: ["Receipts"],
    }),
    privateProfileId: "profile-1",
    sessionId: "session-2",
  }).questions;

  assert.ok(question);

  const draft = buildBackgroundWishInterviewAnswerDraft({
    answer: "Animal welfare, exact private contact details should stay encrypted",
    profileId: "profile-1",
    question,
  });

  assert.ok(draft);
  assert.equal(draft.answerState.answerTextStoredInSession, false);
  assert.deepEqual(draft.answerState.selectedOptions, ["Animal welfare"]);
  assert.equal(draft.row.status, "draft");
  assert.equal(draft.row.broad_preview_update, "Animal welfare");
});

test("wish interview apply rejects forbidden and unanswered delta keys", () => {
  const state = buildBackgroundWishInterviewSessionState({
    items: buildBackgroundRefinementItems({
      causeAreas: [],
      exclusions: [],
      offeredCapabilities: [],
      requestedCounterpartyKinds: [],
      verificationPreferences: [],
    }),
    privateProfileId: "profile-1",
    sessionId: "session-3",
  });

  const validation = validateBackgroundWishInterviewApply({
    approvedDeltaKeys: ["contact_details", "raw_source_notes", "cause_priorities"],
    state,
  });

  assert.deepEqual(validation.approvedDeltaKeys, []);
  assert.deepEqual(validation.rejectedDeltaKeys, ["contact_details", "raw_source_notes"]);
  assert.ok(validation.errors.some((error) => error.includes("Disallowed")));
  assert.ok(validation.errors.some((error) => error.includes("must first be answered")));
});

test("wish interview apply creates only safe profile signals from approved answers", () => {
  const sessionState = buildBackgroundWishInterviewSessionState({
    items: buildBackgroundRefinementItems({
      causeAreas: ["Animal welfare", "Global health"],
      exclusions: [],
      offeredCapabilities: ["Donation advice"],
      requestedCounterpartyKinds: [],
      verificationPreferences: ["Receipts"],
    }),
    privateProfileId: "profile-1",
    sessionId: "session-4",
  });
  const question = sessionState.questions.find((item) => item.fieldKey === "offer_ask_terms");

  assert.ok(question);

  const draft = buildBackgroundWishInterviewAnswerDraft({
    answer: "Only consider intros where my private identity is not revealed first.",
    profileId: "profile-1",
    question,
  });

  assert.ok(draft);

  const answeredState = {
    ...sessionState,
    answers: [draft.answerState],
    proposedDeltaKeys: [draft.answerState.fieldKey],
  };
  const validation = validateBackgroundWishInterviewApply({
    approvedDeltaKeys: ["offer_ask_terms"],
    state: answeredState,
  });
  const signalRows = buildBackgroundWishInterviewSignalRows({
    approvedDeltaKeys: validation.approvedDeltaKeys,
    expiresAt: "2026-09-01T00:00:00.000Z",
    profileId: "profile-1",
    state: answeredState,
  });
  const appliedState = markBackgroundWishInterviewApplied({
    approvedDeltaKeys: validation.approvedDeltaKeys,
    profileSignalsCreated: signalRows.length,
    state: answeredState,
  });

  assert.deepEqual(validation.errors, []);
  assert.equal(signalRows.length, 1);
  assert.equal(signalRows[0]?.source, "interview");
  assert.equal(signalRows[0]?.signal_value, "reviewed_offer_ask_terms_provided");
  assert.equal(JSON.stringify(signalRows).includes("private identity"), false);
  assert.equal(appliedState.profileMutationApplied, false);
  assert.equal(appliedState.sessionStatus, "applied");
  assert.equal(appliedState.signalRecomputeRecommended, true);
});
