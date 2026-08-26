import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getActivationGuardDestination,
  isActivationGuardedPath,
} from "@/proxy";

test("persisted activation guards every required post-auth surface", () => {
  for (const path of [
    "/feed",
    "/dashboard",
    "/dashboard/security",
    "/create",
    "/trades/new",
    "/offers",
    "/offers/new",
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
    "/agreements",
    "/saved-offers",
    "/admin",
    "/mpgf/account",
  ]) {
    assert.equal(isActivationGuardedPath(path), true, path);
    assert.equal(
      getActivationGuardDestination(path, {
        kind: "available",
        stage: "walkthrough_required",
      }),
      "/walkthrough",
      path,
    );
    assert.equal(
      getActivationGuardDestination(path, {
        kind: "available",
        stage: "sparks_required",
      }),
      "/complete-profile",
      path,
    );
    assert.equal(
      getActivationGuardDestination(path, {
        kind: "available",
        stage: "setup_complete",
      }),
      null,
      path,
    );
    assert.equal(
      getActivationGuardDestination(path, { kind: "unavailable" }),
      "/account-state-unavailable",
      path,
    );
    assert.equal(
      getActivationGuardDestination(path, { kind: "signed_out" }),
      null,
      path,
    );
  }
});

test("activation guards do not reclassify public and activation-owned routes", () => {
  for (const path of [
    "/",
    "/discover",
    "/walkthrough",
    "/complete-profile",
    "/account-state-unavailable",
    "/contact",
  ]) {
    assert.equal(isActivationGuardedPath(path), false, path);
    assert.equal(
      getActivationGuardDestination(path, {
        kind: "available",
        stage: "walkthrough_required",
      }),
      null,
      path,
    );
  }
});

test("activation_stage remains the sole post-auth setup-routing authority", () => {
  const actions = readFileSync("src/app/actions.ts", "utf8");
  const confirm = readFileSync("src/app/auth/confirm/route.ts", "utf8");
  assert.doesNotMatch(actions, /profileNeedsUsername/);
  assert.doesNotMatch(actions, /buildUsernameCompletionPath/);
  assert.doesNotMatch(confirm, /profileNeedsUsername/);
  assert.doesNotMatch(confirm, /buildUsernameCompletionPath/);
  assert.match(actions, /getPostAuthActivationDestination[\s\S]*?next/);
  assert.match(confirm, /getPostAuthActivationDestination/);
});

test("the proxy reads persisted activation for guarded browser routes", () => {
  const source = readFileSync("src/proxy.ts", "utf8");
  assert.match(source, /\.from\("profiles"\)/);
  assert.match(source, /\.select\("activation_stage"\)/);
  assert.match(source, /ACCOUNT_ACTIVATION_UNAVAILABLE_PATH/);
  assert.match(source, /createActivationRedirect/);
});
