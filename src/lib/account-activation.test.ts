import assert from "node:assert/strict";
import test from "node:test";

import { getAccountLandingPath } from "@/lib/account-activation";

const baseState = {
  authenticated: true,
  onboardingStatus: null,
  hasWalkthroughProfileDraft: false,
  hasSeenWalkthrough: false,
} as const;

test("signed-out visitors land in Discover rather than the account walkthrough", () => {
  assert.equal(getAccountLandingPath({ ...baseState, authenticated: false }), "/discover");
});

test("persisted completion wins over stale walkthrough cookies", () => {
  assert.equal(
    getAccountLandingPath({
      ...baseState,
      onboardingStatus: "completed",
      hasWalkthroughProfileDraft: true,
      hasSeenWalkthrough: true,
    }),
    "/feed",
  );
});

test("an in-progress account with a valid draft resumes at 100 Sparks", () => {
  assert.equal(
    getAccountLandingPath({
      ...baseState,
      onboardingStatus: "started",
      hasWalkthroughProfileDraft: true,
    }),
    "/complete-profile",
  );
});

test("an in-progress account without a draft resumes the walkthrough", () => {
  assert.equal(
    getAccountLandingPath({ ...baseState, onboardingStatus: "started" }),
    "/walkthrough",
  );
});

test("a walkthrough draft resumes at 100 Sparks before persisted start state exists", () => {
  assert.equal(
    getAccountLandingPath({ ...baseState, hasWalkthroughProfileDraft: true }),
    "/complete-profile",
  );
});

test("a same-device unfinished walkthrough remains recoverable", () => {
  assert.equal(
    getAccountLandingPath({ ...baseState, hasSeenWalkthrough: true }),
    "/walkthrough",
  );
});

test("an authenticated account with no setup signals is treated as returning", () => {
  assert.equal(getAccountLandingPath(baseState), "/feed");
});
