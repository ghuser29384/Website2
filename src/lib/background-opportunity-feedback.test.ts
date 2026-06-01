import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackgroundOpportunityFeedbackRow,
  getOpportunityBriefStatusForFeedback,
  isBackgroundOpportunityFeedbackPairAllowed,
  normalizeBackgroundOpportunityFeedbackOutcome,
  normalizeBackgroundOpportunityFeedbackReason,
} from "@/lib/background-opportunity-feedback";

test("opportunity feedback normalizes to a closed reason and outcome lattice", () => {
  assert.equal(normalizeBackgroundOpportunityFeedbackReason("bad_timing"), "bad_timing");
  assert.equal(normalizeBackgroundOpportunityFeedbackReason("maybe_later"), "maybe_later");
  assert.equal(normalizeBackgroundOpportunityFeedbackReason("raw private reason"), null);
  assert.equal(normalizeBackgroundOpportunityFeedbackOutcome("interested"), "interested");
  assert.equal(normalizeBackgroundOpportunityFeedbackOutcome("maybe_later"), "maybe_later");
  assert.equal(normalizeBackgroundOpportunityFeedbackOutcome("opened"), null);
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "interested",
      reasonCode: "interested",
    }),
    true,
  );
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "interested",
      reasonCode: "bad_timing",
    }),
    false,
  );
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "dismissed",
      reasonCode: "interested",
    }),
    false,
  );
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "maybe_later",
      reasonCode: "maybe_later",
    }),
    true,
  );
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "dismissed",
      reasonCode: "maybe_later",
    }),
    false,
  );
});

test("opportunity feedback maps to safe brief states", () => {
  assert.equal(getOpportunityBriefStatusForFeedback("interested"), "interested");
  assert.equal(getOpportunityBriefStatusForFeedback("maybe_later"), "maybe_later");
  assert.equal(getOpportunityBriefStatusForFeedback("dismissed"), "dismissed");
});

test("opportunity feedback rows avoid raw free-text detail", () => {
  const row = buildBackgroundOpportunityFeedbackRow({
    matchId: "match-1",
    opportunityBriefId: "brief-1",
    outcome: "dismissed",
    profileId: "profile-1",
    reasonCode: "too_vague",
  });

  assert.deepEqual(row, {
    match_id: "match-1",
    opportunity_brief_id: "brief-1",
    outcome: "dismissed",
    profile_id: "profile-1",
    reason_code: "too_vague",
  });
});
