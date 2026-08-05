import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { validateGroupContributionProposalForPersistence } from "./group-contribution-server";

function coActPayload() {
  const draft = defaultGroupContributionDraft(
    "behavior:option-1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.counterpartyParticipation = "explicitly-excluded";
  const terms = buildGroupContributionTerms(draft);
  assert(terms);
  return JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "behavior:option-1", terms }],
  });
}

test("returns canonical validated JSON for persistence", () => {
  const result = validateGroupContributionProposalForPersistence({
    rawField: coActPayload(),
    authoritativeOptions: [
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
    ],
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.execution, "proposal-only");
    assert.deepEqual(JSON.parse(result.canonicalJson), result.value);
  }
});

test("rejects terms that point to an option outside the authoritative proposal", () => {
  const result = validateGroupContributionProposalForPersistence({
    rawField: coActPayload(),
    authoritativeOptions: [
      { optionKey: "work:option-2", contributionKind: "nonfinancial" },
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert(result.issues.some((issue) => issue.code === "unknown-option"));
});

test("rejects nested unknown fields before persistence", () => {
  const parsed = JSON.parse(coActPayload()) as {
    options: Array<{ terms: { evidence: Record<string, unknown> } }>;
  };
  parsed.options[0].terms.evidence.creatorVerified = true;

  const result = validateGroupContributionProposalForPersistence({
    rawField: JSON.stringify(parsed),
    authoritativeOptions: [
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(
      result.issues.some(
        (issue) => issue.path === "options[0].terms.evidence.creatorVerified",
      ),
    );
  }
});

test("fails closed when a proposal subtype is disabled", () => {
  const result = validateGroupContributionProposalForPersistence({
    rawField: coActPayload(),
    authoritativeOptions: [
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
    ],
    flags: {
      coAct: false,
      coFund: true,
      coActComplementaryRoles: true,
      coFundFlexible: true,
      coFundCustomSplit: true,
      coFundMatching: true,
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => /disabled/u.test(issue.message)));
  }
});

test("rejects duplicate authoritative option keys", () => {
  const result = validateGroupContributionProposalForPersistence({
    rawField: coActPayload(),
    authoritativeOptions: [
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
      { optionKey: "behavior:option-1", contributionKind: "nonfinancial" },
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert(result.issues.some((issue) => issue.code === "duplicate-option"));
});
