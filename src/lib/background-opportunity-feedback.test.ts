import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(
    normalizeBackgroundOpportunityFeedbackReason("already_connected"),
    "already_connected",
  );
  assert.equal(
    normalizeBackgroundOpportunityFeedbackReason("privacy_concern"),
    "privacy_concern",
  );
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
  assert.equal(
    isBackgroundOpportunityFeedbackPairAllowed({
      outcome: "dismissed",
      reasonCode: "privacy_concern",
    }),
    true,
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

test("opportunity feedback routes use policy decisions and reject stale briefs", () => {
  const briefRoute = readFileSync(
    "src/app/api/background/opportunity-briefs/[id]/feedback/route.ts",
    "utf8",
  );
  const compatibilityRoute = readFileSync(
    "src/app/api/background/opportunity-feedback/route.ts",
    "utf8",
  );

  for (const route of [briefRoute, compatibilityRoute]) {
    assert.match(route, /background\.opportunity_feedback\.record/);
    assert.match(route, /evaluateBackgroundPolicyDecision/);
    assert.match(route, /policyDecisionId/);
    assert.match(route, /This opportunity brief is stale or no longer actionable/);
    assert.match(route, /review_status === "blocked"/);
    assert.match(route, /delivery_state === "expired"/);
  }
});
