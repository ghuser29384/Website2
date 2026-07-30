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
  assert.equal((integrated.match(/common-ground\.js/g) ?? []).length, 1);
});

test("the integration preserves the static source and adds the compact funding choice", () => {
  assert.doesNotMatch(source, /data-common-ground-create-integration-v1/);
  assert.doesNotMatch(source, /data-fund-mode="commonGround"/);

  const integrated = integrateCommonGroundCreateSource(source);
  assert.match(integrated, /Create a trade, redirect, or pool\./);
  assert.match(integrated, /Common Ground Pool/);
  assert.match(integrated, /Threshold pool/);
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
