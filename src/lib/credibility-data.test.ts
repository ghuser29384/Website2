import assert from "node:assert/strict";
import test from "node:test";

import { getActiveCredibilityModel } from "./credibility-data";
import { DEFAULT_CREDIBILITY_MODEL } from "./credibility";

test("the active credibility model preserves a successful published version", async (context) => {
  let endpoint: URL | undefined;
  let requestSignal: AbortSignal | null | undefined;
  context.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
    endpoint = input;
    requestSignal = init.signal;
    return Response.json([{
      version: "published-test-version",
      prior_success: 3,
      prior_failure: 2,
      lower_quantile: 0.2,
      minimum_effective_observations: 7,
      recency_half_life_days: 180,
      dimension_weights: {},
      context_weights: {},
    }]);
  });

  const model = await getActiveCredibilityModel();
  assert.equal(model.version, "published-test-version");
  assert.equal(model.priorSuccess, 3);
  assert.equal(model.priorFailure, 2);
  assert.equal(model.recencyHalfLifeDays, 180);
  assert.equal(endpoint?.pathname, "/rest/v1/credibility_model_versions");
  assert.equal(endpoint?.searchParams.get("status"), "eq.active");
  assert.equal(requestSignal?.aborted, false);
});

test("a stalled model lookup aborts after four seconds and uses the existing fallback", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal: AbortSignal | null | undefined;
  context.mock.method(globalThis, "fetch", (_input: URL, init: RequestInit) => {
    requestSignal = init.signal;
    return new Promise<Response>((_resolve, reject) => {
      requestSignal?.addEventListener("abort", () => reject(requestSignal?.reason), { once: true });
    });
  });

  const pending = getActiveCredibilityModel();
  assert.ok(requestSignal instanceof AbortSignal);
  context.mock.timers.tick(3_999);
  assert.equal(requestSignal.aborted, false);
  context.mock.timers.tick(1);
  assert.equal(requestSignal.aborted, true);
  assert.equal(await pending, DEFAULT_CREDIBILITY_MODEL);
});

test("the existing model fallback still handles empty and unavailable responses", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.equal(await getActiveCredibilityModel(), DEFAULT_CREDIBILITY_MODEL);
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal(await getActiveCredibilityModel(), DEFAULT_CREDIBILITY_MODEL);
});
