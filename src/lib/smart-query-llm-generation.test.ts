import assert from "node:assert/strict";
import test from "node:test";

import {
  SMART_QUERY_LLM_MAX_OUTPUT_TOKENS,
  SMART_QUERY_LLM_REASONING_EFFORT,
} from "./smart-query-llm";

test("reserves output for the structured ambiguity decision", () => {
  assert.equal(SMART_QUERY_LLM_REASONING_EFFORT, "minimal");
  assert.equal(SMART_QUERY_LLM_MAX_OUTPUT_TOKENS, 1_200);
});
