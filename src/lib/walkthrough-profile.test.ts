import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWalkthroughCompleteProfilePath,
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

test("round-trips a private walkthrough starter profile without serializing it into paths", () => {
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
  assert.equal(buildWalkthroughOnboardingPath(draft), "/onboarding");
  assert.equal(buildWalkthroughCompleteProfilePath(draft), "/complete-profile");
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

test("legacy query values cannot override or create a private Walkthrough draft", () => {
  const cookieDraft = createWalkthroughProfileDraft({
    originalCause: "Climate",
    offerType: "Time",
    matchName: "Asha",
    matchGet: "Review a clean-energy proposal",
    matchGive: "Volunteer for one hour",
    createdAt: "2026-07-17T16:00:00.000Z",
  });
  assert.ok(cookieDraft);

  const legacySearchParams = {
    source: "walkthrough",
    cause_area: "Animal welfare",
    walkthrough_cause: "Factory farming",
    offer_type: "A pledge",
    match_name: "Noor",
    match_get: "private requested action",
    match_give: "private offered action",
  };

  const draft = getWalkthroughProfileDraft({
    cookieValue: encodeWalkthroughProfileDraft(cookieDraft),
    searchParams: legacySearchParams,
  });

  assert.equal(draft?.causeArea, "Climate");
  assert.equal(draft?.offerType, "Time");
  assert.equal(draft?.matchName, "Asha");
  assert.equal(draft?.matchGet, "Review a clean-energy proposal");
  assert.equal(draft?.matchGive, "Volunteer for one hour");
  assert.equal(getWalkthroughProfileDraft({ searchParams: legacySearchParams }), null);
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

test("Complete Profile preserves genuine Walkthrough context only through the private handoff", () => {
  const cookieDraft = createWalkthroughProfileDraft({
    originalCause: "AI safety",
    causeArea: "Existential risk",
    offerType: "Money",
    matchName: "Rae",
    matchGet: "Review a technical proposal",
    matchGive: "$20 to a public-interest project",
    createdAt: "2026-07-17T16:00:00.000Z",
  });
  assert.ok(cookieDraft);

  const draft = getCompleteProfileDraft({
    cookieValue: encodeWalkthroughProfileDraft(cookieDraft),
    searchParams: {
      source: "walkthrough",
      walkthrough_cause: "Factory farming",
      cause_area: "Animal welfare",
      offer_type: "A pledge",
      match_name: "Noor",
      match_get: "legacy private request",
      match_give: "legacy private offer",
    },
  });

  assert.ok(draft);
  assert.equal(draft.source, "walkthrough");
  assert.equal(draft.originalCause, "AI safety");
  assert.equal(draft.causeArea, "Existential risk");
  assert.equal(draft.offerType, "Money");
  assert.equal(draft.matchName, "Rae");
});
