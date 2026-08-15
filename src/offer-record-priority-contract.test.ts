import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = "src/app/layout.tsx";
const offerPagePath = "src/app/offers/[offerId]/page.tsx";
const offerRouteLayoutPath = "src/app/offers/[offerId]/layout.tsx";
const stylesheetPath = "src/app/offer-record-priority.css";
const shortcutPath = "src/components/offer-credibility-link.tsx";

async function readSource(path: string) {
  return readFile(path, "utf8");
}

test("offer-record priority overrides load after the canonical remediation layer", async () => {
  const layout = await readSource(layoutPath);
  const remediationImport = 'import "./canonical-visual-system-remediation.css";';
  const priorityImport = 'import "./offer-record-priority.css";';

  assert.ok(layout.includes(priorityImport));
  assert.ok(
    layout.indexOf(priorityImport) > layout.indexOf(remediationImport),
    "offer-record overrides must load after the canonical remediation stylesheet",
  );
});

test("offer records expose direct, accessible routes to safeguards and commitment terms", async () => {
  const [source, routeLayout, offerPage] = await Promise.all([
    readSource(shortcutPath),
    readSource(offerRouteLayoutPath),
    readSource(offerPagePath),
  ]);

  assert.match(source, /aria-label="Offer review context"/);
  assert.match(source, /aria-label="Offer review shortcuts"/);
  assert.match(source, /Check evidence status and safeguards before responding\./);
  assert.match(source, /href=\{`\/offers\/\$\{offerId\}\/credibility`\}/);
  assert.match(source, /href="#marketplace-commitment"/);
  assert.match(source, /Review evidence status and safeguards/);
  assert.match(source, /Jump to commitment terms/);
  assert.match(routeLayout, /<div className="offer-record-route">\{children\}<\/div>/);
  assert.match(offerPage, /id="marketplace-commitment"/);
  assert.match(offerPage, /id="marketplace-commitment"[^>]*tabIndex=\{-1\}/);
});

test("offer-record visual changes stay route-scoped and preserve mobile access to content", async () => {
  const stylesheet = await readSource(stylesheetPath);
  const scopedPrefix =
    ".offer-record-context-banner + .offer-record-route .marketplace-app-shell";
  const marketplaceSelectorLines = stylesheet
    .split("\n")
    .filter((line) => line.includes(".marketplace-app-shell"));

  assert.ok(marketplaceSelectorLines.length > 0);
  for (const line of marketplaceSelectorLines) {
    assert.ok(
      line.trim().startsWith(scopedPrefix),
      `unscoped marketplace selector: ${line.trim()}`,
    );
  }

  assert.match(stylesheet, /\.offer-record-context-banner/);
  assert.match(stylesheet, /#marketplace-commitment\s*\{[^}]*scroll-margin-top:/);
  assert.match(stylesheet, /@media \(max-width: 760px\)/);
  assert.match(stylesheet, /overflow-wrap: anywhere/);
  assert.doesNotMatch(
    stylesheet,
    /\.marketplace-app-shell[^{}]*\{[^}]*display:\s*none/,
    "the correction must not solve density by hiding offer information",
  );
});
