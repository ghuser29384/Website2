import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const identityBridge = readFileSync("public/moral-trade-account-identity.js", "utf8");
const liveAccountBridge = readFileSync("public/moral-trade-live-account.js", "utf8");
const accountRoute = readFileSync("src/app/api/live-account/route.ts", "utf8");
const shells = new Map([
  ["live", readFileSync("public/moral-trade-live.html", "utf8")],
  ["discover", readFileSync("public/moral-trade-discover.html", "utf8")],
  ["walkthrough", readFileSync("public/moral-trade-production.html", "utf8")],
]);

test("every static product shell bootstraps the authenticated account identity before rendering", () => {
  for (const [name, shell] of shells) {
    assert.match(shell, /fetch\(["']\/api\/live-account["']/u, `${name} must load the viewer`);
    assert.match(shell, /__MT_LIVE_ACCOUNT_BOOTSTRAP__/u, `${name} must bootstrap the viewer`);
    assert.match(
      shell,
      /moral-trade-account-identity\.js/u,
      `${name} must install the shared account identity bridge`,
    );
  }
});

test("the shared bridge replaces every rendered legacy avatar, including later page renders", () => {
  assert.match(identityBridge, /const visibleValue = identity\.authenticated && identity\.initials/u);
  assert.match(identityBridge, /for \(const avatar of findAvatarCandidates\(\)\)/u);
  assert.match(identityBridge, /querySelectorAll\(ROOT_SELECTOR\)/u);
  assert.match(identityBridge, /data-mt-account-avatar/u);
  assert.match(identityBridge, /data-mt-live-account-avatar/u);
  assert.match(identityBridge, /new MutationObserver\(schedulePatch\)/u);
  assert.match(identityBridge, /closest\("button,a"\)/u);
});

test("account identity remains profile-derived and private", () => {
  assert.match(accountRoute, /getViewer\(\)/u);
  assert.match(accountRoute, /getDisplayNameParts\(displayName\)/u);
  assert.match(accountRoute, /displayName[\s\S]*firstName[\s\S]*initials/u);
  assert.match(accountRoute, /Cache-Control[\s\S]*private, no-store/u);
  assert.doesNotMatch(accountRoute, /Alex Johnson/u);
  assert.doesNotMatch(liveAccountBridge, /const visibleValue = "AJ"/u);
});
