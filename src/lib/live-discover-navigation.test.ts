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

test("the live navigation bridge exposes four real destinations and keeps tools secondary", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");
  for (const [href, label] of [["/feed", "Home"], ["/discover", "Trades"], ["/commitments", "Commitments"], ["/profile", "Profile"]]) {
    assert.ok(bridge.includes(`"${href}", "${label}"`));
  }
  assert.match(bridge, /data-mt-feed-link/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /nav\.closest\("\.mt-site-topbar"\)/);
  assert.match(bridge, /header-more/);
  assert.match(bridge, /"\/walkthrough", "How it works"/);
  assert.doesNotMatch(bridge, /stopImmediatePropagation|preventDefault|window\.location\.assign|100 Sparks/);
  assert.match(bridge, /normalizeLiveLandmarks/);
  assert.match(bridge, /mtNestedMainNormalized/);
});

test("Discover uses ordinary canonical navigation without a graph or navigation patcher", () => {
  const shell = readPublicFile("moral-trade-discover.html");
  for (const href of ["/feed", "/discover", "/walkthrough", "/trades/new", "/commitments", "/evidence"]) {
    assert.ok(shell.includes(`href="${href}"`));
  }
  assert.match(shell, /aria-current="page">Trades/);
  assert.doesNotMatch(shell, /moral-trade-discover-navigation|moral-trade-discover-value-hover/);
});
