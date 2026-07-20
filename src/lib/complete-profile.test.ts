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
    role: "Policy researcher",
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
    role: "Researcher",
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
  assert.match(buildCompleteProfileCapabilityText(result), /2 hours/);
  assert.match(buildCompleteProfileConstraintText(result), /\$50/);
  assert.match(buildCompleteProfilePublicPreview(result), /Animal welfare/);
  assert.doesNotMatch(buildCompleteProfilePublicPreview(result), /commitment created/i);
});

test("rejects a submission with a forged or over-budget priority allocation", () => {
  const result = normalizeCompleteProfileSubmission({
    displayName: "Mina Park",
    role: "Researcher",
    offerType: "Time",
    causeArea: "Animal welfare",
    priorityAllocation: JSON.stringify([
      { id: "ai-safety", sparks: 21 },
    ]),
  });

  assert.equal(result, null);
});
