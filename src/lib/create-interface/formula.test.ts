import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateTimingFormula,
  formulaContext,
  parseTimingFormula,
  validateTimingFormula,
} from "./formula";

test("custom timing formulas parse without executable code", () => {
  const parsed = parseTimingFormula("0.7 * (1 - t) + 0.3 * (1 - p)");
  assert.deepEqual(new Set(parsed.variables), new Set(["t", "p"]));
  assert.equal(evaluateTimingFormula(parsed.ast, formulaContext(0.5, 51, 101)), 0.5);
  assert.throws(() => parseTimingFormula("globalThis.fetch('https://example.com')"), /unsupported|not allowed|invalid number/i);
  assert.throws(() => parseTimingFormula("t = 0"), /unsupported/i);
});

test("server validation requires bounded, earlier-is-no-worse multipliers", () => {
  assert.equal(validateTimingFormula("1 - t").valid, true);
  assert.equal(validateTimingFormula("if(n <= ceil(0.20 * N), 1, 0)").valid, true);
  assert.equal(validateTimingFormula("1 + t").valid, false);
  assert.match(validateTimingFormula("1 + t").errors.join(" "), /between 0 and 1|later acceptance/i);
  assert.equal(validateTimingFormula("p").valid, false);
  assert.match(validateTimingFormula("p").errors.join(" "), /later contributor rank/i);
  assert.equal(validateTimingFormula("1 / (1 - t)").valid, false);
});
