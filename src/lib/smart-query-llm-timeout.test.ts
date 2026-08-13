import assert from "node:assert/strict";
import test from "node:test";

import { smartQueryLlmTimeoutMs } from "./smart-query-llm";

test("uses a twelve-second default for ambiguity-only LLM interpretation", () => {
  assert.equal(smartQueryLlmTimeoutMs(undefined), 12_000);
  assert.equal(smartQueryLlmTimeoutMs("not-a-number"), 12_000);
});

test("accepts bounded timeout overrides", () => {
  assert.equal(smartQueryLlmTimeoutMs("9000"), 9_000);
  assert.equal(smartQueryLlmTimeoutMs("100"), 3_000);
  assert.equal(smartQueryLlmTimeoutMs("99999"), 20_000);
});
