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

test("the navigation bridge exposes the canonical Discover route", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  assert.match(bridge, /window\.location\.assign\("\/discover"\)/);
  assert.match(bridge, /data-mt-discover-link/);
  assert.match(bridge, /control\.textContent = "Discover"/);
});
