import assert from "node:assert/strict";
import test from "node:test";
import { createRequestScopedLoader } from "./request-scoped-loader";

test("nested and concurrent feed readers verify the same request only once", async () => {
  let calls = 0;
  const load = createRequestScopedLoader(async () => ({ verification: ++calls }));
  const request = new Request("https://example.test/api/live-now");
  const [base, wrapper] = await Promise.all([load(request), load(request)]);
  assert.strictEqual(base, wrapper);
  assert.strictEqual(await load(request), base);
  assert.equal(calls, 1);
});

test("separate requests never share a verified identity, even at the same URL", async () => {
  let calls = 0;
  const load = createRequestScopedLoader(async () => ({ verification: ++calls }));
  const [first, second] = await Promise.all([
    load(new Request("https://example.test/api/live-now")),
    load(new Request("https://example.test/api/live-now")),
  ]);
  assert.notStrictEqual(first, second);
  assert.equal(calls, 2);
});

test("failed verification is shared only within its request and a retry re-verifies", async () => {
  let calls = 0;
  const load = createRequestScopedLoader(async () => {
    if (++calls === 1) throw new Error("temporary auth failure");
    return "verified";
  });
  const request = new Request("https://example.test/api/live-now");
  const failed = load(request);
  assert.strictEqual(load(request), failed);
  await assert.rejects(failed, /temporary auth failure/);
  assert.equal(await load(new Request(request.url)), "verified");
  assert.equal(calls, 2);
});
