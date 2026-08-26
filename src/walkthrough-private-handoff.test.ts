import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildWalkthroughCompleteProfilePath,
  buildWalkthroughOnboardingPath,
  createWalkthroughProfileDraft,
  encodeWalkthroughProfileDraft,
  getCompleteProfileDraft,
  getWalkthroughProfileDraft,
  hasWalkthroughPrivateQuery,
  WALKTHROUGH_PRIVATE_QUERY_KEYS,
} from "@/lib/walkthrough-profile";

const privateDraft = createWalkthroughProfileDraft({
  originalCause: "private-sentinel-cause",
  causeArea: "Animal welfare",
  offerType: "Money",
  matchName: "private-sentinel-name",
  matchGet: "private-sentinel-request",
  matchGive: "private-sentinel-offer",
  participantKind: "individual",
  primaryGoal: "find_counterparty",
  firstAction: "create_broad_preview",
  createdAt: "2026-08-17T00:00:00.000Z",
});

if (!privateDraft) throw new Error("Synthetic private Walkthrough draft did not validate.");

test("Walkthrough handoff builders emit clean paths only", () => {
  assert.equal(buildWalkthroughCompleteProfilePath(privateDraft), "/complete-profile");
  assert.equal(buildWalkthroughOnboardingPath(privateDraft), "/onboarding");

  for (const key of WALKTHROUGH_PRIVATE_QUERY_KEYS) {
    assert.doesNotMatch(buildWalkthroughCompleteProfilePath(privateDraft), new RegExp(`${key}=`));
    assert.doesNotMatch(buildWalkthroughOnboardingPath(privateDraft), new RegExp(`${key}=`));
  }
  assert.doesNotMatch(buildWalkthroughCompleteProfilePath(privateDraft), /private-sentinel/);
  assert.doesNotMatch(buildWalkthroughOnboardingPath(privateDraft), /private-sentinel/);
});

test("query parameters cannot supply or override a private Walkthrough draft", () => {
  const cookieValue = encodeWalkthroughProfileDraft(privateDraft);
  const queryDraft = {
    source: "walkthrough",
    cause_area: "Existential risk",
    walkthrough_cause: "private-query-cause",
    offer_type: "Time",
    match_name: "private-query-name",
    match_get: "private-query-request",
    match_give: "private-query-offer",
  };

  assert.equal(hasWalkthroughPrivateQuery(queryDraft), true);
  assert.equal(hasWalkthroughPrivateQuery({ username_required: "1", next: "/feed" }), false);

  const fromWalkthrough = getWalkthroughProfileDraft({
    cookieValue,
    searchParams: queryDraft,
  });
  const fromCompleteProfile = getCompleteProfileDraft({
    cookieValue,
    searchParams: queryDraft,
  });

  assert.equal(fromWalkthrough?.matchName, privateDraft.matchName);
  assert.equal(fromCompleteProfile?.matchName, privateDraft.matchName);
  assert.notEqual(fromWalkthrough?.matchName, queryDraft.match_name);
  assert.notEqual(fromCompleteProfile?.matchName, queryDraft.match_name);
});

test("activation source wiring keeps identifiers and private draft values out of logs and return paths", () => {
  const actionSource = readFileSync("src/app/walkthrough/actions.ts", "utf8");
  const completeActionSource = readFileSync("src/app/complete-profile/actions.ts", "utf8");
  const pageSource = readFileSync("src/app/complete-profile/page.tsx", "utf8");

  assert.doesNotMatch(actionSource, /profileId:/);
  assert.doesNotMatch(actionSource, /message:\s*transitionError/);
  assert.match(actionSource, /path:\s*"\/complete-profile"/);
  assert.match(actionSource, /buildWalkthroughCompleteProfilePath\(draft\)/);
  assert.doesNotMatch(completeActionSource, /profileId:/);
  assert.doesNotMatch(completeActionSource, /message:\s*transitionError/);
  assert.doesNotMatch(
    completeActionSource,
    /console\.error\([\s\S]*?,\s*(?:error|profileError|onboardingError|wishProfileError|synthesisError)\);/,
  );
  assert.match(completeActionSource, /getSafeErrorCode/);
  assert.match(completeActionSource, /path:\s*"\/complete-profile"/);
  assert.match(pageSource, /hasWalkthroughPrivateQuery\(resolvedSearchParams\)/);
  assert.match(pageSource, /const baseReturnTo = "\/complete-profile"/);
  assert.doesNotMatch(pageSource, /buildCompleteProfilePath/);
  assert.doesNotMatch(pageSource, /walkthrough_cause/);
  assert.doesNotMatch(pageSource, /match_get/);
  assert.doesNotMatch(pageSource, /match_give/);
});
