import assert from "node:assert/strict";
import test from "node:test";

import { validateGroupContributionTerms } from "./group-contribution";
import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
  normalizeDraft,
} from "./group-contribution-draft";
import type { AccountParticipantTarget } from "./participant-target";

function creatorTarget(): AccountParticipantTarget {
  return {
    rowId: "creator-row",
    kind: "account",
    profileId: "11111111-1111-4111-8111-111111111111",
    usernameSnapshot: "creator-example",
    displayNameSnapshot: "Creator Example",
    accountType: "individual",
    verification: "identity-verified",
    publicMention: "username",
    invitationState: "draft",
    isCreator: true,
  };
}

test("solo drafts produce no group proposal terms", () => {
  const draft = defaultGroupContributionDraft("behavior:option-1", "nonfinancial", "Avoid meat");
  assert.equal(buildGroupContributionTerms(draft), null);
});

test("maps a complete same-action draft to valid proposal-only Co-Act terms", () => {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.minimumParticipants = 10;
  draft.participantLimit = 10;
  draft.duration = "12 weeks";
  draft.frequency = "once per week";
  draft.baselineUnit = "meat-free meals per week";
  draft.redistributionEnabled = true;
  draft.redistributionMaximumQuantity = 3;
  draft.counterpartyParticipation = "explicitly-excluded";

  const terms = buildGroupContributionTerms(draft);
  assert(terms);
  assert.equal(terms.mode, "co-act");
  const result = validateGroupContributionTerms(terms, "nonfinancial");
  assert.equal(result.ok, true);
});

test("maps complementary-role lines into named role obligations", () => {
  const draft = defaultGroupContributionDraft(
    "work:option-1",
    "nonfinancial",
    "Produce an animal-welfare research brief",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.coActStructure = "complementary-roles";
  draft.complementaryRoles = "Researcher: review the evidence\nEditor: edit the final brief";
  draft.counterpartyParticipation = "not-applicable";

  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-act");
  assert.deepEqual(
    terms.roles.map((role) => [role.title, role.obligation]),
    [
      ["Researcher", "review the evidence"],
      ["Editor", "edit the final brief"],
    ],
  );
  assert.equal(validateGroupContributionTerms(terms, "nonfinancial").ok, true);
});

test("maps Co-Fund input to an open exact-target allocation proposal", () => {
  const draft = defaultGroupContributionDraft(
    "fund:option-1",
    "financial",
    "Commission an existential-risk research brief",
  );
  draft.mode = "co-fund";
  draft.creatorParticipation = "participating";
  draft.participants = [creatorTarget()];
  draft.projectDescription = "One fixed two-page research brief.";
  draft.targetMinor = 5_000;
  draft.maximumBudgetMinor = 1_000;
  draft.noPoolDefault = "Donate the budget to another approved project";
  draft.participationBeatsDefault = true;
  draft.paymentMethods = ["wallet", "card-or-ach"];

  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-fund");
  assert.equal(terms.execution, "proposal-only");
  assert.equal(terms.allocation.status, "open");
  assert.equal(terms.targetMinor, 5_000);
  assert.equal(validateGroupContributionTerms(terms, "financial").ok, true);
});

test("adds only structured allowlisted eligibility criteria", () => {
  const draft = defaultGroupContributionDraft("behavior:option-1", "nonfinancial", "Avoid meat");
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.minimumReliability = 70;
  draft.geography = "Ohio, United States";
  draft.skill = "Nutrition planning";
  draft.visibility = "invitation-only";
  draft.counterpartyParticipation = "not-applicable";

  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-act");
  assert.deepEqual(
    terms.eligibility.map((criterion) => criterion.type),
    ["minimum-reliability", "geography", "skill", "invitation"],
  );
});

test("normalization clamps participant and redistribution limits", () => {
  const draft = defaultGroupContributionDraft("behavior:option-1", "nonfinancial", "Avoid meat");
  draft.participantLimit = 1_000;
  draft.minimumParticipants = 999;
  draft.redistributionMaximumQuantity = -5;

  const normalized = normalizeDraft(draft);
  assert.equal(normalized.participantLimit, 100);
  assert.equal(normalized.minimumParticipants, 100);
  assert.equal(normalized.redistributionMaximumQuantity, 0);
});
