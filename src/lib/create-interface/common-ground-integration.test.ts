import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";

const source = readFileSync("public/moral-trade-create/index.html", "utf8");

test("the Common Ground integration is deterministic and idempotent", () => {
  const integrated = integrateCommonGroundCreateSource(source);

  assert.equal(integrateCommonGroundCreateSource(integrated), integrated);
  assert.equal((integrated.match(/data-common-ground-create-integration-v1/g) ?? []).length, 1);
  assert.equal((integrated.match(/data-fund-mode="commonGround"/g) ?? []).length, 1);
  assert.equal((integrated.match(/common-ground\.css/g) ?? []).length, 1);
  assert.equal((integrated.match(/participant-picker\.js/g) ?? []).length, 1);
  assert.equal((integrated.match(/common-ground\.js/g) ?? []).length, 1);
});

test("the integration preserves the static source and adds the compact funding choices", () => {
  assert.doesNotMatch(source, /data-common-ground-create-integration-v1/);
  assert.doesNotMatch(source, /data-fund-mode="commonGround"/);
  assert.match(source, /Conditional donation/);

  const integrated = integrateCommonGroundCreateSource(source);
  assert.match(
    integrated,
    /Create a trade, Donation Upgrade, or public-goods pool\./,
  );
  assert.match(
    integrated,
    /Fund includes swaps, redirects, Donation Upgrades, shared-project pools, and threshold pools\./,
  );
  assert.match(integrated, /Donation Upgrade/);
  assert.doesNotMatch(integrated, />Conditional donation</);
  assert.doesNotMatch(integrated, /Set up a conditional donation\./);
  assert.match(integrated, /Co-Fund/);
  assert.match(integrated, /Are you participating in this Co-Fund\?/);
  assert.match(integrated, /Search Moral Trade accounts by username or display name\./);
  assert.match(integrated, /Typed text is not a participant until you explicitly select an account\./);
  assert.match(integrated, /private claim link/);
  assert.doesNotMatch(integrated, /These are the projects we would honestly fund/);
  assert.match(integrated, /Threshold pool/);
});

test("the integration keeps autocomplete Escape dismissal inside the request step", () => {
  const integrated = integrateCommonGroundCreateSource(source);

  assert.doesNotMatch(
    source,
    /event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+closeSuggestions\(\);/,
  );
  assert.match(
    integrated,
    /if \(event\.key === "Escape" && autocompleteState\.open\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+closeSuggestions\(\);\s+return;/,
  );
});

test("the embedded Create document uses the canonical Moral Trade favicon", () => {
  const integrated = integrateCommonGroundCreateSource(source);

  assert.match(source, /<link rel="icon" href="data:," \/>/);
  assert.doesNotMatch(integrated, /href="data:,"/);
  assert.equal(
    (integrated.match(/\/brand\/moral-trade-mark\.png\?v=20260730/g) ?? []).length,
    3,
  );
});
