import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { validateGroupContributionTerms } from "./group-contribution";

test("persists the creator's same-period or same-time Co-Act choice", () => {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.counterpartyParticipation = "explicitly-excluded";
  draft.coActTiming = "same-time";
  draft.coordination = "discussion-thread";

  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-act");
  assert.equal(terms.timing, "same-time");
  assert.equal(terms.coordination, "discussion-thread");
  assert.equal(validateGroupContributionTerms(terms, "nonfinancial").ok, true);
});

test("persists a creator-selected Co-Fund deadline outcome and fallback", () => {
  const draft = defaultGroupContributionDraft(
    "fund:option-1",
    "financial",
    "Commission one fixed existential-risk research brief",
  );
  draft.mode = "co-fund";
  draft.creatorParticipation = "organizer-only";
  draft.targetMinor = 5_000;
  draft.maximumBudgetMinor = 500;
  draft.noPoolDefault = "Fund another approved project";
  draft.participationBeatsDefault = true;
  draft.coFundDeadlineOutcome = "one-extension";
  draft.coFundExtensionHours = 72;
  draft.coFundFailureFallback = "alternative-offer";

  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-fund");
  assert.equal(terms.failure.deadlineOutcome, "one-extension");
  assert.equal(terms.failure.extensionHours, 72);
  assert.equal(terms.failure.underThresholdFallback, "alternative-offer");
  assert.equal(validateGroupContributionTerms(terms, "financial").ok, true);
});
