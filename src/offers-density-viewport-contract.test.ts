import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Offers rendered acceptance keeps the exact desktop viewport at 1440x1000", () => {
  const source = readFileSync("tests/offers-density.spec.ts", "utf8");
  assert.match(source, /\{ width: 1440, height: 1000 \}/);
  assert.doesNotMatch(source, /\{ width: 1440, height: 900 \}/);
});
