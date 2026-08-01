import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { GROUP_CONTRIBUTION_FORM_FIELD } from "./group-contribution-form-data";
import {
  GROUP_CONTRIBUTION_REVIEW_RECORD_KEY,
  buildGroupContributionReviewRecordFragment,
  hasGroupContributionFormField,
} from "./group-contribution-review-record";

test("builds a private proposal-only review-record fragment", () => {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.counterpartyParticipation = "explicitly-excluded";
  const terms = buildGroupContributionTerms(draft);
  assert(terms);

  const formData = new FormData();
  formData.set(
    GROUP_CONTRIBUTION_FORM_FIELD,
    JSON.stringify({
      schemaVersion: 1,
      execution: "proposal-only",
      options: [{ optionKey: "behavior:option-1", terms }],
    }),
  );

  const result = buildGroupContributionReviewRecordFragment({
    formData,
    authoritativeOptions: [
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert(result.fragment);
  const fragment = result.fragment[GROUP_CONTRIBUTION_REVIEW_RECORD_KEY];
  assert.equal(fragment.visibility, "private-review");
  assert.equal(fragment.execution, "proposal-only");
  assert.equal(JSON.parse(fragment.canonicalJson).options.length, 1);
});

test("returns no fragment when no group modifier is selected", () => {
  const result = buildGroupContributionReviewRecordFragment({
    formData: new FormData(),
    authoritativeOptions: [],
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.fragment, null);
});

test("does not downgrade invalid terms into an empty fragment", () => {
  const formData = new FormData();
  formData.set(GROUP_CONTRIBUTION_FORM_FIELD, "{not-json");
  const result = buildGroupContributionReviewRecordFragment({
    formData,
    authoritativeOptions: [],
  });
  assert.equal(result.ok, false);
});

test("detects whether the standard hidden field is present", () => {
  const formData = new FormData();
  assert.equal(hasGroupContributionFormField(formData), false);
  formData.set(GROUP_CONTRIBUTION_FORM_FIELD, "");
  assert.equal(hasGroupContributionFormField(formData), true);
});
