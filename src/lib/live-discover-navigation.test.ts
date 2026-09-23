import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const readPublicFile = (name: string) => readFileSync(join(process.cwd(), "public", name), "utf8");

test("the exact live loader injects the Discover navigation bridge", () => {
  const loader = readPublicFile("moral-trade-live.html");

  assert.match(loader, /moral-trade-live-navigation\.js/);
  assert.match(loader, /accountAwareSource\.replace\('<\/body>'/);
});

test("the live navigation bridge exposes Feed, Discover, an optional tour, and the global Evidence ledger", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  assert.match(bridge, /control\.textContent = "Feed"/);
  assert.match(bridge, /data-mt-feed-link/);
  assert.match(bridge, /Open personalized feed/);
  assert.match(bridge, /window\.location\.assign\("\/discover"\)/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /control\.textContent = "Discover"/);
  assert.doesNotMatch(bridge, /createControlsControl|prepareControlsControl/);
  assert.match(bridge, /data-mt-optional-tour/);
  assert.match(bridge, /tour\.href = "\/walkthrough"/);
  assert.match(bridge, /window\.location\.assign\("\/evidence"\)/);
  assert.match(bridge, /data-mt-evidence-link/);
  assert.match(bridge, /control\.textContent = "Evidence"/);
  assert.match(bridge, /normalizeLabel\(control\) === "evidence"/);
  assert.match(bridge, /label === "commitments" \|\| label === "activity"/);
});

test("Discover uses ordinary canonical navigation without a graph or navigation patcher", () => {
  const shell = readPublicFile("moral-trade-discover.html");
  for (const href of ["/feed", "/discover", "/walkthrough", "/trades/new", "/commitments", "/evidence"]) {
    assert.ok(shell.includes(`href="${href}"`));
  }
  assert.match(shell, /aria-current="page">Discover/);
  assert.doesNotMatch(shell, /moral-trade-discover-navigation|moral-trade-discover-value-hover/);
});
