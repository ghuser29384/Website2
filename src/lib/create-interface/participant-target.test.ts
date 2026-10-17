import assert from "node:assert/strict";
import test from "node:test";

import {
  validateParticipantOwnedFundingTerms,
  validateParticipantTarget,
  validateParticipantTargets,
} from "./participant-target";

function account(profileId: string, rowId: string, isCreator = false) {
  return {
    rowId,
    kind: "account",
    profileId,
    usernameSnapshot: isCreator ? "creator-example" : "participant-example",
    displayNameSnapshot: isCreator ? "Creator Example" : "Participant Example",
    accountType: "individual",
    verification: "identity-verified",
    publicMention: "username",
    invitationState: "draft",
    isCreator,
  } as const;
}

const creatorId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

test("accepts an explicit account identity and a contact-free claim invitee", () => {
  assert.equal(validateParticipantTarget(account(participantId, "row-account")).kind, "account");
  assert.deepEqual(
    validateParticipantTarget({
      rowId: "row-external",
      kind: "external-claim",
      displayNameSnapshot: "External collaborator",
      deliveryChannel: "claim-link",
      publicMention: "unclaimed-invitee",
      invitationState: "draft",
      isCreator: false,
    }),
    {
      rowId: "row-external",
      kind: "external-claim",
      displayNameSnapshot: "External collaborator",
      deliveryChannel: "claim-link",
      publicMention: "unclaimed-invitee",
      invitationState: "draft",
      isCreator: false,
    },
  );
});

test("rejects free text, contact details, duplicate accounts, and creator mismatches", () => {
  assert.throws(() => validateParticipantTarget({ name: "Typed only" }), /explicitly selected/i);
  assert.throws(
    () => validateParticipantTarget({ ...account(participantId, "row-account"), email: "x@example.com" }),
    /unsupported or private field/i,
  );
  for (const displayNameSnapshot of [
    "person@example.com",
    "+1 (212) 555-0199",
    "https://example.com/person",
  ]) {
    assert.throws(
      () => validateParticipantTarget({
        rowId: "row-sensitive-external",
        kind: "external-claim",
        displayNameSnapshot,
        deliveryChannel: "claim-link",
        publicMention: "unclaimed-invitee",
        invitationState: "draft",
        isCreator: false,
      }),
      /cannot contain email addresses, phone numbers, or URLs/i,
    );
  }
  assert.throws(
    () => validateParticipantTarget({
      ...account(participantId, "row-sensitive-account"),
      displayNameSnapshot: "person@example.com",
    }),
    /cannot expose contact details/i,
  );
  assert.equal(
    validateParticipantTarget({
      ...account(participantId, "row-username-fallback"),
      displayNameSnapshot: "@participant-example",
    }).displayNameSnapshot,
    "@participant-example",
  );

  assert.throws(
    () => validateParticipantTargets(
      [account(creatorId, "creator", true), account(creatorId, "duplicate")],
      { minimum: 2, maximum: 100, creatorParticipation: "participating" },
    ),
    /same account cannot be added twice/i,
  );
  assert.throws(
    () => validateParticipantTargets([account(participantId, "participant")], {
      minimum: 1,
      maximum: 100,
      creatorParticipation: "participating",
    }),
    /participating creator/i,
  );
});

test("allows only the participating creator to supply bounded private funding terms", () => {
  assert.deepEqual(
    validateParticipantOwnedFundingTerms({
      maximumBudgetMinor: 5_000,
      noPoolDefault: "Donate the same budget to another approved project",
      participationBeatsDefault: true,
      preauthorizeExecutableFallback: false,
    }),
    {
      maximumBudgetMinor: 5_000,
      noPoolDefault: "Donate the same budget to another approved project",
      participationBeatsDefault: true,
      preauthorizeExecutableFallback: false,
    },
  );
  assert.throws(
    () => validateParticipantOwnedFundingTerms({
      maximumBudgetMinor: 5_000,
      noPoolDefault: "Another project",
      participationBeatsDefault: true,
      preauthorizeExecutableFallback: false,
      paymentIntent: "forged",
    }),
    /unsupported or private field/i,
  );
});
