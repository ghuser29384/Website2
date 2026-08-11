import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { validateGroupContributionNestedShape } from "./group-contribution-shape";

function validCoAct() {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.counterpartyParticipation = "explicitly-excluded";
  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-act");
  return terms;
}

function validCoFund() {
  const draft = defaultGroupContributionDraft(
    "fund:option-1",
    "financial",
    "Commission one fixed research brief",
  );
  draft.mode = "co-fund";
  draft.creatorParticipation = "organizer-only";
  draft.targetMinor = 5_000;
  draft.maximumBudgetMinor = 500;
  draft.noPoolDefault = "Fund another approved research project";
  draft.participationBeatsDefault = true;
  const terms = buildGroupContributionTerms(draft);
  assert(terms && terms.mode === "co-fund");
  return terms;
}

test("accepts all generated Co-Act nested fields", () => {
  assert.deepEqual(validateGroupContributionNestedShape(validCoAct()), []);
});

test("accepts all generated Co-Fund nested fields", () => {
  assert.deepEqual(validateGroupContributionNestedShape(validCoFund()), []);
});

test("rejects an unknown evidence field", () => {
  const base = validCoAct();
  const candidate = {
    ...base,
    evidence: {
      ...base.evidence,
      verifierOverride: "creator",
    },
  };
  const issues = validateGroupContributionNestedShape(candidate);
  assert(issues.some((issue) => issue.path === "evidence.verifierOverride"));
});

test("rejects an unknown participant identity field", () => {
  const base = validCoAct();
  const candidate = {
    ...base,
    participants: [{
      rowId: "external-one",
      kind: "external-claim",
      displayNameSnapshot: "External invitee",
      deliveryChannel: "claim-link",
      publicMention: "unclaimed-invitee",
      invitationState: "draft",
      isCreator: false,
      email: "must-not-be-stored@example.test",
    }],
  };
  const issues = validateGroupContributionNestedShape(candidate);
  assert(issues.some((issue) => issue.path === "participants[0].email"));
});

test("rejects an unknown role field", () => {
  const base = validCoAct();
  const candidate = {
    ...base,
    roles: base.roles.map((role, index) =>
      index === 0 ? { ...role, automaticQualification: true } : role,
    ),
  };
  const issues = validateGroupContributionNestedShape(candidate);
  assert(issues.some((issue) => issue.path === "roles[0].automaticQualification"));
});

test("rejects an unknown share field", () => {
  const base = validCoFund();
  const candidate = {
    ...base,
    allocation: {
      ...base.allocation,
      shares: [{ participantId: "person-1", amountMinor: 5_000, privateWeight: 4 }],
    },
  };
  const issues = validateGroupContributionNestedShape(candidate);
  assert(issues.some((issue) => issue.path === "allocation.shares[0].privateWeight"));
});
