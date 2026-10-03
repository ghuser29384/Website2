import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeGroupContributionDraft } from "./group-contribution-draft-sanitize";

test("returns defaults for a non-object stored draft", () => {
  const draft = sanitizeGroupContributionDraft("corrupt", "behavior:option-1", "nonfinancial");
  assert.equal(draft.mode, "solo");
  assert.equal(draft.optionKey, "behavior:option-1");
  assert.equal(draft.underlyingContribution, "nonfinancial");
});

test("ignores malformed scalar types instead of throwing", () => {
  const draft = sanitizeGroupContributionDraft(
    {
      mode: { forged: true },
      primaryText: 44,
      participantLimit: "100",
      paymentMethods: ["wallet", { paymentIntent: "forged" }],
      noPoolDefault: ["unexpected"],
    },
    "fund:option-1",
    "financial",
  );

  assert.equal(draft.mode, "solo");
  assert.equal(draft.primaryText, "");
  assert.equal(draft.participantLimit, 10);
  assert.deepEqual(draft.paymentMethods, ["wallet"]);
  assert.equal(draft.noPoolDefault, "");
});

test("prevents a stored Co-Fund mode from attaching to nonfinancial work", () => {
  const draft = sanitizeGroupContributionDraft(
    { mode: "co-fund", primaryText: "Write a research brief" },
    "work:option-1",
    "nonfinancial",
  );
  assert.equal(draft.mode, "solo");
});

test("clamps valid numeric values through the normalizer", () => {
  const draft = sanitizeGroupContributionDraft(
    {
      mode: "co-act",
      participantLimit: 900,
      minimumParticipants: 700,
      baselineQuantity: -3,
      redistributionMaximumQuantity: -1,
    },
    "behavior:option-1",
    "nonfinancial",
  );
  assert.equal(draft.mode, "co-act");
  assert.equal(draft.participantLimit, 100);
  assert.equal(draft.minimumParticipants, 100);
  assert.equal(draft.baselineQuantity, 0);
  assert.equal(draft.redistributionMaximumQuantity, 0);
});


test("keeps explicit account targets and drops legacy free-text participants", () => {
  const draft = sanitizeGroupContributionDraft(
    {
      mode: "co-act",
      creatorParticipation: "organizer-only",
      participants: [
        { name: "Typed but never selected" },
        {
          rowId: "invitee-one",
          kind: "external-claim",
          displayNameSnapshot: "External invitee",
          deliveryChannel: "claim-link",
          publicMention: "unclaimed-invitee",
          invitationState: "draft",
          isCreator: false,
        },
      ],
    },
    "behavior:option-1",
    "nonfinancial",
  );

  assert.equal(draft.creatorParticipation, "organizer-only");
  assert.equal(draft.participants.length, 1);
  assert.equal(draft.participants[0]?.kind, "external-claim");
});
