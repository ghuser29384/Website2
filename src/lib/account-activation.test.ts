import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("the persisted activation stage exhaustively controls root routing", () => {
  assert.equal(getRootActivationDestination({ kind: "signed_out" }), "/discover");
  assert.equal(getRootActivationDestination({ kind: "unavailable" }), "/discover");
  assert.equal(getRootActivationDestination(available("walkthrough_required")), "/walkthrough");
  assert.equal(getRootActivationDestination(available("sparks_required")), "/complete-profile");
  assert.equal(getRootActivationDestination(available("setup_complete")), "/feed");
});

test("completed and sparks-required accounts cannot replay the walkthrough", () => {
  assert.equal(getWalkthroughActivationDestination({ kind: "signed_out" }), null);
  assert.equal(getWalkthroughActivationDestination({ kind: "unavailable" }), null);
  assert.equal(getWalkthroughActivationDestination(available("walkthrough_required")), null);
  assert.equal(
    getWalkthroughActivationDestination(available("sparks_required")),
    "/complete-profile",
  );
  assert.equal(getWalkthroughActivationDestination(available("setup_complete")), "/feed");
});

test("only persisted sparks-required or complete accounts may open Complete Profile", () => {
  assert.equal(
    getCompleteProfileActivationDestination(available("walkthrough_required")),
    "/walkthrough",
  );
  assert.equal(getCompleteProfileActivationDestination(available("sparks_required")), null);
  assert.equal(getCompleteProfileActivationDestination(available("setup_complete")), null);
  assert.equal(
    getCompleteProfileActivationDestination({ kind: "unavailable" }),
    "/walkthrough",
  );
  assert.equal(
    getCompleteProfileActivationDestination({ kind: "signed_out" }),
    "/walkthrough",
  );
});

test("safe next parameters never bypass incomplete or unavailable activation", () => {
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
      "/walkthrough",
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
