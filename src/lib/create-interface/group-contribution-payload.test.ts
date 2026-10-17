import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import {
  MAX_GROUP_CONTRIBUTION_PAYLOAD_BYTES,
  parseGroupContributionProposalPayload,
} from "./group-contribution-payload";

function coActTerms() {
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
  return terms;
}

test("treats an absent field as no group options", () => {
  const result = parseGroupContributionProposalPayload(null, new Map());
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.options, []);
});

test("accepts validated proposal-only terms for a known option", () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "behavior:option-1", terms: coActTerms() }],
  });
  const result = parseGroupContributionProposalPayload(
    raw,
    new Map([["behavior:option-1", "nonfinancial"]]),
  );
  assert.equal(result.ok, true);
});

test("rejects an option that is not part of the authoritative proposal", () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "forged:option", terms: coActTerms() }],
  });
  const result = parseGroupContributionProposalPayload(raw, new Map());
  assert.equal(result.ok, false);
  if (!result.ok) assert(result.issues.some((issue) => issue.code === "unknown-option"));
});

test("rejects duplicate option keys", () => {
  const terms = coActTerms();
  const raw = JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [
      { optionKey: "behavior:option-1", terms },
      { optionKey: "behavior:option-1", terms },
    ],
  });
  const result = parseGroupContributionProposalPayload(
    raw,
    new Map([["behavior:option-1", "nonfinancial"]]),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert(result.issues.some((issue) => issue.code === "duplicate-option"));
});

test("rejects a contribution-kind mismatch from the authoritative option map", () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "fund:option-1", terms: coActTerms() }],
  });
  const result = parseGroupContributionProposalPayload(
    raw,
    new Map([["fund:option-1", "financial"]]),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "incompatible-contribution"));
  }
});

test("rejects executable authority nested inside otherwise valid terms", () => {
  const base = coActTerms();
  assert.equal(base.mode, "co-act");
  if (base.mode !== "co-act") throw new Error("Expected Co-Act terms");
  const terms = {
    ...base,
    identity: {
      ...base.identity,
      publishIdentities: true,
    },
  };
  const raw = JSON.stringify({
    schemaVersion: 1,
    execution: "proposal-only",
    options: [{ optionKey: "behavior:option-1", terms }],
  });
  const result = parseGroupContributionProposalPayload(
    raw,
    new Map([["behavior:option-1", "nonfinancial"]]),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "private-or-executable-field"));
  }
});

test("rejects oversized payloads before parsing", () => {
  const raw = "x".repeat(MAX_GROUP_CONTRIBUTION_PAYLOAD_BYTES + 1);
  const result = parseGroupContributionProposalPayload(raw, new Map());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0]?.code, "payload-too-large");
});
