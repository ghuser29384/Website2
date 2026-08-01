import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import {
  GROUP_CONTRIBUTION_FORM_FIELD,
  authoritativeOption,
  validateGroupContributionFormDataForPersistence,
} from "./group-contribution-form-data";

function validField(): string {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.counterpartyParticipation = "explicitly-excluded";
  const terms = buildGroupContributionTerms(draft);
  assert(terms);
  return JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "behavior:option-1", terms }],
  });
}

test("reads and validates the canonical hidden FormData field", () => {
  const formData = new FormData();
  formData.set(GROUP_CONTRIBUTION_FORM_FIELD, validField());

  const result = validateGroupContributionFormDataForPersistence({
    formData,
    authoritativeOptions: [authoritativeOption("behavior:option-1", "nonfinancial")],
  });
  assert.equal(result.ok, true);
});

test("an absent field means there are no selected group modifiers", () => {
  const result = validateGroupContributionFormDataForPersistence({
    formData: new FormData(),
    authoritativeOptions: [authoritativeOption("behavior:option-1", "nonfinancial")],
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.options, []);
});

test("rejects a file in place of UTF-8 JSON text", () => {
  const formData = new FormData();
  formData.set(
    GROUP_CONTRIBUTION_FORM_FIELD,
    new File([validField()], "terms.json", { type: "application/json" }),
  );

  const result = validateGroupContributionFormDataForPersistence({
    formData,
    authoritativeOptions: [authoritativeOption("behavior:option-1", "nonfinancial")],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert(result.issues.some((issue) => issue.code === "invalid-envelope"));
});
