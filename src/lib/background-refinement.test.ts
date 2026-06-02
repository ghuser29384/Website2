import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_GUIDED_WISH_PROFILE_VERSION,
  BACKGROUND_REFINEMENT_VERSION,
  buildApprovedRefinementSignalDraft,
  buildBackgroundRefinementAnalyticsEvent,
  buildBackgroundRefinementItems,
  buildGuidedWishProfileDraft,
} from "@/lib/background-refinement";

test("structured refinement asks bounded questions for incomplete profile dimensions", () => {
  const items = buildBackgroundRefinementItems({
    causeAreas: ["Animal welfare"],
    offeredCapabilities: [],
    requestedCounterpartyKinds: [],
    verificationPreferences: [],
  });

  assert.ok(items.length >= 4);
  assert.equal(items[0]?.refinementVersion, BACKGROUND_REFINEMENT_VERSION);
  assert.ok(items.some((item) => item.fieldKey === "cause_priorities"));
  assert.ok(items.some((item) => item.fieldKey === "capability_tags"));
  assert.ok(items.some((item) => item.fieldKey === "verification_preferences"));
  assert.ok(items.every((item) => item.confidenceBefore === "low" || item.confidenceBefore === "medium"));
});

test("refinement analytics include counts and field keys but not answer text", () => {
  const items = buildBackgroundRefinementItems({
    causeAreas: [],
    offeredCapabilities: [],
    requestedCounterpartyKinds: [],
    verificationPreferences: [],
  });
  const event = buildBackgroundRefinementAnalyticsEvent({
    items,
    status: "completed",
  });
  const serialized = JSON.stringify(event);

  assert.equal(event.answerTextIncluded, false);
  assert.equal(event.summaryOnly, true);
  assert.equal(event.itemCount, items.length);
  assert.ok(event.fieldKeys.includes("cause_priorities"));
  assert.equal(serialized.includes("my exact private answer"), false);
});

test("approved refinement signal drafts do not change public preview state", () => {
  const draft = buildApprovedRefinementSignalDraft({
    answerValues: ["receipts", "operator review", "receipts"],
    fieldKey: "verification_preferences",
  });

  assert.deepEqual(draft?.map((signal) => signal.signalValue), ["receipts", "operator review"]);
  assert.equal(draft?.[0]?.source, "interview");
  assert.equal("publicPreview" in (draft?.[0] ?? {}), false);
});

test("guided wish profile draft separates broad preview, private fields, and uncertainty", () => {
  const draft = buildGuidedWishProfileDraft({
    broadPreview: "Climate and animal welfare trade conversations.",
    capabilities: "I can review grantmaking documents.",
    constraints: "Do not reveal my workplace before consent.",
    exactAsk: "Introduce me to a specific funder after operator review.",
    exactWish: "I want to trade a donation commitment for a proof-reviewed career action.",
    passiveModeEnabled: true,
    uncertainty: {
      counterpartyType: "I am unsure whether a one-to-one intro or small group is better.",
      location: "Remote is probably fine.",
    },
    verificationPreferences: ["receipts", "operator review", "receipts"],
  });
  const serialized = JSON.stringify(draft.broadPreviewSafeFields);

  assert.equal(draft.version, BACKGROUND_GUIDED_WISH_PROFILE_VERSION);
  assert.equal(draft.passiveModeEnabled, true);
  assert.equal(draft.hiddenInferenceCreated, false);
  assert.equal(draft.liveAiMutation, false);
  assert.equal(draft.rawSourceAccess, false);
  assert.equal(draft.publicPreviewMutationRequiresApproval, true);
  assert.equal(draft.privacyStages.broadPreview, "registry");
  assert.equal(draft.privacyStages.exactWish, "consent");
  assert.deepEqual(draft.broadPreviewSafeFields.verificationPreferences, [
    "receipts",
    "operator review",
  ]);
  assert.equal(serialized.includes("specific funder"), false);
  assert.match(draft.privateFields.exactAsk, /specific funder/);
  assert.match(draft.uncertaintyFields.counterpartyType, /one-to-one/);
});
