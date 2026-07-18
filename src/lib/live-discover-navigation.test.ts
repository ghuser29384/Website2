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
  assert.match(loader, /source\.replace\('<\/body>'/);
});

test("the live navigation bridge exposes the canonical Discover route", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  assert.match(bridge, /window\.location\.assign\("\/discover"\)/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /control\.textContent = "Discover"/);
});

test("the Discover loader reconnects its product navigation", () => {
  const loader = readPublicFile("moral-trade-discover.html");
  const bridge = readPublicFile("moral-trade-discover-navigation.js");

  assert.match(loader, /moral-trade-discover-navigation\.js/);
  assert.match(bridge, /\["now", "\/"\]/);
  assert.match(bridge, /\["offer", "\/trades\/new"\]/);
  assert.match(bridge, /\["activity", "\/commitments"\]/);
});
