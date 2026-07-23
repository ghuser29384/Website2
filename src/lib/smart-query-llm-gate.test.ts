import assert from "node:assert/strict";
import test from "node:test";

import { activateProductionSmartQueryLlmFallback } from "./smart-query-llm-gate";

test("enables the ambiguity fallback in production", () => {
  const environment = {
    AI_QUERY_FALLBACK_ENABLED: "false",
    VERCEL_ENV: "production",
  };

  assert.equal(activateProductionSmartQueryLlmFallback(environment), true);
  assert.equal(environment.AI_QUERY_FALLBACK_ENABLED, "true");
});

test("keeps non-production environments opt-in", () => {
  const previewEnvironment = {
    AI_QUERY_FALLBACK_ENABLED: "false",
    VERCEL_ENV: "preview",
  };

  assert.equal(activateProductionSmartQueryLlmFallback(previewEnvironment), false);
  assert.equal(previewEnvironment.AI_QUERY_FALLBACK_ENABLED, "false");
  assert.equal(
    activateProductionSmartQueryLlmFallback({
      AI_QUERY_FALLBACK_ENABLED: "true",
      VERCEL_ENV: "preview",
    }),
    true,
  );
});

test("honors the explicit production disable override", () => {
  const environment = {
    AI_QUERY_FALLBACK_ENABLED: "true",
    AI_QUERY_FALLBACK_KILL_SWITCH: "true",
    VERCEL_ENV: "production",
  };

  assert.equal(activateProductionSmartQueryLlmFallback(environment), false);
  assert.equal(environment.AI_QUERY_FALLBACK_ENABLED, "false");
});
