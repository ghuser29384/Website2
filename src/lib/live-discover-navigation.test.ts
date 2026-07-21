import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function readPublicFile(filename: string) {
  return readFileSync(join(projectRoot, "public", filename), "utf8");
}

test("the exact live loader injects the Discover navigation bridge", () => {
  const loader = readPublicFile("moral-trade-live.html");

  assert.match(loader, /moral-trade-live-navigation\.js/);
  assert.match(loader, /accountAwareSource\.replace\('<\/body>'/);
});

test("the live navigation bridge names the home stream Feed and exposes Discover and Trade controls", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  assert.match(bridge, /control\.textContent = "Feed"/);
  assert.match(bridge, /data-mt-feed-link/);
  assert.match(bridge, /Open personalized feed/);
  assert.match(bridge, /window\.location\.assign\("\/discover"\)/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /control\.textContent = "Discover"/);
  assert.match(bridge, /window\.location\.assign\("\/trade-controls"\)/);
  assert.match(bridge, /data-mt-controls-link/);
  assert.match(bridge, /control\.textContent = "Controls"/);
  assert.match(bridge, /normalizeLabel\(control\) === "controls"/);
});

test("the Discover loader reconnects product navigation and value-field hover details", () => {
  const loader = readPublicFile("moral-trade-discover.html");
  const navigationBridge = readPublicFile("moral-trade-discover-navigation.js");

  assert.match(loader, /moral-trade-discover-navigation\.js/);
  assert.match(loader, /moral-trade-discover-value-hover\.js/);
  assert.match(loader, /<\/scr' \+ 'ipt>/);
  assert.doesNotMatch(loader, /moral-trade-discover-navigation\.js"><\\\\\/script>/);
  assert.doesNotMatch(loader, /moral-trade-discover-value-hover\.js"><\\\\\/script>/);
  assert.match(navigationBridge, /\["now", "\/"\]/);
  assert.match(navigationBridge, /\["offer", "\/trades\/new"\]/);
  assert.match(navigationBridge, /\["activity", "\/commitments"\]/);
});

test("value-field copy appears only after a half-second mouse hover", () => {
  const hoverBridge = readPublicFile("moral-trade-discover-value-hover.js");

  assert.match(hoverBridge, /const HOVER_DELAY_MS = 500/);
  assert.match(hoverBridge, /document\.addEventListener\("pointerover"/);
  assert.match(hoverBridge, /document\.addEventListener\("pointerout"/);
  assert.match(hoverBridge, /point\.matches\(":hover"\)/);
  assert.match(hoverBridge, /\.value-point \.point-title/);
  assert.match(hoverBridge, /\.value-point \.point-meta/);
  assert.match(hoverBridge, /tooltip\.setAttribute\("role", "tooltip"\)/);
});
