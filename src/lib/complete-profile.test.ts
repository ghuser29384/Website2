import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompleteProfileCapabilityText,
  buildCompleteProfileConstraintText,
  buildCompleteProfilePublicPreview,
  getCompleteProfileOfferOpenness,
  getCompleteProfilePrivacyStage,
  normalizeCompleteProfileSubmission,
} from "@/lib/complete-profile";
import {
  buildInitialProfilePriorityAllocation,
  serializeProfilePriorityAllocation,
} from "@/lib/profile-priorities";

const priorityAllocation = serializeProfilePriorityAllocation(
  buildInitialProfilePriorityAllocation(),
);

test("normalizes a review and refine submission", () => {
  const result = normalizeCompleteProfileSubmission({
    displayName: "  Alex   Morgan ",
    username: "Alex-Morgan",
    publicInvitationMentionsEnabled: "on",
    role: "Policy researcher",
    affiliation: "  Future   Institute ",
    bio: "Interested in bounded, verifiable exchanges.",
    maxCommitment: "100",
    monthlyTime: "4 hours",
    contactRule: "Verified members",
    privateProfile: "true",
    offerType: "Money",
    causeArea: "Cause prioritization",
    matchGet: "Research review",
    priorityAllocation,
  });

  assert.ok(result);
  assert.equal(result.displayName, "Alex Morgan");
  assert.equal(result.username, "alex-morgan");
  assert.equal(result.publicInvitationMentionsEnabled, true);
  assert.equal(result.affiliation, "Future Institute");
  assert.equal(result.maxCommitment, 100);
  assert.equal(result.monthlyTime, "4 hours");
  assert.equal(result.contactRule, "Verified members");
  assert.equal(result.privateProfile, true);
});

test("maps privacy and offer openness conservatively", () => {
  assert.equal(getCompleteProfilePrivacyStage(true, "Open proposals"), "strict");
  assert.equal(getCompleteProfilePrivacyStage(false, "Verified members"), "limited");
  assert.equal(getCompleteProfilePrivacyStage(false, "Open proposals"), "broad");
  assert.deepEqual(getCompleteProfileOfferOpenness("Money"), {
    openToPayment: true,
    openToPledges: false,
  });
  assert.deepEqual(getCompleteProfileOfferOpenness("A pledge"), {
    openToPayment: false,
    openToPledges: true,
  });
});

test("builds bounded matching summaries without claiming a commitment", () => {
  const result = normalizeCompleteProfileSubmission({
    displayName: "Mina Park",
    username: "mina-park",
    publicInvitationMentionsEnabled: false,
    role: "Researcher",
    affiliation: "University of Oxford",
    bio: "Open to introductions with clear evidence requirements.",
    maxCommitment: 50,
    monthlyTime: "2 hours",
    contactRule: "Introductions only",
    privateProfile: true,
    offerType: "Time",
    causeArea: "Animal welfare",
    matchGet: "Independent review",
    priorityAllocation,
  });

  assert.ok(result);
  assert.match(buildCompleteProfileCapabilityText(result), /University of Oxford/);
  assert.match(buildCompleteProfileCapabilityText(result), /2 hours/);
  assert.match(buildCompleteProfileConstraintText(result), /\$50/);
  assert.match(buildCompleteProfilePublicPreview(result), /University of Oxford/);
  assert.match(buildCompleteProfilePublicPreview(result), /Animal welfare/);
  assert.doesNotMatch(buildCompleteProfilePublicPreview(result), /commitment created/i);
});

test("rejects a submission with a forged or over-budget priority allocation", () => {
  const result = normalizeCompleteProfileSubmission({
    displayName: "Mina Park",
    username: "mina-park",
    publicInvitationMentionsEnabled: false,
    role: "Researcher",
    offerType: "Time",
    causeArea: "Animal welfare",
    priorityAllocation: JSON.stringify([
      { id: "ai-safety", sparks: 21 },
    ]),
  });

  assert.equal(result, null);
});

test("builds direct profile capability text without inferring an offer type", () => {
  const result = normalizeCompleteProfileSubmission({
    displayName: "Mina Park",
    username: "mina-park",
    publicInvitationMentionsEnabled: false,
    role: "Researcher",
    affiliation: "Future Institute",
    maxCommitment: 50,
    monthlyTime: "2 hours",
    contactRule: "Introductions only",
    privateProfile: true,
    offerType: "Time",
    causeArea: "Existential risk",
    priorityAllocation,
  });

  assert.ok(result);
  const capability = buildCompleteProfileCapabilityText(result, {
    includeOfferType: false,
  });
  assert.match(capability, /2 hours/);
  assert.match(capability, /separately reviewed opportunities/);
  assert.doesNotMatch(capability, /contribute time/i);
});
