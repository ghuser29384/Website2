import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const core = readFileSync("public/moral-trade-live-core.txt", "utf8");
const loader = readFileSync("public/moral-trade-live.html", "utf8");
const script = core.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "the live core must contain its renderer");

function mountFeed() {
  const app = { innerHTML: "" };
  const overlay = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const destinations: string[] = [];
  const location = {
    hash: "#now",
    assign: (url: string) => destinations.push(url),
    replace: (url: string) => destinations.push(url),
  };
  const context = {
    document: {
      querySelector: (selector: string) => selector === "#app" ? app : overlay,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    window: { location },
    location,
    addEventListener() {},
  };
  runInNewContext(script, context);
  return { app, context, destinations };
}

function assertControlsFirst(html: string) {
  assert.match(html, /^<section class="page">\s*<div class="tabs">/);
  assert.doesNotMatch(html, /<h1\b|class="head"|class="subtitle"|class="date"/);
  assert.doesNotMatch(html, /What needs you now|Review live opportunities and plan your next action/);
  assert.match(html, /data-now="focus">Focus<\/button>/);
  assert.match(html, /data-now="plan">Plan resources<\/button>/);
}

test("the default feed opens directly into controls without an introductory header", () => {
  const { app } = mountFeed();
  assertControlsFirst(app.innerHTML);
  assert.match(app.innerHTML, /data-mt-live-now-state="loading"/);
  assert.doesNotMatch(core, /What needs you now\.|Review live opportunities and plan your next action\./);
});

test("switching between resource planning and focus cannot restore the removed header", () => {
  const { app, context } = mountFeed();
  runInNewContext("state.now = 'plan'; render();", context);
  assertControlsFirst(app.innerHTML);
  assert.match(app.innerHTML, /class="active" data-now="plan"/);
  assert.match(app.innerHTML, /data-mt-live-route-planner="loading"/);
  runInNewContext("state.now = 'focus'; render();", context);
  assertControlsFirst(app.innerHTML);
  assert.match(app.innerHTML, /class="active" data-now="focus"/);
  assert.match(app.innerHTML, /data-mt-live-now="adaptive"/);
});

test("the header change leaves the feed body and global creation handoff intact", () => {
  const { app, context, destinations } = mountFeed();
  // An isolated renderer fixture: no live recommendation or database state is created.
  runInNewContext("nowFocus = () => '<div data-test-feed-body>Existing feed body</div>'; render();", context);
  assertControlsFirst(app.innerHTML);
  assert.ok(app.innerHTML.endsWith("<div data-test-feed-body>Existing feed body</div></section>"));
  assert.match(core, /<button data-page="trade">Trade<\/button>/);
  runInNewContext("setPage('trade');", context);
  assert.deepEqual(destinations, ["/trades/new"]);
});

test("the loader integrity digest matches the changed core", () => {
  const digest = createHash("sha256").update(core).digest("hex");
  assert.ok(loader.includes(`digest !== '${digest}'`));
  assert.match(loader, /crypto\.subtle\.digest\('SHA-256', raw\)/);
  assert.match(loader, /throw new Error\('integrity'\)/);
});
