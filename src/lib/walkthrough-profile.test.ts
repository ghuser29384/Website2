import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWalkthroughOnboardingPath,
  createWalkthroughProfileDraft,
  encodeWalkthroughProfileDraft,
  getWalkthroughProfileDraft,
  mapWalkthroughCauseToCauseArea,
  parseWalkthroughProfileDraft,
} from "@/lib/walkthrough-profile";

test("maps walkthrough causes to onboarding cause areas", () => {
  assert.equal(mapWalkthroughCauseToCauseArea("AI safety"), "Existential risk");
  assert.equal(mapWalkthroughCauseToCauseArea("Factory farming"), "Animal welfare");
  assert.equal(mapWalkthroughCauseToCauseArea("Global health"), "Public health");
});

test("round-trips a private walkthrough starter profile", () => {
  const draft = createWalkthroughProfileDraft({
    originalCause: "AI safety",
    offerType: "Money",
    matchName: "Rae",
    matchGet: "30 vegetarian days",
    matchGive: "$20 to malaria prevention",
    createdAt: "2026-07-17T16:00:00.000Z",
  });

  assert.ok(draft);
  assert.equal(draft.causeArea, "Existential risk");
  assert.deepEqual(parseWalkthroughProfileDraft(encodeWalkthroughProfileDraft(draft)), draft);
  assert.match(buildWalkthroughOnboardingPath(draft), /^\/onboarding\?source=walkthrough&/);
});

test("parses an already decoded cookie containing a literal percent sign", () => {
  const draft = createWalkthroughProfileDraft({
    originalCause: "Global health",
    offerType: "A pledge",
    matchName: "Sam",
    matchGive: "Give 1% to global health",
    createdAt: "2026-07-17T16:00:00.000Z",
  });

  assert.ok(draft);
  assert.deepEqual(parseWalkthroughProfileDraft(JSON.stringify(draft)), draft);
});

test("query values take precedence over an older cookie draft", () => {
  const cookieDraft = createWalkthroughProfileDraft({
    originalCause: "Climate",
    offerType: "Time",
    matchName: "Asha",
    createdAt: "2026-07-17T16:00:00.000Z",
  });
  assert.ok(cookieDraft);

  const draft = getWalkthroughProfileDraft({
    cookieValue: encodeWalkthroughProfileDraft(cookieDraft),
    searchParams: {
      source: "walkthrough",
      cause_area: "Animal welfare",
      walkthrough_cause: "Factory farming",
      offer_type: "A pledge",
      match_name: "Noor",
    },
  });

  assert.equal(draft?.causeArea, "Animal welfare");
  assert.equal(draft?.offerType, "A pledge");
  assert.equal(draft?.matchName, "Noor");
});
