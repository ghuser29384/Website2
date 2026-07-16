import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATE_ROUTE_DEFINITIONS,
  buildCreateTargetHref,
  getCreateRoute,
  readCreateMode,
} from "./create-routes";

test("readCreateMode accepts supported modes and defaults unknown values to trade", () => {
  assert.equal(readCreateMode("offset"), "offset");
  assert.equal(readCreateMode("pool"), "pool");
  assert.equal(readCreateMode("back"), "back");
  assert.equal(readCreateMode("trade"), "trade");
  assert.equal(readCreateMode("unsupported"), "trade");
  assert.equal(readCreateMode(undefined), "trade");
});

test("readCreateMode resolves the first query-string value", () => {
  assert.equal(readCreateMode(["pool", "trade"]), "pool");
  assert.equal(readCreateMode(["unsupported", "offset"]), "trade");
});

test("each supported mode resolves to one complete route definition", () => {
  const modes = ["trade", "offset", "pool", "back"] as const;

  assert.equal(CREATE_ROUTE_DEFINITIONS.length, modes.length);

  for (const mode of modes) {
    const route = getCreateRoute(mode);

    assert.equal(route.key, mode);
    assert.ok(route.title.length > 0);
    assert.ok(route.target.startsWith("/"));
    assert.equal(route.requirements.length, 3);
    assert.ok(route.receipt.baseline.length > 0);
    assert.ok(route.receipt.exposure.length > 0);
    assert.ok(route.success.label.length > 0);
    assert.ok(route.success.value.length > 0);
    assert.ok(route.fallback.label.length > 0);
    assert.ok(route.fallback.value.length > 0);
    assert.ok(route.nextTitle.length > 0);
    assert.ok(route.nextNote.length > 0);
  }
});

test("authenticated users continue directly to every selected route", () => {
  assert.equal(
    buildCreateTargetHref("trade", true),
    "/offers/new?entry=draft&mode=pledge",
  );
  assert.equal(
    buildCreateTargetHref("offset", true),
    "/offers/new?entry=draft&mode=offset",
  );
  assert.equal(buildCreateTargetHref("pool", true), "/pools");
  assert.equal(buildCreateTargetHref("back", true), "/create?mode=back");
});

test("signed-out users are gated only for routes that create a private draft", () => {
  assert.equal(
    buildCreateTargetHref("trade", false),
    "/signup?returnTo=%2Foffers%2Fnew%3Fentry%3Ddraft%26mode%3Dpledge",
  );
  assert.equal(
    buildCreateTargetHref("offset", false),
    "/signup?returnTo=%2Foffers%2Fnew%3Fentry%3Ddraft%26mode%3Doffset",
  );
  assert.equal(buildCreateTargetHref("pool", false), "/pools");
  assert.equal(buildCreateTargetHref("back", false), "/create?mode=back");
});
