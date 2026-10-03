import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWalkthroughOnboardingPath,
  createDirectCompleteProfileDraft,
  createWalkthroughProfileDraft,
  encodeWalkthroughProfileDraft,
  getCompleteProfileDraft,
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

test("first-time direct Complete Profile visits do not receive a direct draft", () => {
  const draft = getCompleteProfileDraft({
    searchParams: {},
  });

  assert.equal(draft, null);
});

test("returning direct Complete Profile visits receive a conservative 100-spark draft", () => {
  const draft = getCompleteProfileDraft({
    allowDirect: true,
    searchParams: {},
  });

  assert.ok(draft);
  assert.equal(draft.source, "direct");
  assert.equal(draft.originalCause, "Profile priorities");
  assert.equal(draft.matchGet, "");
  assert.equal(draft.matchGive, "");
  assert.equal(draft.participantKind, "individual");
});

test("direct Complete Profile draft creation is deterministic when time is supplied", () => {
  const draft = createDirectCompleteProfileDraft("2026-07-31T07:00:00.000Z");

  assert.equal(draft.source, "direct");
  assert.equal(draft.createdAt, "2026-07-31T07:00:00.000Z");
});

test("Complete Profile preserves genuine Walkthrough context without returning-user state", () => {
  const draft = getCompleteProfileDraft({
    searchParams: {
      source: "walkthrough",
      walkthrough_cause: "AI safety",
      cause_area: "Existential risk",
      offer_type: "Money",
      match_name: "Rae",
    },
  });

  assert.ok(draft);
  assert.equal(draft.source, "walkthrough");
  assert.equal(draft.originalCause, "AI safety");
  assert.equal(draft.offerType, "Money");
});
