import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionShell = readFileSync(
  new URL("../public/moral-trade-production.html", import.meta.url),
  "utf8",
);

test("the production walkthrough does not offer a skip control", () => {
  assert.doesNotMatch(productionShell, /first_visit/);
  assert.doesNotMatch(productionShell, /aria-label="Skip walkthrough"/);
  assert.doesNotMatch(productionShell, /mtw-first-visit-skip/);
});
