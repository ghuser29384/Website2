import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
  getAccountActivationState,
  getCompleteProfileActivationDestination,
  getPostAuthActivationDestination,
  getRootActivationDestination,
  getWalkthroughActivationDestination,
  type AccountActivationStage,
  type AccountActivationState,
} from "@/lib/account-activation";

function available(stage: AccountActivationStage): AccountActivationState {
  return { kind: "available", stage };
}

test("the exhaustive activation truth table keeps unavailable outside every activation route", () => {
  const requestedDestination = "/offers?view=live";
  const cases: Array<{
    completeProfile: string | null;
    label: string;
    postAuth: string;
    root: string;
    state: AccountActivationState;
    walkthrough: string | null;
  }> = [
    {
      completeProfile: "/walkthrough",
      label: "signed out",
      postAuth: ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
      root: "/discover",
      state: { kind: "signed_out" },
      walkthrough: null,
    },
    {
      completeProfile: ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
      label: "unavailable",
      postAuth: ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
      root: ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
      state: { kind: "unavailable" },
      walkthrough: ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
    },
    {
      completeProfile: "/walkthrough",
      label: "walkthrough required",
      postAuth: "/walkthrough",
      root: "/walkthrough",
      state: available("walkthrough_required"),
      walkthrough: null,
    },
    {
      completeProfile: null,
      label: "sparks required",
      postAuth: "/complete-profile",
      root: "/complete-profile",
      state: available("sparks_required"),
      walkthrough: "/complete-profile",
    },
    {
      completeProfile: null,
      label: "setup complete",
      postAuth: requestedDestination,
      root: "/feed",
      state: available("setup_complete"),
      walkthrough: "/feed",
    },
  ];

  for (const entry of cases) {
    assert.equal(getRootActivationDestination(entry.state), entry.root, `${entry.label}: root`);
    assert.equal(
      getWalkthroughActivationDestination(entry.state),
      entry.walkthrough,
      `${entry.label}: walkthrough`,
    );
    assert.equal(
      getCompleteProfileActivationDestination(entry.state),
      entry.completeProfile,
      `${entry.label}: complete profile`,
    );
    assert.equal(
      getPostAuthActivationDestination(entry.state, requestedDestination),
      entry.postAuth,
      `${entry.label}: post auth`,
    );
  }
});

test("direct Walkthrough stays voluntary when signed out but rejects unavailable account state", () => {
  assert.equal(getWalkthroughActivationDestination({ kind: "signed_out" }), null);
  assert.equal(
    getWalkthroughActivationDestination({ kind: "unavailable" }),
    ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
  );
});

test("Complete Profile rejects unavailable without classifying the account as new", () => {
  assert.equal(
    getCompleteProfileActivationDestination({ kind: "unavailable" }),
    ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
  );
  assert.notEqual(
    getCompleteProfileActivationDestination({ kind: "unavailable" }),
    "/walkthrough",
  );
});

test("post-auth next parameters never bypass incomplete or unavailable activation", () => {
  for (const requested of ["/feed", "/dashboard", "/offers?view=live"]) {
    assert.equal(
      getPostAuthActivationDestination(available("walkthrough_required"), requested),
      "/walkthrough",
    );
    assert.equal(
      getPostAuthActivationDestination(available("sparks_required"), requested),
      "/complete-profile",
    );
    assert.equal(
      getPostAuthActivationDestination({ kind: "unavailable" }, requested),
      ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
    );
    assert.equal(
      getPostAuthActivationDestination({ kind: "signed_out" }, requested),
      ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
    );
  }

  assert.equal(
    getPostAuthActivationDestination(available("setup_complete"), "/offers?view=live"),
    "/offers?view=live",
  );
});

test("cookies, local drafts, agreements, and activity cannot manufacture activation", () => {
  const unrelatedSignals = {
    cookies: { mt_walkthrough_seen: "1" },
    localDraft: { completed: true },
    agreementCount: 12,
    cohortStatus: "completed",
  };

  const state = getAccountActivationState({
    authenticated: true,
    viewer: {
      profile: { ...unrelatedSignals, activation_stage: undefined },
      profileStatus: "loaded",
      profileSyncError: null,
    },
  });

  assert.deepEqual(state, { kind: "unavailable" });
  assert.notEqual(getRootActivationDestination(state), "/feed");
});

test("fallback, invalid, and failed profile reads remain unavailable", () => {
  assert.deepEqual(
    getAccountActivationState({ authenticated: false, viewer: null }),
    { kind: "signed_out" },
  );
  assert.deepEqual(
    getAccountActivationState({ authenticated: true, viewer: null }),
    { kind: "unavailable" },
  );
  assert.deepEqual(
    getAccountActivationState({
      authenticated: true,
      viewer: {
        profile: { activation_stage: "setup_complete" },
        profileStatus: "fallback",
        profileSyncError: "read failed",
      },
    }),
    { kind: "unavailable" },
  );
  assert.deepEqual(
    getAccountActivationState({
      authenticated: true,
      viewer: {
        profile: { activation_stage: "invented" },
        profileStatus: "loaded",
        profileSyncError: null,
      },
    }),
    { kind: "unavailable" },
  );
});
