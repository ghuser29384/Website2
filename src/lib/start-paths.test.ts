import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getStartCreateHref, START_PATHS } from "./start-paths";
import { VISITOR_PATHS } from "./visitor-paths";

const page = readFileSync("src/app/start/page.tsx", "utf8");

test("the compact chooser preserves all four original destinations and their order", () => {
  assert.deepEqual(START_PATHS.map(({ key, href }) => ({ key, href })),
    VISITOR_PATHS.map(({ key, href }) => ({ key, href })));
  assert.equal(new Set(START_PATHS.map(({ href }) => href)).size, 4);
});

test("each choice has one short title and a single sentence, not multiple competing labels", () => {
  for (const path of START_PATHS) {
    assert.ok(path.title.length <= 24);
    assert.ok(path.description.length <= 60);
    assert.ok(!("fit" in path) && !("homeTitle" in path) && !("actionLabel" in path));
  }
});

test("creation preserves the existing signed-in path and guest signup return path", () => {
  assert.equal(getStartCreateHref(true), "/create");
  assert.equal(getStartCreateHref(false), "/signup?returnTo=/create");
  assert.match(page, /getStartCreateHref\(Boolean\(viewer\)\)/);
  assert.match(page, /getStartCreateHref\(false\)/);
});

test("the chooser remains synchronous while account-aware UI streams separately", () => {
  assert.match(page, /export default function StartPage\(\)/);
  assert.match(page, /cache\(\(\) => getViewer\(\)\)/);
  assert.doesNotMatch(page, /getMarketplaceOverview|StartServiceSnapshot|growth-progress|SiteFooter/);
});

test("selection is navigation, not a payment, profile update, or acceptance", () => {
  assert.match(page, /Choosing a path does not make a payment or accept a trade/);
  assert.doesNotMatch(page, /<form|onClick|localStorage|fetch\(|use server/);
  assert.match(page, /prefetch=\{false\}/);
});

test("payment and consent boundaries stay available without an imposed wizard", () => {
  assert.match(page, /<details className=\{styles.safeguards\}>/);
  assert.match(page, /<summary>Before you commit<\/summary>/);
  assert.match(page, /does not hold funds, offer escrow, or decide tax treatment/);
  assert.match(page, /cancellation rules before accepting/);
  assert.match(page, /not automatically reviewed or verified/);
  for (const href of ["/status", "/privacy", "/terms", "/accessibility", "/contact"]) {
    assert.ok(page.includes(`href="${href}"`));
  }
});

test("visible content and structured metadata use the same chooser source", () => {
  assert.equal((page.match(/START_PATHS\.map/g) ?? []).length, 2);
  assert.match(page, /aria-label="Ways to get started"/);
  assert.match(page, /aria-labelledby=\{`start-\$\{path.key\}-title`\}/);
});
